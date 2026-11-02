(function () {
  const BASE = location.origin + location.pathname;
  const D = window.__QA_DATA;
  const EXTERNAL = true;
  const CAMPS = D.campaigns, STREAMS = D.streams, QUESTS = D.quests, STRM = D.streaming, TWITCH = D.twitch;
  const CBY = Object.fromEntries(CAMPS.map(c => [c.id, c]));
  const SBY = Object.fromEntries(STREAMS.map(s => [s.id, s]));
  const QBY = Object.fromEntries(QUESTS.map(q => [q.id, q]));
  const IPS = [
    { key: 'sonic', name: 'Sonic', c: '--ip-sonic', fr: 'Sonic Racing: CrossWorlds, Creator Zone events, Sonic Art Gallery' },
    { key: 'atlus', name: 'ATLUS', c: '--ip-atlus', fr: 'Persona, Metaphor: ReFantazio' },
    { key: 'rgg', name: 'RGG', c: '--ip-rgg', fr: 'Stranger Than Heaven, Yakuza / Like a Dragon, Virtua Fighter' },
    { key: 'ca', name: 'CA', c: '--ip-ca', fr: 'Alien: Isolation 2, Total War: WARHAMMER 40,000' },
    { key: 'lic', name: 'SEGA & Licensing', c: '--ip-lic', fr: 'Crazy Taxi, SHINOBI, publisher sales, brand partnerships' }
  ];
  const IPBY = Object.fromEntries(IPS.map(i => [i.key, i]));
  const col = k => `var(${IPBY[k].c})`;

  // ---------- helpers
  function fmt(n) {
    if (n == null || isNaN(n)) return '—';
    const a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return Math.round(n).toLocaleString('en-US');
  }
  const pct = x => (x == null || !isFinite(x)) ? '—' : (x * 100).toFixed(1) + '%';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const erOf = c => c.vi ? c.eng / c.vi : null;
  function agg(list) {
    const s = { vi: 0, eng: 0, pubs: 0, creators: 0, n: list.length, erEng: 0, erVi: 0 };
    list.forEach(c => { s.vi += c.vi; s.eng += c.eng; s.pubs += c.pubs; s.creators += c.creators; if (c.basis === 'vi') { s.erEng += c.eng; s.erVi += c.vi; } });
    s.er = s.erVi ? s.erEng / s.erVi : null; s.exposure = s.vi + s.eng; return s;
  }
  // period filter (by quest start month); May counts in Q2
  const PERIODS = [['all', 'All of 2026'], ['q2', 'Q2 · Apr–Jun'], ['q3', 'Q3 · Jul–Sep'], ['q4', 'Q4 · Oct–Dec']];
  let PERIOD = 'all';
  const QOF = d => { const m = +d.slice(5, 7); return m <= 6 ? 'q2' : m <= 9 ? 'q3' : 'q4'; };
  const inPeriod = c => PERIOD === 'all' || QOF(c.start) === PERIOD;
  const periodName = () => PERIODS.find(p => p[0] === PERIOD)[1];
  const campsOf = ip => CAMPS.filter(c => inPeriod(c) && (ip === 'all' || c.ip === ip));
  function periodBar() {
    return `<div class="periods" role="group" aria-label="Time period">${PERIODS.map(([k, l]) => { const n = CAMPS.filter(c => k === 'all' || QOF(c.start) === k).length;
      return `<button class="chip" data-period="${k}" aria-pressed="${PERIOD === k}"${n ? '' : ' disabled'}>${esc(l)} <span class="muted">${n}</span></button>`; }).join('')}</div>`;
  }
  const heroSide = meta => `<aside class="hero-side" aria-label="Time period and sources"><span class="lbl pl">Time period</span>${periodBar()}<ul class="meta">${meta.map(m => `<li>${m}</li>`).join('')}</ul><button class="printbtn" data-print>Print / save as PDF</button></aside>`;
  document.addEventListener('click', e => {
    const p = e.target.closest('[data-period]'); if (p && !p.disabled) { PERIOD = p.dataset.period; route(); return; }
    if (e.target.closest('[data-print]')) window.print();
  });
  // external version: hide workflow notes meant for the Team Liquid team
  const INTERNAL_RX = /not yet reviewed|Fix before sending|fully reconcile|carried over|deck cover says|slide|earlier deck|dashboard quest|full video tab|export named|deck rounds|Social data source/i;
  const cav = c => EXTERNAL ? c.caveats.filter(x => !INTERNAL_RX.test(x)).map(x => x.replace(/ and no recap deck has been built yet/, '')) : c.caveats;
  // benchmarks and context
  const BENCH_ER = { Instagram: 0.021, TikTok: 0.028 };   // Dash Social 2026, engagements ÷ views
  const topV = c => Math.max(0, ...c.top.map(t => t.views || 0));
  const topT = c => c.top.slice().sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  const MED = { vi: median(CAMPS.map(c => c.vi)), er: median(CAMPS.filter(c => c.basis !== 'video').map(erOf)) };
  const typeStats = t => { const l = CAMPS.filter(c => c.type === t); return { n: l.length, vi: median(l.map(c => c.vi)), er: median(l.filter(c => c.basis !== 'video').map(erOf)), tot: l.reduce((a, c) => a + c.vi, 0) }; };
  const money = n => n == null ? '—' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M' : n >= 1e4 ? '$' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : '$' + Math.round(n).toLocaleString('en-US');
  const cpmF = n => n == null || !isFinite(n) ? '—' : '$' + n.toFixed(2);
  const questsOf = ip => QUESTS.filter(q => q.ip === ip);
  const trackerOf = ip => QUESTS.filter(q => (ip === 'all' || q.ip === ip) && !q.offTracker && q.status !== 'cross' && q.status !== 'notneeded');
  const hasResults = q => q.status === 'recap' || q.status === 'stream' || q.status === 'included';

  // tooltip
  const tip = document.getElementById('tip');
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let l = x + 14, t = y + 14;
    if (l + r.width > innerWidth - 8) l = x - r.width - 14;
    if (t + r.height > innerHeight - 8) t = y - r.height - 14;
    tip.style.left = Math.max(8, l) + 'px'; tip.style.top = Math.max(8, t) + 'px';
  }
  document.addEventListener('mousemove', e => { const t = e.target.closest('[data-tip]'); if (t) showTip(t.getAttribute('data-tip'), e.clientX, e.clientY); else tip.hidden = true; });
  document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) { const r = t.getBoundingClientRect(); showTip(t.getAttribute('data-tip'), r.left, r.bottom); } });
  document.addEventListener('focusout', () => { tip.hidden = true; });
  addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  // ---------- shared blocks
  function kpiTiles(list, opts = {}) {
    const s = agg(list);
    if (!s.n) return '';
    const plats = Array.from(new Set(list.flatMap(c => c.platforms.map(p => p.name))));
    const tiles = [
      { v: fmt(s.vi), l: 'Views & impressions', s: `${fmt(s.vi / s.n)} per recapped quest`, hero: true },
      { v: fmt(s.eng), l: 'Engagements', s: 'Likes, comments, shares, saves' },
      { v: pct(s.er), l: 'Engagement rate', s: s.er ? `About ${(s.er / BENCH_ER.TikTok).toFixed(1)}–${(s.er / BENCH_ER.Instagram).toFixed(1)}x TikTok and Instagram view-based averages` : '' },
      { v: s.pubs.toLocaleString('en-US'), l: 'Content pieces', s: `${fmt(s.vi / s.pubs)} views & impressions per piece` },
      { v: s.creators.toLocaleString('en-US'), l: 'Creator activations', s: 'Creators counted once per quest' },
      { v: opts.coverage || s.n, l: opts.coverage ? 'Quests with results' : 'Quests recapped', s: opts.coverageNote || '' },
      { v: plats.length, l: 'Platforms activated', s: plats.join(', ') },
      { v: fmt(s.exposure), l: 'Total measured exposure', s: 'Views & impressions + engagements, as most recap decks report it' }
    ];
    const T = t => `<div class="panel kpi${t.hero ? ' hero-k' : ''}"><div class="v num">${esc(t.v)}</div><div class="l">${esc(t.l)}</div><div class="s">${esc(t.s)}</div></div>`;
    const cr = s.creators || 1;
    const avg = [
      { v: (s.creators / s.n).toFixed(1), l: 'Creators per quest', s: 'Average creator activations per recapped quest' },
      { v: fmt(s.vi / cr), l: 'Views & impressions per creator', s: `Median quest: ${fmt(median(list.map(c => c.creators ? c.vi / c.creators : null)))}` },
      { v: fmt(s.eng / cr), l: 'Engagements per creator', s: `Median quest: ${fmt(median(list.map(c => c.creators ? c.eng / c.creators : null)))}` },
      { v: (s.pubs / cr).toFixed(1), l: 'Content pieces per creator', s: 'Publications per creator per quest' }
    ];
    return `<div class="kgroup"><div class="klabel">Totals</div><div class="kpis">${tiles.map(T).join('')}</div></div>
      <div class="kgroup"><div class="klabel">Average per creator <span>Totals ÷ ${s.creators.toLocaleString('en-US')} creator activations (a creator counts once per quest)</span></div><div class="kpis avg">${avg.map(T).join('')}</div></div>`;
  }
  function median(a) { const v = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }

  // ---------- donut (part-to-whole, <= 5 slices)
  function donut(slices, center, label, aria) {
    const tot = slices.reduce((a, x) => a + x.v, 0) || 1, R = 100, r = 64, C = 110;
    let a0 = -Math.PI / 2, g = '';
    const pt = (rad, a) => `${(C + rad * Math.cos(a)).toFixed(2)},${(C + rad * Math.sin(a)).toFixed(2)}`;
    slices.filter(x => x.v > 0).forEach(x => {
      const frac = x.v / tot; let a1 = a0 + frac * Math.PI * 2;
      if (frac >= .9999) a1 = a0 + Math.PI * 2 - .0001;
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const d = `M${pt(R, a0)}A${R},${R} 0 ${big} 1 ${pt(R, a1)}L${pt(r, a1)}A${r},${r} 0 ${big} 0 ${pt(r, a0)}Z`;
      g += `<path d="${d}" fill="${x.color}" stroke="var(--surface)" stroke-width="2" stroke-linejoin="round" data-tip="${esc(x.tip)}" tabindex="0"><title>${esc(x.name)}: ${pct(frac)}</title></path>`;
      a0 = a1;
    });
    return `<svg viewBox="0 0 220 220" role="img" aria-label="${esc(aria)}">${g}<text class="c1" x="110" y="112" text-anchor="middle">${esc(center)}</text><text class="c2" x="110" y="132" text-anchor="middle">${esc(label)}</text></svg>`;
  }
  const MIX = [['vi', 'Views & impressions'], ['eng', 'Engagements'], ['pubs', 'Content pieces'], ['creators', 'Creator activations']];
  let mixKey = 'vi';
  function ipMix() {
    const lab = MIX.find(m => m[0] === mixKey)[1];
    const rows = IPS.map(i => { const cs = campsOf(i.key), a = agg(cs); return { i, n: cs.length, v: a[mixKey], cr: a.creators }; }).filter(x => x.n);
    const tot = rows.reduce((a, x) => a + x.v, 0);
    const f = v => mixKey === 'vi' || mixKey === 'eng' ? fmt(v) : v.toLocaleString('en-US');
    const slices = rows.map(x => ({ name: x.i.name, v: x.v, color: col(x.i.key), tip: `<b>${esc(x.i.name)}</b><br>${f(x.v)} ${esc(lab.toLowerCase())}<br>${pct(x.v / tot)} of program · ${plural(x.n, 'quest')}` }));
    const perCr = mixKey !== 'creators';
    return `<div class="mix"><div class="donut">${donut(slices, f(tot), lab, `${lab} by IP`)}</div>
      <div class="tscroll"><table class="mixt"><thead><tr><th>IP</th><th class="r">${esc(lab)}</th><th class="r">Share</th>${perCr ? '<th class="r">Per creator</th>' : ''}<th class="r">Quests</th></tr></thead><tbody>
      ${rows.sort((a, b) => b.v - a.v).map(x => `<tr class="qrow" data-href="#${x.i.key}"><td><a href="#${x.i.key}"><span class="dot" style="background:${col(x.i.key)};margin-right:8px"></span>${esc(x.i.name)}</a></td><td class="r num">${f(x.v)}</td><td class="r"><div class="minibar"><span class="mt"><i style="width:${x.v / tot * 100}%;background:${col(x.i.key)}"></i></span><span class="mono">${pct(x.v / tot)}</span></div></td>${perCr ? `<td class="r num">${mixKey === 'pubs' ? (x.v / x.cr).toFixed(1) : fmt(x.v / x.cr)}</td>` : ''}<td class="r num">${x.n}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-mix]'); if (!b) return;
    mixKey = b.dataset.mix;
    document.querySelectorAll('[data-mix]').forEach(x => x.setAttribute('aria-pressed', x.dataset.mix === mixKey));
    const box = document.getElementById('ipMix'); if (box) box.innerHTML = ipMix();
  });
  function hbar(rows, max, f) {
    return rows.map(r => {
      const tag = r.href ? 'a' : 'div';
      return `<${tag} class="hrow"${r.href ? ` href="${r.href}"` : ''} data-tip="${esc(r.tip || '')}"><div class="name">${r.dot ? `<span class="dot" style="background:${r.dot}"></span>` : ''}<span>${esc(r.name)}</span></div><div class="track"><div class="fill" style="width:${max ? Math.max(r.v / max * 100, .4) : 0}%;background:${r.color}"></div></div><div class="val num">${f(r.v)}</div></${tag}>`;
    }).join('');
  }
  const qhref = c => '#' + (c.qid || '');
  const fmtD = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const range = () => { const a = CAMPS.map(c => c.start).sort(), b = CAMPS.map(c => c.end).sort(); return `${fmtD(a[0])} – ${fmtD(b[b.length - 1])}, 2026`; };
  function platformTable(list) {
    const P = {};
    list.forEach(c => c.platforms.forEach(p => {
      const q = P[p.name] = P[p.name] || { name: p.name, pubs: 0, vi: 0, eng: 0, erE: 0, erV: 0, n: 0, hasP: false };
      if (p.pubs != null) { q.pubs += p.pubs; q.hasP = true; }
      q.vi += p.vi || 0; q.n++;
      if (p.eng != null) q.eng += p.eng;
      if (p.eng != null && c.basis === 'vi' && p.name !== 'Twitch' && p.vi) { q.erE += p.eng; q.erV += p.vi; }
    }));
    const rows = Object.values(P).sort((a, b) => b.vi - a.vi);
    if (!rows.length) return '<div class="empty">No platform data yet.</div>';
    const tot = rows.reduce((a, r) => a + r.vi, 0), max = Math.max(...rows.map(r => r.vi), 1);
    return `<table><thead><tr><th>Platform</th><th class="r">Pieces</th><th class="r">Views &amp; impressions</th><th class="r">Share</th><th class="r">Engagements</th><th class="r">Eng. rate</th><th class="r">Benchmark</th>${list.length > 1 ? '<th class="r">Quests</th>' : ''}</tr></thead><tbody>${rows.map(r => {
      const er = r.name === 'Twitch' ? '<span class="pill muted">Not tracked</span>' : (r.erV ? `<span class="pill">${pct(r.erE / r.erV)}</span>` : '<span class="pill muted">n/a</span>');
      return `<tr><td><b>${esc(r.name)}</b></td><td class="r num">${r.hasP ? r.pubs : '—'}</td><td class="r"><div class="minibar"><span class="mt"><i style="width:${r.vi / max * 100}%;background:var(--accent)"></i></span><span class="mono">${fmt(r.vi)}</span></div></td><td class="r num">${pct(r.vi / tot)}</td><td class="r num">${r.name === 'Twitch' ? '—' : fmt(r.eng)}</td><td class="r">${er}</td><td class="r num">${BENCH_ER[r.name] ? pct(BENCH_ER[r.name]) : '<span class="muted">—</span>'}</td>${list.length > 1 ? `<td class="r num">${r.n}</td>` : ''}</tr>`;
    }).join('')}</tbody></table><p class="sec-note" style="padding:10px 12px 12px;margin:0">Benchmark: average engagements ÷ views for brand content in 2026 (Dash Social, via IQFluence). It's a reference point, not a target; creator content usually runs higher than brand pages.</p>`;
  }
  function topPosts(list, n = 10, showCamp = true) {
    const posts = list.flatMap(c => c.top.filter(t => t.views != null).map(t => ({ ...t, c }))).sort((a, b) => b.views - a.views).slice(0, n);
    if (!posts.length) return '<div class="empty">No post-level data yet.</div>';
    return `<div class="toplist">${posts.map((p, i) => `<div class="trow"><span class="rk">${String(i + 1).padStart(2, '0')}</span><div class="who"><b>${esc(p.creator)}</b><span><span class="dot" style="background:${col(p.c.ip)};margin-right:6px"></span>${esc(p.platform)}${p.format ? ' ' + esc(p.format) : ''}${showCamp ? ` · <a href="${qhref(p.c)}">${esc(p.c.name)}</a>` : ''}</span></div><div class="nums"><b>${fmt(p.views)}</b><span>${p.eng != null ? fmt(p.eng) + ' engagements' : 'views'}</span></div></div>`).join('')}</div>`;
  }
  function strmCards(list) {
    return list.map(s => `<div class="panel scard" style="--c:${col(s.ip)}"><h3><a href="#${s.qid}">${esc(s.name)}</a></h3>
      <div class="muted" style="font-size:12.5px;margin-top:-8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span>${esc(IPBY[s.ip].name)} · ${esc(s.window)}, 2026</span><span class="chan">${esc(s.format)}</span></div>
      <div class="sstats"><div><b class="num">${fmtH(s.watch)}</b><span>Hours watched</span></div><div><b class="num">${s.live != null ? s.live.toLocaleString('en-US') : '—'}</b><span>Live views${s.live != null ? '' : ' (not reported)'}</span></div><div><b class="num">${s.peak != null ? (s.peakEst ? '~' : '') + s.peak.toLocaleString('en-US') : '—'}</b><span>Peak viewers</span></div><div><b class="num">${s.airtime}</b><span>Hours of airtime</span></div></div>
      <p class="note">${esc(s.note)}</p></div>`).join('');
  }
  const fmtH = n => n == null ? '—' : n.toLocaleString('en-US');
  function streamCards(list) {
    return list.map(s => `<div class="panel scard"><h3><span class="dot" style="background:${col(s.ip)}"></span><a href="#${s.qid}">${esc(s.name)}</a></h3><div class="muted" style="font-size:12.5px;margin-top:-8px">${esc(IPBY[s.ip].name)} · ${esc(s.window)}, 2026</div><div class="sstats">${s.stats.map(([v, l]) => `<div><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div><p class="note">${esc(s.note)}</p></div>`).join('');
  }
  function monthChart(list, ips) {
    const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ms = Array.from(new Set(list.map(c => c.start.slice(0, 7)))).sort();
    const months = ms.map(m => [m, MN[+m.slice(5) - 1]]);
    const data = months.map(([m, lab]) => {
      const segs = ips.map(i => { const cs = list.filter(c => c.ip === i.key && c.start.startsWith(m)); return { ip: i.key, v: cs.reduce((a, c) => a + c.vi, 0), n: cs.length }; });
      return { lab, segs, total: segs.reduce((a, s) => a + s.v, 0), n: segs.reduce((a, s) => a + s.n, 0) };
    });
    const box = document.getElementById('monthChart');
    const W = Math.max(300, Math.round((box ? box.clientWidth : 560) - 40)), H = 250, L = 44, R = 8, T = 22, B = 28, pw = W - L - R, ph = H - T - B;
    const max = Math.max(...data.map(d => d.total), 1), step = niceStep(max / 4), top = Math.ceil(max / step) * step;
    const nm = months.length || 1, bw = Math.min(88, pw / nm * .56);
    let g = '';
    for (let v = 0; v <= top + 1; v += step) { const y = T + ph - v / top * ph; g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`; }
    data.forEach((d, i) => {
      const cx = L + pw / nm * (i + .5), x = cx - bw / 2; let y = T + ph;
      const segs = d.segs.filter(s => s.v > 0);
      segs.forEach((s, j) => {
        const h = s.v / top * ph, gap = j > 0 ? 2 : 0, yy = y - h, hh = Math.max(h - gap, 1);
        const t = esc(`<b>${IPBY[s.ip].name} · ${d.lab}</b><br>${fmt(s.v)} views &amp; impressions<br>${plural(s.n, 'quest')}`);
        g += j === segs.length - 1 ? `<path d="${roundTop(x, yy, bw, hh, 4)}" fill="${col(s.ip)}" data-tip="${t}" tabindex="0"/>` : `<rect x="${x}" y="${yy}" width="${bw}" height="${hh}" fill="${col(s.ip)}" data-tip="${t}" tabindex="0"/>`;
        y -= h;
      });
      if (d.total) g += `<text class="lbl" x="${cx}" y="${T + ph - d.total / top * ph - 7}" text-anchor="middle">${fmt(d.total)}</text>`;
      g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${d.lab} · ${d.n}${W / nm < 120 ? '' : (d.n === 1 ? ' quest' : ' quests')}</text>`;
    });
    g += `<line x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}" stroke="var(--line)"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Views and impressions by launch month">${g}</svg>`;
  }
  function niceStep(x) { const p = Math.pow(10, Math.floor(Math.log10(x || 1))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  function roundTop(x, y, w, h, r) { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }
  function copyRow(token) {
    const url = BASE + '#' + token;
    return `<div class="pills"><button class="copy" data-copy="${esc(url)}">Copy link to this page</button><input class="linkbox" readonly value="${esc(url)}" aria-label="Link to this page"></div>`;
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const url = b.dataset.copy, box = b.parentElement.querySelector('.linkbox');
    const done = () => { b.textContent = 'Link copied'; setTimeout(() => { b.textContent = 'Copy link to this page'; }, 1800); };
    try { navigator.clipboard.writeText(url).then(done, () => { box.select(); b.textContent = 'Press Ctrl/⌘+C to copy'; }); }
    catch (err) { box.select(); b.textContent = 'Press Ctrl/⌘+C to copy'; }
  });

  // ---------- video formats (short vs long)
  const FMT = [['short', 'Short form', 'var(--fmt-short)'], ['long', 'Long form', 'var(--fmt-long)'], ['live', 'Livestream VODs', 'var(--fmt-live)']];
  function fmtAgg(list) {
    const W = list.filter(c => c.formats), A = {};
    FMT.forEach(([k]) => { A[k] = { n: 0, views: 0, eng: 0, plats: {} }; });
    W.forEach(c => FMT.forEach(([k]) => { const f = c.formats[k]; A[k].n += f.n; A[k].views += f.views; A[k].eng += f.eng || 0;
      (f.plats || []).forEach(p => { const q = A[k].plats[p.name] = A[k].plats[p.name] || { name: p.name, n: 0, views: 0, eng: 0 }; q.n += p.n; q.views += p.views; q.eng += p.eng; }); }));
    const viAll = list.reduce((a, c) => a + c.vi, 0), viW = W.reduce((a, c) => a + c.vi, 0);
    return { A, W, n: list.length, cover: viAll ? viW / viAll : 0 };
  }
  function fmtBar(A, key, label, f) {
    const tot = FMT.reduce((a, [k]) => a + A[k][key], 0) || 1;
    return `<div class="frow"><span>${esc(label)}</span><div class="fbar">${FMT.filter(([k]) => A[k][key] > 0).map(([k, l, c]) => { const sh = A[k][key] / tot;
      return `<i style="width:${sh * 100}%;background:${c}" data-tip="${esc(`<b>${esc(l)}</b><br>${f(A[k][key])} ${esc(label.toLowerCase())} · ${pct(sh)}`)}">${sh >= .12 ? pct(sh) : ''}</i>`; }).join('')}</div></div>`;
  }
  function formatSection(list, opts = {}) {
    const { A, W, n, cover } = fmtAgg(list);
    const single = n === 1;
    const head = `<div class="sec-head"><div><span class="kicker">Video formats</span><h2>Short form vs long form</h2></div><p class="sec-note">Short form: TikTok, YouTube Shorts, Instagram Reels and X videos of 3 minutes or less. Long form: non-live videos over 3 minutes. Livestream VODs (Twitch, and YouTube replays over an hour) sit apart.${single ? '' : ` From LevelUp per-video data for ${W.length} of ${plural(n, 'recapped quest')} (${pct(cover)} of views &amp; impressions).`}</p></div>`;
    if (!W.length) return `<section>${head}<div class="placeholder"><h3>Format split not available</h3><p>${single ? 'This quest has a recap deck but no LevelUp per-video export, so its videos can’t be split by length yet.' : 'None of these quests has a LevelUp per-video export yet.'}</p>${single && list[0].mix ? `<p>${esc(list[0].mix)} The deck’s own format definitions differ slightly from this hub’s, so these figures aren’t added to the totals.</p>` : ''}</div></section>`;
    const po = W.reduce((a, c) => ({ n: a.n + (c.formats.posts ? c.formats.posts.n : 0), v: a.v + (c.formats.posts ? c.formats.posts.views : 0) }), { n: 0, v: 0 });
    const tiles = FMT.map(([k, l, c]) => { const x = A[k];
      return `<div class="ftile" style="--c:${c}"><h4><span class="dot" style="background:${c}"></span>${esc(l)}</h4><div class="big num">${fmt(x.views)}<span>views</span></div>
        <dl><div><dt>Videos</dt><dd>${x.n.toLocaleString('en-US')}</dd></div><div><dt>Avg. views / video</dt><dd>${x.n ? fmt(x.views / x.n) : '—'}</dd></div><div><dt>Eng. rate</dt><dd>${k === 'live' ? 'n/a' : (x.views ? pct(x.eng / x.views) : '—')}</dd></div></dl></div>`; }).join('');
    const pl = (k, c) => { const r = Object.values(A[k].plats).sort((a, b) => b.views - a.views); if (!r.length) return '<p class="muted" style="font-size:13px;margin:0">None in this set.</p>';
      return `<div class="hbars">${hbar(r.map(p => ({ name: `${p.name} (${p.n})`, v: p.views, color: c, tip: `<b>${esc(p.name)}</b><br>${plural(p.n, 'video')} · ${fmt(p.views)} views<br>${fmt(p.views / p.n)} avg. per video · ${pct(p.views ? p.eng / p.views : null)} eng. rate` })), r[0].views || 1, fmt)}</div>`; };
    let ipt = '';
    if (opts.byIP) {
      const rows = IPS.map(i => ({ i, ...fmtAgg(campsOf(i.key)) })).filter(x => x.W.length);
      ipt = `<div class="panel tscroll"><table><thead><tr><th>IP</th><th class="r">Short-form views</th><th class="r">Long-form views</th><th class="r">Short share</th><th class="r">Avg. short video</th><th class="r">Avg. long video</th><th class="r">Quests covered</th></tr></thead><tbody>${rows.map(x => { const s = x.A.short, l = x.A.long, sh = s.views / ((s.views + l.views) || 1);
        return `<tr class="qrow" data-href="#${x.i.key}"><td><a href="#${x.i.key}"><span class="dot" style="background:${col(x.i.key)};margin-right:8px"></span>${esc(x.i.name)}</a></td><td class="r num">${fmt(s.views)}</td><td class="r num">${fmt(l.views)}</td><td class="r"><div class="minibar"><span class="mt"><i style="width:${sh * 100}%;background:var(--fmt-short)"></i></span><span class="mono">${pct(sh)}</span></div></td><td class="r num">${s.n ? fmt(s.views / s.n) : '—'}</td><td class="r num">${l.n ? fmt(l.views / l.n) : '—'}</td><td class="r num">${x.W.length}/${x.n}</td></tr>`; }).join('')}</tbody></table></div>`;
    }
    const notes = W.map(c => c.formats.note).filter(Boolean);
    return `<section>${head}
      <div class="panel"><div class="panel-b fwrap">${fmtBar(A, 'views', 'Views', fmt)}${fmtBar(A, 'n', 'Videos', v => v.toLocaleString('en-US'))}
        <div class="legend">${FMT.map(([k, l, c]) => `<span><span class="dot" style="background:${c}"></span>${esc(l)}</span>`).join('')}</div>
        <div class="ftiles">${tiles}</div>${single && notes.length ? `<p class="sec-note">${esc(notes[0])}</p>` : ''}${po.n ? `<p class="sec-note">Left out: ${plural(po.n, 'image or text post')} with no video length (${fmt(po.v)} views), mostly on X.</p>` : ''}</div></div>
      <div class="split split2"><div class="panel"><div class="panel-h"><h3>Short form by platform</h3><span class="muted" style="font-size:13px">views (videos)</span></div><div class="panel-b">${pl('short', 'var(--fmt-short)')}</div></div>
        <div class="panel"><div class="panel-h"><h3>Long form by platform</h3><span class="muted" style="font-size:13px">views (videos)</span></div><div class="panel-b">${pl('long', 'var(--fmt-long)')}</div></div></div>
      ${ipt}</section>`;
  }

  // ---------- v2 story blocks
  const jumpBar = items => `<div class="jump" data-noprint><span class="muted">Jump to:</span>${items.map(([id, l]) => `<a href="javascript:void 0" data-jump="${id}">${esc(l)}</a>`).join('')}</div>`;
  document.addEventListener('click', e => { const j = e.target.closest('[data-jump]'); if (!j) return; e.preventDefault(); const el = document.getElementById(j.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  function breakoutCreators(L, n) {
    const m = {};
    L.forEach(c => c.top.forEach(t => { if (!t.views) return; const k = t.creator.replace(/\s*\(.*\)$/, ''); m[k] = Math.max(m[k] || 0, t.views); }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
  }
  function headlineBlock(L) {
    if (!L.length) return '';
    const s = agg(L), F = fmtAgg(L), A = F.A, vidV = A.short.views + A.long.views + A.live.views, shortSh = vidV ? A.short.views / vidV : null;
    const posts = L.flatMap(c => c.top.filter(t => t.views).map(t => t.views)).sort((a, b) => b - a);
    const top10 = posts.slice(0, 10).reduce((a, v) => a + v, 0) / (s.vi || 1);
    const Pg = D.program, ret = Pg.repeat2 / Pg.unique;
    const tiers = Pg.tiers.filter(t => t.acts >= 20).map(t => ({ ...t, er: t.views ? t.eng / t.views : 0 })).sort((a, b) => b.er - a.er);
    const shortPlat = Object.values(A.short.plats).sort((a, b) => b.views - a.views).slice(0, 2).map(p => p.name);
    const when = PERIOD === 'all' ? 'Across 2026 so far' : 'In ' + periodName();
    const big = `${when}, ${plural(L.length, 'Creator Zone quest')} delivered ${fmt(s.vi)} views & impressions at a ${pct(s.er)} engagement rate, about ${(s.er / BENCH_ER.TikTok).toFixed(1)}–${(s.er / BENCH_ER.Instagram).toFixed(1)}x TikTok and Instagram averages.${shortSh != null ? ` Short-form video carried ${pct(shortSh)} of video views,` : ''} and a few breakout posts drove the biggest wins.`;
    const finds = [
      shortSh != null ? [pct(shortSh), 'Short form carries the program', `Short-form videos averaged ${fmt(A.short.views / (A.short.n || 1))} views each, against ${fmt(A.long.views / (A.long.n || 1))} for long-form.${shortPlat.length ? ` ${shortPlat.join(' and ')} led.` : ''}`] : null,
      [pct(top10), 'Breakout posts drive scale', `The 10 biggest posts made up ${pct(top10)} of all views & impressions. The median quest reached ${fmt(median(L.map(c => c.vi)))}.`],
      [pct(ret), 'Creators keep coming back', `${Pg.repeat2} of ${Pg.unique} tracked creators joined two or more quests, and ${Pg.repeat5} joined five or more.${tiers[0] ? ` ${tiers[0].tier} creators had the highest engagement rate (${pct(tiers[0].er)}).` : ''}`]
    ].filter(Boolean);
    const small = Pg.tiers.filter(t => /Nano|Micro/.test(t.tier)), allActs = Pg.tiers.reduce((x, t) => x + t.acts, 0), allV = Pg.tiers.reduce((x, t) => x + t.views, 0);
    const smA = small.reduce((x, t) => x + t.acts, 0) / (allActs || 1), smV = small.reduce((x, t) => x + t.views, 0) / (allV || 1);
    finds.push([pct(smA), 'Smaller creators do most of the work', `Creators under 100K followers made ${pct(smA)} of creator activations and drove ${pct(smV)} of the views. A small group of larger creators adds the breakout reach.`]);
    const sum = `${when}, <b>${plural(L.length, 'quest')}</b> produced <b>${s.pubs.toLocaleString('en-US')} pieces of content</b>, <b>${fmt(s.vi)} views &amp; impressions</b> and <b>${fmt(s.eng)} engagements</b>, a <b>${pct(s.er)} engagement rate</b> (about ${(s.er / BENCH_ER.TikTok).toFixed(1)}–${(s.er / BENCH_ER.Instagram).toFixed(1)}x TikTok and Instagram averages).`;
    return `<section id="s-headline"><div class="panel learn"><span class="kicker">Key data learnings</span><p class="sum">${sum}</p>
      <div class="finds">${finds.map(([n, h, p]) => `<div class="find"><span class="n num">${esc(n)}</span><h4>${esc(h)}</h4><p>${esc(p)}</p></div>`).join('')}</div>
      <p class="sec-note" style="max-width:none;font-size:12.5px">Engagement benchmarks: Dash Social 2026 engagements ÷ views, 2.1% Instagram and 2.8% TikTok (via IQFluence). Creator figures come from LevelUp exports for ${Pg.quests} quests.</p></div></section>`;
  }
  function typeSection(L) {
    const types = Array.from(new Set(L.map(c => c.type))).map(t => { const l = L.filter(c => c.type === t); return { t, n: l.length, vi: median(l.map(c => c.vi)), er: median(l.filter(c => c.basis !== 'video').map(erOf)), tot: l.reduce((a, c) => a + c.vi, 0), pp: median(l.map(c => c.vi / c.pubs)) }; }).sort((a, b) => b.tot - a.tot);
    const tot = types.reduce((a, x) => a + x.tot, 0), mx = Math.max(...types.map(x => x.vi), 1);
    const bestER = types.filter(x => x.n >= 2).sort((a, b) => b.er - a.er)[0], bestVI = types.filter(x => x.n >= 2).sort((a, b) => b.vi - a.vi)[0];
    return `<section id="s-bench"><div class="sec-head"><div><span class="kicker">Benchmarks</span><h2>How quest types compare</h2></div><p class="sec-note">Medians are used so one viral post doesn't skew the comparison. Each quest page shows how it compares with these.</p></div>
      <div class="panel tscroll"><table><thead><tr><th>Quest type</th><th class="r">Quests</th><th class="r">Median views &amp; impr.</th><th class="r">Median eng. rate</th><th class="r">Median per piece</th><th class="r">Total views &amp; impr.</th><th class="r">Share</th></tr></thead><tbody>
      ${types.map(x => `<tr><td><b>${esc(x.t)}</b></td><td class="r num">${x.n}</td><td class="r"><div class="minibar"><span class="mt"><i style="width:${x.vi / mx * 100}%;background:var(--accent)"></i></span><span class="mono">${fmt(x.vi)}</span></div></td><td class="r num">${pct(x.er)}</td><td class="r num">${fmt(x.pp)}</td><td class="r num">${fmt(x.tot)}</td><td class="r num">${pct(x.tot / tot)}</td></tr>`).join('')}
      </tbody></table>${bestVI && bestER ? `<p class="takeaway" style="padding:0 12px 12px">${esc(bestVI.t)} quests have the highest median reach (${fmt(bestVI.vi)}); ${esc(bestER.t.toLowerCase())} quests have the highest median engagement rate (${pct(bestER.er)}). Program-wide medians: ${fmt(median(L.map(c => c.vi)))} views &amp; impressions and ${pct(median(L.filter(c => c.basis !== 'video').map(erOf)))} engagement.</p>` : ''}</div></section>`;
  }
  function concSection(L, opts = {}) {
    if (!L.length) return '';
    const s = agg(L), posts = L.flatMap(c => c.top.filter(t => t.views).map(t => t.views)).sort((a, b) => b - a);
    const k = Math.min(10, posts.length), topK = posts.slice(0, k).reduce((a, v) => a + v, 0) / (s.vi || 1);
    const H = L.filter(c => c.formats).reduce((a, c) => ({ v: a.v + c.formats.hits.videos, k10: a.k10 + c.formats.hits.k10, k100: a.k100 + c.formats.hits.k100 }), { v: 0, k10: 0, k100: 0 });
    const big = L.filter(c => topV(c) > 0).sort((a, b) => b.vi - a.vi).slice(0, opts.n || 8);
    const over = big.filter(c => topV(c) / c.vi > .5).length;
    const tiles = [[pct(topK), `Top ${k} posts`, 'Share of all views & impressions'], [fmt(median(L.map(c => c.vi))), 'Median quest', `Average quest: ${fmt(s.vi / s.n)}. The gap shows how much breakouts lift the average.`],
      [H.v ? pct(H.k10 / H.v) : '—', 'Videos over 10K views', H.v ? `${H.k10} of ${H.v} videos with per-video data` : 'No per-video data'], [H.v ? String(H.k100) : '—', 'Videos over 100K views', 'Breakout videos']];
    return `<section id="s-conc"><div class="sec-head"><div><span class="kicker">Concentration</span><h2>How much rides on a few posts</h2></div><p class="sec-note">Shows how much of each quest's reach came from its single biggest post, and how often videos break out.</p></div>
      <div class="kpis">${tiles.map(([v, l, x]) => `<div class="panel kpi"><div class="v num">${esc(v)}</div><div class="l">${esc(l)}</div><div class="s">${esc(x)}</div></div>`).join('')}</div>
      <div class="panel"><div class="panel-h"><h3>Top post vs the rest, largest quests with post-level data</h3><div class="legend"><span><span class="dot" style="background:var(--accent)"></span>Top post (in IP color)</span><span><span class="dot" style="background:var(--rest)"></span>All other posts</span></div></div><div class="panel-b"><div class="hbars">
      ${big.map(c => { const tv = topV(c), sh = tv / c.vi, t = topT(c); return `<a class="cbar" href="${qhref(c)}" data-tip="${esc(`<b>${esc(c.name)}</b><br>Top post: ${t ? esc(t.creator) + ' · ' + esc(t.platform) : '—'}, ${fmt(tv)} (${pct(sh)})<br>Without it: ${fmt(c.vi - tv)}`)}"><span class="nm">${esc(c.name)}</span><span class="t"><i style="width:${sh * 100}%;background:${col(c.ip)}"></i><i style="width:${(1 - sh) * 100}%;background:var(--rest)"></i></span><span class="v">${pct(sh)}</span></a>`; }).join('')}
      </div><p class="takeaway">${over} of the ${big.length} largest quests got more than half of their views from a single post. Without each quest's top post, these ${big.length} would total ${fmt(big.reduce((a, c) => a + c.vi - topV(c), 0))} instead of ${fmt(big.reduce((a, c) => a + c.vi, 0))}.</p></div></div></section>`;
  }
  function communitySection() {
    const Pg = D.program, tl = Pg.timeline, mx = Math.max(...tl.map(t => t.active), 1);
    const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const tiles = [[Pg.unique, 'Unique creators', `Across ${Pg.quests} quests with LevelUp exports`], [pct(Pg.repeat2 / Pg.unique), 'Joined 2+ quests', `${Pg.repeat2} creators`], [Pg.repeat5, 'Joined 5+ quests', 'The program’s core roster'], [(Pg.activations / Pg.unique).toFixed(1), 'Quests per creator', 'Average across tracked creators']];
    const tmx = Math.max(...Pg.tiers.map(t => t.views / t.acts), 1);
    const dist = [1, 2, 3, 4].map(q => ({ q: String(q), n: (Pg.dist.find(d => d.q === q) || { n: 0 }).n })).concat([{ q: '5+', n: Pg.dist.filter(d => d.q >= 5).reduce((a, d) => a + d.n, 0) }]);
    const dmx = Math.max(...dist.map(d => d.n), 1);
    const tierBest = Pg.tiers.filter(t => t.acts >= 20).sort((a, b) => b.eng / b.views - a.eng / a.views)[0];
    return `<section id="s-community"><div class="sec-head"><div><span class="kicker">Creator community</span><h2>Who is creating, and do they come back?</h2></div><p class="sec-note">From the LevelUp exports (${Pg.quests} quests); creators matched by name. Quests with only a recap deck aren't included.</p></div>
      <div class="kpis">${tiles.map(([v, l, x]) => `<div class="panel kpi"><div class="v num">${esc(String(v))}</div><div class="l">${esc(l)}</div><div class="s">${esc(x)}</div></div>`).join('')}</div>
      <div class="split split2">
        <div class="panel"><div class="panel-h"><h3>Active creators by quest month</h3><div class="legend"><span><span class="dot" style="background:var(--cr-new)"></span>First quest</span><span><span class="dot" style="background:var(--cr-ret)"></span>Returning</span></div></div><div class="panel-b"><div class="hbars">
          ${tl.map(t => `<div class="mbar" data-tip="${esc(`<b>${MN[+t.month.slice(5) - 1]} 2026</b><br>${t.active} active creators<br>${t.new} in their first quest · ${t.returning} returning`)}"><span>${MN[+t.month.slice(5) - 1]}</span><span class="t"><i style="width:${t.new / mx * 100}%;background:var(--cr-new)"></i><i style="width:${t.returning / mx * 100}%;background:var(--cr-ret)"></i></span><span class="v">${t.active} active · ${pct(t.active ? t.returning / t.active : 0)} returning</span></div>`).join('')}
          </div><p class="takeaway">From July on, most active creators each month had already joined an earlier quest: the program is building a returning roster, not starting from scratch each time.</p></div></div>
        <div class="panel"><div class="panel-h"><h3>Quests joined per creator</h3></div><div class="panel-b"><div class="hbars">${hbar(dist.map(d => ({ name: d.q === '1' ? '1 quest' : d.q + ' quests', v: d.n, color: 'var(--cr-ret)', tip: `<b>${d.q} quest${d.q === '1' ? '' : 's'}</b><br>${d.n} creators` })), dmx, v => String(v))}</div></div></div>
      </div>
      <div class="panel tscroll"><table><thead><tr><th>Creator size (followers)</th><th class="r">Creator activations</th><th class="r">Avg. views per activation</th><th class="r">Eng. rate</th><th class="r">Share of tracked views</th></tr></thead><tbody>
        ${Pg.tiers.map(t => { const tv = Pg.tiers.reduce((a, x) => a + x.views, 0); return `<tr><td><b>${esc(t.tier)}</b> <span class="muted">${esc(t.range)}</span></td><td class="r num">${t.acts}</td><td class="r"><div class="minibar"><span class="mt"><i style="width:${t.views / t.acts / tmx * 100}%;background:var(--cr-ret)"></i></span><span class="mono">${fmt(t.views / t.acts)}</span></div></td><td class="r num">${pct(t.views ? t.eng / t.views : null)}</td><td class="r num">${pct(t.views / tv)}</td></tr>`; }).join('')}
      </tbody></table><p class="takeaway" style="padding:0 12px 12px">${tierBest ? `${esc(tierBest.tier)} creators engage best (${pct(tierBest.eng / tierBest.views)}). ` : ''}Nano creators make up most activations; a small group of mid-size and larger creators brings the breakout reach.</p></div></section>`;
  }
  function actionsSection(L, ip) {
    const items = L.filter(c => c.actions).map(c => ({ name: c.name, ip: c.ip, href: qhref(c), a: c.actions }))
      .concat(STRM.filter(x => x.actions && (!ip || x.ip === ip) && (ip || inPeriod(x))).map(x => ({ name: x.name, ip: x.ip, href: '#' + x.qid, a: x.actions })));
    if (!items.length && ip) return '';
    return `<section id="s-actions"><div class="sec-head"><div><span class="kicker">Beyond views</span><h2>What audiences did</h2></div><p class="sec-note">Follows, chat, sign-ups and survey results reported in the recap decks. Most quests can't report actions yet.</p></div>
      <div class="acts">${items.map(x => `<div class="panel act" style="--c:${col(x.ip)}"><h4><a href="${x.href}">${esc(x.name)}</a></h4><ul>${x.a.map(([v, l]) => `<li><b>${esc(v)}</b>${esc(l)}</li>`).join('')}</ul></div>`).join('')}
      ${ip ? '' : `<div class="placeholder" style="padding:16px"><h3>Not tracked yet</h3><p style="font-size:13.5px">Wishlists, purchases, code redemptions and link clicks. Adding a trackable link or code to each brief would let every recap report them.</p></div>`}</div></section>`;
  }
  const ytId = u => { const m = /[?&]v=([\w-]{6,})/.exec(u || '') || /youtu\.be\/([\w-]{6,})/.exec(u || '') || /shorts\/([\w-]{6,})/.exec(u || ''); return m ? m[1] : null; };
  function gcard(g, c) {
    const id = g.platform === 'YouTube' ? ytId(g.url) : null, tag = g.url ? 'a' : 'div';
    return `<${tag} class="gcard"${g.url ? ` href="${esc(g.url)}" target="_blank" rel="noopener"` : ''}><div class="th"><span class="kd">${esc(g.kind)}</span><span class="pf">${esc(g.platform)}</span>${id ? `<img loading="lazy" alt="" src="https://i.ytimg.com/vi/${id}/mqdefault.jpg" onerror="this.remove()">` : ''}</div>
      <div class="bd"><b>${esc(g.creator)}</b><span class="ti">${esc(g.title || 'Untitled post')}</span><span class="mt">${fmt(g.views)} views${g.eng ? ` · ${fmt(g.eng)} eng.` : ''}${g.url ? '<span>Open ↗</span>' : ''}</span>${c ? `<span class="q">${esc(c.name)}</span>` : ''}</div></${tag}>`;
  }
  function gallerySection(L, n, id) {
    const g = L.filter(c => c.formats && c.formats.gallery).flatMap(c => c.formats.gallery.map(x => ({ x, c }))).sort((a, b) => b.x.views - a.x.views).slice(0, n);
    if (!g.length) return '';
    return `<section id="${id || 's-gallery'}"><div class="sec-head"><div><span class="kicker">Content showcase</span><h2>The posts behind the numbers</h2></div><p class="sec-note">Top posts by views from the LevelUp exports. Select a card to open the post.</p></div><div class="gal">${g.map(({ x, c }) => gcard(x, L.length > 1 ? c : null)).join('')}</div></section>`;
  }
  function insightOf(c) {
    const ratio = c.vi / MED.vi, er = erOf(c), t = topT(c), tsh = t && t.views ? t.views / c.vi : 0, best = c.platforms.slice().sort((a, b) => (b.vi || 0) - (a.vi || 0))[0];
    const a = `${ratio >= 1 ? `${ratio.toFixed(1)}x the median quest's reach` : `${pct(ratio)} of the median quest's reach`}`;
    const b = c.basis === 'video' ? 'engagement reads high because only video views are counted' : `${er >= MED.er ? 'above' : 'below'} the median engagement rate (${pct(er)} vs ${pct(MED.er)})`;
    const d = tsh > .5 ? ` One post (${t.creator}, ${t.platform}) drove ${pct(tsh)} of views.` : tsh ? ` Reach was spread out: the top post drove ${pct(tsh)}.` : '';
    const e = best && best.vi ? ` ${best.name} led with ${pct(best.vi / c.vi)} of views.` : '';
    return `${a}, ${b}.${d}${e}`;
  }
  function contextPanel(c) {
    const t = typeStats(c.type), rank = CAMPS.slice().sort((a, b) => b.vi - a.vi).indexOf(c) + 1, er = erOf(c), tp = topT(c), tsh = tp && tp.views ? tp.views / c.vi : null, H = c.formats && c.formats.hits;
    const dpts = (er - MED.er) * 100;
    const cells = [[`#${rank}`, `of ${CAMPS.length} quests by views & impressions`, `${fmt(c.vi)} vs ${fmt(MED.vi)} median`],
      [pct(er), 'Engagement rate', c.basis === 'video' ? '<em>Video views only</em>' : `<em class="${dpts >= 0 ? 'up' : 'down'}">${dpts >= 0 ? '+' : ''}${dpts.toFixed(1)} pts</em> vs ${pct(MED.er)} median`],
      [tsh != null ? pct(tsh) : '—', 'of views from the top post', tp ? esc(`${tp.creator} · ${tp.platform}`) : ''],
      [H && H.videos ? `${H.k10} of ${H.videos}` : '—', 'videos over 10K views', H && H.videos ? `Median video ${fmt(H.median)}` : 'No per-video data']];
    return `<section><div class="panel ctx"><span class="kicker">How this quest compares</span><div class="row4">${cells.map(([v, l, x]) => `<div><b class="num">${esc(v)}</b><span>${esc(l)}</span><span>${x}</span></div>`).join('')}</div>
      <p class="takeaway" style="margin:0"><b>Takeaway:</b> ${esc(insightOf(c))} ${t.n > 1 ? esc(`Across ${t.n} ${c.type.toLowerCase()} quests, the median is ${fmt(t.vi)} views & impressions and ${pct(t.er)} engagement.`) : ''}</p></div></section>`;
  }
  function costBox(c) {
    const k = c.cost; if (!k) return '';
    const B = D.cpmBench.scenarios, cpm = k.value ? k.value / c.vi * 1000 : 0;
    return `<div class="panel dbox"><h3>Cost efficiency</h3><div class="sstats"><div><b class="num">${money(k.value)}</b><span>Incentive value · ${esc(k.items)}</span></div><div><b class="num">${k.value ? cpmF(cpm) : 'Non-cash'}</b><span>Effective CPM</span></div>
      <div><b class="num">${k.value ? cpmF(k.value / c.eng) : '—'}</b><span>Cost per engagement</span></div><div><b class="num">${money(c.vi / 1000 * B[1])}</b><span>Paid-media equivalent at $${B[1]} CPM</span></div></div><a href="#cost" style="font-size:13px;font-weight:600">See the cost & CPM tab →</a></div>`;
  }
  function actionsBox(a) {
    if (!a) return '';
    return `<div class="panel dbox"><h3>Beyond views</h3><ul>${a.map(([v, l]) => `<li><b class="num">${esc(v)}</b> ${esc(l)}</li>`).join('')}</ul></div>`;
  }

  // ---------- cost & CPM view
  function viewCost() {
    const B = D.cpmBench, SC = B.scenarios, vi = CAMPS.reduce((a, c) => a + c.vi, 0), watch = STRM.reduce((a, x) => a + x.watch, 0);
    const known = CAMPS.filter(c => c.cost), kSpend = known.reduce((a, c) => a + c.cost.value, 0);
    const MAX = 40, at = v => Math.min(v, MAX) / MAX * 100;
    const czRows = known.map(c => ({ label: c.name, sub: c.cost.items, lo: c.cost.value / c.vi * 1000, hi: c.cost.value / c.vi * 1000, cz: true, href: qhref(c) }));
    const row = r => `<div class="rrow"><div class="lb">${r.href ? `<a href="${r.href}" style="color:inherit;font-weight:600;text-decoration:none">${esc(r.label)}</a>` : esc(r.label)}<span>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.src)}</a>` : esc(r.sub || r.src || '')}</span></div>
      <div class="rtrack" style="--g5:${at(5)}%;--g10:${at(10)}%;--g15:${at(15)}%"><i class="${r.cz ? 'cz' : ''}${r.hi > MAX ? ' over' : ''}" style="left:calc(${at(r.lo)}% - ${r.lo === r.hi ? 6 : 0}px);width:${r.lo === r.hi ? 12 : Math.max(at(r.hi) - at(r.lo), 2)}%${r.lo === r.hi ? ';width:12px' : ''}" data-tip="${esc(`<b>${esc(r.label)}</b><br>${r.lo === r.hi ? cpmF(r.lo) : cpmF(r.lo) + ' – ' + cpmF(r.hi)} per 1,000 views`)}"></i></div>
      <div class="vv">${r.lo === 0 && r.hi === 0 ? 'Non-cash' : r.lo === r.hi ? cpmF(r.lo) : `$${+r.lo.toFixed(2)}–$${+r.hi.toFixed(2)}`}</div></div>`;
    const axis = `<div class="raxis"><span></span><div class="ax">${[0, 5, 10, 15, 20, 30, 40].map(v => `<span style="left:${at(v)}%">$${v}${v === 40 ? '+' : ''}</span>`).join('')}</div><span></span></div>`;
    const tiles = [[fmt(vi), 'Views & impressions', `All ${CAMPS.length} recapped quests`, true],
      [money(vi / 1000 * SC[1]), `Paid-media equivalent at $${SC[1]} CPM`, `${money(vi / 1000 * SC[0])}–${money(vi / 1000 * SC[2])} at $${SC[0]}–$${SC[2]} CPM`],
      [`${money(watch * B.twitch.lo)}–${money(watch * B.twitch.hi)}`, 'Streaming equivalent', `${fmtH(watch)} hours watched × $${B.twitch.lo}–$${B.twitch.hi} per viewer-hour`],
      [`${known.length} of ${CAMPS.length}`, 'Quests with an incentive value', 'Code values for the rest are still to add']];
    const rows = CAMPS.slice().sort((a, b) => b.vi - a.vi);
    const opts = [['program', 'Whole program'], ...IPS.map(i => ['ip:' + i.key, i.name + ' (all quests)']), ...rows.map(c => ['c:' + c.id, c.name])];
    return `<div class="hero"><div class="wrap">
      <div class="crumbs"><a href="#program">Program</a><span>/</span><span>Cost &amp; CPM</span></div>
      <div class="eyebrow">Cost performance</div><h1>Cost &amp; CPM</h1>
      <p class="lede">Creator Zone quests are paid in codes, merch and access rather than creator fees. This tab compares what those incentives buy with what the same reach costs in paid media and paid creator deals. Incentive values are in for <b>${known.length} quests</b> so far; code values for the rest will turn the placeholders below into real CPMs.</p>
      <div class="pills"><span>CPM = incentive value ÷ views &amp; impressions × 1,000</span><span>Benchmarks: 2026 published rates</span></div>
      ${copyRow('cost')}
    </div></div>
    <main><div class="wrap">
      <section><div class="kpis">${tiles.map(([v, l, x, h]) => `<div class="panel kpi${h ? ' hero-k' : ''}"><div class="v num">${esc(v)}</div><div class="l">${esc(l)}</div><div class="s">${esc(x)}</div></div>`).join('')}</div></section>
      <section><div class="sec-head"><div><span class="kicker">Market rates</span><h2>What 1,000 views cost elsewhere</h2></div><p class="sec-note">Published 2026 CPM ranges for paid social ads and paid creator sponsorships, next to the Creator Zone quests with a known incentive value. Grid lines mark the $5, $10 and $15 scenarios used in the recap decks.</p></div>
        <div class="panel"><div class="panel-b"><div class="rng">${axis}
          <div class="rgh">Creator Zone (incentive value)</div>${czRows.map(row).join('')}
          ${B.groups.map(g => `<div class="rgh">${esc(g.name)}</div>${g.rows.map(r => row({ ...r, href: null })).join('')}`).join('')}${axis}</div>
          <p class="takeaway">The two quests with a cash incentive came in at <b>${czRows.filter(r => r.lo).map(r => cpmF(r.lo)).join(' and ')}</b> per 1,000 views & impressions: at the low end of, or below, paid creator sponsorship ranges and under the $14 Meta ads median. West Coast cost no cash at all (Network Test access).</p></div></div></section>
      <section><div class="sec-head"><div><span class="kicker">Break-even</span><h2>How much each quest could spend and still beat $${SC[1]} CPM</h2></div><p class="sec-note">The incentive value at which a quest's CPM would equal $${SC[1]}: views &amp; impressions ÷ 1,000 × $${SC[1]}. Any quest whose codes and merch were worth less than this beat a typical paid CPM.</p></div>
        <div class="panel tscroll"><table><thead><tr><th>Quest</th><th class="r">Views &amp; impr.</th><th class="r">Incentive value</th><th class="r">Effective CPM</th><th class="r">Break-even at $${SC[1]}</th><th class="r">Paid-media equivalent ($${SC[0]}–$${SC[2]})</th></tr></thead><tbody>
        ${rows.map(c => `<tr class="qrow" data-href="${qhref(c)}"><td><a href="${qhref(c)}"><span class="dot" style="background:${col(c.ip)};margin-right:8px"></span>${esc(c.name)}</a><span class="qsub">${esc(IPBY[c.ip].name)} · ${esc(c.window)}</span></td><td class="r num">${fmt(c.vi)}</td><td class="r">${c.cost ? `<span class="num">${money(c.cost.value)}</span><span class="qsub">${esc(c.cost.items)}</span>` : '<span class="todo">To add</span>'}</td><td class="r num">${c.cost ? (c.cost.value ? cpmF(c.cost.value / c.vi * 1000) : 'Non-cash') : '—'}</td><td class="r num">${money(c.vi / 1000 * SC[1])}</td><td class="r num">${money(c.vi / 1000 * SC[0])}–${money(c.vi / 1000 * SC[2])}</td></tr>`).join('')}
        </tbody></table></div></section>
      <section id="s-calc"><div class="sec-head"><div><span class="kicker">Calculator</span><h2>Try an incentive value</h2></div><p class="sec-note">Enter the total value of codes, merch, prizes and any fees for a quest, an IP or the whole program. Nothing you type is saved or shared.</p></div>
        <div class="panel calc"><div class="ins"><label>Quest or group<select id="cSel">${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>
          <label>Incentive value (USD)<input id="cVal" type="number" min="0" step="10" inputmode="decimal" placeholder="e.g. 2500"></label>
          <p class="sec-note">Count codes at retail value (e.g. a $69.99 game key × codes given out).</p></div>
          <div class="outs" id="cOut"></div></div></section>
      <section><div class="sec-head"><div><span class="kicker">Paid examples</span><h2>What other game campaigns paid</h2></div></div>
        <div class="exs">${B.examples.map(x => `<div class="panel"><b>${esc(x.label)}</b><span>${esc(x.text)}</span><a href="${esc(x.url)}" target="_blank" rel="noopener" style="font-size:12.5px">${esc(x.src)} ↗</a></div>`).join('')}
          <div class="panel"><b>Sponsored Twitch streams</b><span>Mid-tier gaming streamers charge roughly $${B.twitch.lo}–$${B.twitch.hi} per viewer-hour. Creator Zone streams logged ${fmtH(watch)} hours watched across ${STRM.length} activations.</span><a href="${esc(B.twitch.url)}" target="_blank" rel="noopener" style="font-size:12.5px">${esc(B.twitch.src)} ↗</a></div></div></section>
      <section><div class="panel dbox"><h3>How to read this tab</h3><ul>
        <li><b>Effective CPM</b> = incentive value ÷ views &amp; impressions × 1,000. <b>Cost per engagement</b> = incentive value ÷ engagements. Both match the formulas in the recap decks.</li>
        <li><b>Incentive value</b> counts codes at retail value, plus merch, prizes and any creator fees. Creator Zone creators are not paid fees.</li>
        <li><b>Paid-media equivalent</b> is a scenario: what the same views &amp; impressions would cost at $5, $10 or $15 CPM. It is not revenue, and organic creator content can't always be bought at these rates. Unlike "earned media value" multipliers, the inputs are shown so it can be checked.</li>
        <li><b>Benchmarks</b> are published 2026 ranges from rate guides and benchmark reports; most are not gaming-specific, and one (TrySpansa) is a vendor dataset. Treat them as context, not quotes.</li>
        <li>Streaming uses cost per viewer-hour instead of CPM because Twitch reach is measured in hours watched.</li>
      </ul></div></section>
    </div></main>`;
  }
  function bindCost() {
    const sel = document.getElementById('cSel'), inp = document.getElementById('cVal'), out = document.getElementById('cOut'), SC = D.cpmBench.scenarios;
    const pick = v => v === 'program' ? CAMPS : v.startsWith('ip:') ? CAMPS.filter(c => c.ip === v.slice(3)) : CAMPS.filter(c => c.id === v.slice(2));
    const draw = () => {
      const L = pick(sel.value), s = agg(L), val = parseFloat(inp.value), has = isFinite(val) && val >= 0, cpm = has ? val / s.vi * 1000 : null;
      const be = s.vi / 1000 * SC[1], mult = has && val > 0 ? (s.vi / 1000 * SC[1]) / val : null;
      const cells = [[fmt(s.vi), 'Views & impressions'], [has ? cpmF(cpm) : '—', 'Effective CPM'], [has && s.eng ? cpmF(val / s.eng) : '—', 'Cost per engagement'], [has ? cpmF(val / s.pubs) : '—', 'Cost per content piece'], [money(be), `Break-even at $${SC[1]} CPM`], [mult ? mult.toFixed(1) + 'x' : '—', `Value multiple at $${SC[1]} CPM`]];
      const verdict = !has ? `Enter an incentive value to see the CPM. To beat a $${SC[1]} CPM this selection could spend up to ${money(be)}.` : cpm <= 5 ? `At ${cpmF(cpm)} CPM this is below the cheapest paid social ad rates (TikTok awareness ads start around $2.87–$6) and far below paid creator deals.` : cpm <= 15 ? `At ${cpmF(cpm)} CPM this sits in the range of paid social ads ($14 Meta median) and at or below most paid creator sponsorships ($8–$30).` : `At ${cpmF(cpm)} CPM this is above typical paid social ads; paid creator deals range up to $30–$80 for dedicated YouTube videos.`;
      out.innerHTML = cells.map(([v, l]) => `<div><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('') + `<p class="verdict">${esc(verdict)}</p>`;
    };
    sel.addEventListener('change', draw); inp.addEventListener('input', draw); draw();
  }

  function statusChip(q) {
    if (q.status === 'recap') return CBY[q.ref] && CBY[q.ref].source === 'export' && !EXTERNAL ? '<span class="st recap">Data · no deck yet</span>' : '<span class="st recap">Results</span>';
    if (q.status === 'stream') return '<span class="st stream">Stream recap</span>';
    if (q.status === 'included') return '<span class="st link">In another recap</span>';
    if (q.status === 'cross') return '<span class="st link">Listed under Sonic</span>';
    if (q.status === 'notneeded') return '<span class="st link">No recap needed</span>';
    return '<span class="st pending">Recap pending</span>';
  }
  function questRows(list, showIP) {
    return list.map(q => {
      const c = q.status === 'recap' ? CBY[q.ref] : null, s = q.status === 'stream' ? SBY[q.ref] : null;
      const href = '#' + q.id;
      const when = c ? c.window : s ? s.window : (q.date || '—');
      const sub = [q.offTracker ? 'Recapped quest not listed on the tracker' : '', q.status === 'included' ? 'Counted in ' + CBY[q.ref].name : '', q.status === 'cross' ? 'Counted on the Sonic hub' : '', showIP ? IPBY[q.ip].name : ''].filter(Boolean).join(' · ');
      return `<tr class="qrow${hasResults(q) ? '' : ' pend'}" data-href="${href}">
        <td><a href="${href}">${showIP ? `<span class="dot" style="background:${col(q.ip)};margin-right:8px"></span>` : ''}${esc(q.title)}</a>${sub ? `<span class="qsub">${esc(sub)}</span>` : ''}</td>
        <td>${statusChip(q)}</td><td style="white-space:nowrap" data-l="Date">${esc(when)}</td>
        <td class="r num" data-l="Views & impr.">${c ? fmt(c.vi) : s ? esc(s.stats[0][0]) : '—'}${s ? `<span class="qsub">${esc(s.stats[0][1].toLowerCase())}</span>` : ''}</td>
        <td class="r num" data-l="Engagements">${c ? fmt(c.eng) : '—'}</td>
        <td class="r" data-l="Eng. rate">${c ? (c.basis === 'video' ? `<span class="pill warn" data-tip="Video views only, so this rate reads high">${pct(erOf(c))}*</span>` : `<span class="pill">${pct(erOf(c))}</span>`) : '<span class="muted">—</span>'}</td>
        <td class="r num" data-l="Pieces">${c ? c.pubs : '—'}</td><td class="r num" data-l="Creators">${c ? c.creators : '—'}</td></tr>`;
    }).join('');
  }
  const QHEAD = showIP => `<thead><tr><th>Quest${showIP ? ' / IP' : ''}</th><th>Status</th><th>Date</th><th class="r">Views &amp; impr.</th><th class="r">Engagements</th><th class="r">Eng. rate</th><th class="r">Pieces</th><th class="r">Creators</th></tr></thead>`;
  document.addEventListener('click', e => {
    const r = e.target.closest('tr[data-href]'); if (!r || e.target.closest('a')) return; location.hash = r.dataset.href;
  });

  // ---------- views
  function viewProgram() {
    const L = campsOf('all'), all = agg(L), tr = trackerOf('all'), withRes = tr.filter(hasResults).length;
    const ipTiles = IPS.map(i => {
      const s = agg(campsOf(i.key)), t = trackerOf(i.key), r = t.filter(hasResults).length;
      return `<a class="panel iptile" href="#${i.key}" style="--c:${col(i.key)}"><h3>${esc(i.name)}</h3><div class="fr">${esc(i.fr)}</div>
        <div class="ipst"><div><b class="num">${s.n ? fmt(s.vi) : '—'}</b><span>Views &amp; impr.</span></div><div><b class="num">${s.n ? fmt(s.eng) : '—'}</b><span>Engagements</span></div><div><b class="num">${s.n ? s.pubs : '—'}</b><span>Content pieces</span></div><div><b class="num">${pct(s.er)}</b><span>Eng. rate</span></div></div>
        ${s.n ? `<div class="pc"><b>${fmt(s.vi / s.creators)}</b> views &amp; impr. · <b>${fmt(s.eng / s.creators)}</b> eng. per creator</div>` : ''}
        <div class="cov"><span>${r} of ${t.length} tracker quests with results</span><div class="covbar"><i style="width:${t.length ? r / t.length * 100 : 0}%"></i></div></div><span class="go">Open ${esc(i.name)} hub →</span></a>`;
    }).join('');
    const hero = `<div class="hero"><div class="wrap">
      <div class="hero-grid"><div class="hero-main">
      <div class="eyebrow">Program overview</div>
      <h1>Creator Zone Performance</h1>
      <p class="lede">How Creator Zone quests performed for SEGA's IPs${PERIOD === 'all' ? '' : ` in ${esc(periodName())}`}. Pick an IP below for its own hub, or open any quest for its full results.</p>
      </div>
      ${heroSide([`<b>${range()}</b>`, `${withRes} of ${tr.length} tracker quests with results`, 'Sources: LevelUp · SullyGnome · Twitch Analytics'])}
      </div>
    </div></div>`;
    if (!L.length) return hero + `<main><div class="wrap"><section><div class="placeholder"><h3>No quests started in ${esc(periodName())}</h3><p>Choose another period above.</p></div></section></div></main>`;
    const recent = L.slice().sort((a, b) => b.end.localeCompare(a.end)).slice(0, 6);
    const largest = L.slice().sort((a, b) => b.vi - a.vi).slice(0, 6);
    const ipShares = IPS.map(i => ({ i, v: agg(campsOf(i.key)).vi })).sort((a, b) => b.v - a.v);
    const P = {}; L.forEach(c => c.platforms.forEach(p => { const q = P[p.name] = P[p.name] || { n: p.name, vi: 0, e: 0, ev: 0 }; q.vi += p.vi || 0; if (p.eng != null && p.vi && c.basis === 'vi' && p.name !== 'Twitch') { q.e += p.eng; q.ev += p.vi; } }));
    const pl = Object.values(P).sort((a, b) => b.vi - a.vi), plTot = pl.reduce((a, p) => a + p.vi, 0), plER = pl.filter(p => p.ev > 50000).sort((a, b) => b.e / b.ev - a.e / a.ev)[0];
    const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const byM = {}; L.forEach(c => { const m = c.start.slice(0, 7); byM[m] = (byM[m] || 0) + c.vi; }); const topM = Object.entries(byM).sort((a, b) => b[1] - a[1])[0];
    const topMC = L.filter(c => c.start.startsWith(topM[0])).sort((a, b) => b.vi - a.vi)[0];
    return hero + `
    <main><div class="wrap">
      ${jumpBar([['s-headline', 'Key learnings'], ['s-kpis', 'Totals'], ['s-ipmix', 'IP mix'], ['s-bench', 'Benchmarks'], ['s-conc', 'Concentration'], ['s-formats', 'Formats'], ['s-community', 'Creators'], ['s-actions', 'Beyond views'], ['s-gallery', 'Content']])}
      ${headlineBlock(L)}
      <section id="s-kpis">${kpiTiles(L, { coverage: `${withRes}/${tr.length}`, coverageNote: 'Tracker quests with a recap or stream recap' })}</section>
      <section id="s-ipmix"><div class="sec-head"><div><span class="kicker">IP mix</span><h2>How each IP contributes</h2></div><div class="seg" role="group" aria-label="Metric">${MIX.map(([k, l]) => `<button data-mix="${k}" aria-pressed="${k === mixKey}">${esc(l)}</button>`).join('')}</div></div>
        <div class="panel"><div class="panel-b" id="ipMix">${ipMix()}<p class="takeaway">${esc(ipShares[0].i.name)} delivered ${pct(ipShares[0].v / (all.vi || 1))} of views &amp; impressions${ipShares[1] && ipShares[1].v ? `, followed by ${esc(ipShares[1].i.name)} at ${pct(ipShares[1].v / all.vi)}` : ''}.</p></div></div></section>
      <section><div class="sec-head"><div><span class="kicker">IP hubs</span><h2>Choose an IP</h2></div><p class="sec-note">Each hub lists every quest on the tracker for that IP, with results where a recap exists and placeholders where one is still pending.</p></div><div class="ipgrid">${ipTiles}</div></section>
      <section><div class="split">
        <div class="panel chart"><div class="panel-h"><h3>Views &amp; impressions by launch month</h3><div class="legend">${IPS.filter(i => campsOf(i.key).length).map(i => `<span><span class="dot" style="background:${col(i.key)}"></span>${esc(i.name)}</span>`).join('')}</div></div><div class="panel-b"><div id="monthChart"></div><p class="takeaway">${MN[+topM[0].slice(5) - 1]} was the biggest month with ${fmt(topM[1])} views &amp; impressions (${pct(topM[1] / all.vi)}), led by ${esc(topMC.name)}.</p></div></div>
        <div class="panel"><div class="panel-h"><h3>Largest quests</h3><span class="muted" style="font-size:13px">by views &amp; impressions</span></div><div class="panel-b"><div class="hbars">${hbar(largest.map(c => ({ name: c.name, v: c.vi, color: col(c.ip), href: qhref(c), tip: `<b>${esc(c.name)}</b><br>${esc(IPBY[c.ip].name)} · ${esc(c.window)}<br>${fmt(c.vi)} views &amp; impressions · ${fmt(c.eng)} engagements` })), largest[0].vi, fmt)}</div><p class="takeaway">The top ${largest.length} quests account for ${pct(largest.reduce((a, c) => a + c.vi, 0) / all.vi)} of all views &amp; impressions.</p></div></div>
      </div></section>
      ${typeSection(L)}
      ${concSection(L)}
      <section><div class="sec-head"><div><span class="kicker">Social platform breakdown</span><h2>Where the views came from</h2></div><p class="sec-note">Sums the platform rows reported in each recap.</p></div><div class="panel tscroll">${platformTable(L)}<p class="takeaway" style="padding:0 12px 12px">${esc(pl[0].n)} led with ${pct(pl[0].vi / plTot)} of views${plER ? `; ${esc(plER.n)} had the highest engagement rate (${pct(plER.e / plER.ev)})` : ''}.</p></div></section>
      <div id="s-formats">${formatSection(L, { byIP: true })}</div>
      ${communitySection()}
      ${actionsSection(L)}
      ${gallerySection(L, 12)}
      <section><div class="sec-head"><div><span class="kicker">Latest results</span><h2>Recently recapped</h2></div><a href="#quests" style="font-weight:700;font-size:14px">See all quests →</a></div><div class="cards">${recent.map(card).join('')}</div></section>
      <section><div class="sec-head"><div><span class="kicker">Top content</span><h2>Best-performing posts</h2></div><p class="sec-note">Ranked by views, from the top-content slides of each recap.</p></div><div class="panel"><div class="panel-b">${topPosts(L)}</div></div></section>
      <section><div class="sec-head"><div><span class="kicker">Livestreams</span><h2>Streaming results</h2></div><p class="sec-note">Twitch-led activations are measured in watch time and live viewers, so they sit outside the social totals. The three largest by watch time:</p></div><div class="sgrid">${strmCards(STRM.slice().sort((a, b) => b.watch - a.watch).slice(0, 3))}</div><a href="#streaming" style="font-weight:600;font-size:14px">Open the streaming hub →</a></section>
    </div></main>`;
  }
  function card(c) {
    return `<a class="panel ccard" href="${qhref(c)}" style="--c:${col(c.ip)}"><span class="m">${esc(IPBY[c.ip].name)} · ${esc(c.window)}</span><b class="t">${esc(c.name)}</b><div class="row"><div>${fmt(c.vi)}<span>Views &amp; impr.</span></div><div>${fmt(c.eng)}<span>Engagements</span></div><div>${c.pubs}<span>Pieces</span></div></div></a>`;
  }

  function viewIP(key) {
    const i = IPBY[key], list = campsOf(key), s = agg(list), qs = questsOf(key), t = trackerOf(key), r = t.filter(hasResults).length;
    const streams = STRM.filter(x => x.ip === key);
    const best = list.slice().sort((a, b) => b.vi - a.vi)[0];
    const lede = list.length
      ? `<b>${plural(list.length, 'recapped quest')}</b> for ${esc(i.name)} delivered <b>${fmt(s.vi)} views &amp; impressions</b> and <b>${fmt(s.eng)} engagements</b> from <b>${s.pubs.toLocaleString('en-US')} pieces of content</b>. The biggest was <b>${esc(best.name)}</b> with ${fmt(best.vi)}.`
      : PERIOD !== 'all' ? `No ${esc(i.name)} quests started in ${esc(periodName())}. Choose another period, or see the full quest list below.` : `${esc(i.name)} has ${plural(t.length, 'quest')} on the tracker. No recap has been published yet, so each one below is a placeholder that will fill in once its recap deck is ready.`;
    return `<div class="hero"><div class="wrap">
      <div class="crumbs"><a href="#program">Program</a><span>/</span><span>${esc(i.name)}</span></div>
      <div class="eyebrow"><span class="dot" style="background:${col(key)};width:12px;height:12px"></span>IP hub</div>
      <div class="hero-grid"><div class="hero-main">
      <h1>${esc(i.name)}</h1>
      <p class="lede">${lede}</p>
      ${copyRow(key)}
      </div>
      ${heroSide([`<b>${esc(i.fr)}</b>`, `${r} of ${t.length} tracker quests with results`])}
      </div>
    </div></div>
    <main><div class="wrap">
      ${list.length ? `<section>${kpiTiles(list, { coverage: `${r}/${t.length}`, coverageNote: 'Tracker quests with a recap or stream recap' })}</section>` : `<section><div class="placeholder"><h3>Results pending for ${esc(i.name)}</h3><p>Views, engagements, engagement rate, content pieces and the platform breakdown will appear here as soon as the first ${esc(i.name)} recap is published.</p></div></section>`}
      <section><div class="sec-head"><div><span class="kicker">Quest list</span><h2>All ${esc(i.name)} quests</h2></div><p class="sec-note">Titles from the program tracker, in tracker order. Select a quest for its page.</p></div>
        <div class="panel tscroll"><table class="qt">${QHEAD(false)}<tbody>${questRows(qs, false)}</tbody></table></div></section>
      ${list.length ? `<section><div class="sec-head"><div><span class="kicker">Social platform breakdown</span><h2>Where the views came from</h2></div></div><div class="panel tscroll">${platformTable(list)}</div></section>
      ${formatSection(list)}
      ${concSection(list, { n: 6 })}
      ${actionsSection(list, key)}
      ${gallerySection(list, 8)}
      <section><div class="sec-head"><div><span class="kicker">Top content</span><h2>Best-performing posts</h2></div></div><div class="panel"><div class="panel-b">${topPosts(list, 8)}</div></div></section>` : ''}
      ${streams.length ? `<section><div class="sec-head"><div><span class="kicker">Livestreams</span><h2>Streaming results</h2></div><a href="#streaming" style="font-weight:600;font-size:14px">Open the streaming hub →</a></div><div class="sgrid">${strmCards(streams)}</div></section>` : ''}
    </div></main>`;
  }

  function weekTable(weeks) {
    return `<section><div class="sec-head"><div><span class="kicker">Weekly breakdown</span><h2>Chaos Hunt week by week</h2></div><p class="sec-note">From the weekly Chaos Hunt recap decks. Weeks overlap in places and stop at Aug 17, so they don't sum to the total above.</p></div>
      <div class="panel tscroll"><table><thead><tr><th>Week</th><th>Dates</th><th class="r">Views &amp; impr.</th><th class="r">Engagements</th><th class="r">Pieces</th><th class="r">Creators</th><th>Top post</th></tr></thead><tbody>
      ${weeks.map(w => { const q = QUESTS.find(x => x.sheet === w.sheets[0]); return `<tr class="qrow"${q ? ` data-href="#${q.id}"` : ''}><td>${q ? `<a href="#${q.id}">${esc(w.label)}</a>` : esc(w.label)}<span class="qsub">${esc(w.note)}</span></td><td style="white-space:nowrap">${fmtD(w.first)} – ${fmtD(w.last)}</td><td class="r num">${fmt(w.vi)}</td><td class="r num">${fmt(w.eng)}</td><td class="r num">${w.pubs}</td><td class="r num">${w.creators}</td><td>${w.top ? `${esc(w.top.creator)} <span class="qsub">${esc(w.top.platform)} · ${fmt(w.top.views)} views</span>` : '—'}</td></tr>`; }).join('')}
      </tbody></table></div></section>`;
  }
  function viewQuest(q) {
    const i = IPBY[q.ip];
    const siblings = questsOf(q.ip), idx = siblings.indexOf(q), prev = siblings[idx - 1], next = siblings[idx + 1];
    const pager = `<div class="pager">${prev ? `<a href="#${prev.id}"><span>← Previous ${esc(i.name)} quest</span>${esc(prev.title)}</a>` : ''}${next ? `<a class="next" href="#${next.id}"><span>Next ${esc(i.name)} quest →</span>${esc(next.title)}</a>` : ''}</div>`;
    const c = q.status === 'recap' ? CBY[q.ref] : null, s = q.status === 'stream' ? SBY[q.ref] : null;
    const pills = [];
    if (c) pills.push(c.window + ', 2026', c.type); else if (s) pills.push(s.window + ', 2026', 'Livestream'); else if (q.date) pills.push(q.date + ', 2026');
    if (q.offTracker) pills.push('Not listed on the tracker');
    const hero = `<div class="hero quest"><div class="wrap">
      <div class="crumbs"><a href="#program">Program</a><span>/</span><a href="#${q.ip}">${esc(i.name)}</a><span>/</span><span>Quest</span></div>
      <div class="eyebrow"><span class="dot" style="background:${col(q.ip)};width:12px;height:12px"></span>${esc(i.name)} quest</div>
      <h1>${esc(c ? c.name : s ? s.name : q.title)}</h1>
      ${c ? `<p class="lede">${esc(c.summary)}</p>` : ''}
      <div class="pills">${pills.map(p => `<span>${esc(p)}</span>`).join('')}${statusChip(q)}</div>
      ${copyRow(q.id)}
    </div></div>`;
    let body = '';
    if (c) {
      const pm = Math.max(...c.platforms.map(p => p.vi || 0), 1);
      const tiles = [
        ['Views & impressions', fmt(c.vi), c.basis === 'video' ? 'Video views only' : (c.viBasis || 'Views, as reported in the recap'), true],
        ['Engagements', fmt(c.eng), 'Likes, comments, shares, saves'],
        ['Engagement rate', pct(erOf(c)), c.basis === 'video' ? 'Reads high: video views only' : 'Engagements ÷ views & impressions'],
        ['Content pieces', c.pubs, `${fmt(c.vi / c.pubs)} views & impressions per piece`],
        ['Creators', c.creators, c.crew ? `In the LevelUp export, ${c.crew.returning} of ${c.crew.tracked} creators had joined an earlier quest` : 'Unique creators in this quest'],
        ['Platforms', c.platforms.length, c.platforms.map(p => p.name).join(', ')],
        ['Top post', c.top[0] && c.top[0].views != null ? fmt(topV(c)) : '—', topT(c) ? `${topT(c).creator} · ${topT(c).platform}` : 'No post-level data'],
        ['Total measured exposure', fmt(c.vi + c.eng), 'Views & impressions + engagements, as most decks report it']
      ];
      body = `<section><div class="kpis">${tiles.map(([l, v, sub, h]) => `<div class="panel kpi${h ? ' hero-k' : ''}"><div class="v num">${esc(v)}</div><div class="l">${esc(l)}</div><div class="s">${esc(sub)}</div></div>`).join('')}</div></section>
      ${contextPanel(c)}
      <section><div class="dgrid">
        <div class="panel dbox"><h3>Platform split · views &amp; impressions</h3><div class="hbars">${c.platforms.length ? hbar(c.platforms.slice().sort((a, b) => (b.vi || 0) - (a.vi || 0)).map(p => ({ name: p.name, v: p.vi || 0, color: col(c.ip), tip: `<b>${esc(p.name)}</b><br>${fmt(p.vi)} views &amp; impressions${p.pubs != null ? `<br>${p.pubs} pieces` : ''}${p.eng != null && p.name !== 'Twitch' ? `<br>${fmt(p.eng)} engagements` : ''}` })), pm, fmt) : '<p>No platform breakdown in this recap.</p>'}</div></div>
        <div class="panel dbox"><h3>Top posts</h3>${topPosts([c], 5, false)}</div>
        ${actionsBox(c.actions)}${costBox(c)}
        ${c.split ? `<div class="panel dbox"><h3>Organic vs paid</h3><div class="hbars">${hbar(c.split.map(x => ({ name: x.label, v: x.vi, color: col(c.ip), tip: `<b>${x.label}</b><br>${fmt(x.vi)} views &amp; impressions<br>${fmt(x.eng)} engagements · ${pct(x.eng / x.vi)}<br>${x.pubs} pieces · ${x.creators} creators` })), Math.max(...c.split.map(x => x.vi)), fmt)}</div></div>` : ''}
        ${c.stream ? `<div class="panel dbox"><h3>Streaming</h3><div class="sstats">${c.stream.map(([v, l]) => `<div><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div></div>` : ''}
        <div class="panel dbox"><h3>Notes</h3>${cav(c).length ? `<ul>${cav(c).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>No caveats noted in the recap.</p>'}<p style="font-size:13px" class="muted">Tracker title: ${esc(c.sheet || q.sheet)}</p>${c.url ? `<a class="deck" href="${esc(c.url)}" target="_blank" rel="noopener">Open the full recap deck ↗</a>` : `<p style="font-size:13px" class="muted">${c.source === 'export' ? (EXTERNAL ? 'Source: LevelUp campaign data.' : 'Source: LevelUp campaign export. Recap deck not built yet.') : 'Source: Creator Zone recap deck.'}</p>`}</div>
      </div></section>
      <section><div class="panel tscroll">${platformTable([c])}</div></section>${formatSection([c])}${gallerySection([c], 6, 'q-gallery')}${c.weeks ? weekTable(c.weeks) : ''}`;
    } else if (s) {
      const st = STRM.find(x => x.qid === q.id);
      body = `<section><div class="kpis">${s.stats.map(([v, l], k) => `<div class="panel kpi${k === 0 ? ' hero-k' : ''}"><div class="v num">${esc(v)}</div><div class="l">${esc(l)}</div><div class="s"></div></div>`).join('')}</div></section>
      <section><div class="panel dbox"><h3>Notes</h3><p>${esc(s.note)}</p><p style="font-size:13px" class="muted">Tracker title: ${esc(q.sheet)}</p>${s.url ? `<a class="deck" href="${esc(s.url)}" target="_blank" rel="noopener">Open the full recap deck ↗</a>` : '<p style="font-size:13px" class="muted">Source: Creator Zone recap deck.</p>'}</div></section>
      ${st && (st.actions || st.category) ? `<section><div class="dgrid">${actionsBox(st.actions)}${st.category ? `<div class="panel dbox"><h3>Share of the game's Twitch audience</h3><p>${esc(st.category)}</p></div>` : ''}</div></section>` : ''}`;
    } else if (q.status === 'notneeded') {
      body = `<section><div class="placeholder"><h3>No recap needed</h3><p>This row on the program tracker is a seeding, licensing or umbrella item rather than a creator quest, so no recap is planned. Tracker title: <b>${esc(q.sheet)}</b>.</p></div></section>`;
    } else if (q.status === 'included' || q.status === 'cross') {
      const tq = QBY[q.target], tc = CBY[tq.ref];
      const wk = tc.weeks && tc.weeks.find(w => w.sheets.includes(q.sheet));
      if (wk) body += `<section><div class="kpis">${[['Views & impressions', fmt(wk.vi), wk.label + ' recap deck'], ['Engagements', fmt(wk.eng), 'Likes, comments, shares, saves'], ['Content pieces', wk.pubs, `${fmtD(wk.first)} – ${fmtD(wk.last)}`], ['Creators', wk.creators, 'Made hunt-specific content']].map(([l, v, sub], k) => `<div class="panel kpi${k === 0 ? ' hero-k' : ''}"><div class="v num">${esc(v)}</div><div class="l">${esc(l)}</div><div class="s">${esc(sub)}</div></div>`).join('')}</div><p class="sec-note">${wk.sheets.length > 1 ? `Reported together as ${esc(wk.label)}. ` : ''}Top post: ${esc(wk.top.creator)} on ${esc(wk.top.platform)}, ${fmt(wk.top.views)} views. ${esc(wk.note)}</p></section>`;
      body += `<section><div class="placeholder"><h3>${q.status === 'included' ? (wk ? 'Counted in the Chaos Hunt total' : 'Results are part of another recap') : 'Results are listed under Sonic'}</h3><p>${q.status === 'included' ? `This quest's content was measured together with <b>${esc(tc.name)}</b>, so its numbers are included in that recap rather than reported on their own.` : `The tracker lists this quest under both Sonic and SEGA &amp; Licensing. Its results are counted once, on the Sonic hub.`}</p><a class="deck" href="#${tq.id}">Go to ${esc(tc.name)} →</a></div></section>`;
    } else {
      body = `<section><div class="kpis">${['Total measured exposure', 'Views & impressions', 'Engagements', 'Engagement rate', 'Content pieces', 'Creators', 'Platforms', 'Top post'].map(l => `<div class="panel kpi pending"><div class="v num">—</div><div class="l">${esc(l)}</div><div class="s">Pending recap</div></div>`).join('')}</div></section>
      <section><div class="placeholder"><h3>Recap pending</h3><p>This quest is on the program tracker as <b>${esc(q.sheet)}</b>. Its views and impressions, engagements, engagement rate, content pieces, platform breakdown and top posts will appear here once the recap deck is published.</p></div></section>`;
    }
    return hero + `<main><div class="wrap">${body}<section>${pager}</section></div></main>`;
  }

  const CH = {
    sega: { name: 'SEGA Twitch', c: 'var(--ch-sega)', extra: '' },
    atlus: { name: 'Atlus West Twitch', c: 'var(--ch-atlus)', extra: "Atlus West's stream schedule post on X added 94.6K views and 974 interactions." }
  };
  function chanStats(key) {
    const acts = STRM.filter(s => s.official && s.official.ch === key), o = acts.map(s => s.official);
    const sum = f => o.reduce((a, x) => a + (x[f] || 0), 0), has = f => o.some(x => x[f] != null);
    const peaks = o.filter(x => x.peak != null).sort((x, y) => y.peak - x.peak);
    const r = { key, acts, watch: sum('watch'), air: sum('air'), follows: sum('follows'), chat: sum('chat'), live: has('live') ? sum('live') : null,
      peak: peaks.length ? peaks[0].peak : null, creatorWatch: acts.reduce((a, s) => a + s.creatorWatch, 0), liftActs: acts.filter(s => s.creatorWatch > 0), creators: acts.reduce((a, s) => a + (s.creators || 0), 0) };
    r.liftBase = r.liftActs.reduce((a, s) => a + s.official.watch, 0); r.lift = r.liftBase ? r.creatorWatch / r.liftBase : null;
    return r;
  }
  function viewStreaming() {
    const watch = STRM.reduce((a, s) => a + s.watch, 0), live = STRM.reduce((a, s) => a + (s.live || 0), 0);
    const air = STRM.reduce((a, s) => a + s.airtime, 0), fol = STRM.reduce((a, s) => a + (s.follows || 0), 0);
    const peak = STRM.slice().sort((a, b) => (b.peak || 0) - (a.peak || 0))[0];
    const wc = STRM.filter(s => s.creators), cr = wc.reduce((a, s) => a + s.creators, 0), crWatch = wc.reduce((a, s) => a + s.watch, 0);
    const vods = TWITCH.reduce((a, t) => a + (t.vods || 0), 0), vodv = TWITCH.reduce((a, t) => a + (t.views || 0), 0);
    const offW = STRM.reduce((a, s) => a + (s.official ? s.official.watch : 0), 0), crW = STRM.reduce((a, s) => a + s.creatorWatch, 0);
    const tiles = [
      [fmtH(watch), 'Hours watched', 'Official channels + creator channels', true],
      [live.toLocaleString('en-US'), 'Live views', 'SEGA channel; not in the Atlus West deck'],
      [air.toFixed(1), 'Hours of airtime', 'Broadcast and co-stream time'],
      [peak.peak.toLocaleString('en-US'), 'Highest peak', peak.id === 'atlus' ? 'Terrixdactyl, Atlus Developer Sale' : peak.name],
      [fol.toLocaleString('en-US'), 'New channel follows', 'SEGA + Atlus West channels'],
      [cr, 'Creator streamers', 'Counted once per activation'],
      [fmtH(Math.round(crWatch / cr)), 'Hours watched per creator', `Average across ${plural(wc.length, 'activation')} with a creator count`],
      [vods, 'Twitch VODs in social quests', `${fmt(vodv)} VOD views`]
    ];
    const byWatch = STRM.slice().sort((a, b) => b.watch - a.watch), wmax = byWatch[0].watch;
    const tmax = Math.max(...TWITCH.map(t => t.views || 0), 1);
    const stk = byWatch.map(s => {
      const o = s.official, ow = o ? o.watch : 0, cn = o ? CH[o.ch].name : '';
      const segs = [o && ow ? `<i style="width:${ow / wmax * 100}%;background:${CH[o.ch].c}" data-tip="${esc(`<b>${esc(s.name)}</b><br>${esc(cn)}: ${fmtH(ow)} hrs (${pct(ow / s.watch)})`)}"></i>` : '',
        s.creatorWatch ? `<i style="width:${s.creatorWatch / wmax * 100}%;background:var(--ch-creator)" data-tip="${esc(`<b>${esc(s.name)}</b><br>Creator channels: ${fmtH(s.creatorWatch)} hrs (${pct(s.creatorWatch / s.watch)})`)}"></i>` : ''].join('');
      const split = [o ? `${esc(cn.replace(' Twitch', ''))} ${fmtH(ow)}` : '', s.creatorWatch ? `creators ${fmtH(s.creatorWatch)}` : ''].filter(Boolean).join(' · ');
      return `<a class="srow" href="#${s.qid}"><div class="name">${esc(s.name)}<span>${esc(IPBY[s.ip].name)} · ${split}</span></div><div class="sbar">${segs}</div><div class="val">${fmtH(s.watch)}</div></a>`;
    }).join('');
    const S = chanStats('sega'), A = chanStats('atlus');
    const share = donut([{ name: 'SEGA channel', v: S.watch, color: 'var(--ch-sega)', tip: `<b>SEGA channel</b><br>${fmtH(S.watch)} hrs<br>${pct(S.watch / watch)} of watch time` },
      { name: 'Atlus West channel', v: A.watch, color: 'var(--ch-atlus)', tip: `<b>Atlus West channel</b><br>${fmtH(A.watch)} hrs<br>${pct(A.watch / watch)} of watch time` },
      { name: "Creators' own channels", v: crW, color: 'var(--ch-creator)', tip: `<b>Creators' own channels</b><br>${fmtH(crW)} hrs<br>${pct(crW / watch)} of watch time` }], pct(crW / watch), 'from creator channels', 'Share of watch time by channel type');
    const chCard = (x) => `<div class="panel chcard" style="--c:${CH[x.key].c}"><h3><span class="dot" style="background:${CH[x.key].c};width:12px;height:12px"></span>${esc(CH[x.key].name)}</h3>
      <div class="acts">${x.acts.map(s => `<a href="#${s.qid}">${esc(s.name)}</a>`).join(' · ')}</div>
      <div class="sstats"><div><b class="num">${x.air.toFixed(1)}</b><span>Hours of airtime</span></div><div><b class="num">${fmtH(x.watch)}</b><span>Hours watched on channel</span></div><div><b class="num">${x.live != null ? fmtH(x.live) : '—'}</b><span>Live views${x.live != null ? '' : ' (not reported)'}</span></div>
        <div><b class="num">${fmtH(x.follows)}</b><span>New follows</span></div><div><b class="num">${fmtH(x.chat)}</b><span>Chat messages</span></div><div><b class="num">${x.peak != null ? fmtH(x.peak) : '—'}</b><span>Peak concurrent</span></div></div>
      <p class="note">Creators' own channels added <b>${fmtH(x.creatorWatch)} hours</b> on top: ${x.lift.toFixed(1)}x the channel's own watch time${x.liftActs.length < x.acts.length ? ` on ${esc(x.liftActs.map(s => s.name).join(', '))}, the only SEGA activation with creator-channel hours tracked` : ''}.${CH[x.key].extra ? ' ' + esc(CH[x.key].extra) : ''}</p></div>`;
    const PM = [
      ['Avg. viewers', 'Hours watched ÷ hours of airtime', x => x.watch / x.air, v => v.toFixed(1)],
      ['Follows per hour', 'New follows ÷ hours of airtime', x => x.follows / x.air, v => v.toFixed(1)],
      ['Chat per hour', 'Chat messages ÷ hours of airtime', x => x.chat / x.air, v => Math.round(v).toLocaleString('en-US')],
      ['Creator-channel lift', "Creators' own-channel hours per official-channel hour, where tracked", x => x.lift, v => v.toFixed(1) + 'x']
    ];
    const pair = PM.map(([h, sub, f, F]) => { const a = f(S), b = f(A), m = Math.max(a, b);
      return `<div class="pm"><h4>${esc(h)}</h4><p>${esc(sub)}</p>${[[S, a], [A, b]].map(([x, v]) => `<div class="pb" data-tip="${esc(`<b>${esc(CH[x.key].name)}</b><br>${esc(h)}: ${F(v)}`)}"><span>${esc(CH[x.key].name.replace(' Twitch', ''))}</span><span class="t"><i style="width:${v / m * 100}%;background:${CH[x.key].c}"></i></span><b>${F(v)}</b></div>`).join('')}</div>`; }).join('');
    return `<div class="hero"><div class="wrap">
      <div class="crumbs"><a href="#program">Program</a><span>/</span><span>Streaming</span></div>
      <div class="eyebrow">Streaming hub</div><h1>Streaming</h1>
      <p class="lede">Creator Zone streamers hosted SEGA's and Atlus West's channels, co-streamed official broadcasts and streamed on their own channels across <b>${STRM.length} activations</b>, adding up to <b>${fmtH(watch)} hours watched</b>. <b>${pct(crW / watch)}</b> of that came from creators' own channels.</p>
      <div class="pills"><span>Sources: Twitch Analytics · SullyGnome · LevelUp</span><span>${fmtD(STRM.map(s => s.start).sort()[0])} – Oct 9, 2026</span></div>
      ${copyRow('streaming')}
    </div></div>
    <main><div class="wrap">
      <section><div class="kpis">${tiles.map(([v, l, sub, h]) => `<div class="panel kpi${h ? ' hero-k' : ''}"><div class="v num">${esc(v)}</div><div class="l">${esc(l)}</div><div class="s">${esc(sub)}</div></div>`).join('')}</div></section>
      <section><div class="sec-head"><div><span class="kicker">Watch time</span><h2>Where the watch time came from</h2></div><p class="sec-note">Hours watched split by channel: the official channel creators hosted, and creators' own channels.</p></div>
        <div class="split">
          <div class="panel"><div class="panel-h"><h3>Hours watched by activation</h3><div class="legend"><span><span class="dot" style="background:var(--ch-sega)"></span>SEGA channel</span><span><span class="dot" style="background:var(--ch-atlus)"></span>Atlus West channel</span><span><span class="dot" style="background:var(--ch-creator)"></span>Creator channels</span></div></div><div class="panel-b"><div class="stk">${stk}</div>
            <p class="sec-note" style="margin-top:14px">The CrossWorlds Finals co-stream ran on creator channels alongside the official broadcast, whose own 73,273 hours aren't counted here.</p></div></div>
          <div class="panel"><div class="panel-h"><h3>Share of watch time by channel</h3></div><div class="panel-b"><div class="mix" style="grid-template-columns:minmax(0,1fr)"><div class="donut" style="max-width:240px;margin:0 auto">${share}</div>
            <div class="legend" style="justify-content:center"><span><span class="dot" style="background:var(--ch-sega)"></span>SEGA channel · ${fmtH(S.watch)} hrs (${pct(S.watch / watch)})</span><span><span class="dot" style="background:var(--ch-atlus)"></span>Atlus West channel · ${fmtH(A.watch)} hrs (${pct(A.watch / watch)})</span><span><span class="dot" style="background:var(--ch-creator)"></span>Creators' own channels · ${fmtH(crW)} hrs (${pct(crW / watch)})</span></div></div></div></div>
        </div></section>
      <section><div class="sec-head"><div><span class="kicker">Channel impact</span><h2>SEGA vs Atlus West channels</h2></div><p class="sec-note">What creator-hosted streams delivered on each official Twitch channel. SEGA's figures combine three activations; Atlus West's come from one week-long Stream-A-Thon.</p></div>
        <div class="chgrid">${chCard(S)}${chCard(A)}</div>
        <div class="panel"><div class="panel-h"><h3>Per hour of airtime</h3><span class="muted" style="font-size:13px">Evens out the different amounts of airtime</span></div><div class="panel-b"><div class="pair">${pair}</div>
          <p class="read" style="margin-top:16px">SEGA's channel held more viewers per hour (${(S.watch / S.air).toFixed(1)} vs ${(A.watch / A.air).toFixed(1)}). Atlus West turned airtime into followers at ${((A.follows / A.air) / (S.follows / S.air)).toFixed(1)}x SEGA's rate, and its creators' own channels added ${(A.creatorWatch / A.watch).toFixed(1)}x its watch time, compared with ${S.lift.toFixed(1)}x on SEGA's CNT weekend.</p></div></div>
      </section>
      <section><div class="sec-head"><div><span class="kicker">Share of category</span><h2>How much of the game's Twitch audience we reached</h2></div><p class="sec-note">Where a recap measured it, how program channels ranked among each game's top-100 Twitch channels (SullyGnome).</p></div>
        <div class="acts">${STRM.map(x => `<div class="panel act" style="--c:${col(x.ip)}"><h4><a href="#${x.qid}">${esc(x.name)}</a></h4>${x.category ? `<p style="margin:0;font-size:13.5px;color:var(--ink-2)">${esc(x.category)}</p>` : '<p style="margin:0;font-size:13px" class="muted">Not measured in the recap. Next time, pull the game\'s top-100 Twitch channels for the stream window.</p>'}${x.actions ? `<ul>${x.actions.map(([v, l]) => `<li><b>${esc(v)}</b>${esc(l)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div></section>
      <section><div class="sec-head"><div><span class="kicker">All activations</span><h2>Streaming activations</h2></div><p class="sec-note">Select an activation for its quest page.</p></div>
        <div class="panel tscroll"><table><thead><tr><th>Activation</th><th>Format</th><th>Dates</th><th class="r">Hours watched</th><th class="r">Live views</th><th class="r">Peak</th><th class="r">Airtime (hrs)</th><th class="r">Follows</th><th class="r">Creators</th></tr></thead><tbody>
        ${STRM.slice().sort((a, b) => b.start.localeCompare(a.start)).map(s => `<tr class="qrow" data-href="#${s.qid}"><td><a href="#${s.qid}"><span class="dot" style="background:${col(s.ip)};margin-right:8px"></span>${esc(s.name)}</a><span class="qsub">${esc(IPBY[s.ip].name)} · ${esc(s.channel)}</span></td><td><span class="chan">${esc(s.format)}</span></td><td style="white-space:nowrap">${esc(s.window)}</td><td class="r num">${fmtH(s.watch)}</td><td class="r num">${s.live != null ? fmtH(s.live) : '—'}</td><td class="r num">${s.peak != null ? (s.peakEst ? '~' : '') + fmtH(s.peak) : '—'}</td><td class="r num">${s.airtime}</td><td class="r num">${s.follows != null ? s.follows : '—'}</td><td class="r num">${s.creators != null ? s.creators : '—'}</td></tr>`).join('')}
        </tbody></table></div></section>
      <section><div class="sec-head"><div><span class="kicker">Activation detail</span><h2>What each stream delivered</h2></div></div>
        <div class="sgrid">${STRM.slice().sort((a, b) => b.watch - a.watch).map(s => `<div class="panel scard" style="--c:${col(s.ip)}"><h3><a href="#${s.qid}">${esc(s.name)}</a></h3>
          <div class="muted" style="font-size:12.5px;margin-top:-8px">${esc(IPBY[s.ip].name)} · ${esc(s.window)}, 2026 · ${esc(s.channel)}</div>
          <div class="sstats">${s.parts.map(([l, v]) => `<div><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}<div><b class="num">${fmtH(s.watch)}</b><span>Hours watched</span></div></div>
          <p class="note">${esc(s.note)}<br><span>Source: ${esc(s.source)}</span>${s.url ? ` · <a href="${esc(s.url)}" target="_blank" rel="noopener">Recap ↗</a>` : ''}</p></div>`).join('')}</div></section>
      <section><div class="sec-head"><div><span class="kicker">Twitch inside social quests</span><h2>Twitch VODs from creator quests</h2></div><p class="sec-note">Livestream VODs that creators published as part of social quests. LevelUp tracks VOD replay views only, not live viewers or chat.</p></div>
        <div class="panel tscroll"><table><thead><tr><th>Quest</th><th class="r">VODs</th><th class="r">VOD views</th></tr></thead><tbody>
        ${TWITCH.map(t => `<tr class="qrow" data-href="#${t.qid}"><td><a href="#${t.qid}"><span class="dot" style="background:${col(t.ip)};margin-right:8px"></span>${esc(t.name)}</a><span class="qsub">${esc(IPBY[t.ip].name)}</span></td><td class="r num">${t.vods != null ? t.vods : '—'}</td><td class="r"><div class="minibar"><span class="mt"><i style="width:${(t.views || 0) / tmax * 100}%;background:${col(t.ip)}"></i></span><span class="mono">${fmt(t.views)}</span></div></td></tr>`).join('')}
        </tbody></table></div></section>
      <section><div class="panel dbox"><h3>How streaming is measured</h3><ul>
        <li>Sources: Twitch Analytics for the official SEGA and Atlus West channels (airtime, watch hours, live views, follows, chat); SullyGnome for creator channels and top-100 rankings (plus YouTube Studio for one Atlus creator); LevelUp for Twitch VOD views and creator-channel hours on CNT.</li>
        <li>Hours watched split into the official channel creators hosted and creators' own channels. CNT counts on-topic creator-channel hours only. The Atlus West channel's 2,065 hours are the 12,631-hour total less 10,343 creator Twitch hours and 223 YouTube hours.</li>
        <li>Live views are reported for the SEGA channel only. An earlier Atlus recap listed 14,957 live views for the first 32.3 hours of airtime; the final deck doesn't report live views for the full window.</li>
        <li>Per-hour rates divide by each channel's own airtime. The CNT deck doesn't give a reliable peak, so SEGA's peak (337) comes from the Virtua Fighter streams.</li>
        <li>The CrossWorlds Finals peak (~1,500) is read from charts and is an estimate.</li>
        <li>Streaming numbers are kept separate from the social views and impressions totals.</li>
      </ul></div></section>
    </div></main>`;
  }

  const qstate = { ip: 'all', status: 'all', q: '' };
  function viewQuests() {
    return `<div class="hero"><div class="wrap">
      <div class="crumbs"><a href="#program">Program</a><span>/</span><span>All quests</span></div>
      <div class="eyebrow">Quest index</div><h1>All quests</h1>
      <p class="lede">Every quest and collab on the program tracker, plus recapped quests that aren't on it yet. Filter by IP or status, or search by title.</p>
      ${copyRow('quests')}
    </div></div>
    <main><div class="wrap"><section>
      <div class="filters">
        <div class="chips" id="qIP">${[{ key: 'all', name: 'All IPs' }, ...IPS].map(i => `<button class="chip" data-v="${i.key}" aria-pressed="${qstate.ip === i.key}">${i.c ? `<span class="dot" style="background:var(${i.c})"></span>` : ''}${esc(i.name)}</button>`).join('')}</div>
        <div class="seg" id="qSt">${[['all', 'All'], ['res', 'With results'], ['pending', 'Pending']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${qstate.status === v}">${l}</button>`).join('')}</div>
        <input type="search" id="qSearch" placeholder="Search quest titles" aria-label="Search quest titles" value="${esc(qstate.q)}">
      </div>
      <div class="panel tscroll"><table class="qt">${QHEAD(true)}<tbody id="qBody"></tbody></table></div>
      <p class="sec-note" id="qCount"></p>
    </section></div></main>`;
  }
  function fillQuests() {
    const list = QUESTS.filter(q => (qstate.ip === 'all' || q.ip === qstate.ip)
      && (qstate.status === 'all' || (qstate.status === 'res' ? hasResults(q) : q.status === 'pending'))
      && (!qstate.q || q.title.toLowerCase().includes(qstate.q.toLowerCase())));
    document.getElementById('qBody').innerHTML = list.length ? questRows(list, true) : `<tr><td colspan="8" class="empty">No quests match. Clear the search or choose another filter.</td></tr>`;
    document.getElementById('qCount').textContent = `${plural(list.length, 'quest')} shown · ${list.filter(hasResults).length} with results`;
  }
  function bindQuests() {
    document.getElementById('qIP').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; qstate.ip = b.dataset.v; document.querySelectorAll('#qIP .chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === qstate.ip)); fillQuests(); });
    document.getElementById('qSt').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; qstate.status = b.dataset.v; document.querySelectorAll('#qSt button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === qstate.status)); fillQuests(); });
    document.getElementById('qSearch').addEventListener('input', e => { qstate.q = e.target.value; fillQuests(); });
    fillQuests();
  }

  function viewMethod() {
    const urls = new Map();
    CAMPS.filter(c => c.url).forEach(c => { if (!urls.has(c.url)) urls.set(c.url, []); urls.get(c.url).push(c.name); });
    STREAMS.filter(s => s.url).forEach(s => { if (!urls.has(s.url)) urls.set(s.url, []); if (!urls.get(s.url).includes(s.name)) urls.get(s.url).push(s.name); });
    const pdfOnly = [...CAMPS.filter(c => !c.url && c.source !== 'export').map(c => c.name), ...STREAMS.filter(s => !s.url).map(s => s.name)];
    const exportOnly = CAMPS.filter(c => c.source === 'export').map(c => c.name);
    return `<div class="hero"><div class="wrap"><div class="crumbs"><a href="#program">Program</a><span>/</span><span>Method</span></div><div class="eyebrow">Methodology</div><h1>How to read these numbers</h1>${copyRow('method')}</div></div>
    <main><div class="wrap">
      <section><div class="mgrid">
        <div class="panel dbox"><dl>
          <dt>Views &amp; impressions</dt><dd>LevelUp views on tracked creator publications for each quest window: video views plus views on X posts. Impressions on non-video posts are left out, matching the recap decks, and noted where they matter.</dd>
          <dt>Data sources</dt><dd><b>LevelUp</b> for social views, impressions, engagements, publications and Twitch VOD views. <b>SullyGnome</b> for creator-channel watch time, peaks and Twitch top-100 rankings. <b>Twitch Analytics</b> for the official SEGA and Atlus West channels: airtime, watch hours, live views, follows and chat.</dd>
          <dt>Average per creator</dt><dd>Totals divided by creator activations, where a creator counts once per quest. The median-quest figure under each average shows the typical quest, since a few viral posts lift the mean.</dd>
          <dt>Benchmarks</dt><dd>Quest pages compare each quest with the program median and the median for its quest type. Medians are used so one viral post doesn't skew the comparison. External engagement benchmarks are Dash Social's 2026 engagements ÷ views for brand content (2.1% Instagram, 2.8% TikTok, via IQFluence); creator content usually runs higher than brand pages.</dd>
          <dt>Concentration</dt><dd>"Top post share" is the biggest single post's views ÷ the quest's views &amp; impressions, using the top posts listed in each recap. "Videos over 10K views" counts videos (not image or text posts) in the LevelUp exports.</dd>
          <dt>Creator community</dt><dd>Creators are matched by name across the LevelUp exports. "Returning" means the creator appeared in an earlier quest's export. Size tiers use the creator's total followers across platforms: nano under 10K, micro 10K–100K, mid 100K–500K, macro 500K–1M, mega 1M+.</dd>
          <dt>Cost &amp; CPM</dt><dd>Effective CPM = incentive value ÷ views &amp; impressions × 1,000; incentive value counts codes at retail value, plus merch, prizes and fees. Paid-media equivalent = views &amp; impressions ÷ 1,000 × a $5, $10 or $15 scenario CPM. Streaming uses cost per viewer-hour.</dd>
          <dt>Time periods</dt><dd>The period filter groups quests by the month they started: Q2 (Apr–Jun, including May), Q3 (Jul–Sep) and Q4 (Oct–Dec).</dd>
          <dt>Short form vs long form</dt><dd>Each video in the LevelUp export is tagged by platform and length. Short form: every TikTok, plus YouTube Shorts, Instagram Reels and X or Facebook videos of 3 minutes or less. Long form: other videos over 3 minutes. Image and text posts with no video length are left out. Livestreams are kept apart: Twitch VODs and YouTube videos over an hour (live replays). Exports don’t flag Shorts directly, so length is the test. Quests with only a recap deck have no per-video data. Format views come from the raw export, so they can differ slightly from the deck headline.</dd>
          <dt>Engagements</dt><dd>Likes, comments, shares and saves on those publications. Twitch engagements are not tracked.</dd>
          <dt>Total measured exposure</dt><dd>Views &amp; impressions plus engagements, matching the recap decks.</dd>
          <dt>Engagement rate</dt><dd>Engagements divided by views &amp; impressions. Program and IP rates leave out Club Chaos, whose recap reports video views only.</dd>
          <dt>Content pieces</dt><dd>Tracked creator publications: videos, posts, VODs and livestreams.</dd>
          <dt>Creator activations</dt><dd>Creators counted once per quest, so a creator in three quests counts three times.</dd>
          <dt>Which number we use</dt><dd>Each quest shows the views &amp; impressions figure from its own recap deck. Most decks count views; newer decks add tracked impressions where available. Quests without a recap deck use LevelUp views directly.</dd>
          <dt>IP groups</dt><dd>Quests sit under the IP tab they have on the program tracker. Publisher sales, Kura Sushi and Crazy Taxi quests are on the SEGA &amp; Licensing tab.</dd>
        </dl></div>
        <div class="panel dbox"><h3>Known overlaps and caveats</h3><ul>
          <li>Jaden's Instagram Reel is counted in both the Year 2 and Club Chaos recaps (about 86K engagements in each).</li>
          ${D.program.shared ? `<li>${D.program.shared.posts} posts (about ${fmt(D.program.shared.views)} views) appear in more than one quest's export, mostly multi-game reaction videos and posts covering two sales. Each quest's recap counts them, so they are counted in each; that is under 1% of program views. Each quest's notes list its shared posts.</li>` : ''}
          <li>Stranger Than Heaven NYC Preview, Final Impressions and Act 1: Kokura are de-duplicated: each post counts once, under the first quest that tracked it (Kokura, then NYC Preview). Their recap decks report each quest's full totals.</li>
          <li>KhloeCosmos' Twitch stream (2,016 views) appears in both the Metaphor Switch 2 announcement and Stranger Than Heaven recaps.</li>
          <li>Crazy Taxi Arrives in Sonic Racing is on both the Sonic and SEGA &amp; Licensing tabs; it is counted once, under Sonic.</li>
          <li>Single posts drive several results: Eri la Nutria's Reel (582K views, RGG sale), Frack's Sonic Deals on X (274K, Seattle) and Jaden's Reel (807K, Year 2).</li>
          <li>Metaphor Switch 2 Demo data was pulled on the last day of its window and may still grow.</li>
          <li>Kura Sushi x Persona includes a paid activation (29 posts). All other quests are organic.</li>
          <li>Chaos Emerald Hunt and Sonic x Fortnite totals come from the Sonic 35th anniversary table in the Club Chaos recap, which has no platform split. The weekly Creator Zone quests and city stops are rolled into the Chaos Hunt total.</li>
          <li>That same table lists Art Gallery Seattle at 622K because it adds 304.9K post impressions; this hub uses the Seattle recap's 316.7K views.</li>
          <li>Quests without a finished recap deck use LevelUp campaign data directly.</li>
          <li>SHINOBI's LevelUp window starts Jun 18, so its total may include content from the Switch 2 announcement quest.</li>
          <li>Creator participation data is not included in this hub.</li>
        </ul></div>
      </div></section>
      <section><div class="panel dbox"><h3>Recap decks used</h3><ul class="sources">${Array.from(urls).map(([u, n]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(n.join(' / '))}</a></li>`).join('')}${pdfOnly.map(n => `<li>${esc(n)} <span class="muted">(recap deck)</span></li>`).join('')}${exportOnly.map(n => `<li>${esc(n)} <span class="muted">(LevelUp export)</span></li>`).join('')}</ul></div></section>
    </div></main>`;
  }

  // ---------- router
  function tabs(active) {
    const items = [['program', 'Program', null], ...IPS.map(i => [i.key, i.name, i.key]), ['streaming', 'Streaming', null], ['cost', 'Cost & CPM', null], ['quests', 'All quests', null], ['method', 'Method', null]];
    document.getElementById('tabs').innerHTML = items.map(([k, l, ip]) => `<a href="#${k}"${active === k ? ' aria-current="page"' : ''}>${ip ? `<span class="dot" style="background:${col(ip)}"></span>` : ''}${esc(l)}</a>`).join('');
  }
  let current = '';
  function route() {
    let h = (location.hash || '').slice(1) || 'program';
    let html, active;
    if (IPBY[h]) { html = viewIP(h); active = h; }
    else if (QBY[h]) { html = viewQuest(QBY[h]); active = QBY[h].ip; }
    else if (h === 'quests') { html = viewQuests(); active = 'quests'; }
    else if (h === 'streaming') { html = viewStreaming(); active = 'streaming'; }
    else if (h === 'method') { html = viewMethod(); active = 'method'; }
    else if (h === 'cost') { html = viewCost(); active = 'cost'; }
    else { h = 'program'; html = viewProgram(); active = 'program'; }
    tabs(active);
    document.getElementById('view').innerHTML = html;
    if (h === 'program') document.getElementById('monthChart').innerHTML = monthChart(campsOf('all'), IPS);
    if (h === 'quests') bindQuests();
    if (h === 'cost') bindCost();
    if (current && current !== h) window.scrollTo(0, 0);
    current = h;
    const t = document.querySelector('#tabs [aria-current="page"]'); if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  addEventListener('hashchange', route);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const m = document.getElementById('monthChart'); if (m) m.innerHTML = monthChart(campsOf('all'), IPS); }, 150); });
  route();
})();
