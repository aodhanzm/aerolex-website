// AeroLex web analytics
// - Loads GA4 (G-KKEJ0GQJ9Z) behind Google Consent Mode v2.
// - Default: analytics_storage = denied. Flips to granted only after user accepts.
// - Renders a one-bar consent banner on first visit; choice stored in localStorage for 365 days.
// - Tracks CTA clicks (Calendly + email) with link_location, link_text, page_path.
// Referenced from every page's <head> via <script async src="[relative]/assets/analytics.js"></script>.

(function () {
  var GA_ID = 'G-KKEJ0GQJ9Z';
  var CONSENT_KEY = 'aerolex_consent';
  var CONSENT_TTL_DAYS = 365;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  function readConsent() {
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var ageMs = Date.now() - (parsed.timestamp || 0);
      if (ageMs > CONSENT_TTL_DAYS * 86400000) return null;
      return parsed.value === 'granted' ? 'granted' : 'denied';
    } catch (_) { return null; }
  }

  function writeConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ value: value, timestamp: Date.now() }));
    } catch (_) {}
  }

  var saved = readConsent();
  var initialAnalytics = saved === 'granted' ? 'granted' : 'denied';

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: initialAnalytics,
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  // ---- CTA click tracking ----
  function ctaLocation(link) {
    if (link.closest('header')) return 'header';
    if (link.closest('footer')) return 'footer';
    var section = link.closest('section');
    if (section && section.id) return 'section:' + section.id;
    if (section && section.className) return 'section:' + section.className.split(' ')[0];
    return 'unknown';
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var lowerHref = href.toLowerCase();

    if (link.getAttribute('data-action') === 'cookie-settings') {
      e.preventDefault();
      window.AeroLexConsent.reopen();
      return;
    }

    var payload = {
      link_url: link.href,
      link_location: ctaLocation(link),
      link_text: (link.textContent || '').trim().slice(0, 60),
      page_path: location.pathname
    };
    if (href.indexOf('calendly.com/nzepter') !== -1) {
      gtag('event', 'book_call_click', payload);
    } else if (lowerHref.indexOf('mailto:noah@aerolex.dev') === 0) {
      gtag('event', 'email_click', payload);
    }
  });

  // ---- Consent banner ----
  function isSpanish() {
    return (document.documentElement.lang || 'en').toLowerCase().indexOf('es') === 0;
  }

  var COPY = {
    en: {
      message: 'AeroLex uses cookies for analytics. It helps me see what is working. Either choice is fine.',
      accept: 'Accept',
      decline: 'Decline',
      privacy: 'Privacy',
      privacyUrl: '/privacy/',
      label: 'Cookie notice'
    },
    es: {
      message: 'AeroLex usa cookies para analítica. Me ayuda a ver qué está funcionando. Cualquier opción está bien.',
      accept: 'Aceptar',
      decline: 'Rechazar',
      privacy: 'Privacidad',
      privacyUrl: '/es/privacy/',
      label: 'Aviso de cookies'
    }
  };

  function renderBanner() {
    if (document.getElementById('aerolex-consent')) return;
    var lang = isSpanish() ? 'es' : 'en';
    var copy = COPY[lang];
    var el = document.createElement('div');
    el.id = 'aerolex-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-label', copy.label);
    el.innerHTML =
      '<div class="cb-inner">' +
        '<p class="cb-msg">' + copy.message + ' <a class="cb-link" href="' + copy.privacyUrl + '">' + copy.privacy + '</a></p>' +
        '<div class="cb-actions">' +
          '<button type="button" class="cb-btn cb-decline">' + copy.decline + '</button>' +
          '<button type="button" class="cb-btn cb-accept">' + copy.accept + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.cb-accept').addEventListener('click', acceptConsent);
    el.querySelector('.cb-decline').addEventListener('click', declineConsent);
  }

  function dismissBanner() {
    var el = document.getElementById('aerolex-consent');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function acceptConsent() {
    writeConsent('granted');
    gtag('consent', 'update', { analytics_storage: 'granted' });
    dismissBanner();
  }

  function declineConsent() {
    writeConsent('denied');
    gtag('consent', 'update', { analytics_storage: 'denied' });
    dismissBanner();
  }

  window.AeroLexConsent = {
    accept: acceptConsent,
    decline: declineConsent,
    reopen: function () {
      try { localStorage.removeItem(CONSENT_KEY); } catch (_) {}
      renderBanner();
    }
  };

  function init() {
    if (saved === null) renderBanner();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
