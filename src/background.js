var animationFrames = 36;
var animationSpeed = 10; // ms
var canvas;
var canvasContext;
var loggedInImage;
var pollIntervalMin = 1000 * 60;  // 1 minute
var pollIntervalMax = 1000 * 60 * 60;  // 1 hour
var rotation = 0;
var unreadCount = [];
var loadingAnimation = new LoadingAnimation();
var requestTimerId = [];
var isLoggedOut = [];
var version = 3;
// User data
var accountInfo = {mail: [{number: 0}]};

// A "loading" animation displayed while we wait for the first response from
// Gmail. This animates the badge text with a dot that cycles from left to
// right.
function LoadingAnimation() {
  this.timerId_ = 0;
  this.maxCount_ = 8;  // Total number of states in animation
  this.current_ = 0;  // Current state
  this.maxDot_ = 4;  // Max number of dots in animation
}

LoadingAnimation.prototype.paintFrame = function() {
  var text = "";
  for (var i = 0; i < this.maxDot_; i++) {
    text += (i == this.current_) ? "." : " ";
  }
  if (this.current_ >= this.maxDot_)
    text += "";

  chrome.browserAction.setBadgeText({text:text});
  this.current_++;
  if (this.current_ == this.maxCount_)
    this.current_ = 0;
};

LoadingAnimation.prototype.start = function() {
  if (this.timerId_)
    return;

  var self = this;
  this.timerId_ = window.setInterval(function() {
    self.paintFrame();
  }, 100);
};

LoadingAnimation.prototype.stop = function() {
  if (!this.timerId_)
    return;

  window.clearInterval(this.timerId_);
  this.timerId_ = 0;
};

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if(changeInfo.url && isGmailUrl(changeInfo.url)) {
    accountInfo.each(function(accounts) {
      accounts.each(function(account) {
        if (isAccountUrl(account, changeInfo.url)) {
          getInboxCount(account, updateUnreadCount);
          return;
        }
      });
    });
  }
});

function loadAccountInfo() {
  if(localStorage.accountInfo)
    accountInfo = JSON.parse(localStorage.accountInfo);
  else
    saveToLocalStorage(accountInfo);

  accountInfo.each(function(accounts) {
    accounts.each(function(account) {
      account.requestFailureCount = 0;
      account.isLoggedOut = true;
      startRequest(account);
    });
  });
}

function checkIfUpdated() {
  var localVersion = localStorage.version || 0;

  if(version > parseInt(localVersion, 10)) {
    // Still using the old format - convert to new
    if(localStorage.numAccounts) {
      var domain = localStorage.customDomain ? localStorage.customDomain : "mail";

      var accounts = [];
      for(var i = 0; i < localStorage.numAccounts; i++) {
        var info = {
          'domain': domain,
          'requestFailureCount': 0,
          'isLoggedOut': true,
          'number': i
        };
        if(localStorage['user' + i]) {
          info.user = localStorage['user' + i];
          info.pass = localStorage['pass' + i];
        }
        accounts[accounts.length] = info;
      }

      accountInfo = {};
      accountInfo[domain] = accounts;

      localStorage.clear();
      localStorage.accountInfo = JSON.stringify(accountInfo);
    }

    chrome.tabs.create({url: 'updates.html'});
    localStorage.version = version;
  }
}

function init() {
  //checkIfUpdated();

  canvas = document.getElementById('canvas');
  loggedInImage = document.getElementById('logged_in');
  canvasContext = canvas.getContext('2d');

  chrome.browserAction.setBadgeBackgroundColor({color:[20, 120, 255, 255]});
  chrome.browserAction.setIcon({path: "gmail_logged_in.png"});
  loadingAnimation.start();

  loadAccountInfo();
}

function getInboxCount(account, onSuccess, onError) {
  Cache.loadEmails(account, 
    function(account, accountData) {
      onSuccess(account, accountData.unreadCount);
    },
    onError);
}

function scheduleRequest(account) {
  if (account.requestTimerId) {
    window.clearTimeout(account.requestTimerId);
  }
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, account.requestFailureCount);
  var multiplier = Math.max(randomness * exponent, 1);
  var delay = Math.min(multiplier * pollIntervalMin, pollIntervalMax);
  delay = Math.round(delay);
  
  account.requestTimerId = window.setTimeout(startRequest, delay, account);
}

// ajax stuff
function startRequest(account) {
  getInboxCount(
    account,
    function(account, count) {
      loadingAnimation.stop();
      account.isLoggedOut = false;
      updateUnreadCount(account, count);
      scheduleRequest(account);
    },
    function(account) {
      loadingAnimation.stop();
      account.isLoggedOut = true;
      showLoggedOut(account);
      scheduleRequest(account);
    }
  );
}

function updateUnreadCount(account, count) {
  if (account.unreadCount != count) {
    account.unreadCount = count;
    animateFlip();
  }
}

chrome.extension.onRequest.addListener(function(request) {
  var account = accountInfo[request.domain][request.number];
  updateUnreadCount(account, request.count);
});


function ease(x) {
  return (1-Math.sin(Math.PI/2 + x * Math.PI))/2;
}

function countUnread() {
  var totalUnread = 0;
  accountInfo.each(function(accounts) {
    accounts.each(function(account) {
      var unread = parseInt(account.unreadCount, 10);
      if(unread && unread >= 0)
        totalUnread += unread;
    });
  });
  return totalUnread;  
}

function animateFlip() {
  rotation += 1/animationFrames;
  drawIconAtRotation();

  if (rotation <= 1) {
    setTimeout(animateFlip, animationSpeed);
  } else {
    rotation = 0;
    drawIconAtRotation();
    var totalUnread = countUnread();
    chrome.browserAction.setBadgeText({ text: totalUnread ? (totalUnread + "") : "" });
    chrome.browserAction.setBadgeBackgroundColor({color:[20, 120, 255, 255]});
  }
}

function showLoggedOut(account) {
  account.unreadCount = -1;

  var allLoggedOut = true;
  accountInfo.each(function(accounts) {
    accounts.each(function(account) {
      if(!account.isLoggedOut) {
        allLoggedOut = false;
        return false;
      }
    });
    if (!allLoggedOut)
      return false;
  });

  if(allLoggedOut) {
    chrome.browserAction.setIcon({path:"gmail_not_logged_in.png"});
    chrome.browserAction.setBadgeBackgroundColor({color:[190, 190, 190, 230]});
    chrome.browserAction.setBadgeText({text:"?"});
  }
}

function drawIconAtRotation() {
  canvasContext.save();
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.translate(
  Math.ceil(canvas.width/2),
  Math.ceil(canvas.height/2));
  canvasContext.rotate(2*Math.PI*ease(rotation));
  canvasContext.drawImage(loggedInImage,
  -Math.ceil(canvas.width/2),
  -Math.ceil(canvas.height/2));
  canvasContext.restore();

  chrome.browserAction.setIcon({imageData:canvasContext.getImageData(0, 0,
    canvas.width,canvas.height)});
}

document.addEventListener("DOMContentLoaded", init, false);
