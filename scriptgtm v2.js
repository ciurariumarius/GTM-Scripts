<script>
/*
 * GTM Custom HTML - Universal same-page form success tracker
 *
 * Pentru majoritatea formularelor nu este necesara configurare.
 * Selectorii si textele de mai jos sunt doar extensii optionale si se adauga
 * peste valorile predefinite.
 */

window.GTM_FORM_SUCCESS_CONFIG = window.GTM_FORM_SUCCESS_CONFIG || {
  additionalFormSelectors: [],
  additionalSuccessSelectors: [],
  additionalSuccessTextIncludes: []
};

/* Exemple:
 * additionalFormSelectors: ['.formularul-meu']
 * additionalSuccessSelectors: ['.mesajul-meu-de-succes']
 * additionalSuccessTextIncludes: ['cererea ta a fost inregistrata']
 */

(function (w, d) {
  'use strict';

  var INSTALL_KEY = '__gtmUniversalFormSuccessTrackerInstalled';

  if (w[INSTALL_KEY]) {
    return;
  }

  w[INSTALL_KEY] = true;

  var DEFAULTS = {
    formSelectors: [
      'form',
      '[role="form"]',
      '.wpcf7',
      '.gform_wrapper',
      '.elementor-form',
      '.wpforms-container',
      '.frm_forms',
      '.nf-form-cont',
      '.hbspt-form',
      '.fluentform',
      '.forminator-ui',
      '#mc_embed_signup',
      '.w-form',
      '.et_pb_contact_form_container'
    ],

    submitSelectors: [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:not([type])',
      '[data-submit]',
      '[data-action="submit"]',
      '[data-submission-type="submit"]',
      '.wpcf7-submit',
      '.gform_button',
      '.elementor-button[type="submit"]',
      '.wpforms-submit',
      '.frm_final_submit',
      '.nf-form-cont input[type="button"]',
      '.hs-button.primary',
      '.ff-btn-submit',
      '.forminator-button-submit'
    ],

    /*
     * Acesti selectori reprezinta succes prin semantica lor.
     * Un text pozitiv nu mai este obligatoriu, dar textele de eroare
     * continua sa blocheze evenimentul.
     */
    successSelectors: [
      '.wpcf7 form.sent .wpcf7-response-output',
      '.wpcf7-mail-sent-ok',
      '.gform_confirmation_message',
      '.gform_confirmation_wrapper',
      '.elementor-message-success',
      '.wpforms-confirmation-container',
      '.wpforms-confirmation-container-full',
      '.frm_message',
      '.nf-response-msg',
      '.hbspt-form .submitted-message',
      '.ff-message-success',
      '.forminator-response-message.forminator-success',
      '#mce-success-response',
      '.w-form-done',
      '.form-submission-text',
      '.form-success',
      '.form-success-message',
      '.success-message',
      '[data-form-success]'
    ],

    /*
     * Aceste elemente pot contine atat succes, cat si eroare.
     * Pentru ele este obligatoriu un text pozitiv.
     */
    messageSelectors: [
      '[role="status"]',
      '[role="alert"]',
      '[aria-live="polite"]',
      '[aria-live="assertive"]',
      '.wpcf7-response-output',
      '.elementor-message',
      '.et-pb-contact-message',
      '.form-status'
    ],

    successTextIncludes: [
      'multumim',
      'multumesc',
      'trimis cu succes',
      'mesajul a fost trimis',
      'mesajul tau a fost trimis',
      'formularul a fost trimis',
      'cererea a fost trimisa',
      'solicitarea a fost trimisa',
      'inscrierea a fost finalizata',
      'inregistrare reusita',
      'am primit mesajul',
      'am primit cererea',
      'datele au fost trimise',
      'thank you',
      'thanks for contacting',
      'message has been sent',
      'form has been submitted',
      'submitted successfully',
      'successfully submitted',
      'submission successful',
      'submission received',
      'we have received your message',
      'your request has been received'
    ],

    failureTextIncludes: [
      'eroare',
      'invalid',
      'obligatoriu',
      'nu a fost trimis',
      'nu a fost trimisa',
      'nu s-a trimis',
      'incearca din nou',
      'error',
      'required',
      'failed',
      'failure',
      'not sent',
      'could not be sent',
      'something went wrong',
      'try again'
    ],

    interactionEventName: 'form_interaction_started',
    successEventName: 'form_submit_complete',
    successWindowMs: 60000,
    interactionWindowMs: 1800000,
    dedupeWindowMs: 2000,
    maxMessageLength: 600,
    captureUserData: true,
    debug: false
  };

  var DATA_KEY = '__gtmUniversalFormCaptureData';
  var INTERACTION_KEY = '__gtmUniversalFormInteractionStarted';
  var LAST_PUSH_KEY = '__gtmUniversalFormLastPushAt';
  var custom = w.GTM_FORM_SUCCESS_CONFIG || {};
  var attemptSequence = 0;
  var pendingAttempts = [];
  var lastGlobalPushAt = 0;

  function asArray(value) {
    if (!value) {
      return [];
    }

    return Object.prototype.toString.call(value) === '[object Array]'
      ? value
      : [value];
  }

  function unique(values) {
    var result = [];
    var seen = {};
    var i;
    var value;

    for (i = 0; i < values.length; i++) {
      value = String(values[i] || '').replace(/^\s+|\s+$/g, '');

      if (value && !seen[value]) {
        seen[value] = true;
        result.push(value);
      }
    }

    return result;
  }

  function validSelectors(values) {
    var result = [];
    var i;

    for (i = 0; i < values.length; i++) {
      try {
        d.querySelector(values[i]);
        result.push(values[i]);
      } catch (e) {
        if (w.console && w.console.warn) {
          w.console.warn('[GTM form tracker] Selector invalid:', values[i]);
        }
      }
    }

    return result;
  }

  function additional(name) {
    return asArray(custom[name]);
  }

  var CONFIG = {
    formSelectors: validSelectors(unique(
      DEFAULTS.formSelectors.concat(additional('additionalFormSelectors'))
    )),
    submitSelectors: validSelectors(unique(
      DEFAULTS.submitSelectors.concat(additional('additionalSubmitSelectors'))
    )),
    successSelectors: validSelectors(unique(
      DEFAULTS.successSelectors.concat(additional('additionalSuccessSelectors'))
    )),
    messageSelectors: validSelectors(unique(
      DEFAULTS.messageSelectors.concat(additional('additionalMessageSelectors'))
    )),
    successTextIncludes: unique(
      DEFAULTS.successTextIncludes.concat(additional('additionalSuccessTextIncludes'))
    ),
    failureTextIncludes: unique(
      DEFAULTS.failureTextIncludes.concat(additional('additionalFailureTextIncludes'))
    ),
    interactionEventName:
      custom.interactionEventName || DEFAULTS.interactionEventName,
    successEventName:
      custom.successEventName || DEFAULTS.successEventName,
    successWindowMs:
      typeof custom.successWindowMs === 'number'
        ? custom.successWindowMs
        : DEFAULTS.successWindowMs,
    interactionWindowMs:
      typeof custom.interactionWindowMs === 'number'
        ? custom.interactionWindowMs
        : DEFAULTS.interactionWindowMs,
    dedupeWindowMs:
      typeof custom.dedupeWindowMs === 'number'
        ? custom.dedupeWindowMs
        : DEFAULTS.dedupeWindowMs,
    maxMessageLength:
      typeof custom.maxMessageLength === 'number'
        ? custom.maxMessageLength
        : DEFAULTS.maxMessageLength,
    captureUserData:
      typeof custom.captureUserData === 'boolean'
        ? custom.captureUserData
        : DEFAULTS.captureUserData,
    debug:
      typeof custom.debug === 'boolean'
        ? custom.debug
        : DEFAULTS.debug
  };

  var SCAN_SELECTORS = unique(
    CONFIG.successSelectors.concat(CONFIG.messageSelectors)
  );
  var SCAN_SELECTOR = SCAN_SELECTORS.join(',');

  function log() {
    var args;

    if (!CONFIG.debug || !w.console || !w.console.log) {
      return;
    }

    args = Array.prototype.slice.call(arguments);
    args.unshift('[GTM form tracker]');
    w.console.log.apply(w.console, args);
  }

  function matches(el, selector) {
    var fn;

    if (!el || el.nodeType !== 1 || !selector) {
      return false;
    }

    fn = el.matches || el.msMatchesSelector || el.webkitMatchesSelector;

    if (!fn) {
      return false;
    }

    try {
      return fn.call(el, selector);
    } catch (e) {
      return false;
    }
  }

  function matchesAny(el, selectors) {
    var i;

    for (i = 0; i < selectors.length; i++) {
      if (matches(el, selectors[i])) {
        return true;
      }
    }

    return false;
  }

  function closestAny(el, selectors) {
    var current = el;

    while (current && current !== d) {
      if (matchesAny(current, selectors)) {
        return current;
      }

      current = current.parentElement;
    }

    return null;
  }

  function normalizeText(value) {
    var text = String(value || '').toLowerCase();

    if (text.normalize) {
      text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    return text
      .replace(/[ăâ]/g, 'a')
      .replace(/î/g, 'i')
      .replace(/[șş]/g, 's')
      .replace(/[țţ]/g, 't')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }

  function containsAny(text, values) {
    var i;
    var value;

    for (i = 0; i < values.length; i++) {
      value = normalizeText(values[i]);

      if (value && text.indexOf(value) !== -1) {
        return true;
      }
    }

    return false;
  }

  function isVisible(el) {
    var current;
    var style;

    if (!el || el.nodeType !== 1 || !d.documentElement.contains(el)) {
      return false;
    }

    if (!(
      el.offsetWidth ||
      el.offsetHeight ||
      (el.getClientRects && el.getClientRects().length)
    )) {
      return false;
    }

    if (!w.getComputedStyle) {
      return true;
    }

    current = el;

    while (current && current.nodeType === 1) {
      style = w.getComputedStyle(current);

      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        Number(style.opacity) === 0
      ) {
        return false;
      }

      current = current.parentElement;
    }

    return true;
  }

  function getElementText(el) {
    return normalizeText(
      el && (el.textContent || el.innerText || '')
    );
  }

  function getSignature(el) {
    return getElementText(el);
  }

  function isSuccessCandidate(el) {
    var text;
    var hasStrongSelector;

    if (
      el === d.body ||
      el === d.documentElement ||
      !isVisible(el)
    ) {
      return false;
    }

    text = getElementText(el);
    hasStrongSelector = matchesAny(el, CONFIG.successSelectors);

    if (text && containsAny(text, CONFIG.failureTextIncludes)) {
      return false;
    }

    if (hasStrongSelector) {
      return true;
    }

    if (!text || text.length > CONFIG.maxMessageLength) {
      return false;
    }

    return containsAny(text, CONFIG.successTextIncludes);
  }

  function findContainer(el) {
    if (!el) {
      return null;
    }

    if (el.form && matches(el.form, 'form')) {
      return el.form;
    }

    return closestAny(el, CONFIG.formSelectors);
  }

  function getValue(container, selectors) {
    var fields;
    var i;
    var j;
    var value;

    if (!container || !container.querySelectorAll) {
      return '';
    }

    for (i = 0; i < selectors.length; i++) {
      try {
        fields = container.querySelectorAll(selectors[i]);
      } catch (e) {
        fields = [];
      }

      for (j = 0; j < fields.length; j++) {
        value = String(fields[j].value || '').replace(/^\s+|\s+$/g, '');

        if (value) {
          return value;
        }
      }
    }

    return '';
  }

  function captureFormData(container, existing) {
    var data = existing || { email: '', phone_number: '' };
    var email;
    var phone;

    if (!CONFIG.captureUserData) {
      return data;
    }

    email = getValue(container, [
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]'
    ]);

    phone = getValue(container, [
      'input[type="tel"]',
      'input[name*="phone" i]',
      'input[name*="mobile" i]',
      'input[name*="telefon" i]',
      'input[id*="phone" i]',
      'input[id*="mobile" i]',
      'input[id*="telefon" i]'
    ]);

    /* Nu suprascriem valorile bune daca formularul a fost golit la succes. */
    if (email) {
      data.email = email;
    }

    if (phone) {
      data.phone_number = phone;
    }

    return data;
  }

  function captureNamedInputs(container, inputs) {
    var data = container[DATA_KEY] || { email: '', phone_number: '' };
    var name;
    var value;
    var i;

    if (!CONFIG.captureUserData || !inputs || !inputs.length) {
      return;
    }

    for (i = 0; i < inputs.length; i++) {
      name = String(inputs[i].name || '').toLowerCase();
      value = String(inputs[i].value || '').replace(/^\s+|\s+$/g, '');

      if (!value) {
        continue;
      }

      if (!data.email && name.indexOf('email') !== -1) {
        data.email = value;
      }

      if (
        !data.phone_number &&
        (
          name.indexOf('phone') !== -1 ||
          name.indexOf('mobile') !== -1 ||
          name.indexOf('telefon') !== -1 ||
          name.indexOf('tel') !== -1
        )
      ) {
        data.phone_number = value;
      }
    }

    container[DATA_KEY] = data;
  }

  function getFormId(container) {
    var className;

    if (!container) {
      return '(no form id)';
    }

    className = typeof container.className === 'string'
      ? container.className.replace(/\s+/g, '.').replace(/^\.|\.$/g, '')
      : '';

    return (
      container.id ||
      container.getAttribute('name') ||
      container.getAttribute('data-form-id') ||
      (className ? '.' + className : '') ||
      '(no form id)'
    );
  }

  function isUserField(field) {
    var tag;
    var type;

    if (!field || field.nodeType !== 1) {
      return false;
    }

    if (
      field.getAttribute('aria-hidden') === 'true' ||
      field.getAttribute('tabindex') === '-1'
    ) {
      return false;
    }

    tag = String(field.tagName || '').toLowerCase();

    if (tag === 'textarea' || tag === 'select') {
      return true;
    }

    if (tag === 'input') {
      type = String(field.type || 'text').toLowerCase();

      return [
        'submit',
        'button',
        'reset',
        'hidden',
        'image'
      ].indexOf(type) === -1;
    }

    return field.getAttribute('contenteditable') === 'true';
  }

  function pushInteractionStarted(container, field) {
    if (
      !CONFIG.interactionEventName ||
      !container ||
      container[INTERACTION_KEY]
    ) {
      return;
    }

    container[INTERACTION_KEY] = true;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({
      event: CONFIG.interactionEventName,
      form_id: getFormId(container),
      field_name: field.name || field.id || '(no field name)',
      field_type: String(field.type || field.tagName || '').toLowerCase()
    });
  }

  function handleInteraction(field) {
    var container;

    if (!isUserField(field)) {
      return;
    }

    container = findContainer(field);

    if (!container) {
      return;
    }

    container[DATA_KEY] = captureFormData(container, container[DATA_KEY]);
    ensureInteractionTracking(container);
    pushInteractionStarted(container, field);
  }

  function removeAttempt(attempt) {
    var i;

    for (i = pendingAttempts.length - 1; i >= 0; i--) {
      if (pendingAttempts[i] === attempt) {
        pendingAttempts.splice(i, 1);
      }
    }
  }

  function cleanExpiredAttempts() {
    var now = new Date().getTime();
    var i;

    for (i = pendingAttempts.length - 1; i >= 0; i--) {
      if (
        now - pendingAttempts[i].startedAt >
          (pendingAttempts[i].windowMs || CONFIG.successWindowMs)
      ) {
        log('Tentativa a expirat:', getFormId(pendingAttempts[i].container));
        pendingAttempts.splice(i, 1);
      }
    }
  }

  function snapshotExistingSuccess(attempt) {
    var elements;
    var i;

    attempt.baseline = [];

    if (!SCAN_SELECTOR) {
      return;
    }

    try {
      elements = d.querySelectorAll(SCAN_SELECTOR);
    } catch (e) {
      return;
    }

    for (i = 0; i < elements.length; i++) {
      if (isSuccessCandidate(elements[i])) {
        attempt.baseline.push({
          element: elements[i],
          signature: getSignature(elements[i])
        });
      }
    }

    /* Protejeaza si un text pozitiv deja prezent in formularul activ. */
    if (isSuccessCandidate(attempt.container)) {
      attempt.baseline.push({
        element: attempt.container,
        signature: getSignature(attempt.container)
      });
    }
  }

  function markSubmissionAttempt(container, source, windowMs) {
    var attempt;
    var i;

    if (!container) {
      return;
    }

    cleanExpiredAttempts();

    for (i = pendingAttempts.length - 1; i >= 0; i--) {
      if (pendingAttempts[i].container === container) {
        pendingAttempts.splice(i, 1);
      }
    }

    container[DATA_KEY] = captureFormData(container, container[DATA_KEY]);

    attempt = {
      id: ++attemptSequence,
      container: container,
      startedAt: new Date().getTime(),
      source: source,
      windowMs: windowMs || CONFIG.successWindowMs,
      baseline: []
    };

    snapshotExistingSuccess(attempt);
    pendingAttempts.push(attempt);
    log('Tentativa detectata:', source, getFormId(container));

    w.setTimeout(function () {
      removeAttempt(attempt);
    }, attempt.windowMs + 100);
  }

  function ensureInteractionTracking(container) {
    var i;

    for (i = 0; i < pendingAttempts.length; i++) {
      if (pendingAttempts[i].container === container) {
        return;
      }
    }

    markSubmissionAttempt(
      container,
      'interaction',
      CONFIG.interactionWindowMs
    );
  }

  function baselineIsUnchanged(attempt, el) {
    var i;

    for (i = 0; i < attempt.baseline.length; i++) {
      if (
        attempt.baseline[i].element === el &&
        attempt.baseline[i].signature === getSignature(el)
      ) {
        return true;
      }
    }

    return false;
  }

  function invalidateChangedBaselines(node) {
    var el = node && node.nodeType === 3 ? node.parentElement : node;
    var i;
    var j;
    var entry;
    var related;

    if (!el || el.nodeType !== 1) {
      return;
    }

    for (i = 0; i < pendingAttempts.length; i++) {
      for (j = pendingAttempts[i].baseline.length - 1; j >= 0; j--) {
        entry = pendingAttempts[i].baseline[j];
        related =
          entry.element === el ||
          (entry.element.contains && entry.element.contains(el)) ||
          (el.contains && el.contains(entry.element));

        if (
          related &&
          (
            !isVisible(entry.element) ||
            entry.signature !== getSignature(entry.element)
          )
        ) {
          pendingAttempts[i].baseline.splice(j, 1);
        }
      }
    }
  }

  function relationshipScore(container, candidate) {
    var candidateContext;
    var containerContext;

    if (!container || !candidate) {
      return 0;
    }

    if (container.contains && container.contains(candidate)) {
      return 100;
    }

    if (
      candidate !== d.body &&
      candidate !== d.documentElement &&
      candidate.contains &&
      candidate.contains(container)
    ) {
      return 80;
    }

    candidateContext = closestAny(candidate, CONFIG.formSelectors);
    containerContext = closestAny(container, CONFIG.formSelectors);

    if (
      candidateContext &&
      containerContext &&
      candidateContext === containerContext
    ) {
      return 70;
    }

    return 0;
  }

  function findAttemptFor(candidate) {
    var best = null;
    var bestScore = -1;
    var score;
    var i;

    cleanExpiredAttempts();

    for (i = 0; i < pendingAttempts.length; i++) {
      if (baselineIsUnchanged(pendingAttempts[i], candidate)) {
        continue;
      }

      score = relationshipScore(pendingAttempts[i].container, candidate);

      if (
        score > bestScore ||
        (
          score === bestScore &&
          best &&
          pendingAttempts[i].startedAt > best.startedAt
        )
      ) {
        best = pendingAttempts[i];
        bestScore = score;
      }
    }

    return best;
  }

  function canPush(attempt) {
    var now = new Date().getTime();
    var last = attempt.container[LAST_PUSH_KEY] || 0;

    if (
      now - last < CONFIG.dedupeWindowMs ||
      now - lastGlobalPushAt < CONFIG.dedupeWindowMs
    ) {
      return false;
    }

    attempt.container[LAST_PUSH_KEY] = now;
    lastGlobalPushAt = now;
    return true;
  }

  function pushSuccess(attempt, successElement) {
    var data;
    var payload;

    if (!attempt) {
      return;
    }

    if (!canPush(attempt)) {
      /* Nu lasam o tentativa deduplicata sa produca un push intarziat. */
      removeAttempt(attempt);
      return;
    }

    data = captureFormData(
      attempt.container,
      attempt.container[DATA_KEY]
    );

    attempt.container[DATA_KEY] = data;
    payload = {
      event: CONFIG.successEventName,
      form_id: attempt.formId || getFormId(attempt.container),
      trigger_type: 'success'
    };

    if (CONFIG.captureUserData) {
      payload.user_data = {
        email: data.email || '',
        phone_number: data.phone_number || ''
      };
    }

    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(payload);

    log('Succes confirmat:', payload.form_id, successElement);
    removeAttempt(attempt);
    attempt.container[DATA_KEY] = null;
    attempt.container[INTERACTION_KEY] = false;
  }

  function pushPlatformSuccess(container, source, formId) {
    var attempt = null;
    var captured;
    var targetData;
    var score;
    var bestScore = -1;
    var i;

    if (!container) {
      return;
    }

    cleanExpiredAttempts();

    for (i = 0; i < pendingAttempts.length; i++) {
      score = relationshipScore(pendingAttempts[i].container, container);

      if (
        score > bestScore ||
        (
          score === bestScore &&
          attempt &&
          pendingAttempts[i].startedAt > attempt.startedAt
        )
      ) {
        attempt = pendingAttempts[i];
        bestScore = score;
      }
    }

    /* Evenimentul oficial de succes este suficient si fara click/submit. */
    if (!attempt) {
      container[DATA_KEY] = captureFormData(container, container[DATA_KEY]);
      attempt = {
        id: ++attemptSequence,
        container: container,
        startedAt: new Date().getTime(),
        source: source,
        baseline: []
      };
    }

    captured = container[DATA_KEY];

    if (captured && attempt.container !== container) {
      targetData = attempt.container[DATA_KEY] || {
        email: '',
        phone_number: ''
      };

      targetData.email = captured.email || targetData.email;
      targetData.phone_number =
        captured.phone_number || targetData.phone_number;
      attempt.container[DATA_KEY] = targetData;
    }

    if (formId) {
      attempt.formId = String(formId);
    }

    pushSuccess(attempt, container);
  }

  function considerCandidate(el) {
    var attempt;

    if (!pendingAttempts.length || !isSuccessCandidate(el)) {
      return false;
    }

    attempt = findAttemptFor(el);

    if (!attempt) {
      return false;
    }

    pushSuccess(attempt, el);
    return true;
  }

  function considerElement(root) {
    var elements;
    var current;
    var i;
    var depth = 0;

    if (!root || root.nodeType !== 1 || !pendingAttempts.length) {
      return;
    }

    /* Intai verificam selectori expliciti din elementul adaugat. */
    if (matchesAny(root, SCAN_SELECTORS) && considerCandidate(root)) {
      return;
    }

    if (SCAN_SELECTOR && root.querySelectorAll) {
      try {
        elements = root.querySelectorAll(SCAN_SELECTOR);
      } catch (e) {
        elements = [];
      }

      for (i = 0; i < elements.length; i++) {
        if (considerCandidate(elements[i])) {
          return;
        }
      }
    }

    /* Permite mesaje custom care nu au o clasa semantica. */
    if (considerCandidate(root)) {
      return;
    }

    /* Textul se poate modifica intr-un copil al containerului de mesaj. */
    current = root.parentElement;

    while (
      current &&
      current !== d.body &&
      current !== d.documentElement &&
      depth < 4
    ) {
      if (considerCandidate(current)) {
        return;
      }

      current = current.parentElement;
      depth++;
    }
  }

  function handleMutations(mutations) {
    var mutation;
    var node;
    var i;
    var j;

    if (!pendingAttempts.length) {
      return;
    }

    for (i = 0; i < mutations.length; i++) {
      invalidateChangedBaselines(mutations[i].target);
    }

    for (i = 0; i < mutations.length; i++) {
      mutation = mutations[i];
      node = mutation.target.nodeType === 3
        ? mutation.target.parentElement
        : mutation.target;

      considerElement(node);

      if (!pendingAttempts.length) {
        return;
      }

      if (mutation.addedNodes) {
        for (j = 0; j < mutation.addedNodes.length; j++) {
          node = mutation.addedNodes[j].nodeType === 3
            ? mutation.addedNodes[j].parentElement
            : mutation.addedNodes[j];

          considerElement(node);

          if (!pendingAttempts.length) {
            return;
          }
        }
      }
    }
  }

  d.addEventListener('input', function (event) {
    handleInteraction(event.target);
  }, true);

  d.addEventListener('change', function (event) {
    handleInteraction(event.target);
  }, true);

  d.addEventListener('click', function (event) {
    var trigger = closestAny(event.target, CONFIG.submitSelectors);
    var container;

    if (!trigger) {
      return;
    }

    container = findContainer(trigger);

    if (container) {
      markSubmissionAttempt(container, 'click');
    }
  }, true);

  d.addEventListener('submit', function (event) {
    var container = findContainer(event.target);

    if (container) {
      markSubmissionAttempt(container, 'submit');
    }
  }, true);

  /* FormData acopera si unele trimiteri pornite programatic. */
  d.addEventListener('formdata', function (event) {
    var container = findContainer(event.target);

    if (container) {
      markSubmissionAttempt(container, 'formdata');
    }
  }, true);

  d.addEventListener('keydown', function (event) {
    var key = event.key || event.keyCode;
    var container;
    var tag = String(event.target && event.target.tagName || '').toLowerCase();

    if (
      (key !== 'Enter' && key !== 13) ||
      tag === 'textarea' ||
      (event.target && event.target.getAttribute('contenteditable') === 'true')
    ) {
      return;
    }

    container = findContainer(event.target);

    if (container) {
      markSubmissionAttempt(container, 'enter');
    }
  }, true);

  /* Contact Form 7: succes confirmat de evenimentul oficial al pluginului. */
  d.addEventListener('wpcf7mailsent', function (event) {
    var container = closestAny(event.target, ['.wpcf7']) || event.target;

    if (event.detail && event.detail.inputs) {
      captureNamedInputs(container, event.detail.inputs);
    }

    pushPlatformSuccess(
      container,
      'wpcf7mailsent',
      event.detail && event.detail.contactFormId
    );
  }, false);

  /* Gravity Forms AJAX: se ataseaza daca jQuery este disponibil. */
  function attachGravityFormsListener() {
    if (!w.jQuery || w.__gtmGravitySuccessListenerInstalled) {
      return;
    }

    w.__gtmGravitySuccessListenerInstalled = true;
    w.jQuery(d).on(
      'gform_confirmation_loaded.gtmUniversalFormTracker',
      function (event, formId) {
        var container =
          d.getElementById('gform_confirmation_wrapper_' + formId) ||
          d.getElementById('gform_wrapper_' + formId) ||
          d.getElementById('gform_' + formId);

        if (container) {
          pushPlatformSuccess(container, 'gform_confirmation_loaded', formId);
        }
      }
    );
  }

  attachGravityFormsListener();

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', attachGravityFormsListener, false);
  }

  if (w.MutationObserver) {
    new w.MutationObserver(handleMutations).observe(d.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'hidden',
        'aria-hidden',
        'aria-live'
      ],
      characterData: true
    });
  } else {
    log('MutationObserver nu este disponibil in acest browser.');
  }
})(window, document);
</script>
