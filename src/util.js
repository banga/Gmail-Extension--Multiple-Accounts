var U = (function() {
  function make(type, attrs, css) {
    var elem = document.createElement(type);
    for (k in attrs) {
      elem.setAttribute(k, attrs[k]);
    }
    for (prop in css) {
      elem.style[prop] = css[prop];
    }
    return elem;
  }
  
  function HTMLEncode(str) {
    var div = make('div');
    div.innerText = str;
    return div.innerHTML;
  }
  
  function HTMLDecode(str) {
    var div = make('div');
    div.innerHTML = str;
    return div.innerText;
  }

  function extractContacts(str) {
    // "To:Shrey Banga <banga.shrey@gmail.com>, Shrey <banga@cs.unc.edu>"
    var contacts = {};
    var items = str.split(':');
    if (items.length > 1) {
      contacts['prefix'] = items[0];
      items = items[1].split(',');
    } else {
      items = items[0].split(',');
    }

    contacts.items = [];
    for (var i = 0; i < items.length; ++i) {
      var item = items[i];
      var pos = item.search(/<.*>/);
      if (pos == -1) {
        contacts.items.push([item.trim(), item.trim()]);
      } else {
        contacts.items.push([item.substr(0, pos).trim(),
            item.substr(pos).trim()]);
      }
    }


    console.log(str);
    console.dir(contacts);
    return contacts;
  }

  function getHumanDate(date) {
    if (!(date instanceof Date)) {
      date = date.replace(/(,|at)/g, '');
      date = new Date(date);
      if (isNaN(date))
        return date;
    }

    var delta = new Date() - date;
    var tense = ' ago';
    if (delta < 0) {
      delta = -delta;
      tense = ' later';
    }
      
    var units = ['second', 'minute', 'hour', 'day', 'week'];
    var sizes = [1000, 60, 60, 24, 7];

    for (var i = 0; i < units.length; ++i) {
      delta = Math.floor(delta / sizes[i]);
      if (delta < sizes[i]) {
        return delta + ' ' + units[i] + (delta > 1 ? 's' : '') + tense;
      }
    }

    return date;
  }
  
  return {
    make: make,
    HTMLEncode: HTMLEncode,
    HTMLDecode: HTMLDecode,
    extractContacts: extractContacts,
    getHumanDate: getHumanDate
  };
}());
