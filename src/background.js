var main,
    log = new Log('background', Log.PRIORITY_MEDIUM),
    config = new Config();

var bg = (function () {
  'use strict';
  var animationFrames = 36,
      animationSpeed = 10, // ms
      animating = false,
      canvas,
      canvasContext,
      loggedInImage,
      rotation = 0,
      totalUnreadCount;

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
      chrome.tabs.create({url: 'options.html'});
      break;

    case 'updated':
      //analytics.updated(version);
      chrome.tabs.create({url: 'options.html'});
      break;
    }
  });

  function loadAccounts() {
    main = new Main();

    var addAccountListeners = function (account) {
      account.subscribe('conversationAdded', animateIfCountChanged, bg);
      account.subscribe('conversationDeleted', animateIfCountChanged, bg);
    };

    main.subscribe('accountAdded', function (account) {
      addAccountListeners(account);
    }, bg);

    main.subscribe('accountRemoved', function (account) {
      animateIfCountChanged();
      account.unsubscribe(bg);
    }, bg);

    main.subscribe('accountFeedParsed', function () {
      animateIfCountChanged();
    }, bg);

    //notifier = new Notifier(main);

    config.subscribe('accountAdded', main.addAccount.bind(main), bg);
    config.load();

    main.subscribe('accountInit', config.addAccount.bind(config), bg);
    main.discoverAccounts(log.info.bind(log, 'Accounts discovered:'));
    setInterval(main.update.bind(main), 60000);
  }

  function init() {
    canvas = document.getElementById('canvas');
    loggedInImage = document.getElementById('logged_in');
    canvasContext = canvas.getContext('2d');

    chrome.browserAction.setBadgeBackgroundColor({color: [20, 120, 255, 255]});
    chrome.browserAction.setIcon({path: 'images/gmail_logged_in.png'});

    loadAccounts();
  }

  function animateIfCountChanged() {
    var count = '' + countUnread();
    chrome.browserAction.getBadgeText({}, function (text) {
      if (count !== text) {
        totalUnreadCount = count;
        if (!animating) {
          animating = true;
          animateFlip();
        }
      }
    });
  }

  function countUnread() {
    var count = 0;
    main.accounts.each(function (account) {
      count += account.unreadCount;
    });
    return count;  
  }

  function animateFlip() {
    rotation += 1 / animationFrames;
    drawIconAtRotation();

    if (rotation <= 1) {
      setTimeout(animateFlip, animationSpeed);
    } else {
      animating = false;
      rotation = 0;
      drawIconAtRotation();
      chrome.browserAction.setBadgeText({text: totalUnreadCount});
      chrome.browserAction.setBadgeBackgroundColor(
          {color: [20, 120, 255, 255]});
    }
  }

  function ease(x) {
    return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
  }

  function drawIconAtRotation() {
    canvasContext.save();
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.translate(
      Math.ceil(canvas.width / 2),
      Math.ceil(canvas.height / 2));
    canvasContext.rotate(2 * Math.PI * ease(rotation));
    canvasContext.drawImage(loggedInImage,
      -Math.ceil(canvas.width / 2),
      -Math.ceil(canvas.height / 2));
    canvasContext.restore();

    chrome.browserAction.setIcon({
      imageData: canvasContext.getImageData(0, 0, canvas.width, canvas.height)
    });
  }

  document.addEventListener('DOMContentLoaded', init, false);

  return {
    loadAccounts: loadAccounts
  };
}) ();
