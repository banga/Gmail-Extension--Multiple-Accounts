function Conversation(account, entryNode, index) {
  'use strict';
  this.account = account;
  this.fromFeed(entryNode);
  this.index = index;
  this.view = new ConversationView(this);
}

$.addEventHandling(Conversation, [
    'updated',
    'updateFailed'
  ]);

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
  if (msgID && msgID.length >= 2)
    this.id = msgID[1];

  this.emails = [];
};

Conversation.prototype.update = function () {
  'use strict';
  console.assert(this.id);
  var that = this;
  var onSuccess = this.publish.bind(this, 'updated', this);
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

function ConversationView(conversation) {
  'use strict';
  this.conversation = conversation;
  this.root = $.make('.conversation');

  this.conversation.subscribe('updated', this.update.bind(this));
}

ConversationView.prototype.makeReplyControls = function () {
  'use strict';
  var div = $.make('.conversation-reply');
  var replyBody = $.make('textarea.conversation-reply-body', {
      'rows': '1',
      'cols': '80',
      'placeholder': 'Reply here',
      'wrap': 'virtual'
    });
  div.append(replyBody);

  replyBody.oninput = function () {
    if (!this._replyStarted) {
      this._replyStarted = true;
      analytics.replyStart();
    }

    if (this.scrollHeight > this.clientHeight) {
      this.style.height = this.scrollHeight + 'px';
    }

    if (this.value.trim().length) {
      replyButton.removeAttribute('disabled');
      replyControls.classList.remove('dim');
      this.style.paddingBottom = '2em';
    } else {
      replyButton.setAttribute('disabled', true);
      replyControls.classList.add('dim');
      this.style.height = 'auto';
      this.style.paddingBottom = '8px';
    }
  };

  var replyControls = $.make('.reply-controls.dim')
    .append($.make('label')
        .append($.make('input.reply-all', {'type': 'checkbox'}))
        .append('Reply All'));

  var replyButton = $.make('input', {
    'type': 'button',
    'disabled': 'disabled',
    'value': 'Send'
  });

  replyButton.on('click', function () {
    var checked = $('reply-all').checked;
    analytics.replySend(checked ? 'ReplyAll' : 'Reply',
      replyBody.value.length);
    //doMailReply(mailPreview, replyBody.value, checked);
  });

  replyControls.append(replyButton);
  div.append(replyControls)
    .on('click', function (e) {
        e.cancelBubble = true;
      });

  return div;
};


ConversationView.makeToolbarButton = function (text, onclick, iconX, iconY) {
  'use strict';
  var b = $.make('.conversation-tools-button');
  if (iconX !== undefined) {
    b.append($.make('span.tool-icon', null, {
      'background-position': iconX + 'px ' + iconY + 'px'
    }));
  }
  b.append(text);
  b.on('click', function (e) {
    e.cancelBubble = true;
    onclick();
  });
  return b;
};

ConversationView.prototype.makeToolbar = function () {
  'use strict';
  return $.make('.conversation-tools')
    .append(ConversationView.makeToolbarButton('Open in Gmail...', function () { 
            //analytics.mailOpen();
            //openMailInTab(mailPreview.account, mailPreview.mailLink);
        }, -63, -63))
    .append(ConversationView.makeToolbarButton('Mark as read', function () {
            //analytics.mailMarkAsRead();
            //doMailAction(mailPreview, gmail.markAsRead);
          }))
    .append(ConversationView.makeToolbarButton('Archive', function () {
            //analytics.mailArchive();
            //doMailAction(mailPreview, gmail.markAsRead);
            //doMailAction(mailPreview, gmail.archive);
          }, -84, -21))
    .append(ConversationView.makeToolbarButton('Spam', function () {
            //analytics.mailMarkAsSpam();
            //doMailAction(mailPreview, gmail.markAsSpam);
          }, -42, -42))
    .append(ConversationView.makeToolbarButton('Delete', function () {
            //analytics.mailDelete();
            //doMailAction(mailPreview, gmail.trash);
          }, -63, -42));
};

ConversationView.prototype.update = function () {
  'use strict';
  this.root.html('');

  var emailListElem = $.make('.conversation-body');
  var count = this.conversation.emails.length;
  this.conversation.emails.each(function (email, idx) {
    var emailElem = email.view.root;
    emailElem.className = (idx == count - 1 ? 'email' : 'email-hidden'); 
    emailElem.attr('id', 'email-' + idx);
    emailListElem.append(emailElem);
  });

  var contents = $.make('.contents-collapsed')
    .append($.make('.subject').text(this.conversation.subject))
    .append($.make('.author').text(this.conversation.author))
    .append($.make('.summary').text(this.conversation.summary))
    .append(emailListElem)
    .append(this.makeReplyControls())
    .append(this.makeToolbar());

  contents.on('click', function () {
    if (contents.className == 'contents-collapsed') {
      contents.className = 'contents';
    } else {
      contents.className = 'contents-collapsed';
    }
  });

  this.root
    .append($.make('input.selector', {'type': 'checkbox'}))
  //  .on('click', onMailSelecterClick);
    .append(contents);
};
