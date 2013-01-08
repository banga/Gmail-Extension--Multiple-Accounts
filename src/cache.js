/*global cache:true */
var cache = function () {
  'use strict';

  var cache = {}, loads = 0, hits = 0, misses = 0;

  function _getMessageID(link) {
    var msgID = link.match(/message_id=([\w]*)/);
    if (msgID && msgID.length >= 2)
      return msgID[1];
    return null;
  }

  function _updateEmailMessages(account, msgID, onSuccess, onError) {
    var cachedEmails = cache[account.name].emails;

    analytics.cacheUpdate(gmail.getInboxUrl(account));

    return gmail.fetch(account, msgID,
      function (messages) {
        cachedEmails[msgID].messages = messages; 
        if (onSuccess) {
          onSuccess(messages);
        }
      },
      function () {
        console.error('Failure updating message ' + msgID);
        if (onError)
          onError();
      }
    );
  }

  function getNodeValue(root, selector, alt) {
    try {
      return root.querySelector(selector).textContent;
    } catch (e) {
      return alt;
    }
  }

  function loadEmails(account, onSuccess, onError) {
    function parseInboxData(xmlDoc) {
      var fullCountNode = xmlDoc.querySelector('fullcount');

      if (fullCountNode) {
        // TODO: Update account's url

        var titleNode = xmlDoc.querySelector('title');

        if (titleNode) {
          var name = titleNode.textContent;
          var nameHdr = 'Gmail - Inbox for ';
          name = name.substr(nameHdr.length);
          account.name = name;

          if (!(name in cache)) {
            cache[name] = { 'emails': {} };
          }
          cache[name].name = name;
          cache[name].unreadCount = fullCountNode.textContent;

          var entryNodes = xmlDoc.querySelectorAll('entry');
          var cachedEmails = cache[name].emails;
          var newEmails = {};

          entryNodes.each(function (entryNode) {
            var newEmail = {
              modified: getNodeValue(entryNode, 'modified', ''),
              subject: getNodeValue(entryNode, 'title', ''),
              summary: getNodeValue(entryNode, 'summary', ''),
              author: getNodeValue(entryNode, 'author name', '')
            };

            var link = entryNode.querySelector('link');
            newEmail.link = (link ? link.getAttribute('href') : '');
            var id = _getMessageID(newEmail.link);

            newEmails[id] = newEmail;
          });

          // Update existing cached emails
          cachedEmails.each(function (cachedEmail, id) {
            if (id in newEmails) {
              if (cachedEmail.modified != newEmails[id].modified) {
                console.log('Email "' + newEmails[id].subject + '" changed');
                cachedEmails[id] = newEmails[id];
                _updateEmailMessages(account, id);
              }
            } else {
              delete cachedEmails[id];
            }
          });

          // Add any new emails
          newEmails.each(function (newEmail, id) {
            if (!(id in cachedEmails)) {
              cachedEmails[id] = newEmail;
              _updateEmailMessages(account, id);
            }
          });

          return cache[name];
        }
      }
      return null;
    }

    gmail.parseFeed(account, parseInboxData, onSuccess, onError);
    ++loads;
    analytics.cacheLoad();
  }

  function getEmailMessages(account, msgID, onSuccess, onError) {
    if (!(account.name in cache)) {
      console.log('Account ' + account.name + ' not found in cache. Loading');
      ++misses;
      loadEmails(account,
          getEmailMessages.bind(null, account, msgID, onSuccess, onError),
          onError);
      return;
    }

    var emails = cache[account.name].emails;

    if (msgID in emails && 'messages' in emails[msgID]) {
      console.log('Found email messages in cache. Calling ' + 
          onSuccess.name + ' with ' + account.name);
      ++hits;
      analytics.cacheHit();
      onSuccess(emails[msgID].messages);
      return null;
    } else {
      console.log('Messages for ' + msgID + ' not found in cache. Updating'); 
      analytics.cacheMiss();
      return _updateEmailMessages(account, msgID, onSuccess, onError);
    }
  }

  return {
    init: function () {},
    loadEmails: loadEmails,
    getEmailMessages: getEmailMessages,
    cache: function () {
      return cache;
    },
    clear: function () {
      cache = {};
    },
    stats: function () {
      return {
        hits: hits,
        misses: misses,
        loads: loads
      };
    }
  };
} ();

cache.init();
