/*
 * Object extensions
 */
Object.prototype.each = function (func) {
  'use strict';
  if (this.length) {
    for (var i = 0; i < this.length; ++i) {
      if (func(this[i], i, this[i]) === false)
        break;
    }
  } else {
    for (var attr in this) {
      if (this.hasOwnProperty(attr)) {
        if (func(this[attr], attr, this[attr]) === false)
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
  if (value instanceof Element) {
    this.appendChild(value);
  } else {
    this.innerHTML += value;
  }

  return this;
};

Element.prototype.on = function (type, listener, capture) {
  'use strict';
  if (this.nodeType == 1 && listener instanceof Function) {
    this.addEventListener(type, listener, capture);
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


/*
 * Utility object
 */
var $ = (function (document) {
  'use strict';

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
          elem.setAttribute(attr, str.slice(prev, i));
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
        elem.setAttribute(attr, value);
      });
    }

    if (css) {
      css.each(function (value, prop) {
        elem.style[prop] = value;
      });
    }

    return elem;
  };
  
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
    var items = str.split(':');
    if (items.length > 1) {
      contacts.prefix = items[0];
      items = items[1].split(',');
    } else {
      items = items[0].split(',');
    }

    contacts.items = [];
    for (var i = 0; i < items.length; ++i) {
      var item = items[i];
      var pos = item.search(/<.*>/);
      if (pos === -1) {
        contacts.items.push([item.trim(), item.trim()]);
      } else {
        contacts.items.push([item.substr(0, pos).trim(),
            item.substr(pos).trim()]);
      }
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

  U.saveToLocalStorage = function (accountInfo) {
    var info = {};

    accountInfo.each(function (accounts, domain) {
      info[domain] = [];
      accounts.each(function (account, i) {
        info[domain][i] = {
          user: account.user,
          pass: account.pass,
          domain: domain,
          number: i
        };
      });
    });

    localStorage.accountInfo = JSON.stringify(info);
  };

  var timers = {};

  U.timers = function () {
    return timers;
  };

  U.startTimer = function (label) {
    timers[label] = new Date().getTime();
    return timers[label];
  };

  U.stopTimer = function (label) {
    return new Date().getTime() - timers[label];
  };

  return U;
} (document));

console.dir($);
