/* Storyborne Workbook: original Kumon-style practice drills (data + item generator, no DOM).
   window.WB.session(level, seen) -> 10 items. Each item: { id, kind, prompt, say, show, options[], answer, explain }
   Levels 1-8 get harder: letters/vowels and opposites -> wh-questions -> covers and contents -> suffixes -> longer passages with "why" and "how". */
(function(root){
'use strict';
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
// build an item from a right answer plus wrong ones (options shuffled)
const mk = (id, kind, prompt, right, wrongs, extra) => {
  const opts = shuffle([right].concat(wrongs));
  return Object.assign({ id, kind, prompt, options: opts, answer: opts.indexOf(right) }, extra || {});
};

/* ---------- missing vowels ---------- */
const CVC = [['man','👨','a'],['jet','✈️','e'],['lip','👄','i'],['hug','🤗','u'],['pig','🐷','i'],['hen','🐔','e'],['bus','🚌','u'],['sun','☀️','u'],['bed','🛏️','e'],['hat','🧢','a'],['log','🪵','o'],['box','📦','o'],['fox','🦊','o'],['bug','🐛','u'],['web','🕸️','e'],['cat','🐱','a'],['dog','🐶','o'],['pan','🍳','a'],['pin','📌','i'],['cup','☕','u']];
const BLEND = [['tent','⛺','e'],['drum','🥁','u'],['frog','🐸','o'],['crab','🦀','a'],['flag','🚩','a'],['nest','🪺','e'],['snail','🐌','ai'],['sled','🛷','e'],['clock','🕐','o'],['truck','🚚','u'],['brush','🖌️','u'],['skunk','🦨','u'],['plug','🔌','u'],['stick','🪵','i'],['grin','😁','i']];
const TEAM = [['kite','🪁','i_e'],['rain','🌧️','ai'],['boat','⛵','oa'],['tree','🌳','ee'],['moon','🌙','oo'],['cake','🎂','a_e'],['bone','🦴','o_e'],['snow','❄️','ow'],['seed','🌱','ee'],['leaf','🍃','ea'],['goat','🐐','oa'],['bee','🐝','ee'],['cube','🧊','u_e'],['train','🚂','ai'],['bike','🚲','i_e']];
function vowelItem(list, vowels){
  const [w, e, v] = pick(list);
  if (v.includes('_')){ // magic e: kite -> k _ t e
    const [a] = v.split('_'); const i = w.indexOf(a);
    const shown = w.slice(0, i) + '_' + w.slice(i + 1);
    return mk('v:' + w, 'vowel', 'Which vowel finishes the word? Use the picture.', a, sample(['a','e','i','o','u'].filter(x => x !== a), 2),
      { show: e + '  ' + shown, say: 'Which vowel finishes this word?', explain: w + ' has the vowel ' + a + ' and a magic e.' });
  }
  const i = w.indexOf(v);
  const shown = w.slice(0, i) + '_'.repeat(v.length) + w.slice(i + v.length);
  const pool = v.length === 2 ? ['ai','ee','oa','ea','oo','ow','ay'] : ['a','e','i','o','u'];
  return mk('v:' + w, 'vowel', 'Which vowel finishes the word? Use the picture.', v, sample(pool.filter(x => x !== v), 2),
    { show: e + '  ' + shown, say: 'Which vowel finishes this word?', explain: w + ' is spelled with ' + v + '.' });
}

/* ---------- opposites ---------- */
const OPP = [['hot','cold'],['up','down'],['wet','dry'],['fast','slow'],['soft','hard'],['day','night'],['old','new'],['happy','sad'],['full','empty'],['loud','quiet'],['tall','short'],['clean','dirty'],['heavy','light'],['in','out'],['stop','go'],['near','far'],['early','late'],['thick','thin'],['rough','smooth'],['big','little'],['open','shut'],['push','pull'],['begin','end'],['brave','scared'],['kind','mean'],['dark','bright'],['win','lose'],['buy','sell'],['always','never'],['above','below']];
function oppItem(){
  const [a, b] = pick(OPP); const flip = Math.random() < 0.5; const q = flip ? b : a, r = flip ? a : b;
  const wr = sample(OPP.filter(p => p[0] !== a).map(p => pick(p)).filter(x => x !== q && x !== r), 2);
  return mk('o:' + a, 'opp', 'Which word is the OPPOSITE of “' + q + '”?', r, wr, { say: 'Which word is the opposite of ' + q + '?', explain: q + ' and ' + r + ' are opposites.' });
}
function notItem(){
  const [a, b] = pick(OPP.filter(p => p[0].length > 2 && p[1].length > 2));
  const th = pick(['The dish','The box','My coat','The road','Our room','The bag','This book','The soup']);
  const wr = sample(OPP.filter(p => p[0] !== a).map(p => pick(p)).filter(x => x !== a && x !== b), 2);
  return mk('n:' + a + th, 'opp', th + ' is not ' + a + '.  It is ______.', b, wr, { say: th + ' is not ' + a + '. It is what?', explain: 'Not ' + a + ' means ' + b + '.' });
}

/* ---------- Who / What / Where / When / Why ---------- */
// each entry: [question word, question with ___ for the word, answer sentence that answers ONLY that question]
const FACTS = [
  ['Who','___ found a red shell?','Tia found a red shell.'],['What','___ did Tia find?','Tia found a red shell.'],['Where','___ did Tia find a shell?','Tia found it on the beach.'],
  ['Who','___ plants seeds in spring?','Our class plants seeds.'],['When','___ does our class plant seeds?','Our class plants seeds in spring.'],
  ['Who','___ hid under the table?','Leo hid under the table.'],['Where','___ did Leo hide?','Leo hid under the table.'],['Why','___ did Leo hide?','Leo hid because he heard thunder.'],
  ['What','___ opens at six in the morning?','The bakery opens at six.'],['When','___ does the bakery open?','The bakery opens at six in the morning.'],
  ['Who','___ feeds the ducks?','Mina feeds the ducks.'],['Where','___ does Mina feed the ducks?','Mina feeds them at the pond.'],['When','___ does Mina feed the ducks?','Mina feeds them every Sunday.'],
  ['Who','___ rushed to the school?','The firefighters rushed to the school.'],['Why','___ did the firefighters rush to the school?','They rushed there because the alarm rang.'],
  ['What','___ carries its home on its back?','A turtle carries its home on its back.'],['Where','___ does a turtle carry its home?','A turtle carries its home on its back.'],
  ['Who','___ wore boots?','Sam wore boots.'],['What','___ did Sam wear?','Sam wore boots.'],['Why','___ did Sam wear boots?','Sam wore boots because the street was wet.'],
  ['What','___ shines at night?','The moon shines at night.'],['When','___ does the moon shine?','The moon shines at night.'],
  ['Who','___ baked bread?','Grandpa baked bread.'],['What','___ did Grandpa bake?','Grandpa baked bread.'],['Where','___ did Grandpa bake the bread?','He baked it in the oven.'],['When','___ did Grandpa bake the bread?','He baked it this morning.'],
  ['What','___ fly south in the fall?','Birds fly south in the fall.'],['When','___ do birds fly south?','Birds fly south in the fall.'],['Why','___ do birds fly south?','They fly south to find warm weather.'],
  ['Who','___ read a story to the kids?','The librarian read a story.'],['When','___ did the librarian read a story?','She read it on Friday.']
];
function whItem(maxLevel){
  const pool = FACTS.filter(f => maxLevel >= 5 || f[0] !== 'Why');
  const [w, q, a] = pick(pool);
  return mk('w:' + q, 'wh', 'Pick the question word that fits.', w, sample(['Who','What','Where','When','Why'].filter(x => x !== w), 3),
    { show: q.replace('___', '______') + '\n' + a, say: q.replace('___', 'blank') + ' ' + a, explain: '“' + w + '” asks for ' + ({ Who:'a person', What:'a thing', Where:'a place', When:'a time', Why:'a reason' })[w] + '.' });
}

/* ---------- book covers ---------- */
const TITLES = ['The Brave Little Turtle','How to Bake a Moon Cake','Zoe and the Lost Kite','The Tale of the Sleepy Bear','Captain Pip Sails Away','A Fox in the Snow','The Great Bug Parade','How to Train a Robot','The Secret Garden Gate','Penny the Painting Pup'];
const NAMES = ['Pia Moss','Leo Brandt','Dana Wick','Ravi Lane','Mina Frost','Tom Okafor','Ana Reyes','Sam Birch','Jo Calder','Nell Ortiz','Kai Mercer','Ivy Chen'];
function coverHTML(t, a, i){ return '📘 ' + t + '\n— by ' + a + '\n— illustrated by ' + i; }
function coverItem(){
  const t = pick(TITLES), [a, i] = sample(NAMES, 2), kind = rnd(3);
  const show = coverHTML(t, a, i);
  if (kind === 0) return mk('c:t' + t, 'cover', 'What is the TITLE of the book?', t, sample(TITLES.filter(x => x !== t), 2), { show, explain: 'The title is the name of the book. It is the big words.' });
  if (kind === 1) return mk('c:a' + t, 'cover', 'Who is the AUTHOR, the person who wrote the book?', a, [i].concat(sample(NAMES.filter(x => x !== a && x !== i), 1)), { show, explain: 'The author wrote the words. Look for “by”.' });
  return mk('c:i' + t, 'cover', 'Who is the ILLUSTRATOR, the person who drew the pictures?', i, [a].concat(sample(NAMES.filter(x => x !== a && x !== i), 1)), { show, explain: 'The illustrator drew the pictures. Look for “illustrated by”.' });
}

/* ---------- table of contents ---------- */
const TOCS = [
  ['Max the Moon Dog', ['Blast Off','Max Meets a Star','A Rocket Gets Stuck','The Moon Dust Storm','Max Saves the Day','Home Again']],
  ['The Dragon Who Sneezed', ['A Tickly Nose','Smoke in the Kitchen','Run to the River','The Biggest Sneeze','Dragon Tea Party','Goodnight, Dragon']],
  ['Detective Daisy', ['The Missing Hat','Clues in the Mud','A Strange Footprint','The Hidden Door','Case Closed','A Surprise Party']],
  ['Lost in the Jungle', ['The Wrong Turn','A Friendly Monkey','River of Crocodiles','The Rope Bridge','Campfire Night','Found at Last']]
];
function tocItem(){
  const [title, ch] = pick(TOCS);
  const pages = [2, 8, 14, 19, 26, 33].slice(0, ch.length).map((p, i) => p + i % 2);
  const show = '📖 ' + title + '\n' + ch.map((c, i) => (i + 1) + '. ' + c + '  ....  page ' + pages[i]).join('\n');
  const k = rnd(3), i = rnd(ch.length);
  if (k === 0) return mk('t:p' + title + i, 'toc', 'What page does “' + ch[i] + '” start on?', String(pages[i]), sample(pages.filter(p => p !== pages[i]).map(String), 2), { show, explain: 'Find the chapter, then read the page number.' });
  if (k === 1) return mk('t:n' + title + i, 'toc', 'What is the name of chapter ' + (i + 1) + '?', ch[i], sample(ch.filter((_, j) => j !== i), 2), { show, explain: 'Chapter ' + (i + 1) + ' is “' + ch[i] + '”.' });
  return mk('t:b' + title, 'toc', 'What is the title of this book?', title, sample(TOCS.filter(x => x[0] !== title).map(x => x[0]), 2), { show, explain: 'The title is at the top.' });
}

/* ---------- suffixes and prefixes ---------- */
const ER = ['slow','dark','tall','fast','long','small','cold','warm','loud','near'];
const FUL = [['hand','handful'],['harm','harmful'],['help','helpful'],['care','careful'],['joy','joyful'],['play','playful'],['hope','hopeful'],['thank','thankful']];
const LESS = [['use','useless'],['help','helpless'],['care','careless'],['hope','hopeless'],['fear','fearless'],['home','homeless']];
function suffixItem(level){
  const k = rnd(level >= 6 ? 5 : 3);
  if (k === 0){ const b = pick(ER); return mk('s:er' + b, 'suffix', b + ' + er = ?', b + 'er', [b + 'est', b + 'ful'], { say: b + ' plus e r. What word?', explain: '-er means more. ' + b + 'er means more ' + b + '.' }); }
  if (k === 1){ const b = pick(ER); return mk('s:est' + b, 'suffix', b + ' + est = ?', b + 'est', [b + 'er', b + 'less'], { say: b + ' plus e s t. What word?', explain: '-est means the most. ' + b + 'est means the most ' + b + '.' }); }
  if (k === 2){ const [b, w] = pick(Math.random() < 0.5 ? FUL : LESS); const f = FUL.some(x => x[1] === w);
    return mk('s:' + w, 'suffix', b + ' + ' + (f ? 'ful' : 'less') + ' = ?', w, [b + (f ? 'less' : 'ful'), b + 'er'], { say: b + ' plus ' + (f ? 'f u l' : 'l e s s') + '. What word?', explain: f ? '-ful means full of.' : '-less means without.' }); }
  if (k === 3){ const [b, w] = pick(LESS); return mk('s:m' + w, 'suffix', 'Which word means “without ' + b + '”?', w, [b + 'ful', b + 'er'], { explain: '-less means without.' }); }
  const P = [['happy','unhappy','not happy'],['kind','unkind','not kind'],['do','redo','do again'],['read','reread','read again'],['lock','unlock','not locked'],['fill','refill','fill again']];
  const [b, w, m] = pick(P);
  return mk('s:p' + w, 'suffix', 'Which word means “' + m + '”?', w, sample(P.filter(x => x[1] !== w).map(x => x[1]), 2), { explain: (w.startsWith('un') ? 'un-' : 're-') + ' ' + (w.startsWith('un') ? 'means not.' : 'means again.') });
}

/* ---------- synonyms (level 7+) ---------- */
const SYN = [['big','large'],['small','tiny'],['happy','glad'],['fast','quick'],['begin','start'],['pretty','lovely'],['tired','sleepy'],['shout','yell'],['smart','clever'],['rock','stone'],['cold','chilly'],['unhappy','sad']];
function synItem(){
  const [a, b] = pick(SYN); const wr = sample(SYN.filter(p => p[0] !== a).map(p => p[1]).filter(x => x !== b), 2);
  return mk('y:' + a, 'syn', 'Which word means almost the SAME as “' + a + '”?', b, wr, { explain: a + ' and ' + b + ' mean almost the same thing.' });
}

/* ---------- passages with questions (levels 3-8) ---------- */
// q = question, s = answer sentence with ___ , o = options (first is correct unless a given)
const PASS = [
  { lvl:3, id:'p1', text:'Rosa has a small gray cat named Pepper. Pepper sleeps on the red chair. Every morning, Pepper drinks milk from a blue bowl.', qs:[
    { q:'Who has a cat?', s:'___ has a cat.', o:['Rosa','Pepper','The chair'] }, { q:'Where does Pepper sleep?', s:'Pepper sleeps on the ___.', o:['red chair','blue bowl','gray cat'] }, { q:'What does Pepper drink?', s:'Pepper drinks ___.', o:['milk','juice','water'] } ] },
  { lvl:3, id:'p2', text:'The bus came at eight. Ben and Ana sat in the back. They saw a big truck and a little dog on the road.', qs:[
    { q:'When did the bus come?', s:'The bus came at ___.', o:['eight','six','ten'] }, { q:'Who sat in the back?', s:'___ sat in the back.', o:['Ben and Ana','The dog','The truck'] }, { q:'What did they see on the road?', s:'They saw a truck and a ___.', o:['dog','cat','bus'] } ] },
  { lvl:3, id:'p3', text:'Dad made soup for lunch. It was hot, so Mia blew on it. Then she ate all of it and said, “Yum!”', qs:[
    { q:'Who made the soup?', s:'___ made the soup.', o:['Dad','Mia','Mom'] }, { q:'Why did Mia blow on the soup?', s:'Mia blew on it because it was ___.', o:['hot','cold','sweet'] } ] },
  { lvl:4, id:'p4', text:'Frogs start life as eggs in a pond. The eggs turn into tadpoles, and tadpoles have tails and live in the water. After many weeks, the tadpoles grow legs and lose their tails. Then they hop onto land as little frogs.', qs:[
    { q:'Where do frogs start life?', s:'Frogs start life as eggs in a ___.', o:['pond','tree','house'] }, { q:'What do tadpoles have?', s:'Tadpoles have ___.', o:['tails','wings','shells'] }, { q:'What happens after many weeks?', s:'The tadpoles grow ___.', o:['legs','wings','fur'] } ] },
  { lvl:4, id:'p5', text:'Kofi wanted to build a sandcastle. He packed wet sand into a bucket and flipped it over. Soon he had four towers. A wave came and washed one tower away, so Kofi built it again.', qs:[
    { q:'What did Kofi want to build?', s:'Kofi wanted to build a ___.', o:['sandcastle','boat','kite'] }, { q:'How many towers did he have?', s:'He had ___ towers.', o:['four','two','six'] }, { q:'What washed one tower away?', s:'A ___ washed it away.', o:['wave','dog','man'] } ] },
  { lvl:5, id:'p6', text:'Bees live together in a hive. Worker bees fly out to find flowers. They collect a sweet juice called nectar, and they carry it back to the hive. The bees turn the nectar into honey. In winter, the honey is their food.', qs:[
    { q:'Where do bees live?', s:'Bees live in a ___.', o:['hive','nest','cave'] }, { q:'What do worker bees collect?', s:'They collect a sweet juice called ___.', o:['nectar','water','milk'] }, { q:'Why do bees make honey?', s:'Honey is their food in ___.', o:['winter','summer','spring'] } ] },
  { lvl:5, id:'p7', text:'Nia lost her library book. She looked under her bed and behind the couch. At last she found it in the backpack. “I will always zip my bag,” she said. “Then my books will stay safe.”', qs:[
    { q:'Where did Nia find the book?', s:'She found it in the ___.', o:['backpack','couch','bed'] }, { q:'Why will Nia zip her bag?', s:'She zips it so her books will stay ___.', o:['safe','new','dry'] }, { q:'What did Nia lose?', s:'Nia lost her ___ book.', o:['library','story','school'] } ] },
  { lvl:6, id:'p8', text:'Willa is a very small mouse who lives inside the wall of a bakery. She is shy, but she is also brave. One night, a cat sneaked in. Willa banged a spoon on a pan. The loud noise scared the cat away, and the baker woke up and smiled.', qs:[
    { q:'Who is the main character?', s:'The main character is ___.', o:['Willa','the cat','the baker'] }, { q:'Where does Willa live?', s:'Willa lives inside the wall of a ___.', o:['bakery','school','barn'] }, { q:'Could Willa be a person?', s:'___, Willa could not be a person.', o:['No','Yes','Maybe'] }, { q:'Why did the cat run away?', s:'The cat ran away because of the loud ___.', o:['noise','light','smell'] } ] },
  { lvl:6, id:'p9', text:'Last summer, Jun and his sister camped by a lake. They put up a green tent and made a fire to cook dinner. After dark, they lay on a blanket and counted stars. Jun counted forty. His sister counted fifty-one.', qs:[
    { q:'Where did Jun camp?', s:'Jun camped by a ___.', o:['lake','road','farm'] }, { q:'What did they do after dark?', s:'They counted ___.', o:['stars','fish','tents'] }, { q:'Who counted more stars?', s:'___ counted more stars.', o:['His sister','Jun','Nobody'] } ] },
  { lvl:7, id:'p10', text:'Ravi trains his dog, Scout, to find lost things. First, he hides a sock. Then he says, “Find it!” Scout sniffs the floor and runs through the house. When he finds the sock, Ravi gives him a treat. After a month, Scout can find keys, shoes, and even a TV remote.', qs:[
    { q:'What does Ravi train Scout to do?', s:'Ravi trains Scout to find lost ___.', o:['things','cats','toys at school'] }, { q:'Why does Ravi give Scout a treat?', s:'Ravi gives him a treat when he finds the ___.', o:['sock','door','bed'] }, { q:'How does Scout find things?', s:'Scout finds things by ___ the floor.', o:['sniffing','digging up','jumping on'] }, { q:'How long did the training take to work?', s:'After a ___, Scout could find keys.', o:['month','day','year'] } ] },
  { lvl:7, id:'p11', text:'Long ago, sailors used the stars to find their way across the ocean. They had no maps on their phones. A sailor looked for a bright star that stays in the same spot in the sky. If he kept it in front of the ship, he knew he was sailing north.', qs:[
    { q:'What did sailors use to find their way?', s:'Sailors used the ___.', o:['stars','radio','roads'] }, { q:'Why did sailors look for a star that stays in one spot?', s:'It helped them know which way was ___.', o:['north','home','down'] }, { q:'When did this happen?', s:'This happened a ___ time ago.', o:['long','short','few minutes'] } ] },
  { lvl:8, id:'p12', text:'Ines practiced the violin every day for a whole year. At first, the sounds were squeaky and made her brother cover his ears. She felt like giving up, but her teacher said, “Every musician starts with squeaks.” Ines kept going. At the spring concert, she played a slow, sweet song, and the whole room clapped.', qs:[
    { q:'Why did Ines feel like giving up?', s:'Her violin sounds were ___ at first.', o:['squeaky','too sweet','too quiet'] }, { q:'What did the teacher want Ines to know?', s:'Every musician starts with ___.', o:['squeaks','prizes','new violins'] }, { q:'How do you think Ines felt at the end?', s:'Ines felt ___.', o:['proud','bored','sleepy'] }, { q:'When did Ines play her slow, sweet song?', s:'She played it at the ___ concert.', o:['spring','winter','school bus'] } ] },
  { lvl:8, id:'p13', text:'A glacier is a huge river of ice that moves very slowly. It forms where more snow falls in winter than melts in summer. The snow piles up and gets squeezed into ice. Over many years, the heavy ice begins to slide downhill. Glaciers carve out valleys as they move.', qs:[
    { q:'What is a glacier?', s:'A glacier is a huge river of ___.', o:['ice','water','sand'] }, { q:'How does a glacier form?', s:'More snow falls in winter than ___ in summer.', o:['melts','grows','blows'] }, { q:'What do glaciers do to the land?', s:'Glaciers carve out ___.', o:['valleys','cities','roads'] } ] }
];
function passItem(level, seen){
  const pool = PASS.filter(p => p.lvl <= level && p.lvl >= level - 2);
  const fresh = pool.filter(p => !seen.has('ps:' + p.id));
  const p = pick(fresh.length ? fresh : pool.length ? pool : PASS.filter(x => x.lvl <= 3));
  const q = pick(p.qs);
  const right = q.o[0];
  return mk('ps:' + p.id + ':' + q.q, 'pass', q.q, right, q.o.slice(1), { show: p.text + '\n\n' + q.s.replace('___', '______'), say: p.text, qsay: q.q, explain: 'Look back at the story. ' + q.s.replace('___', right) , passId: p.id });
}

/* ---------- session builder ---------- */
const LEVEL_NAMES = ['', 'Sprout', 'Seedling', 'Sapling', 'Scout', 'Ranger', 'Pathfinder', 'Trailblazer', 'Master'];
const LEVEL_ICONS = ['', '🌱', '🌿', '🌳', '🧭', '🏹', '🗺️', '🔥', '👑'];
function kindsFor(level){
  switch (level){
    case 1: return ['vowel','vowel','opp'];
    case 2: return ['vowel','vowel','opp','not','blend'];
    case 3: return ['not','blend','wh','cover','pass','pass'];
    case 4: return ['wh','cover','toc','pass','pass','team'];
    case 5: return ['wh','toc','suffix','suffix','pass','pass','team'];
    case 6: return ['suffix','suffix','pass','pass','pass','toc','wh'];
    case 7: return ['suffix','syn','pass','pass','pass','pass','wh'];
    default: return ['suffix','syn','pass','pass','pass','pass','pass','wh'];
  }
}
function one(kind, level, seen){
  switch (kind){
    case 'vowel': return vowelItem(CVC);
    case 'blend': return vowelItem(BLEND);
    case 'team': return vowelItem(TEAM);
    case 'opp': return oppItem();
    case 'not': return notItem();
    case 'wh': return whItem(level);
    case 'cover': return coverItem();
    case 'toc': return tocItem();
    case 'suffix': return suffixItem(level);
    case 'syn': return synItem();
    default: return passItem(level, seen);
  }
}
function session(level, seenIds, n){
  level = Math.max(1, Math.min(8, level | 0 || 1)); n = n || 10;
  const seen = new Set(seenIds || []), kinds = kindsFor(level), out = [], ids = new Set();
  let guard = 0, last = '';
  while (out.length < n && guard++ < 200){
    const k = kinds[out.length % kinds.length] === last && kinds.length > 1 ? pick(kinds) : kinds[(out.length + rnd(2)) % kinds.length];
    const it = one(k, level, seen);
    if (ids.has(it.id) || (seen.has(it.id) && guard < 80)) continue;
    ids.add(it.id); out.push(it); last = k;
  }
  return out;
}
const api = { session, LEVEL_NAMES, LEVEL_ICONS, MAX_LEVEL: 8 };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WB = api;
})(typeof window !== 'undefined' ? window : globalThis);
