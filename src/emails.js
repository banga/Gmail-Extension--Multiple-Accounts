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

  this.view = new EmailView(this);
}

Email.cleanBody = function (body, mailURL) {
  'use strict';
  return body.html()
    .replace(/font size="?-1"?/g, 'span')
    .replace(/(href="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
    .replace(/(src="?)\/mail\/u\/[0-9]+\//g, '$1' + mailURL)
    .replace(/(href="?)\?/g, '$1' + mailURL + 'h/?');
};


function EmailView(email) {
  'use strict';
  this.email = email;
  this.root = $.make('.email');
  this.render();
}

EmailView.prototype.onHeaderClick = function () {
  'use strict';
  var email = this.root;
  var emailContents = this.root.lastElementChild;

  if (this.root.className == 'email') {
    emailContents.style.height = '0px';
    email.className = 'email-hidden';
  } else {
    emailContents.style.height =
      emailContents.firstElementChild.clientHeight + 'px';

    var transitionListener = function () {
      emailContents.removeEventListener('webkitTransitionEnd',
          transitionListener);
      email.className = 'email';
    };
    emailContents.addEventListener('webkitTransitionEnd',
        transitionListener);
  }
};

EmailView.prototype.render = function () {
  'use strict';
  var fromElem = $.make('a.contact-name', {email: this.email.from.email});
  fromElem.textContent = this.email.from.name;

  var toElem = $.make('.email-to');
  this.email.to.each(function (contactList) {
    var listElem = $.make('span.contact-list', {prefix: contactList.prefix});
    contactList.items.each(function (item, idx) {
      var contact = $.make('a.contact-name', {email: item.email});
      contact.textContent = item.name +
        (idx < (contactList.items.length - 1) ? ', ' : '');
      listElem.append(contact);
    });
    toElem.append(listElem);
  });

  this.root.html('');

  this.root
    .append($.make('.email-header')
        .on('click', this.onHeaderClick.bind(this))
        .append($.make('.email-from').append(fromElem))
        .append($.make('.email-summary').html(this.email.summary))
        .append($.make('.email-date', {'title': this.email.date})
          .text($.getHumanDate(this.email.date))))
    .append($.make('.email-contents')
        .append($.make('div')
          .append(toElem)
          .append($.make('.email-body').html(this.email.body))))
    .on('click', function (e) {
      e.cancelBubble = true;
    });
};
