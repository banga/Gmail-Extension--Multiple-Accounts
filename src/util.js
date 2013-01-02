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
      var pos = items[i].search(/<.*>/);
      contacts.items.push(
          [items[i].substr(0, pos).trim(), items[i].substr(pos).trim()]);
    }
    return contacts;
  }
  
  return {
    make: make,
    HTMLEncode: HTMLEncode,
    HTMLDecode: HTMLDecode,
    extractContacts: extractContacts
  };
}());
