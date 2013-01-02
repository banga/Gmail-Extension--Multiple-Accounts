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
    // str is like "To:Shrey Banga <banga.shrey@gmail.com>, Shrey <banga@cs.unc.edu>"
    var items = str.split(':');
    var prefix = items[0];

    items = items[1].split(',');
    contacts = [];
    for (var i = 0; i < items.length; ++i) {
      var pos = items[i].search(/<.*>/);
      contacts.push([items[i].substr(0, pos).trim(),
          items[i].substr(pos).trim()]);
    }
    console.log(str);
    return [prefix, contacts];
  }
  
  return {
    make: make,
    HTMLEncode: HTMLEncode,
    HTMLDecode: HTMLDecode,
    extractContacts: extractContacts
  };
}());
