/*global cache:true */
var cache = function () {
  'use strict';

  var cache_ = {}, loads = 0, hits = 0, misses = 0;

  function _getMessageID(link) {
    var msgID = link.match(/message_id=([\w]*)/);
    if (msgID && msgID.length >= 2)
      return msgID[1];
    return null;
  }

  function _updateEmailMessages(account, msgID, onSuccess, onError) {
    var cachedEmails = cache_[account.name].emails;

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

  function loadEmails(account, onSuccess, onError) {
    function parseInboxData(xmlDoc) {
      var fullCountSet = xmlDoc.evaluate('/gmail:feed/gmail:fullcount',
        xmlDoc, gmail.NSResolver, XPathResult.ANY_TYPE, null);
      var fullCountNode = fullCountSet.iterateNext();

      if (fullCountNode) {
        var titleSet = xmlDoc.evaluate('/gmail:feed/gmail:title',
          xmlDoc, gmail.NSResolver, XPathResult.ANY_TYPE, null);
        var titleNode = titleSet.iterateNext();

        if (titleNode) {
          var name = titleNode.textContent;
          var nameHdr = 'Gmail - Inbox for ';
          name = name.substr(nameHdr.length);

          var entrySet = xmlDoc.evaluate('/gmail:feed/gmail:entry',
            xmlDoc, gmail.NSResolver, XPathResult.ANY_TYPE, null);
          var entryNode = entrySet.iterateNext();

          account.name = name;

          if (!(name in cache_)) {
            cache_[name] = { 'emails': {} };
          }

          cache_[name].name = name;
          cache_[name].unreadCount = fullCountNode.textContent;

          var cachedEmails = cache_[name].emails;
          var newEmails = {};

          while (entryNode) {
            var modified =
              entryNode.getElementsByTagName('modified')[0].textContent;
            var subject = 
              entryNode.getElementsByTagName('title')[0].textContent;
            var summary = 
              entryNode.getElementsByTagName('summary')[0].textContent;
            var author = 
              entryNode.getElementsByTagName('author')[0]
              .getElementsByTagName('name')[0].textContent;
            var link =
              entryNode.getElementsByTagName('link')[0].getAttribute('href');
            var id = _getMessageID(link);

            newEmails[id] = {
                'modified': modified,
                'subject': subject,
                'summary': summary,
                'author': author,
                'link': link,
                'id': id
              };

            entryNode = entrySet.iterateNext();
          }

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

          return cache_[name];
        }
      }
      return null;
    }

    gmail.parseFeed(account, parseInboxData, onSuccess, onError);
    ++loads;
  }

  function getEmailMessages(account, msgID, onSuccess, onError) {
    if (!(account.name in cache_)) {
      console.log('Account ' + account.name + ' not found in cache. Loading');
      ++misses;
      loadEmails(account,
          getEmailMessages.bind(account, msgID, onSuccess, onError),
          onError);
      return;
    }

    if (!(msgID in cache_[account.name].emails)) {
      console.log('Message ' + msgID + ' not found in cache_. Updating'); 
      ++misses;
      return _updateEmailMessages(account, msgID, onSuccess, onError);
    } else {
      console.log('Found message in cache_. Calling ' + 
          onSuccess.name + ' with ' + account.name + ': ');
      ++hits;
      onSuccess(cache_[account.name].emails[msgID].messages);
      return null;
    }
  }

  return {
    init: function () {},
    loadEmails: loadEmails,
    getEmailMessages: getEmailMessages,
    cache: function () {
      return cache_;
    },
    clear: function () {
      cache_ = {};
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
