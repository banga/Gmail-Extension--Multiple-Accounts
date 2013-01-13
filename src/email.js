function Email(table, account) {
  'use strict';
  console.assert(table);
  console.assert(account);

  var tb = table.querySelector('tbody'),
      cells = tb.querySelectorAll('td'),
      i;

  var from = $.extractContacts(cells[0].text());
  this.from = {
    name: from.items[0][0],
    email: from.items[0][1]
  };

  this.date = cells[1].innerText.replace(/\n/g, '');

  this.to = [];
  var div = cells[2].firstElementChild.firstElementChild;
  while (div) {
    var contacts = $.extractContacts(div.innerText.replace(/\n/g, ''));
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
  div = $.make('div').html(this.body, account.url);
  this.summary = $.HTMLDecode(div.innerText.trim().substr(0, 100));
}

Email.cleanBody = function (body, mailURL) {
  'use strict';
  return body.html()
    .replace(/font size="?-1"?/g, 'span')
    .replace(/(href="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
    .replace(/(src="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
    .replace(/(href="?)\?/g, '$1' + mailURL + 'h/?');
};

Email.prototype.detachView = function () {
  'use strict';
  if (this.view) {
    this.view.onDetach();
    this.view = null;
  }
};

Email.prototype.attachView = function (view) {
  'use strict';
  this.detachView();
  this.view = view;
};
