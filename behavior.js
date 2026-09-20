(function () {
  'use strict';

  var docEl = document.documentElement;
  var I18N = window.GYMNOW_I18N || { locales: ['en'], names: { en: 'English' }, rtl: [], messages: { en: {} } };
  var SLUG = (docEl.dataset.appSlug || 'app').replace(/[^a-z0-9-]/gi, '') || 'app';
  var LANGS = (docEl.dataset.langs || I18N.locales.join(',')).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var DEFAULT_LANG = LANGS.indexOf('en') >= 0 ? 'en' : LANGS[0];
  var STORE_KEY = SLUG + '-lang';
  var RTL = I18N.rtl || [];
  var snackTimer = null;

  function supported(lang) {
    return LANGS.indexOf(lang) !== -1 && !!I18N.messages[lang];
  }

  function resolveLang() {
    try {
      var fromUrl = new URLSearchParams(window.location.search).get('lang');
      if (fromUrl && supported(fromUrl)) return fromUrl;
    } catch (e) {}
    try {
      var saved = window.localStorage.getItem(STORE_KEY);
      if (saved && supported(saved)) return saved;
    } catch (e) {}
    var browserLang = (navigator.language || DEFAULT_LANG).slice(0, 2).toLowerCase();
    return supported(browserLang) ? browserLang : DEFAULT_LANG;
  }

  function setTextWithBreaks(el, value) {
    while (el.firstChild) el.removeChild(el.firstChild);
    String(value || '').split('|').forEach(function (part, index) {
      if (index) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(part));
    });
  }

  function populateLanguageSelects() {
    document.querySelectorAll('[data-lang-select]').forEach(function (select) {
      while (select.firstChild) select.removeChild(select.firstChild);
      LANGS.forEach(function (lang) {
        var option = document.createElement('option');
        option.value = lang;
        option.setAttribute('data-lang', lang);
        option.textContent = (I18N.names[lang] || lang) + ' · ' + lang.toUpperCase();
        select.appendChild(option);
      });
    });
  }

  function updateMeta(messages) {
    if (messages.metaTitle) document.title = messages.metaTitle;
    var description = document.querySelector('meta[name="description"]');
    if (description && messages.metaDescription) description.setAttribute('content', messages.metaDescription);
    ['og:title', 'twitter:title'].forEach(function (name) {
      var el = document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
      if (el && messages.metaTitle) el.setAttribute('content', messages.metaTitle);
    });
    ['og:description', 'twitter:description'].forEach(function (name) {
      var el = document.querySelector('meta[property="' + name + '"], meta[name="' + name + '"]');
      if (el && messages.metaDescription) el.setAttribute('content', messages.metaDescription);
    });
  }

  function setLang(lang, options) {
    if (!supported(lang)) return;
    var messages = I18N.messages[lang] || I18N.messages[DEFAULT_LANG];
    docEl.lang = lang;
    docEl.dir = RTL.indexOf(lang) >= 0 ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var value = messages[el.getAttribute('data-i18n')];
      if (typeof value === 'string') el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-lines]').forEach(function (el) {
      var value = messages[el.getAttribute('data-i18n-lines')];
      if (typeof value === 'string') setTextWithBreaks(el, value);
    });
    document.querySelectorAll('[data-shot]').forEach(function (img) {
      img.src = 'assets/screenshots/' + lang + '/' + img.getAttribute('data-shot');
    });
    document.querySelectorAll('[data-lang-select]').forEach(function (select) {
      select.value = lang;
      select.setAttribute('aria-label', messages.language || 'Language');
      var container = select.closest('.language-select');
      var compactValue = container && container.querySelector('[data-current-lang-value]');
      if (compactValue) compactValue.textContent = lang.toUpperCase();
    });
    document.querySelectorAll('[data-policy="terms"]').forEach(function (link) {
      link.href = lang === 'es'
        ? 'https://armandojimenez.dev/apps/gymnow/terms-es.html'
        : 'https://armandojimenez.dev/apps/gymnow/terms.html';
    });
    document.querySelectorAll('[data-policy="privacy"]').forEach(function (link) {
      link.href = lang === 'es'
        ? 'https://armandojimenez.dev/apps/gymnow/privacy-policy-es.html'
        : 'https://armandojimenez.dev/apps/gymnow/privacy-policy.html';
    });
    updateMeta(messages);

    try { window.localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    if (!options || options.updateUrl !== false) {
      try {
        var url = new URL(window.location.href);
        if (lang === DEFAULT_LANG) url.searchParams.delete('lang');
        else url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
      } catch (e) {}
    }
  }

  function showSnackbar(text) {
    var el = document.querySelector('.snackbar');
    if (!el) return;
    el.textContent = text;
    el.classList.add('snackbar--show');
    if (snackTimer) clearTimeout(snackTimer);
    snackTimer = setTimeout(function () { el.classList.remove('snackbar--show'); }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try {
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'absolute';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        resolve();
      } catch (error) { reject(error); }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    populateLanguageSelects();
    setLang(resolveLang(), { updateUrl: true });

    document.querySelectorAll('[data-lang-select]').forEach(function (select) {
      select.addEventListener('change', function () { setLang(select.value); });
    });
    document.querySelectorAll('.lang-toggle__btn[data-lang]').forEach(function (button) {
      button.addEventListener('click', function () { setLang(button.getAttribute('data-lang')); });
    });
    document.querySelectorAll('[data-copy-email]').forEach(function (el) {
      el.addEventListener('click', function (event) {
        event.preventDefault();
        var email = el.getAttribute('data-copy-email');
        if (!email) return;
        var messages = I18N.messages[docEl.lang] || I18N.messages[DEFAULT_LANG];
        copyText(email).then(function () { showSnackbar(messages.copied || email); })
          .catch(function () { showSnackbar(email); });
      });
    });

    var nav = document.querySelector('[data-nav]');
    if (nav) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 50); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (event) {
        var id = anchor.getAttribute('href');
        if (!id || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try {
          var url = new URL(window.location.href);
          url.hash = id;
          window.history.pushState({}, '', url);
        } catch (e) {}
      });
    });
  });
})();
