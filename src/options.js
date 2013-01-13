(function () {
  'use strict';
  var accountInfo = {version: 2, accounts: []},
      signInWindowID = 0,
      signInTabID = 0;

  init();

  function discoverAccounts() {
    function discoverAccount(accountNumber) {
      fetchAccountInfo(accountNumber,
        function (number, title) {
          console.log(number, title);
          addAccount(number, title);
          discoverAccount(number + 1);
        },
        function (number) {
          console.log('Found ' + number + ' accounts');
          $('discovering-message').style.display = 'none';
        });
    }
    discoverAccount(0);
  }

  function fetchAccountInfo(accountNumber, onSuccess, onError) {
    var url = 'https://mail.google.com/mail/u/' +
      accountNumber + '/feed/atom/';
    $.get({
      url: url,
      onSuccess: function (xhr) {
        var title = xhr.responseXML.querySelector('title').textContent;
        title = /\S*@\S*/.exec(title)[0];
        onSuccess(accountNumber, title);
      },
      onError: function () {
        onError(accountNumber);
      }
    });
  }

  function addAccount(number, title) {
    var newAccount = accountInfo.accounts.every(
        function (account) {
          return (account.number !== number);
        });
    if (newAccount) {
      accountInfo.accounts.push({
        domain: 'mail',
        number: number
      });

      $('accounts-list').append($.make('p').text(title));
    }
  }

  function showSignInWindow() {
    if (signInWindowID) {
      chrome.windows.update(signInWindowID, { focused: true });
    } else {
      chrome.windows.create({
        url: 'https://accounts.google.com/AddSession?' +
        'hl=en&continue=https://mail.google.com/mail/u/0/&service=mail',
        type: 'popup',
        width: 900,
        height: 500,
        left: (screen.width - 900) / 2,
        top: (screen.height - 500) / 2
      }, function (win) {
        signInWindowID = win.id;
        signInTabID = win.tabs[0].id;
      });
    }
  }

  function closeSignInWindow() {
    chrome.windows.remove(signInWindowID, function () {
      signInWindowID = signInTabID = 0;
    });
  }

  function save() {
    localStorage.accountInfo = JSON.stringify(accountInfo);
    chrome.extension.getBackgroundPage().loadAccounts();
  }

  function init() {
    if (localStorage.accountInfo) {
      accountInfo = JSON.parse(localStorage.accountInfo);
    }

    accountInfo.accounts.each(function (account) {
      fetchAccountInfo(account.number, function (number, title) {
        $('accounts-list').append($.make('p').text(title));
      }, function () {
      });
    });

    discoverAccounts();

    $('add-account').on('click', showSignInWindow);
    $('save').on('click', save);

    chrome.tabs.onUpdated.addListener(function (tabID, info) {
      if (tabID == signInTabID && info.url &&
        info.url.indexOf(Account.GMAIL_URL) === 0) {
        var match = /mail\/u\/([0-9]+)/.exec(info.url);
        fetchAccountInfo(parseInt(match[1], 10),
          function (number, title) {
            addAccount(number, title);
            closeSignInWindow();
          }, function () {
            console.error('Couldn\'t parse feed for ' + info.url);
          });
      }
    });

    chrome.windows.onRemoved.addListener(function (id) {
      if (id == signInWindowID) {
        signInWindowID = signInTabID = 0;
      }
    });
  }
}) ();
