/**
 * Shopify Customer Events -> GTM dataLayer bridge
 *
 * Edit only inside the CONFIGURATION block.
 */

/* ========================================================================== */
/*                           EDIT ONLY THIS BLOCK                             */
/* ========================================================================== */
// ===== CONFIGURATION =====

/** Your GTM container ID */
const GTM_CONTAINER_ID = 'GTM-KJ5V8GFB';

/** dataLayer name used by GTM (usually "dataLayer") */
const DATA_LAYER_NAME = 'dataLayer';

/**
 * Fixed country code for product IDs (for example: 'ZZ', 'US', 'RO').
 * If set to an empty string '', country is auto-detected per event.
 */
const PRODUCT_COUNTRY_CODE = 'ZZ';

/**
 * Product ID format sent to GTM/GA4.
 * - 'shopify'   => shopify_COUNTRY_productId_variantId
 * - 'variant_id' => variant ID only
 * - 'parent_id'  => product ID only
 */
const PRODUCT_ID_TYPE = 'shopify';

/** Set true to log every event pushed to dataLayer in the browser console */
const DEBUG_MODE = false;

/** Optional: customize pushed event names */
const GTM_EVENT_NAMES = {
  purchase: 'purchase',
  addToCart: 'add_to_cart',
  removeFromCart: 'remove_from_cart',
  beginCheckout: 'begin_checkout',
  viewItem: 'view_item',
  pageView: 'page_view',
  cookieUpdate: 'cookie_update',
  formSubmitComplete: 'form_submit_complete'
};

/**
 * DOM form tracking in Shopify Customer Events.
 * Uses analytics.subscribe('clicked') and analytics.subscribe('form_submitted').
 */
const FORM_TRACKING = {
  enabled: true,
  trackClickedSubmitButtons: true,
  trackFormSubmitted: true,
  dedupeWindowMs: 1200,
  clickFallbackDelayMs: 800,
  ignoreClickedEventWhenFormIdMissing: true,
  submitButtonIdIncludes: ['wizard__submit'],
  submitButtonNameIncludes: [],
  submitButtonTextIncludes: ['trimite cererea', 'submit', 'send', 'continue']
};

/** Purchase dedupe (same order id in short time window) */
const PURCHASE_TRACKING = {
  dedupeWindowMs: 24 * 60 * 60 * 1000
};

// ===== END CONFIGURATION =====
/* ========================================================================== */
/*                        DO NOT EDIT BELOW THIS LINE                         */
/* ========================================================================== */

// ===== GTM LOADER =====

(function loadGtm(w, d, s, l, containerId) {
  if (!containerId) return;

  w[l] = w[l] || [];

  // Guard against duplicate GTM injections in the same runtime.
  if (w.__SHOPIFY_CUSTOM_PIXEL_GTM_LOADED__) return;
  w.__SHOPIFY_CUSTOM_PIXEL_GTM_LOADED__ = true;

  w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const firstScript = d.getElementsByTagName(s)[0];
  const script = d.createElement(s);
  const dataLayerQuery = l !== 'dataLayer' ? '&l=' + l : '';

  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=' + containerId + dataLayerQuery;

  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
    return;
  }

  const fallbackParent = d.head || d.body || d.documentElement;
  if (fallbackParent) {
    fallbackParent.appendChild(script);
  }
})(window, document, 'script', DATA_LAYER_NAME, GTM_CONTAINER_ID);

// ===== HELPERS =====

const getDataLayer = () => {
  window[DATA_LAYER_NAME] = window[DATA_LAYER_NAME] || [];
  return window[DATA_LAYER_NAME];
};

const debugLog = (label, payload) => {
  if (!DEBUG_MODE) return;
  console.log('[DEBUG] ' + label + ':', payload);
};

const EVENTS_THAT_CLEAR_ECOMMERCE = new Set([
  GTM_EVENT_NAMES.purchase,
  GTM_EVENT_NAMES.addToCart,
  GTM_EVENT_NAMES.removeFromCart,
  GTM_EVENT_NAMES.beginCheckout,
  GTM_EVENT_NAMES.viewItem
]);

const pushToDataLayer = (payload) => {
  const dataLayer = getDataLayer();

  if (EVENTS_THAT_CLEAR_ECOMMERCE.has(payload?.event)) {
    const clearPayload = { ecommerce: null };
    dataLayer.push(clearPayload);
    if (DEBUG_MODE) {
      console.log('[DEBUG][datalayer_clear]', clearPayload);
    }
  }

  dataLayer.push(payload);
  if (DEBUG_MODE) {
    const eventName = payload?.event || 'unknown_event';
    console.log('[DEBUG][' + eventName + ']', payload);
  }
};

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const includesAny = (source, needles) => {
  const haystack = normalizeText(source);
  if (!haystack) return false;

  for (const needle of needles || []) {
    const normalizedNeedle = normalizeText(needle);
    if (normalizedNeedle && haystack.indexOf(normalizedNeedle) !== -1) {
      return true;
    }
  }

  return false;
};

const FORM_EVENT_DEDUPE_STORE = Object.create(null);
const PURCHASE_EVENT_DEDUPE_STORE = Object.create(null);
const PENDING_FORM_CLICK_TIMERS = Object.create(null);

const isDuplicateFormEvent = (dedupeKey, eventTimestamp) => {
  if (!dedupeKey) return false;

  const eventMs = Date.parse(eventTimestamp);
  const now = Number.isFinite(eventMs) ? eventMs : Date.now();
  const last = FORM_EVENT_DEDUPE_STORE[dedupeKey] || 0;

  if (now - last < FORM_TRACKING.dedupeWindowMs) {
    return true;
  }

  FORM_EVENT_DEDUPE_STORE[dedupeKey] = now;
  return false;
};

const isDuplicatePurchaseEvent = (transactionId, eventTimestamp) => {
  if (!transactionId) return false;

  const eventMs = Date.parse(eventTimestamp);
  const now = Number.isFinite(eventMs) ? eventMs : Date.now();
  const last = PURCHASE_EVENT_DEDUPE_STORE[transactionId] || 0;

  if (now - last < PURCHASE_TRACKING.dedupeWindowMs) {
    return true;
  }

  PURCHASE_EVENT_DEDUPE_STORE[transactionId] = now;
  return false;
};

const buildFormContextKey = (clientId, pagePath) => {
  return normalizeText(clientId) + '|' + normalizeText(pagePath);
};

const clearPendingFormClick = (contextKey) => {
  if (!contextKey) return;
  const timerId = PENDING_FORM_CLICK_TIMERS[contextKey];
  if (!timerId) return;

  clearTimeout(timerId);
  delete PENDING_FORM_CLICK_TIMERS[contextKey];
};

const buildFormSubmitDedupeKey = (clientId, pagePath) => {
  return 'form_submit_complete|' + buildFormContextKey(clientId, pagePath);
};

const normalizeCountryCode = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : '';
};

const getCountryCodeFromPathname = (pathname) => {
  if (!pathname) return '';

  const localeMatch = pathname.match(/^\/[a-z]{2}[-_]?([a-z]{2})(?:\/|$)/i);
  if (localeMatch && localeMatch[1]) {
    return normalizeCountryCode(localeMatch[1]);
  }

  const countryOnlyMatch = pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
  if (countryOnlyMatch && countryOnlyMatch[1]) {
    return normalizeCountryCode(countryOnlyMatch[1]);
  }

  return '';
};

/**
 * Country rule:
 * 1) If PRODUCT_COUNTRY_CODE is set, always use it.
 * 2) If empty, auto-detect from event/storefront context.
 * 3) If still unknown, fallback to 'ZZ'.
 */
const resolveProductCountryCode = (event) => {
  const configuredCode = normalizeCountryCode(PRODUCT_COUNTRY_CODE);
  if (configuredCode) return configuredCode;

  const candidates = [
    event?.data?.checkout?.shippingAddress?.countryCode,
    event?.data?.checkout?.billingAddress?.countryCode,
    event?.data?.checkout?.order?.shippingAddress?.countryCode,
    event?.data?.checkout?.order?.billingAddress?.countryCode,
    event?.data?.cart?.buyerIdentity?.countryCode,
    window?.Shopify?.country,
    getCountryCodeFromPathname(event?.context?.window?.location?.pathname)
  ];

  for (const candidate of candidates) {
    const code = normalizeCountryCode(candidate);
    if (code) return code;
  }

  return 'ZZ';
};

const getDiscountName = (discountApplications) => {
  if (discountApplications && discountApplications.length > 0) {
    return discountApplications[0].title;
  }
  return '';
};

const addCategories = (item, productType) => {
  if (!productType) return item;

  const categories = productType.split('>').map((category) => category.trim());

  categories.forEach((category, index) => {
    if (index < 5) {
      const key = index === 0 ? 'item_category' : 'item_category' + (index + 1);
      item[key] = category;
    }
  });

  return item;
};

const buildItemId = (productId, variantId, idType, countryCode) => {
  if (idType === 'parent_id') return productId;
  if (idType === 'variant_id') return variantId;
  return 'shopify_' + countryCode + '_' + productId + '_' + variantId;
};

const calculateTotalDiscount = (lineItems) => {
  let totalDiscount = 0;

  (lineItems || []).forEach((item) => {
    (item.discountAllocations || []).forEach((discount) => {
      totalDiscount += toNumber(discount?.amount?.amount);
    });
  });

  return Number(totalDiscount.toFixed(2));
};

const createCheckoutLineItems = (checkout, idType, countryCode) => {
  let index = 1;

  return (checkout?.lineItems || []).map((item) => {
    const productId = item.variant?.product?.id;
    const variantId = item.variant?.id;
    const quantity = Math.max(1, Math.round(toNumber(item.quantity)));

    const discount = (item.discountAllocations || []).reduce((total, discountAllocation) => {
      return total + toNumber(discountAllocation?.amount?.amount);
    }, 0);

    const unitPrice = toNumber(item.variant?.price?.amount);
    const unitDiscount = discount / quantity;
    const netUnitPrice = Math.max(0, unitPrice - unitDiscount);

    const lineItem = {
      item_id: buildItemId(productId, variantId, idType, countryCode),
      parent_id: productId,
      variant_id: variantId,
      item_name: item.variant?.product?.title,
      item_brand: item.variant?.product?.vendor,
      item_variant: item.variant?.title,
      coupon: getDiscountName(checkout?.discountApplications),
      price: netUnitPrice,
      quantity: quantity,
      index: index
    };

    index += 1;
    return addCategories(lineItem, item.variant?.product?.type);
  });
};

const createCartLineItem = (cartLine, idType, countryCode) => {
  const productId = cartLine?.merchandise?.product?.id;
  const variantId = cartLine?.merchandise?.id;

  const item = {
    item_id: buildItemId(productId, variantId, idType, countryCode),
    parent_id: productId,
    variant_id: variantId,
    item_name: cartLine?.merchandise?.product?.title,
    item_brand: cartLine?.merchandise?.product?.vendor,
    item_variant: cartLine?.merchandise?.title,
    price: cartLine?.merchandise?.price?.amount,
    quantity: cartLine?.quantity
  };

  return addCategories(item, cartLine?.merchandise?.product?.type);
};

const createProductViewItem = (productVariant, idType, countryCode) => {
  const productId = productVariant?.product?.id;
  const variantId = productVariant?.id;

  const item = {
    item_id: buildItemId(productId, variantId, idType, countryCode),
    parent_id: productId,
    variant_id: variantId,
    item_name: productVariant?.product?.title,
    item_brand: productVariant?.product?.vendor,
    item_variant: productVariant?.title,
    price: productVariant?.price?.amount,
    quantity: 1
  };

  return addCategories(item, productVariant?.product?.type);
};

const buildUserData = (checkout) => {
  const userData = {};

  if (checkout?.email) {
    userData.email = checkout.email;
  }

  if (checkout?.phone) {
    userData.phone_number = checkout.phone;
  } else if (checkout?.shippingAddress?.phone) {
    userData.phone_number = checkout.shippingAddress.phone;
  }

  if (checkout?.shippingAddress) {
    userData.address = {
      first_name: checkout.shippingAddress.firstName,
      last_name: checkout.shippingAddress.lastName,
      street: checkout.shippingAddress.address1,
      city: checkout.shippingAddress.city,
      region: checkout.shippingAddress.province,
      postal_code: checkout.shippingAddress.zip,
      country: checkout.shippingAddress.countryCode
    };
  }

  return userData;
};

const findInputValue = (elements, matcher) => {
  for (const element of elements || []) {
    if (!element || !matcher(element)) continue;
    const value = typeof element.value === 'string' ? element.value.trim() : '';
    if (value) return value;
  }
  return '';
};

const buildFormUserDataFromElements = (elements) => {
  const userData = {};

  const email = findInputValue(elements, (el) => {
    const type = normalizeText(el.type);
    const name = normalizeText(el.name);
    const id = normalizeText(el.id);
    return type === 'email' || name.indexOf('email') !== -1 || id.indexOf('email') !== -1;
  });

  const phone = findInputValue(elements, (el) => {
    const type = normalizeText(el.type);
    const name = normalizeText(el.name);
    const id = normalizeText(el.id);
    return (
      type === 'tel' ||
      name.indexOf('phone') !== -1 ||
      name.indexOf('mobile') !== -1 ||
      id.indexOf('phone') !== -1
    );
  });

  if (email) {
    userData.email = email;
  }

  if (phone) {
    userData.phone_number = phone;
  }

  return userData;
};

const shouldTrackSubmitButtonClick = (element) => {
  if (!element) return false;

  const tagName = normalizeText(element.tagName);
  const type = normalizeText(element.type);
  const id = normalizeText(element.id);
  const name = normalizeText(element.name);
  const value = normalizeText(element.value);

  const isSubmitButton = (tagName === 'button' || tagName === 'input') && type === 'submit';
  const idMatches = includesAny(id, FORM_TRACKING.submitButtonIdIncludes);
  const nameMatches = includesAny(name, FORM_TRACKING.submitButtonNameIncludes);
  const textMatches = includesAny(value, FORM_TRACKING.submitButtonTextIncludes);

  return isSubmitButton || idMatches || nameMatches || textMatches;
};

const resolveFormIdForClickedEvent = (element) => {
  return (
    element?.formId ||
    element?.form?.id ||
    element?.formAction ||
    element?.form?.action ||
    element?.id ||
    element?.name ||
    element?.value ||
    '(no form id)'
  );
};

const resolveFormIdForSubmittedEvent = (formElement) => {
  return formElement?.id || formElement?.action || '(no form id)';
};

// ===== EVENT SUBSCRIPTIONS =====

if (typeof analytics !== 'undefined' && analytics && typeof analytics.subscribe === 'function') {
  analytics.subscribe('checkout_completed', (event) => {
    const checkout = event?.data?.checkout;
    if (!checkout) return;
    const transactionId = checkout.order?.id || '';
    if (isDuplicatePurchaseEvent(transactionId, event?.timestamp)) return;

    const productCountryCode = resolveProductCountryCode(event);
    const lineItemsData = createCheckoutLineItems(checkout, PRODUCT_ID_TYPE, productCountryCode);
    const totalDiscountAmount = calculateTotalDiscount(checkout.lineItems);

    const dataToPush = {
      event: GTM_EVENT_NAMES.purchase,
      ecommerce: {
        transaction_id: transactionId,
        affiliation: checkout.order?.shop?.name,
        value: checkout.totalPrice?.amount,
        tax: checkout.totalTax?.amount,
        shipping: checkout.shippingLine?.price?.amount,
        currency: checkout.currencyCode,
        coupon: getDiscountName(checkout.discountApplications),
        discount: totalDiscountAmount,
        items: lineItemsData,
        new_customer: checkout.order?.customer?.isFirstOrder
      },
      user_data: buildUserData(checkout)
    };

    pushToDataLayer(dataToPush);
  });

  analytics.subscribe('product_added_to_cart', (event) => {
    const cartLine = event?.data?.cartLine;
    if (!cartLine) return;

    const productCountryCode = resolveProductCountryCode(event);
    const item = createCartLineItem(cartLine, PRODUCT_ID_TYPE, productCountryCode);

    const dataToPush = {
      event: GTM_EVENT_NAMES.addToCart,
      ecommerce: {
        currency: cartLine.cost?.totalAmount?.currencyCode,
        value: cartLine.cost?.totalAmount?.amount,
        items: [item]
      }
    };

    pushToDataLayer(dataToPush);
  });

  analytics.subscribe('product_removed_from_cart', (event) => {
    const cartLine = event?.data?.cartLine;
    if (!cartLine) return;

    const productCountryCode = resolveProductCountryCode(event);
    const item = createCartLineItem(cartLine, PRODUCT_ID_TYPE, productCountryCode);

    const dataToPush = {
      event: GTM_EVENT_NAMES.removeFromCart,
      ecommerce: {
        currency: cartLine.cost?.totalAmount?.currencyCode,
        value: cartLine.cost?.totalAmount?.amount,
        items: [item]
      }
    };

    pushToDataLayer(dataToPush);
  });

  analytics.subscribe('checkout_started', (event) => {
    const checkout = event?.data?.checkout;
    if (!checkout || !checkout.lineItems) return;

    const productCountryCode = resolveProductCountryCode(event);
    const items = createCheckoutLineItems(checkout, PRODUCT_ID_TYPE, productCountryCode);

    const dataToPush = {
      event: GTM_EVENT_NAMES.beginCheckout,
      ecommerce: {
        currency: checkout.currencyCode,
        value: checkout.subtotalPrice?.amount,
        items: items
      }
    };

    pushToDataLayer(dataToPush);
  });

  analytics.subscribe('product_viewed', (event) => {
    const productVariant = event?.data?.productVariant;
    if (!productVariant) return;

    const productCountryCode = resolveProductCountryCode(event);
    const item = createProductViewItem(productVariant, PRODUCT_ID_TYPE, productCountryCode);

    const dataToPush = {
      event: GTM_EVENT_NAMES.viewItem,
      ecommerce: {
        currency: productVariant.price?.currencyCode,
        value: productVariant.price?.amount,
        items: [item]
      }
    };

    pushToDataLayer(dataToPush);
  });

  analytics.subscribe('cookie_accepted', () => {
    const dataToPush = { event: GTM_EVENT_NAMES.cookieUpdate };
    pushToDataLayer(dataToPush);
  });

  analytics.subscribe('page_viewed', (event) => {
    const dataToPush = {
      event: GTM_EVENT_NAMES.pageView,
      page_title: event?.context?.document?.title,
      page_location: event?.context?.window?.location?.href,
      page_path: event?.context?.window?.location?.pathname,
      page_referrer: event?.context?.document?.referrer,
      client_id: event?.clientId,
      timestamp: event?.timestamp
    };

    pushToDataLayer(dataToPush);
  });

  if (FORM_TRACKING.enabled && FORM_TRACKING.trackClickedSubmitButtons) {
    analytics.subscribe('clicked', (event) => {
      const element = event?.data?.element;
      if (!shouldTrackSubmitButtonClick(element)) return;

      const formId = resolveFormIdForClickedEvent(element);
      const pagePath = event?.context?.window?.location?.pathname || '';
      const clientId = event?.clientId || '';
      const contextKey = buildFormContextKey(clientId, pagePath);

      if (FORM_TRACKING.ignoreClickedEventWhenFormIdMissing && formId === '(no form id)') {
        return;
      }

      const dataToPush = {
        event: GTM_EVENT_NAMES.formSubmitComplete,
        trigger_type: 'click',
        form_id: formId,
        trigger_id: element?.id || '',
        trigger_name: element?.name || '',
        trigger_text: element?.value || '',
        timestamp: event?.timestamp,
        client_id: clientId
      };

      const pushClickFallback = () => {
        const dedupeKey = buildFormSubmitDedupeKey(clientId, pagePath);
        if (isDuplicateFormEvent(dedupeKey, event?.timestamp)) return;
        pushToDataLayer(dataToPush);
      };

      if (FORM_TRACKING.trackFormSubmitted && FORM_TRACKING.clickFallbackDelayMs > 0) {
        clearPendingFormClick(contextKey);

        PENDING_FORM_CLICK_TIMERS[contextKey] = setTimeout(() => {
          delete PENDING_FORM_CLICK_TIMERS[contextKey];
          pushClickFallback();
        }, FORM_TRACKING.clickFallbackDelayMs);
        return;
      }

      pushClickFallback();
    });
  }

  if (FORM_TRACKING.enabled && FORM_TRACKING.trackFormSubmitted) {
    analytics.subscribe('form_submitted', (event) => {
      const formElement = event?.data?.element;
      if (!formElement) return;

      const formId = resolveFormIdForSubmittedEvent(formElement);
      const pagePath = event?.context?.window?.location?.pathname || '';
      const clientId = event?.clientId || '';
      const contextKey = buildFormContextKey(clientId, pagePath);
      clearPendingFormClick(contextKey);

      const dedupeKey = buildFormSubmitDedupeKey(clientId, pagePath);
      if (isDuplicateFormEvent(dedupeKey, event?.timestamp)) return;

      const dataToPush = {
        event: GTM_EVENT_NAMES.formSubmitComplete,
        trigger_type: 'submit',
        form_id: formId,
        form_action: formElement?.action || '',
        timestamp: event?.timestamp,
        client_id: clientId,
        user_data: buildFormUserDataFromElements(formElement?.elements)
      };

      pushToDataLayer(dataToPush);
    });
  }
} else {
  debugLog('Init', 'analytics.subscribe is unavailable in this context.');
}
