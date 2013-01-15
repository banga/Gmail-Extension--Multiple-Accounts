(function () {
  'use strict';
  var main,
      totalUnread = 0,
      animationFrames = 36,
      animationSpeed = 10, // ms
      animating = false,
      canvas,
      canvasContext,
      loggedInImage,
      rotation = 0,
      loadingAnimation = new LoadingAnimation();

  // A 'loading' animation displayed while we wait for the first response from
  // Gmail. This animates the badge text with a dot that cycles from left to
  // right.
  function LoadingAnimation() {
    this.timerId_ = 0;
    this.maxCount_ = 8;  // Total number of states in animation
    this.current_ = 0;  // Current state
    this.maxDot_ = 4;  // Max number of dots in animation
  }

  LoadingAnimation.prototype.paintFrame = function () {
    var text = '';
    for (var i = 0; i < this.maxDot_; i++) {
      text += (i == this.current_) ? '.' : ' ';
    }
    if (this.current_ >= this.maxDot_)
      text += '';

    chrome.browserAction.setBadgeText({text: text});
    this.current_++;
    if (this.current_ == this.maxCount_)
      this.current_ = 0;
  };

  LoadingAnimation.prototype.start = function () {
    if (this.timerId_)
      return;

    var self = this;
    this.timerId_ = window.setInterval(function () {
      self.paintFrame();
    }, 100);
  };

  LoadingAnimation.prototype.stop = function () {
    if (!this.timerId_)
      return;

    window.clearInterval(this.timerId_);
    this.timerId_ = 0;
  };

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

  chrome.extension.onMessage.addListener(
      function (request) {
        console.dir(request);
      });

  chrome.extension.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {
      console.log('Popup:', msg);
    });

    port.onDisconnect.addListener(function () {
      console.log('Popup closed');
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
    window.main = main;

    main.accounts.each(function (account) {
      account.subscribe('conversationAdded', function (conversation) {
        animateIfCountChanged();
        webkitNotifications.createNotification('images/icon_48.png',
          conversation.subject, conversation.summary).show();
      });
      account.subscribe('conversationDeleted', animateIfCountChanged);
    });

    main.subscribe('accountAdded', function () {
      loadingAnimation.start();
    });

    main.subscribe('accountRemoved', function () {
      animateIfCountChanged();
    });

    main.subscribe('accountFeedsParsed', function () {
      loadingAnimation.stop();
      animateIfCountChanged();
    });

    window.setInterval(main.update.bind(main), 60000);
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

    window.loadAccounts = loadAccounts;
  }

  function ease(x) {
    return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
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

  function showLoggedOut(account) {
    account.unreadCount = -1;

    var allLoggedOut = true;
    accountInfo.each(function (accounts) {
      accounts.each(function (account) {
        if (!account.isLoggedOut) {
          allLoggedOut = false;
          return false;
        }
      });
      if (!allLoggedOut)
        return false;
    });

    if (allLoggedOut) {
      chrome.browserAction.setIcon({path: 'images/gmail_not_logged_in.png'});
      chrome.browserAction.setBadgeBackgroundColor(
          {color: [190, 190, 190, 230]});
      chrome.browserAction.setBadgeText({text: '?'});
    }
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
}) ();
