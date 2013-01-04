(function () {
  'use strict';

  var domainNameTextbox;
  var domainList;
  var saveButton;
  var accountInfo = {mail: [{number: 0, domain: 'mail'}]};
  var credentialList; 

  init();

  function addDomain(domain) {
    if (!domain) {
      domain = domainNameTextbox.value;
      domainNameTextbox.value = '';
    }

    // Check for collisions
    if ($('domain-list-item-' + domain))
      return;

    if (!accountInfo[domain])
      accountInfo[domain] = [{number: 0, domain: domain}];

    var domainItem = $.make('div', {
      'class': 'domain-list-item',
      'id': 'domain-list-item-' + domain
    }).html('https://mail.google.com/<b>' + domain + '</b>' +
      '<button>Remove</button>');
    domainItem.getElementsByTagName('button')[0].on('click',
        removeDomain.bind(window, domain));
    domainList.appendChild(domainItem);

    updateDomainCredentialInputs(domain);

    markDirty();
  }

  function removeDomain(domain) {
    delete accountInfo[domain];
    domainList.removeChild($('domain-list-item-' + domain));
    credentialList.removeChild($('credential-input-' + domain));
    markDirty();
  }

  function updateNumAccounts(domain) {
    markDirty();

    var numAccountsTextbox = $('num-accounts-' + domain);
    var numAccounts = parseInt(numAccountsTextbox.value, 10);

    var accounts = accountInfo[domain];
    for (var i = accounts.length; i < numAccounts; i++) {
      accounts[i] = {number: i, domain: domain};
    }
    accounts.length = numAccounts;

    updateDomainCredentialInputs(domain);
  }

  function saveAll() {
    accountInfo.each(saveDomainCredentialInputs);
    $.saveToLocalStorage(accountInfo);
  }

  function saveDomainCredentialInputs(accounts, domain) {
    var numAccounts = $('num-accounts-' + domain).value;
    for (var i = 0; i < numAccounts; i++) {
      accounts[i] = {
        user: $('user-' + domain + i).value,
        pass: $('pass-' + domain + i).value,
        number: i,
        domain: domain
      };
    }
    accounts.length = numAccounts;
  }

  function updateAll() {
    domainList.innerHTML = '';
    credentialList.innerHTML = '';

    accountInfo.each(function (accounts, domain) {
      addDomain(domain);
    });
  }

  function updateDomainCredentialInputs(domain) {
    var accounts = accountInfo[domain];

    var container = $('credential-input-' + domain);
    if (!container) {
      container = $.make('div', {'id': 'credential-input-' + domain});
      credentialList.appendChild(container);
    }
    container.innerHTML = '';

    var header = $.make('div', {'class': 'section-header'});
    header.innerHTML = 'Credentials for domain "' + domain + '"';
    container.appendChild(header);

    var accountsDiv = $.make('div');
    accountsDiv.innerHTML = 'Number of accounts: ' +
      '<input type="number" min=1 max=10 id="num-accounts-' +
      domain + '"' + 'value="' + accounts.length +
      '" placeholder="Number of accounts" >';
    container.appendChild(accountsDiv);

    $('num-accounts-' + domain).addEventListener('input',
      function () {
        updateNumAccounts(domain);
      });

    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      account.domain = domain;

      var div = $.make('div', {'class': 'credential-box'});
      header = $.make('div', {
        'class': 'account-title',
        'id': 'account-title-' + domain + i
      });
      header.innerHTML = 'Account ' + (i + 1);
      div.appendChild(header);

      getAccountTitle(account);

      var user = $.make('input', {
        'type': 'text',
        'id': 'user-' + domain + i,
        'placeholder': 'Username'
      });
      user.oninput = markDirty;
      div.appendChild(user);

      div.appendChild($.make('br'));
      
      var pass = $.make('input', {
        'id': 'pass-' + domain + i, 
        'type': 'password',
        'placeholder': 'Password'
      });
      pass.oninput = markDirty;
      div.appendChild(pass);

      if (account.user) {
        user.setAttribute('value', account.user);
        pass.setAttribute('value', account.pass);
      }

      container.appendChild(div);
    }
  }

  function updateTitle(account, title) {
    var div = $('account-title-' + account.domain + account.number);
    if (div)
      div.innerText = title;
  }

  function getAccountTitle(account) {
    function parseTitle(xmlDoc) {
      var titleSet = xmlDoc.evaluate('/gmail:feed/gmail:title',
          xmlDoc, gmail.NSResolver, XPathResult.ANY_TYPE, null);
      var titleNode = titleSet.iterateNext();
      if (titleNode) {
        var title = titleNode.textContent;
        var prefix = 'Inbox for ';
        if (title.indexOf(prefix) >= 0) {
          title = title.substr(title.indexOf(prefix) + prefix.length);
        }
        return title;
      } else {
        return null;
      }
    }

    gmail.parseFeed(account, parseTitle, updateTitle); 
  }

  function init() {
    if (localStorage.accountInfo) {
      accountInfo = JSON.parse(localStorage.accountInfo);
    }

    $('add-button').on('click', function () { addDomain(null); });
    $('cancel-button').on('click', init);
    saveButton = $('save-button').on('click', save);
    domainList = $('domain-list');
    credentialList = $('credential-inputs');
    domainNameTextbox = $('domain-name');

    updateAll();
    
    markClean();
  }

  function save() {
    saveAll();
    updateAll();

    markClean();

    chrome.extension.getBackgroundPage().bg.init();
  }

  function markDirty() {
    saveButton.disabled = false;
  }

  function markClean() {
    saveButton.disabled = true;
  }
}) ();
