// Simple API for reading from gmail feeds
var instanceId = 'gmc' + parseInt(Date.now() * Math.random(), 10);
var requestTimeout = 1000 * 2;  // 2 seconds

function gmailNSResolver(prefix) {
  if(prefix == 'gmail') {
    return 'http://purl.org/atom/ns#';
  }
}

function getGmailUrl(account) {
  var url = "https://mail.google.com/";
  if(account && account.domain)
    url += account.domain + '/';
  else
    url += 'mail/';
  return url;
}

function getAccountUrl(account) {
  return getGmailUrl(account) + 'u/' + account.number + '/';
}

function getInboxUrl(account) {
	return getAccountUrl(account) + '#inbox';
}

function getFeedUrl(account) {
  // "zx" is a Gmail query parameter that is expected to contain a random
  // string and may be ignored/stripped.
  return getAccountUrl(account) + "feed/atom?zx=" + encodeURIComponent(instanceId);
}

function isGmailUrl(url) {
  var gmail = getGmailUrl();
  return (url.indexOf(gmail) == 0);
}

function isAccountUrl(account, url) {
  // This is the Gmail we're looking for if:
  // - starts with the correct gmail url
  // - doesn't contain any other path chars
  var gmail = getAccountUrl(account);
  if (url.indexOf(gmail) != 0)
    return false;

  return url.length == gmail.length || url[gmail.length] == '?' ||
    url[gmail.length] == '#';
}

function parseAccountFeed(account, xmlHandler, onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  var abortTimerId = window.setTimeout(function() {
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
    xhr.onreadystatechange = function(){
      if (xhr.readyState != 4)
        return;

      if (xhr.responseXML) {
        var data = xmlHandler(xhr.responseXML);

        if(data) {
          handleSuccess(data);
          return;
        } else {
          console.error(chrome.i18n.getMessage("gmailcheck_node_error"));
        }
      }

      // Authorization required
      if (xhr.status == 401)
        console.error(chrome.i18n.getMessage("gmailcheck_auth_reqd"));

      handleError();
    }

    xhr.onerror = function(error) {
      handleError();
    }

    if(account.user && account.pass)
      xhr.open("GET", getFeedUrl(account), true, account.user, account.pass);
    else
      xhr.open("GET", getFeedUrl(account), true);
    xhr.send(null);
  } catch(e) {
    console.error(chrome.i18n.getMessage("gmailcheck_exception", e));
    handleError();
  }
}

function saveToLocalStorage(domains) {
  var info = {};
  for(var domain in domains) {
    info[domain] = [];
    var accounts = accountInfo[domain];
    for(var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      info[domain][i] = {
        user: account.user,
        pass: account.pass,
        domain: domain,
        number: i
      }
    }
  }

  localStorage.accountInfo = JSON.stringify(info);
}
