(function (global) {
  'use strict';

  function Main() {
    this.accounts = [];
  }

  $.addEventHandling(Main, [
      'accountAdded',
      'accountRemoved',
      'accountInit',
      'accountInitFailed',
      'accountFeedParsed',
      'accountFeedParseFailed',
      'allFeedsParsed'
    ]);

  Main.prototype.toJSON = function () {
    var json = {
      version: 2,
      accounts: [],
      labels: {}
    };

    this.accounts.each(function (account) {
      var accJSON = account.toJSON();
      json.accounts.push({
        domain: accJSON.domain,
        number: accJSON.number
      });
      json.labels[accJSON.name] = accJSON.labels;
    });

    return json;
  };

  Main.prototype.discoverAccounts = function (onFinish) {
    var this_ = this;
    var discoverNext = function (accountNumber) {
      log.info('Discovering ', accountNumber);
      var account = this_._createAccount({ number: accountNumber });
      while (account === null) {
        ++accountNumber;
        account = this_._createAccount({ number: accountNumber });
      }
      account.subscribe('init', function () {
        discoverNext(accountNumber + 1);
      }, this_);
      account.subscribe('initFailed', function () {
        this_.removeAccount(accountNumber);
        onFinish(accountNumber);
        this_.checkStatus();
      }, this_);
      this_.addAccount(account);
    };
    discoverNext(0);
  };

  Main.prototype._createAccount = function (accountObj) {
    accountObj.domain = accountObj.domain || 'mail';
    accountObj.number = accountObj.number || 0;

    var isDuplicate = this.accounts.some(function (account) {
      return accountObj.domain == account.domain &&
        accountObj.number == account.number;
    });

    if (isDuplicate) {
      log.warn('Duplicate account');
      return null;
    }

    return new Account(accountObj);
  };

  Main.prototype.addAccount = function (accountObj) {
    var account = (accountObj instanceof Account) ?
      accountObj : this._createAccount(accountObj);

    if (!account) return;

    account.subscribe('init',
        this.publish.bind(this, 'accountInit', account), this);
    account.subscribe('initFailed', function () {
      this.publish('accountInitFailed', account);
      setTimeout(account.init.bind(account), 10000);
    }, this);

    account.subscribe('feedParsed', function () {
      this.publish('accountFeedParsed', account);
      this.checkStatus();
    }, this);
    account.subscribe('feedParseFailed', function () {
      this.publish('accountFeedParseFailed', account);
    }, this);

    this.accounts.push(account);
    this.publish('accountAdded', account);

    account.init();
  };

  Main.prototype.removeAccount = function (idx) {
    log.assert(idx >= 0 && idx < this.accounts.length);

    var account = this.accounts.splice(idx, 1)[0];
    this.publish('accountRemoved', account);
    account.unsubscribe({subscriber: this});
    return account;
  };

  Main.prototype.checkStatus = function () {
    var allParsed = this.accounts.every(function (account) {
      return account.feedStatus === Account.FEED_STATUS_PARSED;
    });

    if (allParsed) {
      this.publish('allFeedsParsed');
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
