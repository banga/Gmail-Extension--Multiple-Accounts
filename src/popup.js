var backgroundPage = chrome.extension.getBackgroundPage();
var main = backgroundPage.main;
var view;

function importModules() {
  'use strict';
  [ 'Account', 'Conversation', 'Email', 'Main' ].each(
      function (moduleName) {
        window[moduleName] = backgroundPage[moduleName];
      });
}

function init() {
  'use strict';
  importModules();

  var port = chrome.extension.connect();
  port.postMessage('Popup loaded');
  
  view = new MainView(main);
  $('inboxes').append(view.root);
}

document.addEventListener('DOMContentLoaded', init);
