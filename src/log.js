/*global console:true doesnotexist:true*/
(function (global) {
  'use strict';

  function Log(session) {
    this.session = session;
    this.info('Started ' + session);
  }

  Log.prototype.info = function () {
    var msg = '';
    for (var i = 0; i < arguments.length; ++i) {
      msg += arguments[i] + ' ';
    }
    this._write(msg);
  };

  var getStackTrace = function () {
    try {
      doesnotexist.a = 2;
    } catch (e) {
      return e.stack.split('\n').slice(2).join('\n');
    }
  };

  Log.prototype.trace = function () {
    this._write(getStackTrace());
  };

  Log.prototype.error = function (msg) {
    this._write('Error: ' + msg + '\n' + getStackTrace());
  };

  Log.prototype.assert = function (condition, msg) {
    if (!condition) {
      this.error('(Assertion failed) ' + msg);
    }
  };

  if (chrome.runtime.id === 'kdcblpjgmdimneclgllpmhlibdlbecpi') {
    Log.prototype._write = function (msg) {
      var prefix = '[' + this.session + '][' +
        new Date().toLocaleTimeString() + '] ';
      msg = prefix + msg;

      console.log(msg);

      var payload = new FormData();
      payload.append('msg', msg);

      $.post({
        url: 'http://localhost:8080/',
        payload: payload
      });
    };
  } else {
    Log.prototype._write = function () { /* crickets */ };
  }

  global.Log = Log;
}) (window);
