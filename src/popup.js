var backgroundPage = chrome.extension.getBackgroundPage();
var main = backgroundPage.main;
var view;

function init() {
  'use strict';
  var port = chrome.extension.connect();
  port.postMessage('Popup loaded');
  
  view = new MainView(main);
  $('inboxes').append(view.root);
}

document.addEventListener('DOMContentLoaded', init);
