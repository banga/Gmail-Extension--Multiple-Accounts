var log = new Log('popup');

(function (global) {
  'use strict';
  var backgroundPage = chrome.extension.getBackgroundPage(),
      main = backgroundPage.main;

  function openTab(url) {
    chrome.tabs.create({ url: url });
  }

  function addButtonListeners() {
    $('options-link').on('click', function () {
      //analytics.optionsClick();
      openTab('options.html');
    });
  }

  function attachView() {
    addButtonListeners();
    main.detachView();
    var view = new MainView(main);
    $('inboxes').append(view.root);
  }

  function init() {
    log.info('Popup started');
    global.Account = backgroundPage.Account;
    global.Config = backgroundPage.Config;

    chrome.extension.connect();

    setTimeout(attachView, 0);
    setTimeout(main.update.bind(main), 1000);
  }

  if (main.accounts.length === 0) {
    Config.launchOptionsPage();
    window.close();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
}) (window);
