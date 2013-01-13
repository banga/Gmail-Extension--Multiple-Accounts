function EmailView(email) {
  'use strict';
  this.email = email;
  email.attachView(this);

  this.root = $.make('.email');
  this.render();
}

EmailView.prototype.onDetach = function () {
};

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
