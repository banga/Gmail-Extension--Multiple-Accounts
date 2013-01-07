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
    setTimeout(function () {
      _gaq.push(['_trackEvent', category, action, opt_label, opt_value,
        opt_noninteraction]);
    }, 0);
  }

  return {
    installed:          track.bind(this, 'App', 'Installed'),
    updated:            track.bind(this, 'App', 'Updated'),

    multibarMarkAsRead: track.bind(this, 'Multibar', 'Mark As Read'),
    multibarArchive:    track.bind(this, 'Multibar', 'Archive'),
    multibarSpam:       track.bind(this, 'Multibar', 'Spam'),
    multibarDelete:     track.bind(this, 'Multibar', 'Delete'),
    multibarClose:      track.bind(this, 'Multibar', 'Close'),

    // opt_value = millis for which it showed
    throbberFinish:     track.bind(this, 'Throbber', 'Finish'),

    optionsClick:       track.bind(this, 'Options', 'Click'),

    feedbackStart:      track.bind(this, 'Feedback', 'Start'),
    feedbackSend:       track.bind(this, 'Feedback', 'Send'),
    feedbackFail:       track.bind(this, 'Feedback', 'Fail'),

    donateClick:        track.bind(this, 'Donate', 'Click'),
    rateClick:          track.bind(this, 'Rate', 'Click'),

    // opt_label = URL
    inboxUrlClick:      track.bind(this, 'Inbox URL', 'Click'),

    previewShow:        track.bind(this, 'Preview', 'Show'),
    previewHide:        track.bind(this, 'Preview', 'Hide'),
    previewFail:        track.bind(this, 'Preview', 'Fail'),

    messageShow:        track.bind(this, 'Message', 'Show'),
    messageHide:        track.bind(this, 'Message', 'Hide'),

    replyStart:         track.bind(this, 'Reply', 'Start'),
    replySend:          track.bind(this, 'Reply', 'Send'),

    mailOpen:           track.bind(this, 'Mail', 'Open'),
    mailMarkAsRead:     track.bind(this, 'Mail', 'Mark As Read'),
    mailArchive:        track.bind(this, 'Mail', 'Archive'),
    mailMarkAsSpam:     track.bind(this, 'Mail', 'Mark As Spam'),
    mailDelete:         track.bind(this, 'Mail', 'Delete'),

    gmailFetch:         track.bind(this, 'Gmail', 'Fetch'),

    cacheHit:           track.bind(this, 'Cache', 'Hit'),
    cacheMiss:          track.bind(this, 'Cache', 'Miss'),
    cacheLoad:          track.bind(this, 'Cache', 'Load'),
    cacheUpdate:        track.bind(this, 'Cache', 'Update')
  };
}) ();

console.dir(analytics);
