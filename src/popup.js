var Cache = chrome.extension.getBackgroundPage().Cache;
var selectedMail = null; // Set to an e-mail if user has pressed it
var xhrMsgBody = null;
var throbberTimer = 0;
var throbberElem, multibarElem;

function init() {
  makeMultiBar();
  makeThrobber();

  accountInfo = JSON.parse(localStorage.accountInfo);

  var onInboxUrlClick = function() { goToInbox(this.account); };

  var inboxes = U('inboxes');
  accountInfo.each(function(accounts) {
    accounts.each(function(account, idx) {
      account.name = '';
      account.unreadCount = -1;
      account.loggedIn = false;

      var inboxRow = U.make('div.' +
        (idx === 0 ? 'inbox-row inbox-row-first' : 'inbox-row'));

        var inboxHeader = U.make('div.inbox-header');

          var inboxIcon = U.make('img.inbox-icon',
              {'src': 'icon_128.png'});
          inboxHeader.append(inboxIcon);

          var inboxUrl = U.make('div.url');
          inboxUrl.account = account;
          inboxUrl.onclick = onInboxUrlClick;
          inboxUrl.innerText = 'Loading...';
          account.inboxUrl = inboxUrl;

        inboxHeader.append(inboxUrl);
      inboxRow.append(inboxHeader);

        var inboxPreview = U.make('div.preview#inbox-preview-' + idx);
        account.inboxPreview = inboxPreview;
      inboxRow.append(inboxPreview);

      inboxes.append(inboxRow);

      Cache.loadEmails(account, updateUnreadCount, showLoggedOut);
    });
  });

  U('options-link').onclick = function() {
    openTab('options.html');
  };

  U('multibar-close').onclick = function() {
    hideMultiBar(true);
  };
}

function getMessageID(link) {
  var msgID = link.match(/message_id=([\w]*)/);
  if(msgID && msgID.length >= 2)
    return msgID[1];
  return null;
}

function openTab(url) {
  chrome.tabs.create({url: url});
}

function openMailInTab(account, link) {
  var url = link;
  var msgID = getMessageID(link); 

  if(msgID)
    url = getInboxUrl(account) + '/' + msgID;

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
  var msgID = getMessageID(mailPreview.mailLink);

  var onSuccess = function() {
    removeMail(mailPreview);
    hideThrobber();
    Cache.loadEmails(mailPreview.account, updateUnreadCount, showLoggedOut);
  };

  var onError = function() {
    showMailError('Could not connect to the Gmail server');
    hideThrobber();
    markMailAvailable(mailPreview);
  };

  if(msgID) {
    showProgressAnimation(mailPreview);
    markMailBusy(mailPreview);
    doGmailAction(mailPreview.account, msgID, action, onSuccess, onError);
  }
}

function doMailReply(mailPreview, body, replyAll) {
  var msgID = getMessageID(mailPreview.mailLink);

  var onSuccess = function() {
    hideThrobber();
    Cache.loadEmails(mailPreview.account, updateUnreadCount,
        showLoggedOut);
  };

  var onError = function() {
    showMailError('Could not connect to the Gmail server');
    hideThrobber();
    markMailAvailable(mailPreview);
  };

  if(msgID) {
    showProgressAnimation(mailPreview);
    markMailBusy(mailPreview);
    doGmailReply(mailPreview.account, msgID, body, replyAll, onSuccess,
        onError);
  }
}

/* Perform multiple actions on multiple mails
   Waits for all the requests to complete or fail before updating inboxes
*/
function doMultiMailAction(actions) {
  var selected = getMultiSelectedMails();
  var nTotal = selected.length;
  var nFinished = 0;
  var failed = [];

  var onActionComplete = function() {
    nFinished++;

    if(nTotal == nFinished) {
      hideThrobber();

      // Refresh any accounts where requests failed
      for(var i = 0; i < failed.length; i++) {
        failed[i].isDirty = true;
      }

      accountInfo.each(function(accounts) {
        accounts.each(function(account) {
          if(account.isDirty) {
            Cache.loadEmails(account, updateUnreadCount, showLoggedOut);
            delete account.isDirty;
          }
        });
      });
    }
  };

  var doSingleMailAction = function(mailPreview, action) {
    var msgID = getMessageID(mailPreview.mailLink);

    if(msgID) {
      markMailBusy(mailPreview);
      doGmailAction(mailPreview.account, msgID, action,
        function() {
          removeMail(mailPreview);
          onActionComplete();
        },
        function() {
          showMailError('Could not connect to the Gmail server');
          markMailAvailable(mailPreview);
          failed.push(mailPreview.account);
          onActionComplete();
        }
      );
    }
  };

  showThrobber();

  selected.each(function(mailPreview) {
    actions.each(function(action) {
      doSingleMailAction(mailPreview, action);
    });
  });
}

function createButton(text, className, onclick, iconX, iconY) {
  var b = U.make('div.' + className);
  if(iconX !== undefined) {
    b.append(U.make('span.tool-icon', null, {
      'background-position': iconX + 'px ' + iconY + 'px'
    }));
  }
  b.append(text);
  b.onclick = function(e) {
    e.cancelBubble = true;
    onclick();
  };
  return b;
}


function onMessageHeaderClick() {
  var message = this.parentElement;
  var messageContents =
    message.getElementsByClassName('message-contents')[0];

  if (message.className == 'message') {
    messageContents.style.height = '0px';
    message.className = 'message-hidden';
  } else {
    messageContents.style.height =
      messageContents.firstElementChild.clientHeight + 'px';

    var transitionListener = function() {
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
  var mailBody = U.make('div#mail-body');
  messages.each(function(message, i) {
    var type = (i == (messages.length-1) ?
      '.message' : '.message-hidden');
    mailBody.append(U.make(type)
    .append(U.make('.message-header')
      .on('click', onMessageHeaderClick)
      .append(U.make('.message-from').append(message.from))
      .append(U.make('.message-summary').html(message.summary))
      .append(U.make('.message-date', {'title': message.date})
        .text(U.getHumanDate(message.date))))
    .append(U.make('.message-contents')
      .append(U.make('div')
        .append(U.make('.message-to').html(message.to))
        .append(U.make('.message-body').html(message.body)))))
    .on('click', cancelBubble);
  });
  return mailBody;
}

function makeMailReply(mailPreview) {
  var div = U.make('DIV#mail-reply');
  var replyBody = U.make('TEXTAREA#mail-reply-body', {
      'rows': '1',
      'cols': '80',
      'placeholder': 'Reply here',
      'wrap': 'virtual'
      });
  div.append(replyBody);

  replyBody.oninput = function() {
    this.setAttribute('rows', this.value.split('\n').length);
    if (this.value.trim().length) {
      replyButton.removeAttribute('disabled');
      replyControls.classList.remove('dim');
    } else {
      replyButton.setAttribute('disabled', true);
      replyControls.classList.add('dim');
    }
  };

  var replyControls = U.make('div#reply-controls.dim')
    .append(U.make('label')
        .append(U.make('input#reply-all', {'type': 'checkbox'}))
        .append('Reply All'));

  var replyButton = U.make('input', {
    'type': 'button',
      'disabled': 'disabled',
      'value': 'Send'
  });

  replyButton.on('click', function() {
    doMailReply(mailPreview, replyBody.value, U('reply-all').checked);
  });

  replyControls.append(replyButton);
  div.append(replyControls).on('click', cancelBubble);

  return div;
}

function makeMailToolbar(mailPreview) {
  return U.make('div#mail-tools')
    .append(createButton('Open in Gmail...', 'preview-row-button',
          function() { 
            openMailInTab(mailPreview.account, mailPreview.mailLink);
          }, -63, -63))
    .append(createButton('Mark as read', 'preview-row-button',
          function() {
            doMailAction(mailPreview, 'rd');
          }))
    .append(createButton('Archive', 'preview-row-button',
          function() {
            doMailAction(mailPreview, 'rd');
            doMailAction(mailPreview, 'arch');
          }, -84, -21))
    .append(createButton('Spam', 'preview-row-button',
          function() {
            doMailAction(mailPreview, 'sp');
          }, -42, -42))
    .append(createButton('Delete', 'preview-row-button',
          function() {
            doMailAction(mailPreview, 'tr');
          }, -63, -42));
}

function selectMail(mailPreview) {
  if(mailPreview.busy)
    return;

  var msgID = getMessageID(mailPreview.mailLink);
  if(!msgID)
    return;

  showThrobber(mailPreview);

  xhrMsgBody = Cache.getEmailMessages(mailPreview.account, msgID, 
    function(messages) {
      hideThrobber();

      var summary = mailPreview.getElementsByClassName('summary')[0];
      summary.style.display = 'none';

      mailPreview.append(makeMailBody(messages));
      mailPreview.append(makeMailReply(mailPreview));

      var account = mailPreview.account;
      mailPreview.append(makeMailToolbar(mailPreview));

      mailPreview.className = 'preview-row-down';
      selectedMail = mailPreview;
    }
  );

   mailPreview.className = 'preview-row-down';
   selectedMail = mailPreview;
}

function unselectMail(mailPreview) {
  hideThrobber();

  var to_remove = ['mail-tools', 'mail-body', 'mail-reply'];

  for (var i = 0; i < to_remove.length; ++i) {
    var d = U(to_remove[i]);
    if(d) mailPreview.removeChild(d);
  }

  var summary = mailPreview.getElementsByClassName('summary')[0];
  summary.style.display = '';

  mailPreview.className = 'preview-row';
  selectedMail = null;

  if(xhrMsgBody) {
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
  if(this.checked) {
    this.mailPreview.className = 'preview-row-down';
    showMultiBar();
  } else {
    this.mailPreview.className = 'preview-row';
    var selecters = document.getElementsByClassName('mailSelecter');
    for(var i = 0; i < selecters.length; i++)
      if(selecters[i].checked)
        return;
    hideMultiBar();
  }
}

function getMultiSelectedMails() {
  var selecters = document.getElementsByClassName('mailSelecter');
  var selected = [];
  for(var i = 0; i < selecters.length; i++) {
    var s = selecters[i];
    if(s.checked)
      selected.push(s.nextSibling);
  }

  return selected;
}

// Show multibar if any mail is selected 
function showMultiBar() {
  // Don't show if we're busy
  if(throbberElem.style.display != 'none')
    return;

  var selecters = document.getElementsByClassName('mailSelecter');
  for(var i = 0; i < selecters.length; i++) {
    if(selecters[i].checked) {
      multibarElem.style.display = 'block';
      multibarElem.style.opacity = 1;
      return;
    }
  }
}

function hideMultiBar(deselectAll) {
  multibarElem.style.opacity = 0;
  var transitionListener = function() {
    this.removeEventListener('webkitTransitionEnd', transitionListener);
    this.style.display = 'none';
  };
  multibarElem.addEventListener('webkitTransitionEnd', transitionListener);

  if(deselectAll) {
    var selecters = document.getElementsByClassName('mailSelecter');
    for(var i = 0; i < selecters.length; i++) {
      var s = selecters[i];
      if(s.checked) {
        s.checked = false;
        if(selectedMail != s.nextSibling)
          s.nextSibling.className = 'preview-row';
      }
    }
  }
}

function makeMultiBar() {
  multibarElem = U('multibar')
    .append(createButton('Mark as read', 'multibar-button',
      function() {
        doMultiMailAction(['rd']);
      }))
    .append(createButton('Archive', 'multibar-button',
        function() {
          doMultiMailAction(['rd', 'arch']);
        }, -84, -21))
    .append(createButton('Spam', 'multibar-button',
        function() {
          doMultiMailAction(['sp']);
        }, -42, -42))
    .append(createButton('Delete', 'multibar-button',
        function() {
          doMultiMailAction(['tr']);
        }, -63, -42));
}
/* End multi-select functions */

function makeThrobber() {
  throbberElem = U('throbber');
  var canvas = U('throbber-canvas');

  if(canvas && canvas.getContext) {
    canvas.width = 16;
    canvas.height = 16;
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#ACE';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.translate(8, 8);
    var theta = 0;

    throbberTimer = window.setInterval(function() {
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
  throbberElem.style.display = 'block';
  hideMultiBar(false);
}

function hideThrobber() {
  throbberElem.style.display = 'none';
  showMultiBar();
}

function onPreviewClick() {
  if(selectedMail == this) {
    unselectMail(this);
  } else {
    if(selectedMail)
      unselectMail(selectedMail);
    selectMail(this);
  }
  //mailPreview.scrollIntoView();
}

function updateUnreadCount(account, data) {
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
  emails.each(function(email) {
    sortedEmails.push(email);
  });
  sortedEmails.sort(function(a, b) {
    return a.modified < b.modified;
  });

  for (var i = 0; i < sortedEmails.length; ++i) {
    var email = sortedEmails[i];
    // Checkbox for multi-select
    var mailSelecter = U.make('input.mailSelecter', {'type': 'checkbox'})
      .on('click', onMailSelecterClick);
    inboxPreview.append(mailSelecter);

    // Preview of a single email
    var mailPreview = U.make('div.preview-row')
      .append(U.make('.subject').text(email.subject))
      .append(U.make('.author').text(email.author))
      .append(U.make('.summary').text(email.summary));
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
  account.inboxUrl.innerText = 'Login or enter credentials in extension options';
}

function goToInbox(account) {
  chrome.tabs.query({}, function(tabs) {
    var found = false;

    tabs.each(function(tab) {
      if (tab.url && isAccountUrl(account, tab.url)) {
        chrome.tabs.update(tab.id, {selected: true});
        found = true;
        return false;
      }
    });

    if (!found) {
      chrome.tabs.create({url: getInboxUrl(account)});
    }
  });
}

document.addEventListener('DOMContentLoaded', init, false);
