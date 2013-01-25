(function (global) {
  'use strict';

  var ANIMATION_FRAMES = 36,
      ANIMATION_SPEED = 10; // ms

  function Badge(main) {
    this.main = main;
    this.unreadCount = 0;
    this.rotation = 0,
    this.animating = false,

    this.canvas = $('canvas');
    this.loggedInImage = $('logged_in');
    this.ctx = this.canvas.getContext('2d');

    chrome.browserAction.setBadgeBackgroundColor({color: [20, 120, 255, 255]});
    chrome.browserAction.setIcon({path: 'images/gmail_logged_in.png'});

    main.accounts.each(function (account) {
      account.subscribe('conversationAdded', this.update, this);
      account.subscribe('conversationDeleted', this.update, this);
    }, this);

    main.subscribe('accountAdded', function (account) {
      account.subscribe('conversationAdded', this.update, this);
      account.subscribe('conversationDeleted', this.update, this);
    }, this);

    main.subscribe('accountRemoved', function (account) {
      account.unsubscribe(this);
      this.update();
    }, this);

    main.subscribe('accountFeedParsed', function () {
      this.update();
    }, this);
  }

  Badge.prototype.update = function () {
    var count = this.countUnread();
    if (count !== this.unreadCount) {
      this.unreadCount = count;
      if (!this.animating) {
        this.animating = true;
        this.animateFlip();
      }
    }
  };

  Badge.prototype.countUnread = function () {
    var count = 0;
    this.main.accounts.each(function (account) {
      count += account.unreadCount;
    });
    return count;
  };

  Badge.prototype.animateFlip = function () {
    this.rotation += 1 / ANIMATION_FRAMES;
    this.draw();

    if (this.rotation <= 1) {
      setTimeout(this.animateFlip.bind(this), ANIMATION_SPEED);
    } else {
      this.animating = false;
      this.rotation = 0;
      this.draw();
      chrome.browserAction.setBadgeText({
        text: (this.unreadCount ? ('' + this.unreadCount) : '')
      });
    }
  };

  function ease(x) {
    return (1 - Math.sin(Math.PI / 2 + x * Math.PI)) / 2;
  }

  Badge.prototype.draw = function () {
    this.ctx.save();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.translate(
      Math.ceil(this.canvas.width / 2),
      Math.ceil(this.canvas.height / 2));
    this.ctx.rotate(2 * Math.PI * ease(this.rotation));
    this.ctx.drawImage(this.loggedInImage,
      -Math.ceil(this.canvas.width / 2),
      -Math.ceil(this.canvas.height / 2));
    this.ctx.restore();

    chrome.browserAction.setIcon({
      imageData:
        this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    });
  };

  global.Badge = Badge;
}) (window);
