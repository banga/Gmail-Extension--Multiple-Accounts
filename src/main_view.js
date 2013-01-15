function MainView(main) {
  'use strict';
  this.main = main;
  this.main.view = this;

  this.root = $.make('#main');

  this.main.accounts.each(this.addAccount.bind(this));

  this.main.subscribe('accountAdded', this.addAccount, this);
  this.main.subscribe('accountRemoved', this.removeAccount, this);

  MainView.makeMultibar();
}

MainView.prototype.onDetach = function () {
  'use strict';
  this.main.unsubscribe({subscriber: this});
};

MainView.prototype.addAccount = function (account) {
  'use strict';
  this.root.append(new AccountView(account).root);
  account.subscribe('conversationDeleted', MainView.updateMultibarVisibility,
      MainView);
};

MainView.prototype.removeAccount = function (account) {
  'use strict';
  this.root.removeChild(account.view.root);
  MainView.updateMultibarVisibility();
};

MainView.makeMultibarButton = function (text, action, iconX, iconY) {
  'use strict';
  var button = $.make('.multibar-button');
  if (iconX !== undefined) {
    button.append($.make('span.tool-icon', null, {
      'background-position': iconX + 'px ' + iconY + 'px'
    }));
  }
  return button.append(text).on('click', function () {
    document.querySelectorAll('.conversation-selected').each(
      function (conversationElem) {
        console.dir(conversationElem.conversation);
        action.call(conversationElem.conversation.view);
      });
  });
};

MainView.makeMultibar = function () {
  'use strict';
  MainView.multibarElem = $('multibar')
    .append(MainView.makeMultibarButton('Mark as read',
          ConversationView.prototype.markAsRead))
    .append(MainView.makeMultibarButton('Archive',
          ConversationView.prototype.archive, -84, -21))
    .append(MainView.makeMultibarButton('Spam',
          ConversationView.prototype.markAsSpam, -42, -42))
    .append(MainView.makeMultibarButton('Delete',
          ConversationView.prototype.trash, -63, -42)) 
    .on('webkitTransitionEnd', function (e) {
      if (e.target == MainView.multibarElem && e.propertyName == 'opacity') {
        if (parseFloat(MainView.multibarElem.style.opacity) === 0) {
          MainView.multibarElem.style.display = 'none';
        }
      }
    });

  $('multibar-close').on('click', function () {
    document.querySelectorAll('.conversation-selected > .selector').each(
      function (selector) {
        selector.click();
      });
  });
};

MainView.updateMultibarVisibility = function () {
  'use strict';
  if (!document) return;

  if (document.querySelectorAll('.conversation-selected').length) {
    MainView.showMultibar();
  } else {
    MainView.hideMultibar();
  }
};

MainView.showMultibar = function () {
  'use strict';
  //MainView.multibarElem.style.display = 'block';
  //MainView.multibarElem.style.opacity = 1;
  MainView.multibarElem.style.top = '-5px';
};

MainView.hideMultibar = function () {
  'use strict';
  //MainView.multibarElem.style.opacity = 0;
  MainView.multibarElem.style.top = '-45px';
};
