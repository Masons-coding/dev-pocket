/* DevPocket core functions - pure and unit-tested (test/tools.test.js). Everything runs locally in the browser. */
(function (root, factory) { var api = factory(root); if (typeof module === 'object' && module.exports) module.exports = api; else root.DP = api; })(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var T = {};
  var cryptoObj = (root && root.crypto) || (typeof require === 'function' ? require('crypto').webcrypto : null);
  /* JSON */
  T.jsonFormat = function (text, indent, sortKeys) {
    if (!String(text).trim()) return { ok: false, error: 'Paste some JSON first.' };
    try { var v = JSON.parse(text); if (sortKeys) v = sortDeep(v); return { ok: true, out: JSON.stringify(v, null, indent === 'tab' ? '\t' : (Number(indent) || 2)), type: Array.isArray(v) ? 'array (' + v.length + ' items)' : v === null ? 'null' : typeof v === 'object' ? 'object (' + Object.keys(v).length + ' keys)' : typeof v }; }
    catch (e) { var m = /position (\d+)/.exec(e.message), pos = m ? +m[1] : -1, loc = ''; if (pos >= 0) { var before = text.slice(0, pos).split('\n'); loc = ' (line ' + before.length + ', column ' + (before[before.length - 1].length + 1) + ')'; } return { ok: false, error: e.message.replace(/ in JSON at position \d+.*/, '') + loc }; }
  };
  T.jsonMinify = function (text) { try { return { ok: true, out: JSON.stringify(JSON.parse(text)) }; } catch (e) { return { ok: false, error: e.message }; } };
  function sortDeep(v) { if (Array.isArray(v)) return v.map(sortDeep); if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortDeep(v[k]); }); return o; } return v; }
  /* Base64 (UTF-8 safe) */
  function utf8Bytes(s) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Buffer.from(s, 'utf8'); }
  function utf8Str(b) { return typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: true }).decode(b) : Buffer.from(b).toString('utf8'); }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  T.b64enc = function (s, urlSafe) { var b = utf8Bytes(String(s)), o = ''; for (var i = 0; i < b.length; i += 3) { var n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0); o += B64[n >> 18 & 63] + B64[n >> 12 & 63] + (i + 1 < b.length ? B64[n >> 6 & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '='); } if (urlSafe) o = o.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return o; };
  T.b64dec = function (s) { s = String(s).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'); if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return { ok: false, error: 'That is not valid Base64 (unexpected characters).' }; while (s.length % 4) s += '='; var bytes = [], i; for (i = 0; i < s.length; i += 4) { var c = [0, 1, 2, 3].map(function (k) { return s[i + k] === '=' ? 0 : B64.indexOf(s[i + k]); }), n = (c[0] << 18) | (c[1] << 12) | (c[2] << 6) | c[3]; bytes.push(n >> 16 & 255); if (s[i + 2] !== '=') bytes.push(n >> 8 & 255); if (s[i + 3] !== '=') bytes.push(n & 255); } try { return { ok: true, out: utf8Str(new Uint8Array(bytes)) }; } catch (e) { return { ok: false, error: 'Decoded bytes are not valid UTF-8 text (it may be binary data).' }; } };
  /* URL */
  T.urlEnc = function (s, whole) { try { return { ok: true, out: whole ? encodeURI(s) : encodeURIComponent(s) }; } catch (e) { return { ok: false, error: 'Cannot encode (broken surrogate pair).' }; } };
  T.urlDec = function (s, plus) { try { return { ok: true, out: decodeURIComponent(plus ? String(s).replace(/\+/g, ' ') : s) }; } catch (e) { return { ok: false, error: 'Invalid percent-encoding (a % sign is not followed by two hex digits).' }; } };
  T.parseQuery = function (s) { var q = String(s).replace(/^[^?]*\?/, '').replace(/#.*$/, ''), out = []; q.split('&').filter(Boolean).forEach(function (p) { var i = p.indexOf('='), k = i < 0 ? p : p.slice(0, i), v = i < 0 ? '' : p.slice(i + 1); try { out.push([decodeURIComponent(k.replace(/\+/g, ' ')), decodeURIComponent(v.replace(/\+/g, ' '))]); } catch (e) { out.push([k, v]); } }); return out; };
  /* random helpers */
  function randInt(max) { var lim = Math.floor(0x100000000 / max) * max, a = new Uint32Array(1); do { cryptoObj.getRandomValues(a); } while (a[0] >= lim); return a[0] % max; }
  T.randInt = randInt;
  T.uuid = function () { var b = new Uint8Array(16); cryptoObj.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); };
  T.isUuid = function (s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s).trim()); };
  /* hashing */
  T.hash = function (algo, text) { return cryptoObj.subtle.digest(algo, utf8Bytes(String(text))).then(function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); };
  /* timestamps */
  T.tsConvert = function (input, now) {
    var s = String(input).trim(), d; if (!s) return { ok: false, error: 'Enter a Unix timestamp or a date.' };
    if (/^-?\d+(\.\d+)?$/.test(s)) { var n = parseFloat(s), abs = Math.abs(n); var ms = abs >= 1e17 ? n / 1e6 : abs >= 1e14 ? n / 1e3 : abs >= 1e11 ? n : n * 1000; d = new Date(ms); var unit = abs >= 1e17 ? 'nanoseconds' : abs >= 1e14 ? 'microseconds' : abs >= 1e11 ? 'milliseconds' : 'seconds'; } else { d = new Date(s); var unit = 'date text'; }
    if (isNaN(d.getTime())) return { ok: false, error: 'Could not understand that. Try a Unix time like 1700000000 or a date like 2025-03-01T12:00:00Z.' };
    var diff = Math.round(((now == null ? Date.now() : now) - d.getTime()) / 1000), ab = Math.abs(diff), rel = ab < 5 ? 'just now' : (ab < 60 ? ab + ' seconds' : ab < 3600 ? Math.round(ab / 60) + ' minutes' : ab < 86400 ? Math.round(ab / 3600) + ' hours' : Math.round(ab / 86400) + ' days'); if (ab >= 5) rel = diff > 0 ? rel + ' ago' : 'in ' + rel;
    return { ok: true, unit: unit, seconds: Math.floor(d.getTime() / 1000), millis: d.getTime(), iso: d.toISOString(), utc: d.toUTCString(), rel: rel };
  };
  /* regex */
  T.regexTest = function (pattern, flags, text) {
    var re; try { re = new RegExp(pattern, flags.replace(/[^dgimsuvy]/g, '').replace(/g/g, '') + 'g'); } catch (e) { return { ok: false, error: e.message }; }
    var out = [], m, guard = 0; while ((m = re.exec(text)) && guard++ < 2000) { out.push({ index: m.index, text: m[0], groups: m.slice(1), named: m.groups || null }); if (m[0] === '') re.lastIndex++; } return { ok: true, matches: out, truncated: guard >= 2000 };
  };
  /* colour */
  function hex2(n) { return ('0' + Math.round(n).toString(16)).slice(-2); }
  T.parseColor = function (s) {
    s = String(s).trim().toLowerCase(); var m;
    if ((m = /^#?([0-9a-f]{3})$/.exec(s))) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16) };
    if ((m = /^#?([0-9a-f]{6})$/.exec(s))) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) };
    if ((m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/.exec(s))) { var c = { r: +m[1], g: +m[2], b: +m[3] }; return c.r < 256 && c.g < 256 && c.b < 256 ? c : null; }
    if ((m = /^hsla?\(\s*(-?\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)%[\s,]+(\d+(?:\.\d+)?)%/.exec(s))) return hsl2rgb(+m[1], +m[2], +m[3]);
    return null;
  };
  function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b; if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; } return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) }; }
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn; if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }; }
  function lum(c) { var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  T.contrast = function (a, b) { var l1 = lum(a), l2 = lum(b), hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  T.colorInfo = function (s) { var c = T.parseColor(s); if (!c) return { ok: false, error: 'Use a colour like #1e90ff, rgb(30,144,255) or hsl(210,100%,56%).' }; var h = rgb2hsl(c.r, c.g, c.b), cw = T.contrast(c, { r: 255, g: 255, b: 255 }), cb = T.contrast(c, { r: 0, g: 0, b: 0 }); return { ok: true, rgb: c, hex: '#' + hex2(c.r) + hex2(c.g) + hex2(c.b), rgbStr: 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')', hslStr: 'hsl(' + h.h + ', ' + h.s + '%, ' + h.l + '%)', whiteRatio: cw, blackRatio: cb }; };
  /* text */
  T.textStats = function (t) { var words = (t.trim().match(/\S+/g) || []).length; return { chars: t.length, charsNoSpaces: t.replace(/\s/g, '').length, words: words, sentences: (t.match(/[^.!?]+[.!?]+(\s|$)/g) || (t.trim() ? [t] : [])).length, lines: t ? t.split(/\r?\n/).length : 0, paragraphs: t.trim() ? t.trim().split(/\n\s*\n/).length : 0, readMin: words / 238, speakMin: words / 150, bytes: utf8Bytes(t).length }; };
  T.caseConvert = function (t, mode) {
    var words = function (s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.]+/g, ' ').trim().split(/\s+/).filter(Boolean); };
    var cap = function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); };
    switch (mode) { case 'upper': return t.toUpperCase(); case 'lower': return t.toLowerCase(); case 'title': return t.toLowerCase().replace(/(^|[\s\-(])(\p{L})/gu, function (_, a, b) { return a + b.toUpperCase(); }); case 'sentence': return t.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, function (_, a, b) { return a + b.toUpperCase(); });
      case 'camel': return words(t).map(function (w, i) { return i ? cap(w) : w.toLowerCase(); }).join(''); case 'pascal': return words(t).map(cap).join(''); case 'snake': return words(t).map(function (w) { return w.toLowerCase(); }).join('_'); case 'kebab': return words(t).map(function (w) { return w.toLowerCase(); }).join('-'); case 'constant': return words(t).map(function (w) { return w.toUpperCase(); }).join('_'); default: return t; }
  };
  /* passwords */
  T.password = function (len, o) {
    var sets = []; if (o.lower) sets.push('abcdefghijkmnopqrstuvwxyz'); if (o.upper) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ'); if (o.digits) sets.push('23456789'); if (o.symbols) sets.push('!@#$%^&*()-_=+[]{};:,.?'); var extra = o.ambiguous ? 'lIO01' : '';
    if (!sets.length) return { ok: false, error: 'Choose at least one character type.' }; len = Math.max(sets.length, Math.min(128, Math.floor(len) || 16)); var all = sets.join('') + extra, out = sets.map(function (s) { return s[randInt(s.length)]; });
    while (out.length < len) out.push(all[randInt(all.length)]); for (var i = out.length - 1; i > 0; i--) { var j = randInt(i + 1), t = out[i]; out[i] = out[j]; out[j] = t; }
    var bits = len * Math.log2(all.length); return { ok: true, out: out.join(''), bits: bits, strength: bits < 40 ? 'Weak' : bits < 60 ? 'Fair' : bits < 80 ? 'Strong' : 'Very strong' };
  };
  T.passphrase = function (n, sep, words) { var out = []; for (var i = 0; i < n; i++) out.push(words[randInt(words.length)]); return { out: out.join(sep), bits: n * Math.log2(words.length) }; };
  /* lorem */
  var LW = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  T.lorem = function (paras, startClassic) { var out = []; for (var p = 0; p < paras; p++) { var n = 40 + randInt(40), s = [], sent = []; for (var i = 0; i < n; i++) { sent.push(LW[randInt(LW.length)]); if (sent.length >= 6 + randInt(8) || i === n - 1) { var t = sent.join(' '); s.push(t.charAt(0).toUpperCase() + t.slice(1) + '.'); sent = []; } } out.push(s.join(' ')); } if (startClassic && out.length) out[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' + out[0]; return out.join('\n\n'); };
  /* number bases */
  T.baseConvert = function (s, from) { s = String(s).trim().replace(/[_\s]/g, '').toLowerCase(); if (!s) return { ok: false, error: 'Enter a number.' }; var neg = s[0] === '-'; if (neg) s = s.slice(1); s = s.replace(/^0[xbo]/, ''); var digs = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, from); for (var i = 0; i < s.length; i++) if (digs.indexOf(s[i]) < 0) return { ok: false, error: '"' + s[i] + '" is not a valid base-' + from + ' digit.' }; if (!s) return { ok: false, error: 'Enter a number.' }; var v = typeof BigInt !== 'undefined' ? BigInt(0) : 0; if (typeof BigInt === 'undefined') return { ok: false, error: 'This browser is too old for big numbers.' }; var B = BigInt(from); for (var j = 0; j < s.length; j++) v = v * B + BigInt(digs.indexOf(s[j])); if (neg) v = -v; return { ok: true, dec: v.toString(10), hex: v.toString(16), bin: v.toString(2), oct: v.toString(8) }; };
  return T;
});
