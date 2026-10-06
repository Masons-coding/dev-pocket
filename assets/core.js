/* Shared client code: theme, mobile menu, consent-gated ads, small helpers. No tracking, no cookies unless ads are enabled AND the visitor accepts. */
(function (root, factory) { var api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.U = api; })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var U = {};
  U.$ = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  U.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  U.num = function (v, d) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : (d == null ? 0 : d); };
  U.fmt = function (n, dp, lang) { if (!isFinite(n)) return '-'; try { return new Intl.NumberFormat(lang || undefined, { maximumFractionDigits: dp == null ? 2 : dp, minimumFractionDigits: 0 }).format(n); } catch (e) { return String(Math.round(n * 100) / 100); } };
  U.money = function (n, cur) { if (!isFinite(n)) return '-'; try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'CAD' }).format(n); } catch (e) { return '$' + (Math.round(n * 100) / 100).toFixed(2); } };
  U.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 150); }; };
  U.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  U.on = function (el, ev, fn) { if (el) el.addEventListener(ev, fn); };
  U.copy = function (text, btn) {
    var done = function () { if (btn) { var o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = o; }, 1200); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); }); else fallback();
    function fallback() { var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } document.body.removeChild(t); done(); }
  };
  U.fetchJSON = function (url, ms) {
    return new Promise(function (resolve, reject) {
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('timeout')); }, ms || 8000);
      fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(resolve, function (e) { clearTimeout(t); reject(e); });
    });
  };
  U.ago = function (iso) {
    var t = Date.parse(iso); if (!isFinite(t)) return ''; var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; if (s < 86400 * 14) return Math.round(s / 86400) + ' d ago';
    try { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return ''; }
  };
  if (typeof document === 'undefined') return U;

  /* theme */
  var KEY = 'site-theme', docEl = document.documentElement;
  function applyTheme(t) { if (t === 'light' || t === 'dark') docEl.setAttribute('data-theme', t); else docEl.removeAttribute('data-theme'); var b = U.$('#theme-btn'); if (b) { var dark = docEl.getAttribute('data-theme') === 'dark' || (!docEl.getAttribute('data-theme') && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); b.textContent = dark ? '☀️' : '🌙'; b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'); } }
  applyTheme(U.store.get(KEY, null));
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(U.store.get(KEY, null));
    U.on(U.$('#theme-btn'), 'click', function () { var dark = docEl.getAttribute('data-theme') === 'dark' || (!docEl.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches); var next = dark ? 'light' : 'dark'; U.store.set(KEY, next); applyTheme(next); });
    var mb = U.$('#menu-btn'), nav = U.$('#nav');
    U.on(mb, 'click', function () { var open = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    var y = U.$('#year'); if (y) y.textContent = new Date().getFullYear();
    initAds();
  });

  /* ads: nothing loads unless SITE_CONFIG.adsenseClient is set AND the visitor accepted */
  function initAds() {
    var cfg = window.SITE_CONFIG || {}, client = cfg.adsenseClient;
    if (!client) return;
    var choice = U.store.get('ads-consent', null), bar = U.$('#consent');
    if (choice === null && bar) { bar.hidden = false; U.on(U.$('#consent-yes'), 'click', function () { U.store.set('ads-consent', 'granted'); bar.hidden = true; loadAds(client); }); U.on(U.$('#consent-no'), 'click', function () { U.store.set('ads-consent', 'denied'); bar.hidden = true; }); }
    if (choice === 'granted') loadAds(client);
    U.on(U.$('#ads-settings'), 'click', function (e) { e.preventDefault(); localStorage.removeItem('ads-consent'); location.reload(); });
  }
  function loadAds(client) {
    var cfg = window.SITE_CONFIG || {}, slots = U.$$('.ad'); if (!slots.length) return;
    var s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous'; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    s.onload = function () { slots.forEach(function (box) { var slot = (cfg.slots || {})[box.getAttribute('data-ad')] || ''; box.hidden = false; box.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + U.esc(client) + '"' + (slot ? ' data-ad-slot="' + U.esc(slot) + '"' : '') + ' data-ad-format="auto" data-full-width-responsive="true"></ins>'; try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ad blocked */ } }); };
    document.head.appendChild(s);
  }
  return U;
});
