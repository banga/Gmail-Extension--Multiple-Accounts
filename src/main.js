(function (global) {
  'use strict';

  function Main() {
    this.accounts = [];
  }

  $.addEventHandling(Main, [
      'accountAdded',
      'accountRemoved',
      'accountInitFailed',
      'accountFeedsParsed',
      'accountFeedsParseFailed'
    ]);

  Main.PREDEFINED_LABELS = {
    '': 'Inbox',
    'Unread': 'All unread emails',
    'Starred': 'Starred emails',
    'Archived': 'Archived emails'
  };

  Main.prototype.fromJSON = function (accountInfo) {
    if (accountInfo) {
      accountInfo.accounts.each(this.addAccount.bind(this));
    }
  };

  Main.prototype.toJSON = function () {
    log.error('TODO: toJSON');
  };

  Main.prototype.discoverAccounts = function (onFinish) {
    var this_ = this;
    var discoverNext = function (accountNumber) {
      var account = new Account({ number: accountNumber });
      account.subscribe('init', function () {
        this_.addAccount(account);
        discoverNext(accountNumber + 1);
      });
      account.subscribe('initFailed', onFinish);
      account.init();
    };
    discoverNext(0);
  };

  Main.prototype.addAccount = function (accountObj) {
    accountObj.domain = accountObj.domain || 'mail';
    accountObj.number = accountObj.number || 0;

    var duplicate = this.accounts.some(function (account) {
      return accountObj.domain == account.domain &&
        accountObj.number == account.number;
    });

    if (duplicate) {
      log.error('Duplicate account');
      return;
    }

    var account = new Account(accountObj);

    account.subscribe('initFailed', function () {
      this.publish('accountInitFailed', account);
      setTimeout(account.init.bind(account), 10000);
    }, this);

    account.subscribe('feedParsed', this.checkStatus, this);
    account.subscribe('feedParseFailed', function () {
      this.publish('accountFeedsParseFailed', account);
    }, this);

    this.accounts.push(account);
    this.publish('accountAdded', account);

    account.init();
  };

  Main.prototype.removeAccount = function (idx) {
    log.assert(idx >= 0 && idx < this.accounts.length);

    var account = this.accounts.splice(idx, 1)[0];
    this.publish('accountRemoved', account);
    return account;
  };

  Main.prototype.checkStatus = function () {
    var allParsed = this.accounts.every(function (account) {
      return account.feedStatus === Account.FEED_STATUS_PARSED;
    });

    if (allParsed) {
      this.publish('accountFeedsParsed');
    }
  };

  Main.prototype.update = function () {
    this.accounts.each(function (account) {
      account.update();
    });
  };

  Main.prototype.detachView = function () {
    if (this.view) {
      this.accounts.each(function (account) {
        account.detachView();
      });
      this.view.onDetach();
      this.view = null;
    }
  };

  Main.prototype.attachView = function (view) {
    this.detachView();
    this.view = view;
  };

  global.Main = Main;

}) (window);
