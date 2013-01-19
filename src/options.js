var log = new Log('options', Log.PRIORITY_MEDIUM),
    main = new Main();

(function () {
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
    var matcher = labelMatcher.bind(null, account, query),
        labels = account.allLabels.concat(Object.keys(Main.PREDEFINED_LABELS)),
        matches = labels.map(matcher).filter(
            function (match) { return match.score >= 0; });
    return matches.sort(compareMatches);
  }

  function addLabel(account, label) {
    var list = $('labels-' + account.number);
    account.addLabel(label);
    addLabelRow(list.firstElementChild, account, label);
    updateLabelsListHeight();
  }

  function removeSuggestionElem(li) {
    li.parentElement.removeChild(li);
    activeSearchElem.focus();
  }

  var onSuggestionKeyDown = function (account, label, e) {
    if (e.which == 40 && this.nextElementSibling) {
      this.nextElementSibling.focus();
    } else if (e.which == 38) {
      (this.previousElementSibling ||
       suggestionsElem.previousElementSibling).focus();
    } else if (e.which == 27) {
      suggestionsElem.previousElementSibling.focus();
    } else if (e.which == 13) {
      addLabel(account, label);
      removeSuggestionElem(this);
    }
  };

  function addSuggestion(account, query, match) {
    var label = match.label,
        labelText = (label.length ? label : 'Inbox'),
        start = match.score,
        end = start + query.length,
        suggestion =
      $.make('.suggestion', {tabindex: 0})
        .append(
            $.make('.suggestion-label')
            .html(labelText.slice(0, start) + '<b>' +
              labelText.slice(start, end) + '</b>' + labelText.slice(end)))
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
    if (label in Main.PREDEFINED_LABELS) {
      suggestion.append($.make('i').text(Main.PREDEFINED_LABELS[label]));
    }
    suggestionsElem.append(suggestion);
  }

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

    matches.each(addSuggestion.bind(null, account, query));
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
    });
    var li = $.make('li').append(input);
    listElem.append(li);

    var suggest = function () {
      showLabelSuggestions(account, input.value.toLowerCase(), li);
    };

    input
      .on('keyup', suggest)
      .on('focus', suggest)
      .on('keydown', function (e) {
        if (e.which == 40) {
          suggestionsElem.firstElementChild.focus();
        }
      })
      .on('blur', hideLabelSuggestions);
  }

  function addLabelRow(listElem, account, label) {
    var li = $.make('li')
      .append($.make('.icon-minus-sign')
        .on('click', function () {
          account.removeLabel(label);
          listElem.removeChild(this.parentElement);
          updateLabelsListHeight();
        }))
      .append($.make('.label-name').text(label ? label : 'Inbox'));

    if (label in Main.PREDEFINED_LABELS) {
      li.append($.make('i').text(Main.PREDEFINED_LABELS[label]));
    }
    listElem.insertBefore(li, listElem.firstElementChild.nextElementSibling);
  }

  function addAccountElement(account) {
    var accountElem = $.make('.account-row#account-' + account.number)
      .append($.make('.icon-envelope'))
      .append($.make('.title').text(account.name))
      .append($.make('.icon-chevron-down'))
      .on('click', toggleLabelsList.bind(null, account.number));

    var listElem = $.make('ul');
    addLabelSearchElement(listElem, account);
    account.labels.each(addLabelRow.bind(null, listElem, account));

    var labelsElem = $.make('.labels-list#labels-' + account.number)
      .append(listElem);

    var accountList = $('accounts-list');
    accountList.insertBefore(
      $.make('.account-row-container')
        .append(accountElem)
        .append(labelsElem),
      accountList.lastElementChild);
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
    main.subscribe('accountFeedParsed', function (account) {
      addAccountElement(account);
      if (!isDiscovering) throbber.stop();
      if (activeLabelsListNumber == -1) {
        toggleLabelsList(account.number);
      }
    });

    if (localStorage.accountInfo) {
      log.info('Loading accounts from local storage');
      main.fromJSON(JSON.parse(localStorage.accountInfo));
    }

    log.info('Discovering accounts');
    $('accounts-box-header').append(throbber.root);
    throbber.start('Discovering...');
    main.discoverAccounts(function () {
      throbber.stop();
      isDiscovering = false;
    });

    $('add-account').on('click', showSignInWindow);

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


  init();
}) ();

