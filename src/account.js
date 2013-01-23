(function (global) {
  'use strict';

  /*
   * Account represents a single mail account, such as banga@cs.unc.edu
   * It can read from multiple feeds, each for a different label
   */ 
  function Account(args) {
    this.reload(args);

    this.subscribe('init', function () {
      log.info('Account initialized:', this.url);
      this.loadLabels();
      this.status = Account.STATUS_INITIALIZED;
      this.update();
    }, this);

    this.subscribe('initFailed', function () {
      log.warn('Account initialization failed:', this.url);
      this.status = Account.STATUS_INITIALIZATION_FAILED;

      this.clearCache();
    }, this);

    this.subscribe('feedParsed', function () {
      log.info('Account feed parsed:', this.url);
      this.feedStatus = Account.FEED_STATUS_PARSED;
    }, this);

    this.subscribe('feedParseFailed', function (args) {
      log.warn('Account feed parsing failed:', 'label = "' + args.label + '"');
      this.feedStatus = Account.FEED_STATUS_PARSE_FAILED;

      this.clearCache();
      this.init();
    }, this);

    this.subscribe('conversationAdded', function (conversation) {
      log.info('Conversation added:', conversation.subject);
      ++this.unreadCount;
    }, this);

    this.subscribe('conversationDeleted', function (conversation) {
      log.info('Conversation deleted:', conversation.subject);
      --this.unreadCount;
    }, this);

    config.subscribe('labelAdded', function (args) {
      if (this.name === args.accountName) {
        this.addLabel(args.label);
        this.update();
      }
    }, this);

    config.subscribe('labelRemoved', function (args) {
      if (this.name === args.accountName) {
        this.removeLabel(args.label);
        this.update();
      }
    }, this);
  }

  $.addEventHandling(Account, [
      'init',           // We have everything needed to start fetching emails
      'initFailed',
      'feedParsed',
      'feedParseFailed',
      'conversationAdded',
      'conversationDeleted',
      'conversationUpdated',
      'conversationUpdateFailed',
      'changed'
    ]);

  Account.GMAIL_URL = 'https://mail.google.com/';
  Account.STATUS_NONE = 1;
  Account.STATUS_INITIALIZING = 2;
  Account.STATUS_INITIALIZED = 3;
  Account.STATUS_INITIALIZATION_FAILED = 4;
  Account.FEED_STATUS_NONE = 1;
  Account.FEED_STATUS_PARSING = 2;
  Account.FEED_STATUS_PARSED = 3;
  Account.FEED_STATUS_PARSE_FAILED = 4;

  Account.prototype.reload = function (args) {
    args = args || {};
    this.domain = args.domain || this.domain || 'mail';
    this.number = args.number || this.number || 0;
    this.url = Account.GMAIL_URL + this.domain + '/u/' + this.number + '/';

    this.status = Account.STATUS_NONE;
    this.feedStatus = Account.FEED_STATUS_NONE;
    this.clearCache();

    this._labelQueue = [];
  };

  Account.prototype.clearCache = function () {
    this.conversations = this.conversations || {};
    this.conversations.each(function (conversation) {
      this.removeConversation(conversation.id);
    }, this);
    this.feedLastUpdated = {};
    this.unreadCount = 0;
  };

  Account.isGmailURL = function (url) {
    return (url.indexOf(Account.GMAIL_URL) === 0);
  };

  Account.prototype.isAccountURL = function (url) {
    if (!url || url.indexOf(this.url) !== 0)
      return false;
    return url.length == this.url.length || url[this.url.length] == '?' ||
      url[this.url.length] == '#';
  };

  Account.prototype.htmlModeURL = function () {
    return this.url + 'h/' +
      Math.ceil(Math.random() * 1.5e17).toString(26) + '/';
  };

  Account.prototype.feedURL = function (label) {
    return this.url + 'feed/atom/' + label.replace('/', ' ') +
      '?t=' + (new Date().getTime());
  };

  Account.prototype.init = function () {
    if (this.status == Account.STATUS_INITIALIZING) {
      return;
    }
    this.status = Account.STATUS_INITIALIZING;
    var this_ = this;
    var onSuccess = this.publish.bind(this, 'init', this);
    var onError = this.publish.bind(this, 'initFailed', this);
    this._fetchAccountURL(function () {
      this_._fetchAccountInfo(onSuccess, onError);
    }, onError);
  };

  Account.prototype._fetchAccountURL = function (onSuccess, onError) {
    var this_ = this;

    $.post({
      url: this.url,
      onSuccess: function (xhr) {
        // Account's possibly redirected url
        var doc = $.make('document').html(xhr.response);
        var meta = doc.querySelector('meta[name="application-url"]');
        if (meta) {
          this_.url = meta.getAttribute('content') + '/';
        }
        onSuccess();
      },
      onError: onError
    });
  };

  Account.extractInfo = function (xhr) {
    var doc = $.make('document').html(xhr.responseText),
        guser = doc.querySelector('#guser'),
        labelContainer = doc.querySelector('td.lb'),
        match_at = xhr.responseText.match(/\at=([^"]+)/),
        info = { labels: [] };

    // 'at'
    if (match_at && match_at.length > 0) {
      info.at = match_at[1];
    }

    // username
    if (guser) {
      try {
        guser.removeChild(guser.querySelector('.hdn'));
      } catch (e) {
      }
      info.name = guser.textContent.split('|')[0].trim();
    }

    // labels 
    if (labelContainer) {
      var labelElems = labelContainer.querySelectorAll('a');
      labelElems.each(function (elem) {
        var href = elem.getAttribute('href'), match;
        if (href) {
          match = /&l=(\S*)/.exec(href);
          if (match) {
            info.labels.push(window.unescape(match[1]).replace(/\+/g, ' '));
          }
        }
      });
    }

    return info;
  };

  Account.prototype._fetchAccountInfo = function (onSuccess, onError) {
    var this_ = this;

    $.post({
      url: this.htmlModeURL(),
      onSuccess: function (xhr) {
        var info = Account.extractInfo(xhr, onSuccess, onError); 
        if ('at' in info && 'name' in info && 'labels' in info) {
          this_.name = info.name;
          this_.allLabels = info.labels;
          this_.at = info.at;
          onSuccess();
        } else {
          onError();
        }
      },
      onError: onError
    });
  };

  Account.prototype._processLabelQueue = function () {
    if (this._labelQueue.length) {
      var label = this._labelQueue.pop();
      this._parseFeed(label, this._processLabelQueue.bind(this),
        this.publish.bind(this, 'feedParseFailed', {
          account: this,
          label: label
        }));
    } else {
      // Finished parsing
      this.conversations.each(function (conversation, id) {
        if (!conversation.hasLabels()) {
          this.publish('conversationDeleted', conversation);
          delete this.conversations[id];
        } else {
          conversation.updateIfDirty();
        }
      }, this);
      this.publish('feedParsed', this);
    }
  };

  Account.prototype.update = function () {
    if (this.status === Account.STATUS_INITIALIZING) {
      return;
    }

    if (this.status === Account.STATUS_NONE ||
        this.status === Account.STATUS_INITIALIZATION_FAILED) {
      this.init();
      return;
    }

    if (this.feedStatus !== Account.FEED_STATUS_PARSING) {
      log.assert(this.labels, 'Labels shouldn\'t be null ' +
          this.status + ' ' + this.feedStatus + ' ' + this.number);
      this.feedStatus = Account.FEED_STATUS_PARSING;
      this._labelQueue = this.labels.slice(0);
      this._processLabelQueue();
    }
  };

  Account.prototype._onFeed = function (label, onSuccess, onError, xhr) {
    var onConversationUpdated = this.publish.bind(this, 'conversationUpdated'),
        onConversationUpdateFailed =
            this.publish.bind(this, 'conversationUpdateFailed'),
        xmlDoc = xhr.responseXML,
        fullCountNode = xmlDoc.querySelector('fullcount');

    if (fullCountNode === null) {
      log.warn('fullCountNode not found');
      return onError();
    }

    var modifiedNode = xmlDoc.querySelector('modified');
    if (modifiedNode) {
      var modified = new Date(modifiedNode.textContent),
          lastUpdated = this.feedLastUpdated[label] || new Date(0);
      if (modified <= lastUpdated) {
        onSuccess();
        return;
      }
      this.feedLastUpdated[label] = modified;
    }

    var titleNode = xmlDoc.querySelector('title');

    if (titleNode === null) {
      log.warn('titleNode not found');
      return onError();
    }

    var accountName = /\S*@\S*/.exec(titleNode.textContent)[0];
    if (accountName !== this.name) {
      log.warn('Changed', this.name, accountName);
      onError();

      var oldName = this.name;
      this.name = accountName;
      this.publish('changed', {
        account: this,
        oldName: oldName,
        newName: accountName
      });
      return;
    }

    var entryNodes = xmlDoc.querySelectorAll('entry');
    var msgIDs = {};
    entryNodes.each(function (entryNode, idx) {
      var newConversation = new Conversation(this, entryNode, idx); 
      var msgID = newConversation.id;
      msgIDs[msgID] = '';

      if (msgID in this.conversations) {
        // Update existing conversation
        var conversation = this.conversations[msgID];
        if (conversation.modified != newConversation.modified) {
          conversation.fromFeed(entryNode);
          conversation.markDirty();
        }
        conversation.addLabel(label);
      } else {
        // New conversation
        newConversation.addLabel(label);
        newConversation.subscribe('updated', onConversationUpdated,
          this);
        newConversation.subscribe('updateFailed',
          onConversationUpdateFailed, this);
        this.conversations[msgID] = newConversation;
        this.publish('conversationAdded', newConversation);
      }
    }, this);

    this.conversations.each(function (conversation, id) {
      if (!(id in msgIDs)) {
        // Conversation is not in this label anymore
        conversation.removeLabel(label);
      }
    });

    onSuccess();
  };

  Account.prototype._parseFeed = function (label, onSuccess, onError) {
    log.info('Parsing feed ', this.feedURL(label));

    $.get({
      url: this.feedURL(label),
      onSuccess: this._onFeed.bind(this, label, onSuccess, onError),
      onError: onError 
    });
  };

  Account.prototype.removeConversation = function (id) {
    this.publish('conversationDeleted', this.conversations[id]);
    delete this.conversations[id];
  };

  Account.prototype.detachView = function () {
    if (this.view) {
      this.conversations.each(function (conversation) {
        conversation.detachView();
      });
      this.view.onDetach();
      this.view = null;
    }
  };

  Account.prototype.attachView = function (view) {
    this.detachView();
    this.view = view;
  };

  Account.GMAIL_ACTIONS = {
    'rd': ['Mark as read', 'Marking as read...', '.icon-ok'],
    'ar': ['Archive', 'Archiving...', '.icon-download-alt'],
    'sp': ['Mark as Spam', 'Marking as Spam...', '.icon-warning-sign'],
    'tr': ['Delete', 'Deleting...', '.icon-trash']
  };

  Account.prototype.doGmailAction = function (action, conversations, onSuccess, onError) {
    if (action == 'ar') {
      this.doArchive(
          conversations, 
          this.doGmailAction.bind(this, 'rd', conversations, onSuccess, onError),
          onError);
      return;
    }

    var url = this.htmlModeURL();
    var payload = new FormData();

    conversations.each(function (conversation) {
      payload.append('t', conversation.id);
    });
    payload.append('at', this.at);
    payload.append('act', action);

    log.info('Gmail action', this.name, action, conversations);

    $.post({
      url: url,
      onSuccess: onSuccess,
      onError: onError,
      payload: payload
    });
  };

  Account.prototype.doArchive =
    function (conversations, onSuccess, onError) {
    var url = this.htmlModeURL() + '?&at=' + this.at;
    var payload = new FormData();

    payload.append('redir', '?&');
    payload.append('nvp_a_arch', 'Archive');
    payload.append('tact', '');
    conversations.each(function (conversation) {
      payload.append('t', conversation.id);
    });
    payload.append('bact', '');

    log.info('Archive', this.name, conversations);

    $.post({
      url: url,
      onSuccess: onSuccess,
      onError: onError,
      payload: payload
    });
  };

  Account.prototype.openInGmail = function () {
    var this_ = this;
    chrome.tabs.query({}, function (tabs) {
      var found = false;

      tabs.each(function (tab) {
        if (this_.isAccountURL(tab.url)) {
          chrome.tabs.update(tab.id, {selected: true});
          found = true;
          return false;
        }
      });

      if (!found) {
        chrome.tabs.create({url: this_.url});
      }
    });
  };

  Account.prototype.addLabel = function (label) {
    if (this.labels.indexOf(label) == -1) {
      this.labels.push(label);
    }
  };

  Account.prototype.removeLabel = function (label) {
    var idx = this.labels.indexOf(label);
    if (idx != -1) {
      this.conversations.each(function (conversation) {
        conversation.removeLabel(label);
      });
      this.labels.splice(idx, 1);
      delete this.feedLastUpdated[label];
    }
  };

  Account.prototype.hasLabel = function (label) {
    return this.labels.indexOf(label) != -1;
  };

  Account.prototype.loadLabels = function () {
    this.labels = config.getLabels(this.name);
  };

  global.Account = Account;
}) (window);
