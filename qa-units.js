// Unit + code-scan checks. Each check states EXPECTED vs GOT. Exit 1 if any red.
// Storyborne QA: run from the app folder with  node qa-units.js  (no browser needed)
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || require('path').join(__dirname, 'app.js'), 'utf8');
const grab = name => { const i = src.indexOf('function ' + name + '('); if (i < 0) throw new Error('missing ' + name); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++){ if (src[k] === '{') d++; else if (src[k] === '}' && !--d) return src.slice(i, k + 1); } };
eval(src.match(/const uniq = [^\n]+/)[0].replace('const uniq', 'global.uniq'));
global.newestPlay = () => 0; global.TRACKS = { daughter: { rewards: [] } };
for (const f of ['migrateDragons', 'mergeKid', 'refundTotal']) eval('global.' + f + '=' + grab(f).replace('function ' + f, 'function'));

const results = [];
const check = (name, expected, got) => results.push({ name, ok: JSON.stringify(expected) === JSON.stringify(got), expected, got });
const kid = o => Object.assign({ level: 5, stars: 200, spent: 100, avatar: { owned: [], equipped: {} }, world: { items: [], at: 1 } }, o);

// sync never brings back something a kid took off / removed; earned things are combined
let m = mergeKid(kid({ avatar: { owned: ['hat'], equipped: { head: null } } }), kid({ avatar: { owned: ['hat'], equipped: { head: 'hat' } } }), false);
check('merge-takeoff-stays-off', null, m.avatar.equipped.head);
m = mergeKid(kid({ world: { items: [], at: 5 } }), kid({ world: { items: [{ id: 1, k: 'planet' }], at: 2 } }), true);
check('merge-removed-item-stays-removed', 0, m.world.items.length);
m = mergeKid(kid({ refunds: { a: { n: 15, c: 's' } } }), kid({ spent: 150 }), true);
check('merge-refund-kept', 15, refundTotal(m, 's'));
m = mergeKid(kid({ relics: { own: ['ring_sun'], on: {} } }), kid({ relics: { own: ['amulet'], on: {} } }), true);
check('merge-relics-combined', ['amulet', 'ring_sun'], [...m.relics.own].sort());
m = mergeKid(kid({ bossesBeaten: [1, 2] }), kid({ bossesBeaten: [3] }), true);
check('merge-bosses-combined', [1, 2, 3], [...m.bossesBeaten].sort());
m = mergeKid(kid({ realBooks: [{ title: 'A', date: 'd1' }] }), kid({ realBooks: [{ title: 'A', date: 'd1' }, { title: 'B', date: 'd2' }] }), true);
check('merge-realbooks-combined-no-dupes', 2, m.realBooks.length);

// code scans: rules that must hold everywhere in app.js
const lines = src.split('\n');
const grownUpBtns = lines.filter(l => /✓ Grown-up( heard it|: right)/.test(l));
check('every grown-up approve button is PIN-gated', grownUpBtns.length, grownUpBtns.filter(l => /grownUp\(/.test(l)).length);
const newWorldItems = lines.filter(l => /id: W\.nextId\+\+/.test(l));
check('every new world item goes on the top layer', newWorldItems.length, newWorldItems.filter(l => /z: Math\.max\(/.test(l)).length);
check('level is clamped on load and on sync', 2, (src.match(/never past the last rank|merged\.level > mx/g) || []).length);
check('bookshelf bookmark past the end is treated as finished', true, /if \(st\.ch >= n\)/.test(src));

let red = 0;
for (const r of results){ if (!r.ok) red++; console.log((r.ok ? 'GREEN ' : 'RED   ') + r.name + (r.ok ? '' : '  expected ' + JSON.stringify(r.expected) + ', got ' + JSON.stringify(r.got))); }
console.log(`units: ${results.length - red}/${results.length} green`);
process.exit(red ? 1 : 0);
