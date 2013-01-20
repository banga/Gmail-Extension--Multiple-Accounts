(function (global) {
  'use strict';

  function ConversationView(conversation) {
    this.conversation = conversation;
    this.conversation.attachView(this);
    if (this.conversation.collapsed === undefined) {
      this.conversation.collapsed = true;
    }

    this.root = $.make('.conversation');
    this.root.conversation = conversation;

    this.throbber = new Throbber(20, 'rgba(0,0,0,0.2)', $);
    this.throbber.root.classList.add('contents');

    this.update();
    this.conversation.subscribe('updated', this.update, this);
  }

  ConversationView.prototype.makeReplyControls = function () {
    var this_ = this;
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
        //analytics.replyStart();
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

    var replyAllCheckbox = $.make('input.reply-all', {'type': 'checkbox'});

    var replyControls = $.make('.reply-controls.dim')
      .append($.make('label').append(replyAllCheckbox).append('Reply All'));

    var replyButton = $.make('input', {
      'type': 'button',
      'disabled': 'disabled',
      'value': 'Send'
    });

    replyButton.on('click', function () {
      var checked = replyAllCheckbox.checked;
      //analytics.replySend(checked ? 'ReplyAll' : 'Reply', replyBody.value.length);
      this_.markBusy('Sending...');
      this_.conversation.reply(replyBody.value, checked,
        function () {
          this_.markBusy('Sent! Updating...');
          this_.conversation.update();
        },
        this_.onActionFailure.bind(this));
    });

    replyControls.append(replyButton);
    div.append(replyControls)
      .on('click', function (e) {
        e.cancelBubble = true;
      });

    return div;
  };


  ConversationView.prototype.makeToolbarButton = function (
      text, busyMessage, onclick, iconX, iconY) {
    var button = $.make('.conversation-tools-button');
    if (iconX !== undefined) {
      button.append($.make('span.tool-icon', null, {
        'background-position': iconX + 'px ' + iconY + 'px'
      }));
    }
    button.append(text)
      .on('click', function (e) {
        e.cancelBubble = true;
        this.markBusy(busyMessage);
        onclick.call(this);
      }.bind(this));
    return button;
  };

  ConversationView.prototype.onActionSuccess = function () {
    this.conversation.account.removeConversation(this.conversation.id);
  };

  ConversationView.prototype.onActionFailure = function () {
    this.throbber.update('There was an error. Updating...');
    this.conversaton.update();
  };

  ConversationView.prototype.markAsRead = function () {
    //analytics.mailMarkAsRead();
    this.conversation.markAsRead(this.onActionSuccess.bind(this),
        this.onActionFailure.bind(this));
  };

  ConversationView.prototype.archive = function () {
    //analytics.mailArchive();
    this.conversation.archive(this.markAsRead.bind(this),
        this.onActionFailure.bind(this));
  };

  ConversationView.prototype.markAsSpam = function () {
    //analytics.mailMarkAsSpam();
    this.conversation.markAsSpam(this.onActionSuccess.bind(this),
        this.onActionFailure.bind(this));
  };

  ConversationView.prototype.trash = function () {
    //analytics.trash();
    this.conversation.trash(this.onActionSuccess.bind(this),
        this.onActionFailure.bind(this));
  };

  ConversationView.prototype.makeToolbar = function () {
    var this_ = this;

    return $.make('.conversation-tools')
      .append(this.makeToolbarButton('Open in Gmail...', 'Opening...',
            function () { 
              //analytics.mailOpen();
              this_.conversation.openInGmail();
            }, -63, -63))
      .append(this.makeToolbarButton('Mark as read', 'Marking as read...',
            this.markAsRead))
      .append(this.makeToolbarButton('Archive', 'Archiving...',
            this.archive, -84, -21))
      .append(this.makeToolbarButton('Spam', 'Marking as Spam...',
            this.markAsSpam, -42, -42))
      .append(this.makeToolbarButton('Delete', 'Deleting...',
            this.trash, -63, -42));
  };

  ConversationView.prototype.makeLabels = function () {
    var labelsElem = $.make('.labels');
    this.conversation.labels.each(function (_, label) {
      if (label) {
        labelsElem.append($.make('span.label').text(label)
          .attr('title', 'Go to Options to configure labels'));
      }
    });
    return labelsElem;
  };

  ConversationView.prototype.makeEmailList = function () {
    var emailListElem = $.make('.conversation-body');
    var count = this.conversation.emails.length;
    this.conversation.emails.each(function (email, idx) {
      var emailElem = new EmailView(email, idx, count, $).root;
      emailElem.attr('id', 'email-' + idx);
      emailListElem.append(emailElem);
    });
    return emailListElem;
  };

  ConversationView.prototype.update = function () {
    var this_ = this;

    this.root.html('');

    this.selector = $.make('input.selector', {'type': 'checkbox'})
      .on('click', function () {
        this.parentElement.classList.toggle('conversation-selected');
        MainView.instance.updateMultibarVisibility();
      });

    this.contents = $.make(
        this.conversation.collapsed ? '.contents-collapsed' : '.contents')
      .append($.make('.subject').text(this.conversation.subject))
      .append(this.makeLabels())
      .append($.make('.author').text(this.conversation.author))
      .append($.make('.summary').text(this.conversation.summary))
      .append(this.makeEmailList())
      .append(this.makeReplyControls())
      .append(this.makeToolbar());

    this.contents.on('click', function (e) {
      if (e.shiftKey || e.ctrlKey) {
        this_.selector.click();
      } else {
        this_.contents.classList.toggle('contents');
        this_.contents.classList.toggle('contents-collapsed');
        this_.conversation.collapsed = !this_.conversation.collapsed;
      }
      e.cancelBubble = true;
      e.stopPropagation();
    });

    this.root.append(this.selector)
      .append(this.contents)
      .append(this.throbber.root);

    this.root.on('mousemove', function (e) {
      if (e.which == 1 &&
        this_.contents.classList.contains('contents-collapsed')) {
        this_.select();
      }
    });

    this.markNotBusy();
  };

  ConversationView.prototype.select = function () {
    this.selector.checked = true;
    this.root.classList.add('conversation-selected');
    MainView.instance.updateMultibarVisibility();
  };

  ConversationView.prototype.markBusy = function (msg) {
    this.root.classList.add('conversation-busy');
    this.contents.style.display = 'none';
    this.throbber.start(msg);
    this.throbber.root.scrollIntoViewIfNeeded(); 
  };

  ConversationView.prototype.markNotBusy = function () {
    this.root.classList.remove('conversation-busy');
    this.throbber.stop();
    this.contents.style.removeProperty('display');
  };

  ConversationView.prototype.onDetach = function () {
    this.conversation.unsubscribe({subscriber: this});
    delete this.root.conversation;
    this.root = null;
  };

  global.ConversationView = ConversationView;
}) (window);
