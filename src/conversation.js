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

Conversation.guessUnread = function (summary, emails) {
  'use strict';
  var length, maxLength = 0, maxIdx = 0;
  emails.each(function (email, idx) {
    for (length = 0; length < summary.length; ++length) {
      if (summary[length] != email.summary[length])
        break;
    }
    if (length > maxLength) {
      maxLength = length;
      maxIdx = idx;
    }
  });
  return maxIdx;
};

Conversation.prototype.update = function () {
  'use strict';
  console.assert(this.id);
  var this_ = this;
  var onSuccess = function () {
    this_.isDirty = false;
    this_.publish('updated', this_);
  };
  var onError = this.publish.bind(this, 'updateFailed', this);

  return $.post({
    url: this_.account.htmlModeURL() + '?&v=pt&th=' + this_.id,
    onSuccess: function (xhr) {
      var div = $.make('div').html(xhr.responseText);
      var messageTables = div.querySelectorAll('.message');

      if (messageTables) {
        this_.emails = [];
        for (var i = 0; i < messageTables.length; ++i) {
          this_.emails[i] = new Email(messageTables[i], this_.account);
        }

        var unreadIdx = Conversation.guessUnread(this_.summary, this_.emails);
        for (i = 0; i < this_.emails.length; ++i) {
          this_.emails[i].collapsed = (i < unreadIdx);
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

Conversation.prototype.openInGmail = function () {
  'use strict';
  var url = this.account.url;
  var label = Object.keys(this.labels)[0];
  if (label.length === 0) {
    url += '#inbox/';
  } else {
    url += '#label/' + window.escape(label.replace(' ', '+')) + '/';
  }
  url += this.id;
  chrome.tabs.create({ url: url});
};

Conversation.prototype.doGmailAction = function (action, onSuccess, onError) {
  'use strict';
  var url = this.account.htmlModeURL();
  var payload = new FormData();
  payload.append('t', this.id);
  payload.append('at', this.account.at);
  payload.append('act', action);

  return $.post({
    url: url,
    onSuccess: onSuccess,
    onError: onError,
    payload: payload
  });
};

Conversation.prototype.archive = function (onSuccess, onError) {
  'use strict';
  this.doGmailAction('arch', onSuccess, onError);
};

Conversation.prototype.markAsRead = function (onSuccess, onError) {
  'use strict';
  this.doGmailAction('rd', onSuccess, onError);
};

Conversation.prototype.markAsSpam = function (onSuccess, onError) {
  'use strict';
  this.doGmailAction('sp', onSuccess, onError);
};

Conversation.prototype.trash = function (onSuccess, onError) {
  'use strict';
  this.doGmailAction('tr', onSuccess, onError);
};

Conversation.prototype.reply = function (body, replyAll, onSuccess, onError) {
  'use strict';
  var url = this.account.htmlModeURL() + '?v=b&qrt=n&fv=cv&cs=qfnq&at=' +
    this.account.at + '&rm=' + this.id;
  var payload = new FormData();
  payload.append('body', body);
  payload.append('nvp_bu_send', 'Send');
  payload.append('haot', 'qt');
  payload.append('qrr', replyAll ? 'a' : 'o');

  return $.post({
    url: url,
    payload: payload,
    onSuccess: onSuccess,
    onError: onError
  });
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
