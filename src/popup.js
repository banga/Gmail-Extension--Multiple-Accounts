var Cache = chrome.extension.getBackgroundPage().Cache;
var selectedMail = null; // Set to an e-mail if user has pressed it
var xhrMsgBody = null;
var throbberTimer = 0;
var throbberElem, multibarElem;

function makeElem(type, attrs, css) {
  var elem = document.createElement(type);
  for (k in attrs) {
    elem.setAttribute(k, attrs[k]);
  }
  for (prop in css) {
    elem.style[prop] = css[prop];
  }
  return elem;
}

function init() {
  makeMultiBar();
  makeThrobber();

  accountInfo = JSON.parse(localStorage.accountInfo);

  var inboxes = document.getElementById("inboxes");
  for(var domain in accountInfo) {
    var accounts = accountInfo[domain];
    for(var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      account.name = "";
      account.unreadCount = -1;
      account.loggedIn = false;

      var inboxRow = document.createElement("div");
        inboxRow.setAttribute("class", i == 0 ? "inbox-row inbox-row-first" : "inbox-row");

        var inboxHeader = document.createElement("div");
          inboxHeader.setAttribute("class", "inbox-header");

          var inboxIcon = document.createElement("img");
          inboxIcon.setAttribute("class", "inbox-icon");
          inboxIcon.setAttribute("src", "icon_128.png");
          inboxHeader.appendChild(inboxIcon);

          var inboxUrl = document.createElement("div");
          inboxUrl.setAttribute("class", "url");
          inboxUrl.account = account;
          inboxUrl.onclick = function() { goToInbox(this.account); }
          inboxUrl.innerText = "Loading...";
          account.inboxUrl = inboxUrl;

        inboxHeader.appendChild(inboxUrl);
      inboxRow.appendChild(inboxHeader);

        var inboxPreview = document.createElement("div");
        inboxPreview.setAttribute("class", "preview");
        inboxPreview.setAttribute("id", "inbox-preview-" + i);
        account.inboxPreview = inboxPreview;
      inboxRow.appendChild(inboxPreview);

      inboxes.appendChild(inboxRow);

      Cache.loadEmails(account, updateUnreadCount, showLoggedOut);
    }
  }

  document.getElementById('options-link').onclick = function() {
    openTab("options.html")
  };

  document.getElementById('multibar-close').onclick = function() {
    hideMultiBar(true);
  }
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
    url = getInboxUrl(account) + "/" + msgID;

  openTab(url);
}

function showProgressAnimation(mailPreview) {
  unselectMail(mailPreview);
  mailPreview.setAttribute("class", "preview-row-busy");
  showThrobber();
}

function showMailError(msg) {
  //window.alert(msg);
  console.err(msg);
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
    Cache.loadEmails(mailPreview.account, updateUnreadCount,
        showLoggedOut);
  }

  var onError = function() {
    showMailError("Could not connect to the Gmail server");
    hideThrobber();
    markMailAvailable(mailPreview);
  }

  if(msgID) {
    showProgressAnimation(mailPreview);
    markMailBusy(mailPreview);
    doGmailAction(mailPreview.account, msgID, action, onSuccess, onError);
  }
}

function doMailReply(mailPreview, body) {
  var msgID = getMessageID(mailPreview.mailLink);

  var onSuccess = function() {
    hideThrobber();
    Cache.loadEmails(mailPreview.account, updateUnreadCount,
        showLoggedOut);
  }

  var onError = function() {
    showMailError("Could not connect to the Gmail server");
    hideThrobber();
    markMailAvailable(mailPreview);
  }

  if(msgID) {
    showProgressAnimation(mailPreview);
    markMailBusy(mailPreview);
    doGmailReply(mailPreview.account, msgID, body, onSuccess, onError);
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

      for(var domain in accountInfo) {
        var accounts = accountInfo[domain];
        for(var i = 0; i < accounts.length; i++) {
          if(accounts[i].isDirty) {
            Cache.loadEmails(accounts[i], updateUnreadCount, showLoggedOut);
            delete accounts[i].isDirty;
          }
        }
      }
    }
  }

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
          showMailError("Could not connect to the Gmail server");
          markMailAvailable(mailPreview);
          failed.push(mailPreview.account);
          onActionComplete();
        }
      );
    }
  };

  showThrobber();

  for(var i = 0; i < selected.length; i++)
    for(var j = 0; j < actions.length; j++) {
      var mailPreview = selected[i];
      var action = actions[j];

      doSingleMailAction(mailPreview, action);
    }
}

function createButton(text, className, onclick, iconX, iconY) {
  var b = document.createElement("div");
  b.setAttribute("class", className);
  if(iconX !== undefined) {
    b.innerHTML = "<span class='tool-icon' style='background-position: " + iconX  + "px " + iconY + "px;'></span>";
  } else {
    b.innerHTML = "";
  }
  b.innerHTML += text;
  b.onclick = function(e) {
    e.cancelBubble = true;
    onclick();
  };
  return b;
}

function makeElement(type, attribs, css) {
  var elem = document.createElement(type);
  for(attrib in attribs)
    elem.setAttribute(attrib, attribs[attrib]);
  for(prop in css)
    elem.style[prop] = css[prop];
  return elem;
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
      console.log("Messages received");
      console.log(messages);

      var msgBody = "";
      for (var i = 0; i < messages.length; ++i) {
        var cls = i == (messages.length-1) ? 'message' : 'message-hidden';
        var message = messages[i];
        msgBody +=
          "<div class='" + cls + "'>" +
            "<div class='message-header'>" + 
              "<div class='message-from'>" + message.from + "</div>" +
              "<div class='message-summary'>" + message.summary + "</div>" +
              "<div class='message-date'>" + message.date + "</div>" +
            "</div>" +
            "<div class='message-body'>" + message.body + "</div>" +
          "</div>";
      }

      hideThrobber();

      var summary = mailPreview.getElementsByClassName("summary")[0];
      summary.style.display = "none";

      var div = document.createElement("div");
      div.setAttribute("id", "mail-body");
      div.innerHTML = msgBody;
      div.onclick = function(e) { e.cancelBubble = true };

      messageHeaders = div.querySelectorAll('.message-header');
      for (var i = 0; i < messageHeaders.length; ++i) {
        messageHeaders[i].onclick = function() {
          var message = this.parentElement;
          var messageBody = this.nextElementSibling;

          if (message.className == "message") {
            messageBody.style.height = "0px";
            message.className = "message-hidden";
          } else {
            messageBody.style.height =
              messageBody.firstElementChild.clientHeight + "px";

            var transitionListener = function() {
              messageBody.removeEventListener('webkitTransitionEnd', transitionListener);
              message.className = "message";
            };
            messageBody.addEventListener('webkitTransitionEnd', transitionListener);
          }
        }
      }

      mailPreview.appendChild(div);

      div = makeElem('DIV', {'id': 'mail-reply'});
      var replyBody = makeElem('TEXTAREA',
          {
            'id': 'mail-reply-body',
            'rows': '1',
            'cols': '80',
            'placeholder': 'Reply here',
            'wrap': 'virtual'
          });
      div.appendChild(replyBody);

      var replyButton = makeElem('input',
          {
            'type': 'button',
            'disabled': 'disabled',
            'id': 'mail-reply-button',
            'value': 'Send'
          });
      div.appendChild(replyButton);

      replyBody.oninput = function() {
        this.setAttribute('rows', this.value.split('\n').length);
        if (this.value.trim().length) {
          replyButton.removeAttribute('disabled');
        } else {
          replyButton.setAttribute('disabled', true);
        }
      }
      replyButton.onclick = function() {
        doMailReply(mailPreview, replyBody.value);
      }
      div.onclick = function(e) { e.cancelBubble = true };
      mailPreview.appendChild(div);


      var account = mailPreview.account;
      var d = document.createElement("div");
      d.setAttribute("id", "mail-tools");
      d.appendChild(createButton("Open in Gmail...", "preview-row-button", function() { 
        openMailInTab(mailPreview.account, mailPreview.mailLink)
      }, -63, -63));
      d.appendChild(createButton("Mark as read", "preview-row-button", function() {
        doMailAction(mailPreview, "rd");
      }));
      d.appendChild(createButton("Archive", "preview-row-button", function() {
        doMailAction(mailPreview, "rd");
        doMailAction(mailPreview, "arch");
      }, -84, -21));
      d.appendChild(createButton("Spam", "preview-row-button", function() {
        doMailAction(mailPreview, "sp");
      }, -42, -42));
      d.appendChild(createButton("Delete", "preview-row-button", function() {
        doMailAction(mailPreview, "tr");
      }, -63, -42));
      mailPreview.appendChild(d);

      mailPreview.setAttribute("class", "preview-row-down");
      selectedMail = mailPreview;
    }
  );

   mailPreview.setAttribute("class", "preview-row-down");
   selectedMail = mailPreview;
}

function unselectMail(mailPreview) {
  hideThrobber();

  var to_remove = ["mail-tools", "mail-body", "mail-reply"];

  for (var i = 0; i < to_remove.length; ++i) {
    var d = document.getElementById(to_remove[i]);
    if(d) mailPreview.removeChild(d);
  }

  var summary = mailPreview.getElementsByClassName("summary")[0];
  summary.style.display = "";

  mailPreview.setAttribute("class", "preview-row");
  selectedMail = null;

  if(xhrMsgBody) {
    xhrMsgBody.abort();
    xhrMsgBody = null;
  }
}

function removeMail(mailPreview) {
  var parent = mailPreview.parentElement;
  var mailSelect = mailPreview.previousSibling;
  parent.removeChild(mailSelect);
  parent.removeChild(mailPreview);
  selectedMail = null;
}

/* Multi-select functions */
function onSelecterClick(mailSelecter) {
  if(mailSelecter.checked) {
    mailSelecter.mailPreview.setAttribute("class", "preview-row-down");
    showMultiBar();
  } else {
    mailSelecter.mailPreview.setAttribute("class", "preview-row");
    var selecters = document.getElementsByClassName("mailSelecter");
    for(var i = 0; i < selecters.length; i++)
      if(selecters[i].checked)
        return;
    hideMultiBar();
  }
}

function getMultiSelectedMails() {
  var selecters = document.getElementsByClassName("mailSelecter");
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
  if(throbberElem.style.display != "none")
    return;

  var selecters = document.getElementsByClassName("mailSelecter");
  for(var i = 0; i < selecters.length; i++) {
    if(selecters[i].checked) {
      multibarElem.style.display = "block";
      return;
    }
  }
}

function hideMultiBar(deselectAll) {
  multibarElem.style.display = "none";

  if(deselectAll) {
    var selecters = document.getElementsByClassName("mailSelecter");
    for(var i = 0; i < selecters.length; i++) {
      var s = selecters[i];
      if(s.checked) {
        s.checked = false;
        if(selectedMail != s.nextSibling)
          s.nextSibling.setAttribute("class", "preview-row");
      }
    }
  }
}

function makeMultiBar() {
  multibarElem = document.getElementById("multibar");
  multibarElem .appendChild(createButton("Mark as read", "multibar-button", function() {
    doMultiMailAction(["rd"]);
  }));
  multibarElem.appendChild(createButton("", "multibar-button", function() {
    doMultiMailAction(["rd", "arch"]);
  }, -84, -21));
  multibarElem.appendChild(createButton("", "multibar-button", function() {
    doMultiMailAction(["sp"]);
  }, -42, -42));
  multibarElem.appendChild(createButton("", "multibar-button", function() {
    doMultiMailAction(["tr"]);
  }, -63, -42));
}
/* End multi-select functions */

function makeThrobber() {
  throbberElem = document.getElementById('throbber');
  var canvas = document.getElementById('throbber-canvas');

  if(canvas && canvas.getContext) {
    canvas.width = 16;
    canvas.height = 16;
    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = "#ACE";
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
  throbberElem.style.display = "block";
  hideMultiBar(false);
}

function hideThrobber() {
  throbberElem.style.display = "none";
  showMultiBar();
}

function onPreviewClick(mailPreview) {
  if(selectedMail == mailPreview) {
    unselectMail(mailPreview);
  } else {
    if(selectedMail)
      unselectMail(selectedMail);
    selectMail(mailPreview);
  }
}

function updateUnreadCount(account, data) {
  var name = data.name;
  var count = data.unreadCount;
  var emails = data.emails;

  console.log('updateUnreadCount: ' + name);
  console.dir(emails);

  account.name = name;
  account.unreadCount = count;
  account.loggedIn = true;

  var inboxUrl = account.inboxUrl;
  inboxUrl.innerText = name + " (" + count + ") ";

  var inboxPreview = account.inboxPreview;
  inboxPreview.innerHTML = "";

  var sortedEmails = [];
  for(var msgID in emails) {
    sortedEmails.push(emails[msgID]);
  }
  sortedEmails.sort(function(a, b) {
    return a.modified < b.modified;
  });

  for (var i = 0; i < sortedEmails.length; ++i) {
    var email = sortedEmails[i];
    // Checkbox for multi-select
    var mailSelecter = makeElement("input",
      { 'type': 'checkbox',
        'class': 'mailSelecter' });
    mailSelecter.onclick = function() { onSelecterClick(this) };
    inboxPreview.appendChild(mailSelecter);

    // Preview of a single email
    var mailPreview = document.createElement("div");
    mailPreview.setAttribute("class", "preview-row");
    mailPreview.innerHTML =
      "<div class='subject'>" + email.subject + "</div>" +
      "<div class='author'>"  + email.author  + "</div>" + 
      "<div class='summary'>" + email.summary + "</div>";
    mailPreview.mailLink = email.link;
    mailPreview.account = account;
    mailPreview.onclick = function() { onPreviewClick(this); };
    inboxPreview.appendChild(mailPreview);

    mailSelecter.mailPreview = mailPreview;
  }

  chrome.extension.sendRequest({
    "domain": account.domain,
    "number": account.number,
    "count": count
  });
}


function showLoggedOut(account) {
  account.loggedIn = false;
  account.inboxUrl.innerText = "Login or enter credentials in extension options";
}

function goToInbox(account) {
  chrome.tabs.getAllInWindow(undefined, function(tabs) {
    for (var i = 0, tab; tab = tabs[i]; i++) {
      if (tab.url && isAccountUrl(account, tab.url)) {
        chrome.tabs.update(tab.id, {selected: true});
        return;
      }
    }
    chrome.tabs.create({url: getInboxUrl(account)});
  });
}

document.addEventListener("DOMContentLoaded", init, false);
