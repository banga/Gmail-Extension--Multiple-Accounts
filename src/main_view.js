(function (global) {
  'use strict';

  function MainView(main) {
    MainView.instance = this;

    this.main = main;
    this.main.view = this;

    this.root = $.make('#main');

    this.main.subscribe('accountAdded', this.addAccount, this);
    this.main.subscribe('accountRemoved', this.removeAccount, this);

    setTimeout(this.init.bind(this), 0);
  }

  MainView.prototype.init = function () {
    this.main.accounts.each(this.addAccount.bind(this));
    this.makeMultibar();
  };

  MainView.prototype.onDetach = function () {
    var this_ = this;
    this.main.accounts.each(function (account) {
      account.unsubscribe({subscriber: this_});
    });
    this.main.unsubscribe({subscriber: this});
    this.root = null;
    MainView.instance = null;
  };

  MainView.prototype.addAccount = function (account) {
    var accountView = new AccountView(account);
    this.root.append(accountView.root);

    this.root.children.each(function (child) {
      if (child.account.number > account.number) {
        this.root.insertBefore(accountView.root, child);
        return false;
      }
    }, this);

    account.subscribe('conversationDeleted',
        MainView.prototype.updateMultibarVisibility, this);
  };

  MainView.prototype.removeAccount = function (account) {
    account.unsubscribe({subscriber: this});
    this.root.removeChild(account.view.root);
    this.updateMultibarVisibility();
  };

  MainView.prototype.makeMultibarButton =
    function (text, action, iconX, iconY) {
    var button = $.make('.multibar-button');
    if (iconX !== undefined) {
      button.append($.make('span.tool-icon', null, {
        'background-position': iconX + 'px ' + iconY + 'px'
      }));
    }
    return button.append(text).on('click', function () {
      document.querySelectorAll('.conversation-selected').each(
        function (conversationElem) {
          action.call(conversationElem.conversation.view);
        });
    });
  };

  MainView.prototype.makeMultibar = function () {
    this.multibarElem = $('multibar')
      .append(this.makeMultibarButton('Mark as read',
            ConversationView.prototype.markAsRead))
      .append(this.makeMultibarButton('Archive',
            ConversationView.prototype.archive, -84, -21))
      .append(this.makeMultibarButton('Spam',
            ConversationView.prototype.markAsSpam, -42, -42))
      .append(this.makeMultibarButton('Delete',
            ConversationView.prototype.trash, -63, -42));

    $('multibar-close').on('click', function () {
      document.querySelectorAll('.conversation-selected > .selector').each(
        function (selector) {
          selector.click();
        });
    });
  };

  MainView.prototype.updateMultibarVisibility = function () {
    if (!document) return;

    if (document.querySelector('.conversation-selected')) {
      this.showMultibar();
    } else {
      this.hideMultibar();
    }
  };

  MainView.prototype.showMultibar = function () {
    this.multibarElem.style.top = '-5px';
  };

  MainView.prototype.hideMultibar = function () {
    this.multibarElem.style.top = '-45px';
  };

  global.MainView = MainView;
}) (window);
