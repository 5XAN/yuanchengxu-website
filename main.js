document.documentElement.classList.add('js');

// 區塊轉場：進入畫面時幕布掃過、內容浮出
const secs = [...document.querySelectorAll('main > section:not(.hero)')];
secs.forEach(s => s.classList.add('sec'));
// 完全離開畫面就重置，下次進來再播一次
const secIo = new IntersectionObserver(es => es.forEach(e => {
  if (e.intersectionRatio >= .12) e.target.classList.add('sec-in');
  else if (e.intersectionRatio === 0) e.target.classList.remove('sec-in');
}), { threshold: [0, .12] });
secs.forEach(s => secIo.observe(s));

// 浮動選單：目前所在區塊亮起
const spyLinks = [...document.querySelectorAll('.dock a')];
const spyIo = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting || !e.target.id) return;
  spyLinks.forEach(a => a.classList.toggle('active', a.dataset.spy === e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
secs.forEach(s => spyIo.observe(s));

// 同一個 grid／steps 內的元素依序延遲浮現
document.querySelectorAll('.grid, .steps').forEach(box => {
  box.querySelectorAll(':scope > .reveal').forEach((el, i) => el.style.setProperty('--d', i * 0.12 + 's'));
});

// 數字計數
function countUp(el) {
  const target = +el.dataset.count, t0 = performance.now(), dur = 1400, id = (el._run = (el._run || 0) + 1);
  const tick = now => {
    if (el._run !== id) return;
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick); else el.classList.add('pop');
  };
  requestAnimationFrame(tick);
}

// 捲動浮現（步驟亮起、數字計數）；離開畫面就重置，每次進來都重播
const litTimers = new WeakMap();
const io = new IntersectionObserver(es => es.forEach(e => {
  const el = e.target;
  if (e.intersectionRatio >= .12) {
    el.classList.add('in');
    if (el.classList.contains('step')) litTimers.set(el, setTimeout(() => el.classList.add('lit'), 500));
    el.querySelectorAll('[data-count]').forEach(countUp);
  } else if (e.intersectionRatio === 0) {
    clearTimeout(litTimers.get(el));
    el.classList.remove('in', 'lit');
    el.querySelectorAll('[data-count]').forEach(c => { c._run = (c._run || 0) + 1; c.textContent = 0; c.classList.remove('pop'); });
  }
}), { threshold: [0, .12] });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// 導覽列縮小、浮水印視差
const header = document.querySelector('header');
const marks = [...document.querySelectorAll('.watermark')];
const topFab = document.querySelector('.top-fab');
let ticking = false;
function onScroll() {
  header.classList.toggle('shrink', scrollY > 40);
  marks.forEach(m => {
    const r = m.parentElement.getBoundingClientRect();
    const k = Math.max(-1, Math.min(1, r.top / innerHeight));
    m.style.setProperty('--px', (k * -60) + 'px');
  });
  topFab.classList.toggle('show', scrollY > 600);
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

// 聯絡表單：目前先不送出資料，之後可接 Supabase 或 LINE OA
document.getElementById('contact-form')?.addEventListener('submit', e => {
  e.preventDefault();
  document.getElementById('form-msg').textContent = '已收到！（目前為展示版，尚未實際送出）我們會在 1 個工作天內回覆。';
  e.target.reset();
});

// 合作流程：沿著曲線飛行的紙飛機、錯落的步驟標籤
(function () {
  const proc = document.querySelector('.proc');
  if (!proc) return;
  const NS = 'http://www.w3.org/2000/svg';
  const body = proc.querySelector('.proc-body');
  const steps = [...proc.querySelectorAll('.pstep')];
  const items = [...proc.querySelectorAll('.proc-list li')];
  const blob = proc.querySelector('.proc-blob');
  const pn = document.getElementById('pn'), pt = document.getElementById('pt');
  const names = items.map(li => li.lastChild.textContent.trim());
  const svg = proc.querySelector('.route');
  const pts = [[50, 30], [270, 112], [70, 212], [250, 306]];
  const segD = [], segEl = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], dy = (y1 - y0) * .55;
    segD.push(`C${x0} ${y0 + dy} ${x1} ${y1 - dy} ${x1} ${y1}`);
  }
  const D = `M${pts[0][0]} ${pts[0][1]} ` + segD.join(' ');
  ['rBase', 'rFill', 'rMask'].forEach(id => document.getElementById(id).setAttribute('d', D));
  const base = document.getElementById('rBase');
  const total = base.getTotalLength();
  segD.forEach((d, i) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${pts[i][0]} ${pts[i][1]} ` + d);
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'none');
    svg.appendChild(p); segEl.push(p);
  });
  const segLen = segEl.map(p => p.getTotalLength());
  const cum = [0]; segLen.forEach((l, i) => cum.push(cum[i] + l));
  const mask = document.getElementById('rMask');
  mask.style.strokeDasharray = total;
  const nodes = pts.map(([x, y]) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 7);
    document.getElementById('rNodes').appendChild(c); return c;
  });
  items.forEach((li, i) => {
    const [x, y] = pts[i], right = x > 170;
    li.style.top = (y / 340 * 100) + '%';
    if (right) { li.classList.add('r'); li.style.right = ((340 - x + 20) / 340 * 100) + '%'; }
    else li.style.left = ((x + 20) / 340 * 100) + '%';
    li.style.transformOrigin = right ? 'right center' : 'left center';
  });
  const plane = document.getElementById('plane');
  function setRoute(q) {
    const f = q * (pts.length - 1), seg = Math.min(pts.length - 2, Math.floor(f));
    let len = cum[seg] + (f - seg) * segLen[seg];
    len = Math.max(0, Math.min(total, len));
    const p = base.getPointAtLength(len);
    const p2 = base.getPointAtLength(Math.min(total, len + 1.5));
    const q0 = base.getPointAtLength(Math.max(0, len - 1.5));
    const ang = Math.atan2(p2.y - q0.y, p2.x - q0.x) * 180 / Math.PI + 90;
    plane.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang})`);
    mask.style.strokeDashoffset = total - len;
  }
  let cur = -1;
  function update() {
    const r = body.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (innerHeight * .5 - r.top) / r.height));
    proc.style.setProperty('--p', p.toFixed(4));
    const q = Math.max(0, Math.min(1, (p * steps.length - .5) / (steps.length - 1)));
    setRoute(q);
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    if (idx !== cur) {
      cur = idx;
      pn.textContent = String(idx + 1).padStart(2, '0');
      pt.textContent = names[idx];
      blob.classList.remove('swap'); void blob.offsetWidth; blob.classList.add('swap');
      items.forEach((li, i) => { li.classList.toggle('active', i === idx); li.classList.toggle('done', i < idx); });
      nodes.forEach((n, i) => { n.classList.toggle('active', i === idx); n.classList.toggle('done', i < idx); });
      steps.forEach((s, i) => s.classList.toggle('on', i === idx));
    }
  }
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();

// 首頁：民眾操作演示（圖文選單 → 預約頁 → 確認 → 後台出現新預約）
(function () {
  const screen = document.getElementById('screen'), list = document.getElementById('adminList');
  if (!screen || !list) return;
  const q = (s) => screen.querySelector(s), qa = (s) => [...screen.querySelectorAll(s)];
  const sMenu = q('.sc-menu'), sForm = q('.sc-form'), sDone = q('.sc-done'), tap = q('#tap');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const addRow = () => { if (list.querySelector('.new')) return; const li = document.createElement('li'); li.className = 'new'; li.innerHTML = '<span>19:00</span>王小姐・2 位'; list.appendChild(li); };
  if (reduce) { sMenu.classList.remove('on'); sDone.classList.add('on'); addRow(); return; }
  let run = 0, visible = true, timers = [];
  const wait = (ms) => new Promise(r => timers.push(setTimeout(r, ms)));
  const ANG = 2 * Math.PI / 180;   // 手機外框歪了 -2 度，點擊位置要反向換算
  function moveTo(el) {
    const sr = screen.getBoundingClientRect(), er = el.getBoundingClientRect();
    const dx = er.left + er.width / 2 - (sr.left + sr.width / 2), dy = er.top + er.height / 2 - (sr.top + sr.height / 2);
    const x = dx * Math.cos(ANG) - dy * Math.sin(ANG), y = dx * Math.sin(ANG) + dy * Math.cos(ANG);
    tap.style.left = (screen.clientWidth / 2 + x) + 'px'; tap.style.top = (screen.clientHeight / 2 + y) + 'px';
  }
  async function press(el, cls) {
    moveTo(el); tap.classList.add('show'); await wait(750);
    tap.classList.remove('press'); void tap.offsetWidth; tap.classList.add('press');
    if (cls) { el.classList.add(cls); }
    await wait(320);
  }
  const reset = () => {
    sMenu.classList.add('on'); sForm.classList.remove('on'); sDone.classList.remove('on');
    qa('.chips span').forEach(c => c.classList.remove('sel')); qa('.press').forEach(c => c.classList.remove('press'));
    document.getElementById('pc').textContent = '1';
    list.querySelectorAll('.new').forEach(n => n.remove());
    tap.classList.remove('show'); tap.style.left = '50%'; tap.style.top = '110%';
  };
  async function play(id) {
    reset(); await wait(1100); if (run !== id) return;
    const book = q('.rm[data-k="book"]');
    await press(book, 'press'); if (run !== id) return;
    sMenu.classList.remove('on'); sForm.classList.add('on'); book.classList.remove('press');
    await wait(900); if (run !== id) return;
    const d = q('#dChips span:nth-child(1)'); await press(d); d.classList.add('sel'); if (run !== id) return;
    const t = q('#tChips span:nth-child(3)'); await press(t); t.classList.add('sel'); if (run !== id) return;
    const plus = q('#plus'); await press(plus, 'press'); document.getElementById('pc').textContent = '2'; plus.classList.remove('press'); if (run !== id) return;
    const sub = q('#subBtn'); await press(sub, 'press'); if (run !== id) return;
    tap.classList.remove('show'); sForm.classList.remove('on'); sDone.classList.add('on');
    await wait(700); if (run !== id) return;
    addRow();
    await wait(4200);
    if (run === id) play(id);
  }
  function start() { run++; timers.forEach(clearTimeout); timers = []; if (visible) play(run); }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); else { run++; timers.forEach(clearTimeout); } }, { threshold: .2 }).observe(document.querySelector('.hero-demo'));
})();

// 首頁：紙本被劃掉，換成數位
(function () {
  const box = document.querySelector('.swapline'); if (!box) return;
  const oldEl = document.getElementById('swOld'), newEl = document.getElementById('swNew');
  const pairs = [['紙本預約單', 'LINE 預約'], ['紙本同意書', '手機簽名'], ['手抄會員卡', 'LINE 會員卡'], ['紙本問卷', '線上問卷'], ['手寫報修單', '拍照回報']];
  let i = 0;
  const cycle = () => {
    oldEl.textContent = pairs[i][0]; newEl.textContent = pairs[i][1];
    box.classList.remove('out', 'struck');
    setTimeout(() => box.classList.add('struck'), 1000);
    setTimeout(() => box.classList.add('out'), 3300);
    setTimeout(() => { i = (i + 1) % pairs.length; cycle(); }, 3700);
  };
  setTimeout(cycle, 900);
})();
