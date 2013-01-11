// Simple API for reading from gmail feeds
var gmail = function () {
  'use strict';

  var instanceId = 'gmc' + parseInt(Date.now() * Math.random(), 10);
  var requestTimeout = 1000 * 5;

  function getGmailUrl(account) {
    var url = 'https://mail.google.com/';
    if (account && account.domain)
      url += account.domain + '/';
    else
      url += 'mail/';
    return url;
  }

  function getAccountUrl(account) {
    if (!account.url) {
      console.error('Account doesn\'t have a url:');
      console.dir(account);
      return getGmailUrl(account) + 'u/' + account.number + '/';
    }
    return account.url;
    //return getGmailUrl(account) + 'u/' + account.number + '/';
  }

  function getInboxUrl(account) {
    return getAccountUrl(account) + '#inbox';
  }

  function getFeedUrl(account) {
    // 'zx' is a Gmail query parameter that is expected to contain a random
    // string and may be ignored/stripped.
    return getAccountUrl(account) + 'feed/atom/?zx=' +
      encodeURIComponent(instanceId);
  }

  function getHTMLModeUrl(account) {
    return getAccountUrl(account) + 'h/' +
      Math.ceil(Math.random() * 1.5e17).toString(26) + '/';
  }

  function isGmailUrl(url) {
    return (url.indexOf(getGmailUrl()) === 0);
  }

  function isAccountUrl(account, url) {
    // This is the Gmail we're looking for if:
    // - starts with the correct gmail url
    // - doesn't contain any other path chars
    var gmail = getAccountUrl(account);
    if (url.indexOf(gmail) !== 0)
      return false;

    return url.length == gmail.length || url[gmail.length] == '?' ||
      url[gmail.length] == '#';
  }

  function parseFeed(account, xmlHandler, onSuccess, onError) {
    var xhr = $.get({
      url: getFeedUrl(account),
      onSuccess: function (xhr) {
        var data = xmlHandler(xhr.responseXML);
        if (data) {
          handleSuccess(data);
        } else {
          handleError();
        }
      },
      onError: handleError 
    });

    var invokedErrorCallback = false;
    var abortTimerId = window.setTimeout(function () {
      xhr.abort();
    }, requestTimeout);

    function handleSuccess(data) {
      account.requestFailureCount = 0;
      window.clearTimeout(abortTimerId);
      if (onSuccess)
        onSuccess(account, data);
    }

    function handleError() {
      ++account.requestFailureCount;
      window.clearTimeout(abortTimerId);
      if (onError && !invokedErrorCallback)
        onError(account);
      invokedErrorCallback = true;
    }
  }

  function getAccountAt(account, onSuccess) {
    var url = getHTMLModeUrl(account);// + '?ui=html&zy=c';
    console.log('getAccountAt: ' + url);

    $.get({
      url: url,
      onSuccess: function (xhr) {
        var m = xhr.responseText.match(/\at=([^"]+)/);
        if (m && m.length > 0) {
          account.at = m[1];
          onSuccess();
        }
      },
      onError: function (xhr, error) {
        console.error(error);
      }
    });
  }

  function updateAccountUrl(account, onFinish) {
    account.url = getGmailUrl(account) + 'u/' + account.number + '/';
    console.log('Updating url for ' + account.url);
    $.post({
      url: account.url,
      onSuccess: function (xhr) {
        var doc = $.make('document').html(xhr.response);
        var meta = doc.querySelector('meta[name="application-url"]');
        if (meta) {
          account.url = meta.getAttribute('content') + '/';
          console.log('url changed to ' + account.url);
        }
        onFinish();
      },
      onError: onFinish
    });
  }

  function doGmailAction(action, account, msgID, onSuccess, onError) {
    if (!account.at) {
      getAccountAt(account, function () {
        doGmailAction(account, msgID, action, onSuccess, onError);
      });
      return;
    }

    var url = getHTMLModeUrl(account);
    var params = 't=' + msgID + '&at=' + account.at + '&act=' + action;

    return $.post({
      url: url,
      onSuccess: onSuccess,
      onError: onError,
      params: params,
      headers: {'Content-type': 'application/x-www-form-urlencoded'}
    });
  }

  function doGmailReply(account, msgID, body, replyAll, onSuccess, onError) {
    /*
    https://mail.google.com/mail/u/0/h/4kanhx7cv3es/?&v=b&qrt=n&fv=cv&rm=13bf71c4f82c2c39&at=AF6bupM-wmLVbDy8fSwaTVkmeLBMqZYufA&pv=cv&th=13bf71c4f82c2c39&cs=qfnq
    POST params: qrr=o&body=Hello&nvp_bu_send=Send&haot=qt 
  */

    if (!account.at) {
      getAccountAt(account, function () {
        doGmailReply(account, msgID, body, replyAll, onSuccess, onError);
      });
      return;
    }

    var url = getHTMLModeUrl(account) + '?v=b&qrt=n&fv=cv&rm=' +
      msgID + '&at=' + account.at + '&cs=qfnq';
    var params = new FormData();
    params.append('body', body);
    params.append('nvp_bu_send', 'Send');
    params.append('haot', 'qt');
    params.append('qrr', replyAll ? 'a' : 'o');

    return $.post({
      url: url,
      onSuccess: onSuccess,
      onError: onError,
      params: params
    });
  }

  function doGmailSend(account, to, cc, bcc, subject, body, onSuccess, onError) {
    /*
       /mail/u/0/h/<randno>/?&v=b&fv=b&cpt=c&at=<at>&pv=tl&cs=c
       form-data: to, cc, bcc, subject, body, file0..., nvp_bu_send
     */

    if (!account.at) {
      getAccountAt(account,
          doGmailSend.bind(window, account, to, cc, bcc, subject, body,
            onSuccess, onError));
      return;
    }

    var url = getHTMLModeUrl(account) + '?v=b&fv=b&cpt=c&at=' + account.at +
      '&pv=tl&cs=c';
    
    var params = new FormData();
    params.append('to', to);
    params.append('cc', cc);
    params.append('bcc', bcc);
    params.append('subject', subject);
    params.append('body', body);
    params.append('nvp_bu_send', 'Send');
    
    return $.post({
      url: url,
      onSuccess: onSuccess,
      onError: onError,
      params: params
    });
  }

  function makeMessageSummary(message) {
    var div = $.make('div').html(message.body);
    return div.innerText.trim().substr(0, 100);
  }

  function makeMessage(messageTable, mailURL) {
    var tb = messageTable.querySelector('tbody'),
        cells = tb.querySelectorAll('td'),
        i;

    var message = {};
    console.dir(cells);
    var from = $.extractContacts(cells[0].text());
    message.from = '<a class="contact-name" email="' +
      from.items[0][1] + '">' + from.items[0][0] + '</a>';
    message.date = cells[1].innerText.replace(/\n/g, '');

    message.to = '';
    var div = cells[2].firstElementChild.firstElementChild;
    while (div) {
      var contacts = $.extractContacts(div.innerText.replace(/\n/g, ''));

      message.to +=
        '<span class="contact-list" prefix="' + contacts.prefix + '">';
      var items = contacts.items;
      for (i = 0; i < items.length; ++i) {
        message.to +=
          '<a class="contact-name" email ="' + items[i][1] + '">' +
            $.HTMLEncode(items[i][0]) + ((i < items.length - 1) ? ', ' : '') + 
          '</a>';
      }
      message.to += '</span>';

      div = div.nextElementSibling;
    }

    message.body = cleanBody(cells[3], mailURL);
    message.summary = makeMessageSummary(message);

    return message;
  }

  function cleanBody(body, mailURL) {
    return body.html()
      .replace(/font size="?-1"?/g, 'span')
      .replace(/(href="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
      .replace(/(src="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
      .replace(/(href="?)\?/g, '$1' + mailURL + 'h/?');
  }

  function fetch(account, msgID, onSuccess, onError) {
    analytics.gmailFetch('Started');
    var mailURL = getAccountUrl(account);
    var url = getHTMLModeUrl(account) + '?&v=pt&th=' + msgID;

    return $.post({
      url: url,
      onSuccess: function (xhr) {
        var div = $.make('div').html(xhr.responseText);
        var messageTables = div.querySelectorAll('.message');

        if (messageTables) {
          var messages = [];
          for (var i = 0; i < messageTables.length; ++i) {
            messages.push(makeMessage(messageTables[i], mailURL));
          }
          analytics.gmailFetch('Parsed', messages.length);
          onSuccess(messages);
        } else {
          analytics.gmailFetch('ParseFailed');
          onError(arguments);
          console.error('Parse failed');
        }
      },
      onError: function () {
        analytics.gmailFetch('Failed');
        onError(arguments);
      }
    });
  }

  return {
    init: function () {},
    fetch: fetch,
    getInboxUrl: getInboxUrl,
    isGmailUrl: isGmailUrl,
    isAccountUrl: isAccountUrl,
    updateAccountUrl: updateAccountUrl,
    parseFeed: parseFeed,

    archive: doGmailAction.bind(this, 'arch'),
    markAsRead: doGmailAction.bind(this, 'rd'),
    markAsSpam: doGmailAction.bind(this, 'sp'),
    trash: doGmailAction.bind(this, 'tr'),

    reply: doGmailReply,
    send: doGmailSend
  };
}();

gmail.init();
