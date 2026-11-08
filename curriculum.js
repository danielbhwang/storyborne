/* Storyborne 2.0 curriculum engine.
   Pure data + deterministic logic. No DOM, no network. Works in the browser (window.CURR) and in Node (module.exports).
   The curriculum engine decides WHAT the child practices. Story generation (AI or template) only decides HOW,
   and nothing it writes reaches a child without passing validateStory() against that child's profile. */
(function(root){
'use strict';

/* ======================= 1. CONFIG (all thresholds in one place) ======================= */
const CONFIG = {
  tiers: { emerging: 0.60, developing: 0.80, approaching: 0.90 },   // <60 emerging · 60–79 developing · 80–89 approaching · ≥ skill.crit.acc mastery-eligible
  minConfidence: 0.6,          // evidence below this confidence (e.g. noisy speech recognition) never counts toward mastery
  window: 24,                  // mastery looks at the most recent ~24 scored items per skill
  minSessions: 2,              // mastery needs evidence from at least 2 different sessions…
  minDays: 2,                  // …on at least 2 different days
  reviewDays: [2, 5, 12, 25, 50], // spaced review: days until a mastered skill is checked again (grows with each successful review)
  slipDrop: 0.15,              // a mastered skill whose latest two sessions fall this far under criterion goes to "needs reassessment"
  maxEvents: 900               // event log cap per child (summary counters keep the full totals)
};

/* ======================= 2. LEVELS + SKILL TAXONOMY ======================= */
const BANDS = [
  null,
  { n:1, name:'Explorer',    icon:'🧭', color:'#22c55e', desc:'Letter sounds and hearing sounds in words' },
  { n:2, name:'Trailblazer', icon:'🔥', color:'#14b8a6', desc:'Short vowels and three-letter words' },
  { n:3, name:'Adventurer',  icon:'⚔️', color:'#3b82f6', desc:'Blends, digraphs and early sight words' },
  { n:4, name:'Pathfinder',  icon:'🗺️', color:'#8b5cf6', desc:'Magic e, vowel teams and longer sentences' },
  { n:5, name:'Champion',    icon:'🛡️', color:'#f59e0b', desc:'Bossy r, oi/ou, two-syllable words, deeper comprehension' },
  { n:6, name:'Legend',      icon:'👑', color:'#ef4444', desc:'Multisyllable words, word parts, chapter-book thinking' }
];

const DOMAINS = [
  { id:'pa',   name:'Phonemic Awareness', icon:'👂', strand:'code' },
  { id:'ph',   name:'Phonics',            icon:'🔤', strand:'code' },
  { id:'dec',  name:'Decoding',           icon:'🧩', strand:'code' },
  { id:'sw',   name:'Sight Words',        icon:'❤️', strand:'code' },
  { id:'flu',  name:'Fluency',            icon:'🌊', strand:'fluency' },
  { id:'voc',  name:'Vocabulary',         icon:'📖', strand:'meaning' },
  { id:'comp', name:'Comprehension',      icon:'🧠', strand:'meaning' }
];

// crit: n = scored items needed, acc = accuracy needed (sessions/days come from CONFIG)
const C_CODE = { n:12, acc:0.90 }, C_PA = { n:8, acc:0.85 }, C_MEAN = { n:6, acc:0.80 }, C_FLU = { n:3, acc:0.95 };
const S = (id, name, band, pre, desc, ex, extra) => Object.assign({ id, domain:id.split('.')[0], name, band, pre, desc, ex, related:[] }, extra || {});
const SKILLS = [
  // Phonemic awareness (oral, tap-based; TTS says the sounds)
  S('pa.begin',   'Beginning sounds',   1, [],                 'Hears the first sound in a spoken word.', 'sun starts with /s/', { crit:C_PA, kid:'First sounds' }),
  S('pa.end',     'Ending sounds',      1, ['pa.begin'],       'Hears the last sound in a spoken word.', 'cat ends with /t/', { crit:C_PA, kid:'Last sounds' }),
  S('pa.blend',   'Blending sounds',    1, ['pa.begin'],       'Hears separate sounds and blends them into a word.', '/m/ /a/ /p/ → map', { crit:C_PA, kid:'Sound blending' }),
  S('pa.segment', 'Segmenting sounds',  2, ['pa.blend','pa.end'], 'Breaks a spoken word into its sounds and counts them.', 'ship → /sh/ /i/ /p/ = 3', { crit:C_PA, kid:'Sound counting' }),
  S('pa.manip',   'Changing sounds',    2, ['pa.segment'],     'Swaps one sound for another to make a new word.', 'cat → change /c/ to /h/ → hat', { crit:C_PA, kid:'Sound swapping' }),
  // Phonics
  S('ph.letters', 'Letter names',       1, [],                 'Recognizes upper and lower case letters.', 'b, d, p, q', { crit:C_CODE, kid:'Letters' }),
  S('ph.sounds',  'Letter sounds',      1, ['ph.letters'],     'Knows the most common sound of each letter.', 'm says /m/', { crit:C_CODE, kid:'Letter sounds' }),
  S('ph.short_a', 'Short a',            2, ['ph.sounds','pa.blend'], 'Reads a as in cat.', 'cat, map, bag', { crit:C_CODE, kid:'Short a', pat:'short_a' }),
  S('ph.short_i', 'Short i',            2, ['ph.short_a'],     'Reads i as in pig.', 'pig, sit, lid', { crit:C_CODE, kid:'Short i', pat:'short_i' }),
  S('ph.short_o', 'Short o',            2, ['ph.short_a'],     'Reads o as in hot.', 'hot, dog, mop', { crit:C_CODE, kid:'Short o', pat:'short_o' }),
  S('ph.short_u', 'Short u',            2, ['ph.short_i','ph.short_o'], 'Reads u as in bug.', 'bug, sun, cup', { crit:C_CODE, kid:'Short u', pat:'short_u' }),
  S('ph.short_e', 'Short e',            2, ['ph.short_i','ph.short_o'], 'Reads e as in bed.', 'bed, hen, net', { crit:C_CODE, kid:'Short e', pat:'short_e' }),
  S('ph.digraphs','Digraphs',           3, ['dec.cvc'],        'Reads sh, ch, th, wh, ck, ng as one sound.', 'ship, chip, that, duck', { crit:C_CODE, kid:'Sound teams (sh, ch, th)', pat:'digraph' }),
  S('ph.blends',  'Consonant blends',   3, ['dec.cvc'],        'Reads two or three consonants together, each sound heard.', 'frog, stop, jump, best', { crit:C_CODE, kid:'Blends (st, fr, nd)', pat:'blend' }),
  S('ph.silent_e','Silent e',           4, ['ph.digraphs','ph.blends'], 'A final e makes the vowel say its name.', 'cake, bike, home, cute', { crit:C_CODE, kid:'Magic e', pat:'silent_e' }),
  S('ph.vowel_teams','Vowel teams',     4, ['ph.silent_e'],    'Reads ai, ay, ee, ea, oa, ow, igh, oo, ew, ue.', 'rain, play, tree, boat, night', { crit:C_CODE, kid:'Vowel teams', pat:'vowel_team' }),
  S('ph.r_ctrl',  'R-controlled vowels',5, ['ph.vowel_teams'], 'Reads ar, or, er, ir, ur.', 'car, fork, her, bird, turn', { crit:C_CODE, kid:'Bossy r', pat:'r_ctrl' }),
  S('ph.diphthongs','Diphthongs',       5, ['ph.vowel_teams'], 'Reads oi, oy, ou, ow (cow).', 'coin, boy, cloud, cow', { crit:C_CODE, kid:'oi · oy · ou · ow', pat:'diphthong' }),
  S('ph.advanced','Advanced spellings', 6, ['ph.r_ctrl','ph.diphthongs'], 'Soft c/g, kn, wr, -dge, -tion, -ture.', 'city, gem, knee, write, bridge, nation', { crit:C_CODE, kid:'Tricky spellings', pat:'advanced' }),
  // Decoding
  S('dec.cvc',    'CVC words',          2, ['ph.short_a','ph.short_i','ph.short_o'], 'Blends consonant-vowel-consonant words.', 'sat, pin, hop', { crit:C_CODE, kid:'3-letter words', pat:'cvc' }),
  S('dec.regular','Regular 1-syllable words', 3, ['ph.digraphs','ph.blends'], 'Reads one-syllable words with blends and digraphs.', 'chomp, fresh, trick', { crit:C_CODE, kid:'Longer short words' }),
  S('dec.morph',  'Endings -s -ed -ing',4, ['dec.regular'],    'Reads base words with -s, -es, -ed, -ing.', 'jumps, wished, running', { crit:C_CODE, kid:'Word endings', pat:'suffix' }),
  S('dec.two_syl','Two-syllable words', 5, ['ph.silent_e','dec.morph'], 'Splits and reads two-syllable words.', 'rabbit, sunset, napkin', { crit:C_CODE, kid:'2-part words', pat:'two_syl' }),
  S('dec.syllable','Syllable division', 5, ['dec.two_syl'],    'Uses syllable types to split unknown words.', 'pic-nic, ro-bot, tum-ble', { crit:C_CODE, kid:'Chunking words' }),
  S('dec.multi',  'Multisyllable words',6, ['dec.syllable'],   'Reads words of three or more syllables.', 'fantastic, adventure, remember', { crit:C_CODE, kid:'Big words', pat:'multi' }),
  S('dec.irregular','Irregular words',  3, ['dec.cvc'],        'Reads words that break the rules (heart words).', 'said, was, of, they', { crit:C_CODE, kid:'Heart words' }),
  // Sight words
  S('sw.hf1',     'High-frequency words 1', 2, ['ph.sounds'],  'Pre-primer / primer high-frequency words.', 'the, and, is, see', { crit:C_CODE, kid:'Sight words 1' }),
  S('sw.hf2',     'High-frequency words 2', 3, ['sw.hf1'],     'First / second grade high-frequency words.', 'because, would, there', { crit:C_CODE, kid:'Sight words 2' }),
  S('sw.irregular','Irregular high-frequency words', 3, ['sw.hf1'], 'Instant recognition of irregular high-frequency words.', 'said, were, could', { crit:C_CODE, kid:'Heart words fast' }),
  S('sw.auto',    'Automatic recognition', 4, ['sw.hf2','sw.irregular'], 'Reads known words instantly inside connected text.', '95%+ of known words in a story', { crit:C_FLU, kid:'Instant words' }),
  // Fluency (story reading)
  S('flu.accuracy','Word reading accuracy', 2, ['dec.cvc'],    'Reads connected text at 95%+ accuracy without help.', 'grade-matched passage', { crit:C_FLU, kid:'Reading accuracy' }),
  S('flu.auto',   'Automaticity',       3, ['flu.accuracy'],   'Reads with few pauses or re-starts.', 'smooth reading', { crit:C_FLU, kid:'Smooth reading' }),
  S('flu.rate',   'Reading rate',       4, ['flu.auto'],       'Words correct per minute near the band target (Hasbrouck–Tindal norms).', 'WCPM', { crit:C_FLU, kid:'Reading speed' }),
  S('flu.expression','Expression',      4, ['flu.accuracy'],   'Reads with feeling that matches the story (grown-up rated, NAEP scale).', 'voices for characters', { crit:{ n:3, acc:0.75 }, kid:'Expression', rated:true }),
  S('flu.phrasing','Phrasing',          4, ['flu.accuracy'],   'Groups words into meaningful phrases (grown-up rated).', 'pauses at commas', { crit:{ n:3, acc:0.75 }, kid:'Phrasing', rated:true }),
  // Vocabulary
  S('voc.meaning','Word meanings',      2, [],                 'Knows meanings of story words.', 'brave = not scared', { crit:C_MEAN, kid:'Word meanings' }),
  S('voc.context','Context clues',      4, ['voc.meaning'],    'Figures out a new word from the sentence around it.', 'The soggy, wet socks…', { crit:C_MEAN, kid:'Context clues' }),
  S('voc.synonyms','Synonyms',          3, ['voc.meaning'],    'Matches words with the same meaning.', 'big / huge', { crit:C_MEAN, kid:'Same-meaning words' }),
  S('voc.antonyms','Antonyms',          3, ['voc.meaning'],    'Matches opposites.', 'hot / cold', { crit:C_MEAN, kid:'Opposites' }),
  S('voc.multi',  'Multiple-meaning words', 5, ['voc.context'],'Picks the right meaning from context.', 'bat (animal) / bat (baseball)', { crit:C_MEAN, kid:'Two-meaning words' }),
  S('voc.morph',  'Prefixes and suffixes', 6, ['dec.morph','voc.context'], 'Uses word parts to get meaning.', 'un-, re-, -ful, -less', { crit:C_MEAN, kid:'Word parts' }),
  // Comprehension (Evan-Moor / Spectrum / Modern Kid Press skill families)
  S('comp.literal','Who, what, where, when', 1, [],            'Answers questions whose answer is stated in the text.', 'Where did Wren live?', { crit:C_MEAN, kid:'Finding answers' }),
  S('comp.details','Supporting details',2, ['comp.literal'],   'Finds the detail that supports an idea.', 'What did they pack?', { crit:C_MEAN, kid:'Details' }),
  S('comp.sequence','Sequencing',       2, ['comp.literal'],   'Puts story events in order (first, next, last).', 'What happened first?', { crit:C_MEAN, kid:'Story order' }),
  S('comp.character','Character feelings and motives', 3, ['comp.literal'], 'Explains how and why a character feels or acts.', 'Why did Pebble hang his head?', { crit:C_MEAN, kid:'Characters' }),
  S('comp.cause', 'Cause and effect',   3, ['comp.sequence'],  'Connects what happened with why it happened.', 'What made the bridge fall?', { crit:C_MEAN, kid:'Cause & effect' }),
  S('comp.predict','Prediction',        3, ['comp.sequence'],  'Uses clues to predict what comes next.', 'What will happen next?', { crit:C_MEAN, kid:'Predicting' }),
  S('comp.retell','Retelling',          3, ['comp.sequence'],  'Retells beginning, middle and end (grown-up checked).', 'Tell the story back', { crit:{ n:3, acc:0.75 }, kid:'Retelling', rated:true }),
  S('comp.main_idea','Main idea',       4, ['comp.details'],   'Says what a passage is mostly about.', 'This story is mostly about…', { crit:C_MEAN, kid:'Main idea' }),
  S('comp.infer', 'Inference',          4, ['comp.character','comp.cause'], 'Uses clues + what you know to work out what is not said.', 'How do you know it was night?', { crit:C_MEAN, kid:'Reading clues' }),
  S('comp.fact_opinion','Fact and opinion', 5, ['comp.details'],'Tells a fact (can be checked) from an opinion (a feeling).', '"Dragons are the best" is an opinion', { crit:C_MEAN, kid:'Fact or opinion' }),
  S('comp.compare','Compare and contrast', 5, ['comp.character'],'Tells how two characters or things are alike and different.', 'How are Wren and Mira different?', { crit:C_MEAN, kid:'Same & different' }),
  S('comp.pov',   'Point of view',      5, ['comp.character'], 'Identifies who is telling the story and how they see it.', 'Who is telling this story?', { crit:C_MEAN, kid:'Who is telling?' }),
  S('comp.purpose','Author\'s purpose', 6, ['comp.main_idea'], 'Tells why the author wrote it: to entertain, inform or persuade.', 'Why did the author write this?', { crit:C_MEAN, kid:'Why it was written' }),
  S('comp.summary','Summarizing',       6, ['comp.main_idea','comp.retell'], 'Sums up the most important parts in a few sentences.', 'In two sentences…', { crit:C_MEAN, kid:'Summing up' })
];
const SKILL = Object.fromEntries(SKILLS.map(s => [s.id, s]));
// related skills = shared prerequisites or dependents
SKILLS.forEach(s => s.pre.forEach(p => { if (SKILL[p]){ SKILL[p].related.push(s.id); s.related.push(p); } }));
const PATTERN_SKILL = Object.fromEntries(SKILLS.filter(s => s.pat).map(s => [s.pat, s.id]));

/* ======================= 3. WORD KNOWLEDGE ======================= */
const HF1 = 'a and away big blue can come down find for funny go help here i in is it jump little look make me my not one play red run said see the three to two up we where yellow you all am are at ate be black brown but came did do eat four get good have he into like must new no now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes'.split(' ');
const HF2 = 'after again an any as ask by could every fly from give going had has her him his how just know let live may of old once open over put round some stop take thank them then think walk were when always around because been before best both buy call cold does don\'t fast first five found gave goes green its made many off or pull read right sing sit sleep tell their these those upon us use very wash which why wish work would write your about better bring carry clean cut done draw drink eight fall far full got grow hold hot hurt if keep kind laugh light long much myself never only own pick seven shall show six small start ten today together try warm'.split(' ');
const HEART = 'the a of to was said you they are were what where who one two could would should there their does done come some have give live love do put pull your many any again friend school because eye once laugh through though says been buy whose great four only'.split(' ');
const HF1S = new Set(HF1), HF2S = new Set(HF2), HEARTS = new Set(HEART);
const OW_LONG = new Set('snow grow show blow low slow bow glow row flow throw own bowl know crow tow mow shown grown slower window yellow pillow follow'.split(' '));
const SOFT_EXC = new Set('get gets give gift girl gill gig gecko geese gear begin forget target tiger together'.split(' '));

const lc = w => String(w).toLowerCase().replace(/[^a-z']/g, '');
const VOW = /[aeiouy]/;
function syllables(word){
  let w = lc(word).replace(/'/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
// strip one common suffix; returns { base, suffix }
function splitSuffix(w){
  const rules = [['ing',3],['ed',2],['es',2],['s',1]];
  for (const [suf] of rules){
    if (w.length > suf.length + 2 && w.endsWith(suf)){
      let base = w.slice(0, -suf.length);
      if (suf === 's' && /(ss|us|is)$/.test(w)) continue;
      if (suf === 's') return { base, suffix:null, plural:true };   // plain -s is taught with CVC words; not a separate pattern
      if (/([bdgmnprt])\1$/.test(base) && suf !== 's') base = base.slice(0, -1);   // running → run
      return { base, suffix:suf };
    }
  }
  return { base:w, suffix:null };
}
// the deterministic phonics classifier: which patterns does a word use?
function patterns(word){
  const w = lc(word).replace(/'/g, '');
  const out = new Set();
  if (!w) return out;
  const { base, suffix } = splitSuffix(w);
  if (suffix) out.add('suffix');
  const syl = syllables(w);
  if (syl >= 3) out.add('multi'); else if (syllables(base) >= 2) out.add('two_syl');
  const b = base;
  if (/(tion|sion|ture|dge|^kn|^wr|^gn|mb$|ph)/.test(b) || (/c[eiy]/.test(b)) || (/g[eiy]/.test(b) && !SOFT_EXC.has(b))) out.add('advanced');
  if (/(ar|or|er|ir|ur)/.test(b) && !/(ar|or|er|ir|ur)[aeiou]/.test(b)) out.add('r_ctrl');
  if (/(oi|oy|ou)/.test(b) || (/ow/.test(b) && !OW_LONG.has(b) && !OW_LONG.has(w))) out.add('diphthong');
  if (/(ai|ay|ee|ea|oa|oe|ie|igh|ue|ew|oo)/.test(b) || (/ow/.test(b) && (OW_LONG.has(b) || OW_LONG.has(w)))) out.add('vowel_team');
  if (/[aeiou][^aeiouwxy]e$/.test(b) && !/[aeiou]{2}[^aeiou]e$/.test(b)) out.add('silent_e');
  if (/(sh|ch|th|wh|ck|ng|tch)/.test(b)) out.add('digraph');
  if (/^(spr|str|scr|spl|bl|cl|fl|gl|pl|sl|br|cr|dr|fr|gr|pr|tr|sc|sk|sm|sn|sp|st|sw|tw)/.test(b) || /(st|sk|sp|nd|nt|nk|mp|lt|ld|lf|lk|ft|pt)$/.test(b)) out.add('blend');
  // short vowels: closed single-vowel syllables with nothing fancier
  if (syl === 1 && !out.has('vowel_team') && !out.has('silent_e') && !out.has('r_ctrl') && !out.has('diphthong')){
    const v = b.match(/[aeiou]/g);
    if (v && v.length === 1 && /[^aeiou]$/.test(b)){
      out.add('short_' + v[0]);
      if (/^[^aeiou][aeiou][^aeiouwxy]$/.test(b) || /^[aeiou][^aeiou]$/.test(b)) out.add('cvc');
    }
  }
  return out;
}
// phoneme count for bank words (digraphs / vowel teams / silent e count as one sound)
function phonemes(word){
  let w = lc(word);
  w = w.replace(/([aeiou])([^aeiou])e$/, '$1$2');
  return w.replace(/tch|igh|sh|ch|th|wh|ck|ng|ph|ai|ay|ee|ea|oa|oo|ow|ou|oi|oy|ew|ue|ar|or|er|ir|ur|qu|x/g, 'X').replace(/(.)\1/g, '$1').length + (/x/.test(lc(word)) ? 1 : 0);
}

/* Word banks for activities and template stories (all original). [word, emoji, part-of-speech] */
const BANK = {
  short_a: [['cat','🐱','n'],['hat','🎩','n'],['bat','🦇','n'],['map','🗺️','n'],['bag','👜','n'],['jam','🍓','n'],['van','🚐','n'],['pan','🍳','n'],['ram','🐏','n'],['can','🥫','n'],['fan','🪭','n'],['rat','🐀','n'],['sad','😢','a'],['tap','👆','v'],['nap','😴','v'],['ran','🏃','v']],
  short_i: [['pig','🐷','n'],['wig','💇','n'],['pin','📌','n'],['lid','🫙','n'],['fin','🦈','n'],['kid','🧒','n'],['bib','👶','n'],['six','6️⃣','n'],['zip','🤐','v'],['dig','⛏️','v'],['sit','🪑','v'],['hit','🥊','v'],['big','🐘','a']],
  short_o: [['dog','🐶','n'],['log','🪵','n'],['pot','🍲','n'],['fox','🦊','n'],['box','📦','n'],['mop','🧹','n'],['top','🔝','n'],['cot','🛏️','n'],['hop','🐇','v'],['jog','🏃','v'],['hot','🔥','a'],['rob','🦹','v']],
  short_u: [['bug','🐛','n'],['sun','☀️','n'],['cup','☕','n'],['bus','🚌','n'],['tub','🛁','n'],['pup','🐕','n'],['hut','🛖','n'],['nut','🥜','n'],['gum','🍬','n'],['mud','🟫','n'],['run','🏃','v'],['hug','🤗','v'],['dug','⛏️','v'],['fun','🎉','a']],
  short_e: [['bed','🛏️','n'],['hen','🐔','n'],['net','🥅','n'],['pen','🖊️','n'],['jet','✈️','n'],['web','🕸️','n'],['leg','🦵','n'],['ten','🔟','n'],['vet','🩺','n'],['wet','💦','a'],['red','🟥','a'],['get','🫴','v'],['beg','🐕','v']],
  digraph: [['ship','🚢','n'],['fish','🐟','n'],['shell','🐚','n'],['chip','🍟','n'],['chick','🐥','n'],['duck','🦆','n'],['sock','🧦','n'],['moth','🦋','n'],['bath','🛁','n'],['whale','🐋','n'],['ring','💍','n'],['king','👑','n'],['shop','🏪','n'],['rock','🪨','n'],['lunch','🥪','n'],['rich','💰','a'],['thick','📚','a'],['wish','🌠','v'],['chop','🪓','v'],['bash','💥','v']],
  blend: [['frog','🐸','n'],['crab','🦀','n'],['drum','🥁','n'],['flag','🚩','n'],['sled','🛷','n'],['star','⭐','n'],['nest','🪺','n'],['tent','⛺','n'],['hand','✋','n'],['plum','🍑','n'],['clock','🕰️','n'],['desk','🗄️','n'],['snack','🍿','n'],['stop','🛑','v'],['jump','🦘','v'],['swim','🏊','v'],['spin','🌀','v'],['grab','🫳','v'],['best','🥇','a'],['fast','💨','a']],
  silent_e: [['cake','🎂','n'],['kite','🪁','n'],['bike','🚲','n'],['home','🏠','n'],['rose','🌹','n'],['cube','🧊','n'],['lake','🏞️','n'],['bone','🦴','n'],['cave','🕳️','n'],['flame','🔥','n'],['snake','🐍','n'],['smile','😊','n'],['ride','🏇','v'],['bake','🧁','v'],['hide','🙈','v'],['cute','🥰','a'],['brave','🦁','a'],['huge','🐋','a']],
  vowel_team: [['rain','🌧️','n'],['tree','🌳','n'],['boat','⛵','n'],['snow','❄️','n'],['moon','🌙','n'],['night','🌃','n'],['train','🚆','n'],['seal','🦭','n'],['goat','🐐','n'],['bee','🐝','n'],['sail','⛵','n'],['road','🛣️','n'],['light','💡','n'],['spoon','🥄','n'],['play','🎮','v'],['float','🛟','v'],['dream','💭','v'],['green','🟩','a'],['bright','✨','a'],['new','🆕','a']],
  r_ctrl: [['car','🚗','n'],['star','⭐','n'],['fork','🍴','n'],['bird','🐦','n'],['shirt','👕','n'],['horse','🐴','n'],['corn','🌽','n'],['turtle','🐢','n'],['purse','👛','n'],['barn','🛖','n'],['storm','⛈️','n'],['germ','🦠','n'],['shark','🦈','n'],['burn','🔥','v'],['turn','🔄','v'],['dark','🌑','a'],['short','📏','a']],
  diphthong: [['coin','🪙','n'],['boy','👦','n'],['cloud','☁️','n'],['cow','🐄','n'],['owl','🦉','n'],['house','🏠','n'],['mouth','👄','n'],['toy','🧸','n'],['crown','👑','n'],['mouse','🐭','n'],['soil','🟫','n'],['oil','🛢️','n'],['shout','📢','v'],['bounce','🏀','v'],['loud','🔊','a'],['brown','🟤','a']],
  advanced: [['city','🏙️','n'],['gem','💎','n'],['knee','🦵','n'],['knight','🛡️','n'],['bridge','🌉','n'],['badge','📛','n'],['phone','📱','n'],['picture','🖼️','n'],['nature','🌿','n'],['giant','🗿','n'],['wrist','⌚','n'],['lamb','🐑','n'],['circle','⭕','n'],['write','✍️','v'],['knock','🚪','v'],['gentle','🕊️','a']],
  two_syl: [['rabbit','🐇','n'],['sunset','🌅','n'],['napkin','🧻','n'],['basket','🧺','n'],['robot','🤖','n'],['pumpkin','🎃','n'],['dragon','🐉','n'],['magnet','🧲','n'],['picnic','🧺','n'],['kitten','🐈','n'],['muffin','🧁','n'],['rocket','🚀','n'],['candle','🕯️','n'],['zipper','🤐','n'],['tiger','🐯','n']],
  multi: [['butterfly','🦋','n'],['banana','🍌','n'],['elephant','🐘','n'],['dinosaur','🦕','n'],['computer','💻','n'],['octopus','🐙','n'],['umbrella','☂️','n'],['volcano','🌋','n'],['kangaroo','🦘','n'],['adventure','🗺️','n'],['fantastic','🤩','a'],['remember','🧠','v']],
  suffix: [['jumps','🦘','v'],['jumped','🦘','v'],['jumping','🦘','v'],['wished','🌠','v'],['running','🏃','v'],['hopped','🐇','v'],['fishes','🐟','v'],['helped','🤝','v'],['sitting','🪑','v'],['dishes','🍽️','n'],['foxes','🦊','n'],['kicked','⚽','v']]
};
BANK.cvc = ['short_a','short_i','short_o','short_u','short_e'].flatMap(k => BANK[k]);
const EMOJI = {}; Object.values(BANK).forEach(list => list.forEach(([w, e]) => { EMOJI[w] = e; }));

const VOCAB = [ // word, meaning, synonym, antonym, band
  ['brave','not scared when things are hard','bold','scared',2], ['huge','very, very big','giant','tiny',2], ['quick','fast','speedy','slow',2],
  ['glad','happy','pleased','sad',2], ['shout','say very loudly','yell','whisper',2], ['soggy','very wet and soft','damp','dry',3],
  ['gleam','shine brightly','glow','dim',3], ['tumble','fall and roll over','topple','rise',3], ['grumpy','in a bad mood','cranky','cheerful',3],
  ['ancient','very, very old','old','new',4], ['gather','bring together','collect','scatter',4], ['peer','look closely','stare','ignore',4],
  ['fierce','wild and strong','ferocious','gentle',4], ['journey','a long trip','trip','stay',4], ['curious','wanting to know','nosy','bored',4],
  ['enormous','extremely big','gigantic','miniature',5], ['exhausted','very, very tired','worn out','rested',5], ['reluctant','not wanting to','unwilling','eager',5],
  ['vanish','disappear suddenly','disappear','appear',5], ['cautious','careful about danger','careful','reckless',5], ['triumph','a big win','victory','defeat',6],
  ['perilous','full of danger','dangerous','safe',6], ['determined','not giving up','firm','unsure',6], ['loyal','always on your side','faithful','disloyal',6]
];
const MULTI_MEANING = [
  ['bat',[['The bat flew out of the cave at night.','a flying animal'],['Mia swung the bat and hit the ball.','a stick for hitting a ball']]],
  ['bark',[['The dog will bark at the mail truck.','the sound a dog makes'],['The tree bark felt rough.','the outside of a tree']]],
  ['ring',[['She wore a gold ring.','jewelry for a finger'],['Did you hear the bell ring?','to make a bell sound']]],
  ['light',[['Turn on the light.','something that lets you see'],['The feather was light.','not heavy']]],
  ['fly',[['A fly buzzed by my ear.','a small insect'],['Birds fly south.','move through the air']]],
  ['rock',[['He sat on a big rock.','a stone'],['Mom will rock the baby.','move gently back and forth']]]
];
const PREFIX_SUFFIX = [['un','not','unhappy','not happy'],['re','again','redo','do again'],['-ful','full of','helpful','full of help'],['-less','without','fearless','without fear'],['pre','before','preview','see before'],['-er','one who','builder','one who builds']];

/* ======================= 4. TEXT ANALYSIS + COMPREHENSION TAGGING ======================= */
function sentences(text){ return String(text).replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || []; }
function tokens(text){ return (String(text).match(/[A-Za-z][A-Za-z']*/g) || []); }
function fkGrade(text){
  const sn = Math.max(1, sentences(text).length), ws = tokens(text), wn = Math.max(1, ws.length);
  const syl = ws.reduce((t, w) => t + syllables(w), 0);
  return Math.round((0.39 * wn / sn + 11.8 * syl / wn - 15.59) * 10) / 10;
}
// names = capitalized words that are not sentence-initial anywhere they appear lowercase
function properNames(text){
  const names = new Set(), lower = new Set(tokens(text).filter(w => /^[a-z]/.test(w)).map(lc));
  sentences(text).forEach(s => tokens(s).forEach((w, i) => { if (i > 0 && /^[A-Z]/.test(w) && !lower.has(lc(w)) && w !== 'I') names.add(lc(w)); }));
  return names;
}
// question → comprehension skill (deterministic keyword rules, checked in order)
const Q_RULES = [
  ['comp.purpose',     /\b(why did the author|author write|author's purpose|purpose of)\b/i],
  ['comp.pov',         /\b(who is telling|point of view|narrator|told by)\b/i],
  ['comp.fact_opinion',/\b(fact or (an )?opinion|is an opinion|is a fact|which .* opinion\b|which .* is a fact)/i],
  ['comp.compare',     /\b(alike|different|differ|same as|compare|both)\b/i],
  ['comp.main_idea',   /\b(mostly about|main idea|best title|lesson|moral|big idea)\b/i],
  ['comp.summary',     /\b(summar|sum up)\b/i],
  ['comp.predict',     /\b(will happen|happen next|predict|might .* next|probably do next)\b/i],
  ['comp.sequence',    /\b(first|next|last|after|before|then|finally|order|at the end|at the start|in the beginning)\b/i],
  ['comp.infer',       /\bmean by\b/i],
  ['voc.meaning',      /\b(what does .* mean|word .* means|meaning of|another word for)\b/i],
  ['comp.character',   /\b(how did .* feel|how does .* feel|feel when|felt|why did .* (want|decide|choose|try|hide|run|cry|smile|laugh|hang|say)|kind of (person|dragon|friend)|describe)\b/i],
  ['comp.infer',       /\b(how do you know|how could you tell|probably|most likely|what can you tell|what clue (tells|shows)|guess|what does .* mean by)\b/i],
  ['comp.cause',       /\b(why|because|what made|what caused|so that|what happened when)\b/i],
  ['comp.details',     /\b(which|what did .* (bring|pack|use|carry|need)|how many|what color|what kind)\b/i],
  ['comp.literal',     /\b(who|what|where|when|whose)\b/i]
];
function tagQuestion(q){ for (const [id, re] of Q_RULES) if (re.test(q)) return id; return 'comp.literal'; }

/* ======================= 5. LEARNER MODEL ======================= */
const DAY = 86400000;
const dayKey = t => new Date(t).toISOString().slice(0, 10);
function newProfile(){ return { v:2, ev:[], sum:{}, m:{}, placed:{}, series:{}, created:Date.now() }; }
function ensure(lm){ if (!lm || lm.v !== 2) lm = newProfile(); lm.ev = lm.ev || []; lm.sum = lm.sum || {}; lm.m = lm.m || {}; lm.placed = lm.placed || {}; lm.series = lm.series || {}; return lm; }
/* record one piece of evidence.
   e = { s: skill id, k: correct, n: scored, ind: true if no help was given, c: confidence 0..1, src, sid: session id, t, note }
   Assisted (ind=false) and low-confidence events are stored and shown to parents, but never count toward mastery. */
function record(lm, e){
  if (!SKILL[e.s] || !(e.n > 0)) return null;
  const ev = { s:e.s, k:Math.max(0, Math.min(e.n, +e.k || 0)), n:+e.n, ind: e.ind === false ? 0 : 1, c: e.c == null ? 0.9 : Math.round(e.c * 100) / 100,
    src: e.src || 'activity', sid: e.sid || 'x', t: e.t || Date.now() };
  if (e.note) ev.note = String(e.note).slice(0, 60);
  lm.ev.push(ev);
  if (lm.ev.length > CONFIG.maxEvents) lm.ev.splice(0, lm.ev.length - CONFIG.maxEvents);
  const sm = lm.sum[e.s] = lm.sum[e.s] || { k:0, n:0, ik:0, in:0, ak:0, an:0, first:ev.t, last:ev.t, hints:0 };
  sm.k += ev.k; sm.n += ev.n; sm.last = ev.t;
  if (ev.ind){ sm.ik += ev.k; sm.in += ev.n; } else { sm.ak += ev.k; sm.an += ev.n; sm.hints++; }
  // daily accuracy series for the parent "history" sparkline
  const d = dayKey(ev.t), ser = lm.series[e.s] = lm.series[e.s] || [];
  const last = ser[ser.length - 1];
  if (last && last[0] === d){ last[1] += ev.ind ? ev.k : 0; last[2] += ev.ind ? ev.n : 0; } else ser.push([d, ev.ind ? ev.k : 0, ev.ind ? ev.n : 0]);
  if (ser.length > 40) ser.shift();
  return ev;
}
function counted(lm, id){ return lm.ev.filter(e => e.s === id && e.ind && e.c >= CONFIG.minConfidence); }
function recentWindow(evs){ const out = []; let n = 0; for (let i = evs.length - 1; i >= 0 && n < CONFIG.window; i--){ out.push(evs[i]); n += evs[i].n; } return out; }
/* State for one skill. Pure function of the evidence log + time. */
function skillState(lm, id, now){
  now = now || Date.now();
  const sk = SKILL[id], crit = sk.crit, all = lm.ev.filter(e => e.s === id), placedM = lm.placed[id] === 'mastered' && !lm.m[id];
  // an inferred (placement) mastery stands until real lesson evidence arrives; then normal rules take over
  const good = counted(lm, id).filter(e => !(placedM && e.src === 'placement'));
  const base = { id, acc:null, n:0, sessions:0, days:0, assisted: all.filter(e => !e.ind).reduce((t, e) => t + e.n, 0), lowConf: all.filter(e => e.ind && e.c < CONFIG.minConfidence).length, last: all.length ? all[all.length - 1].t : null };
  if (!good.length){
    if (placedM) return Object.assign(base, { state:'mastered', inferred:true, why:'Inferred from the placement check (a harder skill was passed). Will be confirmed during lessons.' });
    if (all.some(e => !e.ind)) return Object.assign(base, { state:'emerging', why:'Only practiced with help so far, so independent skill is unknown.' });
    return Object.assign(base, { state:'na', why:'Not assessed yet.' });
  }
  // placement-inferred mastery: a single slip doesn't overturn it; 4+ lesson items decide (confirm or demote)
  if (placedM){
    const gn = good.reduce((t, e) => t + e.n, 0), gk = good.reduce((t, e) => t + e.k, 0);
    if (gn < 4) return Object.assign(base, { state:'mastered', inferred:true, acc:gk / gn, n:gn, why:`Inferred from placement; confirming (${gk}/${gn} so far).` });
    if (gk / gn >= crit.acc) return Object.assign(base, { state:'mastered', fresh:true, acc:gk / gn, n:gn, why:`Placement result confirmed in lessons: ${gk}/${gn}.` });
  }
  const win = recentWindow(good), k = win.reduce((t, e) => t + e.k, 0), n = win.reduce((t, e) => t + e.n, 0);
  const sessions = new Set(good.map(e => e.sid)).size, days = new Set(good.map(e => dayKey(e.t))).size;
  const acc = n ? k / n : 0;
  Object.assign(base, { acc, n, sessions, days, total: good.reduce((t, e) => t + e.n, 0) });
  const mem = lm.m[id];
  if (mem){
    // slipped? look at the last two sessions of independent evidence
    const sids = [...new Set(good.map(e => e.sid))].slice(-2), lastTwo = good.filter(e => sids.includes(e.sid) && e.t > mem.at);
    const lk = lastTwo.reduce((t, e) => t + e.k, 0), ln = lastTwo.reduce((t, e) => t + e.n, 0);
    if (ln >= 4 && lk / ln < crit.acc - CONFIG.slipDrop) return Object.assign(base, { state:'review', why:`Was mastered, but the last ${sids.length} session${sids.length > 1 ? 's' : ''} were ${Math.round(lk / ln * 100)}%.` });
    const due = mem.at2 + CONFIG.reviewDays[Math.min(mem.box, CONFIG.reviewDays.length - 1)] * DAY;
    return Object.assign(base, { state:'mastered', reviewDue: due, why:`${Math.round(acc * 100)}% on the last ${n} items across ${sessions} sessions and ${days} days.` });
  }
  const totalN = good.reduce((t, e) => t + e.n, 0);
  if (acc >= crit.acc && totalN >= crit.n && sessions >= CONFIG.minSessions && days >= CONFIG.minDays) return Object.assign(base, { state:'mastered', fresh:true, why:`${Math.round(acc * 100)}% across ${sessions} sessions and ${days} days.` });
  const need = [];
  if (totalN < crit.n) need.push(`${crit.n - totalN} more item${crit.n - totalN > 1 ? 's' : ''}`);
  if (sessions < CONFIG.minSessions) need.push('another session');
  if (days < CONFIG.minDays) need.push('practice on another day');
  if (acc < crit.acc) need.push(`accuracy ${Math.round(crit.acc * 100)}%+ (now ${Math.round(acc * 100)}%)`);
  const state = acc >= CONFIG.tiers.emerging ? 'developing' : 'emerging';
  return Object.assign(base, { state, approaching: acc >= CONFIG.tiers.developing, why:`${Math.round(acc * 100)}% so far. Needs ${need.join(', ')}.` });
}
// after new evidence: lock in fresh masteries, advance spaced-review boxes. Returns ids newly mastered.
function commit(lm, now){
  now = now || Date.now(); const newly = [];
  SKILLS.forEach(s => {
    const st = skillState(lm, s.id, now);
    if (st.fresh){ lm.m[s.id] = { at:now, at2:now, box:0 }; newly.push(s.id); }
    else if (st.state === 'mastered' && lm.m[s.id] && st.last && st.last > lm.m[s.id].at2 + DAY / 2 && st.last >= (lm.m[s.id].at2 + CONFIG.reviewDays[Math.min(lm.m[s.id].box, 4)] * DAY) - DAY){
      lm.m[s.id].box = Math.min(lm.m[s.id].box + 1, CONFIG.reviewDays.length - 1); lm.m[s.id].at2 = st.last;  // passed a spaced review
    } else if (st.state === 'review' && lm.m[s.id]) lm.m[s.id].box = 0;
  });
  return newly;
}
function allStates(lm, now){ return Object.fromEntries(SKILLS.map(s => [s.id, skillState(lm, s.id, now)])); }
const isM = st => st && st.state === 'mastered';
function masteredSet(lm, now){ const st = allStates(lm, now); return new Set(Object.keys(st).filter(id => isM(st[id]))); }
// the child's working band: highest band whose code skills are (almost) all mastered, +1
function currentBand(lm, now){
  const st = allStates(lm, now);
  let band = 1;
  for (let b = 1; b <= 6; b++){
    const code = SKILLS.filter(s => s.band === b && ['ph','dec','pa','sw'].includes(s.domain));
    const ok = code.filter(s => isM(st[s.id])).length;
    if (code.length && ok / code.length >= 0.75) band = Math.min(6, b + 1); else break;
  }
  return band;
}

/* ======================= 6. DECODABILITY + STORY VALIDATION ======================= */
// can this learner decode this word? (known = mastered skills, target counts as taught)
function wordStatus(word, known, names){
  const w = lc(word).replace(/'/g, '');
  if (!w) return { ok:true, why:'' };
  if (names && names.has(w)) return { ok:true, why:'name' };
  if (HEARTS.has(w)) return { ok: known.has('sw.irregular') || known.has('dec.irregular') || known.has('sw.hf1') && HF1S.has(w), why:'heart', heart:true };
  if (HF1S.has(w) && known.has('sw.hf1')) return { ok:true, why:'hf1' };
  if (HF2S.has(w) && known.has('sw.hf2')) return { ok:true, why:'hf2' };
  const pats = patterns(w);
  if (!pats.size) return { ok: w.length <= 2 ? known.has('ph.sounds') : false, why:'unclassified', pats:[] };
  const need = [...pats].filter(p => p !== 'cvc' || !pats.has('short_' + (w.match(/[aeiou]/) || [''])[0])).map(p => PATTERN_SKILL[p]).filter(Boolean);
  const missing = need.filter(id => !known.has(id));
  return { ok: !missing.length, why: missing.length ? 'needs ' + missing.join(', ') : 'decodable', pats:[...pats], missing };
}
/* constraints come from planLesson(); the defaults describe "anything a child at this band should handle" */
function bandConstraints(band){
  return [null,
    { band:1, words:[15, 60],  avgSent:6,  maxSent:9,  decodable:0.85, minTarget:4, maxNew:1, longPct:0.00, heart:3, rep:0.18, punct:/[;:()—–]/ },
    { band:2, words:[25, 90],  avgSent:7,  maxSent:11, decodable:0.85, minTarget:5, maxNew:2, longPct:0.02, heart:5, rep:0.16, punct:/[;:()—–]/ },
    { band:3, words:[40, 160], avgSent:9,  maxSent:14, decodable:0.80, minTarget:5, maxNew:2, longPct:0.05, heart:8, rep:0.12, punct:/[;()—–]/ },
    { band:4, words:[60, 260], avgSent:10, maxSent:17, decodable:0.75, minTarget:4, maxNew:3, longPct:0.08, heart:12, rep:0.10, punct:/[;()]/ },
    { band:5, words:[90, 420], avgSent:12, maxSent:20, decodable:0.70, minTarget:3, maxNew:4, longPct:0.12, heart:99, rep:0.09, punct:/[;]/ },
    { band:6, words:[120, 700],avgSent:14, maxSent:25, decodable:0.60, minTarget:3, maxNew:5, longPct:0.18, heart:99, rep:0.09, punct:null }][Math.max(1, Math.min(6, band))];
}
/* Deterministic validation. story = { title, text, qs:[[q, opts, ans, skill?]] }
   opts = { known:Set of mastered skill ids (plus target), target: skill id, band, constraints } */
function validateStory(story, opts){
  const text = story.text || '', band = opts.band || 3, C = Object.assign({}, bandConstraints(band), opts.constraints || {});
  const known = new Set(opts.known || []); if (opts.target) known.add(opts.target);
  const names = properNames(text), toks = tokens(text), sents = sentences(text);
  const words = toks.map(lc);
  const stat = toks.map(w => wordStatus(w, known, names));
  const dec = stat.filter(s => s.ok).length / Math.max(1, toks.length);
  const lens = sents.map(s => tokens(s).length), avg = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length), max = Math.max(0, ...lens);
  const tSkill = opts.target && SKILL[opts.target], tPat = tSkill && tSkill.pat;
  const tWords = tPat ? words.filter(w => patterns(w).has(tPat)) : [];
  const offPattern = [...new Set(toks.filter((w, i) => !stat[i].ok && !stat[i].heart).map(lc))];
  const heartUsed = [...new Set(words.filter(w => HEARTS.has(w)))], heartUntaught = heartUsed.filter(w => !(known.has('sw.irregular') || known.has('dec.irregular')) && !(known.has('sw.hf1') && HF1S.has(w)));
  const longPct = words.filter(w => syllables(w) >= 3).length / Math.max(1, words.length);
  const vocabWords = new Set(VOCAB.map(v => v[0]));
  const newVocab = [...new Set(words.filter(w => !HF1S.has(w) && !HF2S.has(w) && !names.has(w) && (vocabWords.has(w) || syllables(w) >= 3 || w.length >= 9)))];
  const counts = {}; words.filter(w => !HF1S.has(w) && !HF2S.has(w) && !names.has(w) && w.length > 2).forEach(w => counts[w] = (counts[w] || 0) + 1);
  const topRep = Math.max(0, ...Object.values(counts)) / Math.max(1, words.length);
  const dupSents = sents.length - new Set(sents.map(s => s.toLowerCase())).size;
  const ttr = new Set(words).size / Math.max(1, words.length);
  const nameMentions = [...names].map(n => words.filter(w => w === n).length);
  const nounRecur = Object.entries(counts).filter(([w, c]) => c >= 2).length;
  const qs = story.qs || [], qTags = qs.map(q => q[3] || tagQuestion(q[0]));
  const qOk = qs.filter(q => Array.isArray(q[1]) && q[1].length >= 3 && q[2] >= 0 && q[2] < q[1].length).length;
  const fk = fkGrade(text);
  const check = (id, label, pass, value, limit, fix) => ({ id, label, pass: !!pass, value, limit, fix });
  const checks = [
    check('length', 'Story length', toks.length >= C.words[0] && toks.length <= C.words[1], toks.length + ' words', C.words[0] + '–' + C.words[1], toks.length < C.words[0] ? 'Add more story.' : 'Shorten the story.'),
    check('decodable', 'Decodability for this reader', dec >= C.decodable, Math.round(dec * 100) + '%', '≥ ' + Math.round(C.decodable * 100) + '%', 'Replace these words with ones using taught patterns: ' + offPattern.slice(0, 8).join(', ')),
    check('target', 'Target pattern practice', !tPat || tWords.length >= C.minTarget, tPat ? tWords.length + ' (' + [...new Set(tWords)].slice(0, 6).join(', ') + ')' : 'n/a', tPat ? '≥ ' + C.minTarget : 'n/a', 'Use more ' + (tSkill ? tSkill.kid : '') + ' words.'),
    check('offpattern', 'Untaught spelling patterns', offPattern.length <= Math.max(2, Math.round(toks.length * (1 - C.decodable))), offPattern.length + ' words', '≤ ' + Math.max(2, Math.round(toks.length * (1 - C.decodable))), 'Swap out: ' + offPattern.slice(0, 8).join(', ')),
    check('sentences', 'Sentence length', avg <= C.avgSent && max <= C.maxSent, 'avg ' + avg.toFixed(1) + ', max ' + max, 'avg ≤ ' + C.avgSent + ', max ≤ ' + C.maxSent, 'Split long sentences.'),
    check('syllables', 'Syllable complexity', longPct <= C.longPct + 0.001, Math.round(longPct * 100) + '% 3+ syllable', '≤ ' + Math.round(C.longPct * 100) + '%', 'Use shorter words.'),
    check('irregular', 'Irregular (heart) words', heartUntaught.length <= C.heart, heartUntaught.length + (heartUntaught.length ? ' (' + heartUntaught.slice(0, 6).join(', ') + ')' : ''), '≤ ' + C.heart, 'Remove some heart words not taught yet.'),
    check('vocab', 'New vocabulary', newVocab.length <= C.maxNew, newVocab.length + (newVocab.length ? ' (' + newVocab.slice(0, 6).join(', ') + ')' : ''), '≤ ' + C.maxNew, 'Keep only ' + C.maxNew + ' new words and teach them.'),
    check('punct', 'Punctuation', !C.punct || !C.punct.test(text), C.punct && C.punct.test(text) ? 'has ; : ( ) or dashes' : 'simple', 'simple', 'Use periods, commas, ! and ? only.'),
    check('repetition', 'Not too repetitive', topRep <= C.rep && dupSents <= 1 && ttr >= 0.28, 'top word ' + Math.round(topRep * 100) + '%, repeated sentences ' + dupSents + ', variety ' + Math.round(ttr * 100) + '%', 'top ≤ ' + Math.round(C.rep * 100) + '%, repeats ≤ 1, variety ≥ 28%', 'Vary the words and sentences.'),
    check('coherence', 'Coherence (deterministic proxy)', sents.length >= 3 && (nameMentions.some(c => c >= 2) || nounRecur >= 2), sents.length + ' sentences, ' + (nameMentions.length ? 'main name ×' + Math.max(...nameMentions) : nounRecur + ' recurring words'), '≥3 sentences + a recurring character', 'Keep one main character through the whole story.'),
    check('questions', 'Comprehension questions', qOk >= 4 && new Set(qTags).size >= 2, qOk + ' valid, ' + new Set(qTags).size + ' skill types', '≥ 4 valid, ≥ 2 types', 'Write 4–5 questions with 3–4 choices covering different skills.'),
    check('level', 'Reading level', fk <= [0, 1.2, 2.0, 2.8, 3.6, 4.6, 6.0][band] + 0.001, 'FK grade ' + fk, '≤ ' + [0, 1.2, 2.0, 2.8, 3.6, 4.6, 6.0][band], 'Use shorter sentences and words.')
  ];
  const failed = checks.filter(c => !c.pass);
  return { pass: !failed.length, checks, failed, stats:{ words:toks.length, sentences:sents.length, decodability:dec, fk, targetWords:[...new Set(tWords)], offPattern, newVocab, names:[...names], qTags } };
}
// library tagging: what band is this text, and which patterns does it practice?
function analyzeText(text){
  const toks = tokens(text).map(lc), names = properNames(text), pc = {};
  toks.forEach(w => patterns(w).forEach(p => pc[p] = (pc[p] || 0) + 1));
  let band = 6;
  for (let b = 1; b <= 6; b++){
    const known = new Set(SKILLS.filter(s => s.band <= b).map(s => s.id));
    const dec = toks.filter(w => wordStatus(w, known, names).ok).length / Math.max(1, toks.length);
    if (dec >= bandConstraints(b).decodable + 0.05){ band = b; break; }
  }
  const fk = fkGrade(text), fkBand = fk < 1 ? 2 : fk < 2 ? 3 : fk < 3 ? 4 : fk < 4.2 ? 5 : 6;
  band = Math.max(band, fkBand - 1);
  const top = Object.entries(pc).filter(([p]) => PATTERN_SKILL[p]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p, c]) => ({ skill:PATTERN_SKILL[p], count:c }));
  return { band, fk, words:toks.length, patterns:top };
}

/* ======================= 7. ACTIVITIES (generated from the target skill, never random games) ======================= */
let SEED = 1;
function rng(){ SEED = (SEED * 16807) % 2147483647; return (SEED - 1) / 2147483646; }
function seed(n){ SEED = (Math.abs(n | 0) % 2147483646) + 1; }
const pick = a => a[Math.floor(rng() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
function opts(right, wrongs, n){ const o = shuffle([right, ...sample(wrongs.filter(w => w !== right), (n || 3) - 1)]); return { options:o, answer:o.indexOf(right) }; }
const firstSound = w => { const m = lc(w).match(/^(sh|ch|th|wh|kn|wr|ph|.)/); return m ? m[1] : ''; };
const SOUND_SAY = { s:'sss', m:'mmm', f:'fff', l:'lll', n:'nnn', r:'rrr', z:'zzz', v:'vvv', sh:'shh', th:'thh', a:'ah', e:'eh', i:'ih', o:'aw', u:'uh' };
const sayable = s => SOUND_SAY[s] || s;

/* each item: { type, skill, prompt, say (TTS text), show (big text), pic, options, answer, explain } */
const GEN = {
  'pa.begin'(){ const pool = BANK.cvc.concat(BANK.blend.slice(0, 10)); const t = pick(pool); const s = firstSound(t[0]);
    const wrong = pool.filter(x => firstSound(x[0]) !== s); const o = opts(t, sample(wrong, 6), 3);
    return { type:'pick', prompt:'Which one starts with the sound /' + s + '/?', say:'Which one starts with ' + sayable(s) + '?', options:o.options.map(x => ({ t:x[1], say:x[0], label:x[0] })), answer:o.answer, explain:t[0] + ' starts with /' + s + '/.' }; },
  'pa.end'(){ const pool = BANK.cvc; const t = pick(pool); const e = t[0].slice(-1);
    const o = opts(t, sample(pool.filter(x => x[0].slice(-1) !== e), 6), 3);
    return { type:'pick', prompt:'Which one ends with /' + e + '/?', say:'Which one ends with ' + sayable(e) + '?', options:o.options.map(x => ({ t:x[1], say:x[0], label:x[0] })), answer:o.answer, explain:t[0] + ' ends with /' + e + '/.' }; },
  'pa.blend'(){ const pool = BANK.cvc; const t = pick(pool); const o = opts(t, sample(pool, 6), 3);
    return { type:'pick', prompt:'Listen to the sounds. Which word is it?', say: t[0].split('').map(sayable).join('... ') + '.', options:o.options.map(x => ({ t:x[1], say:x[0], label:x[0] })), answer:o.answer, explain:t[0].split('').join('-') + ' makes ' + t[0] + '.' }; },
  'pa.segment'(){ const pool = BANK.cvc.concat(BANK.digraph, BANK.blend); const t = pick(pool); const n = phonemes(t[0]);
    const o = opts(String(n), ['2','3','4','5'], 3);
    return { type:'pick', prompt:'How many sounds do you hear in “' + t[0] + '”?', say:'How many sounds in ' + t[0] + '?', pic:t[1], options:o.options.map(x => ({ t:x })), answer:o.answer, explain:t[0] + ' has ' + n + ' sounds.' }; },
  'pa.manip'(){ const pool = BANK.cvc.map(x => x[0]); let a, b;
    for (let i = 0; i < 40 && !b; i++){ a = pick(pool); const cands = pool.filter(w => w !== a && w.slice(1) === a.slice(1)); if (cands.length) b = pick(cands); }
    if (!b){ a = 'cat'; b = 'hat'; }
    const o = opts(b, pool.filter(w => w.slice(1) === a.slice(1) || w[0] === b[0]), 3);
    return { type:'pick', prompt:`Say “${a}”. Change /${a[0]}/ to /${b[0]}/. What word do you get?`, say:`Say ${a}. Change ${sayable(a[0])} to ${sayable(b[0])}. What word?`, options:o.options.map(x => ({ t:(EMOJI[x] || '') + ' ' + x, say:x })), answer:o.answer, explain:a + ' → ' + b }; },
  'ph.letters'(){ const L = 'abcdefghijklmnopqrstuvwxyz'.split(''), t = pick(L), confuse = { b:'dpq', d:'bpq', p:'bdq', q:'bdp', m:'nw', n:'mu', u:'nv', w:'mv' };
    const o = opts(t, (confuse[t] || '').split('').concat(sample(L, 4)), 4);
    return { type:'pick', prompt:'Find the letter ' + t.toUpperCase() + ' (' + t + ').', say:'Find the letter ' + t, options:o.options.map(x => ({ t:x, big:true })), answer:o.answer, explain:'That is ' + t + '.' }; },
  'ph.sounds'(){ const t = pick(BANK.cvc); const s = t[0][0]; const o = opts(s, sample('bcdfghjklmnprstvwz'.split(''), 6), 4);
    return { type:'pick', prompt:'Which letter makes the first sound in ' + t[0] + '?', say:'Which letter makes the first sound in ' + t[0] + '?', pic:t[1], options:o.options.map(x => ({ t:x, big:true })), answer:o.answer, explain:t[0] + ' starts with ' + s + '.' }; },
  'dec.irregular'(){ return GEN['sw.irregular'](); },
  'sw.hf1'(){ const t = pick(HF1.filter(w => w.length > 1)); const o = opts(t, HF1.filter(w => w[0] === t[0] || w.length === t.length), 4);
    return { type:'hear', prompt:'Tap the word you hear.', say:t, options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'“' + t + '”' }; },
  'sw.hf2'(){ const t = pick(HF2); const o = opts(t, HF2.filter(w => w[0] === t[0] || Math.abs(w.length - t.length) < 1), 4);
    return { type:'hear', prompt:'Tap the word you hear.', say:t, options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'“' + t + '”' }; },
  'sw.irregular'(){ const t = pick(HEART.filter(w => w.length > 1)); const o = opts(t, HEART.concat(HF1).filter(w => w[0] === t[0] || w.length === t.length), 4);
    return { type:'hear', prompt:'❤️ Heart word! Tap the word you hear.', say:t, options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'“' + t + '” is a heart word: part of it breaks the rules, so we learn it by heart.' }; },
  'voc.meaning'(band){ const pool = VOCAB.filter(v => v[4] <= Math.max(2, band)), t = pick(pool); const o = opts(t[1], pool.map(v => v[1]), 3);
    return { type:'pick', prompt:'What does “' + t[0] + '” mean?', say:'What does ' + t[0] + ' mean?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain:t[0] + ' means ' + t[1] + '.' }; },
  'voc.synonyms'(band){ const pool = VOCAB.filter(v => v[4] <= Math.max(3, band)), t = pick(pool); const o = opts(t[2], pool.map(v => v[2]).concat(pool.map(v => v[3])), 3);
    return { type:'pick', prompt:'Which word means the SAME as “' + t[0] + '”?', say:'Which word means the same as ' + t[0] + '?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain:t[0] + ' and ' + t[2] + ' mean almost the same thing.' }; },
  'voc.antonyms'(band){ const pool = VOCAB.filter(v => v[4] <= Math.max(3, band)), t = pick(pool); const o = opts(t[3], pool.map(v => v[3]).concat(pool.map(v => v[2])), 3);
    return { type:'pick', prompt:'Which word is the OPPOSITE of “' + t[0] + '”?', say:'Which word is the opposite of ' + t[0] + '?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'The opposite of ' + t[0] + ' is ' + t[3] + '.' }; },
  'voc.context'(band){ const t = pick(VOCAB.filter(v => v[4] >= 3)); const frames = { soggy:'After the storm, my socks were soggy, so I put them by the fire to dry.', gleam:'The gold coins gleam in the sun, so bright I had to squint.', tumble:'The rocks began to tumble down the hill, rolling over and over.', grumpy:'Dad is grumpy before breakfast. He frowns and grumbles.', ancient:'The ancient castle was built a thousand years ago.', gather:'Let’s gather all the shells into one bucket.', peer:'I had to peer into the dark box to see what was inside.', fierce:'The fierce wolf growled and showed its sharp teeth.', journey:'The journey across the mountains took ten long days.', curious:'The curious kitten sniffed every box to see what was inside.', enormous:'The whale was enormous, bigger than our whole house!', exhausted:'After the long race, Sam was so exhausted he fell asleep.', reluctant:'Mia was reluctant to jump in. The water looked cold.', vanish:'The magician waved his hand and the coin seemed to vanish.', cautious:'Be cautious near the edge. One slip and you could fall.', triumph:'Winning the cup was a triumph for the whole team.', perilous:'The perilous bridge swayed over the deep canyon.', determined:'Leo was determined to finish, even when his legs hurt.', loyal:'My loyal dog stays by my side no matter what.' };
    const sent = frames[t[0]] || ('The word is ' + t[0] + '.'); const o = opts(t[1], VOCAB.map(v => v[1]), 3);
    return { type:'pick', prompt:sent.replace(new RegExp('\\b' + t[0] + '\\b'), '**' + t[0] + '**') + '\nWhat does “' + t[0] + '” mean?', say:sent + ' What does ' + t[0] + ' mean?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'The clues in the sentence show ' + t[0] + ' means ' + t[1] + '.' }; },
  'voc.multi'(){ const t = pick(MULTI_MEANING), use = pick(t[1]); const o = opts(use[1], t[1].map(x => x[1]).concat(['a kind of food']), 3);
    return { type:'pick', prompt:use[0] + '\nWhat does “' + t[0] + '” mean here?', say:use[0] + ' What does ' + t[0] + ' mean here?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'Here, ' + t[0] + ' means ' + use[1] + '.' }; },
  'voc.morph'(){ const t = pick(PREFIX_SUFFIX); const o = opts(t[3], PREFIX_SUFFIX.map(x => x[3]), 3);
    return { type:'pick', prompt:'“' + t[0] + '” means “' + t[1] + '”. What does “' + t[2] + '” mean?', say:t[0] + ' means ' + t[1] + '. What does ' + t[2] + ' mean?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain:t[2] + ' = ' + t[3] + '.' }; }
};
// shared generators for pattern skills: read a word → pick its picture (decoding); missing letter; which word has the pattern
function patternItem(skillId, kind){
  const sk = SKILL[skillId], bank = BANK[sk.pat] || BANK.cvc;
  const t = pick(bank);
  const others = Object.keys(BANK).filter(k => k !== sk.pat && k !== 'cvc').flatMap(k => BANK[k]).filter(x => !patterns(x[0]).has(sk.pat));
  if (kind === 'read'){
    // decoding: printed word, child reads it (mic optional), then picks the picture. Distractors share letters.
    const near = bank.filter(x => x[0] !== t[0] && (x[0][0] === t[0][0] || x[0].slice(-1) === t[0].slice(-1)));
    const o = opts(t, (near.length >= 2 ? near : bank).concat(sample(others, 2)), 3);
    return { type:'read', prompt:'Read the word. Then tap its picture.', show:t[0], options:o.options.map(x => ({ t:x[1], say:x[0] })), answer:o.answer, explain:'This word says “' + t[0] + '”.', word:t[0] };
  }
  if (kind === 'missing' && /^short_/.test(sk.pat || '')){
    const v = sk.pat.slice(-1), word = t[0], i = word.indexOf(v);
    const o = opts(v, ['a','e','i','o','u'], 3);
    return { type:'pick', prompt:'Which letter is missing?', show: word.slice(0, i) + '_' + word.slice(i + 1), pic:t[1], say:word, options:o.options.map(x => ({ t:x, big:true })), answer:o.answer, explain:'It is ' + word + '. The ' + v + ' says /' + sayable(v) + '/.' };
  }
  if (kind === 'missing'){
    const chunks = { digraph:['sh','ch','th','ck','ng','wh'], blend:['st','fr','cr','dr','fl','sl','nd','mp','nt','sw','sp','gr'], silent_e:['a_e','i_e','o_e','u_e'], vowel_team:['ai','ee','oa','oo','ay','igh','ea','ow','ew'], r_ctrl:['ar','or','ir','ur','er'], diphthong:['oi','oy','ou','ow'], advanced:['kn','wr','dge','ce','ge','ph','ture','mb'] }[sk.pat];
    if (chunks){
      const w = t[0];
      let ch = chunks.find(c => c.includes('_') ? new RegExp(c[0] + '[^aeiou]e$').test(w) : w.includes(c));
      if (ch){
        let shown;
        if (ch.includes('_')){ const m = w.match(new RegExp(ch[0] + '([^aeiou])e$')); shown = w.slice(0, m.index) + '_' + m[1] + '_'; }
        else { const i = w.indexOf(ch); shown = w.slice(0, i) + '__' + w.slice(i + ch.length); }
        const o = opts(ch, chunks, 3);
        return { type:'pick', prompt:'Which sound team finishes the word?', show:shown, pic:t[1], say:w, options:o.options.map(x => ({ t:x, big:true })), answer:o.answer, explain:'It is ' + w + '.' };
      }
    }
  }
  if (kind === 'which'){
    const o = opts(t[0], sample(others.map(x => x[0]), 6), 3);
    return { type:'pick', prompt:'Which word has the ' + sk.kid.toLowerCase() + ' pattern?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'“' + t[0] + '” has it. (' + sk.ex + ')' };
  }
  // sentence completion with decodable words
  const frame = pick(['I see a {w}.', 'The {w} is here.', 'Look at that {w}!', 'Can you find the {w}?', 'We have a {w}.']);
  const nouns = bank.filter(x => x[2] === 'n'), tt = nouns.length ? pick(nouns) : t;
  const o = opts(tt[0], nouns.map(x => x[0]).concat(bank.map(x => x[0])), 3);
  return { type:'pick', prompt:'Pick the word that fits.', show: frame.replace('{w}', '____'), pic:tt[1], options:o.options.map(x => ({ t:x })), answer:o.answer, explain: frame.replace('{w}', tt[0]) };
}

/* Comprehension mini-passages (original) for skills the story library rarely asks about.
   Audit of v1's 875 story questions: 50% literal recall, 18% "why", 1 prediction, 0 point-of-view, 0 fact/opinion. */
const COMP_BANK = {
  'comp.fact_opinion': [
    ['Dragons in this story have wings.', 'fact'], ['Dragons are the best pets ever.', 'opinion'], ['The sun is a star.', 'fact'], ['Rainy days are boring.', 'opinion'],
    ['A spider has eight legs.', 'fact'], ['Pizza is the yummiest food.', 'opinion'], ['Cats can see in dim light.', 'fact'], ['Blue is the prettiest color.', 'opinion'],
    ['Frogs lay eggs in water.', 'fact'], ['Soccer is more fun than tag.', 'opinion'], ['Ice melts when it gets warm.', 'fact'], ['Math is too hard.', 'opinion']],
  'comp.pov': [
    ['I grabbed my net and ran to the pond. My heart was racing!', 'the main character (I)', ['a narrator outside the story','the frog']],
    ['Mira grabbed her net and ran to the pond. Her heart was racing.', 'a narrator outside the story', ['Mira (I)','the pond']],
    ['We packed the wagon and waved goodbye to our street.', 'a character in the story (we)', ['a narrator outside the story','the wagon']],
    ['The dragon yawned. He did not know the knight was watching.', 'a narrator outside the story', ['the dragon (I)','the knight (I)']],
    ['My name is Pip, and I am the smallest mouse in the barn.', 'Pip, the main character', ['a narrator outside the story','the barn cat']],
    ['Jack looked at the map. Then he looked at his sister.', 'a narrator outside the story', ['Jack (I)','his sister (I)']]],
  'comp.main_idea': [
    ['Bees fly from flower to flower. They drink sweet nectar. They carry pollen that helps new plants grow.', 'How bees help plants', ['Flowers are red','Bees can sting']],
    ['Leo practiced his kicks every day. He ran laps after school. On Saturday, he scored the winning goal.', 'Practice helped Leo win', ['Leo likes Saturday','Running is hard']],
    ['Penguins cannot fly. But they are great swimmers. Their wings work like flippers in the cold sea.', 'Penguins are made for swimming', ['Penguins are birds that fly','The sea is cold']],
    ['Nia shared her snack. She helped Tom tie his shoe. She let Ava go first on the swing.', 'Nia is kind to others', ['Nia likes swings','Tom has shoes']],
    ['Volcanoes can be quiet for years. Then hot rock rises up. It bursts out as lava and ash.', 'How a volcano erupts', ['Rocks are heavy','Years are long']]],
  'comp.predict': [
    ['Dark clouds filled the sky. Sam heard thunder far away. He looked at his bike outside.', 'Sam will put his bike away', ['Sam will go swimming','The sun will come out']],
    ['The puppy saw the open gate. Its tail wagged. A squirrel ran across the yard.', 'The puppy will chase the squirrel', ['The puppy will take a nap','The gate will close itself']],
    ['Mom put the cake in the oven. She set a timer. The kitchen started to smell sweet.', 'The cake will finish baking', ['Mom will go to sleep','The oven will melt']],
    ['Wren\'s dragon sneezed sparks near the dry hay.', 'The hay might catch fire', ['The hay will turn to gold','The dragon will fly to the moon']],
    ['Ben stacked one more block on the wobbly tower. It leaned to the left.', 'The tower will fall', ['The tower will grow taller by itself','Ben will eat the block']]],
  'comp.compare': [
    ['Owls hunt at night. Hawks hunt in the day. Both have sharp claws.', 'Both have sharp claws', ['Both hunt at night','Both hunt in the day']],
    ['Mia likes quiet books. Zoe likes loud games. Both love the park.', 'Both love the park', ['Both like loud games','Both like quiet books']],
    ['A frog lives on land and in water. A fish lives only in water. Both lay eggs.', 'Both lay eggs', ['Both live on land','Both breathe air']]],
  'comp.purpose': [
    ['Sharks have rows of teeth. When one falls out, a new one moves up.', 'to teach facts', ['to tell a funny story','to make you buy something']],
    ['Come to the bake sale on Friday! Every cookie helps the library. Don\'t miss it!', 'to get you to do something', ['to teach facts about cookies','to tell a make-believe story']],
    ['Once upon a time, a pig wanted to fly. He tied balloons to his tail.', 'to entertain', ['to teach facts about pigs','to get you to buy balloons']],
    ['To plant a seed, dig a small hole. Drop in the seed. Cover it and add water.', 'to explain how to do something', ['to tell a scary story','to make you laugh']]],
  'comp.infer': [
    ['Kai put on his coat, hat and mittens. He could see his breath.', 'It was cold outside', ['It was hot outside','Kai was at the beach']],
    ['Lila\'s eyes were red. She hugged her teddy and would not talk.', 'Lila was sad', ['Lila was excited','Lila was hungry']],
    ['There were crumbs on the dog\'s nose, and the cookie plate was empty.', 'The dog ate the cookies', ['Mom ate the cookies','The cookies flew away']],
    ['The streetlights came on. Owls began to hoot.', 'It was getting dark', ['It was morning','It was lunch time']]]
};
function compItem(id){
  const B = COMP_BANK[id]; if (!B) return null; const t = pick(B);
  if (id === 'comp.fact_opinion'){ const o = opts(t[1], ['fact','opinion'], 2); return { type:'pick', prompt:'“' + t[0] + '”\nIs this a fact or an opinion?', say:t[0] + ' Is this a fact or an opinion?', options:o.options.map(x => ({ t:x })), answer:o.answer, explain: t[1] === 'fact' ? 'A fact can be checked and proven.' : 'An opinion is what someone thinks or feels.' }; }
  const q = { 'comp.pov':'Who is telling this?', 'comp.main_idea':'What is this mostly about?', 'comp.predict':'What will probably happen next?', 'comp.compare':'How are they the SAME?', 'comp.purpose':'Why did the author write this?', 'comp.infer':'What can you tell?' }[id];
  const o = opts(t[1], t[2], 3);
  return { type:'pick', prompt:t[0] + '\n**' + q + '**', say:t[0] + ' ' + q, options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'Answer: ' + t[1] + '.' };
}
function makeItem(skillId, band, i){
  const sk = SKILL[skillId];
  if (GEN[skillId]) return Object.assign({ skill:skillId }, GEN[skillId](band));
  if (COMP_BANK[skillId]) return Object.assign({ skill:skillId }, compItem(skillId));
  if (sk.pat) return Object.assign({ skill:skillId }, patternItem(skillId, ['read', 'missing', 'read', 'which', 'sentence'][i % 5]));
  if (skillId === 'dec.regular') return Object.assign({ skill:skillId }, patternItem(pick(['ph.digraphs', 'ph.blends']), 'read'));
  if (skillId === 'dec.syllable') return Object.assign({ skill:skillId }, (() => { const t = pick(BANK.two_syl); const parts = splitSyl(t[0]), cut = parts.indexOf('-');
    const wrong = [1, 2, 3, 4, 5].filter(i => i !== cut && i < t[0].length - 1).map(i => t[0].slice(0, i) + '-' + t[0].slice(i));
    const o = opts(parts, wrong, 3); return { type:'pick', prompt:'Where does “' + t[0] + '” split into chunks?', pic:t[1], say:t[0], options:o.options.map(x => ({ t:x })), answer:o.answer, explain:'Chunks: ' + parts + '. Each chunk has one vowel sound.' }; })());
  return null; // fluency / comprehension skills are practiced through stories, not drills
}
const SYL = { rabbit:'rab-bit', sunset:'sun-set', napkin:'nap-kin', basket:'bas-ket', robot:'ro-bot', pumpkin:'pump-kin', dragon:'dra-gon', magnet:'mag-net', picnic:'pic-nic', kitten:'kit-ten', muffin:'muf-fin', rocket:'rock-et', candle:'can-dle', zipper:'zip-per', tiger:'ti-ger' };
function splitSyl(w){ if (SYL[w]) return SYL[w]; const m = w.match(/^(.*?[aeiou])([^aeiou])([^aeiou].*)$/); if (m) return m[1] + m[2] + '-' + m[3]; const n = w.match(/^(.*?[aeiou])([^aeiou][aeiou].*)$/); return n ? n[1] + '-' + n[2] : w; }
const DRILLABLE = id => !!(GEN[id] || COMP_BANK[id] || SKILL[id].pat || id === 'dec.regular' || id === 'dec.syllable');

/* ======================= 8. PLACEMENT (branching, tap-based) ======================= */
// probe ladder for the code strand; each rung = one skill, 3 items.
const LADDER = ['ph.sounds', 'pa.blend', 'ph.short_a', 'dec.cvc', 'sw.hf1', 'ph.digraphs', 'ph.blends', 'sw.hf2', 'ph.silent_e', 'ph.vowel_teams', 'ph.r_ctrl', 'ph.diphthongs', 'dec.morph', 'dec.two_syl', 'dec.multi', 'ph.advanced'];
const START_AT = { auto:3, letters:0, words:3, sentences:5, chapter:8 };
function placementStart(choice){ return { i: START_AT[choice] ?? 3, results:{}, asked:0, pending:null, done:false, log:[] }; }
// result for a rung: 3/3 → pass, 2/3 → partial, ≤1 → fail
function placementStep(P, k, n){
  const id = LADDER[P.i]; P.results[id] = { k, n }; P.asked += n; P.log.push([id, k, n]);
  const res = r => P.results[LADDER[r]], pass = r => res(r) && res(r).k / res(r).n >= 0.99, tested = r => !!res(r);
  const passes = LADDER.map((_, r) => r).filter(pass), hi = passes.length ? Math.max(...passes) : null;
  let next = null;
  if (hi === null){
    // nothing passed yet: walk down toward prerequisites until something is secure
    next = P.i - 1; while (next >= 0 && tested(next)) next--;
  } else if (!tested(hi + 1)) next = hi + 1;
  else if (pass(P.i) && P.i === hi && !tested(hi + 2) && P.log.every(x => x[1] / x[2] >= 0.99)) next = hi + 2;   // still perfect: skip ahead
  else {
    // boundary search above the highest pass: stop after two non-passes above it, or a fail directly above it
    const above = LADDER.map((_, r) => r).filter(r => r > hi && tested(r));
    const failDirect = res(hi + 1) && res(hi + 1).k / res(hi + 1).n < 0.5;
    if (!failDirect && above.length < 2){ next = hi + 2; while (next < LADDER.length && tested(next)) next++; }
    // a skipped rung below a fail gets checked so the boundary is exact
    const skipped = LADDER.map((_, r) => r).find(r => r > 0 && r < hi && !tested(r) && (r === hi - 1));
    if (next === null && skipped != null) next = skipped;
  }
  if (pass(P.i) && P.i === hi && tested(hi + 1) && !pass(hi + 1) && next === hi + 1) next = null;
  if (next === null || next < 0 || next >= LADDER.length || P.asked >= 33) P.done = true; else P.i = next;
  return P;
}
// turn placement results into profile state: passed rungs (and everything they depend on) = inferred mastered.
function applyPlacement(lm, P, sid, t){
  t = t || Date.now();
  const passedIds = Object.entries(P.results).filter(([, r]) => r.k / r.n >= 0.99).map(([id]) => id);
  const infer = new Set();
  const climb = id => SKILL[id].pre.forEach(p => { if (!infer.has(p)){ infer.add(p); climb(p); } });
  // highest passed rung below the first hard fail
  passedIds.forEach(id => climb(id));
  passedIds.forEach(id => infer.add(id));
  // any rung failed outright removes inference for it
  Object.entries(P.results).forEach(([id, r]) => { record(lm, { s:id, k:r.k, n:r.n, ind:true, c:0.8, src:'placement', sid, t }); if (r.k / r.n < 0.99) infer.delete(id); });
  // a passed higher rung implies the early ladder rungs (incl. letters / short vowels / CVC) are secure
  const hi = Math.max(-1, ...passedIds.map(id => LADDER.indexOf(id)));
  LADDER.slice(0, hi).forEach(id => { if (!P.results[id] || P.results[id].k / P.results[id].n >= 0.5) infer.add(id); });
  if (infer.has('ph.short_a') && infer.has('dec.cvc')) ['ph.short_i','ph.short_o','ph.short_u','ph.short_e'].forEach(id => infer.add(id));
  if (infer.has('dec.cvc')) ['pa.begin','pa.end','pa.blend','pa.segment','ph.letters','ph.sounds'].forEach(id => infer.add(id));
  if (infer.has('ph.digraphs') || infer.has('ph.blends')) infer.add('pa.manip');
  if (infer.has('ph.digraphs') && infer.has('ph.blends')) infer.add('dec.regular');
  if (infer.has('sw.hf2')){ infer.add('sw.irregular'); infer.add('dec.irregular'); }
  infer.forEach(id => { if (!lm.m[id]) lm.placed[id] = 'mastered'; });
  lm.placedAt = t; lm.placedBand = currentBand(lm, t);
  return { inferred:[...infer], band: lm.placedBand };
}

// comprehension placement: a strong result on a passage at the placed level implies the earlier comprehension skills
function applyCompPlacement(lm, k, n, band){
  if (!n || k / n < 0.8) return [];
  const ids = SKILLS.filter(s => s.domain === 'comp' && !s.rated && s.band <= Math.min(3, band - 3)).map(s => s.id);
  ids.forEach(id => { if (!lm.m[id]) lm.placed[id] = 'mastered'; });
  return ids;
}

/* ======================= 9. LESSON PLANNER (deterministic) ======================= */
const STRAND_ORDER = ['pa','ph','dec','sw'];
function frontier(lm, states, domains){
  return SKILLS.filter(s => domains.includes(s.domain) && !s.rated && !isM(states[s.id]) && s.pre.every(p => isM(states[p])))
    .sort((a, b) => a.band - b.band || STRAND_ORDER.indexOf(a.domain) - STRAND_ORDER.indexOf(b.domain) || SKILLS.indexOf(a) - SKILLS.indexOf(b));
}
/* planLesson → the whole lesson as data. library = [{ id, title, text, qs, band, analysis }] */
function planLesson(lm, library, o){
  o = o || {}; const now = o.now || Date.now(); seed(o.seed || now);
  const st = allStates(lm, now), band = currentBand(lm, now);
  // 1–2: prerequisite gaps = skills that slipped ("review") with something depending on them
  const gaps = SKILLS.filter(s => st[s.id].state === 'review').sort((a, b) => a.band - b.band);
  // 3: highest-priority unmastered skill on each strand (code and meaning are planned independently)
  const codeF = frontier(lm, st, ['pa','ph','dec','sw']), meanF = frontier(lm, st, ['comp','voc']);
  const codeTarget = gaps.find(s => ['pa','ph','dec','sw'].includes(s.domain)) || codeF.find(s => DRILLABLE(s.id)) || null;
  const meanTarget = gaps.find(s => ['comp','voc'].includes(s.domain)) || meanF.find(s => s.domain === 'comp') || meanF[0] || null;
  let primary = codeTarget, secondary = meanTarget;
  if (o.focus === 'meaning' || (!codeTarget && meanTarget)) [primary, secondary] = [meanTarget, codeTarget];
  // 4: review = mastered skills whose spaced-review date has arrived (oldest first), max 2
  const reviews = SKILLS.filter(s => isM(st[s.id]) && DRILLABLE(s.id) && !st[s.id].inferred && st[s.id].reviewDue && st[s.id].reviewDue <= now)
    .sort((a, b) => st[a.id].reviewDue - st[b.id].reviewDue).slice(0, 2);
  // inferred (placement) masteries get confirmed with one quick item each, max 1 per lesson
  const confirm = SKILLS.filter(s => st[s.id].inferred && DRILLABLE(s.id) && s.band >= band - 2).sort((a, b) => b.band - a.band).slice(0, 1);
  // 5: difficulty is set per dimension, not all at once
  const known = new Set(Object.keys(st).filter(id => isM(st[id])));
  const decodeBand = Math.max(1, band), compBand = Math.max(1, Math.min(6, Math.max(...SKILLS.filter(s => s.domain === 'comp' && isM(st[s.id])).map(s => s.band), 1) + 1));
  const C = Object.assign({}, bandConstraints(decodeBand));
  // comprehension struggling → keep text easy, spend effort on questions; decoding struggling → shorter text
  const codeAcc = codeTarget && st[codeTarget.id].acc, compAcc = meanTarget && st[meanTarget.id].acc;
  if (compAcc != null && compAcc < 0.6){ C.words = [C.words[0], Math.round(C.words[1] * 0.75)]; }
  if (codeAcc != null && codeAcc < 0.6){ C.avgSent = Math.max(5, C.avgSent - 1); C.maxNew = Math.max(1, C.maxNew - 1); }
  // 6: objectives in kid and grown-up words
  const objectives = [primary, secondary].filter(Boolean).map(s => ({ skill:s.id, kid:s.kid, text:s.name + ': ' + s.desc }));
  // 7: story constraints + pick from validated library
  const target = codeTarget ? codeTarget.id : null;
  const scored = (library || []).map(b => ({ b, v: validateStory(b, { known:[...known], target, band:decodeBand, constraints:C }) }))
    .map(x => ({ ...x, score: x.v.checks.filter(c => c.pass).length + (x.v.stats.targetWords.length ? 2 : 0) - (o.recent && o.recent.includes(x.b.id) ? 6 : 0) - Math.abs((x.b.band || decodeBand) - decodeBand) * 2 }))
    .sort((a, b) => b.score - a.score);
  const story = scored.find(x => x.v.pass && !(o.recent || []).includes(x.b.id)) || null;
  const nearMiss = !story && scored.length ? scored[0] : null;
  // 8: activities
  const acts = [];
  const nT = primary && DRILLABLE(primary.id) ? (st[primary.id].state === 'na' || st[primary.id].state === 'emerging' ? 5 : 4) : 0;
  gaps.filter(s => s !== primary && DRILLABLE(s.id)).slice(0, 1).forEach(s => [0, 1].forEach(i => acts.push(Object.assign(makeItem(s.id, band, i), { role:'gap' }))));
  reviews.forEach(s => acts.push(Object.assign(makeItem(s.id, band, 0), { role:'review' })));
  confirm.forEach(s => acts.push(Object.assign(makeItem(s.id, band, 0), { role:'confirm' })));
  for (let i = 0; i < nT; i++){ const it = makeItem(primary.id, band, i); if (it) acts.push(Object.assign(it, { role:'target' })); }
  if (secondary && DRILLABLE(secondary.id)) [0, 1].forEach(i => { const it = makeItem(secondary.id, band, i); if (it) acts.push(Object.assign(it, { role:'target2' })); });
  if (!acts.length){ const v = ['voc.meaning','voc.synonyms','voc.antonyms'].find(id => !isM(st[id])) || 'voc.context'; [0, 1, 2].forEach(i => acts.push(Object.assign(makeItem(v, band, i), { role:'target2' }))); }
  // comprehension focus for the story questions
  const compFocus = meanTarget ? meanTarget.id : 'comp.literal';
  return {
    created: now, band, decodeBand, compBand, primary: primary && primary.id, secondary: secondary && secondary.id,
    gaps: gaps.map(s => s.id), reviews: reviews.map(s => s.id), confirm: confirm.map(s => s.id), objectives,
    constraints: Object.assign(C, { target, known:[...known] }), story: story && story.b, storyCheck: story ? story.v : nearMiss && nearMiss.v,
    nearMiss: nearMiss && nearMiss.b, activities: acts, compFocus,
    why: [
      gaps.length ? 'Fixing a slipped skill first: ' + gaps.map(s => s.name).join(', ') + '.' : null,
      primary ? 'Main goal: ' + SKILL[primary.id].name + ' (' + (st[primary.id].state === 'na' ? 'new' : st[primary.id].state) + ').' : null,
      secondary ? 'Also: ' + SKILL[secondary.id].name + '.' : null,
      reviews.length ? 'Spaced review: ' + reviews.map(s => s.name).join(', ') + '.' : null,
      confirm.length ? 'Confirming a placement result: ' + confirm.map(s => s.name).join(', ') + '.' : null
    ].filter(Boolean)
  };
}

/* ======================= 10. EVIDENCE FROM A STORY READ ======================= */
/* words = [{ w, ok, helped }]; returns per-skill evidence events (one per skill per session) */
function storyEvidence(words, o){
  o = o || {}; const by = {};
  const add = (id, ok, ind) => { const b = by[id + (ind ? '' : '#a')] = by[id + (ind ? '' : '#a')] || { s:id, k:0, n:0, ind }; b.n++; if (ok) b.k++; };
  const names = o.names || new Set();
  words.forEach(x => {
    const w = lc(x.w).replace(/'/g, ''); if (!w || names.has(w)) return;
    const ind = !x.helped;
    if (HEARTS.has(w)) add('sw.irregular', x.ok, ind);
    else if (HF1S.has(w)) add('sw.hf1', x.ok, ind);
    else if (HF2S.has(w)) add('sw.hf2', x.ok, ind);
    else patterns(w).forEach(p => { const id = PATTERN_SKILL[p]; if (id) add(id, x.ok, ind); });
  });
  const out = Object.values(by).filter(b => b.n >= 2 || !b.ind).map(b => Object.assign(b, { c:o.c == null ? 0.75 : o.c, src:'story' }));
  // connected-text fluency
  const indWords = words.filter(x => !x.helped), tot = words.length;
  if (tot >= 15){
    const acc = indWords.filter(x => x.ok).length / tot;
    out.push({ s:'flu.accuracy', k: acc >= 0.95 ? 1 : 0, n:1, ind: words.every(x => !x.helped) || acc >= 0.95, c:o.c == null ? 0.75 : o.c, src:'story', note: Math.round(acc * 100) + '% words' });
    const known = words.filter(x => HF1S.has(lc(x.w)) || HF2S.has(lc(x.w)));
    if (known.length >= 8) out.push({ s:'sw.auto', k: known.filter(x => x.ok && !x.helped).length / known.length >= 0.95 ? 1 : 0, n:1, ind:true, c:o.c == null ? 0.75 : o.c, src:'story' });
    if (o.wcpm && o.band){ const target = [0, 20, 35, 55, 75, 90, 105][o.band]; out.push({ s:'flu.rate', k: o.wcpm >= target ? 1 : 0, n:1, ind:true, c:o.c == null ? 0.7 : o.c, src:'story', note: o.wcpm + ' WCPM (goal ' + target + ')' }); }
  }
  return out;
}

/* ======================= 11. PARENT RECOMMENDATIONS (evidence-based only) ======================= */
function recommendations(lm, name, now){
  now = now || Date.now(); const st = allStates(lm, now), out = [];
  const N = name || 'Your child';
  const mastered = SKILLS.filter(s => isM(st[s.id]) && !st[s.id].inferred);
  const recentM = mastered.filter(s => lm.m[s.id] && now - lm.m[s.id].at < 14 * DAY);
  if (recentM.length) out.push({ kind:'win', text:`${N} recently showed mastery of ${recentM.map(s => s.name.toLowerCase()).join(', ')}, with repeated independent evidence across different days.` });
  const slipped = SKILLS.filter(s => st[s.id].state === 'review');
  if (slipped.length) out.push({ kind:'alert', text:`${slipped.map(s => s.name).join(', ')} ${slipped.length > 1 ? 'have' : 'has'} slipped since mastery. Lessons will review ${slipped.length > 1 ? 'them' : 'it'} first. ${st[slipped[0].id].why}` });
  const codeF = frontier(lm, st, ['pa','ph','dec','sw']), meanF = frontier(lm, st, ['comp','voc']);
  if (codeF[0]){ const s = codeF[0], x = st[s.id]; out.push({ kind:'next', text: x.state === 'na' ? `Next decoding priority: ${s.name.toLowerCase()} (${s.ex}). Not practiced yet.` : `Current decoding focus: ${s.name.toLowerCase()}. ${x.why}` }); }
  const dec = ['ph','dec','sw'].map(d => SKILLS.filter(s => s.domain === d)).flat().map(s => st[s.id]).filter(x => x.n);
  const cmp = SKILLS.filter(s => s.domain === 'comp').map(s => st[s.id]).filter(x => x.n);
  const avg = arr => arr.reduce((t, x) => t + x.acc * x.n, 0) / Math.max(1, arr.reduce((t, x) => t + x.n, 0));
  const nOf = arr => arr.reduce((t, x) => t + x.n, 0);
  if (nOf(dec) >= 20 && nOf(cmp) >= 6){
    const d = avg(dec), c = avg(cmp);
    if (d - c >= 0.15) out.push({ kind:'insight', text:`${N} decodes accurately (${Math.round(d * 100)}%) but comprehension is lower (${Math.round(c * 100)}%). Decoding difficulty will hold steady while lessons add ${(meanF[0] || SKILL['comp.sequence']).name.toLowerCase()} practice. At home: after reading, ask "What happened first, next, last?"` });
    else if (c - d >= 0.15) out.push({ kind:'insight', text:`${N} understands stories well (${Math.round(c * 100)}%) but word reading is behind (${Math.round(d * 100)}%). Stories will stay at a comfortable decoding level while phonics practice continues.` });
  }
  const weakComp = SKILLS.filter(s => s.domain === 'comp' && st[s.id].n >= 3 && st[s.id].acc < 0.6);
  weakComp.slice(0, 2).forEach(s => out.push({ kind:'practice', text:`${s.name}: ${Math.round(st[s.id].acc * 100)}% on ${st[s.id].n} questions. Try: ${HOME_TIPS[s.id] || 'talk about it together after each story.'}` }));
  const help = SKILLS.map(s => [s, lm.sum[s.id]]).filter(([, m]) => m && m.an >= 6 && m.an > m.in);
  help.slice(0, 1).forEach(([s, m]) => out.push({ kind:'support', text:`${s.name} is mostly being done with help (${m.an} helped vs ${m.in} independent). Mastery only counts independent work, so encourage trying first before tapping 🔊.` }));
  const low = new Set(lm.ev.filter(e => e.c < CONFIG.minConfidence).map(e => e.sid)).size;
  if (low >= 1) out.push({ kind:'note', text:`${low} read-aloud session${low > 1 ? 's' : ''} had low speech-recognition confidence and ${low > 1 ? 'were' : 'was'} left out of mastery. Grown-up scoring (tap missed words) gives more reliable results.` });
  if (!out.length) out.push({ kind:'note', text:'Not enough evidence yet. After a few lessons this page will show what is going well and what to practice.' });
  return out;
}
const HOME_TIPS = {
  'comp.sequence':'retell a story using "first, next, then, last" on your fingers.',
  'comp.cause':'ask "why did that happen?" and "what happened because of that?"',
  'comp.character':'ask how a character feels and what clue in the words shows it.',
  'comp.infer':'ask "how do you know?" and point to the clue together.',
  'comp.main_idea':'ask for a one-sentence "this story is mostly about…"',
  'comp.predict':'pause before the last page and guess what happens next.',
  'comp.details':'ask them to find the exact sentence that proves an answer.',
  'comp.literal':'ask who, what, where, when after each page.'
};

/* ======================= 12. STORY GENERATION (separate from the curriculum) ======================= */
// (a) the request object the AI receives. The curriculum fills it; the AI never chooses the skill.
function generationRequest(plan, prefs){
  const C = plan.constraints, tSk = C.target && SKILL[C.target];
  const allowed = [...new Set(Object.keys(BANK).filter(k => k !== 'cvc' && C.known.includes(PATTERN_SKILL[k] || '')).flatMap(k => BANK[k].map(x => x[0])))].slice(0, 80);
  return {
    targetSkill: C.target, targetPattern: tSk ? tSk.kid + ' (' + tSk.ex + ')' : null,
    targetWords: tSk && BANK[tSk.pat] ? BANK[tSk.pat].map(x => x[0]) : [],
    reviewSkills: plan.reviews, masteredSkills: C.known, allowedWords: allowed, heartWordsAllowed: C.known.includes('sw.irregular') ? HEART : HEART.filter(w => HF1S.has(w)).slice(0, 8),
    maxNewVocabulary: C.maxNew, maxAvgSentenceWords: C.avgSent, maxSentenceWords: C.maxSent, lengthWords: C.words,
    comprehensionObjective: plan.compFocus && SKILL[plan.compFocus] ? SKILL[plan.compFocus].name : 'literal recall',
    theme: (prefs && prefs.theme) || 'fantasy', characters: (prefs && prefs.characters) || [], band: plan.decodeBand
  };
}
function generationPrompt(req, failed){
  return [
    'You write short, funny, kind stories for a child learning to read. Follow every constraint exactly.',
    'CONSTRAINTS (from the curriculum engine; do not change them):',
    JSON.stringify(req, null, 1),
    'Rules: use mostly words from allowedWords, targetWords and heartWordsAllowed. Use at least 5 different targetWords. Main character names are fine. ' +
    'Keep sentences short. No semicolons, colons, dashes or parentheses. Keep one main character through the story. Make it imaginative, not boring.',
    'Write 4 or 5 multiple-choice questions with 3 choices each. At least one question must practice: ' + req.comprehensionObjective + '.',
    failed && failed.length ? 'YOUR LAST DRAFT FAILED THESE CHECKS. Fix them:\n' + failed.map(f => '- ' + f.label + ': ' + f.value + ' (limit ' + f.limit + '). ' + (f.fix || '')).join('\n') : '',
    'Reply with JSON only: {"title": string, "text": string (paragraphs separated by \\n\\n), "questions": [{"q": string, "choices": [string,string,string], "answer": 0-based index}]}'
  ].filter(Boolean).join('\n\n');
}
// (b) offline template forge: always available, deterministic, always validated.
const THEMES = {
  fantasy:   { hero:'Wren',   pal:'Pebble', palKind:'dragon', place:'the hills', icon:'🐉' },
  animals:   { hero:'Biscuit',pal:'Pip',    palKind:'pup',    place:'the farm',  icon:'🐾' },
  space:     { hero:'Zed',    pal:'Bloop',  palKind:'robot',  place:'the moon',  icon:'🚀' },
  dinosaurs: { hero:'Rex',    pal:'Dot',    palKind:'dino',   place:'the swamp', icon:'🦖' },
  ocean:     { hero:'Finn',   pal:'Shelly', palKind:'crab',   place:'the reef',  icon:'🌊' },
  mystery:   { hero:'Max',    pal:'Gus',    palKind:'cat',    place:'the shed',  icon:'🔍' },
  sports:    { hero:'Jess',   pal:'Kip',    palKind:'pal',    place:'the field', icon:'⚽' },
  heroes:    { hero:'Nova',   pal:'Bolt',   palKind:'pal',    place:'the city',  icon:'🦸' }
};
function forgeStory(plan, theme, n){
  seed((plan.created || 1) + (n || 0) * 7919);
  const T = THEMES[theme] || THEMES.fantasy, tSk = plan.constraints.target && SKILL[plan.constraints.target];
  const known = new Set(plan.constraints.known || []); if (tSk) known.add(tSk.id);
  const ok = w => w.split(' ').every(x => wordStatus(x, known, null).ok);
  const choose = (list, fb) => { const c = shuffle(list.filter(ok)); return c[0] || fb; };
  const bank = (tSk && BANK[tSk.pat]) || BANK.cvc;
  const BIG = new Set('shop ship whale king bath barn house city bridge horse cow storm cave lake home tree train road tent desk car moon night rain snow light sunset knight giant nature elephant volcano kangaroo dinosaur adventure'.split(' '));
  const things = shuffle(bank.filter(x => x[2] === 'n' && ok(x[0]) && !BIG.has(x[0]))).map(x => x[0]);
  const Tn = things[0] || choose(['hat','map','box','bag','cup'], 'hat'), T2 = things[1] || choose(['net','pot','pan','jug'], 'pot');
  const FUN = new Set('big red best fast green bright new brave cute huge dark loud brown gentle hot thick short'.split(' '));
  const adjs = shuffle(bank.filter(x => x[2] === 'a' && ok(x[0]) && FUN.has(x[0])).map(x => x[0]));
  const A = adjs[0] || choose(['big','red','fun','best','fast'], 'big');
  const S = choose(['log','rock','box','hill','stump','nest','shelf','rack','deck'].filter(w => w !== Tn), 'log');
  const F = choose(['mud','pond','tub','bog','muck','ditch'], 'mud');
  const place = choose(['the hill','the pond','the den','the hut','the shed','the dock','the camp','the ship','the fort'], 'the den');
  const H = T.hero, P = T.pal;
  const paras = [
    [`${H} and ${P} went to ${place}.`, `They had a map.`, `It said, "Find the ${A} ${Tn}."`],
    [`"Look!" said ${P}.`, `"I see it! It is on top of a ${S}."`, `Next to it was a ${T2}.`, `${H} ran up and got the ${Tn}.`],
    [`But ${P} slid and fell in the ${F}!`, `"Help!" said ${P}.`, `${H} did not stop.`, `${H} got ${P} out.`],
    [`${P} was wet, but ${P} was glad.`, `"We got the ${Tn}!" said ${H}.`, `They sat in the sun with the ${Tn}.`]
  ];
  const text = paras.map(p => p.join(' ')).join('\n\n');
  const others = shuffle(BANK.cvc.concat(bank).map(x => x[0]).filter(w => ![Tn, T2, S, F].includes(w)));
  const qs = [
    [`Who went to ${place} with ${H}?`, [P, 'a bird', 'Mom'], 0, 'comp.literal'],
    [`What did the map say to find?`, [`the ${A} ${Tn}`, `a ${others[0]}`, `a ${others[1]}`], 0, 'comp.details'],
    [`Where was the ${Tn}?`, [`on top of a ${S}`, `in the ${F}`, `in a ${others[2]}`], 0, 'comp.literal'],
    [`What happened after ${H} got the ${Tn}?`, [`${P} fell in the ${F}`, `${P} went home`, `${P} had a nap`], 0, 'comp.sequence'],
    [`Why did ${H} help ${P}?`, [`${P} fell in the ${F}`, `${H} was sad`, `${H} lost the map`], 0, 'comp.cause'],
    [`How did ${P} feel at the end?`, ['glad', 'mad', 'scared'], 0, 'comp.character']
  ].map(q => { const sh = shuffle(q[1].map((t, i) => [t, i === q[2]])); return [q[0], sh.map(x => x[0]), sh.findIndex(x => x[1]), q[3]]; });
  return { id:'forge-' + (plan.created || 0) + '-' + (n || 0), title:`${H} and the ${A} ${Tn}`, emoji:T.icon, text, qs:shuffle(qs.slice(1, 5)).concat([qs[0], qs[5]]).slice(0, 5), generated:'template' };
}

/* ======================= exports ======================= */
const API = { CONFIG, BANDS, DOMAINS, SKILLS, SKILL, BANK, HF1, HF2, HEART, VOCAB, LADDER, THEMES,
  patterns, syllables, phonemes, tokens, sentences, fkGrade, tagQuestion, properNames,
  newProfile, ensure, record, skillState, allStates, commit, masteredSet, currentBand, isM,
  wordStatus, bandConstraints, validateStory, analyzeText,
  makeItem, DRILLABLE, seed, placementStart, placementStep, applyPlacement, applyCompPlacement,
  planLesson, storyEvidence, recommendations, generationRequest, generationPrompt, forgeStory };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CURR = API;
})(typeof window !== 'undefined' ? window : globalThis);
