(function (global) {
  'use strict';

  function Email(table, account) {
    log.assert(table);
    log.assert(account);

    var tb = table.querySelector('tbody'),
        cells = tb.querySelectorAll('td');

    this.from = Email.extractContact(cells[0].text());
    this.date = cells[1].innerText.replace(/\n/g, '');

    this.to = [];
    var div = cells[2].firstElementChild.firstElementChild;
    while (div) {
      this.to.push(Email.extractContacts(div.innerText.replace(/\n/g, '')));
      div = div.nextElementSibling;
    }

    this.body = Email.cleanBody(cells[3], account.url);
    div = $.make('div').html(this.body);
    this.summary = div.innerText.replace(/\s+/g, ' ').replace(/^\s+/g, '')
      .substr(0, 200);

    log.info('Email created: "' + this.summary.substr(0, 50) + '"');
  }

  Email.extractContact = function (str) {
    str = str.trim();
    var r1 = /((?:^"[^"]*")|(?:^[^<>]*))/,
        match = r1.exec(str),
        item = { };
    item.name = match[1].trim().replace(/^"|"$/g, '');
    item.shortName = Email.extractShortName(item.name);
    item.email = str.substr(match[1].length + 1) || item.name;
    item.email = item.email.replace(/^<|>$/g, '');
    return item;
  };

  Email.extractContacts = function (str) {
    var contacts = { prefix: '', items: [] }, idx = str.indexOf(':');
    if (idx >= 0) {
      contacts.prefix = str.substr(0, idx);
      str = str.substr(idx + 1);
    }

    var prev = 0, inQuotes = false, count = 0, items = [];
    str += ',';
    for (var i = 0; i < str.length; ++i) {
      if (str[i] === '"') {
        inQuotes = !inQuotes;
      } else if (str[i] === ',' && !inQuotes) {
        items[count++] = Email.extractContact(str.slice(prev, i));
        prev = i + 1;
      }
    }
    contacts.items = items;
    return contacts;
  };

  Email.extractShortName = function (name) {
    return name.substr(name.indexOf(',') + 1).trim().split(' ')[0];
  };

  Email.cleanBody = function (body, mailURL) {
    return body.html()
      .replace(/font size="?-1"?/g, 'span')
      .replace(/(href="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
      .replace(/(src="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
      .replace(/(href="?)\?/g, '$1' + mailURL + 'h/?');
  };

  Email.prototype.detachView = function () {
    if (this.view) {
      this.view.onDetach();
      this.view = null;
    }
  };

  Email.prototype.attachView = function (view) {
    this.detachView();
    this.view = view;
  };

  global.Email = Email;
}) (window);
