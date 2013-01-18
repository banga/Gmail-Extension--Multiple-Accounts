(function (global) {
  'use strict';

  function EmailView(email, idx, count) {
    this.email = email;
    email.attachView(this);

    if (email.collapsed === undefined) {
      email.collapsed = (idx < (count - 1));
    }
    this.root = $.make(email.collapsed ? '.email-hidden' : '.email');
    this.render();
  }

  EmailView.MAX_CONTACTS_SHOWN = 10;

  EmailView.prototype.onDetach = function () {
    this.root = null;
  };

  EmailView.prototype.onHeaderClick = function () {
    var email = this.root;
    var emailContents = this.root.lastElementChild;

    this.email.collapsed = !this.email.collapsed;

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
    var fromElem = $.make('span.contact-name', {
      email: this.email.from.email,
      name: this.email.from.name
    }).text(this.email.from.name);

    var toElem = $.make('.email-to');
    this.email.to.each(function (contactList) {
      var items = contactList.items,
          listElem = $.make('span.contact-list', {prefix: contactList.prefix}),
          hiddenListElem = $.make('span', null, {display: 'none'}),
          showCount = Math.min(items.length, EmailView.MAX_CONTACTS_SHOWN);

      items.each(function (item, idx) {
        var contact = $.make('span.contact-name', {
          email: item.email,
          name: item.name
        }).text(item.shortName + (idx < (items.length - 1) ? ', ' : ''));

        if (idx < showCount) {
          listElem.append(contact);
        } else {
          hiddenListElem.append(contact);
        }
      });

      listElem.append(hiddenListElem);
      toElem.append(listElem);

      if (contactList.items.length > EmailView.MAX_CONTACTS_SHOWN) {
        var moreElem = $.make('span.contact-list-more')
          .text('(' + (items.length - showCount) + ' more)')
          .on('click', function () {
            moreElem.style.display = 'none';
            hiddenListElem.style.display = 'inline';
          });
        toElem.append(moreElem);
      }
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

  global.EmailView = EmailView;
}) (window);
