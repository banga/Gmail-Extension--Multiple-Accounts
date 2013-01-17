(function (global) {
  'use strict';

  function Notifier(main) {
    this.main = main;
    this._loadSettings();
    this.notifications = {};
    this.enable();
  }

  Notifier.prototype.enable = function () {
    this.main.accounts.each(this.onAccountAdded.bind(this));
    this.main.subscribe('accountAdded', this.onAccountAdded, this);
    this.main.subscribe('accountRemoved', this.onAccountRemoved, this);
  };

  Notifier.prototype.disable = function () {
    this.settings.enabled = false;
    this._saveSettings();

    this.main.unsubscribe({subscriber: this});
    this.main.accounts.each(this.onAccountRemoved.bind(this));
  };

  Notifier.prototype.onAccountAdded = function (account) {
    account.subscribe('conversationAdded', this.onConversationAdded, this);
    account.subscribe('conversationUpdated', this.onConversationAdded, this);
  };

  Notifier.prototype.onAccoundRemoved = function (account) {
    account.unsubscribe({subscriber: this});
  };

  Notifier.prototype.onConversationAdded = function (conversation) {
    var id = conversation.id;
    if (id in this.notifications &&
        this.notifications[id].modified === conversation.modified) {
      return;
    }

    this.notifications[id] = {
      conversation: conversation,
      modified: conversation.modified
    };

    var delta = new Date().getTime() -
      new Date(conversation.modified).getTime();

    if (delta <= this.settings.delta) {
      this.showNotification(id);
    }
  };

  Notifier.prototype.showNotification = function (notificationID) {
    var notification = webkitNotifications.createHTMLNotification(
        'notification.html#' + notificationID);
    this.notifications[notificationID].notification = notification;
    notification.show();
    return notification;
  };

  Notifier.prototype.fetchNotification = function (notificationID) {
    return this.notifications[notificationID];
  };

  Notifier.prototype.testNotification = function (idx) {
    return this.showNotification(Object.keys(this.notifications)[idx]);
  };

  Notifier.prototype.testNotificationPage = function (idx) {
    chrome.tabs.create({
      url: 'notification.html#' + Object.keys(this.notifications)[idx]
    });
  };

  Notifier.prototype._loadSettings = function () {
    var settings = {
      enabled: true,
      delta: 5 * 60 * 1e3
    };

    if (localStorage.notificationSettings) {
      settings = JSON.parse(localStorage.notificationSettings);
    }

    this.settings = settings;
    this._saveSettings();
  };

  Notifier.prototype._saveSettings = function () {
    localStorage.notificationSettings =
      JSON.stringify(this.settings);
  };

  global.Notifier = Notifier;
})(window);
