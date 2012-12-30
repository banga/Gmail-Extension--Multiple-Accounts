var Cache = (function() {
  var cache = {};

  function _getMessageID(link) {
    var msgID = link.match(/message_id=([\w]*)/);
    if(msgID && msgID.length >= 2)
      return msgID[1];
    return null;
  }

  function _updateEmailMessages(account, msgID, onSuccess, onError) {
    var cachedEmails = cache[account.name].emails;

    return fetchEmailMessages(account, msgID,
      function(messages) {
        cachedEmails[msgID].messages = messages; 

        if (onSuccess) {
          console.log('Success in cache. Calling ' + onSuccess.name
            + ' with ' + account.name + ': ');
          onSuccess(messages);
        }
      },
      function() {
        console.warn("Failure updating message " + msgID);
        if (onError)
          onError();
      }
    );
  }

  function loadEmails(account, onSuccess, onError) {
    console.log("Load Emails");
    console.dir(account);

    function parseInboxData(xmlDoc) {
      var fullCountSet = xmlDoc.evaluate("/gmail:feed/gmail:fullcount",
        xmlDoc, gmailNSResolver, XPathResult.ANY_TYPE, null);
      var fullCountNode = fullCountSet.iterateNext();

      if (fullCountNode) {
        var titleSet = xmlDoc.evaluate("/gmail:feed/gmail:title",
          xmlDoc, gmailNSResolver, XPathResult.ANY_TYPE, null);
        var titleNode = titleSet.iterateNext();

        if(titleNode) {
          var name = titleNode.textContent;
          var nameHdr = "Gmail - Inbox for ";
          name = name.substr(nameHdr.length);

          var entries = [];
          var entrySet = xmlDoc.evaluate("/gmail:feed/gmail:entry",
            xmlDoc, gmailNSResolver, XPathResult.ANY_TYPE, null);
          var entryNode = entrySet.iterateNext();

          account.name = name;

          if (!(name in cache)) {
            cache[name] = { 'emails': {} };
          }

          cache[name].name = name;
          cache[name].unreadCount = fullCountNode.textContent;

          var cachedEmails = cache[name].emails;
          var newEmails = {};

          while(entryNode) {
            var modified =
              entryNode.getElementsByTagName("modified")[0].textContent;
            var subject = 
              entryNode.getElementsByTagName("title")[0].textContent;
            var summary = 
              entryNode.getElementsByTagName("summary")[0].textContent;
            var author = 
              entryNode.getElementsByTagName("author")[0]
              .getElementsByTagName("name")[0].textContent;
            var link =
              entryNode.getElementsByTagName("link")[0].getAttribute("href");
            var id = _getMessageID(link);

            var email =
              {
                "modified": new Date(modified),
                "subject": subject,
                "summary": summary,
                "author": author,
                "link": link,
                "id": id,
              };

            newEmails[id] = email;

            entryNode = entrySet.iterateNext();
          }

          // Update existing cached emails
          for (id in cachedEmails) {
            if (id in newEmails) {
              if (cachedEmails[id].modified != newEmails[id].modified) {
                console.log('Email "' + subject + '" changed');
                cachedEmails[id] = newEmails[id];
                _updateEmailMessages(account, id);
              }
            } else {
              delete cachedEmails[id];
            }
          }

          // Add any new emails
          for (id in newEmails) {
            if (!(id in cachedEmails)) {
              cachedEmails[id] = newEmails[id];
              _updateEmailMessages(account, id);
            }
          }

          return cache[name];
        }
      }
      return null;
    }

    parseAccountFeed(account, parseInboxData, onSuccess, onError);
  }

  function getEmailMessages(account, msgID, onSuccess, onError) {
    if (!msgID in cache[account.name].emails) {
      return _updateEmailMessages(accout, msgID, onSuccess, onError);
    } else {
      console.log('Found message in cache. Calling ' + onSuccess.name
          + ' with ' + account.name + ': ');
      onSuccess(cache[account.name].emails[msgID].messages);
      return null;
    }
  }

  return {
    loadEmails: loadEmails,
    getEmailMessages: getEmailMessages,
    _cache: cache
  }
}) ();

console.dir(Cache);
