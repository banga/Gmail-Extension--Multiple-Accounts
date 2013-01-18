var main,
    notifier,
    log = new Log('background'),
    _test = function () {
      chrome.tabs.create({ url: 'test.html' });
    };

var bg = (function () {
  'use strict';
  var totalUnread = 0,
      animationFrames = 36,
      animationSpeed = 10, // ms
      animating = false,
      canvas,
      canvasContext,
      loggedInImage,
      rotation = 0,
      loadingAnimation = new LoadingAnimation();

  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
    var url = changeInfo.url;
    if (url && Account.isGmailURL(url)) {
      main.accounts.each(function (account) {
        if (account.isAccountURL(url)) {
          account.update();
        }
      });
    }
  });

  chrome.extension.onConnect.addListener(function (port) {
    port.onDisconnect.addListener(function () {
      main.detachView();
    });
  });

  function checkIfUpdated() {
    var version = chrome.app.getDetails().version;

    if (!('version' in localStorage)) {
      //analytics.installed(version);
    }

    var localVersion = localStorage.version || '';
    if (version !== localVersion) {
      // chrome.tabs.create({url: 'updates.html'});
      localStorage.version = version;
      //analytics.updated(version);
    }
  }

  function loadAccounts() {
    var accountInfo;

    log.info('loadAccounts');

    if (localStorage.accountInfo) {
      accountInfo = JSON.parse(localStorage.accountInfo);
      if (accountInfo.version != '2') {
        // Update account info to new style (array of Accounts)
        var oldAccountInfo = accountInfo;
        accountInfo = {version: 2, accounts: []};
        oldAccountInfo.each(function (accounts, domain) {
          accounts.each(function (account, number) {
            accountInfo.accounts.push({domain: domain, number: number});
          });
        });
        localStorage.accountInfo = JSON.stringify(accountInfo); 
      }
    } else {
      accountInfo = {
        version: 2,
        accounts: [{domain: 'gmail', number: 0}]
      };
      localStorage.accountInfo = JSON.stringify(accountInfo);
    }

    main = new Main(accountInfo);

    var addAccountListeners = function (account) {
      account.subscribe('conversationAdded', animateIfCountChanged, bg);
      account.subscribe('conversationDeleted', animateIfCountChanged, bg);
    };

    main.accounts.each(addAccountListeners);

    main.subscribe('accountAdded', function (account) {
      loadingAnimation.start();
      addAccountListeners(account);
    }, bg);

    main.subscribe('accountRemoved', function (account) {
      animateIfCountChanged();
      account.unsubscribe(bg);
    }, bg);

    main.subscribe('accountFeedsParsed', function () {
      loadingAnimation.stop();
      animateIfCountChanged();
    }, bg);

    notifier = new Notifier(main);

    setInterval(main.update.bind(main), 60000);
  }

  function init() {
    checkIfUpdated();

    canvas = document.getElementById('canvas');
    loggedInImage = document.getElementById('logged_in');
    canvasContext = canvas.getContext('2d');

    chrome.browserAction.setBadgeBackgroundColor({color: [20, 120, 255, 255]});
    chrome.browserAction.setIcon({path: 'images/gmail_logged_in.png'});
    loadingAnimation.start();

    loadAccounts();
  }

  function animateIfCountChanged() {
    var count = countUnread();
    if (count !== totalUnread) {
      totalUnread = count;
      if (!animating) {
        animating = true;
        animateFlip();
      }
    }
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
      chrome.browserAction.setBadgeText(
          { text: totalUnread ? (totalUnread + '') : '' });
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
