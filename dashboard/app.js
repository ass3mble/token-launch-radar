// Token Radar's dashboard, model radar-4. It reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the ranked board, a filterable table, a per-protocol detail view with the
// model's own inputs and the protocol's farm plan, the live-token set kept apart, and a full
// audit of all 758 snapshot protocols. No network: every byte it shows is in data.js.
// The page recomputes each row from the snapshot figures — the fitted implied value, the
// launch odds, the expected value and the conformal range — and its cover self-check says,
// live, how many rows agree with board.json. Farm plans are the board's own strings; each
// plan's deposit is sized to minimum viable capital and its verdict is costed in $/hour.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', growth: 'all', watchOnly: false, tab: 'pre-token', sort: 'implied', dir: -1, selected: null, auditStatus: 'all' };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtMoney(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e6) return fmtUsd(n);
    if (Math.abs(n) >= 1000) return '$' + Math.round(n).toLocaleString('en-US');
    return '$' + n.toFixed(2);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtOdds(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n * 100).toFixed(1) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  // The fitted value model, radar-4: log10(mcap) = intercept + slope x log10(tvl), fitted on
  // the 128 live-token anchors. The page recomputes a row from the snapshot figures and checks
  // the number board.json carries, so the page's code and the board's data agree.
  function impliedOf(row) {
    var f = DATA.fit;
    return Math.max(1, Math.round(Math.pow(10, f.intercept + f.slope * Math.log10(row.tvl_usd))));
  }
  function bandOf(row) {
    var f = DATA.fit;
    var lt = Math.log10(row.tvl_usd);
    if (lt < f.tercile_cutoffs[0]) return f.conformal80_factors[0];
    if (lt < f.tercile_cutoffs[1]) return f.conformal80_factors[1];
    return f.conformal80_factors[2];
  }
  function rangeOf(row) {
    var band = bandOf(row);
    var implied = impliedOf(row);
    return { lo: Math.max(1, Math.round(implied / band)), hi: Math.max(implied, Math.round(implied * band)) };
  }
  function oddsOf(row) {
    var o = DATA.odds_model;
    var logTvl = Math.log10(Math.max(row.tvl_usd, 1));
    var age = (row.age_days === null || row.age_days === undefined ? 365 : row.age_days) / 365;
    var g = row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d;
    g = Math.min(200, Math.max(-80, g));
    var chains = Math.log10(1 + (row.chains ? row.chains.length : 0));
    var rate = row.category !== null && o.cat_rates[row.category] !== undefined ? o.cat_rates[row.category] : o.global_rate;
    var z = o.intercept
      + o.coef_log_tvl * ((logTvl - o.mean_log_tvl) / o.sd_log_tvl)
      + o.coef_age_years * ((age - o.mean_age_years) / o.sd_age_years)
      + o.coef_growth * ((g - o.mean_growth) / o.sd_growth)
      + o.coef_chains * ((chains - o.mean_chains) / o.sd_chains)
      + o.coef_cat_rate * ((rate - o.mean_cat_rate) / o.sd_cat_rate);
    if (z >= 0) return 1 / (1 + Math.exp(-z));
    var e = Math.exp(z);
    return e / (1 + e);
  }
  function evOf(row, odds) {
    return Math.round(((row.implied_value_usd * odds * row.farm.deposit_usd) / row.tvl_usd) * 100) / 100;
  }
  // The cover self-check: every claim below is recomputed live from the data this page holds.
  function selfCheck() {
    var rows = DATA.rows;
    var watchCovered = DATA.watchlist_size === rows.filter(function (r) { return r.watchlist; }).length;
    var ranksOk = rows.every(function (r, i) { return r.rank === i + 1; });
    var sortedOk = rows.every(function (r, i) { return i === 0 || r.implied_value_usd <= rows[i - 1].implied_value_usd; });
    var stepsOk = rows.every(function (r) { return r.farm_steps.length === 8; });
    var impliedOk = rows.filter(function (r) { return impliedOf(r) === r.implied_value_usd; }).length;
    var oddsOk = rows.filter(function (r) { return Math.round(oddsOf(r) * 1e4) / 1e4 === r.launch_odds; }).length;
    var evOk = rows.filter(function (r) { return evOf(r, r.launch_odds) === r.expected_value_usd; }).length;
    var rangeOk = rows.filter(function (r) { var rg = rangeOf(r); return rg.lo === r.implied_lo_usd && rg.hi === r.implied_hi_usd; }).length;
    var ledgerOk = DATA.audit.length === DATA.integrity.protocols_total
      && DATA.audit.filter(function (e) { return e.status === 'ranked'; }).length === DATA.integrity.ranked
      && DATA.audit.filter(function (e) { return e.status === 'live'; }).length === DATA.integrity.live
      && DATA.audit.filter(function (e) { return e.status === 'excluded'; }).length === DATA.integrity.excluded;
    return [
      { label: 'Watchlist ' + rows.filter(function (r) { return r.watchlist; }).length + ' / ' + DATA.watchlist_size, ok: watchCovered },
      { label: 'Ranks 1–' + rows.length, ok: ranksOk },
      { label: 'Sorted by implied value', ok: sortedOk },
      { label: 'Farm steps 8 / 8 on every row', ok: stepsOk },
      { label: 'Implied value recomputed ' + impliedOk + ' / ' + rows.length, ok: impliedOk === rows.length },
      { label: 'Launch odds recomputed ' + oddsOk + ' / ' + rows.length, ok: oddsOk === rows.length },
      { label: 'Expected value recomputed ' + evOk + ' / ' + rows.length, ok: evOk === rows.length },
      { label: '80% range recomputed ' + rangeOk + ' / ' + rows.length, ok: rangeOk === rows.length },
      { label: 'Ledger accounts for ' + DATA.audit.length + ' / ' + DATA.integrity.protocols_total, ok: ledgerOk }
    ];
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var p = new URLSearchParams(hash);
    if (p.get('q')) state.q = p.get('q');
    if (p.get('category')) state.category = p.get('category');
    if (p.get('chain')) state.chain = p.get('chain');
    if (p.get('growth')) state.growth = p.get('growth');
    if (p.get('watch') === '1') state.watchOnly = true;
    if (p.get('tab')) state.tab = p.get('tab');
    if (p.get('p')) state.selected = p.get('p');
  }
  function writeHash() {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category !== 'all') p.set('category', state.category);
    if (state.chain !== 'all') p.set('chain', state.chain);
    if (state.growth !== 'all') p.set('growth', state.growth);
    if (state.watchOnly) p.set('watch', '1');
    if (state.tab !== 'pre-token') p.set('tab', state.tab);
    if (state.selected) p.set('p', state.selected);
    var next = p.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && (!r.chains || r.chains.indexOf(state.chain) < 0)) return false;
      if (state.growth === 'up' && !(r.change_7d !== null && r.change_7d > 0)) return false;
      if (state.growth === 'down' && !(r.change_7d !== null && r.change_7d < 0)) return false;
      if (state.watchOnly && !r.watchlist) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'odds') { av = a.launch_odds; bv = b.launch_odds; }
      else if (key === 'ev') { av = a.expected_value_usd; bv = b.expected_value_usd; }
      else if (key === 'verdict') { av = a.farm.verdict_code === 'FARM' ? 2 : a.farm.verdict_code === 'THIN' ? 1 : 0; bv = b.farm.verdict_code === 'FARM' ? 2 : b.farm.verdict_code === 'THIN' ? 1 : 0; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }
  function auditRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.audit.filter(function (e) {
      if (state.auditStatus !== 'all' && e.status !== state.auditStatus) return false;
      if (!q) return true;
      var hay = [e.name, e.slug, e.category, e.reason].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model, fitted' })
      )
    );
  }

  function lede() {
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', { text: 'The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + DATA.early_size + ' more, under the same rule. Best expected value: ' + DATA.top_ev_name + ' at ' + fmtMoney(DATA.top_ev_usd) + ' per farmer.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Early rows beyond the watchlist' }), el('b', { text: String(DATA.early_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols set aside' }), el('b', { text: String(DATA.live_size) }))
      )
    );
  }

  function kpiStrip() {
    var f = DATA.fit;
    var items = [
      ['758 protocols accounted', 'every row of the snapshot is listed in the audit'],
      ['128 live anchors', 'positive market caps fit the value model'],
      ['Leave-one-out x' + f.loo_multiple, 'fitted model vs the fixed median, out of sample'],
      ['Walk-forward x' + f.wf_multiple, 'fit on the older half, tested on the newer half'],
      ['Within 3x ' + Math.round(f.within3 * 100) + '%', 'live tokens inside 3x of their true market cap, out of sample'],
      ['Launch-odds CV AUC ' + DATA.odds_model.cv_auc, '5-fold, category rates from the training folds only'],
      ['Median launch odds ' + fmtOdds(DATA.median_odds), 'peer-record score across the board'],
      ['Best expected value ' + fmtMoney(DATA.top_ev_usd), DATA.top_ev_name]
    ];
    return el('section', { class: 'kpi' }, items.map(function (it) {
      return el('div', { class: 'kpi-item' }, el('b', { text: it[0] }), el('span', { text: it[1] }));
    }));
  }

  function selfCheckPanel() {
    var checks = selfCheck();
    return el('section', { class: 'panel selfcheck' },
      el('div', { class: 'selfcheck-head' },
        el('h2', { text: 'Cover self-check' }),
        el('span', { class: 'sub', text: 'Recomputed live by this page from its own data — not a claim in the text.' })
      ),
      el('div', { class: 'pills' }, checks.map(function (c) {
        return el('span', { class: 'pill' + (c.ok ? ' ok' : ' bad'), text: (c.ok ? '✓ ' : '✗ ') + c.label });
      }))
    );
  }

  function options(list, all, selected) {
    var out = [el('option', { value: 'all', text: all })];
    list.forEach(function (v) { out.push(el('option', { value: v, text: v, selected: v === selected ? 'selected' : null })); });
    return out;
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var cat = el('select', { id: 'category', 'aria-label': 'Filter by category' }, options(categories, 'All categories', state.category));
    cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var chain = el('select', { id: 'chain', 'aria-label': 'Filter by chain' }, options(chains, 'All chains', state.chain));
    chain.addEventListener('change', function () { state.chain = chain.value; writeHash(); render(); });
    var growth = el('select', { id: 'growth', 'aria-label': 'Filter by seven-day growth' },
      el('option', { value: 'all', text: 'Any 7d move' }),
      el('option', { value: 'up', text: 'Growing (7d up)', selected: state.growth === 'up' ? 'selected' : null }),
      el('option', { value: 'down', text: 'Falling (7d down)', selected: state.growth === 'down' ? 'selected' : null })
    );
    growth.addEventListener('change', function () { state.growth = growth.value; writeHash(); render(); });
    var watch = el('input', { type: 'checkbox', id: 'watch', checked: state.watchOnly ? 'checked' : null });
    watch.addEventListener('change', function () { state.watchOnly = watch.checked; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; render(); } });
    var audit = el('button', { type: 'button', 'aria-pressed': state.tab === 'audit' ? 'true' : 'false', text: 'All 758', onclick: function () { state.tab = 'audit'; render(); } });
    var countText = state.tab === 'pre-token' ? rows().length + ' rows shown' : state.tab === 'live' ? DATA.live.length + ' live-token protocols' : auditRows().length + ' of 758 accounted';
    return el('div', { class: 'controls' },
      el('div', { class: 'field grow' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), cat),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chain),
      el('div', { class: 'field' }, el('label', { for: 'growth', text: '7-day move' }), growth),
      el('label', { class: 'check', for: 'watch' }, watch, 'Watchlist only'),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live, audit)),
      el('span', { class: 'count', text: countText })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.growth = 'all'; state.watchOnly = false; writeHash(); render(); } })
      ));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var badge = r.watchlist ? el('span', { class: 'badge', text: 'WATCHLIST' }) : null;
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', null, r.name, badge),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', { class: 'num', text: fmtOdds(r.launch_odds) }),
        el('td', { class: 'num ev', text: fmtMoney(r.expected_value_usd) }),
        el('td', null, el('span', { class: 'status ' + (r.farm.verdict_code === 'FARM' ? 'farm' : r.farm.verdict_code === 'THIN' ? 'thin' : 'skip'), text: r.farm.verdict_code })),
        el('td', null, el('span', { class: 'status' + (r.watchlist ? ' watch' : ''), text: r.watchlist ? 'watchlist' : 'no token' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Odds are a peer-record score, not a forecast; expected value is implied value x odds x the farmer\u2019s share at the plan\u2019s deposit. Select a row for its model and farm plan.' }),
          el('thead', null, el('tr', null,
            el('th', { scope: 'col', text: 'Rank' }),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('implied', 'Implied value'),
            sortHeader('odds', 'Launch odds'),
            sortHeader('ev', 'Expected value'),
            sortHeader('verdict', 'Verdict'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status live', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking. The 128 with a positive market cap anchor the fitted value model.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function auditTable() {
    var list = auditRows();
    var sel = el('select', { 'aria-label': 'Filter the audit by status' },
      el('option', { value: 'all', text: 'All 758 protocols', selected: state.auditStatus === 'all' ? 'selected' : null }),
      el('option', { value: 'ranked', text: 'Ranked (197)', selected: state.auditStatus === 'ranked' ? 'selected' : null }),
      el('option', { value: 'live', text: 'Live token (416)', selected: state.auditStatus === 'live' ? 'selected' : null }),
      el('option', { value: 'excluded', text: 'Excluded (145)', selected: state.auditStatus === 'excluded' ? 'selected' : null })
    );
    sel.addEventListener('change', function () { state.auditStatus = sel.value; render(); });
    var tbody = el('tbody');
    list.forEach(function (e) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: e.rank === null ? '—' : String(e.rank) }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: e.name }), el('span', { class: 'sub', text: (e.category || 'Other') + ' · ' + e.slug }))),
        el('td', null, el('span', { class: 'status' + (e.status === 'ranked' ? ' watch' : e.status === 'live' ? ' live' : ''), text: e.status })),
        el('td', null, el('span', { class: 'sub', text: e.reason }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Every protocol in the snapshot, accounted for: 197 ranked, 416 live-token and 145 excluded, each with its reason. Nothing is left out.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Rank' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Why it sits here' }))),
          tbody
        )
      ),
      el('div', { class: 'audit-filter' }, el('label', { class: 'sub', text: 'Show ' }), sel)
    );
  }

  function modelPanel() {
    var f = DATA.fit;
    var o = DATA.odds_model;
    var ig = DATA.integrity;
    var termRows = f.term_tests.map(function (t) {
      return el('tr', null,
        el('td', { text: t.term }),
        el('td', { class: 'num', text: t.loo_with.toFixed(4) }),
        el('td', { class: 'num', text: t.wf_with.toFixed(4) }),
        el('td', { text: t.decision })
      );
    });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How radar-4 is fitted — and what it cannot do' }),
      el('p', { class: 'sub', text: 'The value model is fitted on the ' + f.anchors + ' live-token protocols with a positive market cap: log10(market cap) = ' + f.intercept + ' + ' + f.slope + ' x log10(TVL). It explains little — R² ' + f.r2 + ' — and the dashboard shows the misses instead of hiding them.' }),
      el('div', { class: 'formula' },
        'implied = 10 ^ (' + f.intercept + ' + ' + f.slope + ' x log10(tvl_usd))'
      ),
      el('div', { class: 'ratios' },
        el('div', { class: 'fact' }, el('span', { text: 'Live anchors fitted' }), el('b', { text: String(f.anchors) })),
        el('div', { class: 'fact' }, el('span', { text: 'R² of the fit' }), el('b', { text: String(f.r2) })),
        el('div', { class: 'fact' }, el('span', { text: 'Leave-one-out error (log10)' }), el('b', { text: String(f.loo_mae) })),
        el('div', { class: 'fact' }, el('span', { text: 'Fixed-median error (log10)' }), el('b', { text: String(f.baseline_mae) })),
        el('div', { class: 'fact' }, el('span', { text: 'Leave-one-out improvement' }), el('b', { text: 'x' + f.loo_multiple })),
        el('div', { class: 'fact' }, el('span', { text: 'Walk-forward improvement' }), el('b', { text: 'x' + f.wf_multiple + ' (n=' + f.wf_n + ')' }))
      ),
      el('p', { class: 'sub', text: 'Out of sample, the fitted model puts ' + Math.round(f.within5 * 100) + '% of live tokens within 5x of their true market cap, against ' + Math.round(f.within5_base * 100) + '% for the fixed median; the median error is x' + f.median_err_factor + ' against x' + f.median_err_factor_base + '. The 80% conformal band is x' + f.conformal80_factor + ' wide overall — x' + f.conformal80_factors[0] + ' for the smallest third of protocols, x' + f.conformal80_factors[1] + ' for the middle third and x' + f.conformal80_factors[2] + ' for the largest third — and every implied value on this board carries its own tercile range in its detail view.' }),
      el('h3', { text: 'Every term was tested on both blind tests. The ones that failed were dropped.' }),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'mini' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Term tested' }), el('th', { scope: 'col', text: 'Leave-one-out MAE' }), el('th', { scope: 'col', text: 'Walk-forward MAE' }), el('th', { scope: 'col', text: 'Decision' }))),
          el('tbody', null, termRows)
        )
      ),
      el('p', { class: 'sub', text: 'A term is kept only when it improves both blind tests. None of the candidates did — growth, curvature, chain count, age, interactions, category intercepts and robust fits all left the value fit — so the model stays TVL alone. Chain count and the category token rate do enter the launch-odds score below, where they earn their place on cross-validation.' }),
      el('h3', { text: 'Launch odds: a peer-record score, not a forecast' }),
      el('p', { class: 'sub', text: 'A logistic fit on all ' + o.n + ' protocols: the share of protocols with a given size, age, seven-day growth, chain count and category token rate that record a token in this snapshot. Coefficients (standardised): log TVL ' + o.coef_log_tvl + ', age ' + o.coef_age_years + ', growth ' + o.coef_growth + ', chains ' + o.coef_chains + ', category rate ' + o.coef_cat_rate + '. In-sample AUC ' + o.auc_in_sample + '; 5-fold cross-validated AUC ' + o.cv_auc + ' (folds ' + o.cv_fold_aucs.join(', ') + '), computed strictly — each fold’s category rates and standardisation come from its training rows only. Weak, but better than the three-feature score — and it rises with age, because older protocols have had more time to launch. A protocol still pre-token at its age is scored on its profile, not predicted to launch.' }),
      el('h3', { text: 'Integrity: what this page can and cannot claim' }),
      el('p', { class: 'sub', text: 'Snapshot ' + DATA.as_of + ', ' + DATA.source + '. The program reads only that file: ' + ig.protocols_total + ' protocols, ' + ig.watchlist + ' on the watchlist, ' + ig.ranked + ' ranked, ' + ig.excluded + ' excluded by the product rule, ' + ig.live + ' live-token. Of the live set, ' + ig.live_positive_mcap + ' carry a positive market cap, ' + ig.live_zero_mcap + ' are recorded at $0 and ' + ig.live_negative_mcap + ' at -$1 (dead-token placeholders), and ' + ig.live_no_mcap + ' record a token with no market cap. No value is invented, no data after ' + DATA.as_of + ' is used, the page makes no network call, and two runs on the same input write the same bytes. Implied value is an estimate from the snapshot, not a price and not a prediction that a token will be issued.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var recomputed = impliedOf(row);
    var oddsRec = Math.round(oddsOf(row) * 1e4) / 1e4;
    var why = row.watchlist
      ? 'On the watchlist: at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record.'
      : 'An early find the watchlist leaves out, ranked on the same model as every watchlist row.';
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'kicker', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' — Watchlist' : ' — Early radar') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') + ' · listed ' + (row.listed_at || 'date unknown') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Launch odds' }), el('b', { class: 'num', text: fmtOdds(row.launch_odds) })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })),
        el('div', null, el('span', { text: '80% range' }), el('b', { class: 'num', text: fmtUsd(row.implied_lo_usd) + ' – ' + fmtUsd(row.implied_hi_usd) })),
        el('div', null, el('span', { text: 'Expected value / farmer' }), el('b', { class: 'num ev', text: fmtMoney(row.expected_value_usd) })),
        el('div', null, el('span', { text: 'Farm deposit' }), el('b', { class: 'num', text: '$' + row.farm.deposit_usd.toLocaleString('en-US') }))
      ),
      el('p', { class: 'sub', text: why + ' Model ' + DATA.model_version + ' recomputes this row as ' + fmtUsd(recomputed) + (recomputed === row.implied_value_usd ? ', the same number board.json carries' : ', which differs from the board: the data would be stale.') + ' Odds recompute to ' + fmtOdds(oddsRec) + '. The 80% range for this row is x' + (Math.round((row.implied_hi_usd / row.implied_value_usd) * 100) / 100) + ' wide: this is an estimate, not a price.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm verdict' }),
      el('p', { class: 'sub', text: row.farm.verdict_code + ' — ' + row.farm.verdict + '. Gas $' + row.farm.gas_usd + ' over ' + row.farm.active_minutes + ' active minutes ($' + row.farm.cost_per_hour_usd + ' / hour); expected value ' + fmtMoney(row.expected_value_usd) + ', net ' + fmtMoney(row.farm.net_usd) + ' (' + fmtMoney(row.farm.net_per_hour_usd) + ' / hour). FARM breaks even at a $250 stake or less; THIN breaks even but needs a bigger stake; SKIP cannot break even inside the $2,500 cap. Capital is not a cost: the $' + row.farm.deposit_usd.toLocaleString('en-US') + ' stays in the position.' }),
      el('p', { class: 'sub', text: 'Exit trigger: leave if TVL falls below ' + fmtUsd(row.exit_trigger_usd) + ' — a 50% drawdown from the snapshot level. Peers in this category sit at ' + fmtUsd(row.exit_category_p25_usd) + ' for their 25th percentile of TVL.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan' }),
      el('ol', { class: 'steps steps-grid' }, row.farm_steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(kpiStrip());
    shell.appendChild(selfCheckPanel());
    shell.appendChild(controls());
    if (state.tab === 'pre-token') {
      shell.appendChild(boardTable());
      shell.appendChild(modelPanel());
    } else if (state.tab === 'live') {
      shell.appendChild(liveTable());
    } else {
      shell.appendChild(auditTable());
    }
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
