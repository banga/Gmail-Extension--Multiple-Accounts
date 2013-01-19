(function (global) {
  'use strict';

  /*
   * Account represents a single mail account, such as banga@cs.unc.edu
   * It can read from multiple feeds, each for a different label
   */ 
  function Account(args) {
    this.domain = args.domain || 'mail';
    this.number = args.number || 0;
    this.url = Account.GMAIL_URL + this.domain + '/u/' + this.number + '/';

    this.status = Account.STATUS_NONE;
    this.feedStatus = Account.FEED_STATUS_NONE;
    this.lastUpdated = {};
    this.conversations = {};
    this.unreadCount = 0;

    this._labelQueue = [];

    this.subscribe('init', function () {
      log.info('Account initialized:', this.url);
      this.status = Account.STATUS_INITIALIZED;
      this.loadLabels();
      this.update();
    }, this);

    this.subscribe('initFailed', function () {
      log.info('Account initialization failed:', this.url);
      this.status = Account.STATUS_INITIALIZATION_FAILED;
    }, this);

    this.subscribe('feedParsed', function () {
      log.info('Account feed parsed:', this.url);
      this.feedStatus = Account.FEED_STATUS_PARSED;
    }, this);

    this.subscribe('feedParseFailed', function () {
      log.info('Account feed parsing failed:', this.url);
      this.feedStatus = Account.FEED_STATUS_PARSE_FAILED;
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
      'conversationUpdateFailed'
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
    return this.url + 'feed/atom/' + label.replace('/', ' ');
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
      this._parseFeed(
          this._labelQueue.pop(),
          this._processLabelQueue.bind(this),
          this.publish.bind(this, 'feedParseFailed', this));
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
    switch (this.status) {
    case Account.STATUS_INITIALIZATING: 
      return;

    case Account.STATUS_INITIALIZATION_FAILED:
      this.init();
      return;
    }

    if (this.feedStatus !== Account.FEED_STATUS_PARSING) {
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

    if (fullCountNode) {
      var modifiedNode = xmlDoc.querySelector('modified');
      if (modifiedNode) {
        var modified = new Date(modifiedNode.textContent),
            lastUpdated = this.lastUpdated[label] || new Date(0);
        if (modified <= lastUpdated) {
          onSuccess();
          return;
        }
        this.lastUpdated[label] = modified;
      }

      var titleNode = xmlDoc.querySelector('title');

      if (titleNode) {
        log.assert(this.name == /\S*@\S*/.exec(titleNode.textContent)[0]);

        var entryNodes = xmlDoc.querySelectorAll('entry');

        if (entryNodes) {
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
        }

        onSuccess();
        return;
      }
    }
    onError();
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
      delete this.lastUpdated[label];
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
