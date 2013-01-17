(function (global) {
  'use strict';

  function Email(table, account) {
    log.assert(table);
    log.assert(account);

    var tb = table.querySelector('tbody'),
        cells = tb.querySelectorAll('td'),
        i;

    var from = Email.extractContacts(cells[0].text());
    this.from = {
      name: from.items[0][0],
      email: from.items[0][1]
    };

    this.date = cells[1].innerText.replace(/\n/g, '');

    this.to = [];
    var div = cells[2].firstElementChild.firstElementChild;
    while (div) {
      var contacts = Email.extractContacts(div.innerText.replace(/\n/g, ''));
      var contactList = {
        prefix: contacts.prefix,
        items: []
      };
      var items = contacts.items;
      for (i = 0; i < items.length; ++i) {
        contactList.items.push({
          name: items[i][0],
          email: items[i][1]
        });
      }
      this.to.push(contactList);
      div = div.nextElementSibling;
    }

    this.body = Email.cleanBody(cells[3], account.url);
    div = $.make('div').html(this.body);
    this.summary = div.innerText.replace(/\s+/g, ' ').replace(/^\s+/g, '')
      .substr(0, 200);

    log.info('Email created: "' + this.summary.substr(0, 50) + '"');
  }

  Email.extractContacts = function (str) {
    // "To:Shrey Banga <banga.shrey@gmail.com>, Shrey <banga@cs.unc.edu>"
    var contacts = {};
    var match = /([^:]*):(.*)/.exec(str);
    if (match) {
      contacts.prefix = match[1];
      str = match[2];
    }

    var reContact = /([^<>]*)(<[^>]*>)?/;
    var items = str.split(',');
    for (var i = 0; i < items.length; ++i) {
      match = reContact.exec(items[i]);
      var name = match[1].trim();
      items[i] = [ name, match[2] || name ];
    }

    contacts.items = items;
    return contacts;
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
