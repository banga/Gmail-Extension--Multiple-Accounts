function MainView(main) {
  'use strict';
  this.main = main;
  this.main.view = this;

  this.root = $.make('#main');

  this.main.accounts.each(this.addAccount.bind(this));

  this.main.subscribe('accountAdded', this.addAccount, this);
  this.main.subscribe('accountRemoved', this.removeAccount, this);
}

MainView.prototype.onDetach = function () {
  'use strict';
  this.main.unsubscribe({subscriber: this});
};

MainView.prototype.addAccount = function (account) {
  'use strict';
  this.root.append(new AccountView(account).root);
};

MainView.prototype.removeAccount = function (account) {
  'use strict';
  this.root.removeChild(account.view.root);
};
