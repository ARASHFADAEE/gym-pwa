import { DAYS, RULES, WEEK_MAP, TRACKS } from './data.js';

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const ic = (n, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fa = (n, d = 1) => (n === '' || n == null || isNaN(n)) ? '' : Number(n).toLocaleString('fa-IR', { maximumFractionDigits: d, useGrouping: false });
const faG = (n) => Number(n).toLocaleString('fa-IR', { maximumFractionDigits: 0 });
const toNum = (s) => { if (s == null) return NaN; const t = String(s).trim().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.'); return t === '' ? NaN : Number(t); };
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const faDate = (s, opts = { weekday: 'long', day: 'numeric', month: 'long' }) => new Date(s + 'T12:00:00').toLocaleDateString('fa-IR-u-ca-persian', opts);
const mmss = (sec) => { sec = Math.max(0, Math.round(sec)); return `${fa(Math.floor(sec / 60))}:${fa(sec % 60).padStart(2, '۰')}`; };
// localStorage with in-memory cache (parse once, not on every render)
let dataVer = 0; const lsMem = new Map();
const LS = {
  get(k, d) { if (lsMem.has(k)) return lsMem.get(k) ?? d; let v = null; try { v = JSON.parse(localStorage.getItem('gym.' + k)); } catch { } lsMem.set(k, v); return v ?? d; },
  set(k, v) { lsMem.set(k, v); if (k !== 'music' && k !== 'playlists') dataVer++; localStorage.setItem('gym.' + k, JSON.stringify(v)); },
  reset() { lsMem.clear(); dataVer++; },
};
const haptic = (p = 8) => { try { navigator.vibrate?.(p); } catch { } };
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

/* ---------- tabs ---------- */
let curTab = 'workout';
// views are rendered once and only re-rendered when their data changed
const viewVer = {}; const scrollPos = {};
const RENDER = { workout: () => renderWorkout(), history: () => renderHistory(), body: () => renderBody(), music: () => renderMusic(), about: () => renderAbout() };
function showTab(name) {
  if (curTab) scrollPos[curTab] = window.scrollY;
  curTab = name;
  $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  if (name === 'music') renderMusic();
  else if (viewVer[name] !== dataVer) { RENDER[name](); viewVer[name] = dataVer; }
  window.scrollTo(0, scrollPos[name] || 0);
}
const markFresh = (name) => { viewVer[name] = dataVer; };
$$('.tabs button').forEach(b => b.addEventListener('click', () => { haptic(); if (b.dataset.tab !== curTab) showTab(b.dataset.tab); }));

/* ---------- workout data ---------- */
const getSessions = () => LS.get('sessions', {});
const saveSessions = (s) => LS.set('sessions', s);
const todayDay = WEEK_MAP[new Date().getDay()] ?? null;
let selDay = todayDay;
const sessionId = (day) => `${ymd()}_${day}`;
function getSession(day, create = false) {
  const all = getSessions(); const id = sessionId(day);
  if (!all[id] && create) { all[id] = { id, date: ymd(), day, ts: Date.now(), sets: {}, walk: false, finished: false }; saveSessions(all); }
  return all[id] || null;
}
function updateSession(day, fn) { getSession(day, true); const all = getSessions(); const s = all[sessionId(day)]; fn(s); s.ts = Date.now(); saveSessions(all); return s; }
function prevRecord(exId, excludeId) {
  const list = Object.values(getSessions()).filter(s => s.id !== excludeId && s.sets?.[exId]?.some(x => x?.done)).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
  return list.length ? { date: list[0].date, sets: list[0].sets[exId].filter(x => x?.done) } : null;
}
const unitLbl = (ex) => ex.unit === 'sec' ? 'ثانیه' : 'تکرار';
const repTxt = (ex) => ex.min === ex.max ? fa(ex.min) : `${fa(ex.min)}–${fa(ex.max)}`;
const restSec = (ex) => ex.heavy ? 150 : 75;
const totalSets = (day) => day.ex.reduce((a, e) => a + e.sets, 0);
const doneSets = (day) => { const s = getSession(day.id); return s ? day.ex.reduce((a, e) => a + Math.min(e.sets, (s.sets[e.id] || []).filter(x => x?.done).length), 0) : 0; };

/* ---------- header ---------- */
function updateHeader() {
  const wd = new Date().toLocaleDateString('fa-IR-u-ca-persian', { weekday: 'long' });
  $('#h-date').textContent = `${wd}، ${faDate(ymd(), { day: 'numeric', month: 'long' })}`;
  const day = DAYS.find(d => d.id === selDay);
  $('#h-title').textContent = day ? `${day.short}: ${day.title}` : 'روز استراحت';
  const fg = $('#h-ring-fg'), C = 125.66;
  if (day) { const d = doneSets(day), t = totalSets(day); fg.style.strokeDashoffset = C * (1 - d / t); $('#h-ring-txt').textContent = `${fa(d)}/${fa(t)}`; }
  else { fg.style.strokeDashoffset = C; $('#h-ring-txt').textContent = '—'; }
}
$('#h-ring').onclick = () => { if (curTab !== 'workout') showTab('workout'); };

/* ---------- workout view ---------- */
const DAYKEYS = { 1: 'شنبه', 2: 'یکشنبه', 3: 'سه‌شنبه', 4: 'چهارشنبه' };
function renderWorkout() {
  const v = $('#view-workout'); v.innerHTML = '';
  const dp = h('<div class="daypick" role="tablist"></div>');
  DAYS.forEach(d => {
    const b = h(`<button role="tab" aria-selected="${d.id === selDay}" class="${d.id === selDay ? 'active' : ''} ${d.id === todayDay ? 'sched' : ''}"><span class="dn">${fa(d.id)}</span><span class="dl">${esc(d.title.replace(' — ', ' ').replace(' و شکم', ''))}</span><span class="dk">${DAYKEYS[d.id]}</span></button>`);
    b.onclick = () => { haptic(); selDay = d.id; renderWorkout(); updateHeader(); };
    dp.append(b);
  });
  v.append(dp);
  if (!selDay) {
    v.append(h(`<div class="card rest-card"><div class="badge-ic">${ic('moon')}</div><h2 style="margin:0 0 8px">امروز روز استراحته</h2>
      <p class="mut" style="margin:0 0 6px">ریکاوری هم بخشی از تمرینه. عضله موقع استراحت رشد می‌کنه.</p>
      <div class="row" style="justify-content:center;margin-top:12px"><span class="chip">${ic('footprints')} ۸ تا ۱۰ هزار قدم</span></div>
      <p class="mut small" style="margin:14px 0 0">برای تمرین خارج از برنامه، یکی از روزهای بالا رو انتخاب کن.</p></div>`));
    v.append(rulesCard()); updateHeader(); markFresh('workout'); return;
  }
  const day = DAYS.find(d => d.id === selDay);
  const mins = Math.round(day.ex.reduce((a, e) => a + e.sets * (restSec(e) + 45), 0) / 60 / 5) * 5;
  v.append(h(`<div class="card hero"><h2>${esc(day.title)}</h2><div class="row">
    <span class="chip">${ic('dumbbell')} ${fa(day.ex.length)} حرکت</span><span class="chip">${ic('list-checks')} ${fa(totalSets(day))} ست</span><span class="chip">${ic('timer')} حدود ${fa(mins)} دقیقه</span></div></div>`));
  v.append(rulesCard());
  // first cards now, the rest right after first paint (keeps startup / day-switch tasks short)
  const token = (v.dataset.r = String(+(v.dataset.r || 0) + 1));
  day.ex.slice(0, 2).forEach((ex, i) => v.append(exCard(day, ex, i)));
  const restEx = day.ex.slice(2);
  const sess = getSession(day.id);
  const end = h(`<div class="card"><div class="sec-title">${ic('flame')} بعد از تمرین</div>
    <label class="switch"><input type="checkbox" id="walk" ${sess?.walk ? 'checked' : ''}><span style="flex:1">۲۰ دقیقه پیاده‌روی تند<br><small class="mut">هدف روزانه: ۸ تا ۱۰ هزار قدم</small></span>${ic('footprints')}</label>
    <button class="btn block lg ${sess?.finished ? 'okb' : 'grad'}" id="finish" style="margin-top:12px">${ic(sess?.finished ? 'circle-check-big' : 'trophy')} ${sess?.finished ? 'جلسه ثبت شد' : 'پایان و ثبت جلسه'}</button></div>`);
  $('#walk', end).onchange = (e) => { haptic(); updateSession(day.id, s => { s.walk = e.target.checked; }); markFresh('workout'); };
  $('#finish', end).onclick = () => {
    if (!doneSets(day)) { toast('هنوز هیچ ستی تیک نخورده'); return; }
    updateSession(day.id, s => { s.finished = true; }); stopTimer(); releaseWake(); haptic([20, 60, 20]);
    toast('جلسه ثبت شد — حالا ۲۰ دقیقه پیاده‌روی تند'); renderWorkout();
  };
  v.append(end);
  updateHeader(); markFresh('workout');
  if (restEx.length) setTimeout(() => {
    if (v.dataset.r !== token) return;
    const frag = document.createDocumentFragment();
    restEx.forEach((ex, i) => frag.append(exCard(day, ex, i + 2)));
    end.before(frag);
  }, 0);
}
function rulesCard() {
  return h(`<details class="card"><summary>${ic('shield-check')} قوانین برنامه ${ic('chevron-down', 'chev')}</summary>
    <ul class="rules">${RULES.map(r => `<li>${ic('check')}<span>${esc(r)}</span></li>`).join('')}</ul></details>`);
}
function fmtSet(s) { const w = toNum(s.w); return `${isNaN(w) ? '—' : fa(w)}×${fa(toNum(s.r))}`; }
function exCard(day, ex, idx) {
  const sess = getSession(day.id);
  const cur = sess?.sets?.[ex.id] || [];
  const prev = prevRecord(ex.id, sessionId(day.id));
  const up = prev && prev.sets.length >= ex.sets && prev.sets.every(s => toNum(s.r) >= ex.max);
  const isDone = () => (getSession(day.id)?.sets?.[ex.id] || []).filter(x => x?.done).length >= ex.sets;
  const card = h(`<div class="card ex ${isDone() ? 'done' : ''}" id="ex-${ex.id}">
    <div class="ex-head"><div class="ex-num">${fa(idx + 1)}</div><div class="ex-title"><h3>${esc(ex.name)}</h3>
      <div class="chips"><span class="chip">${ic('target')} ${fa(ex.sets)} × ${repTxt(ex)} ${unitLbl(ex)}${ex.note ? ' ' + esc(ex.note) : ''}</span>
      <span class="chip">${ic('timer')} ${ex.heavy ? '۲–۳ دقیقه' : '۶۰–۹۰ ثانیه'}</span>${ex.heavy ? `<span class="chip hot">${ic('flame')} سنگین</span>` : ''}</div></div></div>
    <div class="prev">${ic('history', 'sm')} ${prev ? `جلسه قبل (${faDate(prev.date, { day: 'numeric', month: 'short' })}): <b>${prev.sets.map(fmtSet).join('،  ')}</b>` : 'هنوز رکوردی ثبت نشده'}</div>
    ${up ? `<div class="up-hint">${ic('trending-up')} جلسه قبل همه ست‌ها به سقف رسید — وزنه رو زیاد کن</div>` : ''}
    <details class="form-box"><summary>${ic('circle-play')} فرم صحیح و ویدیو آموزشی ${ic('chevron-down', 'chev')}</summary>
      <div class="cue">${ic('sparkles')}<span>${esc(ex.cue)}</span></div>
      ${ex.videos.map((vd, k) => `<button class="vid" data-v="${k}"><span class="vid-ic">${ic('play', 'sm')}</span><span class="vid-t"><b>${esc(vd.title)}</b><small>پخش داخل اپ — ${vd.embed ? 'آپارات' : 'یوتیوب'} · ${esc(vd.ch)}</small></span>${ic('circle-play')}</button>`).join('')}
    </details>
    <div class="sets"><div class="set-h"><span>ست</span><span>وزنه (کیلو)</span><span>${unitLbl(ex)}</span><span></span></div></div></div>`);
  $$('.vid', card).forEach(b => b.onclick = () => openVideo(ex, ex.videos[+b.dataset.v]));
  const box = $('.sets', card);
  for (let i = 0; i < ex.sets; i++) {
    const s = cur[i] || {};
    const ps = prev?.sets[i] || prev?.sets[prev.sets.length - 1];
    const row = h(`<div class="set ${s.done ? 'done' : ''}">
      <div class="n">${fa(i + 1)}</div>
      <label class="pill"><input inputmode="decimal" enterkeyhint="next" aria-label="وزنه ست ${fa(i + 1)}" value="${esc(s.w ?? '')}" placeholder="${ps && !isNaN(toNum(ps.w)) ? fa(toNum(ps.w)) : '—'}" data-k="w"></label>
      <label class="pill"><input inputmode="numeric" enterkeyhint="done" aria-label="${unitLbl(ex)} ست ${fa(i + 1)}" value="${esc(s.r ?? '')}" placeholder="${ps ? fa(toNum(ps.r)) : fa(ex.max)}" data-k="r"></label>
      <button class="chk" aria-label="ست ${fa(i + 1)} انجام شد" aria-pressed="${!!s.done}">${ic('check')}</button></div>`);
    $$('input', row).forEach(inp => inp.addEventListener('change', () => {
      updateSession(day.id, ss => { ss.sets[ex.id] ??= []; ss.sets[ex.id][i] ??= {}; const n = toNum(inp.value); ss.sets[ex.id][i][inp.dataset.k] = isNaN(n) ? '' : String(n); }); markFresh('workout');
    }));
    $('.chk', row).onclick = () => {
      ensureAudio();
      const [wi, ri] = $$('input', row);
      let nowDone;
      const ss = updateSession(day.id, ss => {
        ss.sets[ex.id] ??= []; const st = (ss.sets[ex.id][i] ??= {});
        nowDone = !st.done; st.done = nowDone;
        if (nowDone) {
          const w = toNum(wi.value), r = toNum(ri.value);
          st.w = !isNaN(w) ? String(w) : (ps && !isNaN(toNum(ps.w)) ? String(toNum(ps.w)) : '');
          st.r = !isNaN(r) ? String(r) : String(ps ? toNum(ps.r) : ex.max);
          st.t = Date.now();
        }
        ss.finished = false;
      });
      const st = ss.sets[ex.id][i];
      row.classList.toggle('done', nowDone); row.classList.remove('pop');
      $('.chk', row).setAttribute('aria-pressed', nowDone);
      if (nowDone) {
        wi.value = st.w ? fa(toNum(st.w)) : ''; ri.value = fa(toNum(st.r));
        void row.offsetWidth; row.classList.add('pop'); haptic(30);
        startTimer(restSec(ex), ex.name); requestWake();
      } else haptic(10);
      card.classList.toggle('done', isDone());
      updateHeader(); markFresh('workout');
    };
    box.append(row);
  }
  return card;
}

/* ---------- rest timer ---------- */
let actx; let tEnd = 0, tTotal = 0, tInt = null, tBeeped = false, tHide = null, tMin = false;
const DIAL = 678.58;
// unlock WebAudio on the very first touch (one-time cost), not inside the set-tick handler
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => ensureAudio(), { once: true, passive: true, capture: true }));
function ensureAudio() { try { actx ??= new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch { } }
function beep() {
  if (!actx) return;
  const t0 = actx.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'triangle'; o.frequency.value = i === 2 ? 1320 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.2);
    o.connect(g).connect(actx.destination); o.start(t0 + d); o.stop(t0 + d + 0.22);
  });
}
function startTimer(sec, label = '') {
  tTotal = sec; tEnd = Date.now() + sec * 1000; tBeeped = false; clearTimeout(tHide);
  $('#timer-ex').textContent = label ? `ست بعدی: ${label}` : '';
  $('#timer-sub').textContent = `از ${mmss(sec)}`;
  $('#timer').classList.remove('over'); $('#timer-pill').classList.remove('over');
  setTimerMin(false); clearInterval(tInt); tInt = setInterval(tick, 250); tLastSec = null; tick();
}
function setTimerMin(m) { tMin = m; $('#timer').hidden = m; $('#timer-pill').hidden = !m; tLastSec = null; if (tInt || tBeeped) tick(); }
function stopTimer() { clearInterval(tInt); tInt = null; clearTimeout(tHide); $('#timer').hidden = true; $('#timer-pill').hidden = true; }
let tLastSec = null; const tEls = {};
function tick() {
  const left = (tEnd - Date.now()) / 1000;
  const sec = left > 0 ? Math.ceil(left) : 0;
  if (sec === tLastSec && left > 0) return; tLastSec = sec;
  tEls.time ??= $('#timer-time'); tEls.pill ??= $('#timer-pill-t'); tEls.dial ??= $('#dial-fg');
  const txt = left > 0 ? mmss(sec) : 'بزن بریم!';
  if (tMin) tEls.pill.textContent = left > 0 ? txt : 'وقتشه!';
  else { tEls.time.textContent = txt; tEls.dial.style.strokeDashoffset = DIAL * (1 - Math.max(0, Math.min(1, sec / tTotal))); }
  if (left <= 0 && !tBeeped) {
    tBeeped = true; beep(); haptic([300, 120, 300, 120, 500]);
    $('#timer').classList.add('over'); $('#timer-pill').classList.add('over'); $('#timer-sub').textContent = 'ست بعدی رو شروع کن';
    clearInterval(tInt); tHide = setTimeout(stopTimer, 12000);
  }
}
$('#t-minus').onclick = () => { haptic(); tEnd -= 15000; tLastSec = null; tick(); };
$('#t-plus').onclick = () => { haptic(); if (tBeeped) { startTimer(15, ''); return; } tEnd += 15000; tTotal += 15; tLastSec = null; tick(); };
$('#t-skip').onclick = () => { haptic(); stopTimer(); };
$('#t-min').onclick = () => { haptic(); setTimerMin(true); };
$('#timer-pill').onclick = () => { haptic(); setTimerMin(false); };
document.addEventListener('visibilitychange', () => { if (!document.hidden && tInt) { tLastSec = null; tick(); } if (!document.hidden && wakeWanted) requestWake(); });

/* ---------- wake lock ---------- */
let wake = null, wakeWanted = false;
async function requestWake() { wakeWanted = true; try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch { } }
function releaseWake() { wakeWanted = false; wake?.release?.(); wake = null; }

/* ---------- history ---------- */
function sessionStats(s) {
  const day = DAYS.find(d => d.id === s.day); let sets = 0, vol = 0;
  day.ex.forEach(e => (s.sets[e.id] || []).filter(x => x?.done).forEach(x => { sets++; if (e.unit !== 'sec') { const w = toNum(x.w), r = toNum(x.r); if (!isNaN(w) && !isNaN(r)) vol += w * r; } }));
  return { day, sets, vol };
}
function renderHistory() {
  const v = $('#view-history'); v.innerHTML = ''; viewVer.history = dataVer;
  const list = Object.values(getSessions()).filter(s => Object.values(s.sets).flat().some(x => x?.done)).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
  if (!list.length) { v.append(h(`<div class="card empty"><div class="badge-ic">${ic('calendar-days')}</div><h3>هنوز جلسه‌ای ثبت نشده</h3><p class="small">از تب تمرین اولین ستت رو تیک بزن.</p></div>`)); return; }
  const since = Date.now() - 7 * 864e5;
  const week = list.filter(s => new Date(s.date + 'T12:00:00').getTime() >= since);
  const totVol = list.reduce((a, s) => a + sessionStats(s).vol, 0);
  v.append(h(`<div class="stats"><div class="stat">${ic('calendar-days')}<b>${fa(list.length)}</b><small>کل جلسات</small></div>
    <div class="stat">${ic('zap')}<b>${fa(week.length)}</b><small>۷ روز اخیر</small></div>
    <div class="stat">${ic('activity')}<b>${totVol >= 1000 ? fa(totVol / 1000) + 'k' : faG(totVol)}</b><small>حجم کل (کیلو)</small></div></div>`));
  list.forEach(s => {
    const { day, sets, vol } = sessionStats(s);
    const dd = new Date(s.date + 'T12:00:00');
    const rows = day.ex.filter(e => s.sets[e.id]?.some(x => x?.done)).map(e => `<tr><td>${esc(e.name)}</td><td style="white-space:nowrap">${s.sets[e.id].filter(x => x?.done).map(fmtSet).join('، ')}</td></tr>`).join('');
    const c = h(`<details class="card hist ${s.finished ? 'fin' : ''}"><summary>
      <span class="date-badge"><b>${dd.toLocaleDateString('fa-IR-u-ca-persian', { day: 'numeric' })}</b><small>${dd.toLocaleDateString('fa-IR-u-ca-persian', { month: 'short' })}</small></span>
      <span class="hd"><b>${esc(day.title)}</b><small class="mut">${dd.toLocaleDateString('fa-IR-u-ca-persian', { weekday: 'long' })}، ${day.short}</small></span>
      <span class="hs"><b>${fa(sets)}</b> ست<br>${faG(Math.round(vol))} کیلو</span>${ic('chevron-down', 'chev')}</summary>
      <table style="margin-top:8px"><tr><th>حرکت</th><th>کیلو × تکرار</th></tr>${rows}</table>
      <div class="row" style="justify-content:space-between;margin-top:12px"><span class="chip ${s.walk ? 'up' : ''}">${ic('footprints')} ${s.walk ? 'پیاده‌روی انجام شد' : 'پیاده‌روی ثبت نشده'}</span>
      <button class="btn danger" style="min-height:44px">${ic('trash-2', 'sm')} حذف</button></div></details>`);
    $('.btn.danger', c).onclick = () => { if (confirm('این جلسه حذف بشه؟')) { const all = getSessions(); delete all[s.id]; saveSessions(all); renderHistory(); updateHeader(); } };
    v.append(c);
  });
}

/* ---------- body log ---------- */
function renderBody() {
  const v = $('#view-body'); v.innerHTML = ''; viewVer.body = dataVer;
  const log = LS.get('body', []).sort((a, b) => a.date.localeCompare(b.date));
  const last = log[log.length - 1], first = log[0];
  if (log.length) {
    const dW = last.weight != null && first.weight != null ? last.weight - first.weight : null;
    const dC = last.waist != null && first.waist != null ? last.waist - first.waist : null;
    const sg = (x) => x == null ? '—' : (x > 0 ? '+' : '') + fa(x);
    v.append(h(`<div class="stats"><div class="stat">${ic('scale')}<b>${fa(last.weight) || '—'}</b><small>وزن فعلی</small></div>
      <div class="stat">${ic('ruler')}<b>${fa(last.waist) || '—'}</b><small>دور کمر</small></div>
      <div class="stat">${ic('trending-up')}<b dir="ltr">${sg(dW)}</b><small>تغییر وزن</small></div></div>`));
  }
  const form = h(`<div class="card"><div class="sec-title">${ic('plus')} ثبت هفتگی</div><div class="grid2">
    <div class="field"><label>وزن (کیلوگرم)</label><input id="bw" inputmode="decimal" placeholder="۸۲٫۵"></div>
    <div class="field"><label>دور کمر (سانتی‌متر)</label><input id="bwaist" inputmode="decimal" placeholder="۹۰"></div></div>
    <div class="field" style="margin-top:10px"><label>تاریخ</label><input id="bdate" type="date" value="${ymd()}"></div>
    <button class="btn grad block lg" style="margin-top:14px" id="bsave">${ic('check')} ثبت</button>
    <p class="mut small" style="margin:10px 0 0">هفته‌ای یک بار، صبح ناشتا اندازه بگیر.</p></div>`);
  $('#bsave', form).onclick = () => {
    const w = toNum($('#bw', form).value), c = toNum($('#bwaist', form).value), d = $('#bdate', form).value || ymd();
    if (isNaN(w) && isNaN(c)) { toast('حداقل یکی رو وارد کن'); return; }
    const all = LS.get('body', []).filter(x => x.date !== d); all.push({ date: d, weight: isNaN(w) ? null : w, waist: isNaN(c) ? null : c });
    LS.set('body', all); haptic(20); toast('ثبت شد'); renderBody();
  };
  v.append(form);
  if (log.length) {
    v.append(h(`<div class="card"><div class="sec-title">${ic('activity')} روند</div>${chartSVG(log)}
      <div class="legend"><span><i style="background:#ff5340"></i>وزن</span><span><i style="background:#4cc9f0"></i>دور کمر</span></div></div>`));
    const t = h(`<div class="card"><table><tr><th>تاریخ</th><th>وزن</th><th>کمر</th><th></th></tr>${log.slice().reverse().map(x => `<tr><td>${faDate(x.date, { day: 'numeric', month: 'short', year: '2-digit' })}</td><td>${fa(x.weight)}</td><td>${fa(x.waist)}</td><td style="text-align:end"><button class="icon-btn" style="width:40px;height:40px;color:#ff6b6b" aria-label="حذف" data-d="${x.date}">${ic('trash-2', 'sm')}</button></td></tr>`).join('')}</table></div>`);
    $$('button[data-d]', t).forEach(b => b.onclick = () => { if (confirm('حذف بشه؟')) { LS.set('body', LS.get('body', []).filter(x => x.date !== b.dataset.d)); renderBody(); } });
    v.append(t);
  }
}
function chartSVG(log) {
  const W = 600, H = 300, P = { l: 70, r: 70, t: 24, b: 44 };
  const xs = log.map(x => new Date(x.date).getTime()); const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const X = (t) => P.l + (x1 === x0 ? (W - P.l - P.r) / 2 : (t - x0) / (x1 - x0) * (W - P.l - P.r));
  const series = (key, color, side, gid) => {
    const pts = log.filter(x => x[key] != null).map(x => [new Date(x.date).getTime(), x[key]]);
    if (!pts.length) return '';
    let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])); if (hi - lo < 2) { lo -= 1; hi += 1; }
    const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    const area = pts.length > 1 ? `<path d="${path}L${X(pts[pts.length - 1][0]).toFixed(1)},${H - P.b}L${X(pts[0][0]).toFixed(1)},${H - P.b}Z" fill="url(#${gid})"/>` : '';
    const ax = side === 'r' ? W - P.r + 10 : 6;
    return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${area}
      <path d="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="6" fill="#07080c" stroke="${color}" stroke-width="3"/>`).join('')}
      <text x="${ax}" y="${P.t + 8}" fill="${color}" font-size="21" font-weight="700">${fa(hi)}</text><text x="${ax}" y="${H - P.b}" fill="${color}" font-size="21" font-weight="700">${fa(lo)}</text>`;
  };
  const grid = [0, 1, 2, 3].map(i => { const y = P.t + i * (H - P.t - P.b) / 3; return `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.07)" stroke-dasharray="4 6"/>`; }).join('');
  const lbl = [log[0], log[log.length - 1]].map((x, i) => `<text x="${X(new Date(x.date).getTime())}" y="${H - 10}" fill="#8b91a3" font-size="19" text-anchor="${i ? 'end' : 'start'}">${faDate(x.date, { day: 'numeric', month: 'short' })}</text>`).join('');
  return `<svg class="chart" direction="ltr" style="direction:ltr" viewBox="0 0 ${W} ${H}" font-family="Vazirmatn">${grid}${series('weight', '#ff5340', 'l', 'gw')}${series('waist', '#4cc9f0', 'r', 'gc')}${lbl}</svg>`;
}

/* ---------- IndexedDB for user audio ---------- */
const idb = (() => {
  let dbp;
  const open = () => dbp ??= new Promise((res, rej) => { const r = indexedDB.open('gym-audio', 1); r.onupgradeneeded = () => r.result.createObjectStore('tracks', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('tracks', mode); const out = fn(t.objectStore('tracks')); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };
  return { all: () => tx('readonly', st => st.getAll()), put: (o) => tx('readwrite', st => st.put(o)), del: (id) => tx('readwrite', st => st.delete(id)) };
})();

/* ---------- music player ---------- */
const audio = $('#audio');
// optional offline copies of built-in tracks, served by the SW only for URLs in this cache.
// dls.musics-fa.com sends CORS headers -> real (verifiable) responses; dl.sevilmusics.com doesn't -> opaque responses.
const OFF_CACHE = 'gym-offline-v1';
const CORS_HOSTS = ['dls.musics-fa.com'];
const normUrl = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
const LIB = TRACKS.map(t => ({ ...t, id: 'b:' + t.id, builtin: true }));
let lib = LIB.slice(); const byId = new Map(); const reindex = () => { byId.clear(); lib.forEach(t => byId.set(t.id, t)); }; reindex();
let mState = LS.get('music', null) || { shuffle: false, repeat: 'all', last: null };
mState.ctx ??= 'all'; mState.view ??= 'all';
if (mState.last?.startsWith('b:http')) mState.last = LIB.find(t => t.src === mState.last.slice(2))?.id || null; // v5 ids were URLs
// user playlists: { lists: [{ id, name, items: [trackId] }] } — ids: 'b:<slug>' built-in, 'c:<idb id>' phone songs
let PL = LS.get('playlists', null) || { lists: [] };
const savePL = () => LS.set('playlists', PL);
const getList = (id) => PL.lists.find(l => l.id === id);
const ctxTracks = (ctx) => ctx === 'all' ? lib : (getList(ctx)?.items || []).map(id => byId.get(id)).filter(Boolean);
const ctxName = (ctx) => ctx === 'all' ? 'همه آهنگ‌ها' : (getList(ctx)?.name || '');
let queue = lib, order = [], pos = -1, nowT = null, offSet = new Set(), wantPlay = false, errStreak = 0, retried = null;
const curTrack = () => nowT;
function buildOrder(keepId) {
  order = queue.map((_, i) => i); pos = -1;
  if (mState.shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const idx = keepId ? queue.findIndex(t => t.id === keepId) : -1;
  if (idx >= 0) { if (mState.shuffle) { order.splice(order.indexOf(idx), 1); order.unshift(idx); } pos = order.indexOf(idx); }
}
function setQueue(ctx, keepId = nowT?.id) {
  if (ctx !== 'all' && !getList(ctx)) ctx = 'all';
  mState.ctx = ctx; queue = ctxTracks(ctx); buildOrder(keepId); LS.set('music', mState);
}
const refreshQueue = () => { const p = order[pos]; const ids = queue.map(t => t.id).join(); queue = ctxTracks(mState.ctx); if (queue.map(t => t.id).join() !== ids || p == null) buildOrder(nowT?.id); };
async function loadCustom() {
  try {
    const items = await idb.all();
    lib.filter(t => !t.builtin).forEach(t => URL.revokeObjectURL(t.src));
    lib = LIB.concat(items.sort((a, b) => a.added - b.added).map(it => ({ id: 'c:' + it.id, dbId: it.id, title: it.name, artist: 'فایل خودم', src: URL.createObjectURL(it.blob), builtin: false })));
  } catch (e) { console.warn('idb', e); lib = LIB.slice(); }
  reindex(); if (mState.ctx !== 'all' && !getList(mState.ctx)) mState.ctx = 'all';
  if (nowT && !byId.has(nowT.id)) { audio.pause(); audio.removeAttribute('src'); nowT = null; }
  else if (nowT) nowT = byId.get(nowT.id);
  queue = ctxTracks(mState.ctx); buildOrder(nowT?.id || mState.last);
}
async function refreshOffline() {
  if (!('caches' in window)) return;
  try {
    const c = await caches.open(OFF_CACHE); const keys = await c.keys(); const known = new Set(LIB.map(t => normUrl(t.src)));
    for (const r of keys) if (!known.has(r.url)) { c.delete(r); swPost({ type: 'off-del', url: r.url }); } // links no longer in the list
    offSet = new Set(keys.map(r => r.url).filter(u => known.has(u)));
  } catch { }
}
const isOffline = (t) => !t.builtin || offSet.has(normUrl(t.src));
const swPost = (msg) => navigator.serviceWorker?.controller?.postMessage(msg);
async function downloadTrack(t) {
  if (!t?.builtin || isOffline(t)) return true;
  if (!navigator.serviceWorker?.controller) { toast('برای دانلود، اپ رو یک بار ببند و دوباره باز کن'); return false; }
  try {
    const u = normUrl(t.src); const cors = CORS_HOSTS.includes(new URL(u).hostname);
    const r = await fetch(u, { mode: cors ? 'cors' : 'no-cors', cache: 'no-store' });
    if (cors && (!r.ok || r.status !== 200)) throw new Error('HTTP ' + r.status);
    const c = await caches.open(OFF_CACHE);
    await c.put(u, r); offSet.add(u); swPost({ type: 'off-add', url: u }); return true;
  } catch (e) { console.warn('download fail', t.title, e); return false; }
}
async function removeOffline(t) {
  const c = await caches.open(OFF_CACHE); const u = normUrl(t.src);
  await c.delete(u); offSet.delete(u); swPost({ type: 'off-del', url: u });
}
function playAt(p, autoplay = true) {
  if (!order.length) return;
  const prevT = nowT;
  pos = (p + order.length) % order.length;
  const t = queue[order[pos]]; nowT = t; audio.preload = 'auto'; audio.src = t.src;
  if (prevT && prevT !== t) { markRow(prevT); markRow(t); } mState.last = t.id; LS.set('music', mState);
  if (autoplay) { wantPlay = true; audio.play().catch(e => { if (e.name !== 'AbortError') console.info('play:', e.message); }); }
  setMediaSession(t); updatePlayerUI();
}
function togglePlay() { haptic(); if (!nowT || !audio.src) { playAt(Math.max(0, pos)); return; } if (audio.paused) { wantPlay = true; if (audio.error) playAt(pos); else audio.play().catch(() => { }); } else { wantPlay = false; audio.pause(); } }
function next(auto = false) {
  if (!order.length) return;
  if (auto && mState.repeat === 'off' && pos === order.length - 1) { audio.pause(); updatePlayerUI(); return; }
  playAt(pos + 1);
}
function prev() { if (audio.currentTime > 4) { audio.currentTime = 0; return; } playAt(pos < 0 ? 0 : pos - 1); }
audio.addEventListener('ended', () => { if (mState.repeat === 'one') { audio.currentTime = 0; audio.play(); } else next(true); });
['play', 'pause', 'loadedmetadata'].forEach(ev => audio.addEventListener(ev, updatePlayerUI));
audio.addEventListener('timeupdate', () => updateProgress());
audio.addEventListener('playing', () => { errStreak = 0; retried = null; });
audio.addEventListener('error', () => {
  const t = nowT; if (!t || !audio.getAttribute('src') || !wantPlay) return;
  // downloaded track + freshly started SW: give it one retry before skipping
  if (isOffline(t) && t.builtin && retried !== t.id) { retried = t.id; setTimeout(() => { audio.src = t.src; audio.play().catch(() => { }); }, 400); return; }
  errStreak++;
  if (errStreak >= Math.min(order.length, 5)) { wantPlay = false; toast(navigator.onLine ? 'لینک‌ها باز نمی‌شن — بعداً دوباره امتحان کن' : 'اینترنت وصل نیست — آهنگ‌های دانلودشده یا فایل‌های گوشی رو پخش کن'); updatePlayerUI(); return; }
  toast(`«${t.title}» باز نشد — آهنگ بعدی`); next();
});
function setMediaSession(t) {
  if (!('mediaSession' in navigator) || !t) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: mState.ctx === 'all' ? 'باشگاه آرش' : `${ctxName(mState.ctx)} — باشگاه آرش`, artwork: [192, 512].map(s => ({ src: new URL(`icons/icon-${s}.png`, location.href).href, sizes: `${s}x${s}`, type: 'image/png' })) });
}
if ('mediaSession' in navigator) {
  const set = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { } };
  set('play', () => { wantPlay = true; audio.play(); }); set('pause', () => { wantPlay = false; audio.pause(); });
  set('nexttrack', () => next()); set('previoustrack', () => prev());
  set('seekto', (d) => { audio.currentTime = d.seekTime; });
  set('seekbackward', (d) => { audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset || 10)); });
  set('seekforward', (d) => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (d.seekOffset || 10)); });
}
const seek = $('#seek');
seek.addEventListener('input', () => { seek.dragging = true; $('#p-cur').textContent = mmss(+seek.value); seek.style.setProperty('--p', `${seek.max > 0 ? seek.value / seek.max * 100 : 0}%`); });
seek.addEventListener('change', () => { audio.currentTime = +seek.value; seek.dragging = false; });
// progress: at most one DOM write per second; seek/time only when the now-playing sheet is open
const pEls = {}; let pLast = -1, pDur = -1;
function updateProgress(force) {
  const d = audio.duration || 0, c = audio.currentTime || 0, sec = Math.floor(c);
  if (!force && sec === pLast) return; pLast = sec;
  pEls.mini ??= $('#mini-prog'); pEls.np ??= $('#np'); pEls.cur ??= $('#p-cur'); pEls.dur ??= $('#p-dur');
  if (!$('#mini').hidden) pEls.mini.style.transform = `scaleX(${d ? c / d : 0})`;
  if (!pEls.np.hidden) {
    if (!seek.dragging) { if (pDur !== d) { seek.max = d || 0; } seek.value = c; seek.style.setProperty('--p', `${d ? c / d * 100 : 0}%`); pEls.cur.textContent = mmss(c); }
    if (pDur !== d) { pEls.dur.textContent = mmss(d); pDur = d; }
  }
}
function syncPosition() {
  const d = audio.duration;
  if ('mediaSession' in navigator && d && isFinite(d)) { try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(audio.currentTime, d), playbackRate: audio.playbackRate }); } catch { } }
}
['loadedmetadata', 'play', 'pause', 'seeked', 'ratechange'].forEach(ev => audio.addEventListener(ev, syncPosition));
const setUse = (btn, name) => { const u = btn.querySelector('use'); if (u) u.setAttribute('href', '#i-' + name); };
let uiCur = null, uiPlaying = null;
function updatePlayerUI() {
  const t = nowT; const playing = !audio.paused;
  $('#mini').hidden = !(t && audio.getAttribute('src'));
  if (t) { $('#mini-title').textContent = t.title; $('#mini-artist').textContent = t.artist; $('#np-title').textContent = t.title; $('#np-artist').textContent = t.artist; }
  else { $('#np-title').textContent = 'یه آهنگ انتخاب کن'; $('#np-artist').textContent = ''; }
  setUse($('#mini-play'), playing ? 'pause' : 'play'); setUse($('#p-play'), playing ? 'pause' : 'play');
  $('#np').classList.toggle('paused', !playing);
  const nx = order.length > 1 ? queue[order[(pos + 1) % order.length]] : null; $('#np-next').textContent = nx ? `بعدی: ${nx.title}${mState.ctx !== 'all' ? ` · ${ctxName(mState.ctx)}` : ''}` : '';
  $('#p-shuf').classList.toggle('on', mState.shuffle);
  $('#p-rep').classList.toggle('on', mState.repeat !== 'off'); setUse($('#p-rep'), mState.repeat === 'one' ? 'repeat-1' : 'repeat');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  // only touch the rows whose state changed (list can be ~100 rows)
  if (uiCur !== t?.id || uiPlaying !== playing) {
    $$('#plist li.cur').forEach(li => { if (li.dataset.id !== t?.id) li.classList.remove('cur', 'playing'); });
    if (t) $$(`#plist li[data-id="${CSS.escape(t.id)}"]`).forEach(li => { li.classList.add('cur'); li.classList.toggle('playing', playing); });
    uiCur = t?.id; uiPlaying = playing;
  }
  const npc = $('#np-card'); if (npc) { $('b', npc).textContent = t?.title || 'هنوز چیزی پخش نشده'; $('small', npc).textContent = t ? (playing ? 'در حال پخش — ' : 'متوقف — ') + t.artist + (mState.ctx !== 'all' ? ` · ${ctxName(mState.ctx)}` : '') : 'یه آهنگ از لیست انتخاب کن'; setUse($('.icon-btn', npc), playing ? 'pause' : 'play'); }
  updateProgress(true);
}
function openNP() { haptic(); $('#np').hidden = false; pDur = -1; updatePlayerUI(); }
function closeNP() { haptic(); $('#np').hidden = true; }
$('#mini-play').onclick = togglePlay; $('#mini-next').onclick = () => { haptic(); next(); }; $('#mini-open').onclick = openNP;
$('#np-close').onclick = closeNP; $('#np-list').onclick = () => { closeNP(); if (mState.view !== mState.ctx) { mState.view = mState.ctx; listDirty = true; } showTab('music'); };
$('#p-play').onclick = togglePlay; $('#p-next').onclick = () => { haptic(); next(); }; $('#p-prev').onclick = () => { haptic(); prev(); };
$('#p-shuf').onclick = () => { haptic(); mState.shuffle = !mState.shuffle; LS.set('music', mState); buildOrder(nowT?.id); updatePlayerUI(); toast(mState.shuffle ? 'پخش تصادفی روشن' : 'پخش تصادفی خاموش'); };
$('#p-rep').onclick = () => { haptic(); mState.repeat = { off: 'all', all: 'one', one: 'off' }[mState.repeat]; LS.set('music', mState); updatePlayerUI(); toast({ off: 'تکرار خاموش', all: 'تکرار همه', one: 'تکرار همین آهنگ' }[mState.repeat]); };

/* ---------- bottom sheet (playlist picker, names, exercise videos) ---------- */
let sheetEl, sheetCard, sheetState = null, ignorePop = false;
function openSheet(node, cls = '', onClose) {
  if (!sheetEl) {
    sheetEl = h(`<div class="sheet" hidden><div class="sheet-bg"></div><div class="sheet-card" role="dialog" aria-modal="true"></div></div>`);
    sheetCard = $('.sheet-card', sheetEl); $('.sheet-bg', sheetEl).onclick = () => closeSheet();
    document.body.append(sheetEl);
    window.addEventListener('popstate', () => { if (ignorePop) { ignorePop = false; if (sheetState) history.pushState({ sheet: 1 }, ''); return; } closeSheet(true); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetState) closeSheet(); });
  }
  const replacing = !!sheetState; if (replacing) { const o = sheetState; sheetState = null; o.onClose?.(); }
  sheetCard.className = 'sheet-card ' + cls; sheetCard.replaceChildren(node);
  sheetEl.hidden = false; sheetState = { onClose };
  if (!replacing && !ignorePop && !history.state?.sheet) history.pushState({ sheet: 1 }, '');
  $$('[data-close]', node).forEach(b => b.onclick = () => closeSheet());
}
function closeSheet(fromPop) {
  if (!sheetState) return; const o = sheetState; sheetState = null;
  sheetEl.hidden = true; sheetCard.replaceChildren(); // drops any iframe -> stops the video and frees memory
  o.onClose?.();
  if (!fromPop && history.state?.sheet) { ignorePop = true; history.back(); }
}
function askName(title, initial = '') {
  return new Promise(res => {
    let val = null;
    const n = h(`<form class="sheet-form"><div class="sheet-h"><b>${esc(title)}</b><button type="button" class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div>
      <input class="field" maxlength="40" placeholder="مثلاً: ددلیفت سنگین" value="${esc(initial)}" aria-label="نام پلی‌لیست" enterkeyhint="done"><button class="btn grad block" type="submit">${ic('check', 'sm')} ذخیره</button></form>`);
    n.onsubmit = (e) => { e.preventDefault(); const v = $('input', n).value.trim(); if (!v) { $('input', n).focus(); return; } val = v.slice(0, 40); closeSheet(); };
    openSheet(n, '', () => res(val));
    setTimeout(() => $('input', n)?.focus(), 60);
  });
}

/* ---------- playlists ---------- */
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
async function createList(firstTrack) {
  const name = await askName('پلی‌لیست جدید'); if (!name) return null;
  const l = { id: newId(), name, items: firstTrack ? [firstTrack.id] : [] }; PL.lists.push(l); savePL();
  toast(firstTrack ? `«${firstTrack.title}» به «${name}» اضافه شد` : `پلی‌لیست «${name}» ساخته شد`); return l;
}
function toggleInList(l, t) {
  const i = l.items.indexOf(t.id);
  if (i >= 0) l.items.splice(i, 1); else l.items.push(t.id);
  savePL(); if (mState.ctx === l.id) refreshQueue(); listDirty = true;
  toast(i >= 0 ? `از «${l.name}» حذف شد` : `به «${l.name}» اضافه شد`); return i < 0;
}
function pickList(t) {
  const n = h(`<div><div class="sheet-h"><div><b>افزودن به پلی‌لیست</b><small class="mut">${esc(t.title)} — ${esc(t.artist)}</small></div><button class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div><div class="pick"></div>
    <button class="btn block" id="pk-new">${ic('plus', 'sm')} پلی‌لیست جدید</button></div>`);
  const box = $('.pick', n);
  const draw = () => {
    box.innerHTML = PL.lists.length ? '' : `<p class="mut small" style="margin:0 0 12px">هنوز پلی‌لیستی نساختی.</p>`;
    PL.lists.forEach(l => {
      const on = l.items.includes(t.id);
      const b = h(`<button class="pick-row ${on ? 'on' : ''}" aria-pressed="${on}"><span class="pk-ic">${ic(on ? 'check' : 'list-music', 'sm')}</span><span class="t"><b>${esc(l.name)}</b><small>${fa(ctxTracks(l.id).length)} آهنگ</small></span></button>`);
      b.onclick = () => { haptic(); toggleInList(l, t); draw(); }; box.append(b);
    });
  };
  draw();
  $('#pk-new', n).onclick = async () => { const l = await createList(t); listDirty = true; if (l) pickList(t); };
  openSheet(n, '', () => { if (!listDirty) return; if (mState.view === 'all') { renderChips(); listDirty = false; } else renderList(); });
}
function moveItem(l, i, d) {
  const j = i + d; if (j < 0 || j >= l.items.length) return;
  [l.items[i], l.items[j]] = [l.items[j], l.items[i]]; savePL(); if (mState.ctx === l.id) refreshQueue();
}
function dropTrackEverywhere(id) { let ch = false; PL.lists.forEach(l => { const n = l.items.length; l.items = l.items.filter(x => x !== id); ch ||= n !== l.items.length; }); if (ch) savePL(); }

/* ---------- music tab ---------- */
let listDirty = true, renderTok = 0;
function renderMusic() {
  const v = $('#view-music');
  if (!$('#plist', v)) {
    v.innerHTML = '';
    const npc = h(`<div class="np-card" id="np-card" role="button" tabindex="0"><span class="art">${ic('audio-lines', 'lg')}</span><span class="t"><b></b><small></small></span><button class="icon-btn solid" aria-label="پخش/توقف">${ic('play')}</button></div>`);
    npc.onclick = (e) => { if (e.target.closest('.icon-btn')) { togglePlay(); return; } if (nowT) openNP(); else playView(null); };
    v.append(npc);
    const tools = h(`<div class="tools" style="margin-bottom:12px">
      <label class="btn">${ic('upload', 'sm')} افزودن از گوشی<input type="file" id="addfiles" accept="audio/*" multiple hidden></label>
      <button class="btn" id="dlall">${ic('cloud-download', 'sm')} دانلود همه</button></div>`);
    $('#addfiles', tools).onchange = async (e) => {
      const files = [...e.target.files]; if (!files.length) return;
      for (const f of files) await idb.put({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: f.name.replace(/\.[^.]+$/, ''), blob: f, added: Date.now() });
      await loadCustom(); listDirty = true; renderList(); toast(`${fa(files.length)} آهنگ اضافه شد`); e.target.value = '';
    };
    $('#dlall', tools).onclick = async (e) => {
      const btn = e.currentTarget; const info = $('#dlstore');
      const scope = ctxTracks(mState.view).filter(t => t.builtin); const todo = scope.filter(t => !isOffline(t));
      if (!todo.length) { if (confirm(`همه آهنگ‌های «${ctxName(mState.view)}» دانلود شدن. نسخه‌های آفلاین‌شون حذف بشن؟`)) { for (const t of scope) await removeOffline(t); listDirty = true; renderList(); showStorage(true); } return; }
      if (todo.length > 10 && !confirm(`${fa(todo.length)} آهنگ از «${ctxName(mState.view)}» دانلود بشه؟ (هر آهنگ حدود ۳ تا ۸ مگابایت)`)) return;
      btn.disabled = true; let i = 0, fail = 0;
      for (const t of todo) { info.textContent = `در حال دانلود ${fa(++i)} از ${fa(todo.length)} — ${t.title}`; if (!(await downloadTrack(t))) fail++; else markRow(t); }
      btn.disabled = false;
      info.textContent = fail ? `${fa(fail)} آهنگ دانلود نشد — اینترنت رو چک کن` : 'دانلود تموم شد';
      setTimeout(() => showStorage(true), 2500);
    };
    v.append(tools);
    const card = h(`<div class="card mcard"><div class="pl-chips" id="pl-chips" role="tablist" aria-label="پلی‌لیست‌ها"></div><div id="pl-head"></div>
      <label class="search">${ic('search', 'sm')}<input type="search" id="q" placeholder="جستجوی آهنگ یا خواننده" aria-label="جستجو" enterkeyhint="search" autocomplete="off"></label>
      <p class="mut small" id="dlinfo" style="margin:0 0 8px">لیست داخلی از لینک‌های خودت پخش می‌شه و اینترنت لازم داره. با دکمه ${'<b>دانلود</b>'} کنار هر آهنگ می‌تونی برای آفلاین نگهش داری (روی کروم اندروید). آهنگ‌هایی که از گوشی اضافه می‌کنی همیشه آفلاین‌اند.</p><p class="mut small" id="dlstore" style="margin:-4px 0 8px"></p><ul class="plist" id="plist"></ul><p class="mut small" id="pl-empty" hidden style="text-align:center;margin:12px 0"></p></div>`);
    let qT; $('#q', card).addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(applySearch, 120); });
    v.append(card); listDirty = true;
  }
  if (listDirty) renderList(); else updatePlayerUI();
}
function playView(shuffle) {
  const ts = ctxTracks(mState.view); if (!ts.length) { toast('این پلی‌لیست خالیه'); return; }
  if (shuffle !== null) { mState.shuffle = !!shuffle; }
  setQueue(mState.view, null); playAt(0);
}
function renderChips() {
  const box = $('#pl-chips'); box.innerHTML = '';
  const chip = (id, label, n, icon) => { const b = h(`<button class="pchip ${mState.view === id ? 'on' : ''}" role="tab" aria-selected="${mState.view === id}">${ic(icon, 'xs')}<span>${esc(label)}</span><small>${fa(n)}</small></button>`); b.onclick = () => { if (mState.view === id) return; haptic(); mState.view = id; LS.set('music', mState); $('#q').value = ''; listDirty = true; renderList(); }; return b; };
  box.append(chip('all', 'همه آهنگ‌ها', lib.length, 'library'));
  PL.lists.forEach(l => box.append(chip(l.id, l.name, ctxTracks(l.id).length, 'list-music')));
  const add = h(`<button class="pchip add" aria-label="پلی‌لیست جدید">${ic('plus', 'xs')}<span>جدید</span></button>`);
  add.onclick = async () => { const l = await createList(null); if (l) { mState.view = l.id; LS.set('music', mState); } listDirty = true; renderList(); };
  box.append(add);
  $('.pchip.on', box)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}
function renderHead() {
  const hd = $('#pl-head'); const l = getList(mState.view);
  if (!l) { hd.innerHTML = ''; return; }
  const n = ctxTracks(l.id).length; const playingHere = mState.ctx === l.id && nowT;
  hd.innerHTML = '';
  const el = h(`<div class="pl-head"><div class="t"><b>${esc(l.name)}</b><small>${fa(n)} آهنگ${playingHere ? ' · در حال پخش' : ''}</small></div>
    <button class="icon-btn solid" id="ph-play" aria-label="پخش پلی‌لیست">${ic('play')}</button><button class="icon-btn" id="ph-shuf" aria-label="پخش تصادفی">${ic('shuffle')}</button>
    <button class="icon-btn" id="ph-ren" aria-label="تغییر نام">${ic('pencil', 'sm')}</button><button class="icon-btn" id="ph-del" aria-label="حذف پلی‌لیست">${ic('trash-2', 'sm')}</button></div>`);
  $('#ph-play', el).onclick = () => { haptic(); playView(null); renderHead(); };
  $('#ph-shuf', el).onclick = () => { haptic(); playView(true); renderHead(); };
  $('#ph-ren', el).onclick = async () => { const nm = await askName('تغییر نام پلی‌لیست', l.name); if (nm) { l.name = nm; savePL(); renderChips(); renderHead(); if (mState.ctx === l.id) { setMediaSession(nowT); updatePlayerUI(); } } };
  $('#ph-del', el).onclick = () => {
    if (!confirm(`پلی‌لیست «${l.name}» حذف بشه؟ (آهنگ‌ها حذف نمی‌شن)`)) return;
    PL.lists = PL.lists.filter(x => x !== l); savePL();
    if (mState.ctx === l.id) setQueue('all'); mState.view = 'all'; LS.set('music', mState); listDirty = true; renderList(); toast('پلی‌لیست حذف شد');
  };
  hd.append(el);
}
function renderList() {
  const ul = $('#plist'); if (!ul) return;
  if (mState.view !== 'all' && !getList(mState.view)) mState.view = 'all';
  listDirty = false; uiCur = null; const tok = ++renderTok;
  renderChips(); renderHead();
  const isAll = mState.view === 'all'; const ts = ctxTracks(mState.view);
  $('#dlinfo').hidden = !isAll; ul.classList.toggle('edit', !isAll);
  const emp = $('#pl-empty'); emp.hidden = ts.length > 0; emp.textContent = isAll ? '' : 'این پلی‌لیست خالیه — از «همه آهنگ‌ها» با دکمه ➕ آهنگ اضافه کن.';
  ul.innerHTML = '';
  // first screenful now, the rest in idle-time chunks (rows also use content-visibility:auto)
  let i = 0; const step = (n) => { const frag = document.createDocumentFragment(); const end = Math.min(ts.length, i + n); for (; i < end; i++) frag.append(plRow(ts[i], i)); ul.append(frag); };
  step(16); updatePlayerUI(); applySearch();
  const more = () => { if (tok !== renderTok || i >= ts.length) return; step(30); applySearch(); updatePlayerUI(); idle(more); };
  if (i < ts.length) idle(more);
}
function applySearch() {
  const q = ($('#q')?.value || '').trim().toLowerCase(); let shown = 0;
  $$('#plist li').forEach(li => { const m = !q || li.dataset.k.includes(q); li.hidden = !m; if (m) shown++; });
  const emp = $('#pl-empty'); if (q) { emp.hidden = shown > 0; emp.textContent = 'چیزی پیدا نشد'; }
}
async function showStorage(force) {
  if (!navigator.storage?.estimate || (!force && !offSet.size)) return;
  const { usage } = await navigator.storage.estimate(); const el = $('#dlstore');
  if (el) el.textContent = ''; if (el && offSet.size) el.textContent = `${fa(offSet.size)} آهنگ آفلاین — فضای اشغال‌شده حدود ${fa(Math.round(usage / 1048576))} مگابایت`;
}
function markRow(t) { $$(`#plist li[data-id="${CSS.escape(t.id)}"]`).forEach(li => li.replaceWith(plRow(t, +li.dataset.i))); uiCur = null; }
function plRow(t, i) {
  const view = mState.view; const l = getList(view);
  const off = t.builtin && isOffline(t);
  const acts = l
    ? `<button class="x mv" data-a="up" aria-label="بالا" ${i === 0 ? 'disabled' : ''}>${ic('chevron-up', 'sm')}</button><button class="x mv" data-a="down" aria-label="پایین" ${i === l.items.length - 1 ? 'disabled' : ''}>${ic('chevron-down', 'sm')}</button><button class="x" data-a="rm" aria-label="حذف از پلی‌لیست">${ic('x', 'sm')}</button>`
    : `<button class="x add" data-a="add" aria-label="افزودن به پلی‌لیست">${ic('list-plus', 'sm')}</button>` + (t.builtin ? `<button class="x dl ${off ? 'done' : ''}" data-a="dl" aria-label="${off ? 'حذف نسخه آفلاین' : 'دانلود برای آفلاین'}">${ic(off ? 'circle-check-big' : 'download', 'sm')}</button>` : `<button class="x" data-a="del" aria-label="حذف">${ic('trash-2', 'sm')}</button>`);
  const li = h(`<li data-id="${esc(t.id)}" data-i="${i}"><span class="num"><span class="n">${t.builtin || l ? fa(i + 1) : ic('music', 'sm')}</span></span>
    <span class="t"><b>${esc(t.title)}</b><small>${esc(t.artist)}${off ? ` <span class="off">${ic('circle-check-big', 'xs')} آفلاین</span>` : ''}</small></span>${acts}</li>`);
  li.dataset.k = (t.title + ' ' + t.artist).toLowerCase();
  if (nowT?.id === t.id) { li.classList.add('cur'); if (!audio.paused) li.classList.add('playing'); $('.num', li).innerHTML = '<span class="eq"><i></i><i></i><i></i><i></i></span>'; }
  li.onclick = async (e) => {
    const b = e.target.closest('.x');
    if (!b) {
      haptic();
      if (nowT?.id === t.id) { if (mState.ctx !== view) { setQueue(view, t.id); setMediaSession(t); if (audio.paused) togglePlay(); else updatePlayerUI(); } else togglePlay(); return; }
      if (mState.ctx !== view || queue.length !== ctxTracks(view).length) setQueue(view, null);
      const qi = queue.findIndex(x => x.id === t.id); if (qi >= 0) playAt(order.indexOf(qi));
      return;
    }
    haptic(); const a = b.dataset.a;
    if (a === 'add') return pickList(t);
    if (a === 'up' || a === 'down') {
      const idx = l.items.indexOf(t.id); moveItem(l, idx, a === 'up' ? -1 : 1);
      const sib = a === 'up' ? li.previousElementSibling : li.nextElementSibling; if (!sib) return;
      const t2 = byId.get(sib.dataset.id); const ni = +sib.dataset.i;
      const r1 = plRow(t, ni), r2 = plRow(t2, i); sib.replaceWith(r1); li.replaceWith(r2);
      if (a === 'up') r1.after(r2); else r2.after(r1);
      $('.x[data-a="' + a + '"]', r1)?.focus({ preventScroll: true }); return;
    }
    if (a === 'rm') { const idx = l.items.indexOf(t.id); if (idx >= 0) { l.items.splice(idx, 1); savePL(); } if (mState.ctx === l.id) refreshQueue(); listDirty = true; renderList(); toast(`از «${l.name}» حذف شد`); return; }
    if (a === 'del') { if (!confirm(`«${t.title}» از گوشی حذف بشه؟ از پلی‌لیست‌ها هم برداشته می‌شه.`)) return; await idb.del(t.dbId); dropTrackEverywhere(t.id); await loadCustom(); listDirty = true; renderList(); return; }
    if (a === 'dl') {
      if (isOffline(t)) { if (!confirm(`نسخه آفلاین «${t.title}» حذف بشه؟`)) return; await removeOffline(t); markRow(t); return; }
      b.disabled = true; b.classList.add('busy');
      const ok = await downloadTrack(t); toast(ok ? `«${t.title}» برای آفلاین ذخیره شد` : 'دانلود نشد — اینترنت رو چک کن');
      markRow(t); showStorage();
    }
  };
  return li;
}

/* ---------- in-app exercise video ---------- */
function openVideo(ex, vd) {
  haptic();
  const yt = !vd.embed && vd.yt;
  const src = vd.embed || `https://www.youtube-nocookie.com/embed/${vd.yt}?rel=0&playsinline=1`;
  const ext = vd.embed ? vd.url : `https://www.youtube.com/watch?v=${vd.yt}`;
  const n = h(`<div><div class="sheet-h"><div><b>${esc(ex.name)}</b><small class="mut">${esc(vd.title)} — ${yt ? 'یوتیوب' : 'آپارات'} · ${esc(vd.ch)}</small></div><button class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div>
    <div class="vframe"><div class="vload">${ic('circle-play', 'xl')}<span>در حال بارگذاری…</span></div></div>
    <div class="vfoot"><span class="mut small">${esc(ex.cue)}</span><a class="btn" href="${esc(ext)}" target="_blank" rel="noopener">${ic('external-link', 'sm')} ${yt ? 'یوتیوب' : 'آپارات'}</a></div></div>`);
  const fr = document.createElement('iframe');
  fr.title = vd.title; fr.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
  fr.referrerPolicy = 'strict-origin-when-cross-origin'; fr.src = src;
  fr.addEventListener('load', () => $('.vload', n)?.remove(), { once: true });
  $('.vframe', n).append(fr);
  const resume = !audio.paused; if (resume) audio.pause(); // don't fight the video's sound
  openSheet(n, 'video', () => { fr.src = 'about:blank'; fr.remove(); if (resume) audio.play().catch(() => { }); });
}

/* ---------- about / backup ---------- */
function renderAbout() {
  const v = $('#view-about'); v.innerHTML = ''; viewVer.about = dataVer;
  v.append(h(`<div class="card" style="display:flex;align-items:center;gap:14px"><img src="icons/icon-192.png" width="64" height="64" alt="" style="border-radius:18px;box-shadow:0 10px 26px -10px rgba(255,45,85,.7)">
    <div><h3>باشگاه آرش</h3><p class="mut small" style="margin:0">برنامه ۴ روزه بالاتنه/پایین‌تنه — نسخه ۶</p></div></div>`));
  v.append(rulesCard());
  const bk = h(`<div class="card"><div class="sec-title">${ic('database')} پشتیبان‌گیری</div><p class="mut small" style="margin-top:-4px">همه داده‌ها فقط روی همین گوشی‌اند. هر چند وقت یه بار خروجی بگیر.</p>
    <div class="tools"><button class="btn grad" id="exp">${ic('download', 'sm')} خروجی JSON</button><label class="btn">${ic('upload', 'sm')} بازیابی<input type="file" id="imp" accept="application/json,.json" hidden></label></div>
    <p class="mut small" style="margin:10px 0 0">پلی‌لیست‌ها هم داخل فایل پشتیبان هستن؛ خود فایل‌های صوتی‌ای که از گوشی اضافه کردی نه (اگه روی گوشی نباشن، از پلی‌لیست رد می‌شن).</p></div>`);
  $('#exp', bk).onclick = () => {
    const data = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('gym.')) data[k] = localStorage.getItem(k); }
    const blob = new Blob([JSON.stringify({ app: 'gym-pwa', version: 1, exported: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gym-backup-${ymd()}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  $('#imp', bk).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); if (j.app !== 'gym-pwa' || !j.data) throw 0; if (!confirm('داده‌های فعلی با فایل پشتیبان جایگزین بشه؟')) return;
      Object.keys(localStorage).filter(k => k.startsWith('gym.')).forEach(k => localStorage.removeItem(k));
      Object.entries(j.data).forEach(([k, val]) => localStorage.setItem(k, val)); LS.reset();
      mState = { ...mState, ...(LS.get('music', {}) || {}) }; PL = LS.get('playlists', null) || { lists: [] }; setQueue(mState.ctx); listDirty = true;
      toast('بازیابی شد'); renderAbout(); updateHeader();
    } catch { toast('فایل معتبر نیست'); }
    e.target.value = '';
  };
  v.append(bk);
  v.append(h(`<div class="card small mut"><div class="sec-title" style="color:var(--txt)">${ic('music')} موزیک</div>لیست داخلی مستقیماً از لینک‌هایی که خودت انتخاب کردی پخش می‌شه؛ هیچ فایل صوتی داخل اپ نیست. حق نشر هر آهنگ متعلق به صاحبش است.</div>`));
  v.append(h(`<div class="card small mut"><div class="sec-title" style="color:var(--txt)">${ic('info')} سایر</div>ویدیوهای آموزشی داخل اپ از آپارات پخش می‌شن (نیاز به اینترنت) و متعلق به کانال‌های ذکرشده. فونت: وزیرمتن (SIL OFL). آیکون‌ها: Lucide (ISC).</div>`));
}

/* ---------- boot ---------- */
const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
(async () => {
  updateHeader(); renderWorkout();
  await new Promise(r => idle(r));
  await refreshOffline(); await loadCustom();
  const lt = byId.get(mState.last);
  if (lt) { nowT = lt; audio.preload = 'none'; audio.src = lt.src; setMediaSession(lt); }
  updatePlayerUI();
})();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
  navigator.storage?.persist?.().catch(() => { });
}
