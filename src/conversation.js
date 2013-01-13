function Conversation(account, entryNode) {
  'use strict';
  this.account = account;
  this.fromFeed(entryNode);
  this.labels = {};
  this.isDirty = true;
}

$.addEventHandling(Conversation, [
    'updated',
    'updateFailed'
  ]);

Conversation.prototype.addLabel = function (label) {
  'use strict';
  this.labels[label] = '';
};

Conversation.prototype.removeLabel = function (label) {
  'use strict';
  delete this.labels[label];
};

Conversation.prototype.clearLabels = function () {
  'use strict';
  this.labels = {};
};

Conversation.prototype.hasLabels = function () {
  'use strict';
  var hasLabels = false;
  this.labels.each(function () {
    hasLabels = true;
    return false;
  });
  return hasLabels;
};

Conversation.prototype.fromFeed = function (entryNode) {
  'use strict';
  var node = entryNode.querySelector('modified');
  this.modified = (node ? node.textContent : '');

  node = entryNode.querySelector('title');
  this.subject = (node ? node.textContent : '');

  node = entryNode.querySelector('summary');
  this.summary = (node ? node.textContent : '');

  node = entryNode.querySelector('author name');
  this.author = (node ? node.textContent : '');

  node = entryNode.querySelector('link');
  this.link = (node ? node.getAttribute('href') : '');

  var msgID = this.link.match(/message_id=([\w]*)/);
  this.id = msgID[1];
  console.assert(this.id);

  this.emails = [];
};

Conversation.prototype.update = function () {
  'use strict';
  console.assert(this.id);
  var that = this;
  var onSuccess = function () {
    that.isDirty = false;
    that.publish('updated', that);
  };
  var onError = this.publish.bind(this, 'updateFailed', this);

  return $.post({
    url: that.account.htmlModeURL() + '?&v=pt&th=' + that.id,
    onSuccess: function (xhr) {
      var div = $.make('div').html(xhr.responseText);
      var messageTables = div.querySelectorAll('.message');

      if (messageTables) {
        that.emails = [];
        for (var i = 0; i < messageTables.length; ++i) {
          that.emails.push(new Email(messageTables[i], that.account));
        }
        onSuccess();
      } else {
        onError();
      }
    },
    onError: onError
  });
};

Conversation.prototype.markDirty = function () {
  'use strict';
  this.isDirty = true;
};

Conversation.prototype.updateIfDirty = function () {
  'use strict';
  if (this.isDirty)
    this.update();
};

Conversation.prototype.detachView = function () {
  'use strict';
  if (this.view) {
    this.emails.each(function (email) {
      email.detachView();
    });
    this.view.onDetach();
    this.view = null;
  }
};

Conversation.prototype.attachView = function (view) {
  'use strict';
  this.detachView();
  this.view = view;
};
