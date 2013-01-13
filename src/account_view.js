function AccountView(account) {
  'use strict';
  this.account = account;
  this.account.attachView(this);
  this.root = $.make('.account');

  this.header = $.make('.account-header')
    .append($.make('.account-icon'))
    .append($.make('.account-link').text('Loading...'));

  this.conversationList = $.make('.conversation-list');
  this.root.append(this.header).append(this.conversationList);

  this.init();
  this.account.conversations.each(this.addConversation.bind(this));

  this.account.subscribe('feedParsed', this.init, this);
  this.account.subscribe('conversationAdded', this.addConversation, this);
  this.account.subscribe('conversationDeleted',
      this.deleteConversation, this);
}

AccountView.prototype.onDetach = function () {
  'use strict';
  this.account.unsubscribe({subscriber: this});
};

AccountView.prototype.init = function () {
  'use strict';
  if (this.account.name)
    this.header.lastElementChild.text('Inbox for ' + this.account.name);
};

AccountView.prototype.addConversation = function (conversation) {
  'use strict';
  var modified = new Date(conversation.modified),
      child = this.conversationList.firstElementChild;

  while (child) {
    if (modified > new Date(child.conversation.modified)) {
      break;
    }
    child = child.nextElementSibling;
  }

  this.conversationList.insertBefore(
      new ConversationView(conversation).root, child);
};

AccountView.prototype.deleteConversation = function (conversation) {
  'use strict';
  this.conversationList.removeChild(conversation.view.root);
};
