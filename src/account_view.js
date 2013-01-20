(function (global) {
  'use strict';

  function AccountView(account) {
    this.account = account;
    this.account.attachView(this);
    this.root = $.make('.account');
    this.root.account = this.account;

    this.linkElem = $.make('.account-link')
      .on('click', this.account.openInGmail.bind(this.account));

    this.header = $.make('.account-header')
      .append($.make('.account-icon'))
      .append(this.linkElem);

    this.conversationList = $.make('.conversation-list');
    this.root.append(this.header).append(this.conversationList);

    this.updateHeader();
    this.account.conversations.each(this.addConversation.bind(this));

    this.account.subscribe('init', this.updateHeader, this);
    this.account.subscribe('initFailed', this.updateHeader, this);
    this.account.subscribe('conversationAdded', this.addConversation, this);
    this.account.subscribe('conversationDeleted', this.deleteConversation, 
        this);
    this.account.subscribe('changed', function (args) {
      args.account.conversations.each(this.deleteConversation, this);
      this.updateHeader();
    }, this);
  }

  AccountView.prototype.onDetach = function () {
    this.account.unsubscribe({subscriber: this});
    this.root = null;
  };

  AccountView.prototype.updateHeader = function () {
    switch (this.account.status) {
    case Account.STATUS_NONE:
    case Account.STATUS_INITIALIZING:
      this.linkElem.text('Loading...');
      break;
    case Account.STATUS_INITIALIZED: 
      this.linkElem.text(this.account.name +
          ' (' + this.account.unreadCount + ')');
      break;
    case Account.STATUS_INITIALIZATION_FAILED:
      this.linkElem.text('Click here to log in');
      break;
    }
  };

  AccountView.prototype.addConversation = function (conversation) {
    var modified = new Date(conversation.modified),
        child = this.conversationList.firstElementChild;
    while (child && modified <= new Date(child.conversation.modified)) {
      child = child.nextElementSibling;
    }

    this.conversationList.insertBefore(
        new ConversationView(conversation, $).root, child);
    this.updateHeader();
  };

  AccountView.prototype.deleteConversation = function (conversation) {
    this.conversationList.removeChild(conversation.view.root);
    this.updateHeader();
  };

  global.AccountView = AccountView;
}) (window);
