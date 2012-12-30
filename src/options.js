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
  if(document.getElementById('domain-list-item-' + domain))
    return;

  if(!accountInfo[domain])
    accountInfo[domain] = [{number: 0, domain: domain}];

  var domainItem = document.createElement('div');
  domainItem.setAttribute('class', 'domain-list-item');
  domainItem.setAttribute('id', 'domain-list-item-' + domain);
  domainItem.innerHTML = "https://mail.google.com/<b>" + domain + "</b>"
    + "<button>Remove</button>";
  domainItem.getElementsByTagName('button')[0].addEventListener('click', 
      function() {
        removeDomain(domain);
      });
  domainList.appendChild(domainItem);

  updateDomainCredentialInputs(domain);

  markDirty();
}

function removeDomain(domain) {
  delete accountInfo[domain];
  domainList.removeChild(document.getElementById('domain-list-item-' + domain));
  credentialList.removeChild(document.getElementById('credential-input-' + domain));
  markDirty();
}

function updateNumAccounts(domain) {
  markDirty();

  var numAccountsTextbox = document.getElementById('num-accounts-' + domain);
  numAccounts = parseInt(numAccountsTextbox.value);

  var accounts = accountInfo[domain];
  for(var i = accounts.length; i < numAccounts; i++) {
    accounts[i] = {number: i, domain: domain};
  }
  accounts.length = numAccounts;

  updateDomainCredentialInputs(domain);
}

function saveAll() {
  for(var domain in accountInfo)
    saveDomainCredentialInputs(domain);
  saveToLocalStorage(accountInfo);
}

function saveDomainCredentialInputs(domain) {
  var container = document.getElementById('credential-input-' + domain);
  var numAccounts = document.getElementById('num-accounts-' + domain).value;
  var accounts = accountInfo[domain];
  for(i = 0; i < numAccounts; i++) {
    accounts[i] = {
      user: document.getElementById('user-' + domain + i).value,
      pass: document.getElementById('pass-' + domain + i).value,
      number: i,
      domain: domain
    }
  }
  accounts.length = numAccounts;
}

function updateAll() {
  domainList.innerHTML = "";
  credentialList.innerHTML = "";

  for(var domain in accountInfo) {
    addDomain(domain);
  }
}

function updateDomainCredentialInputs(domain) {
  var accounts = accountInfo[domain];

  var container = document.getElementById('credential-input-' + domain);
  if(!container) {
    container = document.createElement('div');
    container.setAttribute('id', 'credential-input-' + domain);
    credentialList.appendChild(container);
  }
  container.innerHTML = "";

  var header = document.createElement('div');
  header.setAttribute('class', 'section-header');
  header.innerHTML = "Credentials for domain '" + domain + "'";
  container.appendChild(header);

  var accountsDiv = document.createElement('div');
  accountsDiv.innerHTML = "Number of accounts: "
    + "<input type='number' min=1 max=10 id='num-accounts-" + domain +"'"
    + "value='" + accounts.length + "' placeholder='Number of accounts' >";
  container.appendChild(accountsDiv);
  document.getElementById('num-accounts-' + domain).addEventListener('input',
    function() {
      updateNumAccounts(domain);
    });

  for(i = 0; i < accounts.length; i++) {
    var account = accounts[i];
    account.domain = domain;

    var div = document.createElement('div');
    div.setAttribute('class', 'credential-box');

    var header = document.createElement('div');
    header.innerHTML = "Account " + (i + 1);
    header.setAttribute('class', 'account-title');
    header.setAttribute('id', 'account-title-' + domain + i);
    div.appendChild(header);

    getAccountTitle(account);

    var user = document.createElement('input');
    user.setAttribute('type', 'text');
    user.setAttribute('id', 'user-' + domain + i);
    user.setAttribute('placeholder', 'Username');
    user.oninput = markDirty;
    div.appendChild(user);

    div.appendChild(document.createElement('br'));
    
    var pass = document.createElement('input');
    pass.setAttribute('type', 'password');
    pass.setAttribute('id', 'pass-' + domain + i);
    pass.setAttribute('placeholder', 'Password');
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
  console.dir(account);
  console.dir(title);
  var div = document.getElementById('account-title-' + account.domain + account.number);
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
  console.log("init");

  if(localStorage.accountInfo) {
    accountInfo = JSON.parse(localStorage.accountInfo);
  }

  addButton = document.getElementById("add-button");
  cancelButton = document.getElementById("cancel-button");
  saveButton = document.getElementById("save-button");
  domainList = document.getElementById("domain-list");
  credentialList = document.getElementById('credential-inputs');
  domainNameTextbox = document.getElementById('domain-name');

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
