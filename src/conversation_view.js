function ConversationView(conversation) {
  'use strict';
  this.conversation = conversation;
  this.conversation.attachView(this);

  this.root = $.make('.conversation');
  this.root.conversation = conversation;

  this.throbber = new Throbber(20, '#CCC');
  this.throbber.root.classList.add('contents');

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

ConversationView.prototype.onActionSuccess = function () {
  'use strict';
  console.log('Success. Removing...', this);
  this.conversation.account.removeConversation(this.conversation.id);
};

ConversationView.prototype.onActionFailure = function () {
  'use strict';
  console.error('Gmail action failed');
  this.throbber.update('There was an error. Updating...');
  this.conversaton.update();
};

ConversationView.prototype.markAsRead = function () {
  //analytics.mailMarkAsRead();
  'use strict';
  this.markBusy('Marking as read...');
  this.conversation.markAsRead(this.onActionSuccess.bind(this),
      this.onActionFailure.bind(this));
};

ConversationView.prototype.archive = function () {
  //analytics.mailArchive();
  'use strict';
  this.markBusy('Archiving...');
  this.conversation.archive(function () {
    this.conversation.markAsRead(this.onActionSuccess.bind(this),
      this.onActionFailure.bind(this));
  }, this.onActionFailure.bind(this));
};

ConversationView.prototype.markAsSpam = function () {
  //analytics.mailMarkAsSpam();
  'use strict';
  this.markBusy('Marking as Spam...');
  this.conversation.markAsSpam(this.onActionSuccess.bind(this),
      this.onActionFailure.bind(this));
};

ConversationView.prototype.trash = function () {
  //analytics.trash();
  'use strict';
  this.markBusy('Deleting...');
  this.conversation.trash(this.onActionSuccess.bind(this),
      this.onActionFailure.bind(this));
};

ConversationView.prototype.makeToolbar = function () {
  'use strict';
  var this_ = this;

  return $.make('.conversation-tools')
    .append(ConversationView.makeToolbarButton('Open in Gmail...',
          function () { 
            //analytics.mailOpen();
            this_.conversation.openInGmail();
          }, -63, -63))
    .append(ConversationView.makeToolbarButton('Mark as read',
          this.markAsRead.bind(this)))
    .append(ConversationView.makeToolbarButton('Archive',
          this.archive.bind(this), -84, -21))
    .append(ConversationView.makeToolbarButton('Spam',
          this.markAsSpam.bind(this), -42, -42))
    .append(ConversationView.makeToolbarButton('Delete',
          this.trash.bind(this), -63, -42));
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
  var this_ = this;

  this.root.html('');

  this.selector = $.make('input.selector', {'type': 'checkbox'})
    .on('click', function () {
      this.parentElement.classList.toggle('conversation-selected');
      MainView.updateMultibarVisibility();
    });

  this.contents = $.make('.contents-collapsed')
    .append($.make('.subject').text(this.conversation.subject))
    .append($.make('.author').text(this.conversation.author))
    .append($.make('.summary').text(this.conversation.summary))
    .append(this.makeLabels())
    .append(this.makeEmailList())
    .append(this.makeReplyControls())
    .append(this.makeToolbar());

  this.contents.on('click', function (e) {
    if (e.shiftKey || e.ctrlKey) {
      this_.selector.click();
    } else {
      this_.contents.classList.toggle('contents');
      this_.contents.classList.toggle('contents-collapsed');
    }
  });

  this.root.append(this.selector)
    .append(this.contents)
    .append(this.throbber.root);
};

ConversationView.prototype.markBusy = function (msg) {
  'use strict';
  this.root.classList.add('conversation-busy');
  this.contents.style.display = 'none';
  this.throbber.start(msg);
};

ConversationView.prototype.markNotBusy = function () {
  'use strict';
  this.root.classList.remove('conversation-busy');
  this.throbber.stop();
  this.contents.style.removeProperty('display');
};
