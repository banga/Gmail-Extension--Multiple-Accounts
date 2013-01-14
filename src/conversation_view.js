function ConversationView(conversation) {
  'use strict';
  this.conversation = conversation;
  this.conversation.attachView(this);

  this.root = $.make('.conversation');
  this.root.conversation = conversation;

  this.throbber = new Throbber(20, '#EEE');

  this.update();
  this.conversation.subscribe('updated', this.update, this);
}

ConversationView.prototype.onDetach = function () {
  'use strict';
  this.conversation.unsubscribe({subscriber: this});
};

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
  var button = $.make('.conversation-tools-button');
  if (iconX !== undefined) {
    button.append($.make('span.tool-icon', null, {
      'background-position': iconX + 'px ' + iconY + 'px'
    }));
  }
  button.append(text);
  button.on('click', function (e) {
    e.cancelBubble = true;
    onclick();
  });
  return button;
};

ConversationView.prototype.makeToolbar = function () {
  'use strict';
  var this_ = this;

  var onSuccess = function () {
    console.log('Success. Removing...', this_);
    this_.throbber.stop();
    this_.conversation.account.removeConversation(this_.conversation.id);
  };

  var onError = function () {
    console.error('Gmail action failed');
    this_.throbber.update('There was an error. Updating...');
    this_.conversaton.update();
  };

  return $.make('.conversation-tools')
    .append(ConversationView.makeToolbarButton('Open in Gmail...',
          function () { 
            //analytics.mailOpen();
            this_.conversation.openInGmail();
          }, -63, -63))
    .append(ConversationView.makeToolbarButton('Mark as read',
          function () {
            //analytics.mailMarkAsRead();
            this_.throbber.start('Marking as read...');
            this_.conversation.markAsRead(onSuccess, onError);
          }))
    .append(ConversationView.makeToolbarButton('Archive', function () {
            //analytics.mailArchive();
            this_.throbber.start('Archiving...');
            this_.conversation.archive(function () {
                this_.conversation.markAsRead(onSuccess, onError);
              }, onError);
          }, -84, -21))
    .append(ConversationView.makeToolbarButton('Spam', function () {
            //analytics.mailMarkAsSpam();
            this_.throbber.start('Marking as spam...');
            this_.conversation.markAsSpam(onSuccess, onError);
          }, -42, -42))
    .append(ConversationView.makeToolbarButton('Delete', function () {
            //analytics.mailDelete();
            this_.throbber.start('Deleting...');
            this_.conversation.trash(onSuccess, onError);
          }, -63, -42))
    .append(this.throbber.root);
};

ConversationView.prototype.makeLabels = function () {
  'use strict';
  var labelsElem = $.make('.labels');
  this.conversation.labels.each(function (_, label) {
    if (label) {
      labelsElem.append($.make('span.label').text(label));
      console.log('LABEL = ' + label);
    }
  });
  return labelsElem;
};

ConversationView.prototype.makeEmailList = function () {
  'use strict';
  var emailListElem = $.make('.conversation-body');
  var count = this.conversation.emails.length;
  this.conversation.emails.each(function (email, idx) {
    var emailElem = new EmailView(email).root;
    emailElem.className = (idx == count - 1 ? 'email' : 'email-hidden'); 
    emailElem.attr('id', 'email-' + idx);
    emailListElem.append(emailElem);
  });
  return emailListElem;
};

ConversationView.prototype.update = function () {
  'use strict';
  this.root.html('');

  var contents = $.make('.contents-collapsed')
    .append($.make('.subject').text(this.conversation.subject))
    .append($.make('.author').text(this.conversation.author))
    .append($.make('.summary').text(this.conversation.summary))
    .append(this.makeLabels())
    .append(this.makeEmailList())
    .append(this.makeReplyControls())
    .append(this.makeToolbar());

  contents.on('click', function () {
    contents.classList.toggle('contents');
    contents.classList.toggle('contents-collapsed');
  });

  this.root
    .append(
        $.make('input.selector', {'type': 'checkbox'})
        .on('click', function () {
          contents.classList.toggle('contents-selected');
        }))
    .append(contents);
};
