(function (global) {
  'use strict';

  function Config() {
    this.accounts = [];
    this.labels = {};
  }

  Config.ACCOUNTS_AT = 'accounts';
  Config.LABELS_AT = 'labels';

  Config.SPECIAL_LABELS = {
    '': 'Emails in your inbox (Default)',
    'Important': 'Emails marked as Important',
    'Starred': 'Emails you have starred',
    'Archived': 'Emails you have archived',
    'Chat': 'Chat conversations',
    'Unread': 'All unread emails'
  };


  $.addEventHandling(Config, [
      'accountAdded',
      'accountRemoved',
      'labelAdded',
      'labelRemoved'
    ]);

  Config.prototype.load = function () {
    if (Config.ACCOUNTS_AT in localStorage) {
      this.accounts = JSON.parse(localStorage[Config.ACCOUNTS_AT]);
    } else {
      this.accounts = {};
      localStorage[Config.ACCOUNTS_AT] = '{}';
    }

    if (Config.LABELS_AT in localStorage) {
      this.labels = JSON.parse(localStorage[Config.LABELS_AT]);
    } else {
      this.labels = {};
      localStorage[Config.LABELS_AT] = '{}';
    }
  };

  Config.prototype.save = function () {
    localStorage[Config.ACCOUNTS_AT] = JSON.stringify(this.accounts);
    localStorage[Config.LABELS_AT] = JSON.stringify(this.labels);
  };

  Config.prototype.makeSpaceForLabels = function (accountName) {
    if (!(accountName in this.labels))
      this.labels[accountName] = { '': '' };
  };

  Config.prototype.addLabel = function (accountName, label) {
    this.makeSpaceForLabels(accountName);
    this.labels[accountName][label] = '';
    this.publish('labelAdded', { accountName: accountName, label: label });
    this.save();
  };

  Config.prototype.removeLabel = function (accountName, label) {
    this.makeSpaceForLabels(accountName);
    this.publish('labelRemoved', { accountName: accountName, label: label });
    delete this.labels[accountName][label];
    this.save();
  };

  Config.prototype.getLabels = function (accountName) {
    this.makeSpaceForLabels(accountName);
    return Object.keys(this.labels[accountName]);
  };

  Config.prototype.makeAccountID = function (domain, number) {
    return domain + '-' + number;
  };

  Config.prototype.makeSpaceForAccount = function (accountID) {
    if (!(accountID in this.accounts))
      this.accounts[accountID] = {};
  };

  Config.prototype.addAccount = function (domain, number) {
    var accountID = this.makeAccountID(domain, number);
    this.makeSpaceForAccount(accountID);
    this.accounts[accountID] = { domain: domain, number: number };
    this.publish('accountAdded', domain, number);
    this.save();
  };

  Config.prototype.removeAccount = function (domain, number) {
    var accountID = this.makeAccountID(domain, number);
    this.publish('accountRemoved', domain, number);
    delete this.accounts[accountID];
    this.save();
  };

  global.Config = Config;
}) (window);
