<script>
/*
GTM Custom HTML Tag - Form Email/Phone Capture

Edit only in CONFIG:
- formSelector
- clickSelector
- clickTextIncludes (optional)
- fallbackContainerSelector (optional)
- allowClickWithoutForm (optional)

Selector examples:
- formSelector: 'form'
- formSelector: '#gform_1, #gform_2'
- formSelector: '.lead-form, .contact-form'
- formSelector: '#gform_1, .lead-form, form[name="newsletter"]'

- clickSelector: 'button[type="submit"], input[type="submit"], button:not([type])'
- clickSelector: 'button[type="submit"], [data-submit], [data-action="submit"]'
- clickSelector: 'input[id^="gform_submit_button_"], [data-submission-type="submit"]' // Gravity Forms

- clickTextIncludes: []
- clickTextIncludes: ['submit', 'send', 'continue']

- fallbackContainerSelector: ''
- fallbackContainerSelector: '.gfb__footer, .gfb__wrapper, .gfb__content'

- allowClickWithoutForm: false
- allowClickWithoutForm: true

Note:
button:not([type]) means <button> without type attribute (often works as submit).
*/
(function (w, d) {
  'use strict';

  var DEFAULT_CONFIG = {
    formSelector: 'form',
    clickSelector: 'button[type="submit"], input[type="submit"], button:not([type]), [data-submit], [data-action="submit"], [data-submission-type="submit"], input[id^="gform_submit_button_"], .wizard__submit',
    clickTextIncludes: [],
    fallbackContainerSelector: '.gfb__footer, .gfb__wrapper, .gfb__content',
    allowClickWithoutForm: true,
    eventName: 'form_submit_complete',
    dedupeWindowMs: 1200
  };

  // Optional: set this object before this script runs if you want to override config globally.
  // Example: window.GTM_FORM_CAPTURE_CONFIG = { formSelector: '#gform_1' };
  var CONFIG = merge(DEFAULT_CONFIG, w.GTM_FORM_CAPTURE_CONFIG || {});

  var LAST_PUSH_KEY = '__gtmFormCaptureLastPushAt';

  function merge(base, override) {
    var out = {};
    var k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in override) {
      if (Object.prototype.hasOwnProperty.call(override, k)) out[k] = override[k];
    }
    return out;
  }

  function matches(el, selector) {
    if (!el || el.nodeType !== 1) return false;
    var fn = el.matches || el.msMatchesSelector || el.webkitMatchesSelector;
    return fn ? fn.call(el, selector) : false;
  }

  function closest(el, selector) {
    var cur = el;
    while (cur && cur !== d) {
      if (matches(cur, selector)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function getValue(root, selectors) {
    if (!root || !root.querySelector) return '';
    var i;
    for (i = 0; i < selectors.length; i++) {
      var field = root.querySelector(selectors[i]);
      if (field && typeof field.value === 'string') return field.value.replace(/^\s+|\s+$/g, '');
    }
    return '';
  }

  function isClickable(el) {
    if (!el || el.nodeType !== 1) return false;

    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'button' || tag === 'a') return true;

    if (tag === 'input') {
      var t = (el.type || '').toLowerCase();
      return t === 'submit' || t === 'button' || t === 'image';
    }

    return (el.getAttribute && (el.getAttribute('role') || '').toLowerCase() === 'button');
  }

  function findTriggerByText(startEl, keywords, formSelector) {
    var cur = startEl;
    var i;

    while (cur && cur !== d) {
      if (isClickable(cur)) {
        var text = (
          (cur.textContent || '') + ' ' +
          (cur.value || '') + ' ' +
          (cur.getAttribute ? (cur.getAttribute('aria-label') || '') : '')
        ).toLowerCase();

        for (i = 0; i < keywords.length; i++) {
          var kw = String(keywords[i] || '').toLowerCase().replace(/^\s+|\s+$/g, '');
          if (kw && text.indexOf(kw) !== -1) {
            var form = cur.form || closest(cur, formSelector);
            if (form) return cur;
          }
        }
      }
      cur = cur.parentElement;
    }

    return null;
  }

  function canPush(targetNode) {
    if (!targetNode) return false;
    var now = new Date().getTime();
    var last = targetNode[LAST_PUSH_KEY] || 0;
    if (now - last < CONFIG.dedupeWindowMs) return false;
    targetNode[LAST_PUSH_KEY] = now;
    return true;
  }

  function getNodeId(node) {
    if (!node || node.nodeType !== 1) return '(no form id)';
    return (
      node.id ||
      (node.getAttribute && node.getAttribute('name')) ||
      (node.getAttribute && node.getAttribute('data-path')) ||
      (node.className && String(node.className).split(' ').join('.')) ||
      '(no form id)'
    );
  }

  function pushFormData(rootNode, triggerType, triggerEl) {
    if (!rootNode) return;
    if (!canPush(rootNode)) return;

    var email = getValue(rootNode, [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]'
    ]);

    var phone = getValue(rootNode, [
      'input[type="tel"]',
      'input[name*="phone" i]',
      'input[name*="mobile" i]',
      'input[id*="phone" i]'
    ]);

    var triggerText = '';
    if (triggerEl) {
      triggerText = (
        (triggerEl.textContent || '') + ' ' +
        (triggerEl.value || '') + ' ' +
        (triggerEl.getAttribute ? (triggerEl.getAttribute('aria-label') || '') : '')
      ).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      event: CONFIG.eventName,
      form_id: getNodeId(rootNode),
      trigger_type: triggerType,
      trigger_text: triggerText,
      user_data: {
        email: email,
        phone_number: phone
      }
    });
  }

  d.addEventListener('submit', function (event) {
    var form = event.target;
    if (form && matches(form, CONFIG.formSelector)) {
      pushFormData(form, 'submit', null);
    }
  }, true);

  d.addEventListener('click', function (event) {
    var target = event.target;
    if (!target) return;

    var trigger = closest(target, CONFIG.clickSelector);

    if (!trigger && CONFIG.clickTextIncludes && CONFIG.clickTextIncludes.length) {
      trigger = findTriggerByText(target, CONFIG.clickTextIncludes, CONFIG.formSelector);
    }

    if (!trigger) return;

    var form = trigger.form || closest(trigger, CONFIG.formSelector);
    if (form) {
      pushFormData(form, 'click', trigger);
      return;
    }

    if (!CONFIG.allowClickWithoutForm) return;

    var fallbackContainer = CONFIG.fallbackContainerSelector
      ? closest(trigger, CONFIG.fallbackContainerSelector)
      : null;

    if (fallbackContainer) {
      pushFormData(fallbackContainer, 'click_no_form', trigger);
    }
  }, true);
})(window, document);
</script>
