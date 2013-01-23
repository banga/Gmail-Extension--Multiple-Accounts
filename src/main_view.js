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

  MainView.prototype.onMultibarClick = function (action) {
    var perAccount = {}, actionDescription = Account.GMAIL_ACTIONS[action];

    document.querySelectorAll('.conversation-selected').each(
        function (conversationElem) {
          var conversation = conversationElem.conversation,
              account = conversation.account;
          perAccount[account.name] = perAccount[account.name] || [account];
          perAccount[account.name].push(conversation);
          conversation.view.markBusy(actionDescription[1]);
        });

    var onSuccess = function (conversations) {
      conversations.each(function (conversation) {
        conversation.view.onActionSuccess();
      });
    };

    var onFailure = function (conversations) {
      conversations.each(function (conversation) {
        conversation.view.onActionFailure();
      });
    };

    perAccount.each(function (q, accountName) {
      var account = q.shift();
      log.info('Multibar q: ', q, accountName);
      account.doGmailAction(action, q, onSuccess.bind(null, q),
        onFailure.bind(null, q)); 
    });
  };

  MainView.prototype.makeMultibarButton = function (action) {
    var actionDescription = Account.GMAIL_ACTIONS[action];
    return $.make('.multibar-button')
      .append($.make(actionDescription[2]))
      .append(actionDescription[0]).on('click',
        this.onMultibarClick.bind(this, action));
  };

  MainView.prototype.makeMultibar = function () {
    this.multibarElem = $('multibar')
      .append(this.makeMultibarButton('rd'))
      .append(this.makeMultibarButton('ar'))
      .append(this.makeMultibarButton('sp'))
      .append(this.makeMultibarButton('tr'));

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
