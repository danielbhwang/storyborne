/* Storyborne Workbook: original Kumon-style practice drills (data + item generator, no DOM).
   window.WB.session(level, seen) -> 10 items. Each item: { id, kind, prompt, say, show, options[], answer, explain }
   Levels 1-8 get harder: letters/vowels and opposites -> wh-questions -> thinking passages -> suffixes -> longer passages with "why" and "how". */
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

/* ---------- find the who / what / where / when / why inside a sentence (Kumon style) ---------- */
// [sentence, who, what, where, when, why]
const SENT = [
  ['Mia read a book under the tree after lunch.', 'Mia', 'a book', 'under the tree', 'after lunch', null],
  ['Grandpa baked bread in the kitchen on Sunday.', 'Grandpa', 'bread', 'in the kitchen', 'on Sunday', null],
  ['The puppy dug a hole in the yard this morning.', 'The puppy', 'a hole', 'in the yard', 'this morning', null],
  ['Leo kicked the ball at the park yesterday.', 'Leo', 'the ball', 'at the park', 'yesterday', null],
  ['At night, the owl hunted mice in the barn.', 'the owl', 'mice', 'in the barn', 'At night', null],
  ['Ana painted a rainbow at school on Monday.', 'Ana', 'a rainbow', 'at school', 'on Monday', null],
  ['The dragon guarded its gold inside the cave all winter.', 'The dragon', 'its gold', 'inside the cave', 'all winter', null],
  ['Dad planted tomatoes in the garden in the spring.', 'Dad', 'tomatoes', 'in the garden', 'in the spring', null],
  ['Ben wore his raincoat to school because it was raining.', 'Ben', 'his raincoat', 'to school', null, 'because it was raining'],
  ['After dinner, Zoe drank water in the kitchen because she was thirsty.', 'Zoe', 'water', 'in the kitchen', 'After dinner', 'because she was thirsty'],
  ['The knight raised his shield at the gate because the dragon was coming.', 'The knight', 'his shield', 'at the gate', null, 'because the dragon was coming'],
  ['On Saturday, Mom bought apples at the market so she could bake a pie.', 'Mom', 'apples', 'at the market', 'On Saturday', 'so she could bake a pie'],
  ['The children whispered in the library so they would not bother anyone.', 'The children', null, 'in the library', null, 'so they would not bother anyone'],
  ['Kai fed the fish in the morning because they were hungry.', 'Kai', 'the fish', null, 'in the morning', 'because they were hungry'],
  ['Every summer, my cousins swim in the lake to cool off.', 'my cousins', null, 'in the lake', 'Every summer', 'to cool off'],
  ['The baby bird chirped in its nest at sunrise because it wanted food.', 'The baby bird', null, 'in its nest', 'at sunrise', 'because it wanted food']
];
const WH_I = { Who:1, What:2, Where:3, When:4, Why:5 };
function whFindItem(level){
  const words = level >= 5 ? ['Who','What','Where','When','Why'] : ['Who','What','Where','When'];
  let r, w, guard = 0;
  do { r = pick(SENT); w = pick(words); } while ((!r[WH_I[w]] || (w === 'Why' && level < 5)) && guard++ < 50);
  const right = r[WH_I[w]], wrongs = sample([1,2,3,4,5].map(i => r[i]).filter(x => x && x !== right), 2);
  return mk('f:' + w + r[0], 'whfind', 'Which words tell ' + w.toUpperCase() + '?', right, wrongs,
    { show: r[0], say: r[0], qsay: 'Which words tell ' + w + '?', explain: '“' + right + '” tells ' + w.toLowerCase() + ': ' + ({ Who:'the person or animal', What:'the thing', Where:'the place', When:'the time', Why:'the reason' })[w] + '.' });
}

/* ---------- yes or no: is it true in the story? ---------- */
// [story, [statement, true/false], ...]
const TF = [
  ['Jake has a red bike. He rides it to the park every day. One day the tire went flat, so he walked.', ['Jake’s bike is red.', 1], ['Jake rides to the zoo.', 0], ['Jake walked when the tire went flat.', 1]],
  ['The cat sat on the window. It watched two birds in the tree. Then it fell asleep in the sun.', ['The cat watched birds.', 1], ['The cat chased a mouse.', 0], ['The cat fell asleep.', 1]],
  ['Ella made a card for her grandma. She drew a big yellow sun and wrote, “I love you.” Grandma put it on the fridge.', ['Ella drew a moon.', 0], ['The card was for Grandma.', 1], ['Grandma threw the card away.', 0]],
  ['It snowed all night. In the morning, Sam and Lily built a snowman with a carrot nose and a blue hat.', ['It rained all night.', 0], ['The snowman had a carrot nose.', 1], ['The snowman wore a red hat.', 0]],
  ['A small dragon named Puff could not fly yet. Every day she flapped her wings on the hill. By the end of summer, she flew over the whole valley.', ['Puff could always fly.', 0], ['Puff practiced on a hill.', 1], ['Puff learned to fly by the end of summer.', 1]],
  ['Our class went to the farm. We fed the goats and picked pumpkins. My pumpkin was so heavy that I needed help to carry it.', ['The class went to the beach.', 0], ['They fed goats.', 1], ['The pumpkin was very light.', 0]],
  ['Noah lost his tooth at lunch. He wrapped it in a napkin and put it in his pocket. At bedtime, he put it under his pillow.', ['Noah lost his tooth at lunch.', 1], ['He put the tooth in his shoe.', 0], ['The tooth went under his pillow.', 1]],
  ['Bats sleep in the day and fly at night. They hang upside down in caves. Many bats eat bugs.', ['Bats sleep at night.', 0], ['Bats hang upside down.', 1], ['Many bats eat bugs.', 1]]
];
function tfItem(){
  const t = pick(TF), [st, v] = pick(t.slice(1));
  return mk('t:' + st, 'tf', 'Read the story. Is this TRUE?', v ? 'Yes' : 'No', [v ? 'No' : 'Yes'],
    { show: t[0] + '\n\n“' + st + '”', say: t[0], qsay: 'Is this true? ' + st, explain: v ? 'Yes, the story says so.' : 'No. Look back: the story says something different.' });
}

/* ---------- order of events: first, next, last ---------- */
const SEQ = [
  ['First, Ava got a cup. Next, she poured the milk. Last, she drank it all.', ['Ava got a cup','Ava poured the milk','Ava drank it all']],
  ['Max planted a seed. He watered it every day. Soon a green sprout popped up.', ['Max planted a seed','Max watered it','A sprout popped up']],
  ['The egg cracked. A tiny chick poked its head out. Then it took its first wobbly steps.', ['The egg cracked','The chick poked its head out','The chick took its first steps']],
  ['Lily put on her shoes. She tied the laces. Then she ran out to play.', ['Lily put on her shoes','Lily tied the laces','Lily ran out to play']],
  ['Dad mixed the flour and eggs. He poured the batter into a pan. After it baked, we ate warm cake.', ['Dad mixed the flour and eggs','Dad poured the batter','We ate warm cake']],
  ['The knight climbed the tall tower. He opened the heavy door. Inside, he found a sleeping dragon.', ['The knight climbed the tower','The knight opened the door','The knight found a dragon']],
  ['Dark clouds filled the sky. Thunder rumbled. Then big drops of rain began to fall.', ['Dark clouds filled the sky','Thunder rumbled','Rain began to fall']],
  ['Zoe found a lost kitten. She gave it some milk. The next day, she found its owner.', ['Zoe found a kitten','Zoe gave it milk','Zoe found its owner']]
];
function orderItem(){
  const [story, ev] = pick(SEQ), i = rnd(3), w = ['FIRST','NEXT','LAST'][i];
  return mk('o:' + w + story, 'order', 'What happened ' + w + '?', ev[i], ev.filter((_, j) => j !== i),
    { show: story, say: story, qsay: 'What happened ' + w.toLowerCase() + '?', explain: ['First','Next','Last'][i] + ', ' + ev[i].charAt(0).toLowerCase() + ev[i].slice(1) + '.' });
}

/* ---------- pick the word that fits (use the clues) ---------- */
// [sentence with ___, right, wrong, wrong, min level]
const CLOZE = [
  ['The bird flew up into the ___.', 'sky', 'cup', 'shoe', 2], ['I wear my coat when it is ___.', 'cold', 'hot', 'sunny', 2], ['The fish swims in the ___.', 'pond', 'tree', 'bed', 2],
  ['Please ___ the door so the cat stays in.', 'close', 'eat', 'paint', 2], ['We use an umbrella when it ___.', 'rains', 'sings', 'sleeps', 2],
  ['Mom used a ___ to cut the paper.', 'scissors', 'spoon', 'pillow', 3], ['The ice cream ___ in the hot sun.', 'melted', 'barked', 'grew', 3], ['I brush my ___ before bed.', 'teeth', 'shoes', 'books', 3],
  ['The baby was ___, so she took a long nap.', 'tired', 'hungry', 'loud', 4], ['The road was ___, so we drove very slowly.', 'icy', 'happy', 'loud', 4], ['Sam was so ___ that he laughed until he cried.', 'amused', 'angry', 'bored', 5],
  ['The dragon’s scales were hard, like a ___.', 'shield', 'pillow', 'feather', 5], ['The hikers were ___ after climbing the mountain all day.', 'exhausted', 'excited', 'empty', 6],
  ['The ___ boy shared his snack with everyone.', 'generous', 'greedy', 'grumpy', 6], ['It was so ___ that we could not see our hands in front of us.', 'dark', 'bright', 'warm', 4],
  ['The library was so ___ you could hear a pin drop.', 'silent', 'noisy', 'crowded', 7], ['She was ___ to try the scary ride, but she did it anyway.', 'nervous', 'thrilled', 'bored', 7],
  ['The old castle was ___ with dust and cobwebs.', 'covered', 'empty', 'painted', 7], ['The scientist made a careful ___ before testing her idea.', 'prediction', 'sandwich', 'noise', 8]
];
function clozeItem(level){
  const pool = CLOZE.filter(c => c[4] <= level && c[4] >= level - 3);
  const [s, r, a, b] = pick(pool.length ? pool : CLOZE);
  return mk('z:' + s, 'cloze', 'Which word fits best? Use the clues.', r, [a, b], { show: s.replace('___', '______'), say: s.replace('___', 'blank'), explain: s.replace('___', r) });
}

/* ---------- book covers (unused) ---------- */
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
    { q:'What is a glacier?', s:'A glacier is a huge river of ___.', o:['ice','water','sand'] }, { q:'How does a glacier form?', s:'More snow falls in winter than ___ in summer.', o:['melts','grows','blows'] }, { q:'What do glaciers do to the land?', s:'Glaciers carve out ___.', o:['valleys','cities','roads'] } ] },
  /* thinking passages: inference, feelings, word meaning, main idea, order of events */
  { lvl:3, id:'t1', text:'Sam got a new kite. He ran and ran, but there was no wind. The kite fell down. Sam sat on the grass and frowned.', qs:[
    { q:'How did Sam feel?', s:'Sam felt ___.', o:['sad','happy','sleepy'] }, { q:'Why did the kite fall down?', s:'The kite fell because there was no ___.', o:['wind','string','sun'] }, { q:'What did Sam do FIRST?', s:'First, Sam ___.', o:['ran with the kite','sat on the grass','frowned'] } ] },
  { lvl:3, id:'t2', text:'Lily put on her coat, her hat, and her mittens. She looked out the window. Snow was falling on the trees.', qs:[
    { q:'Why did Lily put on mittens?', s:'It was ___ outside.', o:['cold','hot','dark'] }, { q:'What season is it?', s:'It is ___.', o:['winter','summer','spring'] } ] },
  { lvl:3, id:'t3', text:'The baby bird was in the nest. It opened its mouth wide and peeped. Then the mother bird came back with a worm.', qs:[
    { q:'Why did the baby bird open its mouth?', s:'The baby bird was ___.', o:['hungry','sleepy','cold'] }, { q:'What happened LAST?', s:'Last, the mother came back with a ___.', o:['worm','nest','feather'] } ] },
  { lvl:4, id:'t4', text:'Max tiptoed down the stairs. It was very early and everyone was asleep. He did not want to wake his baby sister. He went to the kitchen and quietly poured some cereal.', qs:[
    { q:'Why did Max tiptoe?', s:'He did not want to ___ his sister.', o:['wake','feed','find'] }, { q:'What does “tiptoed” mean?', s:'Tiptoed means walked ___.', o:['very quietly','very fast','backward'] }, { q:'What time of day was it?', s:'It was early in the ___.', o:['morning','night','afternoon'] } ] },
  { lvl:4, id:'t5', text:'A young dragon named Ember tried to breathe fire, but only smoke came out. She tried again and again. On the tenth try, a tiny orange flame popped out. Ember did a happy flip in the sky.', qs:[
    { q:'What is this story mostly about?', s:'It is about a dragon learning to ___.', o:['breathe fire','fly','swim'] }, { q:'How did Ember feel at the end?', s:'Ember felt ___.', o:['proud','scared','angry'] }, { q:'What lesson does the story teach?', s:'If you keep ___, you can do it.', o:['trying','sleeping','hiding'] } ] },
  { lvl:4, id:'t6', text:'Owls hunt at night. Their big eyes help them see in the dark. They can also turn their heads almost all the way around. Their soft feathers let them fly without making a sound.', qs:[
    { q:'What is this mostly about?', s:'It is about how owls ___.', o:['hunt at night','build nests','sing songs'] }, { q:'Why do owls have big eyes?', s:'Big eyes help them see in the ___.', o:['dark','water','snow'] }, { q:'Why is flying quietly good for an owl?', s:'Its food will not ___ it coming.', o:['hear','smell','taste'] } ] },
  { lvl:5, id:'t7', text:'Grace held the shell up to her ear. She heard a soft whoosh, like waves. “The ocean is inside!” she said. Her grandpa laughed. “That sound is really the air around you bouncing inside the shell,” he said.', qs:[
    { q:'What did Grace THINK made the sound?', s:'She thought the ___ was inside.', o:['ocean','wind','fish'] }, { q:'What really makes the sound?', s:'The ___ bouncing inside the shell.', o:['air','water','sand'] }, { q:'Why did Grandpa laugh?', s:'Grace’s idea was ___ but not true.', o:['cute','mean','scary'] } ] },
  { lvl:5, id:'t8', text:'The path was steep and rocky. Leo’s legs were tired, and he wanted to stop. But his mom pointed up. “Just a little more,” she said. When they reached the top, Leo could see the whole valley below, green and shining.', qs:[
    { q:'What does “steep” mean?', s:'Steep means going up very ___.', o:['sharply','slowly','flat'] }, { q:'How did Leo feel at the start?', s:'Leo felt ___.', o:['tired','excited','silly'] }, { q:'Why was it worth climbing?', s:'From the top he could see the whole ___.', o:['valley','house','car'] }, { q:'What happened right before they reached the top?', s:'Mom said, “Just a little ___.”', o:['more','faster','bit slower'] } ] },
  { lvl:5, id:'t9', text:'Plants need three things to grow: sunlight, water, and air. Their roots drink water from the soil. Their leaves catch sunlight and use it to make food. That is why a plant left in a dark closet will turn yellow and droop.', qs:[
    { q:'What is this mostly about?', s:'It is about what plants need to ___.', o:['grow','sleep','smell'] }, { q:'What do roots do?', s:'Roots drink ___ from the soil.', o:['water','sunlight','air'] }, { q:'Why does a plant in a closet turn yellow?', s:'It gets no ___.', o:['sunlight','water','soil'] } ] },
  { lvl:6, id:'t10', text:'Theo and Mara both wanted the last swing. Theo grabbed the chain first. Mara’s face crumpled. Theo looked at her, then stepped back. “You go first,” he said. “I’ll push you.” Mara grinned, and soon they were both laughing.', qs:[
    { q:'What does “crumpled” tell you about Mara?', s:'Mara was about to ___.', o:['cry','laugh','sneeze'] }, { q:'What kind of person is Theo?', s:'Theo is ___.', o:['kind','bossy','lazy'] }, { q:'Why were they laughing at the end?', s:'They found a way to ___.', o:['share','win','go home'] }, { q:'What did Theo do FIRST?', s:'First, Theo ___.', o:['grabbed the chain','pushed Mara','stepped back'] } ] },
  { lvl:6, id:'t11', text:'Camels can live in the hot desert for days without drinking. The hump on a camel’s back is not full of water. It is full of fat. When there is no food, the camel’s body uses the fat for energy. Thick eyelashes keep blowing sand out of its eyes.', qs:[
    { q:'What is in a camel’s hump?', s:'The hump is full of ___.', o:['fat','water','sand'] }, { q:'Why does a camel need long eyelashes?', s:'To keep ___ out of its eyes.', o:['sand','rain','bugs'] }, { q:'Which idea from the story is NOT true?', s:'It is NOT true that the hump is full of ___.', o:['water','fat','energy'] }, { q:'What is this mostly about?', s:'It is about how camels live in the ___.', o:['desert','ocean','forest'] } ] },
  { lvl:6, id:'t12', text:'Ava found a lost puppy shivering in the rain. It had a collar but no tag. She wrapped it in her jacket and carried it home. Her dad helped her make signs with a photo. Two days later, a girl knocked on the door, crying with joy.', qs:[
    { q:'Why was the puppy shivering?', s:'It was wet and ___.', o:['cold','hungry','happy'] }, { q:'Why did they make signs?', s:'To find the puppy’s ___.', o:['owner','food','bed'] }, { q:'Who was the girl at the door?', s:'She was the puppy’s ___.', o:['owner','sister','teacher'] }, { q:'Why was the girl crying?', s:'She was ___ to find her puppy.', o:['happy','sad','scared'] } ] },
  { lvl:7, id:'t13', text:'Every night, Noah’s grandmother told him stories about the stars. She said the brightest ones were dragons guarding the sky. Noah knew stars were really giant balls of burning gas, far away. Still, when he looked up, he liked to imagine a dragon winking back at him.', qs:[
    { q:'What are stars really?', s:'Stars are giant balls of burning ___.', o:['gas','rock','ice'] }, { q:'Why did Noah still imagine dragons?', s:'He liked his grandmother’s ___.', o:['stories','telescope','books'] }, { q:'Which is a FACT, not a story?', s:'Stars are ___.', o:['very far away','dragons','guarding the sky'] }, { q:'What does “imagine” mean?', s:'Imagine means to ___ in your mind.', o:['picture something','forget something','count'] } ] },
  { lvl:7, id:'t14', text:'The town had a problem: the old bridge was cracking. The mayor wanted to close it, but the farmers needed it to bring food to the market. A girl named Priya had an idea. “Let’s build a new bridge next to the old one, and use the old one only until the new one is done.” Everyone agreed.', qs:[
    { q:'What was the town’s problem?', s:'The old ___ was cracking.', o:['bridge','market','farm'] }, { q:'Why didn’t the farmers want the bridge closed?', s:'They needed it to bring ___ to the market.', o:['food','water','children'] }, { q:'How did Priya solve the problem?', s:'She said to build a ___ bridge.', o:['new','bigger old','wooden boat'] }, { q:'Why did everyone agree?', s:'Her plan helped ___.', o:['everyone','only the mayor','nobody'] } ] },
  { lvl:7, id:'t15', text:'Octopuses are clever animals. They can open jars to get food inside. Some can change color in less than a second to hide from enemies. If an octopus loses an arm, it can grow a new one. Scientists study them to learn how animals solve problems.', qs:[
    { q:'What is this mostly about?', s:'It is about how ___ octopuses are.', o:['clever','slow','scary'] }, { q:'Why does an octopus change color?', s:'To ___ from enemies.', o:['hide','play','eat'] }, { q:'What does “clever” mean?', s:'Clever means ___.', o:['smart','fast','big'] } ] },
  { lvl:8, id:'t16', text:'When Zara moved to a new school, she ate lunch alone for a week. On Friday, she noticed a boy drawing dragons in his notebook. Zara loved dragons too. Her heart pounded, but she walked over and said, “Your dragon has really cool wings.” The boy looked up and slid his notebook toward her. “Want to draw one?”', qs:[
    { q:'Why did Zara’s heart pound?', s:'She felt ___ about talking to him.', o:['nervous','angry','bored'] }, { q:'Why did Zara choose to talk to this boy?', s:'They both liked ___.', o:['dragons','lunch','school'] }, { q:'What will probably happen next?', s:'They will probably become ___.', o:['friends','enemies','teachers'] }, { q:'What is the lesson of this story?', s:'Being ___ can help you make friends.', o:['brave','quiet','alone'] } ] },
  { lvl:8, id:'t17', text:'Volcanoes form where hot, melted rock called magma pushes up from deep inside the Earth. When the pressure gets too strong, the volcano erupts, and the magma bursts out. Once it reaches the surface, it is called lava. As lava cools, it hardens into new rock. Some islands, like Hawaii, were made this way.', qs:[
    { q:'What is magma called once it reaches the surface?', s:'It is called ___.', o:['lava','ash','steam'] }, { q:'What causes a volcano to erupt?', s:'The ___ gets too strong.', o:['pressure','wind','rain'] }, { q:'How were islands like Hawaii made?', s:'Lava cooled and became new ___.', o:['rock','sand','water'] }, { q:'Put these in order. What comes SECOND?', s:'First magma pushes up, then the volcano ___.', o:['erupts','cools','is an island'] } ] },
  { lvl:8, id:'t18', text:'For weeks, Ben saved his allowance to buy a model rocket. Then his little brother broke his favorite toy truck and cried for an hour. Ben looked at his jar of coins. The next day, he came home with a new truck for his brother, and an empty jar. His mom hugged him tightly.', qs:[
    { q:'What was Ben saving for?', s:'He was saving for a model ___.', o:['rocket','truck','jar'] }, { q:'Why was the jar empty?', s:'Ben spent his money on a ___ for his brother.', o:['truck','rocket','snack'] }, { q:'Why did Mom hug Ben?', s:'She was ___ of him.', o:['proud','tired','scared'] }, { q:'What word best describes Ben?', s:'Ben is ___.', o:['generous','greedy','grumpy'] } ] }
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
    case 1: return ['vowel','vowel','opp','opp'];
    case 2: return ['vowel','blend','opp','wh','cloze','cloze'];
    case 3: return ['wh','whfind','whfind','tf','order','cloze','pass','pass'];
    case 4: return ['wh','whfind','whfind','tf','order','cloze','syn','pass','pass','pass'];
    case 5: return ['whfind','whfind','tf','order','cloze','suffix','syn','pass','pass','pass'];
    case 6: return ['whfind','tf','order','cloze','suffix','syn','pass','pass','pass','pass'];
    default: return ['whfind','order','cloze','syn','suffix','pass','pass','pass','pass','pass'];
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
    case 'whfind': return whFindItem(level);
    case 'tf': return tfItem();
    case 'order': return orderItem();
    case 'cloze': return clozeItem(level);
    default: return passItem(level, seen);
  }
}
function session(level, seenIds, n, boost){
  level = Math.max(1, Math.min(8, level | 0 || 1)); n = n || 10;
  // boost = drill kinds the reader needs (from their quiz mistakes): each one is added twice more to the mix, if it exists at this level
  const base = kindsFor(level), avail = new Set(base.concat(level >= 3 ? ['whfind','tf','order','cloze','pass'] : ['cloze','wh']));
  const kinds = base.concat(...(boost || []).filter(k => avail.has(k)).map(k => [k, k]));
  const seen = new Set(seenIds || []), out = [], ids = new Set();
  // a shuffled deck of the level's mix, so each set really follows it (mostly passages from level 3 up)
  let deck = [], guard = 0;
  while (out.length < n && guard++ < 300){
    if (!deck.length) deck = sample(kinds, kinds.length);
    const k = deck.pop();
    const it = one(k, level, seen);
    if (ids.has(it.id) || (seen.has(it.id) && guard < 120)) continue;
    ids.add(it.id); out.push(it);
  }
  return out;
}
const api = { session, LEVEL_NAMES, LEVEL_ICONS, MAX_LEVEL: 8 };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WB = api;
})(typeof window !== 'undefined' ? window : globalThis);
