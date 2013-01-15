(function () {
  'use strict';
  var backgroundPage = chrome.extension.getBackgroundPage();
  var main = backgroundPage.main;

  //function importModules() {
    //[ 'Account', 'Conversation', 'Email', 'Main' ].each(
      //function (moduleName) {
        //window[moduleName] = backgroundPage[moduleName];
      //});
  //}

  function init() {
    //importModules();
    chrome.extension.connect();

    setTimeout(function () {
      main.detachView();
      var view = new MainView(main);
      $('inboxes').append(view.root);
    }, 0);

    setTimeout(main.update.bind(main), 2000);
  }

  document.addEventListener('DOMContentLoaded', init);
}) ();
