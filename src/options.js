var domainNameTextbox;
var domainList;
var saveButton;
var accountInfo = {mail: [{number: 0, domain: 'mail'}]};
var credentialList; 

init();

function addDomain(domain) {
  if(!domain) {
    domain = domainNameTextbox.value;
    domainNameTextbox.value = "";
  }

  // Check for collisions
  if (U('domain-list-item-' + domain))
    return;

  if (!accountInfo[domain])
    accountInfo[domain] = [{number: 0, domain: domain}];

  var domainItem = U.make('div', {
        'class': 'domain-list-item',
        'id': 'domain-list-item-' + domain
      });
  domainItem.innerHTML = "https://mail.google.com/<b>" + domain +
    "</b>" + "<button>Remove</button>";
  domainItem.getElementsByTagName('button')[0].
    addEventListener('click', function() { removeDomain(domain); });
  domainList.appendChild(domainItem);

  updateDomainCredentialInputs(domain);

  markDirty();
}

function removeDomain(domain) {
  delete accountInfo[domain];
  domainList.removeChild(U('domain-list-item-' + domain));
  credentialList.removeChild(U('credential-input-' + domain));
  markDirty();
}

function updateNumAccounts(domain) {
  markDirty();

  var numAccountsTextbox = U('num-accounts-' + domain);
  numAccounts = parseInt(numAccountsTextbox.value, 10);

  var accounts = accountInfo[domain];
  for(var i = accounts.length; i < numAccounts; i++) {
    accounts[i] = {number: i, domain: domain};
  }
  accounts.length = numAccounts;

  updateDomainCredentialInputs(domain);
}

function saveAll() {
  accountInfo.each(saveDomainCredentialInputs);
  saveToLocalStorage(accountInfo);
}

function saveDomainCredentialInputs(accounts, domain) {
  var container = U('credential-input-' + domain);
  var numAccounts = U('num-accounts-' + domain).value;
  for(var i = 0; i < numAccounts; i++) {
    accounts[i] = {
      user: U('user-' + domain + i).value,
      pass: U('pass-' + domain + i).value,
      number: i,
      domain: domain
    };
  }
  accounts.length = numAccounts;
}

function updateAll() {
  domainList.innerHTML = "";
  credentialList.innerHTML = "";

  accountInfo.each(function(accounts, domain) {
    addDomain(domain);
  });
}

function updateDomainCredentialInputs(domain) {
  var accounts = accountInfo[domain];

  var container = U('credential-input-' + domain);
  if(!container) {
    container = U.make('div', {'id': 'credential-input-' + domain});
    credentialList.appendChild(container);
  }
  container.innerHTML = "";

  var header = U.make('div', {'class': 'section-header'});
  header.innerHTML = "Credentials for domain '" + domain + "'";
  container.appendChild(header);

  var accountsDiv = U.make('div');
  accountsDiv.innerHTML = "Number of accounts: " +
    "<input type='number' min=1 max=10 id='num-accounts-" +
    domain +"'" + "value='" + accounts.length +
    "' placeholder='Number of accounts' >";
  container.appendChild(accountsDiv);

  U('num-accounts-' + domain).addEventListener('input',
    function() {
      updateNumAccounts(domain);
    });

  for(var i = 0; i < accounts.length; i++) {
    var account = accounts[i];
    account.domain = domain;

    var div = U.make('div', {'class': 'credential-box'});
    header = U.make('div', {
      'class': 'account-title',
      'id': 'account-title-' + domain + i
    });
    header.innerHTML = "Account " + (i + 1);
    div.appendChild(header);

    getAccountTitle(account);

    var user = U.make('input', {
      'type': 'text',
      'id': 'user-' + domain + i,
      'placeholder': 'Username'
    });
    user.oninput = markDirty;
    div.appendChild(user);

    div.appendChild(U.make('br'));
    
    var pass = U.make('input', {
      'id': 'pass-' + domain + i, 
      'type': 'password',
      'placeholder': 'Password'
    });
    pass.oninput = markDirty;
    div.appendChild(pass);

    if(account.user) {
      user.setAttribute('value', account.user);
      pass.setAttribute('value', account.pass);
    }

    container.appendChild(div);
  }
}

function updateTitle(account, title) {
  var div = U('account-title-' + account.domain + account.number);
  if(div)
    div.innerText = title;
}

function getAccountTitle(account) {
  function parseTitle(xmlDoc) {
    var titleSet = xmlDoc.evaluate("/gmail:feed/gmail:title",
        xmlDoc, gmailNSResolver, XPathResult.ANY_TYPE, null);
    var titleNode = titleSet.iterateNext();
    if(titleNode) {
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

  parseAccountFeed(account, parseTitle, updateTitle); 
}

function init() {
  if(localStorage.accountInfo) {
    accountInfo = JSON.parse(localStorage.accountInfo);
  }

  addButton = U("add-button");
  cancelButton = U("cancel-button");
  saveButton = U("save-button");
  domainList = U("domain-list");
  credentialList = U('credential-inputs');
  domainNameTextbox = U('domain-name');

  addButton.addEventListener("click", function() { addDomain(null); });
  cancelButton.addEventListener("click", init);
  saveButton.addEventListener("click", save);

  updateAll();
  
  markClean();
}

function save() {
  saveAll();
  updateAll();

  markClean();

  chrome.extension.getBackgroundPage().init();
}

function markDirty() {
  saveButton.disabled = false;
}

function markClean() {
  saveButton.disabled = true;
}
