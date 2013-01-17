(function () {
  'use strict';

  var backgroundPage = chrome.extension.getBackgroundPage();
  var notifier = backgroundPage.notifier;
  var throbber = new Throbber(16, '#CCC');

  function markBusy() {
    document.getElementById('throbber').appendChild(throbber.root);
    throbber.start('Working...');
  }

  function init() {
    var notificationID = window.location.hash.substr(1);
    var notification = notifier.fetchNotification(notificationID);
    var conversation = notification.conversation;

    ['subject', 'author', 'summary'].some(function (id) {
      document.getElementById(id).innerHTML = conversation[id];
    });

    var onSuccess = function () {
      notification.notification.cancel();
    };

    var onError = function () {
      throbber.update('Error! Opening Gmail..');
      setTimeout(function () {
        notification.conversation.openInGmail();
        notification.notification.cancel();
      }, 2000);
    };

    document.getElementById('openInGmail').onclick = function () {
      notification.notification.cancel();
      notification.conversation.openInGmail();
    };

    ['markAsRead', 'archive', 'markAsSpam', 'trash'].some(
      function (action) {
        document.getElementById(action).onclick = function () {
          markBusy();
          conversation[action].call(conversation, onSuccess, onError);
        };
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
