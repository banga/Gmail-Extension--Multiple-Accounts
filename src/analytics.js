var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-37373966-1']);
_gaq.push(['_trackPageview']);

(function () {
  'use strict';
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();


var analytics = (function () {
  'use strict';

  // _trackEvent(category, action, opt_label, opt_value, opt_noninteraction)
  function track(category, action, opt_label, opt_value, opt_noninteraction) {
    _gaq.push(['_trackEvent', category, action, opt_label, opt_value, opt_noninteraction]);
  }

  return {
    multibarMarkAsRead: track.bind('Multibar', 'Mark As Read'),
    multibarArchive:    track.bind('Multibar', 'Archive'),
    multibarSpam:       track.bind('Multibar', 'Spam'),
    multibarDelete:     track.bind('Multibar', 'Delete'),
    multibarClose:      track.bind('Multibar', 'Close'),

    // opt_value = millis for which it showed
    throbberFinish:     track.bind('Throbber', 'Finish'),

    optionsClick:       track.bind('Options', 'Click'),

    // opt_label = URL
    inboxUrlClick:      track.bind('Inbox URL', 'Click'),

    previewShow:        track.bind('Preview', 'Show'),
    previewHide:        track.bind('Preview', 'Hide'),
    previewFail:        track.bind('Preview', 'Fail'),

    messageShow:        track.bind('Message', 'Show'),
    messageHide:        track.bind('Message', 'Hide'),

    replyStart:         track.bind('Reply', 'Start'),
    replySend:          track.bind('Reply', 'Send'),

    mailOpen:           track.bind('Mail', 'Open'),
    mailMarkAsRead:     track.bind('Mail', 'Mark As Read'),
    mailArchive:        track.bind('Mail', 'Archive'),
    mailMarkAsSpam:     track.bind('Mail', 'Mark As Spam'),
    mailDelete:         track.bind('Mail', 'Delete'),

    gmailFetch:         track.bind('Gmail', 'Fetch')
  };
}) ();

console.dir(analytics);
