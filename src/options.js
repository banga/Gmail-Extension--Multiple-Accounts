var log = new Log('options');
var main = new Main();

(function () {
  'use strict';
  var signInWindowID = 0,
      signInTabID = 0,
      throbber = new Throbber(16, '#69C'),
      suggestionsElem = $('suggestions');

  function addLabelRow(listElem, label) {
    var li = $.make('li').text(label);
    if (label in Main.PREDEFINED_LABELS) {
      li.append($.make('i').text(Main.PREDEFINED_LABELS[label]));
    }
    listElem.append(li);
  }

  function labelMatcher(query, label) {
    return label.toLowerCase().indexOf(query) >= 0;
  }

  function getLabelSuggestions(account, query) {
    var matcher = labelMatcher.bind(null, query),
        matches = Object.keys(Main.PREDEFINED_LABELS).filter(matcher)
      .concat(account.allLabels.filter(matcher));
    return matches.filter(function (match) {
      return !account.hasLabel(match);
    });
  }

  function showLabelSuggestions(account, query, li) {
    var matches = getLabelSuggestions(account, query);
    suggestionsElem.html('');

    if (matches.length === 0) {
      suggestionsElem.style.display = 'none';
      return;
    }

    suggestionsElem.style.display = 'block';
    li.append(suggestionsElem);

    matches.each(function (match) {
      var addLabel = function () {
        var list = $('labels-' + account.number);
        account.addLabel(match);
        addLabelRow(list.firstElementChild, match);
        list.style.height = list.firstElementChild.clientHeight + 'px';

        var nbr = this.nextElementSibling || this.previousElementSibling ||
          suggestionsElem.previousElementSibling;
        nbr.focus();
        this.parentElement.removeChild(this);
      };

      var suggestion = $.make('.suggestion', {tabindex: 0}).text(match)
        .on('focus', function () {
          suggestionsElem.style.display = 'block';
        })
        .on('keydown', function (e) {
          if (e.which == 40 && this.nextElementSibling) {
            this.nextElementSibling.focus();
          } else if (e.which == 38 && this.previousElementSibling) {
            this.previousElementSibling.focus();
          } else if (e.which == 13) {
            addLabel.call(this);
          }
        })
        .on('click', addLabel);

      if (match in Main.PREDEFINED_LABELS) {
        suggestion.append($.make('i').text(Main.PREDEFINED_LABELS[match]));
      }

      suggestionsElem.append(suggestion);
    });
  }

  function hideLabelSuggestions() {
    suggestionsElem.style.display = 'none';
  }

  function addLabelSearchElement(listElem, account) {
    var input = $.make('input', {
      type: 'search',
      size: 60,
      placeholder: 'Type here to add labels',
      incremental: ''
    });
    var li = $.make('li').append(input);
    listElem.append(li);

    var suggest = function () {
      showLabelSuggestions(account, input.value.toLowerCase(), li);
    };

    input
      .on('search', suggest)
      .on('focus', suggest)
      .on('keydown', function (e) {
        if (e.which == 40) {
          suggestionsElem.firstElementChild.focus();
        }
      })
      .on('blur', hideLabelSuggestions);
  }

  function addAccountElement(account) {
    var accountElem = $.make('.account-row#account-' + account.number)
      .append($.make('.title').text(account.name))
      .append($.make('.icon-chevron-down'))
      .on('click', toggleLabelsList.bind(null, account.number));

    var listElem = $.make('ul');
    addLabelSearchElement(listElem, account);
    account.labels.each(addLabelRow.bind(null, listElem));

    var labelsElem = $.make('.labels-list#labels-' + account.number)
      .append(listElem);

    var accountList = $('accounts-list');
    accountList.insertBefore(
      $.make('.account-row-container')
        .append(accountElem)
        .append(labelsElem),
        accountList.firstChild);
  }

  function toggleLabelsList(number) {
    var list = $('labels-' + number);
    if (list.style.height) {
      list.style.removeProperty('height');
    } else {
      list.style.height = list.firstElementChild.clientHeight + 'px';
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
    localStorage.accountInfo = JSON.stringify(main.toJSON());
    chrome.extension.getBackgroundPage().bg.loadAccounts();
  }

  function init() {
    main.subscribe('accountAdded', function (account) {
      account.subscribe('feedParsed', addAccountElement);
    });

    if (localStorage.accountInfo) {
      log.info('Loading accounts from local storage');
      main.fromJSON(JSON.parse(localStorage.accountInfo));
    }

    log.info('Discovering accounts');
    $('accounts-box-header').append(throbber.root);
    throbber.start('Discovering...');
    main.discoverAccounts(throbber.stop.bind(throbber));

    $('add-account').on('click', showSignInWindow);

    chrome.tabs.onUpdated.addListener(function (tabID, info) {
      if (tabID == signInTabID && info.url &&
          info.url.indexOf(Account.GMAIL_URL) === 0) {
        var match = /mail\/u\/([0-9]+)/.exec(info.url);
        throbber.start('Loading account info...');
        main.addAccount({number: parseInt(match[1], 10)});
        closeSignInWindow();
      }
    });

    chrome.windows.onRemoved.addListener(function (id) {
      if (id == signInWindowID) {
        signInWindowID = signInTabID = 0;
      }
    });
  }


  init();
}) ();

