// Captures the real portal pages for the public site's showcase (SiteShowcase.tsx): the demo
// student and parent, in every language, with a headless Chrome driven over the DevTools protocol.
// Writes public/site/portal/<locale>/*.webp and libs/components/site/portalShots.json (where each
// clicked link is and how long each page is). Run it again whenever the portal's UI changes.
//
// Needs, locally:
//   - the web app on http://localhost:3001 (pnpm dev) and the API on :3000 started with DEMO_MODE=true;
//   - demo accounts in the database (the showcase student and parent with isDemo = true, as on the demo server);
//   - Google Chrome (or CHROME=/path/to/chrome).
// Usage: node scripts/capture-portal-shots.mjs [en,uz,ru,ko]
// The demo login allows 20 sign-ins per IP in 15 minutes; one run uses 2 per language.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const APP = 'http://localhost:3001';
const API = 'http://localhost:3000';
const PORT = 9333;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LOCALES = (process.argv[2] ?? 'en,uz,ru,ko').split(',');
/** The MacBook's screen is 16 : 10.4 (1440 × 936), shown at 960 px; the phone is an iPhone-sized 390 × 844 */
const DESK = { w: 1440, h: 936, scale: 2 / 3 };
const PHONE = { w: 390, h: 844 };

/**
 * What each role shows: the web dashboard, link "a" (opens web page 2), link "b" (opens page 3);
 * the phone home, link "c" (opens phone page 2) and two pages for the side phones.
 * Each link is a selector plus a filter on the element `e` (`inFixed(e)`: inside the bottom bar).
 */
const PLAN = {
  student: {
    login: 'STUDENT',
    home: '/student',
    a: ['main a[href*="/student/courses/"]', String.raw`/\/student\/courses\/[^/]+$/.test(e.getAttribute('href'))`], // a course card
    b: ['a[href$="/student/grades"]'],
    c: ['a[href*="/assignments/"]'], // the first to-do
    sides: ['/student/grades', '/student/courses'],
  },
  parent: {
    login: 'PARENT',
    home: '/parent',
    a: ['main a[href*="/parent/grades"]'], // "All grades"
    b: ['a[href*="/parent/attendance"]'],
    c: ['a[href*="/parent/grades"]', 'inFixed(e)'], // "Grades" in the bottom bar
    sides: ['/parent/attendance', '/parent/announcements'],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Chrome and a tiny DevTools protocol client ──

async function startChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'campusly-capture-'));
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/json/version`);
      // Wait for Chrome to exit before removing its profile (it still writes there while closing)
      const stop = async () => {
        const exited = new Promise((r) => proc.once('exit', r));
        proc.kill();
        await exited;
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      };
      return { stop };
    } catch {
      await sleep(500);
    }
  }
  throw new Error('Chrome did not start');
}

async function openTab() {
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (!msg.id || !waiting.has(msg.id)) return;
    const { resolve, reject } = waiting.get(msg.id);
    waiting.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result.value;
  };
  await send('Page.enable');
  // The portal shows times in the school's zone; the capture should too
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Tashkent' });
  return {
    send,
    evaluate,
    go: async (url, wait = 4500) => (await send('Page.navigate', { url }), sleep(wait)),
    size: (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }),
    shot: async (file, opts) => writeFileSync(file, Buffer.from((await send('Page.captureScreenshot', { format: 'webp', quality: 82, ...opts })).data, 'base64')),
  };
}

// ── page helpers ──

/** No dev-tools badge, no transitions, no blinking caret */
const CLEAN = `(() => { const s = document.createElement('style'); s.textContent = 'nextjs-portal{display:none!important} *{transition:none!important;animation:none!important;caret-color:transparent!important}'; document.head.appendChild(s); })()`;

/** Marks the first visible match as the target and returns its centre (page px) and the page size */
const rectOf = ([sel, filter = 'true']) => `(() => {
  const inFixed = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return true; return false; };
  document.querySelectorAll('[data-cap-target]').forEach((e) => e.removeAttribute('data-cap-target'));
  const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (${filter}); });
  if (!el) return null;
  el.setAttribute('data-cap-target', '');
  const r = el.getBoundingClientRect();
  return { x: r.left + scrollX + r.width / 2, y: r.top + scrollY + r.height / 2, w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, fixed: inFixed(el), fromBottom: (innerHeight - r.top - r.height / 2) / innerWidth };
})()`;

async function capture(tab, locale, role, plan, dir) {
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const file = (name) => `${dir}/${role}-${name}.webp`;
  // A slow first compile of a route in dev: wait for the link
  const find = async (spec) => {
    for (let i = 0; i < 12; i++) {
      const r = await tab.evaluate(rectOf(spec));
      if (r) return r;
      await sleep(800);
    }
    throw new Error(`${locale} ${role}: link not found: ${spec[0]}`);
  };
  // Found again right before the click: a late re-render may have replaced the element
  const click = async (spec) => {
    for (let i = 0; i < 12; i++) {
      if (await tab.evaluate(`(() => { ${rectOf(spec)}; const el = document.querySelector('[data-cap-target]'); if (!el) return false; el.click(); return true; })()`)) break;
      await sleep(800);
    }
    await sleep(4000);
    await tab.evaluate(CLEAN);
    await tab.evaluate('scrollTo(0, 0)');
  };
  const fullShot = async (name, width, scale) => {
    const height = await tab.evaluate('Math.max(document.documentElement.scrollHeight, innerHeight)');
    await tab.shot(file(name), { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale } });
    return height / width;
  };
  /** The phone's floating bottom bar is cut out alone (transparent around it), then hidden for the page shot */
  const phonePage = async (name) => {
    const bar = await tab.evaluate(`(() => { const el = [...document.querySelectorAll('body *')].find((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.position === 'fixed' && r.bottom >= innerHeight - 40 && r.height > 40 && r.height < 160 && r.width > innerWidth * 0.6; }); if (!el) return null; el.setAttribute('data-cap-bar', ''); return el.getBoundingClientRect().top; })()`);
    let barRatio = null;
    if (bar !== null) {
      const top = Math.max(0, Math.floor(bar) - 18);
      await tab.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
      await tab.evaluate(`(() => { const s = document.createElement('style'); s.id = 'cap-bar-only'; s.textContent = 'html,body{background:transparent!important} body *{visibility:hidden!important} [data-cap-bar],[data-cap-bar] *{visibility:visible!important}'; document.head.appendChild(s); })()`);
      await tab.shot(file(`${name}-bar`), { clip: { x: 0, y: top, width: PHONE.w, height: PHONE.h - top, scale: 1 } });
      await tab.evaluate(`document.getElementById('cap-bar-only').remove(); (() => { const s = document.createElement('style'); s.textContent = '[data-cap-bar]{display:none!important}'; document.head.appendChild(s); })()`);
      await tab.send('Emulation.setDefaultBackgroundColorOverride', {});
      barRatio = (PHONE.h - top) / PHONE.w;
    }
    return { ratio: await fullShot(name, PHONE.w, 1), bar: barRatio };
  };

  // Sign in as the demo account (from a static file of the site: same origin, no app to redirect mid-request)
  await tab.go(`${APP}/site/partners/british-council.webp`, 800);
  const status = await tab.evaluate(`fetch('${API}/auth/demo', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: '${plan.login}' }) }).then((r) => r.status)`);
  if (status !== 200 && status !== 201) throw new Error(`demo login ${status}: is the API running with DEMO_MODE=true?`);

  // Web: the dashboard → "a" → "b"
  await tab.size(DESK.w, DESK.h, false);
  await tab.go(APP + prefix + plan.home, 5000);
  await tab.evaluate(CLEAN);
  const a = await find(plan.a);
  const web = [await fullShot('web1', DESK.w, DESK.scale)];
  await click(plan.a);
  const b = await find(plan.b);
  web.push(await fullShot('web2', DESK.w, DESK.scale));
  await click(plan.b);
  web.push(await fullShot('web3', DESK.w, DESK.scale));

  // Phone: the home → "c", then the side pages
  await tab.size(PHONE.w, PHONE.h, true);
  await tab.go(APP + prefix + plan.home, 5000);
  await tab.evaluate(CLEAN);
  const c = await find(plan.c);
  const phone = [await phonePage('phone1')];
  await tab.go(APP + prefix + plan.home, 4500); // the bar is hidden now: load the page again for the click
  await tab.evaluate(CLEAN);
  await find(plan.c);
  await click(plan.c);
  phone.push(await phonePage('phone2'));
  const sides = [];
  for (const [i, path] of plan.sides.entries()) {
    await tab.go(APP + prefix + path);
    await tab.evaluate(CLEAN);
    sides.push(await phonePage(`side${i + 1}`));
  }

  const r4 = (n) => Math.round(n * 10000) / 10000;
  const shot = (s) => ({ ratio: r4(s.ratio), bar: s.bar && r4(s.bar) });
  return {
    web: web.map(r4),
    a: { x: r4(a.x / a.w), y: r4(a.y / a.h) },
    b: { x: r4(b.x / b.w), y: r4(b.y / b.h) },
    phone: phone.map(shot),
    // x in widths; y in widths from the page top (the phone page is shown at the screen's width), or from the screen's bottom for a tab in the bottom bar
    c: c.fixed ? { x: r4(c.x / c.w), fromBottom: r4(c.fromBottom) } : { x: r4(c.x / c.w), y: r4(c.y / c.w) },
    sides: sides.map(shot),
  };
}

const chrome = await startChrome();
try {
  const tab = await openTab();
  // Languages not captured this time keep their earlier data
  const out = join(ROOT, 'libs/components/site/portalShots.json');
  const data = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
  for (const locale of LOCALES) {
    const dir = join(ROOT, 'public/site/portal', locale);
    mkdirSync(dir, { recursive: true });
    data[locale] = {};
    for (const [role, plan] of Object.entries(PLAN)) {
      data[locale][role] = await capture(tab, locale, role, plan, dir);
      console.log(`${locale} ${role}: done`);
    }
  }
  writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${out}`);
} finally {
  await chrome.stop();
}
