/*global console:true doesnotexist:true*/
(function (global) {
  'use strict';

  function Log(session, minPriority) {
    this.session = session;
    this.minPriority = minPriority || Log.PRIORITY_LOW;
    this.info('Started ' + session);
  }

  Log.PRIORITY_LOW = 0;
  Log.PRIORITY_MEDIUM = 1;
  Log.PRIORITY_HIGH = 2;

  function argsToString(args) {
    var msg = '';
    for (var i = 0; i < args.length; ++i) {
      msg += args[i] + ' ';
    }
    return msg;
  }

  Log.prototype.info = function () {
    this._write(argsToString(arguments), Log.PRIORITY_LOW);
  };

  Log.getStackTrace = function () {
    try {
      doesnotexist.a = 2;
    } catch (e) {
      return e.stack.split('\n').slice(2).join('\n');
    }
  };

  Log.prototype.trace = function () {
    this._write(Log.getStackTrace(), Log.PRIORITY_LOW);
  };

  Log.prototype.warn = function () {
    this._write('Warning: ' + argsToString(arguments), Log.PRIORITY_MEDIUM);
  };

  Log.prototype.error = function () {
    this._write('Error: ' + argsToString(arguments) + '\n' +
        Log.getStackTrace(), Log.PRIORITY_HIGH);
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
    if (obj === null) return 'null\n';
    if (obj === undefined) return 'undefined\n';

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
    this._write(Log.examine(obj), Log.PRIORITY_LOW);
  };

  if (chrome.runtime.id === 'kdcblpjgmdimneclgllpmhlibdlbecpi') {
    var console_fns = [console.info, console.warn, console.error];

    var logToServer = function (msg, priority) {
      try {
        var xhr = new XMLHttpRequest(),
            payload = new FormData();
        payload.append('msg', msg);
        payload.append('priority', priority);

        xhr.open('POST', 'http://localhost:8080/', false);
        xhr.send(payload);
      } catch (e) {
      }
    };

    Log.prototype._write = function (msg, priority) {
      var prefix = '[' + this.session + '][' +
        new Date().toLocaleTimeString() + '] ';
      msg = prefix + msg;

      if (priority >= this.minPriority) {
        console_fns[priority].call(console, msg);
      }

      logToServer(msg, priority);
    };
  } else {
    Log.prototype._write = function () { /* crickets */ };
  }

  global.Log = Log;
}) (window);
