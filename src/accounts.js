/*
 * Account represents a single mail account, such as banga@cs.unc.edu
 */ 
function Account(domain, number) {
  'use strict';
  this.domain = domain || 'mail';
  this.number = number;
  this.url = Account.GMAIL_URL + this.domain + '/u/' +
    this.number + '/';
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

Account.prototype.feedURL = function () {
  'use strict';
  return this.url + 'feed/atom/';
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
  var onSuccess = this.publish.bind(this, 'feedParsed', this);
  var onError = this.publish.bind(this, 'feedParseFailed', this);
  var onConversationUpdated = this.publish.bind(this, 'conversationUpdated');
  var onConversationUpdateFailed =
    this.publish.bind(this, 'conversationUpdateFailed');
  var that = this;

  $.get({
    url: this.feedURL(),
    onSuccess: function (xhr) {
      var xmlDoc = xhr.responseXML;
      var fullCountNode = xmlDoc.querySelector('fullcount');

      if (fullCountNode) {
        that.unreadCount = fullCountNode.textContent;
        var titleNode = xmlDoc.querySelector('title');

        if (titleNode) {
          var nameHdr = 'Gmail - Inbox for ';
          that.name = titleNode.textContent.substr(nameHdr.length);

          var entryNodes = xmlDoc.querySelectorAll('entry');
          var newConversations = {};

          if (entryNodes) {
            entryNodes.each(function (entryNode, idx) {
              var newConversation = new Conversation(that, entryNode, idx); 
              newConversations[newConversation.id] = newConversation;
              newConversation.subscribe('updated', onConversationUpdated);
              newConversation.subscribe('updateFailed',
                onConversationUpdateFailed);
            });
          }

          // Update existing conversations which have changed 
          that.conversations.each(function (conversation, id) {
            if (id in newConversations) {
              var newConversation = newConversations[id];
              if (conversation.modified != newConversation.modified) {
                console.log(newConversation.subject + '" changed');
                that.conversations[id] = newConversation;
                newConversation.update();
              }
              conversation.index = newConversation.index;
            } else {
              that.publish('conversationDeleted', conversation);
              delete that.conversations[id];
            }
          });

          // Add new conversations
          newConversations.each(function (newConversation, id) {
            if (!(id in that.conversations)) {
              that.conversations[id] = newConversation;
              that.publish('conversationAdded', newConversation);
              newConversation.update();
            }
          });

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
  this.root = $.make('.account-view');
  this.header = $.make('.account-header').text('Loading...');
  this.conversations = $.make('.conversation-list');
  this.root.append(this.header).append(this.conversations);

  this.account.subscribe('feedParsed', this.init.bind(this));
  this.account.subscribe('conversationAdded', this.addConversation.bind(this));
  this.account.subscribe('conversationDeleted',
      this.deleteConversation.bind(this));
}

AccountView.prototype.init = function () {
  'use strict';
  console.dir(this.account);
  this.header.text('Inbox for ' + this.account.name);
};

AccountView.prototype.addConversation = function (conversation) {
  'use strict';
  console.log('Adding conversation:');
  console.dir(conversation);
  var child = this.conversations.firstElementChild;
  for (var i = 0; i < conversation.index; ++i)
    child = child.nextElementSibling;
  this.conversations.insertBefore(conversation.view.root, child);
};

AccountView.prototype.deleteConversation = function (conversation) {
  'use strict';
  console.log('Deleting conversation:');
  console.dir(conversation);
  this.conversations.removeChild(conversation.view.root);
};
