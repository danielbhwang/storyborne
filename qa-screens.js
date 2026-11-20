// Browser checks that assert what the kid should SEE (not just "no errors"). Exit 1 if any red.
// Usage: node qa-screens.js [port]   (serve the app folder on that port first)
const { chromium } = require('playwright');
const PORT = process.argv[2] || 8799;
const base = who => who === 'son'
  ? { name: 'Miles', placed: true, level: 8, stars: 300, hero: { hairStyle: 'long' }, avatar: { base: 'bunny', owned: [], equipped: {} } }
  : { name: 'Gianna', placed: true, level: 10, stars: 800, hero: { hairStyle: 'long' }, avatar: { base: 'bunny', owned: [], equipped: {} } };
const results = [];
const check = (name, ok, expected, got) => results.push({ name, ok, expected, got });

async function open(b, who, patch, vp = [820, 1180]){
  const p = await b.newPage({ viewport: { width: vp[0], height: vp[1] } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  const other = who === 'son' ? 'daughter' : 'son';
  const save = { pin: '1234', pinSet: true, kids: { [who]: Object.assign(base(who), patch), [other]: base(other) } };
  await p.addInitScript(save => { speechSynthesis.speak = u => setTimeout(() => u.onend && u.onend(), 5); if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1); localStorage.setItem('readingQuest_v1', JSON.stringify(save)); }, save);
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(900);
  for (let i = 0; i < 3 && !(await p.$('.hero-card.' + who)); i++){ await p.mouse.click(vp[0] / 2, vp[1] * .7); await p.waitForTimeout(1200); }
  await p.click('.hero-card.' + who, { timeout: 5000 }); await p.waitForTimeout(1500);
  for (let j = 0; j < 6; j++){ const x = await p.$('.overlay .modal button'); if (!x) break; await x.click().catch(() => {}); await p.waitForTimeout(250); }
  await p.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.remove()); window.__sb.run('screenHome'); }); await p.waitForTimeout(500);
  return { p, errs };
}
const text = p => p.evaluate(() => document.body.innerText);

(async () => {
  const b = await chromium.launch();
  for (const who of ['son', 'daughter']){
    // a bad save (level 13) must show the last real rank and a reachable boss
    const { p, errs } = await open(b, who, { level: 13 });
    const t = await text(p), lvl = await p.evaluate(() => window.__sb.getK().level);
    check(`${who}: level-13 save shows level 12`, lvl === 12 && !/\b(Rank|Level) 1[34]\b/.test(t), 'level 12, no "13"/"14" on Home', `level ${lvl}; ${(t.match(/\b(Rank|Level) 1\d\b[^\n]{0,30}/g) || []).slice(0, 3).join(' / ')}`);
    check(`${who}: level-13 save has no page errors`, !errs.length, 0, errs.length + ' ' + errs.slice(0, 2).join(' | '));
    await p.close();
  }
  { // a bookmark past the end of a book must read as finished, never "Chapter 100"
    const { p } = await open(b, 'daughter', { books: { moonstone: { ch: 99 } } });
    await p.evaluate(() => window.__sb.run('screenBookshelf')); await p.waitForTimeout(500);
    const t = await text(p);
    check('daughter: bookmark past the end shows finished', !/Chapter 100/i.test(t) && /Read it again/i.test(t), '"Read it again", no "Chapter 100"', (t.match(/[^\n]{0,20}(Chapter 1\d\d|Read it again)[^\n]{0,10}/gi) || ['neither found']).slice(0, 2).join(' / '));
    await p.close();
  }
  { // Miles's collection must be made of the same dragons Gia collects (no old pal names)
    const { p } = await open(b, 'son', { collection: ['Pip the Pup', 'Ember'] });
    const r = await p.evaluate(() => { const names = new Set(window.__sb.tracks().daughter.rewards.map(x => Array.isArray(x) ? x[1] : (x.name || x))); const c = window.__sb.getK().collection || []; return { c, bad: c.filter(n => !names.has(n)) }; });
    check('son: collection is all real dragons', r.bad.length === 0 && r.c.length === 2, '2 items, all from the dragon list', JSON.stringify(r));
    await p.close();
  }
  await b.close();
  let red = 0;
  for (const r of results){ if (!r.ok) red++; console.log((r.ok ? 'GREEN ' : 'RED   ') + r.name + (r.ok ? '' : `  expected ${r.expected}, got ${r.got}`)); }
  console.log(`asserts: ${results.length - red}/${results.length} green`);
  process.exit(red ? 1 : 0);
})().catch(e => { console.log('RED   asserts crashed: ' + e.message); process.exit(1); });
