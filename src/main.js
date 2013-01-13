function Main(accountInfo) {
  'use strict';
  this.accounts = [];
  accountInfo.accounts.each(this.addAccount.bind(this));
}

$.addEventHandling(Main, [
    'accountAdded',
    'accountRemoved',
    'accountFeedsParsed',
    'accountFeedsParseFailed'
  ]);

Main.prototype.addAccount = function (accountObj) {
  'use strict';
  var account = new Account(accountObj);
  this.accounts.push(account);
  this.publish('accountAdded', account);

  account.subscribe('feedParsed', this.checkStatus, this);
  account.subscribe('feedParseFailed', function () {
    this.publish('accountFeedsParseFailed', account);
  }, this);
};

Main.prototype.removeAccount = function (idx) {
  'use strict';
  console.assert(idx >= 0 && idx < this.accounts.length);

  var account = this.accounts.splice(idx, 1)[0];
  this.publish('accountRemoved', account);
  return account;
};

Main.prototype.checkStatus = function () {
  'use strict';
  var allParsed = this.accounts.every(function (account) {
    return account.status == Account.STATUS_FEED_PARSED;
  });

  if (allParsed) {
    this.publish('accountFeedsParsed');
  }
};

Main.prototype.update = function () {
  'use strict';
  this.accounts.each(function (account) {
    account.update();
  });
};

Main.prototype.detachView = function () {
  'use strict';
  if (this.view) {
    this.accounts.each(function (account) {
      account.detachView();
    });
    this.view.onDetach();
    this.view = null;
  }
};

Main.prototype.attachView = function (view) {
  'use strict';
  this.detachView();
  this.view = view;
};
