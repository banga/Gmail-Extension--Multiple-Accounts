var cache = chrome.extension.getBackgroundPage().cache;

var popup = function () {
  'use strict';

  var selectedMail = null, // Set to an e-mail if user has pressed it
      xhrMsgBody = null,
      throbberTimer = 0,
      throbberElem,
      multibarElem,
      accountInfo;

  function init() {
    makeMultiBar();
    makeThrobber();

    accountInfo = JSON.parse(localStorage.accountInfo);

    var onInboxUrlClick = function () {
      analytics.inboxUrlClick(this.account.name);
      goToInbox(this.account);
    };

    var inboxes = $('inboxes');
    accountInfo.each(function (accounts) {
      accounts.each(function (account, idx) {
        account.name = '';
        account.unreadCount = -1;
        account.loggedIn = false;

        var inboxRow = $.make('div.' +
          (idx === 0 ? 'inbox-row inbox-row-first' : 'inbox-row'));

        var inboxHeader = $.make('div.inbox-header');

        var inboxIcon = $.make('img.inbox-icon', {'src': 'icon_128.png'});
        inboxHeader.append(inboxIcon);

        var inboxUrl = $.make('div.url');
        inboxUrl.account = account;
        inboxUrl.onclick = onInboxUrlClick;
        inboxUrl.innerText = 'Loading...';
        account.inboxUrl = inboxUrl;

        inboxHeader.append(inboxUrl);
        inboxRow.append(inboxHeader);

        var inboxPreview = $.make('div.preview#inbox-preview-' + idx);
        account.inboxPreview = inboxPreview;
        inboxRow.append(inboxPreview);

        inboxes.append(inboxRow);

        cache.loadEmails(account, updateInboxPreview, showLoggedOut);
      });
    });

    $('options-link').onclick = function () {
      analytics.optionsClick();
      openTab('options.html');
    };

    $('multibar-close').onclick = function () {
      analytics.multibarClose();
      hideMultiBar(true);
    };
  }

  function getMessageID(link) {
    var msgID = link.match(/message_id=([\w]*)/);
    if (msgID && msgID.length >= 2)
      return msgID[1];
    return null;
  }

  function openTab(url) {
    chrome.tabs.create({url: url});
  }

  function openMailInTab(account, link) {
    var url = link;
    var msgID = getMessageID(link); 

    if (msgID) {
      url = gmail.getInboxUrl(account) + '/' + msgID;
    }

    openTab(url);
  }

  function showProgressAnimation(mailPreview) {
    unselectMail(mailPreview);
    mailPreview.className = 'preview-row-busy';
    showThrobber();
  }

  function showMailError(msg) {
    console.error(msg);
  }

  function markMailBusy(mailPreview) {
    mailPreview.busy = true;
  }

  function markMailAvailable(mailPreview) {
    mailPreview.busy = false;
  }

  function doMailAction(mailPreview, action) {
    function onMailActionSuccess() {
      removeMail(mailPreview);
      hideThrobber();
      cache.loadEmails(mailPreview.account, updateInboxPreview, showLoggedOut);
    }

    function onMailActionError() {
      showMailError('Could not connect to the Gmail server');
      hideThrobber();
      markMailAvailable(mailPreview);
    }

    var msgID = getMessageID(mailPreview.mailLink);

    if (msgID) {
      showProgressAnimation(mailPreview);
      markMailBusy(mailPreview);
      action(mailPreview.account, msgID,
          onMailActionSuccess, onMailActionError);
    }
  }

  function doMailReply(mailPreview, body, replyAll) {
    var msgID = getMessageID(mailPreview.mailLink);

    var onSuccess = function () {
      hideThrobber();
      cache.loadEmails(mailPreview.account, updateInboxPreview,
          showLoggedOut);
    };

    var onError = function () {
      showMailError('Could not connect to the Gmail server');
      hideThrobber();
      markMailAvailable(mailPreview);
    };

    if (msgID) {
      showProgressAnimation(mailPreview);
      markMailBusy(mailPreview);
      gmail.reply(mailPreview.account, msgID, body, replyAll, onSuccess,
          onError);
    }
  }

  /* Perform multiple actions on multiple mails
     Waits for all the requests to complete/fail before updating inboxes
  */
  function doMultiMailAction(actions, analyticsCallback) {
    var selected = getMultiSelectedMails();
    var nTotal = selected.length;
    var nFinished = 0;
    var failed = [];

    analyticsCallback.apply(analytics, ['', nTotal]);

    var onActionComplete = function () {
      nFinished++;

      if (nTotal == nFinished) {
        hideThrobber();

        // Refresh any accounts where requests failed
        for (var i = 0; i < failed.length; i++) {
          failed[i].isDirty = true;
        }

        accountInfo.each(function (accounts) {
          accounts.each(function (account) {
            if (account.isDirty) {
              cache.loadEmails(account, updateInboxPreview, showLoggedOut);
              delete account.isDirty;
            }
          });
        });
      }
    };

    var doSingleMailAction = function (mailPreview, action) {
      var msgID = getMessageID(mailPreview.mailLink);

      if (msgID) {
        markMailBusy(mailPreview);
        action(mailPreview.account, msgID, function () {
            removeMail(mailPreview);
            onActionComplete();
          },
          function () {
            showMailError('Could not connect to the Gmail server');
            markMailAvailable(mailPreview);
            failed.push(mailPreview.account);
            onActionComplete();
          }
        );
      }
    };

    showThrobber();

    selected.each(function (mailPreview) {
      actions.each(function (action) {
        doSingleMailAction(mailPreview, action);
      });
    });
  }

  function createButton(text, className, onclick, iconX, iconY) {
    var b = $.make('div.' + className);
    if (iconX !== undefined) {
      b.append($.make('span.tool-icon', null, {
        'background-position': iconX + 'px ' + iconY + 'px'
      }));
    }
    b.append(text);
    b.onclick = function (e) {
      e.cancelBubble = true;
      onclick();
    };
    return b;
  }

  function onMessageHeaderClick() {
    /*jshint validthis:true */
    var message = this.parentElement;
    var messageContents =
      message.getElementsByClassName('message-contents')[0];

    if (message.className == 'message') {
      analytics.messageHide(message.id,
          $.stopTimer('message-show-' + message.id));

      messageContents.style.height = '0px';
      message.className = 'message-hidden';
    } else {
      $.startTimer('message-show-' + message.id);
      analytics.messageShow(message.id);

      messageContents.style.height =
        messageContents.firstElementChild.clientHeight + 'px';

      var transitionListener = function () {
        messageContents.removeEventListener('webkitTransitionEnd',
            transitionListener);
        message.className = 'message';
      };
      messageContents.addEventListener('webkitTransitionEnd',
          transitionListener);
    }
  }

  function cancelBubble(e) {
    e.cancelBubble = true;
  }

  function makeMailBody(messages) {
    var mailBody = $.make('div#mail-body');
    messages.each(function (message, i) {
      var type = (i == (messages.length - 1) ?
        '.message' : '.message-hidden');
      var id = 'message-' + (messages.length - i);
      mailBody.append($.make(type + '#' + id)
      .append($.make('.message-header')
        .on('click', onMessageHeaderClick)
        .append($.make('.message-from').append(message.from))
        .append($.make('.message-summary').html(message.summary))
        .append($.make('.message-date', {'title': message.date})
          .text($.getHumanDate(message.date))))
      .append($.make('.message-contents')
        .append($.make('div')
          .append($.make('.message-to').html(message.to))
          .append($.make('.message-body').html(message.body)))))
      .on('click', cancelBubble);
    });
    return mailBody;
  }

  function makeMailReply(mailPreview) {
    var div = $.make('DIV#mail-reply');
    var replyBody = $.make('TEXTAREA#mail-reply-body', {
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

      var lines = this.value.split('\n');
      var rows = lines.length;
      if (lines.length) {
        var line = lines[lines.length - 1];
        if (line.length > 60)
          rows += 1;
      }
      this.setAttribute('rows', rows);

      if (this.value.trim().length) {
        replyButton.removeAttribute('disabled');
        replyControls.classList.remove('dim');
      } else {
        replyButton.setAttribute('disabled', true);
        replyControls.classList.add('dim');
      }
    };

    var replyControls = $.make('div#reply-controls.dim')
      .append($.make('label')
          .append($.make('input#reply-all', {'type': 'checkbox'}))
          .append('Reply All'));

    var replyButton = $.make('input', {
      'type': 'button',
      'disabled': 'disabled',
      'value': 'Send'
    });

    replyButton.on('click', function () {
      analytics.replySend('', replyBody.value.length);
      doMailReply(mailPreview, replyBody.value, $('reply-all').checked);
    });

    replyControls.append(replyButton);
    div.append(replyControls).on('click', cancelBubble);

    return div;
  }

  function makeMailToolbar(mailPreview) {
    return $.make('div#mail-tools')
      .append(createButton('Open in Gmail...', 'preview-row-button',
            function () { 
              analytics.mailOpen();
              openMailInTab(mailPreview.account, mailPreview.mailLink);
            }, -63, -63))
      .append(createButton('Mark as read', 'preview-row-button',
            function () {
              analytics.mailMarkAsRead();
              doMailAction(mailPreview, gmail.markAsRead);
            }))
      .append(createButton('Archive', 'preview-row-button',
            function () {
              analytics.mailArchive();
              doMailAction(mailPreview, gmail.markAsRead);
              doMailAction(mailPreview, gmail.archive);
            }, -84, -21))
      .append(createButton('Spam', 'preview-row-button',
            function () {
              analytics.mailMarkAsSpam();
              doMailAction(mailPreview, gmail.markAsSpam);
            }, -42, -42))
      .append(createButton('Delete', 'preview-row-button',
            function () {
              analytics.mailDelete();
              doMailAction(mailPreview, gmail.trash);
            }, -63, -42));
  }

  function selectMail(mailPreview) {
    if (mailPreview.busy)
      return;

    var msgID = getMessageID(mailPreview.mailLink);

    if (!msgID)
      return;

    showThrobber();

    $.startTimer('mail-get');

    xhrMsgBody = cache.getEmailMessages(mailPreview.account, msgID, 
      function (messages) {
        analytics.previewShow('', $.stopTimer('mail-get'));
        hideThrobber();

        var summary = mailPreview.getElementsByClassName('summary')[0];
        summary.style.display = 'none';

        mailPreview.append(makeMailBody(messages));
        mailPreview.append(makeMailReply(mailPreview));

        mailPreview.append(makeMailToolbar(mailPreview));

        mailPreview.className = 'preview-row-down';
        selectedMail = mailPreview;

        $.startTimer('mail-show');
      },
      function () {
        analytics.previewFail('', $.stopTimer('mail-get'));
        mailPreview.className = 'preview-row';
        selectedMail = null;
      }
    );

    mailPreview.className = 'preview-row-down';
    selectedMail = mailPreview;
  }

  function unselectMail(mailPreview) {
    analytics.previewFail('', $.stopTimer('mail-show'));
    hideThrobber();

    var to_remove = ['mail-tools', 'mail-body', 'mail-reply'];

    for (var i = 0; i < to_remove.length; ++i) {
      var d = $(to_remove[i]);
      if (d) mailPreview.removeChild(d);
    }

    var summary = mailPreview.getElementsByClassName('summary')[0];
    summary.style.display = '';

    mailPreview.className = 'preview-row';
    selectedMail = null;

    if (xhrMsgBody) {
      xhrMsgBody.abort();
      xhrMsgBody = null;
    }
  }

  function removeMail(mailPreview) {
    var neighbor = mailPreview.previousElementSibling ||
      mailPreview.nextElementSibling || mailPreview.parentElement;

    var mailRow = mailPreview.parentElement;
    var mailSelect = mailPreview.previousSibling;
    mailRow.removeChild(mailSelect);
    mailRow.removeChild(mailPreview);
    selectedMail = null;

    neighbor.scrollIntoViewIfNeeded();
  }

  /* Multi-select functions */
  function onMailSelecterClick() {
    /*jshint validthis:true */
    if (this.checked) {
      this.mailPreview.className = 'preview-row-down';
      showMultiBar();
    } else {
      this.mailPreview.className = 'preview-row';
      var selecters = document.getElementsByClassName('mailSelecter');
      for (var i = 0; i < selecters.length; i++)
        if (selecters[i].checked)
          return;
      hideMultiBar();
    }
  }

  function getMultiSelectedMails() {
    var selecters = document.getElementsByClassName('mailSelecter');
    var selected = [];
    for (var i = 0; i < selecters.length; i++) {
      var s = selecters[i];
      if (s.checked)
        selected.push(s.nextSibling);
    }

    return selected;
  }

  // Show multibar if any mail is selected 
  function showMultiBar() {
    // Don't show if we're busy
    if (throbberElem.style.display != 'none')
      return;

    var selecters = document.getElementsByClassName('mailSelecter');
    for (var i = 0; i < selecters.length; i++) {
      if (selecters[i].checked) {
        multibarElem.style.display = 'block';
        multibarElem.style.opacity = 1;
        return;
      }
    }
  }

  function hideMultiBar(deselectAll) {
    multibarElem.style.opacity = 0;

    if (deselectAll) {
      var selecters = document.getElementsByClassName('mailSelecter');
      selecters.each(function (selecter) {
        if (selecter.checked) {
          selecter.checked = false;
          if (selectedMail != selecter.nextSibling) {
            selecter.nextSibling.className = 'preview-row';
          }
        }
      });
    }
  }

  function makeMultiBar() {
    multibarElem = $('multibar')
      .append(createButton('Mark as read', 'multibar-button',
        function () {
          doMultiMailAction([gmail.markAsRead], analytics.multibarMarkAsRead);
        }))
      .append(createButton('Archive', 'multibar-button',
          function () {
            doMultiMailAction([gmail.markAsRead, gmail.archive],
              analytics.multibarArchive);
          }, -84, -21))
      .append(createButton('Spam', 'multibar-button',
          function () {
            doMultiMailAction([gmail.markAsSpam],
              analytics.multibarSpam);
          }, -42, -42))
      .append(createButton('Delete', 'multibar-button',
          function () {
            doMultiMailAction([gmail.trash],
              analytics.multibarDelete);
          }, -63, -42));

    multibarElem.addEventListener('webkitTransitionEnd', function (e) {
      if (e.target == multibarElem && e.propertyName == 'opacity') {
        if (parseFloat(multibarElem.style.opacity) === 0) {
          multibarElem.style.display = 'none';
        }
      }
    });
  }
  /* End multi-select functions */

  function makeThrobber() {
    throbberElem = $('throbber');
    var canvas = $('throbber-canvas');

    if (canvas && canvas.getContext) {
      canvas.width = 16;
      canvas.height = 16;
      var ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#ACE';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.translate(8, 8);
      var theta = 0;

      throbberTimer = window.setInterval(function () {
        ctx.save();
        ctx.clearRect(-8, -8, 16, 16);
        ctx.rotate(theta);
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI / 1.5, false);
        ctx.stroke();
        ctx.restore();
        theta += Math.PI / 50;
      }, 10);

      hideThrobber();
    }
  }

  function showThrobber() {
    $.startTimer('throbber');
    throbberElem.style.display = 'block';
    hideMultiBar(false);
  }

  function hideThrobber() {
    analytics.throbberFinish('', $.stopTimer('throbber'));
    throbberElem.style.display = 'none';
    showMultiBar();
  }

  function onPreviewClick() {
    /*jshint validthis:true */
    if (selectedMail == this) {
      unselectMail(this);
    } else {
      if (selectedMail)
        unselectMail(selectedMail);
      selectMail(this);
    }
    //mailPreview.scrollIntoView();
  }

  function updateInboxPreview(account, data) {
    var name = data.name;
    var count = data.unreadCount;
    var emails = data.emails;

    account.name = name;
    account.unreadCount = count;
    account.loggedIn = true;

    var inboxUrl = account.inboxUrl;
    inboxUrl.innerText = name + ' (' + count + ') ';

    var inboxPreview = account.inboxPreview;
    inboxPreview.html('');

    var sortedEmails = [];
    emails.each(function (email) {
      sortedEmails.push(email);
    });
    sortedEmails.sort(function (a, b) {
      return a.modified < b.modified;
    });

    for (var i = 0; i < sortedEmails.length; ++i) {
      var email = sortedEmails[i];
      // Checkbox for multi-select
      var mailSelecter = $.make('input.mailSelecter', {'type': 'checkbox'})
        .on('click', onMailSelecterClick);
      inboxPreview.append(mailSelecter);

      // Preview of a single email
      var mailPreview = $.make('div.preview-row')
        .append($.make('.subject').text(email.subject))
        .append($.make('.author').text(email.author))
        .append($.make('.summary').text(email.summary));
      mailPreview.mailLink = email.link;
      mailPreview.account = account;
      mailPreview.onclick = onPreviewClick;
      inboxPreview.append(mailPreview);

      mailSelecter.mailPreview = mailPreview;
    }

    chrome.extension.sendRequest({
      'domain': account.domain,
      'number': account.number,
      'count': count
    });
  }

  function showLoggedOut(account) {
    account.loggedIn = false;
    account.inboxUrl.innerText =
      'Login or enter credentials in extension options';
  }

  function goToInbox(account) {
    chrome.tabs.query({}, function (tabs) {
      var found = false;

      tabs.each(function (tab) {
        if (tab.url && gmail.isAccountUrl(account, tab.url)) {
          chrome.tabs.update(tab.id, {selected: true});
          found = true;
          return false;
        }
      });

      if (!found) {
        chrome.tabs.create({url: gmail.getInboxUrl(account)});
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init, false);

  return {
    accountInfo: function () {
      return accountInfo;
    }
  };
} ();

console.dir(popup);
