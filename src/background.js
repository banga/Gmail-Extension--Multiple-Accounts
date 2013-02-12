var main,
    badge,
    log = new Log('background', Log.PRIORITY_LOW),
    config = new Config();

var bg = (function () {
  'use strict';
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
    var url = changeInfo.url;
    if (url && Account.isGmailURL(url)) {
      var newAccount = true;
      main.accounts.each(function (account) {
        if (account.isAccountURL(url)) {
          account.update();
          newAccount = false;
        }
      });
      if (newAccount) {
        var match = /mail\.google\.com\/([^\/]*)\/u\/([0-9]+)/.exec(url),
            domain = match[1], number = parseInt(match[2], 10); 
        if (domain == 'mail') {
          config.addAccount(new Account({ domain: 'mail', number: number}));
        }
      }
    }
  });

  chrome.extension.onConnect.addListener(function (port) {
    log.info('Popup connected');
    port.onDisconnect.addListener(function () {
      log.info('Popup disconnected');
    });
  });

  chrome.runtime.onInstalled.addListener(function (details) {
    switch (details.reason) {
    case 'installed':
      //analytics.installed(version);
      onUpdated();
      break;

    case 'updated':
      //analytics.updated(version);
      onUpdated();
      break;
    }
  });

  function onUpdated(oldVersion, version) {
    if (!oldVersion || oldVersion[0] === '1') {
      Config.launchOptionsPage();
      log.info('Updated ', oldVersion, version);
    }
  }

  function checkIfUpdated() {
    var version = chrome.app.getDetails().version;
    if (localStorage.version !== version) {
      onUpdated(localStorage.version, version);
      localStorage.version = version;
      chrome.tabs.create({url: 'updates.html'});
    }
  }

  function loadAccounts() {
    main = new Main();

    //notifier = new Notifier(main);

    config.subscribe('accountAdded', main.addAccount.bind(main), bg);
    config.load();

    main.subscribe('accountInit', config.addAccount.bind(config), bg);
    main.discoverAccounts(log.info.bind(log, 'Accounts discovered:'));
    main.updateForever(30000);
  }

  function init() {
    checkIfUpdated();
    loadAccounts();
    badge = new Badge(main);
  }

  document.addEventListener('DOMContentLoaded', init, false);

  return {
    loadAccounts: loadAccounts
  };
}) ();
