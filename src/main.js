(function (global) {
  'use strict';

  function Main(accountInfo) {
    this.accounts = [];
    accountInfo.accounts.each(this.addAccount.bind(this));
  }

  $.addEventHandling(Main, [
      'accountAdded',
      'accountRemoved',
      'accountInitFailed',
      'accountFeedsParsed',
      'accountFeedsParseFailed'
    ]);

  Main.prototype.addAccount = function (accountObj) {
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
