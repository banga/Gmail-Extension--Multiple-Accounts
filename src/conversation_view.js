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

    this.throbber = new Throbber(16, 'rgba(0,0,0,0.2)', $);
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
      var replyAll =
        this.parentElement.querySelector('input[type="checkbox"]').checked;
      this_.markBusy('Sending...');
      this_.conversation.reply(replyBody.value, replyAll,
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

  var cancelBubble = function (e) {
    e.cancelBubble = true;
  };

  var makeToolbarButton = function (text, callback, iconClass) {
    return $.make('.conversation-tools-button')
      .attr('title', text)
      .attr('tabindex', 0)
      .on('mousedown', cancelBubble)
      .on('mouseup', cancelBubble)
      .on('click', callback)
      .on('keyup', function (e) {
        if (e.which === 13) callback(e);
      })
      .append($.make(iconClass))
      .append(text);
  };

  ConversationView.prototype.makeGmailActionButton = function (action) {
    var actionDescription = Account.GMAIL_ACTIONS[action];
    return makeToolbarButton(actionDescription[0],
      function (e) {
        e.cancelBubble = true;
        this.markBusy(actionDescription[1]);
        this.conversation.account.doGmailAction(action, [this.conversation],
          this.onActionSuccess.bind(this), this.onActionFailure.bind(this));
      }.bind(this), actionDescription[2]);
  };

  ConversationView.prototype.onActionSuccess = function () {
    this.conversation.account.removeConversation(this.conversation.id);
  };

  ConversationView.prototype.onActionFailure = function () {
    this.throbber.update('There was an error. Updating...');
    this.conversaton.update();
  };

  ConversationView.prototype.makeToolbar = function () {
    var this_ = this;

    return $.make('.conversation-tools')
      .append(makeToolbarButton('Open in Gmail...',
          function (e) { 
            e.cancelBubble = true;
            this_.conversation.openInGmail();
          }, '.icon-external-link'))
      .append(this.makeGmailActionButton('rd'))
      .append(this.makeGmailActionButton('ar'))
      .append(this.makeGmailActionButton('sp'))
      .append(this.makeGmailActionButton('tr'));
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
      .attr('tabindex', '0')
      .append($.make('.subject').text(this.conversation.subject))
      .append(this.makeLabels())
      .append($.make('.author').text(this.conversation.author))
      .append($.make('.summary').text(this.conversation.summary))
      .append(this.makeEmailList())
      .append(this.makeReplyControls())
      .append(this.makeToolbar());

    var toggleContents = function () {
      if (this_.contents.classList.contains('contents-collapsed')) {
        document.querySelectorAll('.conversation').each(
            function (conversationElem) {
              var contents = conversationElem.conversation.view.contents;
              contents.classList.remove('contents');
              contents.classList.add('contents-collapsed');
              conversationElem.conversation.collapsed = true;
            });
      }
      this_.contents.classList.toggle('contents');
      this_.contents.classList.toggle('contents-collapsed');
      this_.conversation.collapsed = !this_.conversation.collapsed;
      var rects = this_.contents.getClientRects();
      if (rects.length && rects[0].top < 0) {
        this_.contents.scrollIntoView();
      }
    };

    var focusPreviousConversation = function () {
      document.querySelectorAll('.conversation').each(
          function (conversation, idx, conversations) {
            if (conversation === this_.root) {
              var nextIdx = (conversations.length + idx - 1) % conversations.length;
              conversations[nextIdx].children[1].focus();
            }
          });
    };

    var focusNextConversation = function () {
      document.querySelectorAll('.conversation').each(
          function (conversation, idx, conversations) {
            if (conversation === this_.root) {
              var nextIdx = (idx + 1) % conversations.length;
              conversations[nextIdx].children[1].focus();
            }
          });
    };

    var onClick = function (e) {
      if (e.shiftKey || e.ctrlKey) {
        this_.selector.click();
      } else {
        toggleContents();
      }
      e.cancelBubble = true;
      e.stopPropagation();
    };
    
    this.contents.on('click', onClick).on('keydown', function (e) {
      if (e.target == this_.contents) {
        switch (e.which) {
        case 13:
          onClick(e);
          break;
        case 74:
          focusNextConversation();
          break;
        case 75:
          focusPreviousConversation();
          break;
        case 88:
          this_.selector.click();
          break;
        }

        e.cancelBubble = true;
        e.stopPropagation();
      }
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
