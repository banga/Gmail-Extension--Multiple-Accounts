function testAccount(domain, number) {
  'use strict';
  var account = new Account(domain, number)
  document.body.appendChild(account.view.root);
  return account;
}

function testGoogleApps() {
  'use strict';
  return testAccount('a/cs.unc.edu', 0);
}

function testGmail() {
  'use strict';
  return testAccount('mail', 0)
    .subscribe('conversationUpdated', function () {
      console.log.apply(console, arguments);
    });
}

function testContacts() {
  var str = 'To:"Shrey, Banga" <banga@cs.unc.edu>, Shrey Banga <banga.shrey@gmail.com>, "Banga, Shrey" <sb_4getmenot@yahoo.com>, test-123asd@xyz.co.uk';

  console.dir($.extractContacts(str));
}

testContacts();
