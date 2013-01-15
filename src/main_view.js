function MainView(main) {
  'use strict';
  MainView.instance = this;

  this.main = main;
  this.main.view = this;

  this.root = $.make('#main');

  this.main.accounts.each(this.addAccount.bind(this));

  this.main.subscribe('accountAdded', this.addAccount, this);
  this.main.subscribe('accountRemoved', this.removeAccount, this);

  this.makeMultibar();
}

MainView.prototype.onDetach = function () {
  'use strict';
  var this_ = this;
  this.main.accounts.each(function (account) {
    account.unsubscribe({subscriber: this_});
  });
  this.main.unsubscribe({subscriber: this});
  this.root = null;
  MainView.instance = null;
};

MainView.prototype.addAccount = function (account) {
  'use strict';
  this.root.append(new AccountView(account, $).root);
  account.subscribe('conversationDeleted',
      MainView.prototype.updateMultibarVisibility, this);
};

MainView.prototype.removeAccount = function (account) {
  'use strict';
  account.unsubscribe({subscriber: this});
  this.root.removeChild(account.view.root);
  this.updateMultibarVisibility();
};

MainView.prototype.makeMultibarButton = function (text, action, iconX, iconY) {
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
        action.call(conversationElem.conversation.view);
      });
  });
};

MainView.prototype.makeMultibar = function () {
  'use strict';
  this.multibarElem = $('multibar')
    .append(this.makeMultibarButton('Mark as read',
          ConversationView.prototype.markAsRead))
    .append(this.makeMultibarButton('Archive',
          ConversationView.prototype.archive, -84, -21))
    .append(this.makeMultibarButton('Spam',
          ConversationView.prototype.markAsSpam, -42, -42))
    .append(this.makeMultibarButton('Delete',
          ConversationView.prototype.trash, -63, -42));

  $('multibar-close').on('click', function () {
    document.querySelectorAll('.conversation-selected > .selector').each(
      function (selector) {
        selector.click();
      });
  });
};

MainView.prototype.updateMultibarVisibility = function () {
  'use strict';
  if (!document) return;

  if (document.querySelectorAll('.conversation-selected').length) {
    this.showMultibar();
  } else {
    this.hideMultibar();
  }
};

MainView.prototype.showMultibar = function () {
  'use strict';
  this.multibarElem.style.top = '-5px';
};

MainView.prototype.hideMultibar = function () {
  'use strict';
  this.multibarElem.style.top = '-45px';
};
