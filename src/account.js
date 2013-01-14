/*
 * Account represents a single mail account, such as banga@cs.unc.edu
 * It can read from multiple feeds, each for a different label
 */ 
function Account(args) {
  'use strict';
  this.domain = args.domain || 'mail';
  this.number = args.number || 0;
  this.labels = args.labels || [''];
  this.url = args.url ||
    (Account.GMAIL_URL + this.domain + '/u/' + this.number + '/');

  this.status = Account.STATUS_INIT;
  this.lastUpdated = {};
  this.conversations = {};
  this.unreadCount = 0;

  this.init();
  this.subscribe('init', this.update, this);
  this.subscribe('initFailed', this.init, this);

  this.subscribe('feedParsed', function () {
    this.status = Account.STATUS_FEED_PARSED;
  }, this);

  this.subscribe('feedParseFailed', function () {
    this.status = Account.STATUS_FEED_PARSE_FAILED;
  }, this);

  this.subscribe('conversationAdded', function () {
    ++this.unreadCount;
  }, this);

  this.subscribe('conversationDeleted', function () {
    --this.unreadCount;
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
Account.STATUS_INIT = 0;
Account.STATUS_FEED_PARSED = 1;
Account.STATUS_FEED_PARSE_FAILED = 2;

Account.prototype.toJSON = function () {
  'use strict';
  return {
    domain: this.domain,
    number: this.number,
    labels: this.labels,
    url:    this.url
  };
};

Account.isGmailURL = function (url) {
  'use strict';
  return (url.indexOf(Account.GMAIL_URL) === 0);
};

Account.prototype.isAccountURL = function (url) {
  'use strict';
  if (!url || url.indexOf(this.url) !== 0)
    return false;
  return url.length == this.url.length || url[this.url.length] == '?' ||
    url[this.url.length] == '#';
};

Account.prototype.htmlModeURL = function () {
  'use strict';
  return this.url + 'h/' + Math.ceil(Math.random() * 1.5e17).toString(26) + '/';
};

Account.prototype.feedURL = function (label) {
  'use strict';
  return this.url + 'feed/atom/' + label;
};

Account.prototype.init = function () {
  'use strict';
  var that = this;
  var onSuccess = this.publish.bind(this, 'init', this);
  var onError = this.publish.bind(this, 'initFailed', this);
  this._fetchAccountURL(function () {
    that._fetchAccountAtParameter(onSuccess, onError);
  }, onError);
};

Account.prototype._fetchAccountURL = function (onSuccess, onError) {
  'use strict';
  var that = this;
  console.log('_fetchAccountURL');

  $.post({
    url: this.url,
    onSuccess: function (xhr) {
      // Account's possibly redirected url
      var doc = $.make('document').html(xhr.response);
      var meta = doc.querySelector('meta[name="application-url"]');
      if (meta) {
        that.url = meta.getAttribute('content') + '/';
        console.log('url changed to ' + that.url);
      }
      onSuccess();
    },
    onError: onError
  });
};

Account.prototype._fetchAccountAtParameter = function (onSuccess, onError) {
  'use strict';
  var that = this;
  console.log('_fetchAccountAtParameter');

  $.post({
    url: this.htmlModeURL(),
    onSuccess: function (xhr) {
      var m = xhr.responseText.match(/\at=([^"]+)/);
      if (m && m.length > 0) {
        that.at = m[1];
        console.log('Account \'at\' = ' + that.at);
        onSuccess();
      } else {
        onError();
      }
    },
    onError: onError
  });
};

Account.prototype.update = function () {
  'use strict';
  var onError = this.publish.bind(this, 'feedParseFailed', this),
      that = this,
      q = [];

  this.labels.each(function (label) {
    q.push(label);
    console.log('Label: \'' + label + '\'');
  });

  processQueue();

  function processQueue() {
    if (q.length) {
      that.parseFeed(q.pop(), processQueue, onError);
    } else {
      // Finished parsing
      that.conversations.each(function (conversation, id) {
        if (!conversation.hasLabels()) {
          that.publish('conversationDeleted', conversation);
          delete that.conversations[id];
        } else {
          conversation.updateIfDirty();
        }
      });
      that.publish('feedParsed');
    }
  }
};

Account.prototype.parseFeed = function (label, onSuccess, onError) {
  'use strict';
  var onConversationUpdated = this.publish.bind(this, 'conversationUpdated');
  var onConversationUpdateFailed =
    this.publish.bind(this, 'conversationUpdateFailed');
  var that = this;

  console.log('Parsing feed for \'' + label + '\'');

  $.get({
    url: this.feedURL(label),
    onSuccess: function (xhr) {
      var xmlDoc = xhr.responseXML;
      var fullCountNode = xmlDoc.querySelector('fullcount');

      if (fullCountNode) {
        var modifiedNode = xmlDoc.querySelector('modified');
        if (modifiedNode) {
          var modified = new Date(modifiedNode.textContent);
          var lastUpdated = that.lastUpdated[label] || new Date(0);
          if (modified <= lastUpdated) {
            // Feed is unmodified
            console.log('Feed for ' + label + ' not modified');
            onSuccess();
            return;
          }
          that.lastUpdated[label] = modified;
        }

        var titleNode = xmlDoc.querySelector('title');

        if (titleNode) {
          that.name = /\S*@\S*/.exec(titleNode.textContent)[0];

          var entryNodes = xmlDoc.querySelectorAll('entry');

          if (entryNodes) {
            var msgIDs = {};
            entryNodes.each(function (entryNode, idx) {
              var newConversation = new Conversation(that, entryNode, idx); 
              var msgID = newConversation.id;
              msgIDs[msgID] = '';

              if (msgID in that.conversations) {
                // Update existing conversation
                var conversation = that.conversations[msgID];
                if (conversation.modified != newConversation.modified) {
                  conversation.fromFeed(entryNode);
                  conversation.markDirty();
                } else {
                  conversation.addLabel(label);
                }
              } else {
                // New conversation
                newConversation.addLabel(label);
                newConversation.subscribe('updated', onConversationUpdated,
                  this);
                newConversation.subscribe('updateFailed',
                  onConversationUpdateFailed, this);
                that.conversations[msgID] = newConversation;
                that.publish('conversationAdded', newConversation);
              }
            });

            that.conversations.each(function (conversation, id) {
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
    },
    onError: onError 
  });
};

Account.prototype.removeConversation = function (id) {
  'use strict';
  this.publish('conversationDeleted', this.conversations[id]);
  delete this.conversations[id];
};

Account.prototype.detachView = function () {
  'use strict';
  if (this.view) {
    this.conversations.each(function (conversation) {
      conversation.detachView();
    });
    this.view.onDetach();
    this.view = null;
  }
};

Account.prototype.attachView = function (view) {
  'use strict';
  this.detachView();
  this.view = view;
};

Account.prototype.openInGmail = function () {
  'use strict';
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
