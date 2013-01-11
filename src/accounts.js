/*
 * Account represents a single mail account, such as banga@cs.unc.edu
 * It can read from multiple feeds, each for a different label
 */ 
function Account(domain, number, labels) {
  'use strict';
  this.domain = domain || 'mail';
  this.number = number || 0;
  this.labels = labels || [''];
  this.url = Account.GMAIL_URL + this.domain + '/u/' +
    this.number + '/';

  this.lastUpdated = {};
  this.conversations = {};
  this.unreadCount = 0;
  this.view = new AccountView(this);

  this.init();
  this.subscribe('init', this.update.bind(this));
  this.subscribe('initFailed', this.init.bind(this));
}

$.addEventHandling(Account, [
    'init',           // We have everything needed to start fetching emails
    'initFailed',
    'feedParsed',
    'feedParseFailed',
    'allFeedsParsed',
    'conversationAdded',
    'conversationDeleted',
    'conversationUpdated',
    'conversationUpdateFailed'
  ]);

Account.GMAIL_URL = 'https://mail.google.com/';

Account.isGmailURL = function (url) {
  'use strict';
  return (url.indexOf(Account.GMAIL_URL) === 0);
};

Account.prototype.isAccountURL = function (url) {
  'use strict';
  if (url.indexOf(this.url) !== 0)
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
      that.unreadCount = 0;
      // Finished parsing
      that.conversations.each(function (conversation, id) {
        if (!conversation.hasLabels()) {
          that.publish('conversationDeleted', conversation);
          delete that.conversations[id];
        } else {
          conversation.updateIfDirty();
          ++that.unreadCount;
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
          var nameHdr = 'Gmail - Inbox for ';
          that.name = titleNode.textContent.substr(nameHdr.length);

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
                newConversation.subscribe('updated', onConversationUpdated);
                newConversation.subscribe('updateFailed',
                  onConversationUpdateFailed);
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

function AccountView(account) {
  'use strict';

  this.account = account;
  this.root = $.make('.account');

  this.header = $.make('.account-header')
    .append($.make('.account-icon'))
    .append($.make('.account-link').text('Loading...'));

  this.conversationList = $.make('.conversation-list');
  this.root.append(this.header).append(this.conversationList);

  this.account.subscribe('feedParsed', this.init.bind(this));
  this.account.subscribe('conversationAdded', this.addConversation.bind(this));
  this.account.subscribe('conversationDeleted',
      this.deleteConversation.bind(this));
}

AccountView.prototype.init = function () {
  'use strict';
  console.dir(this.account);
  this.header.lastElementChild.text('Inbox for ' + this.account.name);
};

AccountView.prototype.addConversation = function (conversation) {
  'use strict';
  console.log('Adding conversation: ' + conversation.subject);

  var modified = new Date(conversation.modified),
      child = this.conversationList.firstElementChild;

  while (child) {
    if (modified > new Date(child.conversation.modified)) {
      break;
    }
    child = child.nextElementSibling;
  }

  this.conversationList.insertBefore(conversation.view.root, child);
};

AccountView.prototype.deleteConversation = function (conversation) {
  'use strict';
  console.log('Deleting conversation ' + conversation.subject);
  this.conversationList.removeChild(conversation.view.root);
};
