(function () {
  'use strict';
  function init() {
    var toggle = function () {
      var ul = this.parentElement.nextElementSibling,
          expand = (ul.style.height === '');
      document.querySelectorAll('.labels-list').each(
        function (ul) {
          ul.style.removeProperty('height');
        });
      if (expand) {
        ul.style.height = ul.firstElementChild.clientHeight + 'px';
      }
    };

    document.querySelectorAll('.account-row').each(
      function (container, idx, q) {
        if (idx < q.length - 1)
          container.on('click', toggle);
      });

    var details = chrome.app.getDetails(),
        version = (details ? details.version : '');
    $('page-title').text('Google Mail Multi-Account Checker ' + version);

    $('ask').on('click', function () {
      var url = 'https://mail.google.com/mail/?view=cm&ui=2&tf=0&fs=1' +
      '&to=' + encodeURIComponent('banga.shrey+gmext@gmail.com') +
      '&su=' + encodeURIComponent('Extension Feedback') +
      '&body=' + encodeURIComponent('\n\nVersion: ' + version + 
        '\nPlatform: ' + navigator.platform +
        '\nChrome v' + navigator.appVersion.match(/Chrome\/([^ ]*)/)[1]);
      chrome.tabs.create({ url: url});
    });
  }

  document.addEventListener('DOMContentLoaded', init);
}) ();
