(function () {
  'use strict';
  var accountInfo = {version: 2, accounts: []},
      signInWindowID = 0,
      signInTabID = 0,
      log = new Log('options');

  function discoverAccounts() {
    function discoverAccount(accountNumber) {
      fetchAccountInfo(accountNumber,
        function (number, title) {
          log.info(number, title);
          addAccount(number, title);
          discoverAccount(number + 1);
        },
        function (number) {
          log.info('Found ' + number + ' accounts');
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

  function fetchAccountLabels(accountNumber, onSuccess, onError) {
    var url = 'https://mail.google.com/mail/u/' +
      accountNumber + '/h/';
    $.get({
      url: url,
      onSuccess: function (xhr) {
        var doc = document.createElement('document');
        doc.innerHTML = xhr.responseText;
        var labelContainer = doc.querySelector('td.lb');
        if (labelContainer) {
          var labelElems = labelContainer.querySelectorAll('a');
          var labels = [];
          labelElems.each(function (elem) {
            var href = elem.getAttribute('href');
            if (href) {
              var match = /&l=(\S*)/.exec(href);
              if (match) {
                var label = window.unescape(match[1]).replace(/\+/g, ' ');
                labels.push(label);
              }
            }
          });
          onSuccess(accountNumber, labels);
        }
      },
      onError: onError
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
        number: number,
        labels: []
      });

      fetchAccountLabels(number, function (number, labels) {
        addAccountElement(number, title, labels);
      }, function () {
        addAccountElement(number, title);
      });
    }
  }

  function addLabel(number, label) {
    var account = accountInfo.accounts[number];
    account.labels = account.labels || [''];
    if (account.labels.indexOf(label) == -1) {
      account.labels.push(label);
    }
  }

  function removeLabel(number, label) {
    var account = accountInfo.accounts[number];
    account.labels = account.labels || [''];
    var idx = account.labels.indexOf(label);
    if (idx != -1) {
      account.labels.splice(idx, 1);
    }
  }

  function addLabelSelectionElement(accountElem, label, name, accountNumber) {
    var checkbox = $.make('input')
      .attr('type', 'checkbox')
      .attr('value', label);

    var account = accountInfo.accounts[accountNumber];
    if (account && account.labels &&
        account.labels.indexOf(label) != -1) {
      log.info('Label:', label, 'Account:', accountNumber);
      checkbox.attr('checked', '');
    }

    accountElem.append(
        $.make('.label-select')
        .append(checkbox)
        .append(name));
  }

  function addAccountElement(number, title, labels) {
    var accountElem = $.make('#account-' + number)
      .append($.make('.title').text(title))
      .on('change', function (e) { 
        if (e.target.checked) {
          addLabel(number, e.target.value);
        } else {
          removeLabel(number, e.target.value);
        }
      });

    addLabelSelectionElement(accountElem, '', 'Inbox', number);

    if (labels) {
      labels.each(function (label) {
        addLabelSelectionElement(accountElem, label, label, number);
      });
    }

    $('accounts-list').append(accountElem);
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
    chrome.extension.getBackgroundPage().bg.loadAccounts();
  }

  function init() {
    if (localStorage.accountInfo) {
      accountInfo = JSON.parse(localStorage.accountInfo);
    }

    accountInfo.accounts.each(function (account) {
      fetchAccountInfo(account.number, function (number, title) {
        fetchAccountLabels(number, function (number, labels) {
          addAccountElement(number, title, labels);
        }, function () {
          addAccountElement(number, title);
        });
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
            log.error('Couldn\'t parse feed for ' + info.url);
          });
      }
    });

    chrome.windows.onRemoved.addListener(function (id) {
      if (id == signInWindowID) {
        signInWindowID = signInTabID = 0;
      }
    });
  }


  init();

  window.accountInfo = accountInfo;

}) ();
