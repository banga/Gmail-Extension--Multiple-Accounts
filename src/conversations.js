function Conversation(account, entryNode, index) {
  'use strict';
  this.account = account;
  this.fromFeed(entryNode);
  this.index = index;
  this.view = new ConversationView(this);
}

$.addEventHandling(Conversation, [
    'updated',
    'updateFailed'
  ]);

Conversation.prototype.fromFeed = function (entryNode) {
  'use strict';
  var node = entryNode.querySelector('modified');
  this.modified = (node ? node.textContent : '');

  node = entryNode.querySelector('title');
  this.subject = (node ? node.textContent : '');

  node = entryNode.querySelector('summary');
  this.summary = (node ? node.textContent : '');

  node = entryNode.querySelector('author name');
  this.author = (node ? node.textContent : '');

  node = entryNode.querySelector('link');
  this.link = (node ? node.getAttribute('href') : '');

  var msgID = this.link.match(/message_id=([\w]*)/);
  if (msgID && msgID.length >= 2)
    this.id = msgID[1];

  this.emails = [];
};

Conversation.prototype.update = function () {
  'use strict';
  console.assert(this.id);
  var that = this;
  var onSuccess = this.publish.bind(this, 'updated', this);
  var onError = this.publish.bind(this, 'updateFailed', this);

  return $.post({
    url: that.account.htmlModeURL() + '?&v=pt&th=' + that.id,
    onSuccess: function (xhr) {
      var div = $.make('div').html(xhr.responseText);
      var messageTables = div.querySelectorAll('.message');

      if (messageTables) {
        that.emails = [];
        for (var i = 0; i < messageTables.length; ++i) {
          that.emails.push(new Email(messageTables[i], that.account));
        }
        onSuccess();
      } else {
        onError();
      }
    },
    onError: onError
  });
};

function ConversationView(conversation) {
  'use strict';
  this.conversation = conversation;
  this.root = $.make('.conversation-view');

  this.conversation.subscribe('updated', this.update.bind(this));
}

ConversationView.prototype.update = function () {
  'use strict';
  this.root.html('');

  var emailListElem = $.make('#mail-body');
  this.conversation.emails.each(function (email, idx) {
    var emailElem = email.view.render();
    emailElem.attr('id', 'email-' + idx);
    emailListElem.append(emailElem);
  });

  this.root
    .append($.make('input.conversation-selector', {'type': 'checkbox'}))
  //  .on('click', onMailSelecterClick);
    .append($.make('.preview-row')
      .append($.make('.subject').text(this.conversation.subject))
      .append($.make('.author').text(this.conversation.author))
      .append($.make('.summary').text(this.conversation.summary)))
    .append(emailListElem)
    .append($.make('#mail-reply'))
    .append($.make('#mail-tools'));
};
