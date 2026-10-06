/* Shared headline feed. Sources: a static data/news.json refreshed by the site's update tool, plus live public APIs fetched in the visitor's browser.
   We show titles, the publisher's name and a link - never article text. Everything degrades gracefully when a source is unreachable. */
(function () {
  'use strict';
  var N = window.NEWS = {};
  var HN = 'https://hn.algolia.com/api/v1/';
  function hnItems(j, topic, label) { return (j.hits || []).filter(function (h) { return h.title && (h.url || h.objectID); }).map(function (h) { var url = h.url || 'https://news.ycombinator.com/item?id=' + h.objectID; var host = ''; try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { /* ignore */ } return { title: h.title, url: url, source: host || 'news.ycombinator.com', via: label, time: (h.created_at_i || 0) * 1000, topic: topic, score: h.points || 0, comments: h.num_comments || 0, discuss: 'https://news.ycombinator.com/item?id=' + h.objectID }; }); }
  function day() { var d = new Date(); return d.getFullYear() + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2); }
  function strip(h) { var d = document.createElement('div'); d.innerHTML = h; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  var adapters = {
    'hn-ai': function () { var since = Math.floor(Date.now() / 1000) - 7 * 86400; var qs = ['AI', 'LLM', 'OpenAI', 'Anthropic', 'machine learning']; return Promise.all(qs.map(function (q) { return U.fetchJSON(HN + 'search_by_date?tags=story&hitsPerPage=30&numericFilters=points%3E15,created_at_i%3E' + since + '&query=' + encodeURIComponent(q), 8000).then(function (j) { return hnItems(j, 'ai', 'Hacker News'); }, function () { return []; }); })).then(function (a) { return [].concat.apply([], a); }); },
    'hn-front': function () { return U.fetchJSON(HN + 'search?tags=front_page&hitsPerPage=30', 8000).then(function (j) { return hnItems(j, 'tech', 'Hacker News'); }); },
    'hf-papers': function () { return U.fetchJSON('https://huggingface.co/api/daily_papers?limit=20', 8000).then(function (a) { return (Array.isArray(a) ? a : []).map(function (p) { var pp = p.paper || {}; return { title: pp.title || p.title, url: 'https://huggingface.co/papers/' + pp.id, source: 'Hugging Face Papers', time: Date.parse(p.publishedAt || pp.publishedAt || '') || 0, topic: 'research', score: pp.upvotes || 0 }; }).filter(function (x) { return x.title && x.url; }); }); },
    'wiki-news': function () { return U.fetchJSON('https://en.wikipedia.org/api/rest_v1/feed/featured/' + day(), 9000).then(function (j) { var t = Date.now(); return (j.news || []).map(function (n, i) { var link = (n.links || [])[0], page = link && link.content_urls && link.content_urls.desktop && link.content_urls.desktop.page; return { title: strip(n.story || ''), url: page || 'https://en.wikipedia.org/wiki/Portal:Current_events', source: 'Wikipedia - In the news', time: t - i * 60000, topic: 'world' }; }).filter(function (x) { return x.title; }); }); }
  };
  N.fetchWikiDay = function () { return U.fetchJSON('https://en.wikipedia.org/api/rest_v1/feed/featured/' + day(), 9000); };
  N.load = function (cfg) {
    var jobs = [];
    if (cfg.json) jobs.push(U.fetchJSON(cfg.json + '?v=' + Math.floor(Date.now() / 600000), 8000).then(function (j) { N.updated = j.updated; return (j.items || []).map(function (x) { x.time = Date.parse(x.published || '') || 0; return x; }); }, function () { return []; }));
    (cfg.live || []).forEach(function (k) { if (adapters[k]) jobs.push(adapters[k]().catch(function () { return []; })); });
    return Promise.all(jobs).then(function (parts) {
      var seen = {}, out = []; [].concat.apply([], parts).forEach(function (x) { if (!x || !x.title || !/^https?:/.test(x.url || '')) return; var k = x.url.replace(/[#?].*$/, '').replace(/\/$/, '').toLowerCase(); var t = x.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 70); if (seen[k] || seen[t]) return; seen[k] = seen[t] = 1; out.push(x); });
      out.sort(function (a, b) { return (b.time || 0) - (a.time || 0); }); return out;
    });
  };
  function card(x) {
    var host = ''; try { host = new URL(x.url).hostname.replace(/^www\./, ''); } catch (e) { /* ignore */ }
    var meta = [U.esc(x.source || host)]; if (x.time) meta.push(U.esc(U.ago(new Date(x.time).toISOString()))); if (x.score) meta.push(U.esc(U.fmt(x.score, 0)) + ' points'); if (x.discuss) meta.push('<a href="' + U.esc(x.discuss) + '" rel="noopener noreferrer" target="_blank">' + U.fmt(x.comments || 0, 0) + ' comments</a>');
    return '<article class="card news-item"><h3><a class="title" href="' + U.esc(x.url) + '" rel="noopener noreferrer" target="_blank">' + U.esc(x.title) + '</a></h3><div class="src">' + meta.join(' <span aria-hidden="true">&middot;</span> ') + '</div></article>';
  }
  N.render = function (el, items, limit) { el.innerHTML = items.slice(0, limit || 30).map(card).join(''); };
  /* Page wiring: <div id="feed" data-json=".." data-live="hn-ai,hf-papers" data-limit="24" data-filters="1"> */
  document.addEventListener('DOMContentLoaded', function () {
    var feed = U.$('#feed'); if (!feed) return;
    var cfg = { json: feed.getAttribute('data-json') || '', live: (feed.getAttribute('data-live') || '').split(',').filter(Boolean) }, limit = +feed.getAttribute('data-limit') || 24, topic = '', q = '', all = [];
    var chips = U.$$('[data-topic]'), search = U.$('#feed-search'), more = U.$('#feed-more'), meta = U.$('#feed-meta'), shown = limit;
    var topicOf = feed.getAttribute('data-topic') || '';
    function draw() { var list = all.filter(function (x) { return (!topicOf || x.topic === topicOf || (topicOf === 'ai' && /\b(ai|llm|gpt|openai|anthropic|claude|gemini|model|neural|machine learning|deepmind|nvidia|chatbot|agent)\b/i.test(x.title))) && (!topic || x.topic === topic) && (!q || (x.title + ' ' + x.source).toLowerCase().indexOf(q) >= 0); });
      if (!list.length) { feed.innerHTML = '<p class="empty">' + (all.length ? 'Nothing matches that filter.' : 'Headlines could not be loaded right now. Check your connection and try again - the guides below work offline.') + '</p>'; if (more) more.hidden = true; return; }
      N.render(feed, list, shown); if (more) more.hidden = list.length <= shown; if (meta) meta.textContent = list.length + ' stories' + (N.updated ? ' - source list refreshed ' + U.ago(N.updated) : ''); }
    feed.innerHTML = '<p class="loading">Loading the latest headlines...</p>'; feed.setAttribute('aria-busy', 'true');
    N.load(cfg).then(function (items) { all = items; feed.removeAttribute('aria-busy'); draw(); });
    chips.forEach(function (c) { U.on(c, 'click', function () { var on = c.getAttribute('aria-pressed') === 'true'; chips.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); topic = on ? '' : c.getAttribute('data-topic'); if (!on) c.setAttribute('aria-pressed', 'true'); shown = limit; draw(); }); });
    U.on(search, 'input', U.debounce(function () { q = search.value.trim().toLowerCase(); shown = limit; draw(); }, 150));
    U.on(more, 'click', function () { shown += limit; draw(); });
  });
})();
