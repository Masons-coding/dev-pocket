/* DevPocket UI: one init per tool, chosen by <main data-tool>. No network calls; nothing you type leaves the page. */
(function () {
  'use strict';
  var root = U.$('[data-tool]'); if (!root || !window.DP) return;
  var id = root.getAttribute('data-tool'), $ = function (s) { return U.$(s, root); };
  function status(msg, bad) { var s = $('#status'); if (!s) return; s.textContent = msg || ''; s.className = 'meta ' + (bad ? 'err' : ''); s.setAttribute('role', bad ? 'alert' : 'status'); }
  function copyBtn(btn, getter) { U.on(btn, 'click', function () { var t = getter(); if (t) U.copy(t, btn); }); }
  function kv(el, pairs) { el.innerHTML = '<div class="kv">' + pairs.map(function (p) { return '<div><small>' + U.esc(p[0]) + '</small><b>' + U.esc(p[1]) + '</b></div>'; }).join('') + '</div>'; }
  function saveText(key, el) { var v = U.store.get(key, null); if (v && !el.value) el.value = v; U.on(el, 'input', U.debounce(function () { if (el.value.length < 200000) U.store.set(key, el.value); }, 400)); }
  var init = {
    json: function () {
      var inp = $('#in'), out = $('#out'), run = function (min) { var r = min ? DP.jsonMinify(inp.value) : DP.jsonFormat(inp.value, $('#indent').value, $('#sort').checked); if (r.ok) { out.value = r.out; status('Valid JSON - ' + (r.type || 'minified') + '.'); } else { out.value = ''; status('Invalid JSON: ' + r.error, true); } };
      U.on($('#fmt'), 'click', function () { run(false); }); U.on($('#min'), 'click', function () { run(true); });
      U.on($('#clear'), 'click', function () { inp.value = ''; out.value = ''; status(''); inp.focus(); });
      U.on($('#use'), 'click', function () { if (out.value) { inp.value = out.value; } }); copyBtn($('#copy'), function () { return out.value; });
      U.on(inp, 'input', U.debounce(function () { if (inp.value.trim()) run(false); else { out.value = ''; status(''); } }, 350));
    },
    base64: function () {
      var inp = $('#in'), out = $('#out'), run = function () { var mode = U.$('input[name=mode]:checked', root).value; if (!inp.value) { out.value = ''; status(''); return; } if (mode === 'enc') { out.value = DP.b64enc(inp.value, $('#urlsafe').checked); status(''); } else { var r = DP.b64dec(inp.value); if (r.ok) { out.value = r.out; status(''); } else { out.value = ''; status(r.error, true); } } };
      U.on(root, 'input', U.debounce(run, 150)); U.on(root, 'change', run); copyBtn($('#copy'), function () { return out.value; });
      U.on($('#swap'), 'click', function () { var m = U.$('input[name=mode]:checked', root).value; U.$('input[name=mode][value=' + (m === 'enc' ? 'dec' : 'enc') + ']', root).checked = true; inp.value = out.value; run(); });
    },
    url: function () {
      var inp = $('#in'), out = $('#out'), q = $('#query'), run = function (mode) { var r = mode === 'enc' ? DP.urlEnc(inp.value, false) : mode === 'encfull' ? DP.urlEnc(inp.value, true) : DP.urlDec(inp.value, $('#plus').checked); if (r.ok) { out.value = r.out; status(''); } else { out.value = ''; status(r.error, true); } };
      U.on($('#enc'), 'click', function () { run('enc'); }); U.on($('#encfull'), 'click', function () { run('encfull'); }); U.on($('#dec'), 'click', function () { run('dec'); }); copyBtn($('#copy'), function () { return out.value; });
      var parse = function () { var pairs = DP.parseQuery($('#qin').value); q.innerHTML = pairs.length ? '<div class="table-wrap"><table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>' + pairs.map(function (p) { return '<tr><td><code>' + U.esc(p[0]) + '</code></td><td>' + U.esc(p[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted">Paste a URL with a query string (the part after ?) to see its parameters.</p>'; };
      U.on($('#qin'), 'input', U.debounce(parse, 200)); parse();
    },
    uuid: function () {
      var out = $('#out'), gen = function () { var n = +$('#count').value, up = $('#upper').checked, nh = $('#nohy').checked, a = []; for (var i = 0; i < n; i++) { var u = DP.uuid(); if (nh) u = u.replace(/-/g, ''); a.push(up ? u.toUpperCase() : u); } out.value = a.join('\n'); };
      U.on($('#gen'), 'click', gen); U.on($('#count'), 'change', gen); U.on($('#upper'), 'change', gen); U.on($('#nohy'), 'change', gen); copyBtn($('#copy'), function () { return out.value; }); gen();
      U.on($('#chk'), 'input', function () { var v = $('#chk').value.trim(); $('#chkout').textContent = !v ? '' : DP.isUuid(v) ? 'Valid UUID (version ' + v[14] + ').' : 'Not a valid UUID.'; });
    },
    hash: function () {
      var inp = $('#in'), box = $('#out'), algos = [['SHA-1', 'SHA-1 (legacy - do not use for security)'], ['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512']], run = function () { var t = inp.value; Promise.all(algos.map(function (a) { return DP.hash(a[0], t); })).then(function (hs) { box.innerHTML = algos.map(function (a, i) { return '<div class="panel"><small>' + U.esc(a[1]) + '</small><div class="row"><code style="word-break:break-all;flex:1 1 20rem">' + hs[i] + '</code><button type="button" class="btn small ghost" data-copy="' + hs[i] + '">Copy</button></div></div>'; }).join(''); U.$$('[data-copy]', box).forEach(function (b) { U.on(b, 'click', function () { U.copy(b.getAttribute('data-copy'), b); }); }); }); };
      U.on(inp, 'input', U.debounce(run, 150)); run();
    },
    timestamp: function () {
      var inp = $('#in'), res = $('#res'), nowEl = $('#now'), run = function () { var r = DP.tsConvert(inp.value); if (!inp.value.trim()) { res.innerHTML = ''; status(''); return; } if (!r.ok) { res.innerHTML = ''; status(r.error, true); return; } status('Read as ' + r.unit + '.'); kv(res, [['Unix seconds', String(r.seconds)], ['Unix milliseconds', String(r.millis)], ['ISO 8601 (UTC)', r.iso], ['UTC', r.utc], ['Your local time', new Date(r.millis).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })], ['Relative', r.rel]]); };
      var tick = function () { nowEl.textContent = Math.floor(Date.now() / 1000); }; tick(); setInterval(tick, 1000);
      U.on(inp, 'input', U.debounce(run, 150)); U.on($('#usenow'), 'click', function () { inp.value = String(Math.floor(Date.now() / 1000)); run(); }); copyBtn($('#copynow'), function () { return nowEl.textContent; });
    },
    regex: function () {
      var pat = $('#pat'), fl = $('#flags'), txt = $('#txt'), hl = $('#hl'), list = $('#list'), run = function () { var r = DP.regexTest(pat.value, fl.value, txt.value); if (!pat.value) { hl.innerHTML = U.esc(txt.value); list.innerHTML = ''; status(''); return; } if (!r.ok) { hl.innerHTML = U.esc(txt.value); list.innerHTML = ''; status('Invalid pattern: ' + r.error, true); return; }
        var html = '', last = 0; r.matches.forEach(function (m) { html += U.esc(txt.value.slice(last, m.index)) + '<mark>' + U.esc(m.text) + '</mark>'; last = m.index + m.text.length; }); html += U.esc(txt.value.slice(last)); hl.innerHTML = html;
        status(r.matches.length + (r.matches.length === 1 ? ' match' : ' matches') + (r.truncated ? ' (showing first 2000)' : '') + '.'); list.innerHTML = r.matches.length ? '<div class="table-wrap"><table><thead><tr><th>#</th><th>Match</th><th>Index</th><th>Groups</th></tr></thead><tbody>' + r.matches.slice(0, 200).map(function (m, i) { return '<tr><td>' + (i + 1) + '</td><td><code>' + U.esc(m.text) + '</code></td><td>' + m.index + '</td><td>' + U.esc(m.groups.map(function (g) { return g === undefined ? 'undefined' : g; }).join(' | ')) + '</td></tr>'; }).join('') + '</tbody></table></div>' : ''; };
      U.on(root, 'input', U.debounce(run, 200)); run();
    },
    color: function () {
      var inp = $('#in'), pick = $('#pick'), res = $('#res'), sw = $('#sw'), run = function (from) { var r = DP.colorInfo(inp.value); if (!r.ok) { status(r.error, true); res.innerHTML = ''; return; } status(''); sw.style.background = r.hex; if (from !== 'pick') pick.value = r.hex;
        function ratio(x) { return x.toFixed(2) + ':1 ' + (x >= 7 ? '(AAA)' : x >= 4.5 ? '(AA)' : x >= 3 ? '(AA large text only)' : '(fails)'); }
        res.innerHTML = '<div class="kv">' + [['HEX', r.hex], ['RGB', r.rgbStr], ['HSL', r.hslStr]].map(function (p) { return '<div><small>' + p[0] + '</small><b>' + U.esc(p[1]) + '</b><button type="button" class="btn small ghost" data-copy="' + U.esc(p[1]) + '">Copy</button></div>'; }).join('') + '</div><div class="kv"><div><small>Contrast with white text</small><b>' + ratio(r.whiteRatio) + '</b></div><div><small>Contrast with black text</small><b>' + ratio(r.blackRatio) + '</b></div></div>'; U.$$('[data-copy]', res).forEach(function (b) { U.on(b, 'click', function () { U.copy(b.getAttribute('data-copy'), b); }); }); };
      U.on(inp, 'input', U.debounce(function () { run(); }, 120)); U.on(pick, 'input', function () { inp.value = pick.value; run('pick'); }); run();
    },
    text: function () {
      var inp = $('#in'), st = $('#stats'), run = function () { var s = DP.textStats(inp.value), f = function (m) { return m < 1 ? Math.max(1, Math.round(m * 60)) + ' sec' : m.toFixed(1) + ' min'; }; kv(st, [['Characters', U.fmt(s.chars, 0)], ['Without spaces', U.fmt(s.charsNoSpaces, 0)], ['Words', U.fmt(s.words, 0)], ['Sentences', U.fmt(s.sentences, 0)], ['Lines', U.fmt(s.lines, 0)], ['Paragraphs', U.fmt(s.paragraphs, 0)], ['Reading time', s.words ? f(s.readMin) : '0 sec'], ['Speaking time', s.words ? f(s.speakMin) : '0 sec'], ['Bytes (UTF-8)', U.fmt(s.bytes, 0)]]); };
      U.on(inp, 'input', run); run(); saveText('dp-text', inp);
      U.$$('[data-case]', root).forEach(function (b) { U.on(b, 'click', function () { inp.value = DP.caseConvert(inp.value, b.getAttribute('data-case')); run(); }); }); copyBtn($('#copy'), function () { return inp.value; });
    },
    password: function () {
      var out = $('#out'), len = $('#len'), lenv = $('#lenv'), gen = function () { lenv.textContent = len.value; var r = DP.password(+len.value, { lower: $('#lower').checked, upper: $('#upper').checked, digits: $('#digits').checked, symbols: $('#symbols').checked, ambiguous: $('#amb').checked }); if (!r.ok) { out.value = ''; status(r.error, true); return; } out.value = r.out; status(r.strength + ' - about ' + Math.round(r.bits) + ' bits of entropy. Generated in your browser, never sent anywhere.'); };
      U.on(root, 'change', gen); U.on(len, 'input', gen); U.on($('#gen'), 'click', gen); copyBtn($('#copy'), function () { return out.value; }); gen();
    },
    lorem: function () {
      var out = $('#out'), gen = function () { out.value = DP.lorem(Math.max(1, Math.min(30, +$('#paras').value || 3)), $('#classic').checked); };
      U.on($('#gen'), 'click', gen); U.on($('#paras'), 'change', gen); U.on($('#classic'), 'change', gen); copyBtn($('#copy'), function () { return out.value; }); gen();
    },
    base: function () {
      var inp = $('#in'), from = $('#from'), res = $('#res'), run = function () { if (!inp.value.trim()) { res.innerHTML = ''; status(''); return; } var r = DP.baseConvert(inp.value, +from.value); if (!r.ok) { res.innerHTML = ''; status(r.error, true); return; } status(''); kv(res, [['Decimal', r.dec], ['Hexadecimal', r.hex], ['Binary', r.bin], ['Octal', r.oct]]); };
      U.on(inp, 'input', U.debounce(run, 120)); U.on(from, 'change', run); run();
    }
  };
  if (init[id]) { try { init[id](); } catch (e) { status('Something went wrong loading this tool: ' + e.message, true); } }
})();
