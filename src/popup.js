var log = new Log('popup');

(function (global) {
  'use strict';
  var backgroundPage = chrome.extension.getBackgroundPage(),
      main = backgroundPage.main;

  function openTab(url) {
    chrome.tabs.create({ url: url });
  }

  function addButtonListeners() {
    $('donate-button').on('click', function () {
      //analytics.donateClick();
      openTab('https://www.paypal.com/cgi-bin/webscr?cmd=_donations' +
        '&business=323R63UN8G5GS&lc=US&currency_code=USD' +
        '&item_name=Google%20Mail%20Multi-Account%20Checker' +
        '&bn=PP-DonationsBF:btn_donateCC_LG.gif:NonHosted');
    });

    $('rate-button').on('click', function () {
      //analytics.rateClick();
      openTab('https://chrome.google.com/webstore/detail/' +
        'google-mail-multi-account/mcpnehokodklgijkcakcfmccgpanipfp/reviews');
    });

    $('options-link').on('click', function () {
      //analytics.optionsClick();
      openTab('options.html');
    });

    $('feedback-link').on('click', function () {
      if ($('inboxes').style.display == 'none') {
        $('inboxes').style.display = 'block';
        $('feedback').style.display = 'none';
      } else {
        $('inboxes').style.display = 'none';
        $('feedback').style.display = 'block';
      }
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
    setTimeout(main.update.bind(main), 10000);
  }

  if (main.accounts.length === 0) {
    Config.launchOptionsPage();
    window.close();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
}) (window);
