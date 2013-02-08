(function (global) {
  'use strict';

  function Conversation(account, entryNode) {
    this.account = account;
    this.fromFeed(entryNode);
    this.labels = {};
    this.isDirty = true;
    this.status = Conversation.STATUS_NONE;

    this.subscribe('updated', function () {
      this.status = Conversation.STATUS_UPDATE_SUCCEDED;
      log.info('Conversation updated: "' + this.subject + '"');
    }, this);

    this.subscribe('updateFailed', function () {
      this.status = Conversation.STATUS_UPDATE_FAILED;
      log.info('Conversation update failed: "' + this.subject + '"');
    }, this);
  }

  $.addEventHandling(Conversation, [
      'updated',
      'updateFailed'
    ]);

  Conversation.STATUS_NONE = 1;
  Conversation.STATUS_UPDATING = 2;
  Conversation.STATUS_UPDATE_FAILED = 3;
  Conversation.STATUS_UPDATE_SUCCEDED = 4;

  Conversation.prototype.addLabel = function (label) {
    this.labels[label] = '';
  };

  Conversation.prototype.removeLabel = function (label) {
    delete this.labels[label];
  };

  Conversation.prototype.clearLabels = function () {
    this.labels = {};
  };

  Conversation.prototype.hasLabels = function () {
    var hasLabels = false;
    this.labels.each(function () {
      hasLabels = true;
      return false;
    });
    return hasLabels;
  };

  Conversation.prototype.fromFeed = function (entryNode) {
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
    log.assert(this.id);

    this.emails = [];
  };

  Conversation.guessUnread = function (summary, emails) {
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
    if (this.status == Conversation.STATUS_UPDATING)
      return;

    log.info('Conversation updating:', '"' + this.subject + '"');
    this.status = Conversation.STATUS_UPDATING;

    log.assert(this.id);
    var this_ = this;
    var onSuccess = function () {
      this_.isDirty = false;
      this_.publish('updated', this_);
    };
    var onError = this.publish.bind(this, 'updateFailed', this);

    return $.post({
      url: this.account.htmlModeURL() + '?&v=pt&th=' + this.id,
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
    this.isDirty = true;
    log.info('Conversation ' + this.subject + ' marked dirty');
  };

  Conversation.prototype.updateIfDirty = function () {
    if (this.isDirty)
      this.update();
  };

  Conversation.prototype.openInGmail = function () {
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

  Conversation.prototype.reply = function (body, replyAll, onSuccess, onError) {
    var url = this.account.htmlModeURL() + '?v=b&qrt=n&fv=cv&cs=qfnq&at=' +
      this.account.at + '&rm=' + this.id + '&th=' + this.id;
    var payload = new FormData();
    payload.append('redir', '?v=c');
    payload.append('qrr', replyAll ? 'a' : 'o');
    payload.append('body', body);
    payload.append('nvp_bu_send', 'Send');
    payload.append('haot', 'qt');

    return $.post({
      url: url,
      payload: payload,
      onSuccess: onSuccess,
      onError: onError
    });
  };

  Conversation.prototype.detachView = function () {
    if (this.view) {
      this.emails.each(function (email) {
        email.detachView();
      });
      this.view.onDetach();
      this.view = null;
    }
  };

  Conversation.prototype.attachView = function (view) {
    this.detachView();
    this.view = view;
  };

  Conversation.prototype.toString = function () {
    return '"' + this.author + '": "' + this.summary + '"';
  };

  global.Conversation = Conversation;
}) (window);
