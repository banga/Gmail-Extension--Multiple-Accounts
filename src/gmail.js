// Simple API for reading from gmail feeds
var gmail = function () {
  'use strict';

  var instanceId = 'gmc' + parseInt(Date.now() * Math.random(), 10);
  var requestTimeout = 1000 * 2;  // 2 seconds

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
    var xhr = new XMLHttpRequest();
    var abortTimerId = window.setTimeout(function () {
      xhr.abort();  // synchronously calls onreadystatechange
    }, requestTimeout);

    function handleSuccess(data) {
      account.requestFailureCount = 0;
      window.clearTimeout(abortTimerId);
      if (onSuccess)
        onSuccess(account, data);
    }

    var invokedErrorCallback = false;
    function handleError() {
      ++account.requestFailureCount;
      window.clearTimeout(abortTimerId);
      if (onError && !invokedErrorCallback)
        onError(account);
      invokedErrorCallback = true;
    }

    try {
      xhr.onreadystatechange = function () {
        if (xhr.readyState != 4)
          return;

        if (xhr.responseXML) {
          var data = xmlHandler(xhr.responseXML);

          if (data) {
            handleSuccess(data);
            return;
          } else {
            console.error('Empty XHR response');
          }
        }

        // Authorization required
        if (xhr.status == 401)
          console.error('Authorization required');

        handleError();
      };

      xhr.onerror = function () {
        handleError();
      };

      if (account.user && account.pass) {
        xhr.open('GET', getFeedUrl(account), true,
            account.user, account.pass);
      } else {
        xhr.open('GET', getFeedUrl(account), true);
      }
      xhr.send(null);
    } catch (e) {
      console.error(e);
      handleError();
    }
  }

  function getAccountAt(account, onSuccess) {
    var url = getHTMLModeUrl(account);// + '?ui=html&zy=c';
    console.log('getAccountAt: ' + url);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        var m = this.responseText.match(/\at=([^"]+)/);
        if (m && m.length > 0) {
          account.at = m[1];
          onSuccess();
        }
      }
    };
    xhr.onerror = function (error) {
      console.error('getAccountAt error: ' + error);
    };
    xhr.open('GET', url, true);
    xhr.send(null);
  }

  function doAjaxRequest(url, onSuccess, onError, params, headers) {
    var xhr;

    try {
      xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
          if (this.status == 200) {
            if (onSuccess) {
              onSuccess(this.responseText, this);
            }
          } else if (this.status == 401) {
            console.error('Authentication required');
          } else {
            console.error('doAjaxRequest: response ' + this.status);
            console.log(url);
            console.log(onSuccess.name);
            if (onError)
              onError();
          }
        }
      };

      xhr.onerror = function (e) {
        console.error('doAjaxRequest: ' + e);
        if (onError)
          onError();
      };
      
      xhr.open('POST', url, true);

      if (headers) {
        headers.each(function (header, key) {
          xhr.setRequestHeader(key, header);
        });
      }

      xhr.send(params);
    } catch (e) {
      console.error('doAjaxRequest exception: ' + e);
      if (onError)
        onError();
    }

    return xhr;
  }

  function updateAccountUrl(account, onFinish) {
    account.url = getGmailUrl(account) + 'u/' + account.number + '/';
    console.log('Updating url for ' + account.url);
    var xhr = doAjaxRequest(account.url, function () {
      var doc = $.make('document').html(xhr.response);
      var meta = doc.querySelector('meta[name="application-url"]');
      if (meta) {
        account.url = meta.getAttribute('content') + '/';
        console.log('url changed to ' + account.url);
      }
      onFinish();
    }, function () {
      onFinish();
    });
  }

  function doGmailAction(action, account, msgID, onSuccess, onError) {
    if (!account.at) {
      getAccountAt(account, function () {
        doGmailAction(action, account, msgID, onSuccess, onError);
      });
      return;
    }

    var url = getHTMLModeUrl(account);
    var params = 't=' + msgID + '&at=' + account.at + '&act=' + action;

    return doAjaxRequest(url, onSuccess, onError, params,
        {'Content-type': 'application/x-www-form-urlencoded'});
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

    return doAjaxRequest(url, onSuccess, onError, params);
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
    
    return doAjaxRequest(url, onSuccess, onError, params);
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

    return doAjaxRequest(url, function (responseText) {
      var div = $.make('div').html(responseText);
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
    }, function () {
      analytics.gmailFetch('Failed');
      onError(arguments);
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
