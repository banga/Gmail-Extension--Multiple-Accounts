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
    var json = { accounts: [] };
    this.accounts.each(function (account) {
      json.accounts.push({ 
        domain: account.domain,
        name:   account.name,
        number: account.number,
        labels: account.labels,
        status: account.status,
        feedStatus: account.feedStatus
      });
    });
    return json;
  };

  Main.prototype.discoverAccounts = function (onFinish) {
    var this_ = this;
    var discoverNext = function (accountNumber) {
      log.info('Discovering ', accountNumber);
      var account = this_.createAccount({ number: accountNumber });
      while (account === null && accountNumber < 10) {
        ++accountNumber;
        account = this_.createAccount({ number: accountNumber });
      }
      if (account) {
        account.subscribe('init', function () {
          discoverNext(accountNumber + 1);
        }, this_);
        account.subscribe('initFailed', function () {
          this_.removeAccount(accountNumber);
          onFinish(accountNumber);
          this_.checkStatus();
        }, this_);
        this_.addAccount(account);
      } else {
        onFinish(accountNumber);
      }
    };
    discoverNext(0);
  };

  // Signed out, then signed in with a different id
  Main.prototype.onAccountChanged = function (args) {
    var otherAccount;
    this.accounts.each(function (account) {
      if (account !== args.account && account.name === args.newName) {
        otherAccount = account;
        return false;
      }
    });
    if (otherAccount) {
      otherAccount.reload();
      otherAccount.init();
    }
    args.account.reload();
    args.account.init();
  };

  Main.prototype.isDuplicateAccount = function (accountObj) {
    return this.accounts.some(function (account) {
      return accountObj.domain == account.domain &&
      accountObj.number == account.number;
    });
  };

  Main.prototype.createAccount = function (accountObj) {
    accountObj.domain = accountObj.domain || 'mail';
    accountObj.number = accountObj.number || 0;

    if (this.isDuplicateAccount(accountObj)) {
      log.warn('Duplicate account:', accountObj.domain, accountObj.number);
      return null;
    }

    if (!(accountObj instanceof Account))
      return new Account(accountObj);

    return accountObj;
  };

  Main.prototype.addAccount = function (accountObj) {
    var account = this.createAccount(accountObj);
    if (!account) return;

    account.subscribe('init',
        this.publish.bind(this, 'accountInit', account), this);

    account.subscribe('initFailed', function () {
      this.publish('accountInitFailed', account);
      setTimeout(account.init.bind(account), 60000);
    }, this);

    account.subscribe('feedParsed', function () {
      this.publish('accountFeedParsed', account);
      this.checkStatus();
    }, this);

    account.subscribe('feedParseFailed', function (args) {
      this.publish('accountFeedParseFailed', args);
    }, this);

    account.subscribe('changed', this.onAccountChanged, this);

    this.accounts.push(account);
    this.publish('accountAdded', account);

    account.init();
  };

  Main.prototype.removeAccount = function (accountNumber) {
    var removedAccount;
    this.accounts.some(function (account, idx) {
      if (account.number === accountNumber) {
        this.accounts.splice(idx, 1);
        removedAccount = account;
        return true;
      }
    }, this);

    if (!removedAccount) {
      log.warn('(removeAccount) Account not found:', accountNumber);
      log.trace();
      return null;
    }

    this.publish('accountRemoved', removedAccount);
    removedAccount.unsubscribe({subscriber: this});
    return removedAccount;
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

  Main.prototype.updateForever = function (timeout) {
    this.update();
    setTimeout(this.updateForever.bind(this, timeout), timeout);
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
