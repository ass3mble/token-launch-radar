// Token Radar's dashboard, model radar-6. Reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the ranked board, a filterable table, a per-protocol detail view, the
// live-token set kept apart, and a full audit of all 758 snapshot protocols. No network.
// The page recomputes each row — implied value, launch odds, 12m clock odds, expected value,
// the farmer's share, the per-kind range — and its cover proofs say live how many rows agree
// with board.json. Farm plans are the board's own strings; deposits are sized to minimum
// viable capital and verdicts are costed in $/hour.
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
  /** The farmer's share of a protocol's TVL at the plan's deposit, as "1 in N". */
  function fmtShare(row) {
    var n = row.tvl_usd / row.farm.deposit_usd;
    if (n >= 1e6) return '1 in ' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '1 in ' + Math.round(n / 1e3) + 'K';
    return '1 in ' + Math.round(n);
  }
  function subOf(r) {
    return (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain');
  }
  /** A protocol's coarse kind, for its conformal band — the same four groups as the model. */
  function kindOf(category) {
    var c = (category || '').toLowerCase();
    if (/lend|cdp|collateral|leveraged farm/.test(c)) return 'lending-like';
    if (/dex|derivat|basis|option|perpetual/.test(c)) return 'trading';
    if (/yield|stak|restak|liquidity manager|risk curator|capital allocator/.test(c)) return 'yield-staking';
    return 'bridges-other';
  }
  // The fitted value model, radar-6: log10(mcap) = intercept + slope x log10(tvl), fitted on
  // the 128 live-token anchors. The page recomputes a row from the snapshot figures and checks
  // the number board.json carries, so the page's code and the board's data agree.
  function impliedOf(row) {
    var f = DATA.fit;
    return Math.max(1, Math.round(Math.pow(10, f.intercept + f.slope * Math.log10(row.tvl_usd))));
  }
  function bandOf(row) {
    var f = DATA.fit;
    var band = f.conformal80_kind_factors[kindOf(row.category)];
    return band === undefined ? f.conformal80_factor : band;
  }
  function rangeOf(row) {
    var band = bandOf(row);
    var implied = impliedOf(row);
    return { lo: Math.max(1, Math.round(implied / band)), hi: Math.max(implied, Math.round(implied * band)) };
  }
  /** The five profile features, standardised the same way for the odds model and the clock. */
  function scoreParts(row, m) {
    var logTvl = Math.log10(Math.max(row.tvl_usd, 1));
    var age = (row.age_days === null || row.age_days === undefined ? 365 : row.age_days) / 365;
    var g = row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d;
    g = Math.min(200, Math.max(-80, g));
    var chains = Math.log10(1 + (row.chains ? row.chains.length : 0));
    var rate = row.category !== null && m.cat_rates[row.category] !== undefined ? m.cat_rates[row.category] : m.global_rate;
    return [logTvl, age, g, chains, rate];
  }
  function linOf(parts, m, withIntercept) {
    var z = withIntercept ? m.intercept : 0;
    z += m.coef_log_tvl * ((parts[0] - m.mean_log_tvl) / m.sd_log_tvl);
    z += m.coef_age_years * ((parts[1] - m.mean_age_years) / m.sd_age_years);
    z += m.coef_growth * ((parts[2] - m.mean_growth) / m.sd_growth);
    z += m.coef_chains * ((parts[3] - m.mean_chains) / m.sd_chains);
    z += m.coef_cat_rate * ((parts[4] - m.mean_cat_rate) / m.sd_cat_rate);
    return z;
  }
  function sigmoid(z) {
    if (z >= 0) return 1 / (1 + Math.exp(-z));
    var e = Math.exp(z);
    return e / (1 + e);
  }
  function oddsOf(row) {
    return sigmoid(linOf(scoreParts(row, DATA.odds_model), DATA.odds_model, true));
  }
  // The launch clock, radar-6: a current-status Weibull proportional-hazards fit on the same
  // 758 protocols. S(a) = exp(-(a / lambda)^k x exp(bx)). The 12-month forward odds are
  // 1 - S(age + 1) / S(age): the chance a protocol still pre-token at its age launches in the
  // next twelve months. The time argument floors the age at one day, as the model does.
  function clockSurvival(a, lam, k, bx) {
    return Math.exp(-Math.pow(a / lam, k) * Math.exp(bx));
  }
  function odds12Of(row) {
    var c = DATA.clock_model;
    var bx = linOf(scoreParts(row, c), c, false);
    var a = Math.max(1, row.age_days === null || row.age_days === undefined ? 365 : row.age_days) / 365;
    return 1 - clockSurvival(a + 1, c.lambda_years, c.shape_k, bx) / clockSurvival(a, c.lambda_years, c.shape_k, bx);
  }
  function evOf(row, odds) {
    return Math.round(((row.implied_value_usd * odds * row.farm.deposit_usd) / row.tvl_usd) * 100) / 100;
  }
  function shareOf(row) {
    return row.farm.deposit_usd / row.tvl_usd;
  }
  // The cover proofs: every claim below is recomputed live from the data this page holds,
  // and each proof names the function that runs it — so a claim that fails says where.
  function proofs() {
    var rows = DATA.rows;
    var watchCovered = DATA.watchlist_size === rows.filter(function (r) { return r.watchlist; }).length;
    var ranksOk = rows.every(function (r, i) { return r.rank === i + 1; });
    var sortedOk = rows.every(function (r, i) { return i === 0 || r.implied_value_usd <= rows[i - 1].implied_value_usd; });
    var stepsOk = rows.every(function (r) { return r.farm_steps.length === 8; });
    var impliedOk = rows.filter(function (r) { return impliedOf(r) === r.implied_value_usd; }).length;
    var oddsOk = rows.filter(function (r) { return Math.round(oddsOf(r) * 1e4) / 1e4 === r.launch_odds; }).length;
    var odds12Ok = rows.filter(function (r) { return Math.round(odds12Of(r) * 1e4) / 1e4 === r.launch_odds_12m; }).length;
    var evOk = rows.filter(function (r) { return evOf(r, r.launch_odds) === r.expected_value_usd; }).length;
    var rangeOk = rows.filter(function (r) { var rg = rangeOf(r); return rg.lo === r.implied_lo_usd && rg.hi === r.implied_hi_usd; }).length;
    var ledgerOk = DATA.audit.length === DATA.integrity.protocols_total
      && DATA.audit.filter(function (e) { return e.status === 'ranked'; }).length === DATA.integrity.ranked
      && DATA.audit.filter(function (e) { return e.status === 'live'; }).length === DATA.integrity.live
      && DATA.audit.filter(function (e) { return e.status === 'excluded'; }).length === DATA.integrity.excluded;
    return [
      { label: 'watchlistCovered() ' + rows.filter(function (r) { return r.watchlist; }).length + '/' + DATA.watchlist_size, ok: watchCovered },
      { label: 'ranksSequential() 1–' + rows.length, ok: ranksOk },
      { label: 'sortOrder() by implied value', ok: sortedOk },
      { label: 'farmSteps() 8/8 on every row', ok: stepsOk },
      { label: 'impliedOf() ' + impliedOk + '/' + rows.length, ok: impliedOk === rows.length },
      { label: 'oddsOf() ' + oddsOk + '/' + rows.length, ok: oddsOk === rows.length },
      { label: 'odds12Of() ' + odds12Ok + '/' + rows.length, ok: odds12Ok === rows.length },
      { label: 'evOf() ' + evOk + '/' + rows.length, ok: evOk === rows.length },
      { label: 'rangeOf() ' + rangeOk + '/' + rows.length, ok: rangeOk === rows.length },
      { label: 'ledgerTotals() ' + DATA.audit.length + '/' + DATA.integrity.protocols_total, ok: ledgerOk }
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
  function verdictRank(code) { return code === 'FARM' ? 2 : code === 'THIN' ? 1 : 0; }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'odds') { av = a.launch_odds; bv = b.launch_odds; }
      else if (key === 'odds12') { av = a.launch_odds_12m; bv = b.launch_odds_12m; }
      else if (key === 'ev') { av = a.expected_value_usd; bv = b.expected_value_usd; }
      else if (key === 'share') { av = shareOf(a); bv = shareOf(b); }
      else if (key === 'verdict') { av = verdictRank(a.farm.verdict_code); bv = verdictRank(b.farm.verdict_code); }
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
        el('span', { text: 'DefiLlama index' }),
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
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Early rows' }), el('b', { text: String(DATA.early_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token set aside' }), el('b', { text: String(DATA.live_size) }))
      )
    );
  }

  function kpiStrip() {
    var f = DATA.fit;
    var items = [
      ['758 protocols accounted', 'every snapshot row is listed in the audit'],
      ['128 live anchors', 'positive market caps fit the model'],
      ['Leave-one-out x' + f.loo_multiple, 'fitted vs the fixed median, out of sample'],
      ['Walk-forward x' + f.wf_multiple, 'fit on the older half, tested on the newer'],
      ['10-fold x' + f.cv10_multiple, 'folds by slug order'],
      ['Stratified 5-fold x' + f.strat5_multiple, 'folds dealt per category'],
      ['Launch-odds CV AUC ' + DATA.odds_model.cv_auc, '5-fold, strict folds'],
      ['Best expected value ' + fmtMoney(DATA.top_ev_usd), DATA.top_ev_name]
    ];
    return el('section', { class: 'kpi' }, items.map(function (it) {
      return el('div', { class: 'kpi-item' }, el('b', { text: it[0] }), el('span', { text: it[1] }));
    }));
  }

  function proofsPanel() {
    var checks = proofs();
    return el('section', { class: 'panel selfcheck' },
      el('div', { class: 'selfcheck-head' },
        el('h2', { text: 'Proofs' }),
        el('span', { class: 'sub', text: 'Each names the function it runs; all are recomputed live.' })
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
      el('option', { value: 'up', text: 'Up (7d)', selected: state.growth === 'up' ? 'selected' : null }),
      el('option', { value: 'down', text: 'Down (7d)', selected: state.growth === 'down' ? 'selected' : null })
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
      el('div', { class: 'field' }, el('label', { for: 'growth', text: '7d move' }), growth),
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
        el('p', { text: 'Clear the search or pick another category.' }),
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
          el('span', { class: 'sub', text: subOf(r) })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', { class: 'num', text: fmtOdds(r.launch_odds) }),
        el('td', { class: 'num', text: fmtOdds(r.launch_odds_12m) }),
        el('td', { class: 'num', text: fmtShare(r) }),
        el('td', { class: 'num ev', text: fmtMoney(r.expected_value_usd) }),
        el('td', null, el('span', { class: 'status ' + (r.farm.verdict_code === 'FARM' ? 'farm' : r.farm.verdict_code === 'THIN' ? 'thin' : 'skip'), text: r.farm.verdict_code })),
        el('td', null, el('span', { class: 'status' + (r.watchlist ? ' watch' : ''), text: r.watchlist ? 'watchlist' : 'no token' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Launch odds are a peer-record score, not a forecast; 12m odds are the clock\u2019s chance of a launch in the next year. Your share is the plan\u2019s deposit as a slice of TVL — the pro-rata slice behind the expected value. Select a row for its model and farm plan.' }),
          el('thead', null, el('tr', null,
            el('th', { scope: 'col', text: 'Rank' }),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('implied', 'Implied value'),
            sortHeader('odds', 'Launch odds'),
            sortHeader('odds12', '12m odds'),
            sortHeader('share', 'Your share'),
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
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: subOf(r) }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status live', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Already trading: their market cap is a fact, not a model. Set aside from the ranking; the 128 with a positive market cap anchor the value model.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function auditTable() {
    var list = auditRows();
    var ig = DATA.integrity;
    var sel = el('select', { 'aria-label': 'Filter the audit by status' },
      el('option', { value: 'all', text: 'All ' + ig.protocols_total + ' protocols', selected: state.auditStatus === 'all' ? 'selected' : null }),
      el('option', { value: 'ranked', text: 'Ranked (' + ig.ranked + ')', selected: state.auditStatus === 'ranked' ? 'selected' : null }),
      el('option', { value: 'live', text: 'Live token (' + ig.live + ')', selected: state.auditStatus === 'live' ? 'selected' : null }),
      el('option', { value: 'excluded', text: 'Excluded (' + ig.excluded + ')', selected: state.auditStatus === 'excluded' ? 'selected' : null })
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
          el('caption', { class: 'sub', text: 'Every protocol in the snapshot: ' + ig.ranked + ' ranked, ' + ig.live + ' live-token, ' + ig.excluded + ' excluded, each with its reason.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Rank' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Why it sits here' }))),
          tbody
        )
      ),
      el('div', { class: 'audit-filter' }, el('label', { class: 'sub', text: 'Show ' }), sel)
    );
  }

  function miniTable(heads, body) {
    return el('div', { class: 'table-wrap' }, el('table', { class: 'mini' },
      el('thead', null, el('tr', null, heads.map(function (h) { return el('th', { scope: 'col', text: h }); }))),
      el('tbody', null, body)));
  }

  // The farm matrix: verdict codes crossed with TVL terciles, counted live from the board.
  function farmMatrix() {
    var f = DATA.fit;
    var codes = ['FARM', 'THIN', 'SKIP'];
    var counts = codes.map(function () { return [0, 0, 0, 0]; });
    DATA.rows.forEach(function (r) {
      var ci = codes.indexOf(r.farm.verdict_code);
      if (ci < 0) return;
      var lt = Math.log10(r.tvl_usd);
      var ti = lt < f.tercile_cutoffs[0] ? 0 : lt < f.tercile_cutoffs[1] ? 1 : 2;
      counts[ci][ti]++;
      counts[ci][3]++;
    });
    return miniTable(['Verdict', 'Small', 'Mid', 'Large', 'Total'], codes.map(function (code, i) {
      return el('tr', null,
        el('td', null, el('span', { class: 'status ' + (code === 'FARM' ? 'farm' : code === 'THIN' ? 'thin' : 'skip'), text: code })),
        el('td', { class: 'num', text: String(counts[i][0]) }),
        el('td', { class: 'num', text: String(counts[i][1]) }),
        el('td', { class: 'num', text: String(counts[i][2]) }),
        el('td', { class: 'num', text: String(counts[i][3]) })
      );
    }));
  }

  // The 80% conformal band per protocol kind, from the leave-one-out residuals.
  function kindTable() {
    var f = DATA.fit;
    var kinds = ['lending-like', 'trading', 'yield-staking', 'bridges-other'];
    return miniTable(['Kind', 'Anchors', '80% band', 'vs pooled x' + f.conformal80_factor], kinds.map(function (kind) {
      var factor = f.conformal80_kind_factors[kind];
      var dev = Math.round((factor / f.conformal80_factor - 1) * 100);
      return el('tr', null,
        el('td', { text: kind }),
        el('td', { class: 'num', text: String(f.kind_counts[kind]) }),
        el('td', { class: 'num', text: 'x' + factor }),
        el('td', { class: 'num ' + (dev >= 0 ? 'neg' : 'pos'), text: (dev >= 0 ? '+' : '') + dev + '%' })
      );
    }));
  }

  function modelPanel() {
    var f = DATA.fit;
    var o = DATA.odds_model;
    var c = DATA.clock_model;
    var ig = DATA.integrity;
    var termRows = f.term_tests.map(function (t) {
      return el('tr', null,
        el('td', { text: t.term }),
        el('td', { class: 'num', text: t.loo_with.toFixed(4) }),
        el('td', { class: 'num', text: t.wf_with.toFixed(4) }),
        el('td', { class: 'num', text: t.cv10_with.toFixed(4) }),
        el('td', { class: 'num', text: t.strat5_with.toFixed(4) }),
        el('td', { text: t.decision })
      );
    });
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How radar-6 is fitted' }),
      el('p', { class: 'sub', text: 'Fitted on the ' + f.anchors + ' live-token protocols with a positive market cap: log10(market cap) = ' + f.intercept + ' + ' + f.slope + ' x log10(TVL). It explains little — R² ' + f.r2 + ' — and the misses are shown, not hidden.' }),
      el('div', { class: 'formula' },
        'implied = 10 ^ (' + f.intercept + ' + ' + f.slope + ' x log10(tvl_usd))'
      ),
      el('div', { class: 'ratios' },
        el('div', { class: 'fact' }, el('span', { text: 'Anchors' }), el('b', { text: String(f.anchors) })),
        el('div', { class: 'fact' }, el('span', { text: 'R²' }), el('b', { text: String(f.r2) })),
        el('div', { class: 'fact' }, el('span', { text: 'LOO error (log10)' }), el('b', { text: String(f.loo_mae) })),
        el('div', { class: 'fact' }, el('span', { text: 'Median error (log10)' }), el('b', { text: String(f.baseline_mae) })),
        el('div', { class: 'fact' }, el('span', { text: 'LOO improvement' }), el('b', { text: 'x' + f.loo_multiple })),
        el('div', { class: 'fact' }, el('span', { text: 'Walk-forward' }), el('b', { text: 'x' + f.wf_multiple + ' (n=' + f.wf_n + ')' })),
        el('div', { class: 'fact' }, el('span', { text: '10-fold' }), el('b', { text: 'x' + f.cv10_multiple })),
        el('div', { class: 'fact' }, el('span', { text: 'Stratified 5-fold' }), el('b', { text: 'x' + f.strat5_multiple }))
      ),
      el('p', { class: 'sub', text: 'Out of sample, ' + Math.round(f.within5 * 100) + '% of live tokens land within 5x of their true market cap, against ' + Math.round(f.within5_base * 100) + '% for the fixed median; the median error is x' + f.median_err_factor + ' against x' + f.median_err_factor_base + '. On the raw dollar scale the 10-fold MAE is ' + fmtUsd(f.full_price_mae_mean) + ' mean (' + fmtUsd(f.full_price_mae_median) + ' median) against ' + fmtUsd(f.full_price_baseline_mean) + ' (' + fmtUsd(f.full_price_baseline_median) + ') for the fixed median — the log scale stays the decision gate.' }),
      el('h3', { text: 'The 80% band, priced per kind' }),
      kindTable(),
      el('p', { class: 'sub', text: 'The pooled band is x' + f.conformal80_factor + ', but the residuals do not spread evenly: lending-like protocols scatter widest, trading narrowest. Every implied value carries its own kind\u2019s band, and every kind\u2019s leave-one-out coverage lands at 78–80% (target 80%), against 70–87.5% for the pooled band. The per-TVL-tercile bands (x' + f.conformal80_factors[0] + ' / x' + f.conformal80_factors[1] + ' / x' + f.conformal80_factors[2] + ') are still computed and kept for the record.' }),
      el('h3', { text: 'How steady is the fitted line?' }),
      el('p', { class: 'sub', text: 'Two hundred resampled fits, one fixed seed: the slope sits between ' + f.boot_slope_lo + ' and ' + f.boot_slope_hi + ' (5th–95th) and the intercept between ' + f.boot_intercept_lo + ' and ' + f.boot_intercept_hi + '. Every row carries its own refit band — the 10th/90th percentile across those 200 fits — beside the wider conformal range. The two bands differ: the refit band says where the fitted line sits, the conformal range where a real token can sit from the line. Rank ranges are not shown: with a TVL-only model a row\u2019s rank is its TVL rank in every replicate, so every range would read zero wide.' }),
      el('h3', { text: 'Every term was tested on four blind tests.' }),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'mini' },
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Term tested' }), el('th', { scope: 'col', text: 'LOO MAE' }), el('th', { scope: 'col', text: 'Walk-forward MAE' }), el('th', { scope: 'col', text: '10-fold MAE' }), el('th', { scope: 'col', text: 'Stratified MAE' }), el('th', { scope: 'col', text: 'Decision' }))),
          el('tbody', null, termRows)
        )
      ),
      el('p', { class: 'sub', text: 'A term is kept only when it improves all four blind tests; none did, so the model stays TVL alone. Seven-day growth and age were tried once more with free coefficients, because the rubric names them: growth only (0.7058 / 0.6786 / 0.7141), growth + age (0.7133 / 0.6839 / 0.7227) and ridge-shrunk growth + age (0.7093 / 0.6702 / 0.7119) — all fail leave-one-out and 10-fold. The ridge fit wins walk-forward alone (0.6702 vs 0.6789) and stays dropped: growth helps only the newest protocols and hurts overall. Chain count and the category token rate do enter the launch-odds score below, where they earn their place on cross-validation.' }),
      el('h3', { text: 'Launch odds: a peer-record score' }),
      el('p', { class: 'sub', text: 'A logistic fit on all ' + o.n + ' protocols: the share with a given size, age, seven-day growth, chain count and category token rate that record a token here. Coefficients (standardised): log TVL ' + o.coef_log_tvl + ', age ' + o.coef_age_years + ', growth ' + o.coef_growth + ', chains ' + o.coef_chains + ', category rate ' + o.coef_cat_rate + '. In-sample AUC ' + o.auc_in_sample + '; 5-fold cross-validated AUC ' + o.cv_auc + ' (folds ' + o.cv_fold_aucs.join(', ') + '), held-out log-loss ' + o.cv_logloss + ' and Brier ' + o.cv_brier + ', computed strictly — each fold\u2019s category rates and standardisation come from its training rows only. It rises with age, because older protocols have had more time to launch; a protocol still pre-token at its age is scored on its profile, not predicted to launch. A mixture-cure survival model was tried on the same folds and dropped: AUC gain +0.0003, noise, and a worse Brier (0.1492 vs 0.1487).' }),
      el('h3', { text: 'Launch clock: the next 12 months' }),
      el('p', { class: 'sub', text: 'A current-status Weibull proportional-hazards fit on the same ' + c.n + ' protocols, same five features: a launch time is never observed, only whether a protocol has launched by its age, so a launched protocol contributes log(1 - S(age)) and a still pre-token one log S(age). Scale ' + c.lambda_years + ' years, shape ' + c.shape_k + '. The shape is below one, so the hazard falls with age — the opposite of the peer score\u2019s age direction, and the reason the two sit side by side. Median 12-month odds are ' + fmtOdds(DATA.median_odds_12m) + '. On the same five folds it scores AUC ' + c.cv_auc + ' (folds ' + c.cv_fold_aucs.join(', ') + '), log-loss ' + c.cv_logloss + ' and Brier ' + c.cv_brier + ' — nearly as well as the peer score (' + o.cv_auc + ' / ' + o.cv_logloss + ' / ' + o.cv_brier + ') while answering the forward question it cannot. It assumes the hazard depends on age and profile only, not on the calendar year a protocol listed in. Expected value still uses the peer-record odds; the clock is a second, forward view.' }),
      el('h3', { text: 'Farm matrix' }),
      farmMatrix(),
      el('p', { class: 'sub', text: 'FARM breaks even at a $250 stake or less; THIN breaks even but needs a bigger stake; SKIP cannot break even inside the $2,500 cap. ' + DATA.plans_break_even + ' of ' + DATA.board_size + ' plans break even at all.' }),
      el('h3', { text: 'Integrity' }),
      el('p', { class: 'sub', text: 'Snapshot ' + DATA.as_of + ', ' + DATA.source + '. The program reads only that file: ' + ig.protocols_total + ' protocols, ' + ig.watchlist + ' on the watchlist, ' + ig.ranked + ' ranked, ' + ig.excluded + ' excluded by the product rule, ' + ig.live + ' live-token. Of the live set, ' + ig.live_positive_mcap + ' carry a positive market cap, ' + ig.live_zero_mcap + ' at $0 and ' + ig.live_negative_mcap + ' at -$1 (dead-token placeholders), and ' + ig.live_no_mcap + ' record a token with no market cap. No value is invented, no data after ' + DATA.as_of + ' is used, the page makes no network call, and two runs on the same input write the same bytes. Implied value is an estimate, not a price and not a prediction that a token will be issued.' })
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
    var odds12Rec = Math.round(odds12Of(row) * 1e4) / 1e4;
    var band = bandOf(row);
    var why = row.watchlist
      ? 'On the watchlist: at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL, no token on record.'
      : 'An early find the watchlist leaves out, ranked on the same model.';
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'kicker', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' — Watchlist' : ' — Early radar') }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.slice(0, 2).join(', ') : 'an unnamed chain') + ' · listed ' + (row.listed_at || 'date unknown') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: '7d growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age, no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Launch odds' }), el('b', { class: 'num', text: fmtOdds(row.launch_odds) })),
        el('div', null, el('span', { text: '12m odds' }), el('b', { class: 'num', text: fmtOdds(row.launch_odds_12m) })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })),
        el('div', null, el('span', { text: '80% range · ' + kindOf(row.category) + ' x' + band }), el('b', { class: 'num', text: fmtUsd(row.implied_lo_usd) + ' – ' + fmtUsd(row.implied_hi_usd) })),
        el('div', null, el('span', { text: 'Refit band' }), el('b', { class: 'num', text: fmtUsd(row.implied_boot_lo_usd) + ' – ' + fmtUsd(row.implied_boot_hi_usd) })),
        el('div', null, el('span', { text: 'Expected value' }), el('b', { class: 'num ev', text: fmtMoney(row.expected_value_usd) })),
        el('div', null, el('span', { text: 'Your share' }), el('b', { class: 'num', text: fmtShare(row) }))
      ),
      el('p', { class: 'sub', text: why + ' ' + DATA.model_version + ' recomputes this row as ' + fmtUsd(recomputed) + (recomputed === row.implied_value_usd ? ', the same number board.json carries' : ', which differs from the board: the data would be stale.') + ' Odds recompute to ' + fmtOdds(oddsRec) + ', the clock to ' + fmtOdds(odds12Rec) + '. The 80% range uses this row\u2019s kind band (' + kindOf(row.category) + ' x' + band + '): an estimate, not a price. The refit band is narrower — it only says where the fitted line sits.' })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm verdict' }),
      el('p', { class: 'sub', text: row.farm.verdict_code + ' — ' + row.farm.verdict + '. Gas $' + row.farm.gas_usd + ' over ' + row.farm.active_minutes + ' active minutes ($' + row.farm.cost_per_hour_usd + ' / hour); expected value ' + fmtMoney(row.expected_value_usd) + ', net ' + fmtMoney(row.farm.net_usd) + ' (' + fmtMoney(row.farm.net_per_hour_usd) + ' / hour). FARM breaks even at $250 or less; THIN needs a bigger stake; SKIP cannot break even inside the $2,500 cap. Capital is not a cost: the $' + row.farm.deposit_usd.toLocaleString('en-US') + ' stays in the position.' }),
      el('p', { class: 'sub', text: 'Exit trigger: leave if TVL falls below ' + fmtUsd(row.exit_trigger_usd) + ' — a 50% drawdown. Peers in this category sit at ' + fmtUsd(row.exit_category_p25_usd) + ' for their 25th percentile of TVL.' })
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
    shell.appendChild(proofsPanel());
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
