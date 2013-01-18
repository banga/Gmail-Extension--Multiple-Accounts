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

  Log.getStackTrace = function () {
    try {
      doesnotexist.a = 2;
    } catch (e) {
      return e.stack.split('\n').slice(2).join('\n');
    }
  };

  Log.prototype.trace = function () {
    this._write(Log.getStackTrace());
  };

  Log.prototype.error = function (msg) {
    this._write('Error: ' + msg + '\n' + Log.getStackTrace());
  };

  Log.prototype.assert = function (condition, msg) {
    if (!condition) {
      this.error('(Assertion failed) ' + msg);
    }
  };

  Log.indent = function (str) {
    return str.replace(/\n$/, '').replace(/^/mg, '  ');
  };

  Log.examine = function (obj, level) {
    if (typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return '"' + obj + '"\n';
      }
      return obj.toString() + '\n';
    }

    var str = obj.constructor.name + '\n'; 
    level = level || 0;

    var contents = '';
    if (level <= 4) {
      obj.each(function (value, key) {
        contents += key + ': ' + Log.examine(value, level + 1);
      });
    }
    if (contents.length)
      str += Log.indent(contents) + '\n';
    return str;
  };

  Log.prototype.dir = function (obj) {
    console.dir(obj);
    this._write(Log.examine(obj));
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
