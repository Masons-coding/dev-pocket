/* "Tip of the day": one item per calendar day, rotating through data/daily.json. Same for every visitor; works offline once loaded. */
(function () {
  'use strict'; var box = U.$('#daily'); if (!box) return;
  U.fetchJSON('data/daily.json', 6000).then(function (j) {
    if (!j || !j.items || !j.items.length) return; var d = new Date(), day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5), i = day % j.items.length;
    U.$('#daily-h').textContent = j.label || 'Today'; U.$('#daily-text').textContent = j.items[i];
    try { U.$('#daily-date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ' - a new tip every day'; } catch (e) { /* ignore */ }
    box.hidden = false;
  }, function () { /* leave hidden */ });
})();
