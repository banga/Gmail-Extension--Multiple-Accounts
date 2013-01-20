var backgroundPage = chrome.extension.getBackgroundPage(),
    log = backgroundPage.log,
    main = backgroundPage.main,
    config = backgroundPage.config;

var Options = (function () {
  'use strict';
  var signInWindowID = 0,
      signInTabID = 0,
      throbber = new Throbber(16, '#69C'),
      suggestionsElem = $('suggestions'),
      activeSearchElem,
      activeLabelsListNumber = -1,
      isDiscovering = true;

  function labelMatcher(account, query, label) {
    var score = -1;
    if (!account.hasLabel(label)) {
      if (label === '') {
        score = 'inbox'.indexOf(query);
      } else {
        score = label.toLowerCase().indexOf(query);
      }
    }
    return { label: label, score: score };
  }

  function compareMatches(m1, m2) {
    if (m1.score === m2.score)
      return m1.label.toLowerCase() > m2.label.toLowerCase() ? 1 : -1;
    return m1.score - m2.score;
  }

  function getLabelSuggestions(account, query) {
    if (query.length === 0) return [];
    var matcher = labelMatcher.bind(null, account, query),
        labels = account.allLabels.concat(Object.keys(Config.SPECIAL_LABELS)),
        matches = labels.map(matcher).filter(
            function (match) { return match.score >= 0; });
    return matches.sort(compareMatches);
  }

  function addLabel(account, label) {
    var list = $('labels-' + account.number);
    config.addLabel(account.name, label);
    addLabelRow(list.firstElementChild, account, label);
    updateLabelsListHeight();
  }

  function addSuggestionElem(account, query, match) {
    var label = match.label,
        labelText = (label.length ? label : 'Inbox'),
        start = match.score,
        end = start + query.length,
        suggestion =
      $.make('.suggestion', {tabindex: 0})
        .append(
            $.make('.suggestion-label')
            .html(labelText.slice(0, start) + '<span class="match">' +
              labelText.slice(start, end) + '</span>' + labelText.slice(end)))
        .on('focus', function () {
              suggestionsElem.style.display = 'block';
            })
        .on('blur', hideLabelSuggestions)
        .on('click', function () {
            addLabel(account, label);
            removeSuggestionElem(this);
          });

    suggestion.on('keydown',
        onSuggestionKeyDown.bind(suggestion, account, label));
    suggestion.on('keypress', onSuggestionKeyPress);

    if (label in Config.SPECIAL_LABELS) {
      suggestion.append($.make('i').text(Config.SPECIAL_LABELS[label]));
    }
    suggestionsElem.append(suggestion);
  }

  function removeSuggestionElem(li) {
    (li.previousElementSibling || li.nextElementSibling ||
     activeSearchElem).focus();
    li.parentElement.removeChild(li);
  }

  var onSuggestionKeyPress = function (e) {
    e.preventDefault();
    activeSearchElem.value += String.fromCharCode(e.which);
    activeSearchElem.focus();
  };

  var onSuggestionKeyDown = function (account, label, e) {
    switch (e.which) {
    case 40:
      e.preventDefault();
      (this.nextElementSibling || activeSearchElem).focus();
      break;
    case 38:
      e.preventDefault();
      (this.previousElementSibling || activeSearchElem).focus();
      return;
    case 27:
      activeSearchElem.value = '';
      activeSearchElem.focus();
      break;
    case 13:
      e.preventDefault();
      addLabel(account, label);
      removeSuggestionElem(this);
      break;
    case 8:
      e.preventDefault();
      activeSearchElem.value = activeSearchElem.value.slice(0, -1);
      activeSearchElem.focus();
      break;
    default:
      break;
    }
  };

  function showLabelSuggestions(account, query, li) {
    suggestionsElem.html('');
    activeSearchElem = li.firstElementChild;

    var matches = getLabelSuggestions(account, query);
    if (matches.length === 0) {
      suggestionsElem.style.display = 'none';
      return;
    }

    suggestionsElem.style.display = 'block';
    suggestionsElem.style.top =
      (activeSearchElem.offsetTop + activeSearchElem.offsetHeight) + 'px';
    suggestionsElem.style.left = activeSearchElem.offsetLeft + 'px';

    matches.each(addSuggestionElem.bind(null, account, query));
  }

  function hideLabelSuggestions() {
    suggestionsElem.style.display = 'none';
  }

  function addLabelSearchElement(listElem, account) {
    var input = $.make('input#search-' + account.number, {
        type: 'search',
        size: 70,
        placeholder: 'Type here to add labels',
        incremental: '',
        disabled: true
      }),
        li = $.make('li').append(input);
    listElem.append(li);

    var suggest = function () {
      showLabelSuggestions(account, input.value.toLowerCase(), li);
      if (suggestionsElem.firstElementChild)
        suggestionsElem.firstElementChild.focus();
    };

    input
      .on('keyup', suggest)
      .on('focus', suggest)
      .on('keydown', function (e) {
        if (e.which == 40) {
          if (suggestionsElem.firstElementChild)
            suggestionsElem.firstElementChild.focus();
          e.preventDefault();
        }
      })
      .on('blur', hideLabelSuggestions);
  }

  function removeLabel(listElem, li, accountName, label) {
    config.removeLabel(accountName, label);
    listElem.removeChild(li);
    updateLabelsListHeight();
  }

  function addLabelRow(listElem, account, label) {
    var li = $.make('li')
      .append($.make('.icon-minus-sign'))
      .append($.make('.label-name').text(label ? label : 'Inbox'));
    li.firstElementChild.on('click',
        removeLabel.bind(null, listElem, li, account.name, label));

    if (label in Config.SPECIAL_LABELS) {
      li.append($.make('i').text(Config.SPECIAL_LABELS[label]));
    }
    listElem.insertBefore(li, listElem.firstElementChild.nextElementSibling);
  }

  function addAccountElement(account) {
    if ($('account-' + account.number)) return;
    var toggle = toggleLabelsList.bind(null, account.number);
    var accountElem = $.make('.account-row#account-' + account.number)
      .append($.make('.icon-envelope'))
      .append($.make('.title').text(account.name))
      .append($.make('.icon-chevron-down'))
      .on('click', toggle);

    var listElem = $.make('ul');
    addLabelSearchElement(listElem, account);
    account.labels.each(addLabelRow.bind(null, listElem, account));

    var labelsElem = $.make('.labels-list#labels-' + account.number)
      .append(listElem);

    var container =
      $.make('.account-row-container', {tabindex: 0})
        .append(accountElem)
        .append(labelsElem),
      accountList = $('accounts-list');
    accountList.insertBefore(container, accountList.lastElementChild);
    container.on('keyup', function (e) {
      if (e.which == 13 && e.target == container) {
        toggle();
      }
    });
  }

  function addAccount(account) {
    if (account.status === Account.STATUS_INITIALIZED)
      addAccountElement(account);
  }

  function hideLabelsList() {
    if (activeLabelsListNumber != -1) {
      $('labels-' + activeLabelsListNumber).style.removeProperty('height');
      $('search-' + activeLabelsListNumber).disabled = true;
      activeLabelsListNumber = -1;
    }
  }

  function showLabelsList(number) {
    hideLabelsList();
    activeLabelsListNumber = number;
    updateLabelsListHeight();
    $('search-' + number).disabled = false;
  }

  function updateLabelsListHeight() {
    var list = $('labels-' + activeLabelsListNumber);
    if (list) {
      list.style.height = list.firstElementChild.clientHeight + 'px';
    }
  }

  function toggleLabelsList(number) {
    if (number == activeLabelsListNumber) {
      hideLabelsList();
    } else {
      showLabelsList(number);
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
        height: 520,
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

  function init() {
    var details = chrome.app.getDetails();
    $('page-title').text('Google Mail Multi-Account Checker ' + details.version);

    main.accounts.each(addAccount);

    addEventListener('unload', function () {
      log.info('Options window closing');
      main.unsubscribe({subscriber: Options});
    });
    main.subscribe('accountInit', addAccount, Options);

    log.info('Discovering accounts');

    $('accounts-box').insertBefore(throbber.root, $('accounts-box-header'));
    throbber.start('Discovering...');
    main.discoverAccounts(function () {
      throbber.stop();
      isDiscovering = false;
      if (activeLabelsListNumber == -1 && main.accounts.length) {
        toggleLabelsList(main.accounts[0].number);
      }
    });

    $('add-account').on('click', showSignInWindow);
    $('help').on('click', function () {
      chrome.tabs.create({ url: 'help.html' });
    });

    suggestionsElem.on('mousewheel', function (e) {
      suggestionsElem.scrollTop -= e.wheelDeltaY;
    });

    chrome.tabs.onUpdated.addListener(function (tabID, info) {
      if (tabID == signInTabID && info.url &&
          info.url.indexOf(Account.GMAIL_URL) === 0) {
        var match = /mail\/u\/([0-9]+)/.exec(info.url);
        throbber.start('Loading account info...');
        main.addAccount({ number: parseInt(match[1], 10) });
        closeSignInWindow();
      }
    });

    chrome.windows.onRemoved.addListener(function (id) {
      if (id == signInWindowID) {
        signInWindowID = signInTabID = 0;
      }
    });
  }

  return {
    init: init
  };
}) ();

document.addEventListener('DOMContentLoaded', Options.init());
