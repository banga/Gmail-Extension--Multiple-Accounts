/*
 * Object extensions
 */
Object.prototype.each = function (func, thisObj) {
  'use strict';
  thisObj = thisObj || this;
  if ('length' in this) {
    for (var i = 0; i < this.length; ++i) {
      if (func.call(thisObj, this[i], i, this[i]) === false)
        break;
    }
  } else {
    for (var attr in this) {
      if (this.hasOwnProperty(attr)) {
        if (func.call(thisObj, this[attr], attr, this[attr]) === false)
          break;
      }
    }
  }
  return this;
};


/*
 * DOM element extensions
 */
/*global Element:true*/
Element.prototype.append = function (value) {
  'use strict';
  if (typeof value == 'string') {
    this.innerHTML += value;
  } else {
    this.appendChild(value);
  }

  return this;
};

Element.prototype.on = function (type, listener, capture) {
  'use strict';
  if (this.nodeType == 1) {
    this.addEventListener(type, listener, capture);
  } else {
    console.warn('Not adding listener to ', this, this.nodeType);
  }
  return this;
};

Element.prototype.html = function (str) {
  'use strict';

  if (str === undefined)
    return this.innerHTML;

  if (this.nodeType == 1)
    this.innerHTML = str;

  return this;
};

Element.prototype.text = function (str) {
  'use strict';

  if (str === undefined)
    return this.innerText;

  if (this.nodeType == 1)
    this.innerText = str;

  return this;
};

Element.prototype.attr = function (name, value) {
  'use strict';

  if (value === undefined)
    return this.getAttribute(name);

  this.setAttribute(name, value);

  return this;
};

/*
 * Utility object
 */
var $ = (function (document) {
  'use strict';

  /********************
   * DOM manipulation *
   ********************/
  var U = function (id, context) {
    context = context || document;
    return context.getElementById(id);
  };

  /* Make an element from a css style string */
  function _make(str) {
    str = str + '#';
    var prev = 0, attr, elem, i = 0;

    for (; i < str.length; ++i) {
      if (/#|\./.test(str[i])) {
        if (attr) {
          if (attr == 'class') {
            elem.classList.add(str.slice(prev, i)); 
          } else {
            elem.attr(attr, str.slice(prev, i));
          }
        } else {
          elem = document.createElement(i === 0 ?
            'div' : str.slice(prev, i));
        }
        attr = ((str[i] == '#') ? 'id' : 'class');
        prev = i + 1;
      }
    }
    return elem;
  }

  U.make = function (str, attrs, css) {
    var elem = _make(str);

    if (attrs) {
      attrs.each(function (value, attr) {
        elem.attr(attr, value);
      });
    }

    if (css) {
      css.each(function (value, prop) {
        elem.style[prop] = value;
      });
    }

    return elem;
  };
  
  /***********
   * Parsing *
   ***********/
  U.HTMLEncode = function (str) {
    var div = this.make('div');
    div.innerText = str;
    return div.innerHTML;
  };
  
  U.HTMLDecode = function (str) {
    var div = this.make('div');
    div.innerHTML = str;
    return div.innerText;
  };

  U.extractContacts = function (str) {
    // "To:Shrey Banga <banga.shrey@gmail.com>, Shrey <banga@cs.unc.edu>"
    var contacts = {};
    var match = /([^:]*):(.*)/.exec(str);
    if (match) {
      contacts.prefix = match[1];
      str = match[2];
    }

    var reContact = /([^<>]*)(<[^>]*>)?,?/g;
    contacts.items = [];
    match = reContact.exec(str);
    while (match.index < str.length) {
      contacts.items.push([
          match[1].trim(),
          match[2] || match[1].trim()
        ]);
      match = reContact.exec(str);
    }

    return contacts;
  };

  U.getHumanDate = function (date) {
    if (!(date instanceof Date)) {
      date = date.replace(/(,|at)/g, '');
      date = new Date(date);
      if (isNaN(date)) {
        return date;
      }
    }

    var delta = new Date() - date;
    var tense = ' ago';
    if (delta < 0) {
      delta = -delta;
      tense = ' later';
    }
      
    var units = ['second', 'minute', 'hour', 'day', 'week'];
    var sizes = [1000, 60, 60, 24, 7, 4];

    for (var i = 0; i < units.length; ++i) {
      delta = Math.floor(delta / sizes[i]);
      if (delta < sizes[i + 1]) {
        return delta + ' ' + units[i] + (delta > 1 ? 's' : '') + tense;
      }
    }

    return date.toLocaleDateString();
  };

  /**********
   * TIMERS *
   **********/
  var timers = {};

  U.timers = function () {
    return timers;
  };

  U.startTimer = function (label) {
    timers[label] = new Date().getTime();
    return timers[label];
  };

  U.stopTimer = function (label) {
    if (label in timers) {
      var startTime = timers[label];
      delete timers[label];
      return new Date().getTime() - startTime;
    }
    return 0;
  };

  /********
   * AJAX *
   *******/
  U.ajax = function (args) {
    var xhr;

    try {
      xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
          if (this.status == 200) {
            if (args.onSuccess) {
              args.onSuccess(this);
            }
          } else {
            if (args.onError) {
              args.onError(this);
            }
          }
        }
      };

      xhr.onerror = function (e) {
        console.error(e);
        if (args.onError)
          args.onError(this, e);
      };
      
      xhr.open(args.method || 'GET', args.url, true);

      if (args.headers) {
        args.headers.each(function (header, key) {
          xhr.setRequestHeader(key, header);
        });
      }

      xhr.send(args.payload);
    } catch (e) {
      console.error(e);
      if (args.onError)
        args.onError();
    }

    return xhr;
  };

  U.get = U.ajax; 

  U.post = function (args) {
    args.method = 'POST';
    return U.ajax(args);
  };


  /*****************
   * Event pub-sub *
   ****************/
  U.addEventHandling = function (cls, eventNames) {
    function makeStorageIfNeeded(obj) {
      if (!obj._listeners) {
        obj._listeners = {};
        eventNames.each(function (name) {
          obj._listeners[name] = [];
        });
      }
    }

    cls.prototype.publish = function (eventName, args) {
      makeStorageIfNeeded(this);
      this._listeners[eventName].each(function (listener) {
        listener.callback.call(listener.subscriber, args);
      });
    };

    cls.prototype.subscribe = function (eventName, callback, subscriber) {
      subscriber = subscriber || null;

      makeStorageIfNeeded(this);
      this._listeners[eventName].push({
        callback: callback,
        subscriber: subscriber
      });
      return this;
    };

    cls.prototype.unsubscribe = function (args) {
      // args - subscriber, callback, eventName
      if (args.eventName) {
        var listeners = this._listeners[args.eventName];
        for (var idx = 0; idx < listeners.length; ++idx) {
          var listener = listeners[idx];
          if ((listener.subscriber === args.subscriber) ||
              listener.callback === args.callback)
            break;
        }

        if (idx == listeners.length)
          return;

        return listeners.splice(idx, 1);
      } else {
        var that = this;
        eventNames.each(function (eventName) {
          args.eventName = eventName;
          that.unsubscribe(args);
        });
      }
    };
  };

  return U;
} (document));

console.dir($);
