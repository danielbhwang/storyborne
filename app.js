/* ============================================================
   READING QUEST — app engine
   ============================================================ */
(function(){
'use strict';

const TRACKS = { son: SON_TRACK, daughter: DAUGHTER_TRACK };
function renameCat(name){
  if (!name || name === 'Biscuit') return;
  const swap = v => typeof v === 'string' ? v.replace(/Biscuit/g, name) : Array.isArray(v) ? v.map(swap) : (v && typeof v === 'object') ? (Object.keys(v).forEach(k => v[k] = swap(v[k])), v) : v;
  swap(SON_TRACK);
}
let CAT = 'Biscuit';
try { const saved = JSON.parse(localStorage.getItem('readingQuest_v1')); if (saved && saved.catName){ CAT = saved.catName; renameCat(CAT); } } catch(e){}
const KID_NAMES = { son: 'Biscuit Track', daughter: 'Dragon Academy' };
const STORE_KEY = 'readingQuest_v1';
const SESSION_GOAL_MS = 10 * 60 * 1000;
const $ = (s, el=document) => el.querySelector(s);
const el = (tag, attrs={}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const todayStr = (d=new Date()) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const shuffle = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };

/* ---------------- storage ---------------- */
function freshKid(){
  return { level:1, placed:false, passStreak:0, failStreak:0, storyIdx:{}, stars:0,
           collection:[], eggProgress:0, streak:{count:0,last:null}, today:{date:null,ms:0},
           missed:{}, words:{}, sessions:[], spent:0, trophies:[], badges:[], quizStreak:0,
           avatar:{ base:null, owned:[], equipped:{} } };
}
let DB;
function load(fresh){
  let d = null;
  if (!fresh) try { d = JSON.parse(localStorage.getItem(STORE_KEY)); } catch(e){}
  const legacy = !!(d && d.kids && (d.kids.son || d.kids.daughter)) || !!(d && d.players);
  if (!d || !d.kids) d = { pin:'1234', record:false, forceManual:false, lastKid:null, kids:{} };
  d.names = Object.assign({ daughter:'Gianna', son:'Miles' }, d.names||{});
  // Player registry: one entry per player. Gianna and Miles keep their old ids ('daughter', 'son').
  // track = which reading track ('daughter' = Dragon Academy & Sunny Day Club, 'son' = Biscuit & Pals),
  // style = 'girl' | 'boy' starter outfit, pin = hashed kid PIN (optional), wizard = the hidden grown-up player.
  d.players = d.players || {};
  // devices that already had Gianna and Miles keep them as the first two players; a brand-new device starts empty
  if (legacy && !Object.keys(d.players).some(id => !d.players[id].wizard)){
    d.players.daughter = Object.assign({ name:d.names.daughter, track:'daughter', style:'girl', order:1 }, d.players.daughter || {});
    d.players.son = Object.assign({ name:d.names.son, track:'son', style:'boy', order:2 }, d.players.son || {});
  }
  if (d.kids.dev && !d.players.dev) d.players.dev = { name:d.devName || 'The Wizard', track:'daughter', style:'boy', wizard:true, order:99 };
  for (const k of Object.keys(d.players)){
    if (d.players[k].removed) continue;
    d.kids[k] = Object.assign(freshKid(), d.kids[k]||{});
    const K0 = d.kids[k];
    // migrate the old simple missed-word counts into the word tracker
    for (const [w,c] of Object.entries(K0.missed||{})) if (!K0.words[w]) K0.words[w] = { miss:c, streak:0, mastered:null, last:null, disp:w };
    K0.missed = {};
    K0.avatar = Object.assign({ base:null, owned:[], equipped:{} }, K0.avatar||{});
  }
  d.devName = d.devName || 'The Wizard';
  return d;
}
const BACKUP_KEY = 'readingQuest_backup';
let backupT = null;
function backupPlayers(){ // the best copy of each player's progress ever seen on this device (survives sign-out)
  try {
    const bk = JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}');
    Object.keys(DB.kids || {}).forEach(id => { const k = DB.kids[id], sc = kidScore(k);
      if (sc > 0 && (!bk[id] || sc >= bk[id].score)) bk[id] = { score: sc, at: Date.now(), level: k.level, reads: (k.sessions || []).length, name: kidName(id), json: JSON.stringify(k) }; });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(bk));
  } catch(e){}
}
function save(){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch(e){}
  clearTimeout(backupT); backupT = setTimeout(backupPlayers, 2000);
  // only the player being played (or edited by a grown-up) on THIS device may be sent to the cloud,
  // so an old copy of a sibling stored on this iPad can never overwrite their real progress
  try { if (kid && DB.kids[kid]) CLOUD.dirty[kid] = true; if (CLOUD.editing && DB.kids[CLOUD.editing]) CLOUD.dirty[CLOUD.editing] = true; } catch(e){}
  try { cloudQueue(); } catch(e){ /* cloud code not set up yet during startup */ }
}
DB = load();

// One-time gifts from a grown-up. Each id is granted once per device and announced on the kid's home screen.
const GIFTS = [{ id:'world-refund-2026-11', stars:70, msg:'🎁 Surprise! You got 70 bonus stars to rebuild your world. Sorry your things went missing!' }];
DB.gifts = DB.gifts || [];
GIFTS.forEach(g => {
  if (DB.gifts.includes(g.id)) return;
  for (const k of ['son','daughter']) if (DB.kids[k]){ DB.kids[k].stars = (DB.kids[k].stars||0) + g.stars; DB.kids[k].giftMsg = g.msg; }
  DB.gifts.push(g.id);
  save();
});

/* IndexedDB for recordings */
const idb = {
  db:null,
  open(){ return new Promise(res => {
    if (this.db) return res(this.db);
    try {
      const r = indexedDB.open('readingQuestRec', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rec');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => res(null);
    } catch(e){ res(null); }
  });},
  async put(key, val){ const db = await this.open(); if(!db) return false;
    return new Promise(res => { try { const t = db.transaction('rec','readwrite'); t.objectStore('rec').put(val,key); t.oncomplete=()=>res(true); t.onerror=()=>res(false);} catch(e){res(false);} }); },
  async get(key){ const db = await this.open(); if(!db) return null;
    return new Promise(res => { try { const r = db.transaction('rec').objectStore('rec').get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null);} catch(e){res(null);} }); },
  async clear(prefix){ const db = await this.open(); if(!db) return;
    try { const st = db.transaction('rec','readwrite').objectStore('rec'); const r = st.openCursor();
      r.onsuccess = () => { const c = r.result; if (c){ if (String(c.key).startsWith(prefix)) c.delete(); c.continue(); } }; } catch(e){} }
};

/* ---------------- sound + speech ---------------- */
let actx = null;
function beep(type){
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok:[660,880], bad:[300,220], level:[523,659,784,1047], tap:[700], star:[880,1175] }[type] || [600];
    notes.forEach((f,i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type==='bad' ? 'triangle' : 'sine'; o.frequency.value = f;
      const t = actx.currentTime + i*0.12;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.25,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t+0.3);
    });
  } catch(e){}
}
let voice = null;
// Rank voices so the most human-sounding one wins: Natural/Neural (Edge), Premium/Enhanced (iPad, Mac), Google (Chrome).
// Novelty and old robotic system voices are pushed to the bottom.
const ROBOTIC = /compact|eloquence|albert|bad news|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|good news|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo\b|reed|sandy|eddy/i;
function voiceScore(v){
  if (!/^en/i.test(v.lang)) return -1;
  let s = /^en[-_]US/i.test(v.lang) ? 50 : 20;
  if (/natural|neural/i.test(v.name)) s += 40;
  if (/premium/i.test(v.name)) s += 35;
  if (/enhanced/i.test(v.name)) s += 30;
  if (/google us english/i.test(v.name)) s += 25;
  if (/\b(ava|zoe|samantha|allison|aria|jenny|michelle|nicky|evan|nathan|joelle|noelle)\b/i.test(v.name)) s += 10;
  if (ROBOTIC.test(v.name)) s -= 80;
  return s;
}
function englishVoices(){
  try { return speechSynthesis.getVoices().filter(v => voiceScore(v) >= 0).sort((a,b) => voiceScore(b) - voiceScore(a)); } catch(e){ return []; }
}
function pickVoice(){
  try {
    const vs = englishVoices();
    voice = (DB.voiceName && vs.find(v => v.name === DB.voiceName)) || vs[0] || null;
  } catch(e){}
}
if ('speechSynthesis' in window){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text, opts={}){
  return new Promise(res => {
    try {
      if (!('speechSynthesis' in window)) return res();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[🌀-🫶☀-➿️]/gu,''));
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-US'; u.rate = opts.rate || (TK==='son' ? 0.9 : 0.95); u.pitch = 1;
      u.onend = res; u.onerror = res;
      speechSynthesis.speak(u);
      setTimeout(res, 8000);
    } catch(e){ res(); }
  });
}

/* ---------------- word matching ---------------- */
const HOMO = [
  ['to','too','two','2'],['for','four','4','fore'],['see','sea','c'],['be','bee','b'],['hear','here'],
  ['there','their','theyre'],['no','know'],['one','won','1'],['right','write'],['red','read'],['blue','blew'],
  ['i','eye','aye'],['by','buy','bye'],['ate','eight','8'],['son','sun'],['hole','whole'],['new','knew'],
  ['night','knight'],['tail','tale'],['so','sew'],['our','hour'],['wood','would'],['not','knot'],
  ['flower','flour'],['meet','meat'],['pear','pair'],['deer','dear'],['road','rode'],['plain','plane'],
  ['hi','high'],['hey','hay'],['you','u','ya'],['okay','ok'],['mom','mum','mam'],['cant','cannot'],
  ['wren','ren','rent','when','wrenn','rin','rain','wren\'s'],['oona','una','oonah','luna','uno','oola'],
  ['vex','vax','vexed','vecs','vecks','backs','vets'],['tobin','toben','tobyn','toby','tobins'],
  ['mira','meera','mirror','mera','miras'],['nim','nem','nym','them'],['plip','flip','blip','lip','plipp'],
  ['zip','zipp','zips'],['biscuit','biscuits'],['toasty','toastie','toasties','tostie'],['leafy','leafie','leafs'],
  ['skyfire','sky','skyfires'],['pebble','pebbles'],['blaze','blazes','blades'],['ripple','ripples'],
  ['wow','whoa','woah'],['oh','o','ooh'],['shh','sh','shhh'],['cheep','cheap','chirp'],['zoomed','zoom','zooms'],
  ['grr','grrr'],['mr','mister'],['vines','vine'],['oak','oke']
];
const HOMO_MAP = {};
HOMO.forEach(g => g.forEach(w => { HOMO_MAP[w] = HOMO_MAP[w] || new Set(); g.forEach(x => HOMO_MAP[w].add(x)); }));
const ONES = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numWords(n){
  if (n < 20) return [ONES[n]];
  if (n < 100) return [TENS[Math.floor(n/10)]].concat(n%10 ? [ONES[n%10]] : []);
  if (n < 1000) return [ONES[Math.floor(n/100)],'hundred'].concat(n%100 ? numWords(n%100) : []);
  if (n < 10000) return numWords(Math.floor(n/1000)).concat(['thousand']).concat(n%1000 ? numWords(n%1000) : []);
  return [String(n)];
}
const norm = w => w.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]/g,'');
function tokenizeHeard(text){
  const out = [];
  text.split(/[\s\-–—]+/).forEach(raw => {
    const w = norm(raw); if (!w) return;
    if (/^\d+$/.test(w)) out.push(...numWords(parseInt(w,10)));
    else out.push(w);
  });
  return out;
}
function lev(a,b){
  if (a===b) return 0; const m=a.length,n=b.length; if(!m) return n; if(!n) return m;
  let prev = Array.from({length:n+1},(_,j)=>j);
  for (let i=1;i<=m;i++){ const cur=[i]; for(let j=1;j<=n;j++) cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); prev=cur; }
  return prev[n];
}
/* tiny "sounds like" key: the iPad often writes a child's word as a sound-alike (dragon → dragging, Biscuit → biscuits) */
function phon(w){
  let s = w.replace(/[^a-z]/g,'');
  s = s.replace(/^(kn|gn|wr|ps)/, m => m[1]).replace(/ph/g,'f').replace(/ck|q/g,'k').replace(/c(?=[eiy])/g,'s').replace(/c/g,'k')
    .replace(/x/g,'ks').replace(/dg/g,'j').replace(/gh/g,'').replace(/sh|ch/g,'X').replace(/th/g,'0').replace(/z/g,'s').replace(/ing$/,'n');
  const first = s[0] || '', rest = s.slice(1).replace(/[aeiouyhw]/g,'');
  return (/[aeiouy]/.test(first) ? 'A' : first) + rest.replace(/(.)\1+/g,'$1');
}
const earKind = () => { try { const P = playerOf(kid); return (P && P.ear ? P.ear : trackOf(kid) === 'son' ? 'kind' : 'normal') === 'kind'; } catch(e){ return false; } };
function wordMatch(target, heard, strict){
  if (!target || !heard) return false;
  if (target === heard) return true;
  if (HOMO_MAP[target] && HOMO_MAP[target].has(heard)) return true;
  if (strict) return false;
  const L = Math.max(target.length, heard.length), kind = earKind();
  if (target.length <= 3){
    // short words: only a same-sounding word with the same first letter ("hop" → "hopp", "cat" → "kat")
    return kind && target.length === 3 && heard.length <= 4 && phon(target) === phon(heard) && lev(target, heard) <= 1;
  }
  const d = lev(target, heard);
  if (L <= 6 && d <= 1) return true;
  if (L >= 7 && d <= 2) return true;
  if (kind && L >= 5 && d <= 2 && target[0] === heard[0]) return true;
  if (phon(target) === phon(heard) && target[0] === heard[0] && d <= Math.ceil(L / 2)) return true;
  // plural / tense endings
  const stems = [heard+'s', heard+'es', heard+'ed', heard+'d', heard+'ing'];
  if (stems.includes(target)) return true;
  if ([target+'s', target+'es', target+'ed', target+'d'].includes(heard)) return true;
  return false;
}
const LETTER_NAMES = {
  a:['a','ay','eh','ah','ahh','aa'], b:['b','be','bee','buh','bih'], c:['c','see','sea','si','k','kuh','kay','cuh'], d:['d','dee','duh','di'],
  e:['e','eh','ee','ehh'], f:['f','ef','eff','ff','fff','fuh'], g:['g','gee','guh','ji','jee'], h:['h','aitch','huh','ha','hh'],
  i:['i','eye','ih','aye','ick','it'], j:['j','jay','juh','ja'], k:['k','kay','okay','kuh','ca'], l:['l','el','elle','ll','la','luh'],
  m:['m','em','mm','mmm','hmm','mmmm','mmhmm','mhm'], n:['n','en','nn','nnn','in','an'], o:['o','oh','owe','ah','aw','awe','ok'],
  p:['p','pee','pea','puh','pe'], q:['q','queue','cue','kw','kwuh','qu'], r:['r','are','our','rr','rrr','ruh','er','arr'],
  s:['s','es','ss','sss','ssss','yes','ess'], t:['t','tea','tee','tuh','ti'], u:['u','you','uh','um','up','uhh'],
  v:['v','vee','vv','vvv','vuh','we'], w:['w','double','wuh','wa','woo'], x:['x','ex','ecks','ks','eggs','x'],
  y:['y','why','yuh','ya','yeah'], z:['z','zee','zed','zz','zzz','zuh']
};
function letterMatch(letter, keyword, heardList){
  const kw = norm(keyword);
  return heardList.some(h => h === letter || (LETTER_NAMES[letter]||[]).includes(h) || h === kw || (h[0] === letter && h.length <= 6));
}

/* Align heard tokens against target tokens. Returns status array: 'ok'|'miss'|null */
function align(target, heard, strict){
  const st = target.map(()=>null);
  let pos = 0;
  for (let i=0; i<heard.length && pos<target.length; i++){
    const h = heard[i], h2 = heard[i+1] ? h + heard[i+1] : null;
    let matched = false;
    for (let k=0; k<=3 && pos+k<target.length; k++){
      const t = target[pos+k];
      let used = 0;
      if (wordMatch(t, h, strict)) used = 1;
      else if (h2 && wordMatch(t, h2, strict)) used = 2;
      else if (pos+k+1 < target.length && wordMatch(t + target[pos+k+1], h, strict)) used = -1; // "cannot" vs "can not"
      if (used){
        for (let s=pos; s<pos+k; s++) st[s] = 'miss';
        st[pos+k] = 'ok';
        if (used === -1){ st[pos+k+1] = 'ok'; pos = pos+k+2; }
        else { pos = pos+k+1; if (used === 2) i++; }
        matched = true; break;
      }
    }
    // skipped a line? jump ahead when two heard words in a row match further on in the story
    if (!matched && heard[i+1]){
      for (let k=4; k<=40 && pos+k+1<target.length; k++){
        if (wordMatch(target[pos+k], h, strict) && wordMatch(target[pos+k+1], heard[i+1], strict)){
          for (let s=pos; s<pos+k; s++) st[s] = 'miss';
          st[pos+k] = 'ok'; pos = pos+k+1; break;
        }
      }
    }
    // otherwise an unmatched heard word = extra word or misread; ignore
  }
  return st;
}

/* Fill in words the iPad most likely heard but did not write down:
   - a word that showed up in one of the iPad's other guesses, when the child has already read past it
   - tiny words (a, the, to…) the iPad often drops, when the words on both sides were read */
const SMALL_WORDS = new Set(['a','an','the','to','of','and','is','in','on','at','it','i','he','she','we','was','as','for','his','her','my','so','up','be','by','or']);
function fillHeard(tw, st, alts){
  const last = st.lastIndexOf('ok');
  for (let j = 0; j < last; j++){
    if (st[j] === 'ok') continue;
    if (alts && [...alts].some(h => wordMatch(tw[j], h, false))){ st[j] = 'ok'; continue; }
    if (SMALL_WORDS.has(tw[j]) && (j === 0 || st[j-1] === 'ok') && st[j+1] === 'ok') st[j] = 'ok';
  }
  return st;
}
const MIC_TIPS = ['I\'m listening… 👂 Read nice and clear!', 'I\'m listening… 👂 Hold the iPad close, like a book.', 'I\'m listening… 👂 Read in your big, clear voice.', 'I\'m listening… 👂 Take your time with each word.'];
const micTip = () => MIC_TIPS[Math.floor(Math.random() * MIC_TIPS.length)];

/* ---------------- speech recognition ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const srSupported = !!SR;
function useManual(){ return DB.forceManual || !srSupported || micBroken; }
// If listening fails twice in a row, switch to grown-up scoring for the rest of this visit instead of leaving the kid stuck.
let micFails = 0, micBroken = false;
function micFailed(){
  if (++micFails < 2 || micBroken) return;
  micBroken = true;
  try { stopRecog(); } catch(e){}
  if (run){ renderReader(); setHint('The microphone isn\'t working right now, so a grown-up can tap any missed words. Keep reading out loud!'); }
}

/* ---------------- app state ---------------- */
let kid = null;               // 'son' | 'daughter'
let K = null;                 // DB.kids[kid]
let T = null;                 // track
let TK = null;                // whose reading track is in use ('son' or 'daughter'); the Wizard can switch
const isDev = () => kid === 'dev';
let run = null;               // current passage run

function kidName(k){ k = k || kid; if (typeof k === 'string' && k.startsWith('w:')) return (WORLD.peers[k] || {}).name || 'Friend'; if (k === 'dev') return DB.devName || (DB.plaza && DB.plaza.dev && DB.plaza.dev.name) || 'The Wizard';
  const P = (DB.players || {})[k]; return P ? P.name : (DB.names[k] || (DB.plaza && DB.plaza[k] && DB.plaza[k].name) || 'Friend'); }
const playerOf = k => (DB.players || {})[k] || null;
// reading track of a player: 'daughter' (Dragon Academy, ages 6-9) or 'son' (Biscuit & Pals, ages 4-6)
function trackOf(k){ if (k === 'dev') return DB.devTrack || 'daughter'; const P = playerOf(k); return P && TRACKS[P.track] ? P.track : (k === 'son' ? 'son' : 'daughter'); }
function styleOf(k){ const P = playerOf(k); return P && P.style ? P.style : (trackOf(k) === 'daughter' ? 'girl' : 'boy'); }
// players shown to kids (the Wizard only on a device where Wizard Mode is on)
function playerIds(withWizard){ return Object.keys(DB.players || {}).filter(id => { const P = DB.players[id]; return !P.removed && DB.kids[id] && (!P.wizard || (withWizard && DB.devOn)); })
  .sort((a, b) => (DB.players[a].order || 50) - (DB.players[b].order || 50)); }
const TRACK_INFO = { daughter:{ name:'Dragon Academy', sub:'Dragon Academy · Sunny Day Club', ages:'Ages 6–9 · chapter books, read quietly', word:'Rank', icon:'🐉' },
                     son:{ name:'Biscuit & Pals', sub:'Biscuit & Pals · Detective Biscuit', ages:'Ages 4–6 · read out loud', word:'Level', icon:'🐲' } };
function setKid(k){
  kid = k; K = DB.kids[k]; TK = trackOf(k); T = TRACKS[TK]; if (k !== 'dev') DB.lastKid = k; save();
  document.body.className = 'theme-' + TK + (k === 'dev' ? ' wizard-mode' : '');
}
function levelDef(n){ return T.levels[Math.min(Math.max(n,1), T.levels.length) - 1]; }
function show(node){
  onCloudUpdate = null; // screens that can redraw on a cloud change set this again after show()
  const root = $('#app'); root.innerHTML = ''; root.append(node); window.scrollTo(0,0);
}

/* ---------------- cloud save ----------------
   When the app runs inside its Claude artifact, both kids' progress (worlds included) and the
   shared settings are kept in the artifact's database, so every device sees the same data and the
   kids can visit each other's worlds anywhere. Elsewhere (GitHub Pages) it saves on the device only.
   Docs: rq/son, rq/daughter, rq/settings = { json, ts }. Newest save wins. */
// The release version is the ?v= on app.js in index.html (bump it there on every release; it also busts caches).
const APP_VERSION = (function(){ const s = document.querySelector('script[src*="app.js"]'), m = s && /[?&]v=([^&]+)/.exec(s.getAttribute('src')); return m ? m[1] : 'dev'; })();
// what gets saved to the cloud: shared settings (incl. the player list) + one doc per player
const cloudKeys = () => ['settings'].concat(Object.keys(DB.players || {}).filter(id => DB.kids[id]));
const CLOUD = { db:null, on:false, status:'local', last:{}, timers:{}, busy:{}, again:{}, mine:{}, dirty:{}, seen:{}, waiting:{}, editing:null };
let onCloudUpdate = null;
const CLOUD_TEXT = {
  local: /github\.io$/.test(location.hostname) ? '📱 Saved on this iPad only. For cloud save on every device, use the Claude link.' : '📱 Saved on this device only',
  syncing:'☁️ Connecting to cloud save…',
  cloud:'☁️ Cloud save is on: works on every device',
  offline:'⚠️ Can\'t reach cloud save right now. Saving on this device until it\'s back.',
  family:'☁️ Saved to your family account · works on every device',
  signedout:'🔑 Not signed in. Progress saves on this device only.'
};
function cloudStatusNode(){ return el('div',{class:'cloud-status'}, CLOUD_TEXT[CLOUD.status] + ' · v' + APP_VERSION); }
function setCloudStatus(s){ CLOUD.status = s; document.querySelectorAll('.cloud-status').forEach(n => n.textContent = CLOUD_TEXT[s] + ' · v' + APP_VERSION); }
const settingsOf = d => ({ reportEmail:d.reportEmail || null, pin:d.pin, names:d.names, catName:d.catName || null, gifts:d.gifts || [], record:!!d.record, forceManual:!!d.forceManual, goalMin:d.goalMin || {}, players:d.players || {}, devName:d.devName || null, devTrack:d.devTrack || null, worldMode:d.worldMode || 'world', familyEmail:d.familyEmail || null });
const cloudBody = key => key === 'settings' ? settingsOf(DB) : DB.kids[key];
// real progress only (never stars: a fresh device's one-time gift must not outrank the cloud copy)
const kidScore = k => (k.sessions||[]).length + ((k.world && k.world.items) || []).length + (k.collection||[]).length + (k.placed ? k.level || 1 : 0);
const newestPlay = k => (k.sessions || []).slice(0, 5).reduce((m, x) => Math.max(m, Date.parse(x.date) || 0), 0);
// a cloud copy that is behind this device (lower level and no newer reading) is stale, unless a grown-up reset the player
function isRegression(remote, local){
  if (!remote || !local || !local.placed) return false;
  if ((remote.resetAt || 0) > (local.resetAt || 0)) return false;
  return (remote.level || 1) < (local.level || 1) && newestPlay(remote) <= newestPlay(local);
}
const stableStr = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x);
const uniq = (...lists) => [...new Set([].concat(...lists.map(l => l || [])))];
function mergeKid(local, remote, remoteNewer){
  const N = remoteNewer ? remote : local, O = remoteNewer ? local : remote; // newer copy, older copy
  const m = JSON.parse(JSON.stringify(Object.assign({}, O, N)));
  // level: keep the highest, unless the lower copy was lowered on purpose (grown-up or level-down) after the other's last read
  const lowered = c => Math.max(c.resetAt || 0, c.levelDownAt || 0);
  const hi = (local.level || 1) >= (remote.level || 1) ? local : remote, lo = hi === local ? remote : local;
  const L = lowered(lo) > newestPlay(hi) ? lo : hi;
  ['level','passStreak','failStreak','bossReady'].forEach(f => { if (L[f] !== undefined) m[f] = L[f]; });
  m.placed = !!(local.placed || remote.placed);
  // reading history: everything from both
  const seen = new Set(), all = [];
  [].concat(local.sessions || [], remote.sessions || []).forEach(x => { const id = x.id || (x.date + x.title); if (!seen.has(id)){ seen.add(id); all.push(x); } });
  m.sessions = all.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 200);
  ['stars','spent','cosmic','cosmicSpent','eggProgress'].forEach(f => { const v = Math.max(local[f] || 0, remote[f] || 0); if (v || m[f] !== undefined) m[f] = v; });
  ['collection','trophies','badges','legendOwned','legendSeen','mythics'].forEach(f => { if (local[f] || remote[f]) m[f] = uniq(local[f], remote[f]); });
  // buddy & shop items: never lose the chosen buddy or anything bought
  const la = local.avatar || {}, ra = remote.avatar || {};
  m.avatar = Object.assign({}, O.avatar || {}, N.avatar || {}, { base: (N.avatar || {}).base || (O.avatar || {}).base || null, owned: uniq(la.owned, ra.owned), equipped: Object.assign({}, (O.avatar || {}).equipped, (N.avatar || {}).equipped) });
  m.hero = N.hero || O.hero || null; if (!m.hero) delete m.hero;
  if (local.gear || remote.gear){ const owned = {}; [local.gear, remote.gear].forEach(g => Object.entries((g && g.owned) || {}).forEach(([set, sl]) => owned[set] = uniq(owned[set], sl)));
    m.gear = { owned, eq: Object.assign({}, ((O.gear) || {}).eq, ((N.gear) || {}).eq) }; }
  const lw = local.world, rw = remote.world;
  if (lw || rw){ const pick = !lw ? rw : !rw ? lw : ((lw.items || []).length === (rw.items || []).length ? N.world : ((lw.items || []).length > (rw.items || []).length ? lw : rw)) || lw || rw;
    m.world = Object.assign({}, pick, { themes: uniq((lw || {}).themes, (rw || {}).themes) }); }
  const maxMap = f => { if (!local[f] && !remote[f]) return; const o = Object.assign({}, remote[f], local[f]); Object.keys(o).forEach(k => o[k] = Math.max((local[f] || {})[k] || 0, (remote[f] || {})[k] || 0)); m[f] = o; };
  maxMap('treasures'); maxMap('storyIdx'); maxMap('weapons'); maxMap('mounts');
  if (local.books || remote.books){ const b = {}; Object.keys(Object.assign({}, local.books, remote.books)).forEach(id => { const x = (local.books || {})[id] || {}, y = (remote.books || {})[id] || {};
    b[id] = (y.finished || 0) > (x.finished || 0) || ((y.finished || 0) === (x.finished || 0) && (y.ch || 0) > (x.ch || 0)) ? y : x; }); m.books = b; }
  m.words = Object.assign({}, O.words, N.words); m.missed = Object.assign({}, O.missed, N.missed);
  if ((local.streak || {}).count || (remote.streak || {}).count) m.streak = ((local.streak || {}).last || '') >= ((remote.streak || {}).last || '') ? local.streak : remote.streak;
  if (local.path || remote.path){ const p = Object.assign({}, O.path, N.path); p.done = Object.assign({}, (O.path || {}).done, (N.path || {}).done); p.placed = !!((local.path || {}).placed || (remote.path || {}).placed); m.path = p; }
  m.resetAt = Math.max(local.resetAt || 0, remote.resetAt || 0) || undefined; m.levelDownAt = Math.max(local.levelDownAt || 0, remote.levelDownAt || 0) || undefined;
  if (!m.resetAt) delete m.resetAt; if (!m.levelDownAt) delete m.levelDownAt;
  return m;
}
function setCloudTs(key, ts){ DB.cloudTs = DB.cloudTs || {}; DB.cloudTs[key] = ts; }
function cloudQueue(){
  if (!CLOUD.on) return;
  cloudKeys().forEach(key => {
    if (key !== 'settings' && !CLOUD.dirty[key]) return;
    if (JSON.stringify(cloudBody(key)) === CLOUD.last[key]) return;
    clearTimeout(CLOUD.timers[key]); CLOUD.timers[key] = setTimeout(() => cloudPush(key), 1200);
  });
}
async function cloudPush(key, retried, force){
  if (!CLOUD.on) return;
  // never write a player before this device has seen the cloud's copy (it could be newer)
  if (key !== 'settings' && !CLOUD.seen[key]){ CLOUD.waiting[key] = true; return; }
  if (key !== 'settings' && !force && !CLOUD.dirty[key]) return;
  if (CLOUD.busy[key]){ CLOUD.again[key] = true; return; }
  let body = cloudBody(key), j = JSON.stringify(body);
  if (j === CLOUD.last[key]) return;
  CLOUD.busy[key] = true;
  const ts = Date.now();
  CLOUD.mine[key] = ts;
  try {
    try { await CLOUD.db.doc('rq/' + key).set({ json:j, ts }); }
    catch(e){
      if (e && (e.code === 'invalid_argument' || e.code === 'invalid-argument') && key !== 'settings'){ // too big: keep the cloud copy's history shorter
        j = JSON.stringify(Object.assign({}, body, { sessions:(body.sessions||[]).slice(0,40) }));
        await CLOUD.db.doc('rq/' + key).set({ json:j, ts });
      } else throw e;
    }
    CLOUD.last[key] = JSON.stringify(body); setCloudTs(key, ts); delete CLOUD.dirty[key];
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch(e){}
    if (CLOUD.status !== CLOUD.okStatus && CLOUD.okStatus) setCloudStatus(CLOUD.okStatus);
  } catch(e){
    setCloudStatus('offline');
    if (!retried && (!e || e.code === 'unavailable' || e.code === 'resource_exhausted')) setTimeout(() => cloudPush(key, true), 3000 + Math.random()*3000);
  }
  CLOUD.busy[key] = false;
  if (CLOUD.again[key]){ CLOUD.again[key] = false; cloudPush(key, false, force); }
}
function cloudApply(key, snap){
  if (snap.metadata.hasPendingWrites) return;
  const d = snap.exists ? snap.data() : null;
  const fromServer = !snap.metadata.fromCache;
  const wasWaiting = CLOUD.waiting[key];
  if (fromServer){ CLOUD.seen[key] = true; delete CLOUD.waiting[key]; }
  if (!d || typeof d.json !== 'string'){ // cloud empty: seed it from this device (never from a blank placeholder)
    if (fromServer && (key === 'settings' || CLOUD.dirty[key] || kidScore(DB.kids[key] || {}) > 0)) cloudPush(key, false, true); return; }
  const mine = JSON.stringify(cloudBody(key));
  if (d.json === mine){ CLOUD.last[key] = mine; setCloudTs(key, d.ts); return; }
  // our own save coming back (or something older than it): nothing new to take
  if (CLOUD.mine[key] && d.ts <= CLOUD.mine[key]){ if (fromServer) cloudQueue(); return; }
  let remote; try { remote = JSON.parse(d.json); } catch(e){ return; }
  const base = (DB.cloudTs || {})[key];
  if (key !== 'settings'){
    // A player's progress is MERGED with this device's copy: reads, stars, items, buddy and the highest level are all kept.
    // Only a grown-up's deliberate reset (resetAt) replaces everything.
    const local = DB.kids[key];
    let merged = !local || !kidScore(local) || (remote.resetAt || 0) > (local.resetAt || 0) ? remote : mergeKid(local, remote, d.ts > (base || 0));
    merged = Object.assign(freshKid(), merged);
    if (local && kidScore(local) > kidScore(merged)){ DB.backup = DB.backup || {}; DB.backup[key] = { at: Date.now(), level: local.level, json: JSON.stringify(local) }; }
    DB.kids[key] = merged; if (kid === key) K = merged;
    setCloudTs(key, d.ts);
    let remoteFull; try { remoteFull = Object.assign(freshKid(), remote); } catch(e){ remoteFull = remote; }
    if (stableStr(merged) !== stableStr(remoteFull)){ CLOUD.dirty[key] = true; CLOUD.last[key] = null; if (fromServer) cloudPush(key, false, true); }
    else CLOUD.last[key] = JSON.stringify(merged);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch(e){}
    cloudRedraw();
    return;
  }
  // after the first sync, a newer cloud save wins; on a device's very first sync, keep whichever copy has more progress.
  // Either way, a cloud copy that is BEHIND this device's real progress is replaced, never taken.
  let takeRemote = base ? d.ts > base : (key === 'settings' || kidScore(remote) >= kidScore(DB.kids[key]));
  if (key !== 'settings' && takeRemote && isRegression(remote, DB.kids[key])) takeRemote = false;
  if (!takeRemote){ if (fromServer){ if (key !== 'settings' && (isRegression(remote, DB.kids[key]) || !base)) cloudPush(key, false, true); else if (wasWaiting) cloudQueue(); } return; }
  let addLocal = false;
  if (key === 'settings' && !base){ // first sync on this device: keep players that only this device knows (e.g. Gianna & Miles on an old iPad)
    const mine = DB.players || {}, theirs = remote.players || {};
    const extra = Object.keys(mine).filter(id => !theirs[id] && (!mine[id].wizard || DB.devOn));
    if (extra.length){ remote.players = Object.assign({}, theirs); extra.forEach(id => remote.players[id] = mine[id]); addLocal = true; }
  }
  if (key === 'settings'){ Object.assign(DB, settingsOf(Object.assign(settingsOf(DB), remote))); ensurePlayerData(); cloudSubscribeAll(); if (addLocal) setTimeout(() => cloudPush('settings'), 50); }
  else {
    const old = DB.kids[key];
    if (old && kidScore(old) > kidScore(remote)){ DB.backup = DB.backup || {}; DB.backup[key] = { at: Date.now(), level: old.level, json: JSON.stringify(old) }; }
    DB.kids[key] = Object.assign(freshKid(), remote); if (kid === key) K = DB.kids[key];
  }
  CLOUD.last[key] = addLocal ? null : JSON.stringify(cloudBody(key)); setCloudTs(key, d.ts);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch(e){}
  cloudRedraw();
}
// cloud changes can arrive in bursts (two iPads syncing): redraw once, after things settle, never more than every 1.5 s
let cloudRedrawT = null, cloudRedrawAt = 0;
function cloudRedraw(){
  clearTimeout(cloudRedrawT);
  const wait = Math.max(400, 1500 - (Date.now() - cloudRedrawAt));
  cloudRedrawT = setTimeout(() => { cloudRedrawAt = Date.now(); if (onCloudUpdate) onCloudUpdate(); }, wait);
}
// On the GitHub site, check now and then whether a newer version was published; offer a Refresh.
// (Inside Claude, a new artifact version reloads open pages by itself.)
function watchForUpdates(){
  if (!/github\.io$/.test(location.hostname)) return;
  const check = async () => {
    try {
      const t = await (await fetch(location.pathname + '?v=' + Date.now(), { cache:'no-store' })).text();
      const m = t.match(/app\.js\?v=([^"'&]+)/);
      if (m && m[1] !== APP_VERSION && !$('.update-banner'))
        document.body.append(el('div',{class:'update-banner'}, '✨ A new version of Storyborne is ready!',
          el('button',{class:'btn small', onclick:()=>location.reload()},'Refresh')));
    } catch(e){}
  };
  setTimeout(check, 5000);
  setInterval(check, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}

async function cloudStart(){
  let db = null;
  try { if (window.claude && window.claude.use) db = await window.claude.use('db'); } catch(e){}
  if (!db){ setCloudStatus('local'); return; }
  cloudConnect(db, 'cloud');
}
// start syncing every key with a database that has doc(path).set() / .onSnapshot() (Claude artifact db or Firebase)
function cloudConnect(db, status){
  CLOUD.db = db; CLOUD.on = true; CLOUD.subs = {}; CLOUD.okStatus = status || 'cloud'; setCloudStatus('syncing');
  CLOUD.timer = setTimeout(() => { if (CLOUD.status === 'syncing') setCloudStatus('offline'); }, 10000);
  cloudSubscribeAll();
}
function cloudSubscribeAll(){
  if (!CLOUD.on) return;
  cloudKeys().forEach(key => {
    if (CLOUD.subs[key]) return; CLOUD.subs[key] = true;
    try {
      CLOUD.db.doc('rq/' + key).onSnapshot(snap => {
        if (!snap.metadata.fromCache){ clearTimeout(CLOUD.timer); if (CLOUD.status !== CLOUD.okStatus) setCloudStatus(CLOUD.okStatus); }
        cloudApply(key, snap);
      }, () => setCloudStatus('offline'));
    } catch(e){ setCloudStatus('offline'); }
  });
}
// every player in the list has a progress record on this device
function ensurePlayerData(){
  Object.keys(DB.players || {}).forEach(id => { if (!DB.kids[id]){ DB.kids[id] = freshKid(); DB.kids[id].avatar = { base:null, owned:[], equipped:{} }; } });
}
const savePlayerMeta = () => save();

/* ================= FAMILY ACCOUNTS (Firebase) =================
   On the GitHub site, a grown-up signs in once per device with the family's email + password.
   Everything is then saved in the family's own space in Firestore (families/{uid}/rq/...), which the
   security rules only let that signed-in family read or write. Kids then tap their hero + their PIN.
   Paste the Firebase web config here to turn it on. Until then the app saves on the device only. */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC_GX6ZrutlUioq3gnzpuYQC8J_72PIePw',
  authDomain: 'reading-quest-68e52.firebaseapp.com',
  projectId: 'reading-quest-68e52',
  storageBucket: 'reading-quest-68e52.firebasestorage.app',
  messagingSenderId: '205472124330',
  appId: '1:205472124330:web:6d935d910aed39e967efd3'
};
const FB_VER = '10.12.2';
const FB = { ready:false, user:null, auth:null, fs:null, mod:null, failed:false };
// family accounts run on the GitHub site (the Claude preview keeps its own cloud save)
const familyMode = () => !!window.__RQ_FIREBASE || (!!FIREBASE_CONFIG && /github\.io$/.test(location.hostname) && !(window.claude && window.claude.use));
async function fbLoad(){
  if (FB.mod) return FB.mod;
  if (window.__RQ_FIREBASE) return (FB.mod = window.__RQ_FIREBASE); // test double
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const [app, auth, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const a = app.initializeApp(FIREBASE_CONFIG), au = auth.getAuth(a);
  let db; try { db = fs.initializeFirestore(a, { localCache: fs.persistentLocalCache() }); } catch(e){ db = fs.getFirestore(a); } // offline cache when the browser allows it
  FB.mod = {
    onAuth: cb => auth.onAuthStateChanged(au, u => cb(u ? { uid:u.uid, email:u.email, verified:u.emailVerified } : null)),
    sendVerify: () => auth.sendEmailVerification(au.currentUser),
    refreshUser: async () => { await au.currentUser.reload(); await au.currentUser.getIdToken(true); return au.currentUser.emailVerified; },
    // creator dashboard: every family's saved progress (the rules only allow this for the creator's verified email)
    adminAll: async () => (await fs.getDocs(fs.collectionGroup(db, 'rq'))).docs.map(d => ({ uid: d.ref.parent.parent.id, key: d.id, json: d.data().json, ts: d.data().ts })),
    signIn: (e, p) => auth.signInWithEmailAndPassword(au, e, p),
    signUp: (e, p) => auth.createUserWithEmailAndPassword(au, e, p),
    reset: e => auth.sendPasswordResetEmail(au, e),
    signOut: () => auth.signOut(au),
    db: uid => ({ doc: path => { const ref = fs.doc(db, 'families', uid, ...path.split('/'));
      return { set: v => fs.setDoc(ref, v),
               onSnapshot: (cb, err) => fs.onSnapshot(ref, { includeMetadataChanges:true }, sn => cb({ exists: sn.exists(), data: () => sn.data(), metadata: sn.metadata }), err) }; } }),
    // the Big World: one small public doc per hero (world/{uid}_{playerId}) that every signed-in family can see
    world: {
      set: (id, v) => fs.setDoc(fs.doc(db, 'world', id), v),
      remove: id => fs.deleteDoc(fs.doc(db, 'world', id)),
      listen: (since, cb, err) => fs.onSnapshot(fs.query(fs.collection(db, 'world'), fs.where('ts', '>', since), fs.orderBy('ts', 'desc'), fs.limit(40)),
        sn => cb(sn.docs.map(d => Object.assign({ id:d.id }, d.data()))), err)
    }
  };
  return FB.mod;
}
const FB_ERR = { 'auth/invalid-email':'That email doesn\'t look right.', 'auth/missing-password':'Type the password.', 'auth/weak-password':'Use at least 6 characters for the password.',
  'auth/email-already-in-use':'That email already has a family account. Tap "I have an account".', 'auth/invalid-credential':'Email or password is wrong.', 'auth/wrong-password':'Email or password is wrong.',
  'auth/user-not-found':'No family account with that email yet.', 'auth/too-many-requests':'Too many tries. Wait a minute and try again.', 'auth/network-request-failed':'No internet connection right now.' };
const fbErr = e => FB_ERR[e && e.code] || 'Something went wrong: ' + ((e && (e.code || e.message)) || 'unknown');
async function familyStart(){
  setCloudStatus('syncing');
  let F;
  try { F = await Promise.race([fbLoad(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]); }
  catch(e){ FB.failed = true; setCloudStatus('offline'); return bootLocal(); }
  let first = true;
  F.onAuth(u => {
    FB.user = u; FB.ready = true;
    if (!u){ CLOUD.on = false; setCloudStatus('signedout'); if (first || !DB.family) screenFamilyLogin(); first = false; return; }
    const fresh = DB.family !== u.uid;
    if (fresh && DB.family){ DB = load(true); } // a different family signed in on this device: start clean
    DB.family = u.uid; DB.familyEmail = u.email; save();
    CLOUD_TEXT.family = `☁️ Saved to ${u.email}'s family account · works on every device`;
    cloudConnect(F.db(u.uid), 'family');
    if (FB.pendingWorld){ const w = FB.pendingWorld; FB.pendingWorld = null;   // the choice made on the sign-in screen wins over the saved one
      setTimeout(() => setWorldMode(w), 2500); }
    if (first || fresh){ first = false; bootLocal(); }
  });
}
function bootLocal(){
  if (/wizard/i.test(location.hash)) return DB.devOn && DB.kids.dev ? enterKid('dev') : screenPin(() => enterKid('dev'));
  if (DB.pinKid && DB.kids[DB.pinKid] && playerOf(DB.pinKid) && !playerOf(DB.pinKid).removed) return pickPlayer(DB.pinKid);
  screenProfiles();
}

/* ================= CREATOR DASHBOARD =================
   Only the app's creator sees this. It reads every family's saved progress from Firestore.
   The security rules only allow it for the creator's email, and only once that email is verified. */
const CREATOR_EMAILS = ['danielbhwang@gmail.com'];
const isCreator = () => !familyMode() || !!(FB.user && FB.user.email && CREATOR_EMAILS.includes(FB.user.email.toLowerCase()));
function kidSummary(kd, meta){
  const wkAgo = Date.now() - 7 * 86400000, ss = kd.sessions || [], normal = ss.filter(x => x.mode === 'normal');
  const wk = normal.filter(x => Date.parse(x.date) > wkAgo);
  const accs = normal.slice(0, 20).map(x => x.accuracy).filter(x => typeof x === 'number');
  const acc = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length * (accs[0] <= 1 ? 100 : 1)) : null;
  const last = Math.max(0, ...ss.slice(0, 3).map(x => Date.parse(x.date) || 0));
  const eq = (kd.gear && kd.gear.eq) || {}, setsOwned = Object.keys((kd.gear && kd.gear.owned) || {}).filter(id => id !== 'traveler');
  const setOn = eq.chest && eq.chest !== 'traveler' && SET_BY_ID[eq.chest] ? SET_BY_ID[eq.chest].name : 'Traveler';
  return {
    name: (meta && meta.name) || 'Player', track: (meta && meta.track) || 'son', style: (meta && meta.style) || null,
    level: kd.level || 1, placed: !!kd.placed, stars: (kd.stars || 0) - (kd.spent || 0), trophies: (kd.trophies || []).length,
    reads: normal.length, week: wk.length, acc, last,
    set: setOn, sets: setsOwned.length, weapons: Object.keys(kd.weapons || {}).length, mounts: Object.keys(kd.mounts || {}).length,
    tower: (kd.tower && kd.tower.best) || 0, spell: (kd.spellStreak && kd.spellStreak.best) || 0,
    cosmic: Math.max(0, (kd.cosmic || 0) - (kd.cosmicSpent || 0)), pets: (kd.collection || []).length
  };
}
const agoTxt = t => { if (!t) return 'never'; const d = Math.floor((Date.now() - t) / 86400000); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
async function creatorData(){
  if (!familyMode()) return [{ uid:'this-device', email: DB.familyEmail || 'This device', world: DB.worldMode || 'world',
    kids: Object.keys(DB.players || {}).filter(id => DB.kids[id] && id !== 'dev').map(id => Object.assign(kidSummary(DB.kids[id], DB.players[id]), { id, raw: DB.kids[id] })) }];
  const rows = await FB.mod.adminAll(), fams = {};
  rows.forEach(r => { const f = fams[r.uid] = fams[r.uid] || { uid:r.uid, docs:{} }; try { f.docs[r.key] = JSON.parse(r.json); } catch(e){} });
  return Object.values(fams).map(f => {
    const st = f.docs.settings || {}, players = st.players || {};
    const kids = Object.keys(f.docs).filter(k => k !== 'settings' && !k.startsWith('plaza_') && k !== 'dev' && f.docs[k] && typeof f.docs[k] === 'object' && 'level' in f.docs[k])
      .filter(k => !(players[k] && players[k].removed))
      .map(k => Object.assign(kidSummary(f.docs[k], players[k] || { name: k === 'son' ? 'Son' : k === 'daughter' ? 'Daughter' : k, track: k === 'son' ? 'son' : 'daughter' }), { id:k, raw:f.docs[k] }));
    return { uid:f.uid, email: st.familyEmail || ('family ' + f.uid.slice(0, 6)), world: st.worldMode || 'world', kids };
  }).filter(f => f.kids.length);
}
function creatorHero(k){
  const keepK = K; K = Object.assign({}, k.raw, { __style: k.style || (k.track === 'daughter' ? 'girl' : 'boy') });
  try { return heroSVG(64); } catch(e){ return ''; } finally { K = keepK; }
}
async function screenCreator(){
  stopAll(); document.body.className = 'parent';
  const body = el('div',{class:'cr-body'}, el('p',{class:'muted'}, 'Loading every family…'));
  show(el('div',{class:'screen cr-screen', style:'max-width:1200px'},
    el('div',{class:'row', style:'justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap'},
      el('h1',{style:'margin:0;font-size:30px'}, '👑 Creator dashboard'),
      el('div',{class:'row', style:'gap:8px'}, el('button',{class:'btn small blue', onclick:screenCreator}, '🔄 Refresh'), el('button',{class:'btn small', onclick:screenPlayers}, 'Done'))),
    body));
  if (familyMode() && FB.user && !FB.user.verified){
    let fresh = false; try { fresh = await FB.mod.refreshUser(); } catch(e){}
    if (!fresh){
      body.replaceChildren(el('div',{class:'card'}, el('h3',{style:'margin-top:0'}, '📧 Verify your email first'),
        el('p',{}, `To protect every family's data, the dashboard only opens for ${FB.user.email} after the email is verified.`),
        el('button',{class:'btn green', onclick:async e => { try { await FB.mod.sendVerify(); e.target.textContent = '✅ Sent! Tap the link in your email, then tap Refresh'; } catch(err){ e.target.textContent = fbErr(err); } }}, 'Send verification email')));
      return;
    }
  }
  let fams;
  try { fams = await creatorData(); }
  catch(e){ body.replaceChildren(el('div',{class:'card'}, el('h3',{style:'margin-top:0'}, '🔒 Can\'t read all families yet'),
    el('p',{}, 'Publish the new Firestore rules (they include the creator permission), then tap Refresh.'), el('p',{class:'muted'}, String(e && (e.code || e.message))))); return; }
  const kids = fams.flatMap(f => f.kids.map(k => Object.assign({ fam:f }, k)));
  const day = Date.now() - 86400000, week = Date.now() - 7 * 86400000;
  let sortBy = 'last', q = '';
  const stat = (n, l) => el('div',{class:'cr-stat'}, el('b',{}, n), el('span',{}, l));
  const summary = el('div',{class:'cr-stats'},
    stat(fams.length, 'families'), stat(kids.length, 'players'),
    stat(kids.filter(k => k.last > day).length, 'played today'), stat(kids.filter(k => k.last > week).length, 'played this week'),
    stat(kids.reduce((a, k) => a + k.week, 0), 'reads this week'), stat(fams.filter(f => f.world === 'world').length + ' / ' + fams.length, 'in Big World'));
  const table = el('div',{class:'cr-table'});
  const SORTS = { last:['Last played', k => -k.last], level:['Level', k => -(k.level * 1000 + k.trophies)], week:['Reads this week', k => -k.week], stars:['Stars', k => -k.stars], tower:['Tower', k => -k.tower], name:['Name', k => k.name.toLowerCase()] };
  const draw = () => {
    const list = kids.filter(k => !q || (k.name + ' ' + k.fam.email).toLowerCase().includes(q)).sort((a, b) => { const f = SORTS[sortBy][1], x = f(a), y = f(b); return x < y ? -1 : x > y ? 1 : 0; });
    table.replaceChildren(...list.map(k => el('div',{class:'cr-row' + (k.last > day ? ' live' : '')},
      el('div',{class:'cr-hero', html: creatorHero(k)}),
      el('div',{class:'cr-who'}, el('b',{}, k.name), el('span',{}, `${TRACK_INFO[k.track] ? TRACK_INFO[k.track].icon + ' ' + TRACK_INFO[k.track].name : k.track}`), el('small',{}, `${k.fam.email} · ${k.fam.world === 'world' ? '🌍 Big World' : '🏠 Solo'}`)),
      el('div',{class:'cr-cells'},
        el('span',{}, el('i',{}, 'Level'), el('b',{}, k.placed ? k.level : 'not placed')),
        el('span',{}, el('i',{}, 'Last played'), el('b',{}, agoTxt(k.last))),
        el('span',{}, el('i',{}, 'Reads'), el('b',{}, `${k.week} this wk · ${k.reads} total`)),
        el('span',{}, el('i',{}, 'Accuracy'), el('b',{}, k.acc == null ? '—' : k.acc + '%')),
        el('span',{}, el('i',{}, 'Stars'), el('b',{}, '⭐ ' + k.stars + (k.cosmic ? ' · 💫 ' + k.cosmic : ''))),
        el('span',{}, el('i',{}, 'Trophies'), el('b',{}, '🏆 ' + k.trophies)),
        el('span',{}, el('i',{}, 'Armor'), el('b',{}, `${k.set} · ${k.sets} sets`)),
        el('span',{}, el('i',{}, 'Weapons · mounts'), el('b',{}, `⚔️ ${k.weapons} · 🪽 ${k.mounts}`)),
        el('span',{}, el('i',{}, 'Tower'), el('b',{}, k.tower ? '🗼 floor ' + k.tower : '—')),
        el('span',{}, el('i',{}, 'Spelling best'), el('b',{}, k.spell ? '🔥 ' + k.spell + ' in a row' : '—'))))));
    if (!list.length) table.append(el('p',{class:'muted'}, 'No players found.'));
  };
  const search = el('input',{class:'cr-search', type:'search', placeholder:'Search a player or family email', oninput:e => { q = e.target.value.trim().toLowerCase(); draw(); }});
  const sorter = el('div',{class:'cr-sort'}, el('span',{}, 'Sort:'), ...Object.entries(SORTS).map(([id, [label]]) => el('button',{class:'btn small' + (id === sortBy ? ' blue' : ' ghost'), onclick:e => { sortBy = id; sorter.querySelectorAll('button').forEach(b => b.className = 'btn small ghost'); e.currentTarget.className = 'btn small blue'; draw(); }}, label)));
  body.replaceChildren(summary, el('div',{class:'cr-tools'}, search, sorter), table,
    el('p',{class:'muted', style:'margin-top:14px'}, familyMode() ? 'Shows every family that has saved progress to the cloud. Green rows played in the last 24 hours.' : 'Preview mode: this shows the players on this device only. On the GitHub site it shows every family.'));
  draw();
}

/* ---------- the landing page: what a new family sees first ---------- */
function withShowcase(style, hero, setId, fn){
  const keepK = K, keepTK = TK;
  K = { __style: style, hero, gear:{ owned:{}, eq: setId ? Object.fromEntries(GEAR_SLOTS.map(sl => [sl, setId])) : {} } };
  TK = style === 'girl' ? 'daughter' : 'son';
  try { return fn(); } catch(e){ console.warn('showcase', e); return ''; } finally { K = keepK; TK = keepTK; }
}
function screenFamilyLogin(mode = 'in', open = false){
  stopAll(); document.body.className = 'parent family-login lp-on';
  const email = el('input',{type:'email', placeholder:'Grown-up email', autocomplete:'username', value: DB.familyEmail || ''});
  const pw = el('input',{type:'password', placeholder: mode === 'up' ? 'New password (6+ characters)' : 'Password', autocomplete: mode === 'up' ? 'new-password' : 'current-password'});
  const msg = el('p',{class:'fl-msg'});
  const busy = on => [...document.querySelectorAll('.fl-card button')].forEach(b => b.disabled = on);
  const go = async () => {
    const F = FB.mod; if (!F){ msg.textContent = 'Can\'t reach the internet right now.'; return; }
    busy(true); msg.textContent = mode === 'up' ? 'Creating your family account…' : 'Signing in…';
    try { mode === 'up' ? await F.signUp(email.value.trim(), pw.value) : await F.signIn(email.value.trim(), pw.value); msg.textContent = '✅ Signed in!'; }
    catch(e){ msg.textContent = fbErr(e); busy(false); }
  };
  pw.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  FB.pendingWorld = DB.worldMode || 'world';
  const wopt = (v, icon, t, sub) => el('button',{class:'fl-wopt' + (FB.pendingWorld === v ? ' on' : ''), onclick:e => { FB.pendingWorld = v; e.currentTarget.parentNode.querySelectorAll('.fl-wopt').forEach(b => b.classList.toggle('on', b === e.currentTarget)); }},
    el('span',{class:'fl-wi'}, icon), el('span',{}, el('b',{}, t), el('small',{}, sub)));
  const worldPick = el('div',{class:'fl-world'}, el('div',{class:'fl-wh'}, 'How do you want to play?'),
    wopt('world', '🌍', 'Big World', 'See heroes from other families in Town Square, and wave hello'),
    wopt('solo', '🏠', 'Just our family', 'Single player: only your own kids, nobody else sees you'));

  // ---- the sign-in panel (slides up over the landing page) ----
  const auth = el('div',{class:'lp-auth' + (open ? ' open' : '') + (dayPhase() === 'night' ? '' : ' sky'), onclick:e => { if (e.target === auth) auth.classList.remove('open'); }},
    el('div',{class:'fl-card lp-panel'},
      el('button',{class:'lp-x', 'aria-label':'Close', onclick:()=>auth.classList.remove('open')}, '✕'),
      el('div',{class:'lp-pcrest', html: titleCrestSVG()}),
      el('h2',{class:'lp-ptitle'}, mode === 'up' ? 'Begin your legend' : 'Welcome back, hero'),
      el('p',{class:'fl-sub'}, mode === 'up' ? 'A grown-up creates the family account once. Then every kid taps their own hero.' : 'Grown-up sign in. You only do this once on each iPad.'),
      email, pw, mode === 'up' ? worldPick : null,
      el('button',{class:'btn big lp-go', onclick:go}, mode === 'up' ? '✨ Create family account' : '🔑 Sign in'),
      msg,
      el('div',{class:'fl-links'},
        mode === 'up' ? el('button',{class:'btn small ghost', onclick:()=>screenFamilyLogin('in', true)}, 'I have an account') : el('button',{class:'btn small ghost', onclick:()=>screenFamilyLogin('up', true)}, 'New here? Create a family account'),
        mode === 'in' ? el('button',{class:'btn small ghost', onclick:async ()=>{ if (!email.value.trim()){ msg.textContent = 'Type your email first, then tap Forgot password.'; return; }
          try { await FB.mod.reset(email.value.trim()); msg.textContent = '📧 Check your email for a link to set a new password.'; } catch(e){ msg.textContent = fbErr(e); } }}, 'Forgot password?') : null),
      Object.keys(DB.kids || {}).some(id => (DB.kids[id].sessions || []).length) ? el('button',{class:'btn small gray', onclick:()=>{ setCloudStatus('local'); screenProfiles(); }}, 'Play on this iPad without signing in') : null,
      el('p',{class:'fl-fine'}, 'We only store your email for sign-in. Kids never type an email: they use a first name and a 4-digit PIN.')));
  const openAuth = m => { beep('level'); if (m !== mode) return screenFamilyLogin(m, true); auth.classList.add('open'); setTimeout(() => email.focus(), 350); };

  // ---- art from the game itself ----
  const night = dayPhase() === 'night';
  const rider = withShowcase('boy', { hairStyle:'spiky', hairColor:'#3b2a1e' }, 'storm', () => mountSVG('phoenix', 230, true, true));
  const rider2 = withShowcase('girl', { hairStyle:'long', outfit:'dress', hairColor:'#7c3a12' }, 'frost', () => mountSVG('frostmane', 170, true, true));
  const heroA = withShowcase('girl', { hairStyle:'long', outfit:'dress', hairColor:'#7c3a12' }, 'ember', () => heroSVG(150));
  const heroB = withShowcase('boy', { hairStyle:'spiky', hairColor:'#2b1d14' }, 'celestial', () => heroSVG(150));
  const boss = (tk, n, sz) => { try { return bossArt(BOSSES[tk][n], sz, tk); } catch(e){ return ''; } };
  const weapons = ['sunspire','emberfall','starforged'].map(id => { try { return weaponIcon(id, 160); } catch(e){ return ''; } });
  const mount = id => { try { return mountSVG(id, 150, false, true); } catch(e){ return ''; } };
  const sparks = el('div',{class:'lp-sparks'}); for (let i = 0; i < 26; i++) sparks.append(el('i',{style:`left:${(i * 37) % 100}%;animation-delay:-${(i * .53).toFixed(2)}s;animation-duration:${6 + (i % 5)}s;--s:${.5 + (i % 3) * .35}`}));
  const feature = (art, title, text, cls) => el('div',{class:'lp-feat ' + (cls || '')}, el('div',{class:'lp-fart', html: art}), el('h3',{}, title), el('p',{}, text));
  const bookArt = `<svg viewBox="0 0 200 150" width="190"><defs><radialGradient id="lpbk"><stop offset="0" stop-color="#fde68a" stop-opacity=".9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient></defs>
    <circle cx="100" cy="70" r="70" fill="url(#lpbk)"/><path d="M20 110 Q60 92 100 108 Q140 92 180 110 L180 126 Q140 110 100 126 Q60 110 20 126Z" fill="#7c4a12"/>
    <path d="M24 104 Q60 84 98 102 V40 Q60 24 24 44Z" fill="#fff7e0" stroke="#c99a3a" stroke-width="3"/><path d="M176 104 Q140 84 102 102 V40 Q140 24 176 44Z" fill="#fff7e0" stroke="#c99a3a" stroke-width="3"/>
    <g stroke="#c4a46a" stroke-width="3" stroke-linecap="round"><path d="M38 52 L86 48 M38 64 L86 60 M38 76 L80 72 M114 48 L162 52 M114 60 L162 64 M114 72 L156 76"/></g>
    <g fill="#fde047"><path class="lp-tw" d="M70 18 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/><path class="lp-tw b" d="M136 10 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/><path class="lp-tw c" d="M104 4 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/></g></svg>`;

  // fresh ids: the same scene also sits (hidden) behind the game, and gradients must not point at the hidden copy
  const sceneHTML = titleSceneSVG(night).replace(/id="([^"]+)"/g, 'id="lp-$1"').replace(/url\(#([^)]+)\)/g, 'url(#lp-$1)').replace(/href="#([^"]+)"/g, 'href="#lp-$1"');
  const scene = el('div',{class:'lp-scene' + (night ? ' night' : ''), html: sceneHTML});
  const svg = scene.querySelector('svg');
  const fitScene = e => { if (!svg) return; if (e && !document.body.contains(scene)) return removeEventListener('resize', fitScene); const a = innerWidth / innerHeight;
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    if (a < 1.3){ const w = Math.max(560, 1000 * a); svg.setAttribute("viewBox", `${Math.max(0, 380 - w / 2)} 0 ${w} 1000`); } else svg.setAttribute('viewBox', '0 0 1600 1000'); };
  if (svg){ svg.removeAttribute('width'); svg.removeAttribute('height'); fitScene(); addEventListener('resize', fitScene); }
  const hero = el('section',{class:'lp-hero'},
    scene, el('div',{class:'lp-rays'}), sparks,
    el('div',{class:'lp-flyer', html: rider}), el('div',{class:'lp-flyer two', html: rider2}),
    el('div',{class:'lp-top'},
      el('div',{class:'lp-head'},
      el('div',{class:'lp-crest', html: titleCrestSVG()}),
      el('h1',{class:'lp-logo', 'data-t':'Storyborne'}, 'Storyborne'),
      el('div',{class:'lp-sub'}, '✦ Rise of the Readers ✦')),
      el('div',{class:'lp-foot'},
      el('p',{class:'lp-tag'}, 'Your voice is magic. ', el('b',{}, 'Read out loud'), ' to defeat bosses, ride dragons and become a legend.'),
      el('button',{class:'lp-cta', onclick:()=>openAuth('up')}, el('span',{}, '⚔️ Start your legend')),
      el('button',{class:'lp-link', onclick:()=>openAuth('in')}, 'Already a hero? ', el('b',{}, 'Sign in')))),
    el('a',{class:'lp-down', href:'#lp-more', onclick:e => { e.preventDefault(); document.getElementById('lp-more').scrollIntoView({ behavior:'smooth' }); }}, 'See the adventure', el('span',{}, '⌄')));
  const more = el('section',{class:'lp-more', id:'lp-more'},
    el('h2',{class:'lp-h2'}, 'Every word you read is a spell'),
    el('div',{class:'lp-feats'},
      feature(bookArt, 'Read it. Cast it.', 'Stories listen back. Read out loud and the words light up as you go.', 'gold'),
      feature(boss('son', 12, 150) + boss('daughter', 8, 150), 'Beat the bosses', 'Every level ends with a boss battle. Read your best to win!', 'red'),
      feature(mount('phoenix') + mount('voidclaw'), 'Ride legendary mounts', 'Owls, storm crows, frost beasts and a blazing phoenix. Fly them yourself.', 'blue'),
      feature(weapons.join(''), 'Win legendary weapons', 'Open treasure chests to find rare blades, bows and staffs.', 'purple'),
      feature(`<div class="lp-tower">🗼</div>`, 'Climb the Tower of Tales', '30 floors of riddles, races and guardians. How high can you climb?', 'teal'),
      feature(`<div class="lp-world">🏰🌍</div>`, 'Meet friends in town', 'See other heroes in Town Square and wave hello.', 'green')),
    el('h2',{class:'lp-h2'}, 'Two epic adventures'),
    el('div',{class:'lp-paths'},
      el('div',{class:'lp-path dragon'}, el('div',{class:'lp-pheroes', html: heroA}), el('h3',{}, '🐉 Dragon Academy'), el('p',{}, 'Dragon riders, wizard schools and castle mysteries. 12 levels of quests.')),
      el('div',{class:'lp-path pals'}, el('div',{class:'lp-pheroes', html: heroB}), el('h3',{}, '⚡ Biscuit & Pals'), el('p',{}, 'Cat bands, creature catching and detective cases. 12 levels of fun.'))),
    el('div',{class:'lp-parents'},
      el('h3',{}, 'For grown-ups'),
      el('div',{class:'lp-pgrid'},
        el('div',{}, '🎤 ', el('b',{}, 'Real reading'), el('span',{}, 'The game checks every word read aloud.')),
        el('div',{}, '📈 ', el('b',{}, 'Gets harder as they grow'), el('span',{}, 'Levels and the Tower adapt to each kid.')),
        el('div',{}, '📊 ', el('b',{}, 'Weekly reports'), el('span',{}, 'Accuracy, reading speed and tricky words.')),
        el('div',{}, '🛡️ ', el('b',{}, 'Safe'), el('span',{}, 'No ads. Kids use a first name and a PIN.')))),
    el('button',{class:'lp-cta', onclick:()=>openAuth('up')}, el('span',{}, '⚔️ Start your legend')),
    el('button',{class:'lp-link', onclick:()=>openAuth('in')}, 'Already a hero? ', el('b',{}, 'Sign in')));
  show(el('div',{class:'screen lp'}, hero, more, auth));
  if (open) setTimeout(() => email.focus(), 400);
}

/* ---------- kid PINs (a sibling lock; the family sign-in is the real protection) ---------- */
async function pinHash(id, pin){
  const txt = 'rq:' + id + ':' + pin;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch(e){ let h = 5381; for (const c of txt) h = (h * 33 + c.charCodeAt(0)) >>> 0; return 'd' + h.toString(16); }
}
function screenKidPin(id){
  stopAll(); setKidTheme(id);
  let entered = '';
  const P = playerOf(id), D = DB.kids[id];
  const dots = el('div',{class:'pin-dots'},'○○○○');
  const msg = el('p',{class:'muted'}, `Hi ${P.name}! Type your secret PIN.`);
  const pad = el('div',{class:'pad'});
  const press = async d => {
    if (d === '⌫') entered = entered.slice(0,-1); else if (entered.length < 4) entered += d;
    dots.textContent = '●'.repeat(entered.length) + '○'.repeat(4-entered.length); beep('tap');
    if (entered.length === 4){
      if (await pinHash(id, entered) === P.pin){ beep('star'); enterKid(id); }
      else { msg.textContent = 'Oops, not that one. Try again!'; beep('bad'); entered = ''; dots.classList.add('shake'); setTimeout(()=>{ dots.textContent='○○○○'; dots.classList.remove('shake'); }, 400); }
    }
  };
  ['1','2','3','4','5','6','7','8','9','','0','⌫'].forEach(d => pad.append(d ? el('button',{onclick:()=>press(d)}, d) : el('div')));
  show(el('div',{class:'screen kidpin-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:screenProfiles},'← Back'), el('div')),
    el('div',{class:'card center kidpin-card'},
      D.hero ? profileHero(id) : el('div',{class:'big-e'}, trackOf(id) === 'son' ? '🐲' : '🐰'),
      el('h2',{}, P.name), msg, dots, pad,
      el('button',{class:'btn small gray', onclick:()=>screenPin(() => screenPlayerEdit(id))}, 'Forgot PIN? Ask a grown-up'))));
}
function setKidTheme(id){ document.body.className = 'theme-' + trackOf(id); }

/* ---------- grown-ups: all players ---------- */
const lastPlayed = D => { const d = (D.sessions || [])[0]; return d ? d.date.slice(0, 10) : (D.today && D.today.date) || null; };
const ago = d => { if (!d) return 'Not yet'; const n = Math.round((new Date(todayStr()) - new Date(d)) / 86400000); return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n + ' days ago'; };
function screenPlayers(){
  stopAll(); document.body.className = 'parent';
  const ids = playerIds(false), removed = Object.keys(DB.players).filter(id => DB.players[id].removed);
  const weekAgo = Date.now() - 7*86400000;
  const card = id => { const D = DB.kids[id], P = DB.players[id], tr = trackOf(id), wk = (D.sessions || []).filter(s => s.mode === 'normal' && new Date(s.date).getTime() > weekAgo);
    return el('div',{class:'pl-card'},
      el('div',{class:'pl-hero'}, D.hero ? profileHero(id) : el('div',{class:'big-e'}, tr === 'son' ? '🐲' : '🐰')),
      el('div',{class:'pl-info'},
        el('h3',{}, P.name, el('span',{class:'pl-track'}, TRACK_INFO[tr].icon + ' ' + TRACK_INFO[tr].name)),
        el('div',{class:'pl-stats'},
          el('span',{}, `${TRACK_INFO[tr].word} ${D.level}`), el('span',{}, `⭐ ${(D.stars||0) - (D.spent||0)}`), el('span',{}, `🏆 ${(D.trophies||[]).length}`),
          el('span',{}, `📖 ${wk.length} reads this week`), el('span',{}, `🕒 ${ago(lastPlayed(D))}`), el('span',{}, P.pin ? '🔒 PIN set' : '🔓 No PIN')),
        el('div',{class:'row pl-btns'},
          el('button',{class:'btn small blue', onclick:()=>screenParent(id)}, '📊 Progress'), (typeof CURR !== 'undefined' ? el('button',{class:'btn small green', onclick:()=>v2Parent(id)}, '🧠 Skills') : null),
          el('button',{class:'btn small', onclick:()=>screenPlayerEdit(id)}, '✏️ Edit')))); };
  show(el('div',{class:'screen', style:'max-width:1000px'},
    el('div',{class:'row', style:'justify-content:space-between;margin-bottom:12px'},
      el('h1',{style:'margin:0;font-size:30px'},'👨‍👩‍👧 Players'),
      el('div',{class:'row', style:'gap:8px'},
        isCreator() ? el('button',{class:'btn small creator-btn', onclick:screenCreator},'👑 Creator dashboard') : null,
        el('button',{class:'btn small', onclick:()=>{ document.body.className=''; screenProfiles(); }},'Done'))),
    familyCard(),
    el('div',{class:'pl-list'}, ...ids.map(card)),
    el('div',{class:'row', style:'gap:10px;margin:14px 0;flex-wrap:wrap'},
      el('button',{class:'btn big green', onclick:()=>screenPlayerEdit(null)}, '➕ Add a player'),
      el('button',{class:'btn big blue', onclick:screenReport}, '📧 Weekly report')),
    removed.length ? el('div',{class:'card'}, el('h3',{style:'margin-top:0'}, 'Removed players'), el('p',{class:'muted'}, 'Their progress is kept. Restore them any time.'),
      ...removed.map(id => el('div',{class:'row'}, el('b',{}, DB.players[id].name), el('button',{class:'btn small', onclick:()=>{ delete DB.players[id].removed; ensurePlayerData(); save(); screenPlayers(); }}, '↩️ Restore')))) : null,
    el('div',{class:'card'}, el('h3',{style:'margin-top:0'}, '🧙 Wizard Mode'), el('p',{class:'muted'}, 'A secret grown-up player for testing: everything free, any track or level. Only shows on a device where you turn it on.'),
      el('button',{class:'btn small', onclick:()=>{ DB.devOn = true; save(); enterKid('dev'); }}, DB.devOn ? 'Open Wizard' : 'Turn on'))));
}
function familyCard(){
  if (!familyMode()) return el('div',{class:'card fam-card'}, el('b',{}, '📱 Saved on this device'), el('p',{class:'muted', style:'margin:4px 0 0'}, 'Family accounts turn on once the Firebase setup is connected.'));
  if (!FB.user) return el('div',{class:'card fam-card'}, el('b',{}, '☁️ Not signed in'), el('button',{class:'btn small', onclick:()=>screenFamilyLogin('in')}, 'Sign in'));
  const wm = DB.worldMode || 'world';
  return el('div',{class:'card fam-card'}, el('div',{}, el('b',{}, '☁️ Family account: ' + FB.user.email), el('div',{class:'muted'}, 'Progress saves to the cloud and shows up on every device you sign in on.'),
      el('div',{class:'row', style:'gap:8px;margin-top:8px;flex-wrap:wrap'},
        el('button',{class:'btn small' + (wm === 'world' ? '' : ' gray'), onclick:()=>{ setWorldMode('world'); screenPlayers(); }}, '🌍 Big World' + (wm === 'world' ? ' ✓' : '')),
        el('button',{class:'btn small' + (wm === 'solo' ? '' : ' gray'), onclick:()=>{ setWorldMode('solo'); screenPlayers(); }}, '🏠 Just our family' + (wm === 'solo' ? ' ✓' : '')))),
    el('button',{class:'btn small gray', onclick:async ()=>{ const ok = await modal(el('div',{}, el('h2',{},'Sign out of this iPad?'), el('p',{},'Everyone\'s progress stays safe in your family account. This iPad will ask for the grown-up sign-in again.')), [['Cancel','gray',false],['Sign out','',true]]);
      if (!ok) return; try { await FB.mod.signOut(); } catch(e){} localStorage.removeItem(STORE_KEY); location.reload(); }}, 'Sign out'));
}
function screenPlayerEdit(id){
  stopAll(); document.body.className = 'parent';
  const P = id ? DB.players[id] : { name:'', track:'son', style:'boy' };
  const name = el('input',{type:'text', placeholder:'First name', value:P.name, maxlength:'20'});
  let track = P.track, style = P.style, quiz = P.quiz || (P.track === 'daughter' ? 'challenge' : 'standard'), ear = P.ear || (P.track === 'son' ? 'kind' : 'normal');
  const pick = (opts, cur, set) => { const wrap = el('div',{class:'pe-opts'}); opts.forEach(([v, big, small]) => { const b = el('button',{class:'pe-opt' + (cur === v ? ' on' : ''), onclick:()=>{ set(v); [...wrap.children].forEach(x => x.classList.toggle('on', x === b)); beep('tap'); }}, el('b',{}, big), el('small',{}, small)); wrap.append(b); }); return wrap; };
  const pin = el('input',{type:'password', inputmode:'numeric', maxlength:'4', placeholder: id && P.pin ? 'New PIN (leave blank to keep)' : '4-digit PIN (optional)'});
  const msg = el('p',{class:'muted'});
  const saveIt = async () => {
    const n = name.value.trim().replace(/[^\p{L} '\-]/gu, '').slice(0, 20);
    if (!n){ msg.textContent = 'Type a first name.'; return; }
    if (pin.value && !/^\d{4}$/.test(pin.value)){ msg.textContent = 'The PIN must be exactly 4 numbers.'; return; }
    let pid = id;
    if (!pid){ pid = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); DB.players[pid] = { order: 10 + Object.keys(DB.players).length, created: todayStr() }; }
    Object.assign(DB.players[pid], { name:n, track, style, quiz, ear });
    if (pin.value) DB.players[pid].pin = await pinHash(pid, pin.value);
    ensurePlayerData(); CLOUD.dirty[pid] = true; save(); cloudSubscribeAll(); beep('star');
    if (!id) await modal(el('div',{}, el('div',{class:'big-e'},'🎉'), el('h2',{}, `${n} joined Storyborne!`), el('p',{}, `${n} can now tap their hero on the "Who is reading?" screen` + (pin.value ? ' and type their PIN.' : '.'))), [['Great ▶','',1]]);
    screenPlayers();
  };
  show(el('div',{class:'screen', style:'max-width:760px'},
    el('div',{class:'row', style:'justify-content:space-between;margin-bottom:12px'}, el('h1',{style:'margin:0;font-size:28px'}, id ? '✏️ Edit ' + P.name : '➕ New player'), el('button',{class:'btn small gray', onclick:screenPlayers},'Cancel')),
    el('div',{class:'card pe-card'},
      el('h3',{}, 'First name'), name,
      el('h3',{}, 'Reading track'), pick([['son', '🐲 ' + TRACK_INFO.son.name, TRACK_INFO.son.ages], ['daughter', '🐉 ' + TRACK_INFO.daughter.name, TRACK_INFO.daughter.ages]], track, v => track = v),
      id && track !== P.track ? null : null,
      el('h3',{}, 'Starter outfit'), pick([['girl','👗 Blossom','Pink dress & hair bow'], ['boy','🧢 Explorer','Blue jacket & red scarf']], style, v => style = v),
      el('h3',{}, 'Story questions'), pick([['standard','🙂 Standard','Questions as written'], ['challenge','🧠 Challenge','Tricky choices, order of events, spot the fake. Chapter-book readers move up to Expert at Rank 5'], ['expert','🔥 Expert','Who said it, 4-event order, spot the changed detail, word meanings, all from memory']], quiz, v => quiz = v),
      el('h3',{}, 'Listening'), pick([['kind','👂 Extra forgiving','Best for young readers & quiet voices'], ['normal','🎯 Normal','Closer check of each word']], ear, v => ear = v),
      el('h3',{}, 'Kid PIN'), pin, el('p',{class:'muted'}, 'Kids type this after tapping their hero, so siblings don\'t play as each other. Forgot it? Set a new one here.'),
      id && P.pin ? el('button',{class:'btn small gray', onclick:()=>{ delete DB.players[id].pin; save(); msg.textContent = 'PIN removed.'; }}, 'Remove PIN') : null,
      el('div',{class:'row', style:'margin-top:14px'}, el('button',{class:'btn big', onclick:saveIt}, id ? '💾 Save' : '✨ Add player'),
        id && !P.wizard ? el('button',{class:'btn small gray', onclick:async ()=>{ const ok = await modal(el('div',{}, el('h2',{}, `Remove ${P.name}?`), el('p',{}, `${P.name} disappears from the "Who is reading?" screen. Their progress is kept, and you can restore them from the Players page.`)), [['Cancel','gray',false],['Remove','',true]]);
          if (ok){ DB.players[id].removed = true; save(); screenPlayers(); } }}, '🗑️ Remove player') : null),
      msg)));
}

function burst(word){
  const b = el('div',{class:'pow'}, word || pick(['POW!','ZAP!','WHAM!','BOOM!','YES!','WOW!']));
  document.body.append(b); setTimeout(()=>b.remove(), 1100);
}
function confetti(n=70){
  const colors = ['#f97316','#22c55e','#3b82f6','#eab308','#ec4899','#a855f7'];
  for (let i=0;i<n;i++){
    const c = el('div',{class:'confetti'});
    c.style.left = Math.random()*100 + 'vw'; c.style.background = colors[i%colors.length];
    c.style.animationDuration = (2 + Math.random()*2) + 's'; c.style.animationDelay = (Math.random()*0.6)+'s';
    document.body.append(c); setTimeout(()=>c.remove(), 5000);
  }
}
function modal(content, buttons){
  return new Promise(res => {
    const ov = el('div',{class:'overlay'});
    const m = el('div',{class:'modal'}, content);
    const row = el('div',{class:'row center', style:'margin-top:20px'});
    buttons.forEach(([label, cls, val]) => row.append(el('button',{class:'btn '+(cls||''), onclick:()=>{ ov.remove(); res(val); }}, label)));
    m.append(row); ov.append(m); document.body.append(ov);
  });
}

/* Biscuit SVG (original character: orange cat in a red cap) */
function biscuitSVG(){
  return `<svg viewBox="0 0 200 200" class="mascot" aria-label="Biscuit the cat">
  <path d="M40 80 L52 22 L88 60 Z" fill="#fb923c" stroke="#7c2d12" stroke-width="5" stroke-linejoin="round"/>
  <path d="M160 80 L148 22 L112 60 Z" fill="#fb923c" stroke="#7c2d12" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="100" cy="112" rx="70" ry="62" fill="#fdba74" stroke="#7c2d12" stroke-width="5"/>
  <path d="M60 70 Q100 30 140 70 L140 78 L60 78 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="5" stroke-linejoin="round"/>
  <path d="M136 74 Q170 74 176 86 L138 84 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="5" stroke-linejoin="round"/>
  <path d="M70 105 q12 -10 24 0" fill="none" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>
  <path d="M106 105 q12 -10 24 0" fill="none" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>
  <path d="M92 124 L108 124 L100 133 Z" fill="#f472b6"/>
  <path d="M100 133 q-10 14 -22 6 M100 133 q10 14 22 6" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>
  <path d="M40 120 L68 124 M40 136 L68 132 M160 120 L132 124 M160 136 L132 132" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
  <path d="M74 92 q6 -4 10 2 M116 92 q6 -4 10 2" stroke="#ea580c" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;
}
function mascotNode(){
  if (TK === 'son'){ const d = el('div',{html:biscuitSVG()}); return d.firstElementChild; }
  return el('div',{class:'mascot emoji'},'🐲');
}

/* ================= SCREENS ================= */

function screenProfiles(){
  CLOUD.editing = null;
  document.body.className = '';
  stopAll();
  // the same epic vista as the title screen (day or night), softly blurred behind the hero cards
  const hr = new Date().getHours(), night = hr >= 19 || hr < 6;
  const s = el('div',{class:'screen epic-picker' + (night ? ' night' : '')},
    el('div',{class:'ep-head'},
      el('div',{class:'ep-crest', html: titleCrestSVG()}),
      el('h1',{class:'ep-title'}, 'Storyborne'),
      el('div',{class:'ep-sub'}, '✦ Rise of the Readers ✦'),
      el('div',{class:'ep-choose'}, 'Choose your hero')),
    el('div',{class:'profiles'}, ...playerIds(true).map(id => { const D = DB.kids[id], P = DB.players[id], tr = trackOf(id);
      const T2 = TRACKS[tr], lv = D.placed ? Math.min(D.level || 1, T2.levels.length) : 0, Lv = lv ? T2.levels[lv - 1] : null;
      return el('button',{class:'profile hero-card ' + (P.wizard ? 'wizard' : tr), onclick:()=>{ beep('tap'); pickPlayer(id); }},
        el('div',{class:'hc-rank'}, P.wizard ? '✦ Master Developer ✦' : lv ? `${tr === 'daughter' ? 'Rank' : 'Level'} ${lv} · ${Lv.title}` : '✦ New Hero ✦'),
        el('div',{class:'hc-stage'}, el('div',{class:'hc-glow'}), el('div',{class:'hc-ped'}),
          D.hero ? profileHero(id, 165) : D.avatar.base ? el('div',{html: avatarSVG(D.avatar, 120)}) : el('div',{class:'pic'}, P.wizard ? '🧙' : tr === 'son' ? '🐲' : '🐰')),
        el('div',{class:'hc-name'}, kidName(id)),
        el('small',{}, P.wizard ? 'Everything unlocked' : (P.pin ? '🔒 ' : '') + TRACK_INFO[tr].sub),
        P.wizard ? null : el('div',{class:'hc-stats'}, el('span',{}, '⭐ ' + Math.max(0, (D.stars || 0) - (D.spent || 0))), el('span',{}, '🏆 ' + ((D.trophies || []).length)), el('span',{}, '💫 ' + Math.max(0, (D.cosmic || 0) - (D.cosmicSpent || 0))), D.tower && D.tower.best ? el('span',{}, '🗼 ' + D.tower.best) : null),
        el('div',{class:'hc-go'}, '▶ Begin')); }),
      playerIds(false).length ? null : el('button',{class:'profile hero-card add-player', onclick:()=>screenPin(() => screenPlayerEdit(null))}, el('div',{class:'hc-rank'}, '✦ A New Legend ✦'), el('div',{class:'hc-stage'}, el('div',{class:'hc-glow'}), el('div',{class:'hc-ped'}), el('div',{class:'pic'},'➕')), el('div',{class:'hc-name'}, 'Add a player'), el('small',{}, 'A grown-up sets up each reader'))),
    cloudStatusNode(),
    el('button',{class:'gear', onclick:()=>screenPin()},'⚙︎ Grown-ups')
  );
  show(s);
  onCloudUpdate = () => screenProfiles();
}

// back to the "Who is reading today?" screen
function homeBtn(){ return el('button',{class:'btn small home-btn', onclick:()=>{ beep('tap'); screenProfiles(); }},'🏠 Home'); }

// tapping a hero: kids with a PIN type it first
function pickPlayer(id){
  const P = playerOf(id);
  if (P && P.wizard) return screenPin(() => enterKid(id));
  if (P && P.pin) return screenKidPin(id);
  enterKid(id);
}
function heroArt3Migrate(){
  if (!K || !K.hero || K.hero.av3 || HERO_CLASSIC) return;
  const girl = heroKidKey() === 'daughter';
  K.hero.av3 = 1; K.hero.hairColor = girl ? '#7c3aed' : '#1f1b18'; if (girl) K.hero.hairStyle = 'short'; save();
}
function enterKid(k){
  if (k === 'dev'){ DB.devOn = true; DB.players.dev = DB.players.dev || { name:DB.devName || 'The Wizard', track:'daughter', style:'boy', wizard:true, order:99 }; DB.kids.dev = DB.kids.dev || freshKid(); DB.kids.dev.avatar = Object.assign({ base:null, owned:[], equipped:{} }, DB.kids.dev.avatar || {}); }
  setKid(k);
  if (k === 'dev') wizardSetup();
  // Biscuit & Pals grew from 8 to 12 levels: a reader who already beat the old final boss moves on to level 9
  if (K.placed && K.level === 8 && T.levels.length > 8 && (K.bossesBeaten || []).includes(8) && !K.grew12){
    K.grew12 = true; K.level = 9; K.passStreak = 0; awardTrophiesUpTo(9); awardChest('cosmic', 'Level up'); save();
    setTimeout(() => { levelUpCinematic(9, { newLevels:true, cosmic:false }).then(() => screenHome()); }, 700);
  }
  // Gianna reads quietly, so she skips the read-aloud placement check (a grown-up can set her rank)
  if (!K.placed && trackOf(k) === 'daughter'){ K.placed = true; K.level = K.level || 1; awardTrophiesUpTo(K.level); save(); }
  try { heroArt3Migrate(); } catch(e){}
  if (!K.placed) screenPlacementIntro(); else if (!K.avatar.base) screenAvatarPick(); else screenHome();
}

function seriesAt(levelN){
  const L = levelDef(levelN);
  if (!L.stories || !L.stories.length) return [];
  return [...new Set(L.stories.map(s => s.series))];
}
function storyFor(levelN, series){
  const L = levelDef(levelN);
  if (!L.stories || !L.stories.length) return null;
  series = series || seriesAt(levelN)[0];
  const key = levelN + '_' + series;
  // never hand back a story the child read recently if another fits: rank by "how long ago was this read"
  const recent = new Map(); (K.sessions || []).forEach((s, i) => { if (s.title && !recent.has(s.title)) recent.set(s.title, i); });
  const fit = storyFit();                                         // -1 easier, 0 on level, +1 ready to stretch
  const levelsTried = [levelN, levelN + fit, levelN - 1, levelN + 1].filter((v, i, a) => a.indexOf(v) === i && v >= 1 && v <= T.levels.length);
  const cands = [];
  levelsTried.forEach((lv, li) => {
    const LL = levelDef(lv); (LL.stories || []).forEach((st, idx) => {
      if (st.series !== series && lv !== levelN) return;           // other levels: same series only
      if (st.series !== series) return;
      cands.push({ st, lv, idx, order:li });
    });
  });
  const start = (K.storyIdx[key] || 0);
  const unread = cands.filter(c => !recent.has(c.st.title));
  let pickC;
  if (unread.length){
    // prefer the calibrated level, then rotation order within it
    const prefLv = fit && unread.some(c => c.lv === levelN + fit) ? levelN + fit : unread.some(c => c.lv === levelN) ? levelN : unread[0].lv;
    const atLv = unread.filter(c => c.lv === prefLv);
    pickC = atLv.find(c => c.lv !== levelN || c.idx >= start % Math.max(1, atLv.length)) || atLv[0];
  } else pickC = cands.slice().sort((a, b) => recent.get(b.st.title) - recent.get(a.st.title))[0];   // all read: the one read longest ago
  if (!pickC){ const list = L.stories.filter(x => x.series === series); return { story:list[0], index:0, key, series }; }
  return { story: pickC.st, index: pickC.idx, key, series, stretch: pickC.lv - levelN };
}
/* reading calibration from the last few stories at this level: accuracy (read aloud) + questions */
function storyFit(){
  const rec = (K.sessions || []).filter(s => s.kind === 'story' && s.mode === 'normal').slice(0, 4);
  if (rec.length < 3) return 0;
  const acc = rec.reduce((t, s) => t + (s.accuracy || 0), 0) / rec.length;
  const qz = rec.map(s => s.quiz ? s.quiz.split('/').map(Number) : null).filter(Boolean);
  const q = qz.length ? qz.reduce((t, [a, b]) => t + a / b, 0) / qz.length : 1;
  if (acc >= 95 && q >= .8) return 1;
  if (acc < 85 || q < .6) return -1;
  return 0;
}

/* ---- home navigation: three clear groups instead of one long row of buttons ---- */
function homeNav(){
  const tile = (icon, label, go, extra) => el('button',{class:'hn-tile' + (extra && extra.cls ? ' ' + extra.cls : ''), onclick:()=>{ beep('tap'); go(); }},
    el('span',{class:'hn-ic'}, icon), el('span',{class:'hn-lb'}, label), extra && extra.badge ? el('span',{class:'hn-badge'}, extra.badge) : null);
  let unread = 0; try { unread = WZ().letters.filter(l => !l.read).length; } catch(e){}
  const pw = typeof PW === 'function' ? PW() : null;
  const group = (cls, title, ...tiles) => el('div',{class:'hn-group ' + cls}, el('div',{class:'hn-title'}, title), el('div',{class:'hn-tiles'}, ...tiles));
  return el('nav',{class:'home-nav'},
    group('hn-explore', '🌍 Explore',
      tile('🏰', 'Town Square', screenTownSquare, { cls:'big' }),
      tile('🏗️', 'My World', screenWorld),
      tile('🕯️', 'Great Hall', screenGreatHall, { badge: unread ? '🦉' + unread : null })),
    group('hn-challenge', '⚔️ Challenges',
      tile('🗼', 'Tower of Tales', screenTower, { cls:'big' }),
      tile(pw ? '⚡' : K.level >= 5 ? '⚡' : '🔒', pw ? 'My Power' : 'Path of Powers', screenPowers, { cls: K.level >= 5 || pw ? '' : 'locked' }),
      typeof v2Start === 'function' ? tile('🗺️', 'Skill Quest', v2Start) : null,
      tile('📚', 'Real Books', screenRealBooks)),
    group('hn-rewards', '🎁 Rewards',
      tile('🛍️', 'Shop', screenShop),
      tile('🛡️', 'Armory', screenArmory),
      tile('🪽', 'Stables', screenStables),
      tile(TK === 'daughter' ? '🐉' : '📖', TK === 'daughter' ? 'My Dragons' : 'Pals', screenCollection),
      tile('🏆', 'Trophies', screenTrophies)));
}

function screenHome(msg){
  stopAll();
  { const h = $('.boss-hud'); if (h) h.remove(); }
  if (!K.avatar.base || !AVATAR_BASES[K.avatar.base] || !AVATAR_BASES[K.avatar.base].kid) return screenAvatarPick();
  if (!K.hero) return screenHeroCreate();
  if (awardTrophiesUpTo(K.level).length) save();
  if (K.giftMsg){ msg = msg ? K.giftMsg + ' ' + msg : K.giftMsg; delete K.giftMsg; save(); confetti(80); beep('level'); }
  const L = levelDef(K.level);
  const max = T.levels.length;
  const today = K.today.date === todayStr() ? K.today.ms : 0;
  const doneToday = today >= goalMs();
  const todo = practiceWords(K);
  const rankWord = TK==='daughter' ? 'Rank' : 'Level';
  // one card per story series available at this level (or one card for word/letter rounds)
  const cards = [];
  if (bossReady()) cards.push(bossCard());
  if (TK === 'daughter'){
    // Gianna: three sections, read quietly, 5 questions each
    const st = nextQuietStory(), book = currentBook(), bs = book && bookState(book.id);
    cards.push(
      choiceCard(),
      book ? el('div',{class:'card next-card series-card'},
        el('div',{class:'series-tag'},'📚 Chapter Books'), COUNTS_TAG(),
        el('h2',{}, book.emoji + ' ' + book.title),
        el('p',{}, `Chapter ${bs.ch + 1} of ${book.chapters.length}: ${book.chapters[bs.ch].title}`),
        el('div',{class:'chapter-dots', style:'margin:-8px 0 14px'}, ...book.chapters.map((_, i) => el('span',{class:'dot' + (i < bs.ch ? ' on' : '')}))),
        el('div',{class:'row'},
          el('button',{class:'btn big', onclick:()=>{ beep('tap'); startChapter(book, bs.ch); }}, bs.ch ? '▶ Keep reading' : '▶ Start'),
          el('button',{class:'btn small blue', onclick:()=>{ beep('tap'); screenBookshelf(); }},'📚 Bookshelf'))) : null,
      el('div',{class:'card next-card spell-card'},
        el('div',{class:'series-tag'},'✏️ Spelling Check'),
        el('h2',{},'Spelling Check'),
        el('p',{},'Hear a word, then type it. 8 words · +1 ⭐ for each one you spell right.'),
        el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startSpellCheck(); }},'✏️ Start')));
  }
  if (TK !== 'daughter' && L.kind !== 'story') cards.push(el('div',{class:'card next-card'},
      el('div',{class:'series-tag'}, L.kind === 'letters' ? '🔤 Practice' : '⭐ Practice'), COUNTS_TAG(),
      el('h2',{}, L.kind === 'letters' ? 'Letter Sounds Round' : L.title + ' Round'), el('p',{}, L.intro),
      el('button',{class:'btn big', onclick:()=>{ beep('tap'); startActivity(); }},'▶ Start')));
  if (TK !== 'daughter'){ const cc = choiceCard(); if (cc) cards.push(cc); }
  if (TK !== 'daughter' && todo.length) cards.push(el('div',{class:'card next-card practice-card'},
    el('div',{class:'series-tag'},'🎯 My Words'),
    el('h2',{}, `${todo.length} tricky word${todo.length>1?'s':''} to practice`),
    el('p',{}, todo.slice(0,6).map(w => K.words[w].disp||w).join(' · ')),
    el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startPractice(); }},'💪 Practice')));
  if (TK !== 'daughter' && spellWords().length) cards.push(el('div',{class:'card next-card spell-card'},
    el('div',{class:'series-tag'},'✏️ Spelling'),
    el('h2',{},'Spelling Practice'),
    el('p',{},'Hear a word, then build it with letter tiles! +1 ⭐ for each word you spell on the first try.'),
    el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); startSpelling(); }},'✏️ Spell')));
  cards.push(spellCard());
  const avatar = K.hero ? riderNode(150) : avatarNode(150);
  avatar.classList.add('mascot-av');
  avatar.onclick = () => K.hero ? screenArmory() : screenShop();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      homeBtn(),
      el('div',{class:'row'},
        isDev() ? el('button',{class:'btn small wizard-btn', onclick:()=>{ beep('tap'); screenWizard(); }},'🧙 Wizard') : null,
        null)),
    el('div',{class:'hero'}, avatar,
      el('div',{class:'grow'},
        el('h1',{class:'title'}, `Hi, ${kidName()}!`),
        el('p',{class:'subtitle'}, `${rankWord} ${K.level}: ${L.title}`),
        el('div',{class:'tier-track'}, ...T.levels.map((Lv,i) => { const n = i+1, tr = TROPHIES[TK][i];
          return el('div',{class:'tier' + (n < K.level ? ' done' : n === K.level ? ' now' : '')}, el('span',{class:'tier-n'}, n), el('span',{class:'tier-e'}, n <= K.level ? tr[0] : '🔒')); })),
        el('div',{class:'stats'},
          el('span',{class:'pill'},'⭐ ' + balance()),
          el('span',{class:'pill cosmic-pill', onclick:()=>cosmicInfo()},'💫 ' + cosmicBal()),
          el('span',{class:'pill chest-pill' + (chestCount() ? ' has' : ''), onclick:()=>screenChests()},'🎁 ' + (isDev() ? '∞' : chestCount())),
          el('span',{class:'pill'},'🔥 ' + (K.streak.count||0) + ' day streak'),
          el('span',{class:'pill'},'🏆 ' + K.trophies.length + ' · 🎖️ ' + K.badges.length),
          el('span',{class:'pill'},(TK==='daughter'?'🐉 ':'🐾 ') + K.collection.length)),
        levelProgress(), goalBar())),
    homeNav(),
    msg ? el('div',{class:'banner'}, msg) : null,
    doneToday ? el('div',{class:'banner'},`🎉 Great reading today! You reached your goal of ${goalMin()} minutes. You can stop here, or keep going!`) : null,
    el('div',{class:'cards'}, ...cards),
    useManual() ? el('div',{class:'banner'}, srSupported ? 'Grown-up scoring mode is on.' : 'This browser can\'t listen, so a grown-up will tap any words that are missed. (Open in Safari on an https site for listening mode.)') : null,
    cloudStatusNode(),
    el('button',{class:'gear', onclick:()=>screenPin()},'⚙︎ Grown-ups')
  );
  show(s);
  onCloudUpdate = () => screenHome();
}

/* ---------- daily reading goal ----------
   A grown-up sets minutes per day for each kid (default 10). Time from stories, lessons and spelling
   adds up; the day streak grows once per day when the goal is reached. */
const MAX_ACTIVITY_MS = 20 * 60 * 1000; // an app left open doesn't count as an hour of reading
const goalMin = k => ((DB.goalMin || {})[k || kid]) || 10;
const goalMs = () => goalMin() * 60000;
const todayMs = () => K.today.date === todayStr() ? K.today.ms : 0;
function addReadingTime(ms){
  if (K.today.date !== todayStr()) K.today = { date: todayStr(), ms: 0, goalHit: false };
  K.today.ms += Math.max(0, ms);
  if (K.today.goalHit || K.today.ms < goalMs()) return false;
  K.today.goalHit = true;
  if (K.streak.last !== todayStr()){
    const y = new Date(); y.setDate(y.getDate() - 1);
    K.streak.count = K.streak.last === todayStr(y) ? (K.streak.count || 0) + 1 : 1;
    K.streak.last = todayStr();
  }
  return true;
}
async function celebrateGoal(){
  K.stars += 3; save();
  confetti(90); beep('level'); say(`You reached your reading goal! ${K.streak.count} day streak!`);
  await modal(el('div',{}, el('div',{class:'big-e'},'🔥'), el('h2',{}, 'Daily goal done!'),
    el('p',{}, `${goalMin()} minutes of reading today · ${K.streak.count}-day streak · +3 ⭐`)), [['Yay! ▶','',1]]);
}
function goalBar(){
  const min = Math.floor(todayMs() / 60000), goal = goalMin(), pct = Math.min(100, Math.round(todayMs() / goalMs() * 100));
  return el('div',{class:'goal-bar'}, el('span',{}, pct >= 100 ? `✅ Goal done: ${min} min today!` : `⏱️ ${min} of ${goal} min today`),
    el('div',{class:'goal-track'}, el('div',{class:'goal-fill', style:`width:${pct}%`})));
}

// How close the kid is to the next level: 3 great (3-star) reads level up; a rough read takes one away (see commitResults).
const LEVEL_UP_STREAK = 3;
function levelProgress(){
  const word = TK==='daughter' ? 'Rank' : 'Level';
  if (K.level >= T.levels.length && (K.bossesBeaten||[]).includes(K.level)) return el('div',{class:'lvl-progress'}, el('div',{class:'lvl-tip'}, `👑 You beat the final boss! Reading legend!`));
  const have = Math.min(K.passStreak||0, LEVEL_UP_STREAK), left = LEVEL_UP_STREAK - have;
  return el('div',{class:'lvl-progress'},
    el('div',{class:'lvl-head'}, el('span',{}, `${word} ${K.level}`), el('span',{}, bossFor(K.level) ? `${bossFor(K.level).e} ${K.level >= T.levels.length ? 'Final boss 👑' : 'Boss → ' + word + ' ' + (K.level+1)}` : `${word} ${K.level+1} 🔓`)),
    el('div',{class:'lvl-bar'}, ...Array.from({length:LEVEL_UP_STREAK}, (_,i) => el('div',{class:'lvl-seg' + (i < have ? ' on' : '')}, i < have ? '⭐⭐⭐' : ''))),
    el('div',{class:'lvl-tip'}, TK === 'daughter'
      ? (bossReady() ? (K.level >= T.levels.length ? '⚔️ The final boss is waiting! Beat it to become a Reading Legend.' : `⚔️ The boss is waiting! Beat it to reach ${word} ${K.level+1}.`) : `${left} more stor${left>1?'ies':'y'} with 4 or 5 questions right to face the boss!`)
      : (bossReady() ? (K.level >= T.levels.length ? '⚔️ The final boss is waiting! Beat it to become a Reading Legend.' : `⚔️ The boss is waiting! Beat it to reach ${word} ${K.level+1}.`) : `${left} more ⭐⭐⭐ read${left>1?'s':''} to face the boss!`)),
    bossReady() ? null : el('div',{class:'lvl-rule'}, '⭐⭐⭐ = ' + greatRule().short),
    el('button',{class:'btn small lvl-how', onclick:()=>{ beep('tap'); levelGuide(); }},'❓ How do I level up?'));
}

// What a ⭐⭐⭐ (great) read means at the kid's current level, in kid words (matches starsFor in screenResults).
function greatRule(){
  const L = levelDef(K.level);
  if (TK === 'daughter') return { short:'4 or 5 of the 5 questions right', long:'Get 4 or 5 of the 5 questions right.' };
  if (L.kind === 'letters'){ const n = Math.ceil(L.pass * L.roundSize - 1e-9); return { short:`${n} of ${L.roundSize} letter sounds right`, long:`Say at least ${n} of the ${L.roundSize} letter sounds right.` }; }
  if (L.kind === 'words'){ const n = Math.ceil(L.pass * L.roundSize - 1e-9); return { short:`${n} of ${L.roundSize} words right`, long:`Read at least ${n} of the ${L.roundSize} words right.` }; }
  return { short:'4 or 5 of the 5 questions right', long:'Read the whole story out loud, then get 4 or 5 of the 5 questions right.' };
}
const COUNTS_TAG = () => el('span',{class:'counts-tag'},'⬆️ Levels you up');

// Step-by-step "how to level up" guide, with the kid's own progress, read aloud for Miles.
function levelGuide(){
  const word = TK === 'daughter' ? 'Rank' : 'Level', next = K.level + 1, rule = greatRule();
  const have = Math.min(K.passStreak||0, LEVEL_UP_STREAK), boss = bossFor(K.level), ready = bossReady();
  const L = levelDef(K.level);
  const round = L.kind === 'letters' ? 'Letter Sounds Round' : L.title + ' Round';
  // word/letter levels can also have story cards, which use the story rule
  const how = TK === 'daughter' ? `Read a Short Story or a Chapter Book. ${rule.long}`
    : L.kind === 'story' ? `Read a story card. ${rule.long}`
    : `In the ${round}: ${rule.long.replace(/^./, c => c.toLowerCase())}` + (seriesAt(K.level).length ? ' In a story: read it out loud, then get 4 or 5 of the 5 questions right.' : '');
  const steps = [
    ['⭐⭐⭐', `Tap a card with the ⬆️ Levels you up sticker and get 3 stars. ${how}`, have > 0 || ready ? 'done' : 'now'],
    ['3️⃣', `Do that 3 times. You have ${ready ? LEVEL_UP_STREAK : have} of ${LEVEL_UP_STREAK}.`, ready ? 'done' : have > 0 ? 'now' : 'todo'],
    boss ? [boss.e, `Beat the boss, ${boss.name}! It shows up at the top of your page.`, ready ? 'now' : 'todo'] : null,
    ['🏆', `You reach ${word} ${next}!`, 'todo']
  ].filter(Boolean);
  const notes = [
    '⭐⭐ Good read: your star boxes stay the same.',
    '⭐ Tricky read: you lose one star box. Keep trying!',
    TK === 'daughter' ? '✏️ Spelling Checks earn stars for the shop, but they don\'t change your rank.'
      : '✏️ Spelling, 🧠 Skills and 💪 Practice earn stars for the shop, but they don\'t change your level.'
  ];
  const ov = el('div',{class:'overlay'});
  const speak = () => say([`How to reach ${word} ${next}.`, ...steps.map((s, i) => `Step ${i + 1}. ${s[1].replace('⬆️ ', '')}`), ...notes.map(n => n.replace(/^[^A-Za-z]+/, ''))].join(' '));
  ov.append(el('div',{class:'modal level-guide'},
    el('h2',{}, `How to reach ${word} ${next}`),
    el('ol',{class:'lg-steps'}, ...steps.map(([e, t, st], i) => el('li',{class:'lg-step ' + st},
      el('span',{class:'lg-num'}, st === 'done' ? '✅' : i + 1), el('span',{class:'lg-e'}, e), el('span',{class:'lg-t'}, t),
      st === 'now' ? el('span',{class:'lg-now'},'👈 You are here') : null))),
    el('ul',{class:'lg-notes'}, ...notes.map(n => el('li',{}, n))),
    el('div',{class:'row center', style:'margin-top:16px'},
      el('button',{class:'btn blue', onclick:speak},'🔊 Read it to me'),
      el('button',{class:'btn green', onclick:()=>{ if (window.speechSynthesis) speechSynthesis.cancel(); ov.remove(); }},'Got it! ▶'))));
  document.body.append(ov);
}

/* ---------- spelling practice ---------- */
// Words come from the kid's tricky-word list first, then from their current level.
function spellWords(n = 5, minLen = 3){
  const L = levelDef(K.level), maxLen = TK==='son' ? 6 : 9;
  let pool;
  if (L.kind === 'words') pool = L.items.slice();
  else if (L.kind === 'letters') pool = levelDef(2).items.slice();
  else pool = L.stories.flatMap(s => s.text.split(/\s+/)).map(w => w.replace(/[^A-Za-z]/g,'')).filter(w => /^[a-z]+$/.test(w));
  pool = pool.filter(w => /^[a-z]+$/.test(w) && w.length >= 3 && w.length <= maxLen && !PROPER.has(w));
  const tricky = practiceWords(K).filter(w => /^[a-z]+$/.test(w) && w.length >= 2 && w.length <= maxLen && !PROPER.has(w));
  pool = pool.filter(w => w.length >= minLen);
  return [...new Set(shuffle(tricky).slice(0,2).concat(shuffle(pool)))].slice(0, n);
}

/* ---------- Gianna: quiet reading (no microphone) ----------
   Short Stories = the standalone Academy Tales from her rank and the rank below.
   Chapter Books = the Dragon Academy quest and the Sunny Day Club, read in order, chapter by chapter.
   She reads to herself and answers 5 questions with the story beside them; only the questions are
   scored (4 or 5 right is a passing read). */
function quietPool(){
  const lv = K.level;
  return (DAUGHTER_EXTRA[lv] || []).concat(lv > 1 ? DAUGHTER_EXTRA[lv - 1] || [] : []); // her own rank's tales first
}
function nextQuietStory(){
  const pool = quietPool();
  return pool.length ? pool[(K.storyIdx.quiet_short || 0) % pool.length] : null;
}
function startQuietRead(story, extra){
  stopAll();
  const pages = story.text.split(/\n\s*\n/).map(p => { const tokens = tokensOf(p.trim()); return { tokens, status: tokens.map(() => 'ok'), helped: tokens.map(() => false) }; });
  const act = Object.assign({ kind:'story', level:K.level, title:story.title, emoji:story.emoji, story, series:story.series, pages, quiet:true }, extra);
  run = { act, opts:{ mode:'normal' }, page:0, micMs:0, micStart:null, startedAt:Date.now(), clips:[], sessionId: kid + '_' + Date.now(), marks:{} };
  run.reading = { total:0, correct:0, helped:0, missed:[], accuracy:1, wcpm:null, quiet:true };
  screenQuiz();
}
function startQuietStory(){
  const story = nextQuietStory();
  story ? startQuietRead(story, { storyKey:'quiet_short' }) : screenHome();
}

/* ---------- Gianna: chapter books ----------
   Each book is a run of connected chapters from her story series, two ranks per book.
   A book opens once she is within one rank of where it starts. Scoring 3+ of 5 on a chapter
   moves her bookmark to the next chapter; otherwise she re-reads that chapter. */
const BOOK_DEFS = [
  { id:'moonstone', title:'The Moonstone Mystery',   emoji:'🔍', series:'quest', from:1, featured:true, chapters: MOONSTONE_BOOK },
  { id:'quest1', title:'Pebble Can\'t Fly',          emoji:'🐉', series:'quest', from:1 },
  { id:'club1',  title:'The Sunny Day Club',         emoji:'🌻', series:'club',  from:1 },
  { id:'quest2', title:'The Golden Star Egg',        emoji:'🥚', series:'quest', from:3 },
  { id:'club2',  title:'Club Troubles',              emoji:'📒', series:'club',  from:3 },
  { id:'lighthouse', title:'The Lighthouse on Gull Island', emoji:'🗼', series:'club', from:4, chapters: LIGHTHOUSE_BOOK },
  { id:'quest3', title:'Into the Whispering Woods',  emoji:'🌲', series:'quest', from:5 },
  { id:'club3',  title:'Mysteries on Maple Lane',    emoji:'🍅', series:'club',  from:5 },
  { id:'quest4', title:'The Storm Dragon',           emoji:'⛈️', series:'quest', from:7 },
  { id:'club4',  title:'One Year of Sunshine',       emoji:'🎉', series:'club',  from:7 },
  { id:'quest5', title:'The Sky Pirates',            emoji:'🏴‍☠️', series:'quest', from:9, featured:true },
  { id:'club5',  title:'The Maple Street Messenger', emoji:'📰', series:'club',  from:9 },
  { id:'quest6', title:'The Twilight Queen',         emoji:'🌑', series:'quest', from:11, featured:true },
  { id:'club6',  title:'Chapter Two',                emoji:'🌻', series:'club',  from:11 }
];
const TALES = new Set(Object.values(DAUGHTER_EXTRA).flat());
const BOOKS = BOOK_DEFS.map(b => Object.assign({}, b, {
  chapters: b.chapters || [b.from, b.from + 1].flatMap(n => DAUGHTER_TRACK.levels[n - 1].stories.filter(s => s.series === b.series && !TALES.has(s)))
}));
const bookState = id => { K.books = K.books || {}; return K.books[id] || (K.books[id] = { ch:0, finished:0 }); };
const bookOpen = b => b.from <= K.level + 1;
function currentBook(){
  const open = BOOKS.filter(bookOpen);
  const atRank = b => b.from <= K.level && K.level <= b.from + 1;
  return BOOKS.find(b => b.id === K.currentBook && bookOpen(b))
    || open.filter(b => b.featured && !bookState(b.id).finished).sort((x, y) => y.from - x.from)[0] // the newest featured book comes up next
    || open.find(b => bookState(b.id).ch > 0)
    || open.find(b => atRank(b) && !bookState(b.id).finished)
    || open.find(b => !bookState(b.id).finished)
    || open[0];
}
function startChapter(book, i){
  K.currentBook = book.id; save();
  startQuietRead(book.chapters[i], { storyKey:'book_' + book.id, book, chapterIndex:i });
}
function screenBookshelf(){
  stopAll();
  const shelf = el('div',{class:'bookshelf'}, ...BOOKS.map(b => {
    const st = bookState(b.id), open = bookOpen(b), n = b.chapters.length;
    if (!open) return el('div',{class:'book-card locked'}, el('div',{class:'book-cover'}, '🔒'), el('h3',{}, b.title), el('p',{class:'muted'}, `Opens at Rank ${b.from - 1}`));
    return el('div',{class:'book-card'},
      el('div',{class:'book-cover'}, b.emoji),
      el('h3',{}, b.title),
      el('p',{class:'muted'}, `${n} chapters · ` + (b.featured ? '🔍 New mystery!' : `Ranks ${b.from}–${b.from + 1}`) + (st.finished ? ` · ✅ finished${st.finished > 1 ? ' ×' + st.finished : ''}` : '')),
      el('div',{class:'chapter-dots'}, ...b.chapters.map((_, i) => el('span',{class:'dot' + (i < st.ch ? ' on' : '')}))),
      el('ol',{class:'chapter-list'}, ...b.chapters.map((c, i) => el('li',{class: i < st.ch ? 'done' : i === st.ch ? 'now' : ''},
        el('button',{class:'chapter-link', disabled: i > st.ch, onclick:()=>startChapter(b, i)}, `${c.emoji} ${c.title}` + (i < st.ch ? ' ✓' : i === st.ch ? ' ◀ next' : ''))))),
      el('button',{class:'btn', onclick:()=>startChapter(b, st.ch)}, st.ch === 0 ? (st.finished ? '🔁 Read it again' : '▶ Start reading') : `▶ Chapter ${st.ch + 1}`));
  }));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'📚 Bookshelf'), el('div')),
    el('p',{class:'subtitle'},'Pick a chapter book. Your bookmark saves your place!'),
    shelf));
}

/* ---------- Gianna: spelling check (typed) ---------- */
function sentenceWith(word){
  const re = new RegExp('\\b' + word + '\\b', 'i');
  for (const s of levelDef(K.level).stories){
    const hit = (s.text.replace(/\n+/g,' ').match(/[^.!?]+[.!?]+["”]?/g) || []).find(x => re.test(x) && x.length < 160);
    if (hit) return hit.trim();
  }
  return '';
}
function startSpellCheck(){
  stopAll();
  const words = spellWords(8, 4);
  if (!words.length) return screenHome();
  let i = 0, right = 0;
  const started = Date.now();
  const results = [];
  const finish = async () => {
    K.stars += right;
    if (addReadingTime(Math.min(Date.now() - started, MAX_ACTIVITY_MS))) await celebrateGoal();
    K.sessions.unshift({ id: kid + '_' + Date.now(), date: new Date().toISOString(), level: K.level, title:'Spelling check', kind:'spelling', mode:'spelling',
      total: words.length, correct: right, helped: 0, accuracy: Math.round(right / words.length * 1000) / 10, wcpm: null, quiz: null,
      missed: results.filter(r => !r.ok).map(r => r.w), stars: right, ms: Math.min(Date.now() - started, MAX_ACTIVITY_MS) });
    save();
    confetti(right === words.length ? 90 : 35); beep('level');
    say(right === words.length ? 'Perfect spelling check!' : `You spelled ${right} out of ${words.length} words!`);
    const again = await modal(el('div',{}, el('div',{class:'big-e'},'✏️'), el('h2',{}, right === words.length ? 'Perfect spelling!' : 'Spelling check done!'),
      el('p',{}, `${right} of ${words.length} right · +${right} ⭐`),
      el('div',{class:'spell-summary'}, ...results.map(r => el('span',{class:'chip' + (r.ok ? ' ok' : '')}, (r.ok ? '✓ ' : '✗ ') + r.w)))),
      [['Another check ▶','',true],['Done','gray',false]]);
    again ? startSpellCheck() : screenHome();
  };
  const render = () => {
    if (i >= words.length) return finish();
    const w = words[i], sent = sentenceWith(w);
    const blanked = sent ? sent.replace(new RegExp('\\b' + w + '\\b', 'i'), '_____') : '';
    let checked = false;
    const input = el('input',{type:'text', class:'spell-input', autocomplete:'off', autocapitalize:'off', autocorrect:'off', spellcheck:'false', placeholder:'Type the word'});
    const fb = el('div',{class:'feedback'});
    const next = el('button',{class:'btn big hidden', onclick:()=>{ i++; render(); }}, i < words.length - 1 ? 'Next word ▶' : 'Finish ▶');
    const check = () => {
      if (checked || !input.value.trim()) return;
      checked = true; input.disabled = true;
      const ok = input.value.trim().toLowerCase() === w;
      results.push({ w, ok });
      if (ok){ right++; beep('ok'); burst(pick(['YES!','WOW!','NICE!'])); fb.textContent = '✅ Correct!'; fb.style.color = 'var(--ok)'; input.classList.add('right'); }
      else {
        beep('bad'); fb.textContent = `It's spelled: ${w}`; fb.style.color = 'var(--bad)'; input.classList.add('wrong'); say(`${w} is spelled ${w.split('').join(', ')}`, { rate:0.8 });
        const r = K.words[w] || (K.words[w] = { miss:0, streak:0, mastered:null, last:null, disp:w }); r.miss++; r.streak = 0; r.mastered = null; r.last = todayStr(); save();
      }
      checkBtn.classList.add('hidden'); next.classList.remove('hidden');
    };
    const checkBtn = el('button',{class:'btn big green', onclick:check},'✓ Check');
    input.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); checked ? next.click() : check(); } });
    show(el('div',{class:'screen'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
        el('div',{class:'pageinfo'}, `✏️ Spelling Check · ${i + 1} / ${words.length}`), el('div',{style:'width:80px'})),
      el('div',{class:'card center spell-card'},
        el('p',{class:'q-text'},'Listen, then type the word!'),
        el('div',{class:'row center'},
          el('button',{class:'btn blue big', onclick:()=>say(w, { rate:0.8 })},'🔊 Hear word'),
          sent ? el('button',{class:'btn', onclick:()=>say(sent, { rate:0.9 })},'🔊 Hear it in a sentence') : null),
        blanked ? el('p',{class:'spell-sentence'}, blanked) : null,
        input, fb,
        el('div',{class:'row center', style:'margin-top:10px'}, checkBtn, next))));
    say(w, { rate:0.8 });
    setTimeout(() => { try { input.focus(); } catch(e){} }, 50);
  };
  render();
}
function startSpelling(){
  stopAll();
  const words = spellWords();
  if (!words.length) return screenHome();
  const items = words.map(w => ({ word:w, parts:graphemes(w).map(g => g.g) }));
  const header = () => el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
    el('div',{class:'pageinfo'},'✏️ Spelling Practice'), el('div',{style:'width:80px'}));
  const started = Date.now();
  buildGame(items, words, header, async score => {
    const right = Math.round(score * items.length);
    K.stars += right;
    if (addReadingTime(Math.min(Date.now() - started, MAX_ACTIVITY_MS))) await celebrateGoal();
    K.sessions.unshift({ id: kid + '_' + Date.now(), date: new Date().toISOString(), level: K.level, title:'Spelling practice', kind:'spelling', mode:'spelling',
      total: items.length, correct: right, helped: 0, accuracy: Math.round(score*1000)/10, wcpm: null, quiz: null, missed: [], stars: right, ms: Math.min(Date.now() - started, MAX_ACTIVITY_MS) });
    save();
    confetti(right === items.length ? 80 : 30); beep('level');
    say(right === items.length ? 'Perfect spelling!' : `You spelled ${right} words on the first try!`);
    const again = await modal(el('div',{}, el('div',{class:'big-e'},'✏️'), el('h2',{}, right === items.length ? 'Perfect spelling!' : 'Nice spelling!'),
      el('p',{}, `${right} of ${items.length} on the first try · +${right} ⭐`)), [['Spell more ▶','',true],['Done','gray',false]]);
    again ? startSpelling() : screenHome();
  });
}


/* ================= DAILY SPELLING STREAK =================
   One rewarded run a day. Every word has a picture (things) or an action picture (verbs), plus a
   slow, clear voice and a sentence, so the child never has to guess from the voice alone.
   Spell as many as you can in a row: the words get harder and the rewards grow. One miss ends the run. */
const SPELL_BANK = [
  // [word, picture, sentence, tier]  tier 1 = 3 letters ... tier 4 = long words
  ['cat','🐱','The cat says meow.',1], ['dog','🐶','The dog wags its tail.',1], ['sun','☀️','The sun is hot and bright.',1], ['hat','🎩','He wears a tall hat.',1],
  ['bus','🚌','We ride the bus to school.',1], ['bed','🛏️','I sleep in my bed.',1], ['pig','🐷','The pig rolls in the mud.',1], ['cup','🥤','I drink from a cup.',1],
  ['fox','🦊','The fox has a fluffy tail.',1], ['bee','🐝','The bee makes honey.',1], ['egg','🥚','The hen laid an egg.',1], ['car','🚗','Dad drives the car.',1],
  ['box','📦','The toy is in the box.',1], ['map','🗺️','The map shows the way.',1], ['ant','🐜','The ant is very small.',1], ['owl','🦉','The owl hoots at night.',1],
  ['cow','🐄','The cow gives us milk.',1], ['key','🔑','The key opens the door.',1], ['run','🏃','I run fast in the race.',1], ['dig','⛏️','We dig a hole in the sand.',1],
  ['hug','🤗','I give Mom a big hug.',1], ['cry','😢','The baby starts to cry.',1], ['sit','🪑','Please sit in the chair.',1], ['web','🕸️','The spider spins a web.',1],
  ['frog','🐸','The frog jumps into the pond.',2], ['fish','🐟','The fish swims in the water.',2], ['duck','🦆','The duck says quack.',2], ['cake','🎂','We eat cake on my birthday.',2],
  ['kite','🪁','The kite flies high in the sky.',2], ['bear','🐻','The bear sleeps all winter.',2], ['ship','🚢','The ship sails on the sea.',2], ['moon','🌙','The moon shines at night.',2],
  ['star','⭐','I wish on a star.',2], ['tree','🌳','The bird sits in the tree.',2], ['ball','⚽','Kick the ball!',2], ['boat','⛵','The boat floats on the lake.',2],
  ['milk','🥛','I drink milk with my cookies.',2], ['bike','🚲','I ride my bike to the park.',2], ['lion','🦁','The lion has a big mane.',2], ['corn','🌽','We eat corn on the cob.',2],
  ['rain','🌧️','The rain makes puddles.',2], ['snow','❄️','The snow is cold and white.',2], ['king','🤴','The king lives in a castle.',2], ['drum','🥁','Bang on the drum!',2],
  ['sock','🧦','I lost one sock.',2], ['shoe','👟','Tie your shoe.',2], ['bell','🔔','The bell rings at school.',2], ['crab','🦀','The crab walks sideways.',2],
  ['swim','🏊','I like to swim in the pool.',2], ['sing','🎤','We sing a happy song.',2], ['clap','👏','Clap your hands!',2], ['wave','👋','Wave hello to your friend.',2],
  ['read','📖','I read a book every night.',2], ['kiss','😘','Grandma gives me a kiss.',2], ['wink','😉','He gives me a wink.',2], ['yawn','🥱','I yawn when I am sleepy.',2],
  ['horse','🐴','The horse runs in the field.',3], ['apple','🍎','I eat a red apple.',3], ['train','🚂','The train goes choo choo.',3], ['house','🏠','This is my house.',3],
  ['snake','🐍','The snake says hiss.',3], ['pizza','🍕','We have pizza for dinner.',3], ['robot','🤖','The robot can walk and talk.',3], ['tiger','🐯','The tiger has orange stripes.',3],
  ['zebra','🦓','The zebra has black and white stripes.',3], ['chair','🪑','Sit on the chair.',3], ['clock','⏰','The clock tells the time.',3], ['bread','🍞','Mom makes bread.',3],
  ['cloud','☁️','A cloud floats in the sky.',3], ['sheep','🐑','The sheep has soft wool.',3], ['mouse','🐭','The mouse eats cheese.',3], ['whale','🐋','The whale is very big.',3],
  ['shark','🦈','The shark has sharp teeth.',3], ['crown','👑','The queen wears a crown.',3], ['candy','🍬','I have one piece of candy.',3], ['bunny','🐰','The bunny hops away.',3],
  ['sleep','😴','I sleep in my bed.',3], ['dance','💃','We dance to the music.',3], ['write','✍️','I write my name.',3], ['paint','🎨','I paint a picture.',3],
  ['climb','🧗','We climb up the rock wall.',3], ['laugh','😂','The joke makes me laugh.',3], ['smile','😊','Smile for the picture!',3], ['think','🤔','I think about the answer.',3],
  ['skate','⛸️','We skate on the ice.',3], ['pencil','✏️','I write with a pencil.',3], ['rocket','🚀','The rocket blasts into space.',3], ['carrot','🥕','The bunny eats a carrot.',3],
  ['flower','🌸','The flower smells sweet.',3], ['spider','🕷️','The spider has eight legs.',3], ['monkey','🐒','The monkey swings in the tree.',3], ['turtle','🐢','The turtle is slow.',3],
  ['cookie','🍪','I share my cookie.',3], ['banana','🍌','The monkey eats a banana.',3], ['castle','🏰','The castle has tall towers.',3], ['dragon','🐉','The dragon breathes fire.',3],
  ['guitar','🎸','He plays the guitar.',3], ['planet','🪐','Saturn is a planet with rings.',3], ['school','🏫','I go to school.',3], ['sneeze','🤧','Dust makes me sneeze.',3],
  ['penguin','🐧','The penguin slides on the ice.',4], ['pumpkin','🎃','We carve a pumpkin.',4], ['rainbow','🌈','A rainbow has many colors.',4], ['giraffe','🦒','The giraffe has a long neck.',4],
  ['octopus','🐙','The octopus has eight arms.',4], ['dolphin','🐬','The dolphin jumps out of the water.',4], ['unicorn','🦄','The unicorn has one horn.',4], ['volcano','🌋','The volcano is erupting.',4],
  ['elephant','🐘','The elephant has a long trunk.',4], ['umbrella','☂️','Take an umbrella in the rain.',4], ['butterfly','🦋','The butterfly has pretty wings.',4], ['dinosaur','🦕','The dinosaur lived long ago.',4],
  ['computer','💻','I type on the computer.',4], ['scissors','✂️','Cut the paper with scissors.',4], ['sandwich','🥪','I eat a sandwich for lunch.',4], ['popcorn','🍿','We eat popcorn at the movie.',4],
  ['snowman','⛄','We build a snowman.',4], ['kangaroo','🦘','The kangaroo hops very far.',4], ['hamburger','🍔','I want a hamburger.',4], ['telescope','🔭','I look at stars with a telescope.',4],
  ['crocodile','🐊','The crocodile has a long tail.',4], ['strawberry','🍓','The strawberry is red and sweet.',4], ['astronaut','🧑‍🚀','The astronaut flies to space.',4], ['skateboard','🛹','I ride my skateboard.',4],
  ['basketball','🏀','We play basketball.',4], ['firework','🎆','The firework lights up the sky.',4], ['lightning','⚡','Lightning flashes in the storm.',4], ['treasure','💰','The pirate finds treasure.',4]
];
// how hard the next word is, by how many are already right in a row
function spellTierFor(n){
  const steps = TK === 'son' ? [3, 7, 12] : [2, 5, 9];   // Miles starts easier
  const base = TK === 'son' ? 1 : 2;
  return Math.min(4, base + steps.filter(s => n >= s).length);
}
const spellStarsFor = n => n <= 3 ? 1 : n <= 6 ? 2 : n <= 9 ? 3 : n <= 14 ? 4 : 5;   // stars for the n-th word in a row
const SPELL_MILESTONES = { 5:['chest','silver','5 in a row!'], 10:['chest','gold','10 in a row!'], 15:['cosmic',5,'15 in a row!'], 20:['chest','cosmic','20 in a row!'] };
function spellState(){ K.spellStreak = K.spellStreak || { best:0, day:null, today:0, runs:0 }; return K.spellStreak; }
function spellCard(){
  const S = spellState(), done = S.day === todayStr();
  return el('div',{class:'card next-card streak-card'},
    el('div',{class:'series-tag'},'🔥 Daily Challenge'),
    el('h2',{},'Spelling Streak'),
    el('p',{}, done ? `Today: ${S.today} in a row! Your best ever: ${S.best}. Practice runs are open, and the daily prize comes back tomorrow.`
      : `How many words can you spell in a row? Look at the picture, listen, and spell it. Every word in a row is worth more! Your best: ${S.best}.`),
    el('div',{class:'streak-ladder'}, ...[[1,'⭐'],[4,'⭐⭐'],[7,'⭐⭐⭐'],[5,'🎁'],[10,'🎁🎁'],[15,'💫'],[20,'👑']].map(([n, r]) => el('span',{}, `${n}: ${r}`))),
    el('button',{class:'btn big' + (done ? ' blue' : ''), onclick:()=>{ beep('tap'); startSpellStreak(!done); }}, done ? '✏️ Practice run' : '🔥 Start today\'s challenge'));
}
async function sayWordClearly(W, withSentence = true){
  await say(W[0], { rate: .6 });
  if (!withSentence) return;
  await new Promise(r => setTimeout(r, 250));
  await say(W[2], { rate: .8 });
  await new Promise(r => setTimeout(r, 250));
  await say(W[0], { rate: .6 });
}
function startSpellStreak(rewarded){
  stopAll();
  const S = spellState(), started = Date.now(), used = new Set();
  if (rewarded){ S.day = todayStr(); S.today = 0; S.runs = (S.runs || 0) + 1; save(); }
  let streak = 0, earned = 0, over = false;
  const nextWord = () => {
    const tier = spellTierFor(streak);
    let pool = SPELL_BANK.filter(w => w[3] === tier && !used.has(w[0]));
    if (!pool.length) pool = SPELL_BANK.filter(w => !used.has(w[0]));
    const W = pick(pool); used.add(W[0]); return W;
  };
  const finish = async (W, guess) => {
    over = true;
    const best = streak > S.best;
    if (best){ S.best = streak; if (rewarded && streak >= 3){ K.stars += 5; earned += 5; } }
    if (rewarded){ S.today = streak; }
    if (addReadingTime(Math.min(Date.now() - started, MAX_ACTIVITY_MS))) await celebrateGoal();
    K.sessions.unshift({ id: kid + '_' + Date.now(), date: new Date().toISOString(), level: K.level, title:'Spelling streak', kind:'spelling', mode:'spelling',
      total: streak + (W ? 1 : 0), correct: streak, helped: 0, accuracy: Math.round(streak / Math.max(1, streak + (W ? 1 : 0)) * 1000) / 10, wcpm: null, quiz: null,
      missed: W ? [W[0]] : [], stars: earned, ms: Math.min(Date.now() - started, MAX_ACTIVITY_MS) });
    save();
    if (streak >= 5) confetti(streak >= 10 ? 120 : 60);
    say(`${streak} in a row!` + (best ? ' That is your best ever!' : ''));
    const again = await modal(el('div',{}, el('div',{class:'big-e'}, streak >= 10 ? '🏆' : streak >= 5 ? '🔥' : '✏️'),
      el('h2',{}, `${streak} in a row!`),
      best ? el('p',{style:'font-weight:800;color:#b45309'}, '🎉 New personal best!' + (rewarded && streak >= 3 ? ' +5 ⭐' : '')) : el('p',{}, `Your best: ${S.best}`),
      W ? el('div',{class:'spell-miss'}, el('span',{class:'sm-pic'}, W[1]), el('div',{}, el('small',{}, guess ? `You wrote: ${guess}` : 'The word was:'), el('b',{}, W[0]))) : null,
      rewarded ? el('p',{}, `You earned ${earned} ⭐ today.`) : el('p',{class:'muted'}, 'Practice run: no prizes, but your best still counts!')),
      [['✏️ Practice run','blue',true],['Done','gray',false]]);
    again ? startSpellStreak(false) : screenHome();
  };
  const ask = () => {
    if (over) return;
    const W = nextWord(), word = W[0];
    let typed = [];
    const slots = el('div',{class:'ss-slots'});
    const drawSlots = () => { slots.innerHTML = ''; for (let i = 0; i < word.length; i++) slots.append(el('span',{class:'ss-slot' + (typed[i] ? ' on' : '')}, typed[i] || '')); };
    drawSlots();
    const check = async () => {
      const guess = typed.join('');
      if (guess.length < word.length) return;
      if (guess === word){
        streak++;
        const st = rewarded ? spellStarsFor(streak) : 0;
        if (st){ K.stars += st; earned += st; }
        if (rewarded) S.today = streak;
        save();
        slots.classList.add('good'); beep('ok');
        const m = rewarded && SPELL_MILESTONES[streak];
        if (m){ if (m[0] === 'chest') awardChest(m[1], 'Spelling Streak · ' + m[2]); else addCosmic(m[1], 'Spelling Streak · ' + m[2]); burst(m[2].toUpperCase()); confetti(70); }
        else if (streak >= 25 && streak % 5 === 0 && rewarded){ awardChest('gold', `Spelling Streak · ${streak} in a row!`); burst(`${streak}!`); }
        say(pick(['Yes!','Correct!','You got it!','Great spelling!','Awesome!']));
        setTimeout(ask, 900);
      } else {
        slots.classList.add('bad'); beep('bad');
        await say(`Oh no! ${word} is spelled ${word.split('').join(', ')}.`, { rate: .75 });
        finish(W, guess);
      }
    };
    let input = null, tiles = null;
    if (TK === 'daughter'){
      input = el('input',{type:'text', class:'spell-input', autocomplete:'off', autocapitalize:'off', autocorrect:'off', spellcheck:'false', placeholder:'Type the word', maxlength: word.length + 4});
      input.addEventListener('input', () => { typed = input.value.toLowerCase().replace(/[^a-z]/g,'').slice(0, word.length).split(''); drawSlots(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    } else {
      // letter tiles: the word's letters plus two extra, mixed up
      const extra = shuffle('abcdefghijklmnoprstuwy'.split('').filter(c => !word.includes(c))).slice(0, 2);
      const letters = shuffle(word.split('').concat(extra));
      tiles = el('div',{class:'ss-tiles'}, ...letters.map(c => {
        const b = el('button',{class:'ss-tile', onclick:()=>{ if (b.disabled || typed.length >= word.length) return; typed.push(c); b.disabled = true; b.dataset.used = typed.length; beep('tap'); drawSlots(); if (typed.length === word.length) setTimeout(check, 250); }}, c);
        return b; }));
    }
    const undo = el('button',{class:'btn small gray', onclick:()=>{
      if (input){ input.value = input.value.slice(0, -1); input.dispatchEvent(new Event('input')); input.focus(); return; }
      const n = typed.length; if (!n) return; typed.pop();
      const b = [...tiles.children].find(x => x.dataset.used == n); if (b){ b.disabled = false; delete b.dataset.used; }
      drawSlots(); }}, '⌫ Undo');
    const reward = rewarded ? spellStarsFor(streak + 1) : 0;
    show(el('div',{class:'screen spell-streak'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>{ if (!over && streak) finish(null, ''); else screenHome(); }}, streak ? '🏁 Stop' : '← Back'),
        el('div',{class:'pageinfo'}, `🔥 ${streak} in a row` + (rewarded ? ` · next word +${reward} ⭐` : ' · practice')), el('div',{style:'width:80px'})),
      el('div',{class:'card center ss-card'},
        el('div',{class:'ss-pic', onclick:()=>sayWordClearly(W, false)}, W[1]),
        el('div',{class:'row center'},
          el('button',{class:'btn blue', onclick:()=>sayWordClearly(W, false)}, '🔊 Say the word'),
          el('button',{class:'btn small blue', onclick:()=>sayWordClearly(W, true)}, '💬 Use it in a sentence')),
        el('p',{class:'ss-sentence'}, W[2].replace(new RegExp('\\b' + word + '\\b', 'i'), '_'.repeat(word.length))),
        slots, input || tiles,
        el('div',{class:'row center'}, undo, input ? el('button',{class:'btn', onclick:check}, '✓ Check') : null),
        el('div',{class:'ss-tier'}, ['', '⭐ Easy', '⭐⭐ Medium', '⭐⭐⭐ Hard', '👑 Expert'][spellTierFor(streak)]))));
    if (input) setTimeout(() => input.focus(), 200);
    setTimeout(() => sayWordClearly(W, true), 350);
  };
  ask();
}

/* ---------- building passages ---------- */
function tokensOf(text){
  return text.split(/\s+/).filter(Boolean).map(disp => { const n = norm(disp); return n ? { disp, n } : { disp, n:'', skip:true }; });
}
// Read-aloud stories go on one screen; blank lines in the text become paragraph breaks.
function storyPages(text){
  const tokens = [];
  text.split(/\n\s*\n/).forEach((p, pi) => tokensOf(p.trim()).forEach((t, i) => tokens.push(i === 0 && pi > 0 ? Object.assign(t, { para:true }) : t)));
  return [{ tokens }];
}
function buildActivity(levelN, mode){
  const L = levelDef(levelN);
  const wantsStory = L.kind === 'story' || (mode && seriesAt(levelN).includes(mode));
  if (!wantsStory && L.kind === 'letters'){
    const items = shuffle(L.items).slice(0, L.roundSize);
    return { kind:'letters', level:levelN, title:'Letter Sounds', pages: items.map(([l,e,k]) => ({ single:true, letter:l, pic:e, keyword:k, tokens:[{disp:l.toUpperCase()+l, n:l}] })) };
  }
  if (!wantsStory && L.kind === 'words'){
    const items = shuffle(L.items).slice(0, L.roundSize);
    return { kind:'words', level:levelN, title:L.title, pages: items.map(w => ({ single:true, tokens:[{disp:w, n:norm(w)}] })) };
  }
  const { story, index, key, series } = storyFor(levelN, mode);
  const pages = storyPages(story.text);
  return { kind:'story', level:levelN, title:story.title, emoji:story.emoji, story, storyIndex:index, storyKey:key, series, pages };
}
function startActivity(series){
  const a = buildActivity(K.level, series);
  if (a.kind === 'story') return startStoryWithSkill(a);
  beginRun(a, { mode:'normal' });
}


/* ---------- placement ---------- */
function placementProbes(){
  const probes = [];
  T.levels.forEach(L => {
    if (L.kind === 'letters') return; // letters handled as the fallback start
    let text;
    if (L.kind === 'words') text = shuffle(L.items).slice(0,5).join(' ');
    else { const st = L.stories[L.stories.length-1]; text = st.text.split(/\n\s*\n/)[0].trim(); }
    probes.push({ level:L.n, page:{ tokens: tokensOf(text) } });
  });
  return probes;
}
function screenPlacementIntro(){
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, homeBtn(), el('div')),
    el('div',{class:'hero'}, mascotNode(), el('div',{}, el('h1',{class:'title'}, TK==='daughter' ? 'Welcome to Skyfire Academy!' : `Hi! I'm ${CAT}!`),
      el('p',{class:'subtitle'}, TK==='daughter' ? 'Master Oona wants to hear you read, so she can pick the right rank for you.' : 'Let\'s read a little so I know where to start!'))),
    el('div',{class:'card', style:'margin-top:24px'},
      el('p',{style:'font-size:22px;margin-top:0'},'Read each line out loud. It\'s okay if it gets hard. That just tells us where to start!'),
      el('div',{class:'row'},
        el('button',{class:'btn big', onclick:()=>startPlacement()},'▶ Let\'s go!'),
        el('button',{class:'btn gray small', onclick:()=>{ K.placed = true; K.level = skipLevel(); save(); screenHome(); }},`Skip: start at Level ${skipLevel()}`))),
    el('button',{class:'gear', onclick:()=>screenPin()},'⚙︎ Grown-ups')
  );
  show(s);
}
// Miles already reads early "Level 2" readers, so skipping placement drops him into short stories, not letter drills.
const SKIP_START = { son: 5, daughter: 1 };
function skipLevel(){ return SKIP_START[TK] || 1; }
function startPlacement(){
  const probes = placementProbes();
  const a = { kind:'placement', level:0, title:'Quick Check', pages: probes.map(p => Object.assign({ probeLevel:p.level }, p.page)) };
  beginRun(a, { mode:'placement' });
}
function finishPlacement(r){
  // walk probes in order; stop at first that scores < 90%
  let start = 1;
  for (const p of r.act.pages){
    const tot = p.tokens.length, ok = p.status.filter(x=>x==='ok').length;
    if (ok / tot >= 0.9) start = p.probeLevel; else break;
  }
  K.level = start; K.placed = true; K.passStreak = 0; K.failStreak = 0; awardTrophiesUpTo(start); save();
  confetti(50); beep('level');
  modal(el('div',{}, el('div',{class:'big-e'}, TK==='daughter'?'🏅':'🎉'),
    el('h2',{}, TK==='daughter' ? `You start at Rank ${start}!` : `You start at Level ${start}!`),
    el('p',{}, levelDef(start).title)), [['Yay! ▶','',1]]).then(()=>{ K.avatar.base ? screenHome() : screenAvatarPick(); });
}

/* ---------- reader ---------- */
let recog = null, recogOn = false, mediaStream = null, recorder = null;
function stopAll(){
  try { if (recog){ recog.onend = null; recog.abort(); } } catch(e){}
  recog = null; recogOn = false;
  try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch(e){}
  try { if (mediaStream) mediaStream.getTracks().forEach(t=>t.stop()); } catch(e){}
  mediaStream = null; recorder = null;
  try { speechSynthesis.cancel(); } catch(e){}
  buildGen++; // stop any spelling/build game still waiting on a timer
}

function beginRun(act, opts){
  stopAll();
  act.pages.forEach(p => { p.status = p.tokens.map(t => t.skip ? 'ok' : null); p.helped = p.tokens.map(()=>false); p.heardFinal = []; p.tries = 0; });
  run = { act, opts, page:0, micMs:0, micStart:null, startedAt:Date.now(), clips:[], sessionId: kid + '_' + Date.now() };
  renderReader();
}

function renderReader(){
  const r = run, a = r.act, p = a.pages[r.page];
  const manual = useManual();
  const single = !!p.single;
  const passage = el('div',{class:'passage' + (single ? ' single' : '') + (p.letter ? ' letter' : '')});
  const focusSet = r.opts.focus ? new Set(r.opts.focus.words) : null;
  p.tokens.forEach((t,i) => {
    if (t.para) passage.append(el('span',{class:'pbreak'}));
    const w = el('span',{class:'w' + (focusSet && focusSet.has(t.n) ? ' focus' : '') + (!single && r.opts.focus && heartNew(t.n) ? ' heartw' : ''), 'data-i':i}, t.disp);
    w.addEventListener('click', () => onWordTap(i));
    passage.append(w);
  });
  const isLast = r.page === a.pages.length - 1;
  const hint = el('div',{class:'hint', id:'hint'},
    manual ? 'Read out loud! Grown-up: tap any word that was missed.' :
    single ? (p.letter ? 'Tap the mic and say the letter\'s sound!' : 'Tap the mic and read the word!') : 'Tap the 🎤 and read out loud!');
  const heard = el('div',{class:'heard', id:'heard'});
  const micBtn = manual ? null : el('button',{class:'mic', id:'mic', onclick:toggleMic, 'aria-label':'microphone'},'🎤');
  const nextBtn = el('button',{class:'btn ' + (manual ? 'green' : 'blue'), id:'next', onclick:()=>nextPage(true)}, isLast ? 'Done ✓' : 'Next ▶');
  const checks = single && !manual ? el('div',{class:'grownup-checks'},
      el('button',{class:'btn small green', onclick:()=>gradeSingle(true)},'✓ Grown-up: right'),
      el('button',{class:'btn small red', onclick:()=>gradeSingle(false)},'✗ Missed')) : null;
  const pageCard = el('div',{class:'card page-card'},
    manual ? el('span',{class:'mode-tag'},'grown-up scoring') : null,
    el('div',{}, passage, p.pic ? el('div',{class:'keypic'}, p.pic) : null,
      p.blend ? el('div',{class:'blend-help'}, tileRow(p.tokens[0].disp, true), el('div',{class:'muted center'},'Tap each sound, then read the whole word!')) : null,
      p.heart ? el('div',{class:'heart-help'}, '❤️ Heart word! ', heartWordNode(p.tokens[0].disp), ' — ', p.heart.tip) : null));
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); r.opts.onStop ? r.opts.onStop() : a.kind==='placement' ? screenPlacementIntro() : screenHome(); }},'← Back'),
      el('div',{class:'pageinfo'}, (a.emoji ? a.emoji + ' ' : '') + a.title + (a.pages.length > 1 ? ' · ' + (r.page+1) + ' / ' + a.pages.length : '')),
      el('div',{style:'width:80px'})),
    el('div',{class:'reader-wrap'}, pageCard, hint, heard,
      el('div',{class:'controls'},
        (r.opts.echo || TK === 'son') && !single ? el('button',{class:'btn blue', onclick:()=>{ if (recogOn) stopRecog(); readAlong(); }},'👂 Hear it first') : null,
        p.blend && !manual ? el('button',{class:'btn', onclick:()=>{ p.helped[0] = true; paintWords(); say(p.tokens[0].disp, {rate:0.35}); }},'🐢 Say it slowly') : null,
        micBtn, nextBtn), checks)
  );
  show(s);
  paintWords();
}

// Read the page aloud and light up each word as it's spoken (karaoke style).
// Uses the voice's word-boundary events when the device sends them, otherwise a timing estimate.
function readAlong(){
  const p = run.act.pages[run.page], spans = [...document.querySelectorAll('.passage .w')];
  const parts = [], starts = [];
  let text = '';
  p.tokens.forEach((t, i) => { if (t.skip) return; starts.push([text.length, i]); text += t.disp + ' '; parts.push(i); });
  if (!parts.length || !('speechSynthesis' in window)) return;
  const mark = i => spans.forEach((s, j) => s.classList.toggle('karaoke', j === i));
  const rate = 0.8;
  let timer = null, gotBoundary = false, k = 0, done = false;
  const finish = () => { done = true; clearTimeout(timer); mark(-1); };
  const step = () => { if (done || gotBoundary || k >= parts.length) return; const i = parts[k++]; mark(i);
    timer = setTimeout(step, (p.tokens[i].disp.length * 75 + 260) / rate); };
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice){ u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
    u.rate = rate; u.pitch = 1;
    u.onstart = () => step();
    u.onboundary = e => {
      if (e.name && e.name !== 'word') return;
      if (!gotBoundary){ gotBoundary = true; clearTimeout(timer); }
      let hit = starts[0][1]; for (const [at, i] of starts) if (at <= e.charIndex) hit = i;
      mark(hit);
    };
    u.onend = finish; u.onerror = finish;
    speechSynthesis.speak(u);
  } catch(e){ finish(); }
}

function paintWords(){
  const p = run.act.pages[run.page];
  let firstPending = p.status.findIndex(x => x === null);
  document.querySelectorAll('.passage .w').forEach((w,i) => {
    w.classList.toggle('ok', p.status[i] === 'ok' && !p.helped[i]);
    w.classList.toggle('miss', p.status[i] === 'miss');
    w.classList.toggle('help', !!p.helped[i]);
    w.classList.toggle('cur', recogOn && i === firstPending);
    if (p.tokens[i].skip){ w.className = 'w pic'; }
  });
  if (run.opts.boss) bossHud();
}

function onWordTap(i){
  const p = run.act.pages[run.page];
  if (p.tokens[i].skip) return;
  if (useManual()){
    p.status[i] = p.status[i] === 'miss' ? null : 'miss';
    beep('tap'); paintWords(); return;
  }
  // listening mode: tap = hear the word (counts as helped). Truesight shows chunks first.
  if (truesightTap(p, i)) return;
  p.helped[i] = true; paintWords();
  const t = p.tokens[i];
  // just say the whole word, clearly (no sounding out)
  say(t.disp, { rate:0.75 });
}

function gradeSingle(ok){
  const p = run.act.pages[run.page];
  p.status = p.status.map(() => ok ? 'ok' : 'miss');
  beep(ok ? 'ok' : 'bad'); paintWords();
  setTimeout(()=>nextPage(false, true), ok ? 500 : 900);
}

async function toggleMic(){
  if (recogOn){ stopRecog(); return; }
  startRecog();
}
async function startRecog(resume){
  const p = run.act.pages[run.page];
  try { speechSynthesis.cancel(); } catch(e){}
  if (DB.record && window.MediaRecorder && !recorder){
    try {
      mediaStream = mediaStream || await navigator.mediaDevices.getUserMedia({ audio:true });
      recorder = new MediaRecorder(mediaStream);
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => { if (chunks.length) run && run.clips.push(new Blob(chunks, { type: chunks[0].type || 'audio/mp4' })); recorder = null; };
      recorder.start();
    } catch(e){ recorder = null; }
  }
  try {
    recog = new SR();
    recog.lang = 'en-US'; recog.continuous = true; recog.interimResults = true; recog.maxAlternatives = 3;
  } catch(e){ setHint('Listening is not available here. Ask a grown-up to turn on grown-up scoring.'); return; }
  recog.onresult = ev => {
    micFails = 0;
    const pg = run.act.pages[run.page];
    pg.lastHeard = Date.now(); pg.alts = pg.alts || new Set();
    let interim = [];
    const altsAll = [];
    for (let i = ev.resultIndex; i < ev.results.length; i++){
      const res = ev.results[i];
      const best = tokenizeHeard(res[0].transcript);
      for (let a = 0; a < res.length; a++){ const t = tokenizeHeard(res[a].transcript); altsAll.push(...t); t.forEach(w => pg.alts.add(w)); }
      if (res.isFinal) pg.heardFinal.push(...best); else interim.push(...best);
    }
    const heardAll = pg.heardFinal.concat(interim);
    const hd = $('#heard'); if (hd) hd.textContent = heardAll.slice(-12).join(' ');
    if (pg.single){
      const pool = heardAll.concat(altsAll);
      const ok = pg.letter ? letterMatch(pg.letter, pg.keyword, pool) : pool.some(h => wordMatch(pg.tokens[0].n, h, true));
      if (ok){ if (pg.done) return; pg.done = true; pg.status[0] = 'ok'; paintWords(); beep('ok'); flash(0); setTimeout(()=>nextPage(false, true), 700); }
      else if (ev.results[ev.results.length-1].isFinal){
        pg.tries++;
        // the mic is bad at hearing lone letter sounds ("mmm", "sss"), so a real second try earns half credit
        if (pg.letter && pg.tries >= 2 && !pg.done){
          pg.done = true; pg.status[0] = 'ok'; pg.helped[0] = true; paintWords(); beep('ok'); setHint('Good try! 👍');
          setTimeout(()=>nextPage(false, true), 700); return;
        }
        beep('bad'); setHint(pg.tries >= 2 ? 'Hmm, try once more, or a grown-up can tap ✓ or ✗.' : 'Almost! Try again.');
      }
      return;
    }
    const idx = pg.tokens.map((t,i) => t.skip ? -1 : i).filter(i => i >= 0);
    const tw = idx.map(i => pg.tokens[i].n), st = align(tw, heardAll, false);
    fillHeard(tw, st, pg.alts);
    // never downgrade a word already marked ok
    st.forEach((v,j) => { const i = idx[j]; if (pg.status[i] !== 'ok') pg.status[i] = v; });
    paintWords();
    if (pg.status.every(x => x !== null) && !pg.done){
      pg.done = true; beep('ok'); burst(); setHint('Great reading! 🌟');
      setTimeout(()=>nextPage(false, true), 900);
    }
  };
  recog.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setHint('Please allow the microphone. (iPad: Settings › Safari › Microphone, and turn on Siri & Dictation.)');
    else if (e.error === 'no-speech') setHint('I didn\'t hear anything. Tap the 🎤 and try again!');
    else if (e.error === 'audio-capture'){ setHint('The mic is busy. Turning off recordings and trying again…'); DB.record = false; save(); }
    if (e.error !== 'no-speech' && e.error !== 'aborted') micFailed();
  };
  recog.onend = () => {
    if (recogOn){ // ended on its own (silence or iOS timeout)
      const pg = run && run.act.pages[run.page];
      // iPad stops listening after a short pause. If the child was reading a moment ago, quietly start again
      // (the words heard so far are kept on the page).
      if (pg && !pg.done && pg.status.some(x => x === null) && Date.now() - (pg.lastHeard || run.micStart || 0) < 12000 && (pg.restarts = (pg.restarts || 0) + 1) <= 8){
        try { recog = null; recogOn = false; startRecog(true); return; } catch(e){}
      }
      endMicTime(); recogOn = false; updateMicBtn(); paintWords();
      if (pg && pg.status.some(x=>x===null)) setHint('Tap the 🎤 to keep reading, or tap Next.');
    }
  };
  try { recog.start(); recogOn = true; if (!resume || !run.micStart) run.micStart = Date.now(); updateMicBtn(); if (!resume) setHint(micTip()); paintWords(); }
  catch(e){ setHint('Could not start listening. Tap the 🎤 again.'); micFailed(); }
}
function endMicTime(){ if (run && run.micStart){ run.micMs += Date.now() - run.micStart; run.micStart = null; } }
function stopRecog(){
  endMicTime();
  recogOn = false;
  try { if (recog){ recog.onend = null; recog.stop(); } } catch(e){}
  recog = null;
  try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch(e){}
  updateMicBtn(); paintWords();
}
function updateMicBtn(){ const m = $('#mic'); if (m){ m.classList.toggle('on', recogOn); m.textContent = recogOn ? '⏹' : '🎤'; } }
function setHint(t){ const h = $('#hint'); if (h) h.textContent = t; }
function flash(i){ const w = document.querySelectorAll('.passage .w')[i]; if (w){ w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); } }

function nextPage(manualPress, keepMic){
  if (!run) return;
  const isLastPage = run.page >= run.act.pages.length - 1;
  if (recogOn && (!keepMic || isLastPage)) stopRecog();
  const p = run.act.pages[run.page];
  p.done = true;
  // anything not confirmed counts as missed (manual mode: unmarked = read correctly)
  p.status = p.status.map(x => x === null ? (useManual() ? 'ok' : 'miss') : x);
  if (run.act.kind === 'placement' && p.status.filter(x=>x==='ok').length / p.tokens.length < 0.9){
    if (recogOn) stopRecog();
    run.act.pages = run.act.pages.slice(0, run.page + 1);   // stop at the first probe that's too hard
    return finishReading();
  }
  if (!isLastPage){ run.page++; renderReader(); if (recogOn){ updateMicBtn(); setHint('I\'m still listening… keep reading! 👂'); paintWords(); } return; }
  finishReading();
}

function computeReading(){
  let total = 0, correct = 0, helped = 0; const missed = [];
  run.act.pages.forEach(p => p.tokens.forEach((t,i) => {
    if (t.skip) return;
    total++;
    if (p.helped[i]) { helped++; missed.push(t.n); if (TK === 'son') correct += 0.5; }
    else if (p.status[i] === 'ok') correct++;
    else missed.push(t.n);
  }));
  const minutes = Math.max(run.micMs || (Date.now() - run.startedAt), 1000) / 60000;
  correct = Math.round(correct*2)/2;
  return { total, correct, helped, missed: missed.filter(Boolean), accuracy: total ? correct/total : 0,
           wcpm: run.act.kind === 'story' && correct / minutes < 400 ? Math.round(correct / minutes) : null };
}

function finishReading(){
  stopAll();
  if (run.opts.onDone){ const res = computeReading(); return run.opts.onDone(res, run.act); }
  if (run.act.kind === 'placement') return finishPlacement(run);
  run.reading = computeReading();
  const a = run.act;
  const hasQuiz = a.kind === 'story' && (run.opts.mode === 'normal' || run.opts.boss);
  if (hasQuiz) screenQuiz(); else screenResults();
}

/* ---------- quiz ---------- */
// What kind of thinking a question asks for (used in the grown-ups' progress report)
const Q_TYPES = [
  ['Main idea', /main idea|main problem|mostly about/i], ["Author's purpose & message", /author|lesson|message|purpose|remember\?$/i],
  ['Clues & evidence', /clue|evidence|prove/i], ['Predicting', /predict/i], ['Order of events', /happened (FIRST|LAST)/i],
  ['Spotting what did NOT happen', /did NOT happen/i], ['Word meaning', /what does .* mean/i],
  ['Why & how (inference)', /^(why|how)|infer|feel|change/i], ['Story details', /./]
];
const qTypeOf = q => (Q_TYPES.find(([, re]) => re.test(q)) || Q_TYPES[Q_TYPES.length - 1])[0];
function trackQ(q, ok){
  K.qlog = (K.qlog || []); K.qlog.unshift({ d: todayStr(), t: qTypeOf(q), ok: !!ok });
  K.qlog = K.qlog.slice(0, 400);
}
/* Challenge questions (Gia's track by default; a grown-up can switch per player):
   - wrong answers come from the same kind of question in other stories (names for "who", places for "where", reasons for "why"),
     so every choice sounds possible and she has to remember what really happened;
   - "why" and "how" questions are kept first;
   - two new kinds of question are made from the story itself: what happened FIRST, and which event was NOT in this story. */
let QUIZ_POOL = null;
function allTrackStories(tk){
  const T2 = TRACKS[tk], out = [];
  (T2.levels || []).forEach(L => (L.stories || []).forEach(st => out.push(st)));
  if (tk === 'daughter'){ try { Object.values(DAUGHTER_EXTRA).flat().forEach(st => out.push(st)); } catch(e){} try { BOOKS.forEach(b => (b.chapters || []).forEach(c => out.push(c))); } catch(e){} }
  return out.filter(st => st && st.qs && st.text);
}
const qKind = q => { const w = q.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean); return w[0] === 'what' || w[0] === 'which' ? w.slice(0, 2).join(' ') : w[0]; };
function quizPool(tk){
  QUIZ_POOL = QUIZ_POOL || {};
  if (QUIZ_POOL[tk]) return QUIZ_POOL[tk];
  const byKind = {}, sentences = [];
  allTrackStories(tk).forEach(st => {
    if (!st.deep) st.qs.forEach(([q, o, a]) => { (byKind[qKind(q)] = byKind[qKind(q)] || []).push({ ans:o[a], story:st }); }); // mystery answers never leak into other quizzes
    storySentences(st.text).forEach(t => sentences.push({ t, story:st }));
  });
  return (QUIZ_POOL[tk] = { byKind, sentences });
}
function storySentences(text){
  return (text || '').replace(/\s+/g, ' ').replace(/([.!?]["”’]?)\s+/g, '$1\n').split('\n').map(x => x.trim())
    .filter(x => { const n = x.split(' ').length; return n >= 5 && n <= 18 && /^["“]?[A-Z]/.test(x); });
}
const tidy = t => t.replace(/^["“]|["”]$/g, '').trim();
function hardDistractors(q, opts, ans, story, pool){
  const right = opts[ans], len = right.length, have = new Set(opts.map(o => o.toLowerCase()));
  const same = x => !story.series || !x.story.series || x.story.series === story.series; // stay in the same world of stories
  const cands = shuffle((pool.byKind[qKind(q)] || []).filter(x => x.story !== story && same(x)).map(x => x.ans))
    .filter(t => { const l = t.toLowerCase(); if (have.has(l)) return false; have.add(l); return t.length >= len * .6 && t.length <= len * 1.7; });
  if (cands.length < 2) return opts; // not enough look-alikes: keep the story's own choices
  const keep = opts.filter((o, i) => i !== ans);
  // mix: up to 2 look-alikes from other stories + the story's own best wrong choice
  return [right, ...cands.slice(0, 2), keep[0]].slice(0, 4);
}
function challengeQuiz(story){
  const pool = quizPool(TK), base = story.qs.slice();
  // critical-reading questions first: main idea, author's purpose, evidence/clues, predictions; then why/how
  const rank = q => /main idea|main problem|mostly about|author|lesson|message|clue|evidence|predict|infer|purpose|mean\b/i.test(q[0]) ? 0 : /^(why|how)/i.test(q[0]) ? 1 : /^(which|what (does|do|did|made|happened))/i.test(q[0]) ? 2 : 3;
  const keepN = story.deep ? 4 : 3; // hand-written mystery chapters keep more of their own questions
  const keep = base.map((q, i) => [q, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).slice(0, keepN).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const out = keep.map(([q, o, a]) => { const opts = story.deep ? o : hardDistractors(q, o, a, story, pool); return { q, opts: shuffle(opts.map((t, i) => ({ t, right: i === 0 && opts !== o ? true : opts === o ? i === a : false }))) }; });
  const sents = storySentences(story.text), plain = sents.filter(x => !/["“”]/.test(x));
  if (plain.length >= 4){ const sents = plain; // what happened first? three moments spread across the story
    const n = sents.length, picks = [sents[Math.floor(n * .1)], sents[Math.floor(n * .5)], sents[Math.min(n - 1, Math.floor(n * .85))]];
    if (new Set(picks).size === 3){ const last = Math.random() < .5;
      out.push({ q: last ? 'Which of these happened LAST in the story?' : 'Which of these happened FIRST in the story?', opts: shuffle(picks.map((t, i) => ({ t: tidy(t), right: last ? i === 2 : i === 0 }))) }); }
  }
  const others = shuffle(pool.sentences.filter(x => x.story !== story && !x.story.deep && !/["“”]/.test(x.t) && (!story.series || x.story.series === story.series)));
  const real = shuffle(plain).slice(0, 3);
  if (real.length === 3 && others.length){ // which did NOT happen in this story?
    out.push({ q: 'Which of these did NOT happen in this story?', opts: shuffle([...real.map(t => ({ t: tidy(t), right:false })), { t: tidy(others[0].t), right:true }]) });
  }
  while (out.length < 5 && base.length > out.length){ const q = base.find(b => !keep.includes(b) && !out.some(o => o.q === b[0])); if (!q) break; out.push({ q:q[0], opts: shuffle(q[1].map((t, i) => ({ t, right: i === q[2] }))) }); }
  return out.slice(0, 5);
}
const quizLevelOf = id => { const P = playerOf(id), k = DB.kids[id], lv = k ? k.level : 1;
  const q = P && P.quiz ? P.quiz : trackOf(id) === 'daughter' ? 'challenge' : 'standard';
  return q === 'challenge' && trackOf(id) === 'daughter' && lv >= 5 ? 'expert' : q; };   // Gia: Challenge becomes Expert from Rank 5
function screenQuiz(){
  if (run.act.boss && !run.opts.boss) run.opts.boss = run.act.boss;   // Gianna's boss read arrives here before opts are set
  const st = run.act.story;
  let qs = null;
  const lvl = quizLevelOf(kid);
  if (lvl === 'expert' && !run.opts.boss){ try { qs = expertQuiz(st); } catch(e){ console.warn(e); qs = null; } }
  if (!qs && lvl !== 'standard' && !run.opts.boss){ try { qs = challengeQuiz(st); } catch(e){ qs = null; } }
  if (!qs && !run.opts.boss && typeof SON_DEEP !== 'undefined' && SON_DEEP[st.title]){
    const deep = SON_DEEP[st.title], keep = 5 - deep.length;
    const lit = shuffle(st.qs.slice()).slice(0, keep);
    qs = lit.map(([q, opts, ans]) => ({ q, opts: shuffle(opts.map((o,i)=>({ t:o, right:i===ans }))) }))
      .concat(deep.map(([q, opts, ans]) => {
        // big-idea questions: swap the silliest wrong answer for another story's real lesson, so the right answer can't be spotted by sounding "nice"
        const big = /lesson|moral|author|believe|teach|big idea|mean\b/i;
        let o = opts.slice();
        if (big.test(q)){
          const other = shuffle(Object.entries(SON_DEEP).filter(([t]) => t !== st.title).flatMap(([, list]) => list.filter(x => big.test(x[0])).map(x => x[1][x[2]])))
            .find(t => t !== opts[ans] && Math.abs(t.length - opts[ans].length) < 25);
          if (other) o[o.length - 1 === ans ? 1 : o.length - 1] = other;
        }
        return { q, think:true, opts: shuffle(o.map((t,i)=>({ t, right:i===ans }))) };
      }));
  }
  if (!qs || qs.length < 3) qs = st.qs.slice(0, 5).map(([q, opts, ans]) => ({ q, opts: shuffle(opts.map((o,i)=>({ t:o, right:i===ans }))) }));
  if (!qs.extra){ try { qs.extra = shuffle(expertExtras(st)).filter(x => !qs.some(y => y.q === x.q)); } catch(e){ qs.extra = []; } }
  run.quiz = { qs, i:0, correct:0 };
  // boss battles: every answer is saved the moment it's tapped, so leaving the game can't erase a wrong answer
  if (run.opts.boss){
    const lv = run.act.level, saved = K.bossRun;
    if (saved && saved.level === lv && saved.date === todayStr() && !saved.done && saved.qs && saved.qs.length){
      const rq = saved.qs.map(x => JSON.parse(JSON.stringify(x))); rq.extra = (saved.extra || []).map(x => JSON.parse(JSON.stringify(x)));
      run.quiz = { qs: rq, i: Math.min(saved.answers.length, rq.length - 1), correct: saved.answers.filter(a => a.right).length, resumed: saved.answers.length };
      if (saved.answers.length >= rq.length){ run.quiz.i = rq.length; return bossResult(); }
    } else {
      K.bossRun = { level: lv, date: todayStr(), qs: qs.map(x => ({ q:x.q, think:x.think, opts:x.opts })), extra: (qs.extra || []).slice(0, 6), answers: [], done:false };
      save();
    }
  }
  renderQuestion();
}
function bossSaveAnswer(item, right, t){
  const br = K.bossRun; if (!run || !run.opts.boss || !br || br.done) return;
  br.qs[run.quiz.i] = { q:item.q, think:item.think, opts:item.opts };      // a power may have swapped the question: keep the one she saw
  br.answers[run.quiz.i] = { right: !!right, t };
  save();
}
function bossResting(level){ const br = K.bossRun; return !!(br && br.level === level && br.date === todayStr() && br.done && !br.won); }
function renderQuestion(){
  const Q = run.quiz, item = Q.qs[Q.i];
  let answered = false;
  const fb = el('div',{class:'feedback'});
  if (run.opts.boss && Q.resumed && Q.i === Q.resumed){ fb.textContent = `🔒 Your first ${Q.resumed} answer${Q.resumed > 1 ? 's are' : ' is'} saved (${Q.correct} right). Keep going!`; fb.style.color = '#b45309'; }
  const nextBtn = el('button',{class:'btn hidden', onclick:()=>{ Q.i++; Q.i < Q.qs.length ? renderQuestion() : run.opts.boss ? bossResult() : (run.opts.focus ? storyBuilder(run.opts.focus, screenResults) : screenResults()); }}, Q.i < Q.qs.length-1 ? 'Next question ▶' : 'See my stars ⭐');
  const opts = el('div',{class:'options'});
  const proofBox = el('div',{class:'proof-box hidden'});
  item.opts.forEach(o => {
    const b = el('button',{class:'opt'}, el('span',{}, o.t),
      el('span',{class:'say', onclick:ev=>{ ev.stopPropagation(); say(o.t); }}, '🔊'));
    b.addEventListener('click', () => {
      if (answered) return;
      if (!o.right && Q.frostArmed === item && !item.frostUsed){ item.frostUsed = true; trackQ(item.q, false); b.classList.add('wrong', 'frozen'); b.disabled = true; beep('tap'); fb.textContent = PW() === 'invisible' ? '👻 It missed you! You were invisible. Try again!' : '❄️ Frozen! Time stopped. Try again!'; fb.style.color = '#0369a1'; return; }
      answered = true;
      bossSaveAnswer(item, o.right, o.t);
      if (!item.frostUsed) trackQ(item.q, o.right);
      if (memory && !item.looked && o.right){ run.proofStars = (run.proofStars || 0) + 1; setTimeout(() => { fb.textContent += '  🧠 Memory bonus +1 ⭐'; }, 30); }
      if (memory) reveal(false);
      if (o.right){ b.classList.add('right'); Q.correct++; powerOnAnswer(Q, true, fb); beep('ok'); burst(); if (run.opts.boss) bossHud(true); fb.textContent = pick(['Yes! 🎉','You got it! ⭐','Awesome! 🙌','Correct! 🌟']); fb.style.color = 'var(--ok)'; startProof(o.t); }
      else {
        b.classList.add('wrong'); beep('bad'); fb.textContent = 'Good try! The answer is highlighted in green.'; fb.style.color = 'var(--bad)'; powerOnAnswer(Q, false, fb);
        [...opts.children].forEach((c, idx) => { if (item.opts[idx].right) c.classList.add('right'); });
      }
      nextBtn.classList.remove('hidden');
    });
    opts.append(b);
  });
  // Gianna's quiet reads: after a right answer, find the sentence in the story that proves it (+1 ⭐).
  // Skipped for feeling/opinion questions where no single sentence clearly says the answer.
  const startProof = answer => {
    if (!run.act.quiet) return;
    const sc = proofScores(card.sentences, item.q, answer.replace(/[^\w\s'’-]/g,' ')), best = Math.max(0, ...sc);
    if (best < 2) return;
    let tries = 0;
    proofBox.classList.remove('hidden');
    proofBox.textContent = '🔎 Bonus: tap the sentence in the story that proves your answer!';
    card.proof((s, spans) => {
      card.sentSpans.forEach(sp => (sp || []).forEach(n => n.classList.remove('proof-pick','proof-ok','proof-no')));
      if (sc[s] >= Math.max(2, best * 0.6)){
        spans.forEach(n => n.classList.add('proof-ok')); card.proof(null);
        run.proofStars = (run.proofStars || 0) + 1; beep('star'); burst('PROOF!');
        proofBox.textContent = '🔎 Great detective work! That sentence proves it. +1 ⭐';
      } else if (++tries < 2){
        spans.forEach(n => n.classList.add('proof-no')); beep('bad');
        proofBox.textContent = '🔎 Hmm, not that one. Look for the sentence that talks about the answer!';
      } else {
        card.proof(null);
        card.sentSpans[sc.indexOf(best)].forEach(n => n.classList.add('proof-ok'));
        proofBox.textContent = '🔎 Here\'s the sentence that proves it, in green.';
      }
    });
  };
  const st = run.act.story;
  const card = passageCard(run.act.book
      ? `${run.act.book.emoji} ${run.act.book.title} · Chapter ${run.act.chapterIndex + 1} of ${run.act.book.chapters.length}: ${st.title}`
      : (st.emoji ? st.emoji + ' ' : '') + st.title,
    st.text, run.marks || (run.marks = {}));
  // Challenge mode: the story starts hidden. Answer from memory for a bonus star, or tap to look back.
  const memory = ['challenge','expert'].includes(quizLevelOf(kid)) && !run.opts.boss;
  const reveal = looked => { card.classList.remove('peek-hidden'); const c = card.querySelector('.peek-cover'); if (c) c.remove(); if (looked) item.looked = true; };
  if (memory){ card.classList.add('peek-hidden'); card.append(el('div',{class:'peek-cover'},
    el('div',{class:'peek-e'},'🧠'), el('b',{}, 'Answer from memory for +1 ⭐'),
    el('button',{class:'btn small', onclick:()=>{ beep('tap'); reveal(true); }}, '📖 Look back in the story'))); }
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); const book = run && run.act.book; run = null; book ? screenBookshelf() : screenHome(); }},'← Back'),
      el('div',{class:'pageinfo'}, '🤔 Question ' + (Q.i+1) + ' of ' + Q.qs.length), el('div',{style:'width:80px'})),
    el('div',{class:'quiz-layout'},
      card,
      el('div',{class:'card'},
        el('div',{class:'row', style:'align-items:flex-start'},
          el('p',{class:'q-text grow'}, item.think ? el('span',{class:'think-chip'}, '🧠 Think deeper') : null, item.think ? el('br') : null, item.q),
          el('button',{class:'btn small blue', onclick:()=>say(item.q)},'🔊')),
        opts, (() => { try { return powerButton(Q, item, opts, card, fb, () => reveal(false)); } catch(e){ return null; } })(), fb, proofBox, el('div',{class:'row', style:'margin-top:10px'}, nextBtn))));
  show(s);
  if (TK === 'son'){ (async()=>{ await say(item.q); })(); }
}
const pick = a => a[Math.floor(Math.random()*a.length)];
/* Kid-friendly meanings for harder words in the stories (📖 Meaning tool). Keys are base forms;
   defFor() also finds -s, -es, -ed, -ing, -ly forms. */
const GLOSSARY = {
  academy:'a special school', apprentice:'someone who is just starting to learn a skill', merchant:'a person who buys and sells things',
  staff:'a tall walking stick', practice:'to do something again and again to get better', gift:'a special talent; or a present',
  glow:'to shine with a soft light', magic:'a power that makes impossible things happen', floating:'resting on air or water without sinking',
  crystal:'a clear, shiny stone', fade:'to slowly get weaker or dimmer', dangerous:'likely to hurt you; not safe',
  droop:'to hang down, tired or sad', mysterious:'strange and hard to explain', stranger:'someone you don\'t know',
  cloak:'a loose coat with no sleeves', firmly:'in a strong, sure way', pale:'light in color, almost white',
  trust:'to believe someone is honest and good', wagon:'a cart with four wheels', goods:'things for sale',
  winding:'twisting and turning', staircase:'a set of stairs', velvet:'a soft, fuzzy cloth', sparkling:'shining with tiny flashes of light',
  rare:'not often found; special', hatch:'to break out of an egg', bond:'a close, special friendship',
  cruel:'mean and hurtful on purpose', control:'to make something do what you want', shiver:'to shake a little from cold or fear',
  kneel:'to rest on your knees', allowed:'given permission', nervously:'in a worried, jumpy way', courage:'being brave even when you\'re scared',
  shadow:'a dark shape made when something blocks light', foam:'to make lots of tiny bubbles', leap:'to jump high or far',
  skid:'to slide without meaning to', tumble:'to fall and roll over', whisper:'to talk very softly', rustle:'to make a soft, crackly sound',
  clearing:'an open space in a forest', crooked:'bent, not straight', knotted:'tied or twisted together', freeze:'to stop moving suddenly',
  scales:'small hard plates that cover a dragon or fish', sprite:'a small magical creature', flatten:'to press down flat',
  trap:'to catch and keep someone from leaving', warn:'to tell someone about danger', deal:'an agreement between two people',
  rumble:'a deep, rolling sound', canyon:'a deep valley with steep rock sides', entirely:'completely', vanish:'to disappear suddenly',
  tremble:'to shake', pound:'to beat hard and fast', brilliant:'very bright; or very smart', effort:'hard work and trying',
  glisten:'to shine because it is wet', refuse:'to say no', exhausted:'extremely tired', collapse:'to fall down suddenly',
  sturdy:'strong and hard to break', gargoyle:'a stone statue of a scary creature', distract:'to pull someone\'s attention away',
  cluttered:'messy and full of stuff', enormous:'very, very big', boulder:'a very large rock', swirl:'to spin around and around',
  grip:'to hold on tightly', flicker:'to shine on and off quickly', shrivel:'to dry up and shrink', budge:'to move a tiny bit',
  spiral:'curling around and around, like a spring', lash:'to hit hard, like rain in a storm', howl:'to make a long, loud cry',
  zigzag:'going sharply one way, then the other', shriek:'a high, loud scream', flinch:'to jerk back because you\'re scared',
  command:'to give an order', drizzle:'light, gentle rain', lonely:'sad because you are alone', earn:'to get something by working for it',
  genuinely:'really and truly', crescent:'shaped like a thin, curved moon', fascinated:'very, very interested', observe:'to watch carefully',
  gracefully:'in a smooth, beautiful way', stern:'serious and strict', expression:'the look on someone\'s face',
  ceremony:'a special event to celebrate something', extraordinary:'very unusual and amazing', fasten:'to attach or close tightly',
  rafters:'the beams that hold up a roof', ancient:'very, very old', restless:'not able to stay still or calm', magnificent:'beautiful and grand',
  patience:'waiting calmly without getting upset', delicate:'fine and easy to break', facet:'one flat, shiny side of a gem',
  bustling:'busy and full of people', chaos:'a big, wild mess', grateful:'thankful', expedition:'a trip to explore a place',
  breathtaking:'so beautiful it surprises you', chandelier:'a fancy hanging light with many parts', shimmer:'to shine with a soft, wavy light',
  desperately:'needing something very badly', navigator:'the person who figures out which way to go', spyglass:'a small telescope',
  miserable:'very unhappy', cautious:'careful to stay safe', suspiciously:'in a way that shows you don\'t trust something',
  curious:'wanting to know or learn more', battered:'old and worn out from use', sketch:'to draw quickly',
  frantic:'wildly worried and rushing', grid:'a pattern of squares made by crossing lines', stakeout:'watching quietly to see what happens',
  responsible:'doing what you promised, and doing it well', latch:'a small lock that keeps a gate or door shut', flyer:'a paper that tells people about something',
  official:'real and approved', memory:'something you remember', appropriate:'right for the time or place', anniversary:'the same date as a special event, years later',
  program:'a planned group or set of activities', guilty:'feeling bad because you did something wrong', relieved:'happy that a worry is gone',
  furious:'very, very angry', retrace:'to go back the same way you came', mystery:'something strange that needs to be figured out',
  detective:'someone who solves mysteries by finding clues', clue:'a hint that helps solve a mystery', expert:'someone who knows a lot about something',
  lighthouse:'a tall tower with a bright light that guides ships', horizon:'the line where the sky seems to meet the land or sea',
  creak:'to make a squeaky sound, like an old door', echo:'a sound that bounces back so you hear it again', signal:'a sign that sends a message',
  telescope:'a tube that makes faraway things look close', journal:'a book where you write about your days', inherit:'to receive something from someone in your family',
  lantern:'a light you can carry', tide:'the rising and falling of the sea each day', gust:'a quick, strong rush of wind', puzzled:'confused; not sure what something means'
};
function defFor(raw){
  const w = norm(raw);
  if (!w) return null;
  const tries = [w, w.replace(/ies$/,'y'), w.replace(/es$/,''), w.replace(/s$/,''), w.replace(/ed$/,''), w.replace(/ed$/,'e'), w.replace(/d$/,''),
    w.replace(/ing$/,''), w.replace(/ing$/,'e'), w.replace(/ly$/,''), w.replace(/ily$/,'y'), w.replace(/([a-z])\1(ed|ing)$/,'$1'), w.replace(/elt$/,'eel'), w.replace(/oze$/,'eeze'), w.replace(/eapt$/,'eap')];
  for (const t of tries) if (GLOSSARY[t]) return GLOSSARY[t];
  return null;
}
function showDef(word){
  const old = $('.def-pop'); if (old) old.remove();
  const clean = word.replace(/[^A-Za-z'’-]/g,''), d = defFor(clean);
  const pop = el('div',{class:'def-pop'},
    el('div',{}, el('b',{class:'def-word'}, clean), el('div',{class:'def-text'}, d ? d : 'No meaning saved for this word yet. Try asking a grown-up!')),
    el('button',{class:'btn small blue', onclick:()=>say(d ? `${clean}. ${d}` : clean)},'🔊'),
    el('button',{class:'btn small gray', onclick:()=>pop.remove()},'✕'));
  document.body.append(pop); setTimeout(() => pop.remove(), 9000);
  say(d ? `${clean}. ${d}` : clean, { rate:0.9 });
}

// "Find the proof": which sentence best backs up an answer, by shared content words with the answer (and the question).
const STOP = new Set('the a an and or but to of in on at for with from by is are was were be been it its this that these those he she they them his her their you your we our i my me as so if then than not no yes do did does done have has had what who whom where when why how which there here into onto out up down over under very just also can could would should will shall about after before because while until'.split(' '));
const contentWords = s => s.toLowerCase().replace(/[^a-z' ]/g,' ').split(/\s+/).map(w => w.replace(/'s$/,'')).filter(w => w.length > 2 && !STOP.has(w));
function proofScores(sentences, question, answer){
  const aw = new Set(contentWords(answer)), qw = new Set(contentWords(question));
  return sentences.map(s => { const sw = new Set(contentWords(s)); let sc = 0; aw.forEach(w => { if (sw.has(w)) sc += 2; }); qw.forEach(w => { if (sw.has(w)) sc += 1; }); return sc; });
}

// The story stays on screen during questions so kids can look back for the answer.
// Tools: highlight / underline / erase words to mark clues, or 📖 tap a word for its meaning.
// `marks` ({ "para-word": {h, u} }) lives on the run, so marks stay put from one question to the next.
// card.proof(handler) turns on "tap the sentence that proves it": handler(sentenceIndex, spans).
let markTool = 'h';
function passageCard(title, text, marks){
  marks = marks || {};
  const paint = (n, m) => { n.classList.toggle('hl', !!(m && m.h)); n.classList.toggle('ul', !!(m && m.u)); };
  const apply = (n, toggle) => {
    if (markTool === 'm'){ if (toggle) showDef(n.textContent); return; }
    const k = n.dataset.k, m = marks[k] || (marks[k] = {});
    if (markTool === 'e'){ m.h = false; m.u = false; } else m[markTool] = toggle ? !m[markTool] : true;
    paint(n, m);
  };
  const body = el('div',{class:'mark-body' + (markTool === 'm' ? ' meaning' : '')});
  const sentences = [], sentSpans = [];
  let si = 0, cur = '';
  text.split(/\n\s*\n/).forEach((p, pi) => {
    const para = el('p',{});
    p.trim().split(/\s+/).forEach((w, wi) => {
      const n = el('span',{class:'mw' + (defFor(w) ? ' has-def' : ''), 'data-k': pi + '-' + wi, 'data-s': si}, w);
      paint(n, marks[pi + '-' + wi]); para.append(n, ' ');
      (sentSpans[si] = sentSpans[si] || []).push(n); cur += w + ' ';
      if (/[.!?]["”’)]*$/.test(w)){ sentences[si] = cur.trim(); cur = ''; si++; }
    });
    if (cur){ sentences[si] = cur.trim(); cur = ''; si++; }
    body.append(para);
  });
  const tools = el('div',{class:'mark-tools'});
  const drawTools = () => {
    tools.innerHTML = '';
    [['h','🖍️ Highlight'],['u','U̲ Underline'],['e','🧽 Erase'],['m','📖 Meaning']].forEach(([t, label]) =>
      tools.append(el('button',{class:'mark-tool' + (markTool === t ? ' on' : ''), onclick:()=>{ markTool = t; body.classList.toggle('meaning', t === 'm'); drawTools(); }}, label)));
    tools.append(el('button',{class:'mark-tool', onclick:()=>{ Object.keys(marks).forEach(k => delete marks[k]); body.querySelectorAll('.mw').forEach(n => paint(n, null)); }},'↺ Clear'));
  };
  drawTools();
  let proofHandler = null;
  // tap a word to toggle; slide sideways across words to mark a phrase (up/down still scrolls)
  let dragging = false, moved = false, last = null;
  body.addEventListener('pointerdown', e => { const n = e.target.closest('.mw'); if (!n) return; dragging = true; moved = false; last = n; });
  body.addEventListener('pointermove', e => {
    if (!dragging || proofHandler || markTool === 'm') return;
    const t = document.elementFromPoint(e.clientX, e.clientY), n = t && t.closest ? t.closest('.mw') : null;
    if (n && n !== last && body.contains(n)){ if (!moved){ apply(last, false); moved = true; } apply(n, false); last = n; }
  });
  body.addEventListener('pointerup', () => {
    if (dragging && !moved && last){ if (proofHandler){ const s = +last.dataset.s; proofHandler(s, sentSpans[s]); } else apply(last, true); }
    dragging = false;
  });
  body.addEventListener('pointercancel', () => { dragging = false; });
  const card = el('div',{class:'card quiz-passage'},
    el('div',{class:'series-tag'},'📖 Look back in the story'),
    el('h3',{}, title),
    el('p',{class:'muted', style:'margin:0 0 4px'},'Tap a word or slide across words to mark clues. 📖 Meaning: tap a word to learn what it means.'),
    tools, body);
  card.sentences = sentences; card.sentSpans = sentSpans;
  card.proof = fn => { proofHandler = fn; body.classList.toggle('proof', !!fn); };
  return card;
}

/* ---------- results + leveling ---------- */
/* Story thresholds. Young readers on the iPad mic: speech recognition misses some correctly read words,
   so Biscuit & Pals needs 92% (not 95%) and only a read under 80% counts as rough. */
const storyPassAcc = () => TK === 'son' ? 0.92 : 0.95;
const storyFailAcc = () => TK === 'son' ? 0.80 : 0.85;
function screenResults(){
  const r = run, R = r.reading, a = r.act;
  const quiz = r.quiz ? { c:r.quiz.correct, t:r.quiz.qs.length } : null;
  const starsFor = () => {
    const L = levelDef(a.level);
    const passAcc = a.kind === 'story' ? storyPassAcc() : (L.pass || 0.9);
    const passQ = !quiz || quiz.c / quiz.t >= 0.8;
    if (a.kind === 'story' && quiz) return quiz.c / quiz.t >= 0.8 ? 3 : quiz.c / quiz.t >= 0.6 ? 2 : 1;   // stories are scored on the questions, not the mic
    if (R.accuracy >= passAcc && passQ) return 3;
    if (R.accuracy >= Math.min(0.85, passAcc - 0.1) && (!quiz || quiz.c / quiz.t >= 0.6)) return 2;
    return 1;
  };
  const statsBox = el('div',{class:'result-grid'});
  const fixBox = el('div',{class:'fixwords hidden'});
  const starsBox = el('div',{class:'stars'});
  let committed = false;
  const commitOnce = () => { if (committed) return; committed = true; commitResults(starsFor(), quiz); };
  const countsForLevel = r.opts.mode === 'normal' && a.level === K.level && K.level < T.levels.length;
  const lvlNote = countsForLevel ? el('div',{class:'lvl-note'}) : null;
  const paint = () => {
    const st = starsFor();
    starsBox.innerHTML = ''; for (let i=0;i<3;i++) starsBox.append(el('span',{}, i < st ? '⭐' : '☆'));
    if (lvlNote){
      const have = Math.min((K.passStreak||0) + (st === 3 ? 1 : 0), LEVEL_UP_STREAK);
      // say exactly what this read got vs. what ⭐⭐⭐ needs
      const L = levelDef(a.level), passAcc = a.kind === 'story' ? storyPassAcc() : (L.pass || 0.9);
      const gap = st === 3 ? '' : [
        !a.quiet && a.kind !== 'story' && R.accuracy < passAcc ? `You read ${R.correct} of ${R.total} ${a.kind === 'letters' ? 'sounds' : 'words'} right. ⭐⭐⭐ needs ${Math.ceil(passAcc * R.total - 1e-9)}.` : '',
        quiz && quiz.c / quiz.t < 0.8 ? `You got ${quiz.c} of ${quiz.t} questions. ⭐⭐⭐ needs ${Math.ceil(0.8 * quiz.t - 1e-9)}.` : ''
      ].filter(Boolean).join(' ') + ' ';
      const failAcc = a.kind === 'story' ? storyFailAcc() : (a.kind === 'letters' ? 0.6 : 0.7);
      const rough = (a.kind !== 'story' && R.accuracy < failAcc) || (quiz && quiz.c / quiz.t < 0.6), cur = Math.min(K.passStreak||0, LEVEL_UP_STREAK);
      lvlNote.textContent = gap + (st === 3
        ? (have >= LEVEL_UP_STREAK ? (bossFor(K.level) ? `🎉 That's ${LEVEL_UP_STREAK} great reads. ⚔️ The boss is coming!` : `🎉 That's ${LEVEL_UP_STREAK} great reads. ${TK === 'daughter' ? 'Rank' : 'Level'} up!`) : `✅ This counts! ${have} of ${LEVEL_UP_STREAK} toward the next ${TK === 'daughter' ? 'rank' : 'level'}.`)
        : rough ? `Your star boxes go from ${cur} to ${Math.max(0, cur - 1)} of ${LEVEL_UP_STREAK}. You can do it next time!`
        : `Good read! Your star boxes stay at ${cur} of ${LEVEL_UP_STREAK}.`);
    }
    statsBox.innerHTML = '';
    if (!a.quiet) statsBox.append(el('div',{class:'stat'}, el('b',{}, Math.round(R.accuracy*100)+'%'), el('span',{},'words read right')));
    if (R.wcpm != null) statsBox.append(el('div',{class:'stat'}, el('b',{}, R.wcpm), el('span',{},'words per minute')));
    if (quiz) statsBox.append(el('div',{class:'stat'}, el('b',{}, quiz.c + '/' + quiz.t), el('span',{},'questions right')));
    if (r.proofStars) statsBox.append(el('div',{class:'stat'}, el('b',{}, '🔎 ' + r.proofStars), el('span',{},'bonus stars (proof & memory)')));
    if (R.helped) statsBox.append(el('div',{class:'stat'}, el('b',{}, R.helped), el('span',{},'words helped')));
  };
  // grown-up fix: list every word; tap toggles ok/miss
  const buildFix = () => {
    fixBox.innerHTML = '';
    fixBox.append(el('p',{class:'muted'},'Grown-up: tap a word to switch it between ✓ right (green) and ✗ missed (red). Scores update before saving.'));
    a.pages.forEach(p => p.tokens.forEach((t,i) => {
      if (t.skip) return;
      const w = el('span',{class:'w ' + (p.status[i]==='ok' && !p.helped[i] ? 'ok' : 'miss')}, t.disp);
      w.addEventListener('click', () => {
        if (p.status[i] === 'ok' && !p.helped[i]){ p.status[i] = 'miss'; }
        else { p.status[i] = 'ok'; p.helped[i] = false; }
        run.reading = Object.assign(computeReading(), { wcpm: R.wcpm });
        Object.assign(R, run.reading);
        w.className = 'w ' + (p.status[i]==='ok' ? 'ok' : 'miss'); paint();
      });
      fixBox.append(w);
    }));
  };
  paint();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'},
      // going back still saves the stars and progress from this read
      el('button',{class:'btn ghost small', onclick:commitOnce},'← Back'),
      el('h1',{class:'title'}, r.opts.mode==='practice' ? 'Practice done!' : 'You did it!'), el('div')),
    el('div',{class:'card'},
      el('div',{class:'result-avatar'}),
      starsBox,
      el('h2',{class:'center', style:'margin:6px 0'}, (a.emoji||'') + ' ' + a.title),
      lvlNote,
      statsBox,
      r.opts.focus ? (()=>{ const f = scoreFocus(a, r.opts.focus), st = skillsState()[r.opts.focus.id] || { reads:0, right:0, stories:0 };
        return el('div',{class:'skill-line'}, el('b',{}, `⚡ ${r.opts.focus.lesson.title} skill: `), `${f.right} of ${f.reads} pattern words read right this story`,
          el('span',{class:'muted'}, skillKnown(r.opts.focus.id) ? ' · ✅ mastered' : ` · ${st.stories} of 2+ stories toward mastery`)); })() : null,
      a.quiet ? null : R.missed.length ? el('p',{style:'font-size:20px'}, 'Words to practice: ', ...[...new Set(R.missed)].slice(0,8).map(w => el('span',{class:'chip', onclick:()=>say(w)}, '🔊 ' + w))) : el('p',{style:'font-size:22px'},'Every word right! 🎉'),
      el('div',{class:'row', style:'margin-top:16px'},
        el('button',{class:'btn big green', onclick:commitOnce},'Continue ▶'),
        a.quiet ? null : el('button',{class:'btn small gray', onclick:()=>{ if (fixBox.classList.contains('hidden')){ buildFix(); fixBox.classList.remove('hidden'); } else fixBox.classList.add('hidden'); }},'✎ Grown-up fix')),
      fixBox));
  show(s);
  beep('star'); if (starsFor() === 3) confetti(40);
  const av = $('.result-avatar'); if (av) av.append(avatarNode(110));
}

async function commitResults(stars, quiz){
  const r = run, R = r.reading, a = r.act;
  const L = levelDef(a.level);
  const now = new Date();
  // time + daily goal (the streak grows on days the goal is reached)
  const elapsed = Math.min(Date.now() - r.startedAt, MAX_ACTIVITY_MS);
  const goalJustHit = addReadingTime(elapsed);
  const cosmicGains = [];
  if (goalJustHit) cosmicGains.push([1, 'Daily reading goal reached!']);
  // word tracker: misses go on the practice list; 3 correct reads in a row = mastered
  const mastered = a.quiet ? [] : trackWords(a); // quiet reading isn't scored word by word
  K.stars += stars + (r.proofStars || 0);
  if (quiz) K.quizStreak = quiz.c === quiz.t ? (K.quizStreak||0) + 1 : 0;
  if (r.opts.mode === 'normal' && stars === 3) cosmicGains.push([1, 'Perfect 3-star reading!']);
  if (quiz && quiz.c === quiz.t) cosmicGains.push([1, 'Every question right!']);
  if (mastered.length) cosmicGains.push([mastered.length, 'Tricky words mastered!']);

  // session record
  const rec = { id:r.sessionId, date: now.toISOString(), level:a.level, title:a.title, kind:a.kind, mode:r.opts.mode, series:a.series||null,
    total:R.total, correct:R.correct, helped:R.helped, accuracy: a.quiet && quiz ? Math.round(quiz.c / quiz.t * 1000)/10 : Math.round(R.accuracy*1000)/10, wcpm:R.wcpm,
    quiz: quiz ? quiz.c + '/' + quiz.t : null, missed:[...new Set(R.missed)].slice(0,20), stars, hasRec: r.clips.length > 0, ms: elapsed, book: a.book ? a.book.id : null };
  if (a.kind === 'story' && r.opts.mode === 'normal' && a.title){ if (!K.readCount) K.readCount = readCounts(); K.readCount[a.title] = (K.readCount[a.title] || 0) + 1; }
  K.sessions.unshift(rec); K.sessions = K.sessions.slice(0, 200);
  if (r.clips.length) idb.put(r.sessionId, r.clips);
  try { if (typeof v2StoryHook === 'function' && r.opts.mode === 'normal') v2StoryHook(r, R); } catch(e){ console.warn('v2 hook', e); }

  let levelMsg = null, levelUp = false, bookDone = null, bookMsg = null, bossUnlocked = false;
  if (r.opts.mode === 'normal'){
    if (a.kind === 'story') K.storyIdx[a.storyKey] = (K.storyIdx[a.storyKey]||0) + 1;
    if (a.book){ // chapter books: move the bookmark on a decent score, otherwise re-read this chapter
      const B = bookState(a.book.id);
      if (quiz && quiz.c >= 3){
        if (a.chapterIndex >= B.ch) B.ch = a.chapterIndex + 1;
        if (B.ch >= a.book.chapters.length){ B.ch = 0; B.finished = (B.finished || 0) + 1; bookDone = a.book; K.stars += 10; cosmicGains.push([3, 'You finished a chapter book!']); }
      } else bookMsg = `📖 Read Chapter ${a.chapterIndex + 1} of ${a.book.title} again, then you can go on to the next chapter!`;
    }
    const passAcc = a.kind === 'story' ? storyPassAcc() : (L.pass || 0.9);
    const failAcc = a.kind === 'story' ? storyFailAcc() : (a.kind === 'letters' ? 0.6 : 0.7);
    const byQuiz = a.kind === 'story' && quiz;   // stories: questions decide (the iPad mic isn't reliable enough to grade on)
    const passed = byQuiz ? quiz.c / quiz.t >= 0.8 : R.accuracy >= passAcc && (!quiz || quiz.c / quiz.t >= 0.8);
    const failed = byQuiz ? quiz.c / quiz.t < 0.6 : R.accuracy < failAcc || (quiz && quiz.c / quiz.t < 0.6);
    // a great read adds to the level-up count, a rough read takes one away, an okay read leaves it alone
    if (passed){ K.passStreak++; K.failStreak = 0; }
    else if (failed){ K.failStreak++; K.passStreak = Math.max(0, (K.passStreak||0) - 1); }
    else K.failStreak = 0;
    if (K.passStreak >= 3 && bossFor(K.level) && K.bossReady !== K.level && !(K.level >= T.levels.length && (K.bossesBeaten||[]).includes(K.level))){ K.bossReady = K.level; K.passStreak = 0; bossUnlocked = true; }
    else if (K.passStreak >= 3 && K.level < T.levels.length && !bossFor(K.level)){ K.level++; K.passStreak = 0; levelUp = true; cosmicGains.push([5, 'You leveled up!']); }
    // drop back only after 3 rough reads in a row, and never back to Miles' mic-unfriendly letter sounds
    else if (K.failStreak >= 3 && K.level > (TK === 'son' ? 2 : 1)){ K.level--; K.levelDownAt = Date.now(); K.failStreak = 0; K.passStreak = 0;
      levelMsg = TK==='daughter' ? '🛡️ Training mission! Let\'s build your dragon skills with some practice stories.' : '💪 Practice time! Let\'s make your reading muscles super strong.'; }
  }
  save();
  cosmicGains.forEach(([n, why]) => addCosmic(n, why));

  if (r.opts.focus) await commitSkill(a, r.opts.focus);
  // rewards
  if (mastered.length){
    confetti(50); beep('level'); say(`You mastered ${mastered.length === 1 ? 'a tricky word' : mastered.length + ' tricky words'}!`);
    await modal(el('div',{}, el('div',{class:'big-e'},'🎯'), el('h2',{}, 'Word mastered!'),
      el('p',{}, mastered.map(w => (K.words[w].disp||w)).join(', ') + ' — read right 3 times in a row!')), [['Yes! ▶','',1]]);
  }
  if (stars >= 2 && r.opts.mode === 'normal') await giveReward();
  if (stars >= 2 && r.opts.mode === 'normal') await maybeGearDrop();
  if (stars >= 3 && r.opts.mode === 'normal') await maybeStarfallChest(); // super rare mythic drop
  if (stars >= 2 && r.opts.mode === 'normal') awardChest(stars >= 3 ? 'silver' : 'wood', 'Great reading');
  if (levelUp) awardChest('cosmic', 'Level up');
  if (levelUp){
    awardTrophiesUpTo(K.level); save();
    await levelUpCinematic(K.level);
  }
  if (bossUnlocked){
    const B = bossFor(K.level); confetti(80); beep('level'); burst('BOSS!');
    say(`A boss appeared! ${B.name} is guarding the next level!`);
    await modal(el('div',{}, el('div',{class:'big-e boss-shake', html: bossArt(B, 150)}), el('h2',{}, '⚔️ BOSS UNLOCKED!'),
      el('p',{}, `${B.name} guards ${TK === 'daughter' ? 'Rank' : 'Level'} ${K.level + 1}. Beat the boss story to level up!`), el('p',{class:'boss-taunt'}, `"${B.taunt}"`)), [['⚔️ Let me at it!','',1]]);
  }
  if (goalJustHit) await celebrateGoal();
  if (bookDone){
    confetti(140); beep('level'); say(`You finished the book ${bookDone.title}!`);
    await modal(el('div',{}, el('div',{class:'big-e'}, '📚' + bookDone.emoji), el('h2',{}, 'You finished a chapter book!'),
      el('p',{}, `${bookDone.title}: all ${bookDone.chapters.length} chapters! +10 ⭐`)), [['Hooray! ▶','',1]]);
  }
  await checkBadges();
  run = null;
  screenHome([levelMsg, bookMsg].filter(Boolean).join(' ') || null);
}

function legendaryAt(level){ return T.rewards.find(r => r[3] === level); }
async function giveReward(){
  const list = T.rewards;
  const owned = new Set(K.collection);
  const eligible = list.filter(r => !owned.has(r[1]) && (r[3]||0) <= K.level);
  // legendaries the kid has unlocked come first; otherwise normal order
  const available = eligible.filter(r => r[3]).concat(TK==='son' ? shuffle(eligible.filter(r => !r[3])) : eligible.filter(r => !r[3]));
  if (!available.length){
    K.stars += 3; save(); beep('star');
    await modal(el('div',{}, el('div',{class:'big-e'},'🎁'), el('h2',{},'Bonus stars!'), el('p',{},'You found everyone at this level! +3 ⭐ for the Star Shop. Level up to unlock legendary friends!')), [['Yay! ▶','',1]]);
    return;
  }
  if (TK === 'daughter'){
    K.eggProgress = (K.eggProgress||0) + 1;
    if (K.eggProgress < 2){
      save();
      await modal(el('div',{}, el('div',{class:'egg'},'🥚'), el('h2',{},'Your dragon egg is warming up!'),
        el('p',{},'Read one more great story to hatch it!')), [['Keep reading! ▶','',1]]);
      return;
    }
    K.eggProgress = 0;
    const [e, n, type, lv] = available[0];
    K.collection.push(n); save();
    confetti(lv ? 140 : 60); beep('level'); say(`Your egg hatched! Meet ${n}, the ${type} dragon!`);
    await modal(el('div',{}, el('div',{class:'big-e'}, '🐉' + e), el('h2',{}, (lv ? '✨ LEGENDARY! ' : '') + 'Meet ' + n + '!'),
      el('p',{}, `A baby ${type} dragon hatched and flew to your Dragon Roost!`)), [['Hooray! ▶','',1]]);
  } else {
    const [e, n, , lv] = available[0];
    K.collection.push(n); save();
    confetti(lv ? 140 : 50); beep('star'); say(`You found ${n}! It joined your creature book!`);
    await modal(el('div',{}, el('div',{class:'big-e'}, e), el('h2',{}, (lv ? '✨ LEGENDARY! ' : '') + 'You found ' + n + '!'),
      el('p',{},'A new Pocket Pal joined your Creature Book!')), [['Yay! ▶','',1]]);
  }
}

function screenCollection(){
  const owned = new Set(K.collection);
  const grid = el('div',{class:'collection'});
  T.rewards.forEach(([e,n,type,lv]) => grid.append(el('div',{class:'critter' + (owned.has(n)?'':' locked') + (lv?' legendary':'')},
    el('div',{class:'e'}, owned.has(n) ? e : (lv && lv > K.level ? '🔒' : '❔')), el('div',{class:'n'}, owned.has(n) ? n : '???'),
    lv ? el('div',{class:'muted'}, owned.has(n) ? '✨ Legendary' : '✨ Legendary · Level ' + lv) : (type && owned.has(n) ? el('div',{class:'muted'}, type + ' dragon') : null))));
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
      el('h1',{class:'title'}, TK==='daughter' ? '🐉 My Dragons' : '📖 Pals'), el('div')),
    TK==='daughter' ? el('div',{class:'card', style:'margin-bottom:16px; display:flex; align-items:center; gap:20px'},
      el('div',{class:'egg'},'🥚'), el('div',{style:'font-size:22px'}, `Egg warmth: ${'🔥'.repeat(K.eggProgress||0)}${'⚪'.repeat(2-(K.eggProgress||0))}`, el('br'), el('span',{class:'muted'},'Great stories (2+ stars) warm your egg. 2 warmth = hatch!'))) : null,
    el('p',{class:'subtitle'}, `${K.collection.length} of ${T.rewards.length} found`),
    grid);
  show(s);
}

/* ================= AVATARS, SHOP, TROPHIES, BADGES, WORD TRACKER ================= */

const AVATAR_BASES = {
  bunny:  { name:'Bunny',  emoji:'🐰', kid:'daughter', color:'#f5ece4' },
  puppy:  { name:'Puppy',  emoji:'🐶', kid:null,       color:'#f4c27a' },   // retired option; still renders if already chosen
  koala:  { name:'Koala',  emoji:'🐨', kid:'daughter', color:'#a8b0bd' },
  kitten: { name:'Kitten', emoji:'🐱', kid:null,       color:'#c9c3d9' },   // retired option; still renders if already chosen
  dragon: { name:'Dragon', emoji:'🐲', kid:'son',      color:'#4ade80' },
  robot:  { name:'Robot',  emoji:'🤖', kid:'son',      color:'#7dd3fc' },
  ninja:  { name:'Ninja',  emoji:'🥷', kid:'son',      color:'#334155' }
};
const AVATAR_UNLOCK_LEVEL = 3;
const COLORS = { pink:'#f9a8d4', mint:'#86efac', sky:'#93c5fd', gold:'#facc15', lilac:'#c4b5fd', fire:'#fb923c', snow:'#f8fafc', midnight:'#1e3a8a' };

// slot, id, name, price, svg-maker
const SHOP = [
  // backgrounds
  ['bg','bg_meadow','Sunny Meadow',10], ['bg','bg_space','Outer Space',20], ['bg','bg_rainbow','Rainbow Sky',20],
  ['bg','bg_castle','Castle Night',25], ['bg','bg_city','Sunset City',25], ['bg','bg_ocean','Under the Sea',25],
  // back
  ['back','rocket','Rocket Boosters',30], ['back','cape','Hero Cape',15], ['back','fairy','Fairy Wings',20],
  ['back','dragonw','Dragon Wings',30], ['back','jetstripes','Lightning Trail',25],
  // head
  ['head','party','Party Hat',10], ['head','crown','Royal Crown',40], ['head','wizard','Wizard Hat',25],
  ['head','bow','Big Bow',10], ['head','headphones','Headphones',15], ['head','propeller','Propeller Cap',20],
  ['head','helmet','Space Helmet',35], ['head','flower','Flower Crown',15],
  // face
  ['face','shades','Cool Shades',10], ['face','stars','Star Glasses',15], ['face','blush','Rosy Cheeks',5], ['face','monocle','Detective Monocle',15],
  // hand
  ['hand','balloon','Balloon',10], ['hand','wand','Magic Wand',15], ['hand','icecream','Ice Cream',10],
  ['hand','glowsword','Glow Sword',20], ['hand','magnifier','Magnifying Glass',15], ['hand','trophycup','Mini Trophy',25],
  // colors
  ...Object.keys(COLORS).map(c => ['color','c_'+c, c[0].toUpperCase()+c.slice(1)+' Paint',15])
];
const SHOP_BY_ID = Object.fromEntries(SHOP.map(s => [s[1], s]));
const SLOT_NAMES = { base:'Buddies', bg:'Backgrounds', back:'Backpacks & Wings', head:'Hats', face:'Faces', hand:'Hands', color:'Colors' };

function avatarSVG(av, size=160, override={}){
  const base = override.base || av.base || 'puppy';
  const eq = Object.assign({}, av.equipped || {}, override);
  const col = eq.color ? COLORS[eq.color.replace('c_','')] : AVATAR_BASES[base].color;
  const dark = shade(col, -0.25);
  let s = `<svg viewBox="0 0 200 220" width="${size}" height="${size*1.1}" xmlns="http://www.w3.org/2000/svg" class="avatar-svg">`;
  s += `<defs><radialGradient id="glow" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".9"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  const layer = (tbl, id, arg) => { try { return (tbl && id && tbl[id]) ? tbl[id](arg) : ''; } catch(e){ return ''; } };
  s += BG[eq.bg || 'none']();
  s += layer(typeof AURA !== 'undefined' ? AURA : null, eq.aura);
  s += layer(BACK, eq.back, col);
  s += BODY[base](col, dark);
  s += layer(typeof NECK !== 'undefined' ? NECK : null, eq.neck);
  s += layer(FACE, eq.face, base);
  s += layer(HEAD, eq.head, base);
  s += layer(typeof SHIELD !== 'undefined' ? SHIELD : null, eq.shield);
  s += layer(HAND, eq.hand);
  s += layer(typeof PET !== 'undefined' ? PET : null, eq.pet);
  return s + '</svg>';
}
function shade(hex, p){
  const n = parseInt(hex.slice(1),16); let r=n>>16, g=(n>>8)&255, b=n&255;
  const f = v => Math.max(0, Math.min(255, Math.round(p<0 ? v*(1+p) : v+(255-v)*p)));
  return '#' + [f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
const BG = {
  none: () => `<circle cx="100" cy="115" r="98" fill="#ffffff" opacity=".55"/>`,
  bg_meadow: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#bae6fd"/><circle cx="160" cy="40" r="18" fill="#fde047"/><path d="M2 170 Q60 140 110 165 T198 160 V188 Q198 218 168 218 H32 Q2 218 2 188Z" fill="#86efac"/>`,
  bg_space: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#0f172a"/>${[[30,30],[170,25],[150,80],[20,120],[180,150],[60,60],[120,20],[40,190],[175,200]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.2" fill="#fff"/>`).join('')}<circle cx="165" cy="55" r="14" fill="#f97316"/><ellipse cx="165" cy="55" rx="24" ry="5" fill="none" stroke="#fde68a" stroke-width="2.5"/>`,
  bg_rainbow: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#e0f2fe"/>${['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'].map((c,i)=>`<path d="M${10+i*9} 150 A${90-i*9} ${90-i*9} 0 0 1 ${190-i*9} 150" fill="none" stroke="${c}" stroke-width="9"/>`).join('')}`,
  bg_castle: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#4c1d95"/><circle cx="40" cy="40" r="14" fill="#fef3c7"/><path d="M110 120 v-40 h10 v10 h8 v-10 h10 v10 h8 v-10 h10 v40 h10 v-55 l8 -14 l8 14 v55 h10 V218 H100 V120Z" fill="#312e81" opacity=".9"/>`,
  bg_city: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="url(#sun)"/><defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#fcd34d"/></linearGradient></defs><path d="M2 150 h20 v-40 h18 v40 h10 v-60 h22 v60 h70 v-50 h20 v50 h14 v-30 h20 V188 Q198 218 168 218 H32 Q2 218 2 188Z" fill="#7c2d12" opacity=".55"/>`,
  bg_ocean: () => `<rect x="2" y="2" width="196" height="216" rx="30" fill="#0e7490"/>${[[30,60,6],[50,40,4],[170,90,7],[160,60,4],[25,150,5]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#a5f3fc" stroke-width="2"/>`).join('')}<path d="M20 218 q10 -40 0 -70 M35 218 q-8 -30 4 -55" stroke="#22c55e" stroke-width="6" fill="none" stroke-linecap="round"/>`
};
const BACK = {
  rocket: () => `<g class="flame"><path d="M19 194 q10 30 20 0 q-10 12 -20 0z" fill="#f97316"/><path d="M161 194 q10 30 20 0 q-10 12 -20 0z" fill="#f97316"/><path d="M24 194 q5 16 10 0z" fill="#fde047"/><path d="M166 194 q5 16 10 0z" fill="#fde047"/></g>
    <rect x="14" y="116" width="30" height="80" rx="12" fill="#cbd5e1" stroke="#334155" stroke-width="4"/><rect x="156" y="116" width="30" height="80" rx="12" fill="#cbd5e1" stroke="#334155" stroke-width="4"/>
    <path d="M14 128 q15 -28 30 0z M156 128 q15 -28 30 0z" fill="#ef4444" stroke="#334155" stroke-width="4" stroke-linejoin="round"/><circle cx="29" cy="156" r="6" fill="#38bdf8"/><circle cx="171" cy="156" r="6" fill="#38bdf8"/>
    <path d="M44 150 h14 M142 150 h14" stroke="#334155" stroke-width="6"/>`,
  cape: () => `<path d="M58 130 Q100 118 142 130 L170 214 Q100 226 30 214Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="4" stroke-linejoin="round"/>`,
  fairy: () => `<g opacity=".85"><ellipse cx="45" cy="135" rx="34" ry="22" transform="rotate(-30 45 135)" fill="#f5d0fe" stroke="#c026d3" stroke-width="3"/><ellipse cx="155" cy="135" rx="34" ry="22" transform="rotate(30 155 135)" fill="#f5d0fe" stroke="#c026d3" stroke-width="3"/><ellipse cx="52" cy="172" rx="22" ry="14" transform="rotate(25 52 172)" fill="#e9d5ff" stroke="#c026d3" stroke-width="3"/><ellipse cx="148" cy="172" rx="22" ry="14" transform="rotate(-25 148 172)" fill="#e9d5ff" stroke="#c026d3" stroke-width="3"/></g>`,
  dragonw: () => `<path d="M70 140 L10 95 L22 130 L4 135 L26 158 L12 170 L70 172Z" fill="#16a34a" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/><path d="M130 140 L190 95 L178 130 L196 135 L174 158 L188 170 L130 172Z" fill="#16a34a" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/>`,
  jetstripes: () => `<path d="M20 150 l18 -10 l-6 14 l18 -8" stroke="#facc15" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M180 150 l-18 -10 l6 14 l-18 -8" stroke="#facc15" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 185 l18 -8 l-6 12 l18 -6" stroke="#fde047" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M186 185 l-18 -8 l6 12 l-18 -6" stroke="#fde047" stroke-width="5" fill="none" stroke-linecap="round"/>`
};
const BODY = {
  puppy: (c, d) => `<ellipse cx="100" cy="170" rx="44" ry="38" fill="${c}" stroke="#78350f" stroke-width="4"/><ellipse cx="100" cy="178" rx="24" ry="20" fill="#fff7ed"/>
    <ellipse cx="78" cy="204" rx="14" ry="9" fill="${c}" stroke="#78350f" stroke-width="4"/><ellipse cx="122" cy="204" rx="14" ry="9" fill="${c}" stroke="#78350f" stroke-width="4"/>
    <ellipse cx="56" cy="98" rx="17" ry="32" transform="rotate(18 56 98)" fill="${d}" stroke="#78350f" stroke-width="4"/><ellipse cx="144" cy="98" rx="17" ry="32" transform="rotate(-18 144 98)" fill="${d}" stroke="#78350f" stroke-width="4"/>
    <circle cx="100" cy="92" r="46" fill="${c}" stroke="#78350f" stroke-width="4"/><ellipse cx="100" cy="110" rx="24" ry="17" fill="#fff7ed"/>
    <circle cx="82" cy="86" r="7" fill="#1f2937"/><circle cx="118" cy="86" r="7" fill="#1f2937"/><circle cx="84" cy="84" r="2.4" fill="#fff"/><circle cx="120" cy="84" r="2.4" fill="#fff"/>
    <ellipse cx="100" cy="103" rx="9" ry="6.5" fill="#1f2937"/><path d="M100 109 v6 M90 116 q10 8 20 0" stroke="#1f2937" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M96 118 q4 10 8 0z" fill="#f472b6"/>`,
  bunny: (c, d) => `<ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#7c5a46" stroke-width="4"/><ellipse cx="100" cy="178" rx="22" ry="20" fill="#fff"/>
    <ellipse cx="80" cy="204" rx="14" ry="9" fill="${c}" stroke="#7c5a46" stroke-width="4"/><ellipse cx="122" cy="204" rx="14" ry="9" fill="${c}" stroke="#7c5a46" stroke-width="4"/>
    <circle cx="140" cy="192" r="12" fill="#fff" stroke="#7c5a46" stroke-width="3"/>
    <ellipse cx="78" cy="38" rx="15" ry="38" transform="rotate(-10 78 38)" fill="${c}" stroke="#7c5a46" stroke-width="4"/><ellipse cx="122" cy="38" rx="15" ry="38" transform="rotate(10 122 38)" fill="${c}" stroke="#7c5a46" stroke-width="4"/>
    <ellipse cx="78" cy="40" rx="7" ry="28" transform="rotate(-10 78 40)" fill="#fbcfe8"/><ellipse cx="122" cy="40" rx="7" ry="28" transform="rotate(10 122 40)" fill="#fbcfe8"/>
    <circle cx="100" cy="94" r="46" fill="${c}" stroke="#7c5a46" stroke-width="4"/>
    <circle cx="82" cy="88" r="7" fill="#1f2937"/><circle cx="118" cy="88" r="7" fill="#1f2937"/><circle cx="84" cy="85" r="2.5" fill="#fff"/><circle cx="120" cy="85" r="2.5" fill="#fff"/>
    <path d="M95 102 h10 l-5 6z" fill="#f472b6"/><path d="M100 108 v5 M100 113 q-6 6 -12 2 M100 113 q6 6 12 2" stroke="#7c5a46" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="95" y="114" width="10" height="7" rx="2" fill="#fff" stroke="#7c5a46" stroke-width="1.5"/>
    <ellipse cx="70" cy="106" rx="8" ry="5" fill="#f9a8d4" opacity=".7"/><ellipse cx="130" cy="106" rx="8" ry="5" fill="#f9a8d4" opacity=".7"/>
    <path d="M58 100 h18 M60 108 l16 -3 M142 100 h-18 M140 108 l-16 -3" stroke="#7c5a46" stroke-width="2" stroke-linecap="round"/>`,
  koala: (c, d) => `<ellipse cx="100" cy="170" rx="44" ry="38" fill="${c}" stroke="#374151" stroke-width="4"/><ellipse cx="100" cy="178" rx="24" ry="20" fill="#f3f4f6"/>
    <ellipse cx="78" cy="204" rx="14" ry="9" fill="${c}" stroke="#374151" stroke-width="4"/><ellipse cx="122" cy="204" rx="14" ry="9" fill="${c}" stroke="#374151" stroke-width="4"/>
    <circle cx="54" cy="66" r="28" fill="${c}" stroke="#374151" stroke-width="4"/><circle cx="146" cy="66" r="28" fill="${c}" stroke="#374151" stroke-width="4"/>
    <circle cx="56" cy="68" r="16" fill="#f9d5e5"/><circle cx="144" cy="68" r="16" fill="#f9d5e5"/>
    <path d="M40 58 q-6 -4 -4 -10 M160 58 q6 -4 4 -10" stroke="#f3f4f6" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="94" r="46" fill="${c}" stroke="#374151" stroke-width="4"/>
    <circle cx="80" cy="86" r="6.5" fill="#1f2937"/><circle cx="120" cy="86" r="6.5" fill="#1f2937"/><circle cx="82" cy="84" r="2.2" fill="#fff"/><circle cx="122" cy="84" r="2.2" fill="#fff"/>
    <ellipse cx="100" cy="102" rx="13" ry="17" fill="#374151"/><ellipse cx="96" cy="96" rx="4" ry="6" fill="#6b7280"/>
    <path d="M90 122 q10 7 20 0" stroke="#1f2937" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="70" cy="108" rx="8" ry="5" fill="#f9a8d4" opacity=".6"/><ellipse cx="130" cy="108" rx="8" ry="5" fill="#f9a8d4" opacity=".6"/>`,
  dragon: (c, d) => `<path d="M136 196 q44 4 46 -30 q2 -14 -10 -18" stroke="${d}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M168 146 l14 -6 l-4 14z" fill="#f97316" stroke="#14532d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M62 150 L30 120 L38 146 L24 152 L58 170Z" fill="${d}" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/><path d="M138 150 L170 120 L162 146 L176 152 L142 170Z" fill="${d}" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#14532d" stroke-width="4"/>
    <ellipse cx="100" cy="176" rx="22" ry="26" fill="#fef08a"/><path d="M82 166 h36 M80 178 h40 M84 190 h32" stroke="#ca8a04" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="80" cy="204" rx="13" ry="9" fill="${c}" stroke="#14532d" stroke-width="4"/><ellipse cx="120" cy="204" rx="13" ry="9" fill="${c}" stroke="#14532d" stroke-width="4"/>
    <path d="M72 58 L62 26 L88 50Z M128 58 L138 26 L112 50Z" fill="#fde68a" stroke="#14532d" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="100" cy="90" r="46" fill="${c}" stroke="#14532d" stroke-width="4"/>
    <path d="M92 46 l8 -14 l8 14z" fill="#f97316" stroke="#14532d" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="80" cy="82" rx="10" ry="12" fill="#fff"/><ellipse cx="120" cy="82" rx="10" ry="12" fill="#fff"/><circle cx="82" cy="84" r="6" fill="#1f2937"/><circle cx="118" cy="84" r="6" fill="#1f2937"/><circle cx="84" cy="81" r="2" fill="#fff"/><circle cx="120" cy="81" r="2" fill="#fff"/>
    <ellipse cx="100" cy="110" rx="26" ry="16" fill="${shade(c, 0.35)}" stroke="#14532d" stroke-width="3"/><circle cx="92" cy="106" r="3" fill="#14532d"/><circle cx="108" cy="106" r="3" fill="#14532d"/>
    <path d="M86 116 q14 10 28 0" stroke="#14532d" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M92 118 l3 6 l3 -5 M104 118 l3 5 l3 -6" fill="#fff" stroke="#14532d" stroke-width="1.5"/>`,
  kitten: (c, d) => `<path d="M140 190 q40 -10 30 -50" stroke="${d}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#4c1d95" stroke-width="4"/><ellipse cx="100" cy="178" rx="22" ry="19" fill="#faf5ff"/>
    <ellipse cx="80" cy="204" rx="13" ry="9" fill="${c}" stroke="#4c1d95" stroke-width="4"/><ellipse cx="120" cy="204" rx="13" ry="9" fill="${c}" stroke="#4c1d95" stroke-width="4"/>
    <path d="M60 70 L64 30 L94 54Z" fill="${c}" stroke="#4c1d95" stroke-width="4" stroke-linejoin="round"/><path d="M140 70 L136 30 L106 54Z" fill="${c}" stroke="#4c1d95" stroke-width="4" stroke-linejoin="round"/>
    <path d="M67 60 L69 41 L84 53Z M133 60 L131 41 L116 53Z" fill="#f9a8d4"/>
    <circle cx="100" cy="92" r="46" fill="${c}" stroke="#4c1d95" stroke-width="4"/>
    <ellipse cx="82" cy="88" rx="7" ry="9" fill="#1f2937"/><ellipse cx="118" cy="88" rx="7" ry="9" fill="#1f2937"/><circle cx="84" cy="85" r="2.6" fill="#fff"/><circle cx="120" cy="85" r="2.6" fill="#fff"/>
    <path d="M95 102 h10 l-5 6z" fill="#f472b6"/><path d="M100 108 q-6 8 -12 3 M100 108 q6 8 12 3" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M58 100 h20 M58 110 l20 -4 M142 100 h-20 M142 110 l-20 -4" stroke="#4c1d95" stroke-width="2.5" stroke-linecap="round"/>`,
  robot: (c, d) => `<rect x="34" y="140" width="18" height="44" rx="9" fill="${d}" stroke="#1e293b" stroke-width="4"/><rect x="148" y="140" width="18" height="44" rx="9" fill="${d}" stroke="#1e293b" stroke-width="4"/>
    <rect x="56" y="134" width="88" height="68" rx="16" fill="${c}" stroke="#1e293b" stroke-width="4"/><rect x="74" y="148" width="52" height="34" rx="8" fill="#e2e8f0" stroke="#1e293b" stroke-width="3"/>
    <circle cx="88" cy="165" r="6" fill="#ef4444"/><circle cx="104" cy="165" r="6" fill="#facc15"/><circle cx="118" cy="160" r="3" fill="#22c55e"/><circle cx="118" cy="171" r="3" fill="#22c55e"/>
    <rect x="70" y="200" width="22" height="14" rx="5" fill="${d}" stroke="#1e293b" stroke-width="4"/><rect x="108" y="200" width="22" height="14" rx="5" fill="${d}" stroke="#1e293b" stroke-width="4"/>
    <line x1="100" y1="50" x2="100" y2="28" stroke="#1e293b" stroke-width="4"/><circle cx="100" cy="24" r="7" fill="#f43f5e" stroke="#1e293b" stroke-width="3"/>
    <rect x="52" y="48" width="96" height="82" rx="20" fill="${c}" stroke="#1e293b" stroke-width="4"/><rect x="44" y="76" width="10" height="24" rx="4" fill="${d}" stroke="#1e293b" stroke-width="3"/><rect x="146" y="76" width="10" height="24" rx="4" fill="${d}" stroke="#1e293b" stroke-width="3"/>
    <rect x="64" y="64" width="72" height="40" rx="12" fill="#0f172a"/><circle cx="84" cy="84" r="9" fill="#22d3ee"/><circle cx="116" cy="84" r="9" fill="#22d3ee"/><circle cx="86" cy="81" r="3" fill="#fff"/><circle cx="118" cy="81" r="3" fill="#fff"/>
    <path d="M80 114 h40" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/><path d="M86 114 v6 M94 114 v6 M102 114 v6 M110 114 v6" stroke="#1e293b" stroke-width="3"/>`,
  ninja: (c, d) => `<ellipse cx="100" cy="170" rx="42" ry="38" fill="${c}" stroke="#0f172a" stroke-width="4"/><rect x="58" y="160" width="84" height="12" fill="#dc2626"/><path d="M134 166 l18 10 l-4 -14z" fill="#dc2626"/>
    <ellipse cx="80" cy="204" rx="13" ry="9" fill="${c}" stroke="#0f172a" stroke-width="4"/><ellipse cx="120" cy="204" rx="13" ry="9" fill="${c}" stroke="#0f172a" stroke-width="4"/>
    <circle cx="100" cy="92" r="46" fill="${c}" stroke="#0f172a" stroke-width="4"/>
    <rect x="58" y="72" width="84" height="30" rx="14" fill="#fde2c4" stroke="#0f172a" stroke-width="3"/>
    <path d="M74 86 q8 -7 16 0" stroke="#0f172a" stroke-width="3" fill="none"/><path d="M110 86 q8 -7 16 0" stroke="#0f172a" stroke-width="3" fill="none"/>
    <ellipse cx="82" cy="89" rx="6" ry="7" fill="#0f172a"/><ellipse cx="118" cy="89" rx="6" ry="7" fill="#0f172a"/><circle cx="84" cy="87" r="2.2" fill="#fff"/><circle cx="120" cy="87" r="2.2" fill="#fff"/>
    <path d="M56 62 Q100 48 144 62 L144 72 Q100 60 56 72Z" fill="#dc2626"/><path d="M140 64 q26 -6 40 8 M140 68 q22 6 34 22" stroke="#dc2626" stroke-width="7" fill="none" stroke-linecap="round"/>`
};
const headTop = base => base === 'robot' ? 48 : base === 'kitten' ? 50 : base === 'koala' ? 50 : 44;
const HEAD = {
  party: b => { const y = headTop(b); return `<path d="M78 ${y+6} L100 ${y-44} L122 ${y+6}Z" fill="#ec4899" stroke="#831843" stroke-width="3" stroke-linejoin="round"/><path d="M86 ${y-10} L114 ${y-14} M82 ${y-1} L118 ${y-4}" stroke="#fde047" stroke-width="5"/><circle cx="100" cy="${y-46}" r="8" fill="#fde047" stroke="#831843" stroke-width="3"/>`; },
  crown: b => { const y = headTop(b); return `<path d="M68 ${y+6} L64 ${y-26} L82 ${y-8} L100 ${y-34} L118 ${y-8} L136 ${y-26} L132 ${y+6}Z" fill="#facc15" stroke="#a16207" stroke-width="3.5" stroke-linejoin="round"/><circle cx="100" cy="${y-8}" r="5" fill="#ef4444"/><circle cx="82" cy="${y-2}" r="4" fill="#3b82f6"/><circle cx="118" cy="${y-2}" r="4" fill="#22c55e"/>`; },
  wizard: b => { const y = headTop(b); return `<path d="M64 ${y+4} Q100 ${y-90} 128 ${y-64} Q110 ${y-40} 136 ${y+4}Z" fill="#6d28d9" stroke="#2e1065" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="100" cy="${y+6}" rx="52" ry="10" fill="#7c3aed" stroke="#2e1065" stroke-width="3.5"/><path d="M96 ${y-30} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#fde047"/>`; },
  bow: b => { const y = headTop(b); return `<path d="M120 ${y+2} l-26 -16 l2 30z M120 ${y+2} l26 -16 l-2 30z" fill="#f472b6" stroke="#9d174d" stroke-width="3" stroke-linejoin="round"/><circle cx="120" cy="${y+2}" r="7" fill="#ec4899" stroke="#9d174d" stroke-width="3"/>`; },
  headphones: b => `<path d="M52 98 Q52 38 100 38 Q148 38 148 98" stroke="#1f2937" stroke-width="9" fill="none"/><rect x="40" y="84" width="20" height="32" rx="9" fill="#ef4444" stroke="#1f2937" stroke-width="3"/><rect x="140" y="84" width="20" height="32" rx="9" fill="#ef4444" stroke="#1f2937" stroke-width="3"/>`,
  propeller: b => { const y = headTop(b); return `<path d="M62 ${y+12} Q100 ${y-30} 138 ${y+12}Z" fill="#3b82f6" stroke="#1e3a8a" stroke-width="3.5"/><path d="M62 ${y+12} Q100 ${y-30} 100 ${y+12}" fill="#facc15" opacity=".8"/><line x1="100" y1="${y-16}" x2="100" y2="${y-26}" stroke="#1e3a8a" stroke-width="4"/><g class="spin" style="transform-origin:100px ${y-28}px"><ellipse cx="86" cy="${y-28}" rx="16" ry="5" fill="#ef4444"/><ellipse cx="114" cy="${y-28}" rx="16" ry="5" fill="#22c55e"/></g>`; },
  helmet: b => `<circle cx="100" cy="92" r="60" fill="#bae6fd" opacity=".35" stroke="#e2e8f0" stroke-width="7"/><path d="M60 60 q20 -18 40 -20" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/><rect x="66" y="146" width="68" height="12" rx="6" fill="#e2e8f0" stroke="#64748b" stroke-width="3"/>`,
  flower: b => { const y = headTop(b); return [70,85,100,115,130].map((x,i)=>`<circle cx="${x}" cy="${y+ (i%2?-2:2)}" r="9" fill="${['#f472b6','#facc15','#a78bfa','#fb923c','#f472b6'][i]}" stroke="#fff" stroke-width="2"/><circle cx="${x}" cy="${y+(i%2?-2:2)}" r="3" fill="#fff"/>`).join(''); }
};
const FACE = {
  shades: b => `<rect x="66" y="76" width="30" height="20" rx="8" fill="#0f172a"/><rect x="104" y="76" width="30" height="20" rx="8" fill="#0f172a"/><path d="M96 84 h8" stroke="#0f172a" stroke-width="4"/><path d="M70 80 l8 0" stroke="#fff" stroke-width="3" opacity=".7"/>`,
  stars: b => `${[82,118].map(x=>`<path d="M${x} 72 l5 10 l11 2 l-8 8 l2 11 l-10 -5 l-10 5 l2 -11 l-8 -8 l11 -2z" fill="#f472b6" fill-opacity=".55" stroke="#be185d" stroke-width="3" stroke-linejoin="round"/>`).join('')}`,
  blush: b => `<ellipse cx="70" cy="104" rx="9" ry="5" fill="#fb7185" opacity=".6"/><ellipse cx="130" cy="104" rx="9" ry="5" fill="#fb7185" opacity=".6"/>`,
  monocle: b => `<circle cx="118" cy="87" r="13" fill="#e0f2fe" fill-opacity=".35" stroke="#a16207" stroke-width="4"/><path d="M130 94 q8 20 -2 40" stroke="#a16207" stroke-width="2" fill="none"/>`
};
const HAND = {
  balloon: () => `<path d="M160 190 Q170 130 172 70" stroke="#475569" stroke-width="2" fill="none"/><ellipse cx="174" cy="50" rx="20" ry="25" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/><path d="M170 74 l4 8 l4 -8z" fill="#ef4444"/><ellipse cx="167" cy="42" rx="5" ry="8" fill="#fff" opacity=".6"/>`,
  wand: () => `<line x1="152" y1="196" x2="180" y2="146" stroke="#78350f" stroke-width="6" stroke-linecap="round"/><path d="M182 124 l6 12 l13 2 l-9 9 l2 13 l-12 -6 l-12 6 l2 -13 l-9 -9 l13 -2z" fill="#fde047" stroke="#a16207" stroke-width="3" stroke-linejoin="round"/>`,
  icecream: () => `<path d="M156 168 l12 36 l12 -36z" fill="#f59e0b" stroke="#78350f" stroke-width="3" stroke-linejoin="round"/><circle cx="168" cy="160" r="13" fill="#f9a8d4" stroke="#9d174d" stroke-width="3"/><circle cx="168" cy="142" r="11" fill="#fef3c7" stroke="#92400e" stroke-width="3"/><circle cx="168" cy="128" r="4" fill="#dc2626"/>`,
  glowsword: () => `<line x1="160" y1="140" x2="190" y2="60" stroke="#67e8f9" stroke-width="12" stroke-linecap="round" opacity=".5"/><line x1="160" y1="140" x2="190" y2="60" stroke="#ecfeff" stroke-width="5" stroke-linecap="round"/><rect x="150" y="138" width="18" height="30" rx="5" transform="rotate(20 159 153)" fill="#475569" stroke="#0f172a" stroke-width="3"/>`,
  magnifier: () => `<line x1="152" y1="198" x2="170" y2="160" stroke="#78350f" stroke-width="8" stroke-linecap="round"/><circle cx="178" cy="142" r="18" fill="#e0f2fe" fill-opacity=".5" stroke="#334155" stroke-width="6"/>`,
  trophycup: () => `<path d="M160 150 h32 v10 q0 22 -16 24 q-16 -2 -16 -24z" fill="#facc15" stroke="#a16207" stroke-width="3"/><path d="M160 156 q-10 0 -8 10 q2 8 10 8 M192 156 q10 0 8 10 q-2 8 -10 8" stroke="#a16207" stroke-width="3" fill="none"/><rect x="170" y="184" width="12" height="8" fill="#a16207"/><rect x="164" y="192" width="24" height="7" rx="2" fill="#78350f"/>`
};

function avatarNode(size=150, override){
  const d = el('div',{class:'avatar-wrap', html: avatarSVG(K.avatar, size, override)});
  return d;
}
function rarity(price, lvl){ return lvl || price >= 60 ? 'legendary' : price >= 40 ? 'epic' : price >= 25 ? 'rare' : price >= 15 ? 'uncommon' : 'common'; }
function balance(){ return isDev() ? 999999 : (K.stars||0) - (K.spent||0); }
/* 💫 Cosmic Power: rare second currency for pets and legendary things.
   Collected only for great reading moments (see addCosmic calls). */
function cosmicBal(){ return isDev() ? 99999 : (K.cosmic||0) - (K.cosmicSpent||0); }
function addCosmic(n, why){
  if (!n) return; K.cosmic = (K.cosmic||0) + n; save();
  const t = el('div',{class:'cosmic-toast'}, el('span',{class:'ct-e'},'💫'), el('div',{}, el('b',{}, `+${n} Cosmic Power`), el('small',{}, why || '')));
  t.style.top = (16 + document.querySelectorAll('.cosmic-toast').length * 74) + 'px';
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}
function cosmicInfo(){
  beep('tap');
  const ways = [['⭐','Perfect 3-star read',1],['🧠','All questions right',1],['🎯','Master a tricky word',1],['📅','Hit your daily goal',1],
    ['🚀','Beat your speed record',1],['🎖️','Earn a badge',2],['🧩','Master a lesson',2],['📚','Finish a chapter book',3],['⚡','Unlock a new skill',3],['🏆','Level up',5]];
  const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 220); };
  const ov = el('div',{class:'cosmic-ov', onclick:e => { if (e.target === ov) close(); }},
    el('div',{class:'cosmic-card'},
      el('div',{class:'cosmic-stars'}),
      el('button',{class:'cosmic-x', onclick:close, 'aria-label':'Close'},'✕'),
      el('div',{class:'cosmic-head'},
        el('div',{class:'cosmic-orb'},'💫'),
        el('div',{}, el('div',{class:'cosmic-label'},'Cosmic Power'), el('div',{class:'cosmic-num'}, String(cosmicBal())))),
      el('p',{class:'cosmic-sub'},'Rare power for pets and legendary treasures. Earn it with great reading:'),
      el('div',{class:'cosmic-grid'}, ...ways.map(([e, t, n]) => el('div',{class:'cosmic-tile' + (n >= 3 ? ' big' : '')},
        el('span',{class:'ct-ico'}, e), el('span',{class:'ct-txt'}, t), el('span',{class:'ct-amt'}, '+' + n)))),
      el('button',{class:'btn cosmic-ok', onclick:close},'Got it! ✨')));
  document.body.append(ov);
}
// Pets and legendary shop items cost Cosmic Power instead of stars
function costOf(slot, price, lvl){
  if (slot === 'pet' || lvl || price >= 60) return { cur:'cosmic', amt: Math.max(3, Math.round(price / 5)) };
  return { cur:'star', amt: price };
}
const legendCosmic = l => Math.round(l.price / 10);   // legendary world items: 18–30 💫
const canPay = c => c.cur === 'cosmic' ? cosmicBal() >= c.amt : balance() >= c.amt;
const pay = c => { if (c.cur === 'cosmic') K.cosmicSpent = (K.cosmicSpent||0) + c.amt; else K.spent = (K.spent||0) + c.amt; };
const costLabel = c => (c.cur === 'cosmic' ? '💫 ' : '⭐ ') + c.amt;

/* ---------- avatar pick (first time) ---------- */
function screenAvatarPick(){
  const choices = Object.entries(AVATAR_BASES).filter(([,b]) => b.kid);
  const name = kidName();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, homeBtn(), el('div')),
    el('div',{class:'topbar center'}, el('div',{}, el('h1',{class:'title center'}, `Pick your reading buddy, ${name}!`),
      el('p',{class:'subtitle center'}, `Choose one now. The ${choices.length > 2 ? 'others unlock' : 'other one unlocks'} at Level ${AVATAR_UNLOCK_LEVEL}!`))),
    el('div',{class:'profiles'}, ...choices.map(([id,b]) => {
      const btn = el('button',{class:'profile ' + (TK==='son'?'son':'daughter'), onclick:()=>{
        K.avatar.base = id; if (!K.avatar.owned.includes(id)) K.avatar.owned.push(id); save(); beep('level'); confetti(50);
        say(`Hooray! Your ${b.name} is ready to read!`); screenHome(); }});
      btn.append(el('div',{html: avatarSVG({base:id, equipped:{}}, 170)}), b.name);
      return btn;
    })));
  show(s);
}

/* ---------- shop ---------- */
let shopTab = 'back';
function screenShop(){
  const tabs = ['base','hand','shield','back','head','face','neck','pet','aura','bg','color'];
  const preview = el('div',{class:'shop-preview'}, avatarNode(200));
  const grid = el('div',{class:'shop-grid'});
  const bal = el('div',{class:'row'}, el('span',{class:'pill'}, '⭐ ' + balance()), el('span',{class:'pill cosmic-pill', onclick:()=>cosmicInfo()}, '💫 ' + cosmicBal()));
  const renderGrid = () => {
    grid.innerHTML = '';
    if (shopTab === 'base'){
      Object.entries(AVATAR_BASES).filter(([,b]) => b.kid).forEach(([id,b]) => {
        const owned = K.avatar.owned.includes(id) || K.level >= AVATAR_UNLOCK_LEVEL;
        if (owned && !K.avatar.owned.includes(id)) { K.avatar.owned.push(id); save(); }
        const on = K.avatar.base === id;
        grid.append(el('div',{class:'shop-item' + (on?' on':'') + (owned?'':' locked')},
          el('div',{html: avatarSVG(K.avatar, 90, {base:id})}), el('div',{class:'n'}, b.name),
          owned ? el('button',{class:'btn small ' + (on?'gray':'green'), onclick:()=>{ K.avatar.base = id; save(); beep('tap'); screenShop(); }}, on ? 'Wearing' : 'Switch')
                : el('div',{class:'lock'}, `🔒 Level ${AVATAR_UNLOCK_LEVEL}`)));
      });
      return;
    }
    SHOP.filter(i => i[0] === shopTab).forEach(([slot,id,name,price,lvl]) => {
      const owned = K.avatar.owned.includes(id);
      if (!owned && lvl && K.level < lvl){
        grid.append(el('div',{class:'shop-item locked legendary-item'},
          el('div',{html: avatarSVG(K.avatar, 90, {[slot]: id})}), el('div',{class:'n'}, '✨ ' + name), el('div',{class:'lock'}, `🔒 Level ${lvl}`)));
        return;
      }
      const on = K.avatar.equipped[slot] === id;
      const cost = costOf(slot, price, lvl);
      const can = canPay(cost);
      const action = owned
        ? el('button',{class:'btn small ' + (on?'gray':'green'), onclick:()=>{ if (on) delete K.avatar.equipped[slot]; else K.avatar.equipped[slot] = id; save(); beep('tap'); screenShop(); }}, on ? 'Take off' : 'Wear')
        : el('button',{class:'btn small ' + (can?'':'gray'), onclick:async()=>{
            if (!can){ say(cost.cur === 'cosmic' ? 'You need more Cosmic Power! Get it from perfect stories, leveling up, and new skills.' : 'Keep reading to earn more stars!'); return; }
            pay(cost); K.avatar.owned.push(id); K.avatar.equipped[slot] = id; save();
            beep('level'); confetti(40); say(`You got the ${name}!`);
            await checkBadges(); screenShop(); }}, costLabel(cost));
      if (cost.cur === 'cosmic' && !owned) action.classList.add('cosmic-btn');
      const rar = rarity(price, lvl);
      grid.append(el('div',{class:'shop-item rar-' + rar + (cost.cur === 'cosmic' ? ' cosmic-item' : '') + (on?' on':'')},
        el('div',{class:'rar-tag'}, cost.cur === 'cosmic' ? (slot === 'pet' && rar !== 'legendary' ? 'COSMIC PET' : 'COSMIC') : rar.toUpperCase()),
        el('div',{html: avatarSVG(K.avatar, 90, {[slot]: id})}), el('div',{class:'n'}, name), action));
    });
  };
  renderGrid();
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🛍️ Star Shop'), el('div',{class:'row'}, el('button',{class:'btn small', onclick:()=>screenChests()},'🎁 Chests'), bal)),
    el('div',{class:'shop-layout'}, preview,
      el('div',{class:'grow'},
        el('div',{class:'tabs shop-tabs'}, ...tabs.map(t => el('button',{class:'tab' + (t===shopTab?' active':''), onclick:()=>{ shopTab = t; screenShop(); }}, SLOT_NAMES[t]))),
        grid)));
  show(s);
}

/* ---------- trophies ---------- */
const TROPHIES = {
  daughter: [['🥉','Bronze Egg'],['📌','Apprentice Pin'],['🥈','Silver Wing'],['🛡️','Rider\'s Shield'],['🥇','Golden Saddle'],['🏅','Knight\'s Crest'],['🌟','Captain\'s Star'],['👑','Guardian Crown'],['🪽','Sky Marshal Wings'],['⚡','Storm Warden Seal'],['🔮','Sage\'s Orb'],['🐉','Dragon Master Medallion']],
  son: [['🔤','Letter Champ'],['🪄','Word Wizard'],['⭐','Sight Word Star'],['🦸','Sentence Hero'],['🧭','Story Explorer'],['📚','Big Reader'],['🔍','Junior Detective'],['🕵️','Super Sleuth'],['🗝️','Case Cracker'],['🔦','Clue Hunter'],['🎩','Mystery Master'],['🏆','Legendary Detective']]
};
function awardTrophiesUpTo(level){
  const got = [];
  for (let n = 1; n <= level; n++) if (!K.trophies.includes(n)){ K.trophies.push(n); got.push(n); }
  return got;
}

/* ---------- badges ---------- */
const BADGES = [
  ['first','📖','First Story','Finish your first reading', k => normalSessions(k).length >= 1],
  ['perfect','💯','Perfect Reader','Read every word right in a story', k => normalSessions(k).some(s => s.accuracy >= 100 && s.total >= 8)],
  ['quiz','🧠','Quiz Whiz','Get every question right', k => normalSessions(k).some(s => s.quiz && s.quiz.split('/')[0] === s.quiz.split('/')[1])],
  ['quiz3','🔥','Quiz Streak','Perfect quizzes 3 times in a row', k => (k.quizStreak||0) >= 3],
  ['streak3','📅','3-Day Streak','Read 3 days in a row', k => (k.streak.count||0) >= 3],
  ['streak7','🗓️','Week Warrior','Read 7 days in a row', k => (k.streak.count||0) >= 7],
  ['read10','🔟','Ten Reads','Finish 10 readings', k => normalSessions(k).length >= 10],
  ['read25','🚀','Reading Rocket','Finish 25 readings', k => normalSessions(k).length >= 25],
  ['read50','🌠','Reading Legend','Finish 50 readings', k => normalSessions(k).length >= 50],
  ['word1','🎯','Word Master','Master your first tricky word', k => masteredWords(k).length >= 1],
  ['word10','🏹','Word Hunter','Master 10 tricky words', k => masteredWords(k).length >= 10],
  ['collect5','🧺','Collector','Collect 5 friends', k => k.collection.length >= 5],
  ['collect15','🏰','Super Collector','Collect 15 friends', k => k.collection.length >= 15],
  ['shop','🛍️','First Purchase','Buy something in the Star Shop', k => k.avatar.owned.some(id => SHOP_BY_ID[id])],
  ['stylish','😎','Style Star','Wear 3 accessories at once', k => Object.keys(k.avatar.equipped).length >= 3],
  ['series','📚','Series Explorer','Read stories from both series', k => new Set(normalSessions(k).map(s => s.series).filter(Boolean)).size >= 2],
  ['build1','🧱','Builder','Put 5 things in your world', k => (k.world?.items?.length || 0) >= 5],
  ['build20','🏙️','Master Builder','Put 20 things in your world', k => (k.world?.items?.length || 0) >= 20],
  ['skill1','⚡','Skill Up','Master a phonics skill in your stories', k => Object.values(k.skills||{}).some(s => s.mastered)],
  ['skill5','🧠','Sound Expert','Master 5 phonics skills', k => Object.values(k.skills||{}).filter(s => s.mastered).length >= 5],
  ['speed','🚀','Speed Reader','Beat your own reading speed', k => Object.keys((k.path||{}).best||{}).length >= 1],
  ['top','🏆','Top of the Track','Reach the highest level', k => k.level >= TRACKS[TK].levels.length],
  ['gear1','🛡️','Geared Up','Collect your first gear piece', k => Object.entries((k.gear||{}).owned||{}).some(([id, l]) => id !== 'traveler' && l.length)],
  ['set1','✨','Full Set','Collect a complete 8-piece gear set', k => (k.setsDone||[]).length >= 1],
  ['set4','👑','Armor Master','Collect 4 complete gear sets', k => (k.setsDone||[]).length >= 4],
  ['boss1','⚔️','Boss Slayer','Defeat your first boss', k => (k.bossesBeaten||[]).length >= 1],
  ['boss4','🛡️','Boss Hunter','Defeat 4 bosses', k => (k.bossesBeaten||[]).length >= 4],
  ['bossfinal','👑','Reading Legend','Defeat the final boss', k => (k.bossesBeaten||[]).includes(TRACKS[TK].levels.length)],
  ['realbook1','📕','Real Reader','Add a real book you finished', k => (k.realBooks||[]).length >= 1],
  ['realbook10','🐛','Bookworm','Finish 10 real books', k => (k.realBooks||[]).length >= 10],
  ['legend1','✨','Legend Hunter','Own a legendary or mythic item', k => (k.legendOwned||[]).length + (k.mythics||[]).length >= 1]
];
const normalSessions = k => k.sessions.filter(s => s.mode === 'normal');
async function checkBadges(){
  for (const [id, e, name, desc, test] of BADGES){
    if (K.badges.includes(id)) continue;
    let ok = false; try { ok = test(K); } catch(err){}
    if (ok){
      K.badges.push(id); K.stars += 5; save(); addCosmic(2, 'New badge: ' + name);
      beep('level'); confetti(60); say(`New badge! ${name}!`);
      await modal(el('div',{}, el('div',{class:'big-e'}, e), el('h2',{}, 'Badge: ' + name), el('p',{}, desc + '. Bonus: +5 ⭐')), [['Awesome! ▶','',1]]);
    }
  }
  await checkLegends();
}
function screenTrophies(){
  const tlist = TROPHIES[TK];
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🏆 Trophy Hall'), el('div')),
    el('h2',{class:'subtitle', style:'font-size:24px'}, 'Level Trophies'),
    el('div',{class:'collection'}, ...tlist.map(([e,n],i) => el('div',{class:'critter' + (K.trophies.includes(i+1)?'':' locked')},
      el('div',{class:'e'}, K.trophies.includes(i+1) ? e : '🔒'), el('div',{class:'n'}, n), el('div',{class:'muted'}, 'Level ' + (i+1)),
      i+1 === AVATAR_UNLOCK_LEVEL ? el('div',{class:'muted'}, '+ new buddy!') : null))),
    el('h2',{class:'subtitle', style:'font-size:24px;margin-top:24px'}, `Badges (${K.badges.length}/${BADGES.length})`),
    el('div',{class:'collection'}, ...BADGES.map(([id,e,n,d]) => el('div',{class:'critter' + (K.badges.includes(id)?'':' locked')},
      el('div',{class:'e'}, K.badges.includes(id) ? e : '❔'), el('div',{class:'n'}, n), el('div',{class:'muted'}, d)))));
  show(s);
}

/* ---------- missed-word tracker ---------- */
// K.words[word] = { miss: total misses, streak: correct reads in a row, mastered: date|null, last: date }
const MASTER_STREAK = 3;
const PROPER = new Set(norm(CAT) + ' biscuit zip plip toasty leafy chip wren pebble oona tobin mira blaze ripple vex nim rosie priya jules lena noodle pepper ortiz lee park max mia daisy fen breeze quill moss skyfire thunder johnsons i'.split(' '));
const practiceWords = k => Object.entries(k.words).filter(([,w]) => !w.mastered).sort((a,b) => b[1].miss - a[1].miss).map(([w]) => w);
const masteredWords = k => Object.entries(k.words).filter(([,w]) => w.mastered).map(([w]) => w);
function trackWords(act){
  const newlyMastered = [];
  const seenMiss = new Set(), seenOk = new Set();
  act.pages.forEach(p => p.tokens.forEach((t,i) => {
    const w = t.n; if (!w || w.length < 2 || /^\d+$/.test(w)) return;
    const missed = p.status[i] !== 'ok' || p.helped[i];
    if (missed){ if (!seenMiss.has(w)){ seenMiss.add(w);
      const clean = t.disp.replace(/[^\w'’-]/g,'');
      const r = K.words[w] || (K.words[w] = { miss:0, streak:0, mastered:null, last:null, disp: PROPER.has(w) ? clean : clean.toLowerCase() });
      r.miss++; r.streak = 0; r.mastered = null; r.last = todayStr(); } }
    else if (K.words[w] && !K.words[w].mastered && !seenOk.has(w) && !seenMiss.has(w)){
      seenOk.add(w); const r = K.words[w]; r.streak++;
      if (r.streak >= MASTER_STREAK){ r.mastered = todayStr(); newlyMastered.push(w); }
    }
  }));
  return newlyMastered;
}
function startPractice(){
  const words = practiceWords(K).slice(0, 8);
  if (!words.length) return;
  const a = { kind:'words', level:K.level, title:'My Practice Words', pages: shuffle(words).map(w => ({ single:true, tokens:[{disp:(K.words[w].disp||w).toLowerCase(), n:w}] })) };
  beginRun(a, { mode:'practice' });
}
function screenWords(){
  const todo = practiceWords(K), done = masteredWords(K);
  const row = w => { const r = K.words[w];
    return el('div',{class:'word-row'}, el('button',{class:'btn small blue', onclick:()=>say(r.disp||w)},'🔊'),
      el('span',{class:'word-big'}, r.disp||w),
      el('span',{class:'dots'}, ...Array.from({length:MASTER_STREAK},(_,i)=>el('span',{class:'dot' + (i < r.streak ? ' on' : '')}))),
      el('span',{class:'muted'}, 'missed ' + r.miss + '×')); };
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🎯 My Words'), el('div')),
    el('div',{class:'card'},
      el('p',{style:'font-size:20px;margin-top:0'}, `Read a word right ${MASTER_STREAK} times in a row to master it! ⭐`),
      todo.length ? el('button',{class:'btn big', onclick:startPractice}, `▶ Practice ${Math.min(8,todo.length)} words`) : el('p',{style:'font-size:22px'},'No tricky words right now. Amazing! 🎉'),
      el('div',{class:'word-list'}, ...todo.map(row))),
    done.length ? el('div',{class:'card', style:'margin-top:16px'}, el('h2',{style:'margin-top:0'}, `✅ Mastered (${done.length})`),
      el('div',{}, ...done.map(w => el('span',{class:'chip ok'}, '⭐ ' + (K.words[w].disp||w))))) : null);
  show(s);
}

/* ---------- Star Shop: extra items (swords, shields, pets, auras, neckwear, more hats & wings) ---------- */
// [slot, id, name, price, unlockLevel?]
SHOP.push(
  // swords & hand items
  ['hand','firesword','Fire Sword',35], ['hand','icesword','Ice Sword',35], ['hand','goldsword','Golden Sword',60,5],
  ['hand','rainbowsword','Rainbow Sword',70,6], ['hand','staff','Magic Staff',30], ['hand','bubblewand','Bubble Wand',15],
  ['hand','lollipop','Giant Lollipop',10], ['hand','teddy','Teddy Bear',20], ['hand','guitar','Rock Guitar',30], ['hand','flag','Star Flag',15],
  // shields (left hand, so they go WITH a sword)
  ['shield','sh_knight','Knight Shield',25], ['shield','sh_star','Star Shield',30], ['shield','sh_heart','Heart Shield',25],
  ['shield','sh_bolt','Lightning Shield',30], ['shield','sh_wood','Viking Shield',20], ['shield','sh_dragon','Golden Dragon Shield',60,5],
  // backs
  ['back','goldboost','Golden Boosters',50,4], ['back','rainbowboost','Rainbow Boosters',70,6], ['back','butterfly','Butterfly Wings',25],
  ['back','angel','Angel Wings',35], ['back','batwings','Bat Wings',25], ['back','goldcape','Golden Cape',45,5], ['back','jetpack','Jet Pack',35],
  // hats
  ['head','tiara','Sparkle Tiara',30], ['head','unicorn','Unicorn Horn',40], ['head','catears','Kitty Ears',15], ['head','bunny','Bunny Ears',15],
  ['head','knight','Knight Helmet',35], ['head','viking','Viking Helmet',30], ['head','pirate','Pirate Hat',25], ['head','cowboy','Cowboy Hat',20],
  ['head','cap','Ball Cap',10], ['head','halo','Golden Halo',45,4], ['head','tophat','Top Hat',20], ['head','beanie','Cozy Beanie',10], ['head','flowerclip','Flower Clip',10],
  // holiday costumes
  ['head','witchhat','Witch Hat',20], ['head','santahat','Santa Hat',15], ['head','antlers','Reindeer Antlers',15], ['head','pumpkinhat','Pumpkin Head',20],
  ['back','vampcape','Vampire Cape',25],
  // faces
  ['face','hearts','Heart Glasses',15], ['face','rainbowshades','Rainbow Shades',25], ['face','goggles','Pilot Goggles',20],
  ['face','eyepatch','Pirate Eye Patch',10], ['face','mustache','Silly Mustache',10], ['face','heromask','Hero Mask',20], ['face','facepaint','Star Face Paint',10],
  // neck
  ['neck','bowtie','Bow Tie',10], ['neck','pearls','Pearl Necklace',20], ['neck','scarf','Cozy Scarf',15], ['neck','medal','Gold Medal',30], ['neck','locket','Heart Locket',20],
  // pets
  ['pet','p_dragon','Baby Dragon',40], ['pet','p_kitty','Kitty',25], ['pet','p_puppy','Puppy',25], ['pet','p_bunny','Bunny',20],
  ['pet','p_unicorn','Unicorn',45,4], ['pet','p_owl','Owl',20], ['pet','p_panda','Panda',30], ['pet','p_robot','Robo Buddy',35], ['pet','p_turtle','Turtle',15], ['pet','p_phoenix','Phoenix',80,7],
  // auras (glow around your buddy)
  ['aura','a_sparkle','Sparkles',20], ['aura','a_hearts','Floating Hearts',20], ['aura','a_stars','Star Swirl',25], ['aura','a_snow','Snowflakes',20],
  ['aura','a_bubbles','Bubbles',15], ['aura','a_bolt','Lightning Power',35], ['aura','a_fire','Fire Power',50,5], ['aura','a_rainbow','Rainbow Glow',60,6]
);
SHOP.forEach(s => SHOP_BY_ID[s[1]] = s);
const LASERS = { laser_blue:'#38bdf8', laser_green:'#4ade80', laser_pink:'#f472b6', laser_red:'#ef4444', laser_purple:'#a855f7', laser_gold:'#facc15' };
Object.entries(LASERS).forEach(([id, c]) => {
  HAND[id] = () => `<line x1="160" y1="140" x2="188" y2="52" stroke="${c}" stroke-width="16" stroke-linecap="round" opacity=".35"/><line x1="160" y1="140" x2="188" y2="52" stroke="${c}" stroke-width="9" stroke-linecap="round"/><line x1="160" y1="140" x2="188" y2="52" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><rect x="150" y="136" width="16" height="34" rx="4" transform="rotate(18 158 153)" fill="#94a3b8" stroke="#0f172a" stroke-width="3"/><rect x="151" y="146" width="14" height="4" transform="rotate(18 158 153)" fill="#0f172a"/>`;
});
SHOP.push(['hand','laser_blue','Blue Laser Sword',30], ['hand','laser_green','Green Laser Sword',30], ['hand','laser_pink','Pink Laser Sword',30],
  ['hand','laser_red','Red Laser Sword',35], ['hand','laser_purple','Purple Laser Sword',35], ['hand','laser_gold','Golden Laser Sword',60,5]);
SHOP.forEach(s => SHOP_BY_ID[s[1]] = s);
Object.assign(SLOT_NAMES, { shield:'Shields', neck:'Necklaces', pet:'Pets', aura:'Magic Glow' });

/* shapes */
const rocketPair = (body, nose, f1, f2) => `<g class="flame"><path d="M19 194 q10 30 20 0 q-10 12 -20 0z" fill="${f1}"/><path d="M161 194 q10 30 20 0 q-10 12 -20 0z" fill="${f1}"/><path d="M24 194 q5 16 10 0z" fill="${f2}"/><path d="M166 194 q5 16 10 0z" fill="${f2}"/></g>
    <rect x="14" y="116" width="30" height="80" rx="12" fill="${body}" stroke="#334155" stroke-width="4"/><rect x="156" y="116" width="30" height="80" rx="12" fill="${body}" stroke="#334155" stroke-width="4"/>
    <path d="M14 128 q15 -28 30 0z M156 128 q15 -28 30 0z" fill="${nose}" stroke="#334155" stroke-width="4" stroke-linejoin="round"/><circle cx="29" cy="156" r="6" fill="#fff" opacity=".8"/><circle cx="171" cy="156" r="6" fill="#fff" opacity=".8"/>
    <path d="M44 150 h14 M142 150 h14" stroke="#334155" stroke-width="6"/>`;
const RB = ['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'];
Object.assign(BACK, {
  goldboost: () => rocketPair('#facc15', '#f97316', '#f97316', '#fef08a') + `<g class="sparkle"><path d="M10 110 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1z" fill="#fde047"/><path d="M182 104 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1z" fill="#fde047"/></g>`,
  rainbowboost: () => `<g class="flame">${RB.map((c,i)=>`<rect x="${18+i*4}" y="196" width="4" height="${16+(i%2)*6}" fill="${c}"/><rect x="${160+i*4}" y="196" width="4" height="${16+(i%2)*6}" fill="${c}"/>`).join('')}</g>` + rocketPair('#e0e7ff', '#ec4899', 'none', 'none'),
  butterfly: () => `<g opacity=".95"><path d="M96 140 Q30 80 20 130 Q16 160 96 150Z" fill="#fb923c" stroke="#7c2d12" stroke-width="3"/><path d="M104 140 Q170 80 180 130 Q184 160 104 150Z" fill="#fb923c" stroke="#7c2d12" stroke-width="3"/><path d="M96 152 Q40 200 54 180 Q50 160 96 156Z" fill="#f472b6" stroke="#7c2d12" stroke-width="3"/><path d="M104 152 Q160 200 146 180 Q150 160 104 156Z" fill="#f472b6" stroke="#7c2d12" stroke-width="3"/><circle cx="44" cy="124" r="7" fill="#fde047"/><circle cx="156" cy="124" r="7" fill="#fde047"/></g>`,
  angel: () => `<g fill="#fff" stroke="#cbd5e1" stroke-width="3">${[0,1,2].map(i=>`<ellipse cx="${44-i*6}" cy="${130+i*16}" rx="${30-i*4}" ry="11" transform="rotate(${-20+i*10} ${44-i*6} ${130+i*16})"/><ellipse cx="${156+i*6}" cy="${130+i*16}" rx="${30-i*4}" ry="11" transform="rotate(${20-i*10} ${156+i*6} ${130+i*16})"/>`).join('')}</g>`,
  batwings: () => `<path d="M70 140 Q40 100 6 112 Q22 124 16 140 Q30 136 34 152 Q46 142 70 168Z" fill="#4c1d95" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/><path d="M130 140 Q160 100 194 112 Q178 124 184 140 Q170 136 166 152 Q154 142 130 168Z" fill="#4c1d95" stroke="#1e1b4b" stroke-width="4" stroke-linejoin="round"/>`,
  goldcape: () => `<path d="M58 130 Q100 118 142 130 L172 214 Q100 228 28 214Z" fill="#facc15" stroke="#a16207" stroke-width="4" stroke-linejoin="round"/><path d="M60 140 Q100 128 140 140" stroke="#fef08a" stroke-width="4" fill="none"/><g class="sparkle"><circle cx="50" cy="200" r="3" fill="#fff"/><circle cx="150" cy="196" r="3" fill="#fff"/></g>`,
  jetpack: () => `<rect x="60" y="120" width="80" height="62" rx="14" fill="#64748b" stroke="#1e293b" stroke-width="4"/><g class="flame"><path d="M66 182 q10 30 20 0z M114 182 q10 30 20 0z" fill="#f97316"/><path d="M71 182 q5 16 10 0z M119 182 q5 16 10 0z" fill="#fde047"/></g>`,
  vampcape: () => `<path d="M48 104 L66 132 L134 132 L152 104 L142 140 L58 140Z" fill="#b91c1c" stroke="#450a0a" stroke-width="3.5" stroke-linejoin="round"/><path d="M60 132 Q100 120 140 132 L172 216 Q100 230 28 216Z" fill="#111827" stroke="#000" stroke-width="4" stroke-linejoin="round"/><path d="M70 140 Q100 132 130 140 L150 206 Q100 216 50 206Z" fill="#991b1b" opacity=".85"/>`
});
Object.assign(HEAD, {
  tiara: b => { const y = headTop(b); return `<path d="M72 ${y+8} Q100 ${y-2} 128 ${y+8}" stroke="#e5e7eb" stroke-width="5" fill="none"/><path d="M78 ${y+4} L84 ${y-14} L92 ${y+1} L100 ${y-24} L108 ${y+1} L116 ${y-14} L122 ${y+4}" fill="#e0e7ff" stroke="#94a3b8" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="${y-8}" r="5" fill="#ec4899"/><circle cx="85" cy="${y-3}" r="3" fill="#38bdf8"/><circle cx="115" cy="${y-3}" r="3" fill="#38bdf8"/><g class="sparkle"><path d="M126 ${y-20} l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="#fde047"/></g>`; },
  unicorn: b => { const y = headTop(b); return `<path d="M91 ${y+6} L100 ${y-48} L109 ${y+6}Z" fill="#fef3c7" stroke="#d97706" stroke-width="3" stroke-linejoin="round"/><path d="M93 ${y-4} l14 -6 M95 ${y-18} l10 -5 M97 ${y-32} l6 -4" stroke="#f472b6" stroke-width="4"/>${[[76,'#f9a8d4'],[124,'#c4b5fd']].map(([x,c])=>`<circle cx="${x}" cy="${y+4}" r="7" fill="${c}"/><circle cx="${x}" cy="${y+4}" r="2.5" fill="#fff"/>`).join('')}`; },
  catears: b => { const y = headTop(b); return `<path d="M56 ${y+20} Q100 ${y-14} 144 ${y+20}" stroke="#f472b6" stroke-width="6" fill="none"/><path d="M62 ${y+8} L66 ${y-24} L88 ${y-2}Z M138 ${y+8} L134 ${y-24} L112 ${y-2}Z" fill="#f9a8d4" stroke="#be185d" stroke-width="3" stroke-linejoin="round"/><path d="M68 ${y} L70 ${y-14} L80 ${y-3}Z M132 ${y} L130 ${y-14} L120 ${y-3}Z" fill="#fff" opacity=".7"/>`; },
  bunny: b => { const y = headTop(b); return `<ellipse cx="80" cy="${y-24}" rx="11" ry="32" transform="rotate(-12 80 ${y-24})" fill="#fff" stroke="#94a3b8" stroke-width="3"/><ellipse cx="120" cy="${y-24}" rx="11" ry="32" transform="rotate(12 120 ${y-24})" fill="#fff" stroke="#94a3b8" stroke-width="3"/><ellipse cx="80" cy="${y-24}" rx="5" ry="22" transform="rotate(-12 80 ${y-24})" fill="#fbcfe8"/><ellipse cx="120" cy="${y-24}" rx="5" ry="22" transform="rotate(12 120 ${y-24})" fill="#fbcfe8"/>`; },
  knight: b => { const y = headTop(b); return `<path d="M56 ${y+30} Q56 ${y-20} 100 ${y-22} Q144 ${y-20} 144 ${y+30} L134 ${y+30} Q132 ${y-4} 100 ${y-6} Q68 ${y-4} 66 ${y+30}Z" fill="#cbd5e1" stroke="#334155" stroke-width="3.5"/><path d="M100 ${y-22} v16" stroke="#334155" stroke-width="3"/><path d="M100 ${y-22} q-4 -26 20 -32 q-8 14 -12 32z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/>`; },
  viking: b => { const y = headTop(b); return `<path d="M60 ${y+18} Q60 ${y-22} 100 ${y-24} Q140 ${y-22} 140 ${y+18}Z" fill="#94a3b8" stroke="#334155" stroke-width="3.5"/><rect x="58" y="${y+10}" width="84" height="10" rx="4" fill="#a16207" stroke="#422006" stroke-width="3"/><path d="M62 ${y+6} Q36 ${y-6} 40 ${y-36} Q50 ${y-14} 66 ${y-6}Z M138 ${y+6} Q164 ${y-6} 160 ${y-36} Q150 ${y-14} 134 ${y-6}Z" fill="#fef3c7" stroke="#78350f" stroke-width="3" stroke-linejoin="round"/>`; },
  pirate: b => { const y = headTop(b); return `<path d="M52 ${y+10} Q100 ${y-44} 148 ${y+10} Q100 ${y-6} 52 ${y+10}Z" fill="#1f2937" stroke="#000" stroke-width="3"/><path d="M58 ${y+6} Q100 ${y-8} 142 ${y+6}" stroke="#facc15" stroke-width="3" fill="none"/><circle cx="100" cy="${y-14}" r="7" fill="#fff"/><circle cx="97" cy="${y-15}" r="1.6" fill="#000"/><circle cx="103" cy="${y-15}" r="1.6" fill="#000"/><path d="M92 ${y-3} l16 -6 M92 ${y-9} l16 6" stroke="#fff" stroke-width="2.5"/>`; },
  cowboy: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y+8}" rx="62" ry="12" fill="#a16207" stroke="#422006" stroke-width="3"/><path d="M72 ${y+6} Q70 ${y-30} 100 ${y-22} Q130 ${y-30} 128 ${y+6}Z" fill="#b45309" stroke="#422006" stroke-width="3"/><rect x="72" y="${y-2}" width="56" height="7" fill="#422006"/>`; },
  cap: b => { const y = headTop(b); return `<path d="M58 ${y+16} Q60 ${y-24} 100 ${y-24} Q140 ${y-24} 142 ${y+16}Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="3.5"/><path d="M130 ${y+14} Q168 ${y+10} 172 ${y+22} L134 ${y+22}Z" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="3"/><circle cx="100" cy="${y-22}" r="4" fill="#1e3a8a"/><text x="88" y="${y+8}" font-size="18" font-weight="700" fill="#fff" font-family="sans-serif">★</text>`; },
  halo: b => { const y = headTop(b); return `<g class="sparkle"><ellipse cx="100" cy="${y-20}" rx="34" ry="9" fill="none" stroke="#fde047" stroke-width="7"/><ellipse cx="100" cy="${y-20}" rx="34" ry="9" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/></g>`; },
  tophat: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y+8}" rx="44" ry="8" fill="#111827"/><rect x="74" y="${y-38}" width="52" height="46" rx="4" fill="#111827"/><rect x="74" y="${y-6}" width="52" height="9" fill="#dc2626"/>`; },
  beanie: b => { const y = headTop(b); return `<path d="M56 ${y+22} Q56 ${y-28} 100 ${y-28} Q144 ${y-28} 144 ${y+22}Z" fill="#14b8a6" stroke="#115e59" stroke-width="3.5"/><rect x="54" y="${y+12}" width="92" height="14" rx="6" fill="#0d9488" stroke="#115e59" stroke-width="3"/><circle cx="100" cy="${y-30}" r="10" fill="#fef3c7" stroke="#115e59" stroke-width="3"/>`; },
  flowerclip: b => { const y = headTop(b); return `${[0,72,144,216,288].map(a=>`<circle cx="${128+10*Math.cos(a*Math.PI/180)}" cy="${y+8+10*Math.sin(a*Math.PI/180)}" r="8" fill="#f472b6" stroke="#be185d" stroke-width="2"/>`).join('')}<circle cx="128" cy="${y+8}" r="6" fill="#fde047"/>`; },
  // holiday costumes
  witchhat: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y+8}" rx="58" ry="11" fill="#4c1d95" stroke="#1e1b4b" stroke-width="3.5"/><path d="M70 ${y+6} L104 ${y-62} Q112 ${y-70} 122 ${y-58} L114 ${y-52} L130 ${y+6}Z" fill="#6d28d9" stroke="#1e1b4b" stroke-width="3.5" stroke-linejoin="round"/><rect x="72" y="${y-6}" width="56" height="9" fill="#f97316"/><rect x="94" y="${y-8}" width="12" height="13" rx="2" fill="none" stroke="#fde047" stroke-width="3"/>`; },
  santahat: b => { const y = headTop(b); return `<path d="M62 ${y+10} Q70 ${y-40} 112 ${y-44} Q146 ${y-46} 156 ${y-12} L140 ${y-16} Q132 ${y-30} 118 ${y-24} L138 ${y+10}Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3.5" stroke-linejoin="round"/><rect x="58" y="${y+2}" width="84" height="16" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2.5"/><circle cx="154" cy="${y-10}" r="11" fill="#fff" stroke="#cbd5e1" stroke-width="2.5"/>`; },
  antlers: b => { const y = headTop(b); return `<path d="M78 ${y+8} L66 ${y-30} M70 ${y-16} L52 ${y-24} M68 ${y-26} L60 ${y-44} M122 ${y+8} L134 ${y-30} M130 ${y-16} L148 ${y-24} M132 ${y-26} L140 ${y-44}" stroke="#92400e" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="76" cy="${y+8}" r="6" fill="#b45309"/><circle cx="124" cy="${y+8}" r="6" fill="#b45309"/>`; },
  pumpkinhat: b => { const y = headTop(b); return `<ellipse cx="100" cy="${y-8}" rx="40" ry="28" fill="#f97316" stroke="#9a3412" stroke-width="3.5"/><path d="M86 ${y-34} Q80 ${y-8} 86 ${y+18} M114 ${y-34} Q120 ${y-8} 114 ${y+18}" stroke="#c2410c" stroke-width="3" fill="none"/><rect x="96" y="${y-46}" width="8" height="14" rx="3" fill="#15803d"/><path d="M84 ${y-14} l8 -8 l8 8z M108 ${y-14} l8 -8 l8 8z" fill="#422006"/><path d="M84 ${y-2} q16 12 32 0 l-6 4 l-4 -4 l-6 6 l-6 -6 l-4 4z" fill="#422006"/>`; }
});
Object.assign(FACE, {
  hearts: b => `${[82,118].map(x=>`<path d="M${x} 98 l-14 -14 a7 7 0 0 1 14 -8 a7 7 0 0 1 14 8z" fill="#f472b6" fill-opacity=".75" stroke="#be185d" stroke-width="3" stroke-linejoin="round"/>`).join('')}<path d="M96 84 h8" stroke="#be185d" stroke-width="3"/>`,
  rainbowshades: b => `<defs><linearGradient id="rbg" x1="0" x2="1">${RB.map((c,i)=>`<stop offset="${i/5}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect x="64" y="76" width="32" height="20" rx="8" fill="url(#rbg)" stroke="#111827" stroke-width="2.5"/><rect x="104" y="76" width="32" height="20" rx="8" fill="url(#rbg)" stroke="#111827" stroke-width="2.5"/><path d="M96 84 h8" stroke="#111827" stroke-width="4"/>`,
  goggles: b => `<path d="M54 86 h92" stroke="#78350f" stroke-width="7"/><circle cx="82" cy="86" r="15" fill="#bae6fd" fill-opacity=".6" stroke="#a16207" stroke-width="5"/><circle cx="118" cy="86" r="15" fill="#bae6fd" fill-opacity=".6" stroke="#a16207" stroke-width="5"/>`,
  eyepatch: b => `<path d="M56 70 L144 100" stroke="#111827" stroke-width="3"/><ellipse cx="118" cy="88" rx="13" ry="11" fill="#111827"/>`,
  mustache: b => `<path d="M100 112 q-12 -8 -24 2 q-8 6 -16 0 q8 14 22 8 q12 -4 18 -10 q6 6 18 10 q14 6 22 -8 q-8 6 -16 0 q-12 -10 -24 -2z" fill="#3f2a1d"/>`,
  heromask: b => `<path d="M58 80 Q80 66 100 78 Q120 66 142 80 Q140 98 120 98 Q106 98 100 88 Q94 98 80 98 Q60 98 58 80Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/><ellipse cx="82" cy="86" rx="8" ry="6" fill="#fff"/><ellipse cx="118" cy="86" rx="8" ry="6" fill="#fff"/><circle cx="82" cy="86" r="4" fill="#111827"/><circle cx="118" cy="86" r="4" fill="#111827"/>`,
  facepaint: b => `${[[68,106,'#38bdf8'],[132,106,'#f472b6'],[126,96,'#facc15']].map(([x,y,c])=>`<path d="M${x} ${y-7} l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="${c}"/>`).join('')}`
});
const NECK = {
  bowtie: () => `<path d="M100 140 l-18 -10 v20z M100 140 l18 -10 v20z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="140" r="5" fill="#b91c1c"/>`,
  pearls: () => `${Array.from({length:9},(_,i)=>{const a=(200+i*17.5)*Math.PI/180;return `<circle cx="${100+34*Math.cos(a)*-1}" cy="${132-18*Math.sin(a)}" r="4.5" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/>`;}).join('')}`,
  scarf: () => `<path d="M62 134 Q100 152 138 134 L138 146 Q100 164 62 146Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/><path d="M118 148 l6 34 l14 -4 l-8 -32z" fill="#ef4444" stroke="#7f1d1d" stroke-width="3"/><path d="M66 140 Q100 156 134 140" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="6 6"/>`,
  medal: () => `<path d="M84 132 l16 26 l16 -26" stroke="#2563eb" stroke-width="8" fill="none"/><circle cx="100" cy="166" r="12" fill="#facc15" stroke="#a16207" stroke-width="3"/><text x="94" y="171" font-size="13" font-weight="700" fill="#a16207" font-family="sans-serif">1</text>`,
  locket: () => `<path d="M76 134 Q100 156 124 134" stroke="#fbbf24" stroke-width="2.5" fill="none"/><path d="M100 162 l-10 -10 a5.5 5.5 0 0 1 10 -6 a5.5 5.5 0 0 1 10 6z" fill="#f472b6" stroke="#be185d" stroke-width="2.5"/>`
};
const swordSVG = (blade, glow, hilt, extra='') => `<path d="M158 152 L184 62 L192 58 L191 67 L166 155Z" fill="${glow}" opacity=".45" stroke="${glow}" stroke-width="10" stroke-linejoin="round"/>
  <path d="M158 152 L184 62 L192 58 L191 67 L166 155Z" fill="${blade}" stroke="#334155" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M166 130 L182 74" stroke="#fff" stroke-width="2.5" opacity=".8" class="sparkle"/>${extra}
  <path d="M146 148 L180 160" stroke="${hilt}" stroke-width="8" stroke-linecap="round"/><path d="M161 156 L154 180" stroke="#78350f" stroke-width="8" stroke-linecap="round"/><circle cx="153" cy="184" r="6" fill="${hilt}" stroke="#334155" stroke-width="2"/>`;
Object.assign(HAND, {
  firesword: () => swordSVG('#fb923c', '#ef4444', '#facc15', `<g class="flame"><path d="M186 58 q8 -14 0 -26 q-2 12 -8 18z" fill="#f97316"/></g>`),
  icesword: () => swordSVG('#bae6fd', '#38bdf8', '#e0f2fe', `<g class="sparkle"><path d="M176 96 l3 -6 l3 6 l-3 6z M170 120 l2 -4 l2 4 l-2 4z" fill="#fff"/></g>`),
  goldsword: () => swordSVG('#fde047', '#facc15', '#ef4444', `<g class="sparkle"><path d="M194 50 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z" fill="#fff"/></g>`),
  rainbowsword: () => `<defs><linearGradient id="rbs" x1="0" y1="1" x2="0" y2="0">${RB.map((c,i)=>`<stop offset="${i/5}" stop-color="${c}"/>`).join('')}</linearGradient></defs>` + swordSVG('url(#rbs)', '#e879f9', '#facc15'),
  staff: () => `<line x1="152" y1="204" x2="176" y2="80" stroke="#78350f" stroke-width="7" stroke-linecap="round"/><circle cx="178" cy="70" r="14" fill="#a855f7" stroke="#581c87" stroke-width="3"/><circle cx="174" cy="66" r="4" fill="#fff" opacity=".8"/><g class="sparkle"><circle cx="196" cy="58" r="3" fill="#e9d5ff"/><circle cx="162" cy="52" r="2.5" fill="#e9d5ff"/></g>`,
  bubblewand: () => `<line x1="152" y1="196" x2="174" y2="140" stroke="#f472b6" stroke-width="5" stroke-linecap="round"/><circle cx="178" cy="130" r="10" fill="none" stroke="#f472b6" stroke-width="4"/><g class="sparkle">${[[184,100,9],[168,84,6],[192,70,5],[176,54,7]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#e0f2fe" fill-opacity=".4" stroke="#7dd3fc" stroke-width="2"/>`).join('')}</g>`,
  lollipop: () => `<line x1="156" y1="196" x2="170" y2="130" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/><circle cx="174" cy="112" r="22" fill="#f472b6" stroke="#9d174d" stroke-width="3"/><path d="M174 112 m-14 0 a14 14 0 1 1 14 14 a9 9 0 1 1 -9 -9 a4 4 0 1 1 4 4" stroke="#fff" stroke-width="4" fill="none"/>`,
  teddy: () => `<circle cx="160" cy="180" r="18" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="160" cy="154" r="14" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="149" cy="143" r="6" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="171" cy="143" r="6" fill="#b45309" stroke="#78350f" stroke-width="3"/><circle cx="155" cy="152" r="2" fill="#1f2937"/><circle cx="165" cy="152" r="2" fill="#1f2937"/><ellipse cx="160" cy="159" rx="5" ry="3.5" fill="#fde68a"/><circle cx="160" cy="180" r="9" fill="#fde68a"/>`,
  guitar: () => `<line x1="160" y1="170" x2="194" y2="92" stroke="#78350f" stroke-width="6"/><rect x="186" y="80" width="12" height="16" rx="3" transform="rotate(24 192 88)" fill="#1f2937"/><path d="M136 188 Q128 166 146 160 Q150 146 166 152 Q182 158 176 176 Q186 194 166 200 Q146 206 136 188Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3"/><circle cx="158" cy="178" r="6" fill="#1f2937"/>`,
  flag: () => `<line x1="158" y1="204" x2="170" y2="60" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/><path d="M170 62 Q186 54 200 64 L198 98 Q184 88 168 96Z" fill="#8b5cf6" stroke="#4c1d95" stroke-width="3"/><path d="M184 70 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="#fde047"/>`
});
const shieldShape = 'M14 124 H66 V146 Q66 176 40 192 Q14 176 14 146Z';
const SHIELD = {
  sh_knight: () => `<path d="${shieldShape}" fill="#cbd5e1" stroke="#334155" stroke-width="4"/><path d="M22 132 H58 V146 Q58 170 40 182 Q22 170 22 146Z" fill="#2563eb"/><path d="M24 150 L40 140 L56 150 M24 162 L40 152 L56 162" stroke="#facc15" stroke-width="5" fill="none"/>`,
  sh_star: () => `<path d="${shieldShape}" fill="#7c3aed" stroke="#2e1065" stroke-width="4"/><path d="M40 136 l6 13 l14 2 l-10 10 l2 14 l-12 -7 l-12 7 l2 -14 l-10 -10 l14 -2z" fill="#fde047" stroke="#a16207" stroke-width="2"/>`,
  sh_heart: () => `<path d="${shieldShape}" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><path d="M40 176 l-16 -16 a8 8 0 0 1 16 -10 a8 8 0 0 1 16 10z" fill="#ec4899" stroke="#9d174d" stroke-width="2.5"/><g class="sparkle"><circle cx="26" cy="134" r="3" fill="#fff"/></g>`,
  sh_bolt: () => `<path d="${shieldShape}" fill="#111827" stroke="#facc15" stroke-width="4"/><path d="M44 130 L28 158 H40 L34 184 L54 150 H42 L50 130Z" fill="#facc15"/>`,
  sh_wood: () => `<circle cx="40" cy="158" r="30" fill="#b45309" stroke="#422006" stroke-width="4"/><path d="M40 128 V188 M10 158 H70" stroke="#78350f" stroke-width="3"/><circle cx="40" cy="158" r="9" fill="#94a3b8" stroke="#334155" stroke-width="3"/>`,
  sh_dragon: () => `<path d="${shieldShape}" fill="#facc15" stroke="#a16207" stroke-width="4"/><path d="M26 168 Q30 140 46 140 Q56 140 54 150 Q48 146 44 150 Q52 156 44 164 Q50 170 40 178 Q36 170 26 168Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2"/><g class="sparkle"><path d="M58 130 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1z" fill="#fff"/></g>`
};
const PETS = { p_dragon:'🐲', p_kitty:'🐱', p_puppy:'🐶', p_bunny:'🐰', p_unicorn:'🦄', p_owl:'🦉', p_panda:'🐼', p_robot:'🤖', p_turtle:'🐢', p_phoenix:'🐦‍🔥' };
const PET = Object.fromEntries(Object.entries(PETS).map(([id,e]) => [id, () => `<g class="petbob"><ellipse cx="34" cy="214" rx="18" ry="4" fill="#000" opacity=".15"/><text x="34" y="210" font-size="34" text-anchor="middle">${e}</text></g>`]));
const auraEmoji = (e, pts) => `<g class="twinkle">${pts.map(([x,y,s],i)=>`<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" style="animation-delay:${i*0.25}s">${e}</text>`).join('')}</g>`;
const AURA_PTS = [[30,40,20],[172,36,18],[18,110,16],[186,112,20],[44,76,14],[160,80,14],[100,22,16]];
const AURA = {
  a_sparkle: () => auraEmoji('✨', AURA_PTS),
  a_hearts: () => auraEmoji('💖', AURA_PTS),
  a_stars: () => auraEmoji('⭐', AURA_PTS),
  a_snow: () => auraEmoji('❄️', AURA_PTS),
  a_bubbles: () => auraEmoji('🫧', AURA_PTS),
  a_bolt: () => `<circle cx="100" cy="120" r="88" fill="#facc15" opacity=".18"/>` + auraEmoji('⚡', AURA_PTS),
  a_fire: () => `<g class="flame"><path d="M30 214 Q20 150 50 120 Q46 150 62 160 Q60 110 100 80 Q96 130 120 140 Q130 110 150 104 Q140 150 170 160 Q186 190 170 214Z" fill="#f97316" opacity=".55"/><path d="M50 214 Q44 170 70 150 Q74 180 100 120 Q110 170 130 160 Q150 190 150 214Z" fill="#fde047" opacity=".5"/></g>`,
  a_rainbow: () => `<g class="twinkle">${RB.map((c,i)=>`<circle cx="100" cy="118" r="${92-i*6}" fill="none" stroke="${c}" stroke-width="5" opacity=".55"/>`).join('')}</g>`
};

/* ================= MY WORLD: free-placement world builder ================= */
// [category, id, emoji, name, price, unlockLevel?]
const WORLD_ITEMS = [
  ['home','house','🏠','House',15], ['home','garden','🏡','Garden House',20], ['home','hut','🛖','Hut',10], ['home','tent','⛺','Tent',10],
  ['home','school','🏫','School',30], ['home','hq','🏢','Hero HQ',50], ['home','tower','🗼','Tall Tower',40], ['home','museum','🏛️','Museum',40],
  ['home','circus','🎪','Circus Tent',35], ['home','factory','🏭','Robot Factory',45], ['home','castle','🏰','Castle',60,4], ['home','ufo','🛸','UFO Base',70,6],
  ['nature','tree','🌳','Tree',5], ['nature','pine','🌲','Pine Tree',5], ['nature','palm','🌴','Palm Tree',8], ['nature','blossom','🌸','Blossom',5],
  ['nature','sunflower','🌻','Sunflower',5], ['nature','tulip','🌷','Tulip',5], ['nature','mushroom','🍄','Mushroom',5], ['nature','rock','🪨','Rock',3],
  ['nature','mountain','⛰️','Mountain',25], ['nature','volcano','🌋','Volcano',40], ['nature','rainbow','🌈','Rainbow',30], ['nature','cloud','☁️','Cloud',5],
  ['nature','sun','☀️','Sun',10], ['nature','moon','🌙','Moon',10], ['nature','star','⭐','Star',5], ['nature','crystal','💎','Giant Crystal',20],
  ['fun','ferris','🎡','Ferris Wheel',50], ['fun','coaster','🎢','Roller Coaster',60,5], ['fun','carousel','🎠','Carousel',45], ['fun','slide','🛝','Slide',20],
  ['fun','fountain','⛲','Fountain',25], ['fun','balloons','🎈','Balloon',8], ['fun','campfire','🔥','Campfire',10], ['fun','kite','🪁','Kite',8],
  ['fun','ball','⚽','Ball',5], ['fun','target','🎯','Target',8], ['fun','trophy','🏆','Trophy',20], ['fun','present','🎁','Present',8],
  ['fun','icecream','🍦','Ice Cream',5], ['fun','cupcake','🧁','Cupcake',5], ['fun','pizza','🍕','Pizza',5], ['fun','treasure','💰','Treasure',30],
  ['ride','rocket','🚀','Rocket',40], ['ride','jet','✈️','Jet',35], ['ride','heli','🚁','Helicopter',35], ['ride','car','🚗','Car',20],
  ['ride','racecar','🏎️','Race Car',35], ['ride','train','🚂','Train',40], ['ride','ship','🚢','Ship',40], ['ride','sailboat','⛵','Sailboat',20],
  ['ride','firetruck','🚒','Fire Truck',30], ['ride','scooter','🛴','Scooter',10],
  ['animal','trex','🦖','T-Rex',40], ['animal','dino','🦕','Long-Neck Dino',40], ['animal','dragon','🐉','Dragon',50,4], ['animal','unicorn','🦄','Unicorn',45],
  ['animal','dolphin','🐬','Dolphin',20], ['animal','butterfly','🦋','Butterfly',8], ['animal','bee','🐝','Bee',5], ['animal','ladybug','🐞','Ladybug',5],
  ['animal','parrot','🦜','Parrot',15], ['animal','penguin','🐧','Penguin',15], ['animal','panda','🐼','Panda',20], ['animal','lion','🦁','Lion',25],
  ['animal','elephant','🐘','Elephant',25], ['animal','giraffe','🦒','Giraffe',25],
  // holidays: Christmas & winter
  ['holiday','xmastree','🎄','Christmas Tree',25], ['holiday','santa','🎅','Santa',35], ['holiday','mrsclaus','🤶','Mrs. Claus',35],
  ['holiday','reindeer','🦌','Reindeer',25], ['holiday','sleigh','🛷','Sleigh',40], ['holiday','snowman','⛄','Snowman',15],
  ['holiday','stocking','🧦','Stocking',8], ['holiday','bells','🔔','Jingle Bells',8], ['holiday','giftpile','🎁','Pile of Gifts',15],
  ['holiday','cookies','🍪','Cookies for Santa',8], ['holiday','snowflake','❄️','Giant Snowflake',10], ['holiday','hotcocoa','☕','Hot Cocoa',8],
  // holidays: blow-up yard decorations (they sway in the breeze)
  ['holiday','inf_santa','🎅','Blow-Up Santa',45], ['holiday','inf_snowman','⛄','Blow-Up Snowman',40], ['holiday','inf_reindeer','🦌','Blow-Up Reindeer',40],
  ['holiday','inf_pumpkin','🎃','Blow-Up Pumpkin',40], ['holiday','inf_ghost','👻','Blow-Up Ghost',40], ['holiday','inf_bunny','🐰','Blow-Up Bunny',40],
  ['holiday','inf_turkey','🦃','Blow-Up Turkey',40], ['holiday','inf_dino','🦖','Blow-Up Holiday Dino',50],
  // holidays: Halloween
  ['holiday','jackolantern','🎃','Jack-o\'-Lantern',10], ['holiday','ghost','👻','Ghost',15], ['holiday','witch','🧙','Witch',25],
  ['holiday','vampire','🧛','Vampire',25], ['holiday','zombie','🧟','Zombie',25], ['holiday','skeleton','💀','Skeleton',15],
  ['holiday','bats','🦇','Bats',10], ['holiday','web','🕸️','Spider Web',8], ['holiday','spider','🕷️','Spider',8],
  ['holiday','candy','🍬','Trick-or-Treat Candy',8], ['holiday','haunted','🏚️','Haunted House',45], ['holiday','broom','🧹','Witch\'s Broom',15],
  // holidays: Easter & spring
  ['holiday','easterbunny','🐰','Easter Bunny',25], ['holiday','easteregg','🥚','Easter Egg',5], ['holiday','chick','🐣','Baby Chick',10],
  ['holiday','eggbasket','🧺','Egg Basket',15],
  // holidays: Thanksgiving, Valentine's, St. Patrick's
  ['holiday','turkey','🦃','Turkey',20], ['holiday','pie','🥧','Pumpkin Pie',8], ['holiday','corn','🌽','Harvest Corn',8], ['holiday','leaves','🍂','Fall Leaves',5],
  ['holiday','valentine','💝','Valentine Heart',10], ['holiday','loveletter','💌','Love Letter',8], ['holiday','rose','🌹','Rose',8],
  ['holiday','clover','🍀','Lucky Clover',8], ['holiday','goldcoins','🪙','Pot of Gold Coins',20],
  // holidays: celebrations around the world
  ['holiday','fireworks','🎆','Fireworks',30], ['holiday','sparkler','🎇','Sparkler',15], ['holiday','popper','🎉','Party Popper',10],
  ['holiday','lantern','🏮','Paper Lantern',15], ['holiday','redenvelope','🧧','Red Envelope',10], ['holiday','menorah','🕎','Menorah',20],
  ['holiday','diya','🪔','Diya Lamp',15], ['holiday','candles','🕯️','Candles',8]
];

/* ---------- Town: original drawn buildings, shops, restaurants and vehicles ----------
   Each entry draws an SVG sized in em, so the world's Bigger/Smaller buttons still work. */
const TOWN_INK = '#1f2937';
const svgItem = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" style="width:${(w/60).toFixed(2)}em;height:${(h/60).toFixed(2)}em;display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const awning = (x, y, w, c1, c2) => { let s = ''; const n = Math.max(4, Math.round(w / 16)), sw = w / n; for (let i = 0; i < n; i++) s += `<path d="M${x+i*sw} ${y} h${sw} v14 q-${sw/2} 10 -${sw} 0z" fill="${i%2 ? c2 : c1}" stroke="${TOWN_INK}" stroke-width="2"/>`; return s; };
const winRow = (x, y, n, w, gap, col='#bae6fd') => Array.from({length:n}, (_, i) => `<rect x="${x+i*(w+gap)}" y="${y}" width="${w}" height="${w*1.1}" rx="3" fill="${col}" stroke="${TOWN_INK}" stroke-width="2"/><path d="M${x+i*(w+gap)+w/2} ${y} v${w*1.1}" stroke="#fff" stroke-width="1.5" opacity=".7"/>`).join('');
function shop(wall, a1, a2, sign, label, extra=''){
  return svgItem(150, 130, `<rect x="8" y="34" width="134" height="92" rx="4" fill="${wall}" stroke="${TOWN_INK}" stroke-width="3"/>
    <rect x="16" y="6" width="118" height="30" rx="8" fill="#fff" stroke="${TOWN_INK}" stroke-width="3"/><text x="75" y="27" text-anchor="middle" font-family="Lilita One,Fredoka,sans-serif" font-size="17" fill="${TOWN_INK}">${sign} ${label}</text>
    ${awning(10, 44, 130, a1, a2)}
    <rect x="18" y="68" width="62" height="40" rx="3" fill="#bae6fd" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M26 72 l12 30" stroke="#fff" stroke-width="3" opacity=".7"/>
    <rect x="92" y="66" width="38" height="60" rx="3" fill="${a1}" stroke="${TOWN_INK}" stroke-width="2.5"/><circle cx="122" cy="98" r="3" fill="#facc15"/>${extra}`);
}
const TOWN_SVG = {
  dreamhouse: svgItem(220, 190, `<rect x="20" y="70" width="180" height="116" rx="6" fill="#fbcfe8" stroke="${TOWN_INK}" stroke-width="3"/>
    <path d="M10 74 L110 14 L210 74z" fill="#ec4899" stroke="${TOWN_INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="110" cy="50" r="12" fill="#fff" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M104 50 l6 -6 l6 6 l-6 6z" fill="#f472b6"/>
    <rect x="20" y="120" width="180" height="6" fill="#f9a8d4"/>
    ${winRow(34, 84, 4, 26, 20, '#fdf2f8')}${winRow(34, 134, 1, 26, 0, '#fdf2f8')}${winRow(150, 134, 1, 26, 0, '#fdf2f8')}
    <path d="M94 186 v-38 a16 16 0 0 1 32 0 v38z" fill="#f472b6" stroke="${TOWN_INK}" stroke-width="2.5"/><circle cx="120" cy="168" r="2.5" fill="#fde047"/>
    <path d="M200 120 h16 v10 h-16" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><path d="M216 130 q20 20 6 56" stroke="#f9a8d4" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="-30" y="166" width="70" height="20" rx="8" fill="#67e8f9" stroke="${TOWN_INK}" stroke-width="2.5"/>
    ${[40,70,150,180].map(x => `<path d="M${x} 186 q-6 -12 0 -18 q6 6 0 18z" fill="#f472b6"/>`).join('')}<path d="M100 74 q10 -8 20 0" stroke="#fde047" stroke-width="3" fill="none"/>`),
  herocar: svgItem(200, 80, `<path d="M6 56 q4 -18 30 -22 l40 -16 h44 l34 16 q30 4 40 22 l-4 10 h-180z" fill="#111827" stroke="#374151" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 34 l38 -26 l-4 30z M44 34 l-30 -20 l2 26z" fill="#111827" stroke="#374151" stroke-width="2.5"/>
    <path d="M82 22 h34 l22 14 h-72z" fill="#38bdf8" opacity=".85"/><path d="M16 50 h170" stroke="#facc15" stroke-width="3"/>
    <circle cx="44" cy="66" r="14" fill="#1f2937" stroke="#6b7280" stroke-width="4"/><circle cx="156" cy="66" r="14" fill="#1f2937" stroke="#6b7280" stroke-width="4"/><circle cx="44" cy="66" r="4" fill="#facc15"/><circle cx="156" cy="66" r="4" fill="#facc15"/>
    <path d="M186 50 h12 M-2 54 l-8 2" stroke="#fde047" stroke-width="4" stroke-linecap="round"/><path d="M0 48 q-14 2 -20 10 q12 -2 18 2" fill="#f97316" class="flame"/>`),
  pizza: shop('#fef3c7', '#dc2626', '#fff', '🍕', 'Pizza Place', `<circle cx="49" cy="88" r="14" fill="#fbbf24" stroke="#b45309" stroke-width="2"/><circle cx="44" cy="84" r="3" fill="#dc2626"/><circle cx="54" cy="90" r="3" fill="#dc2626"/>`),
  burger: shop('#e0f2fe', '#ef4444', '#facc15', '🍔', 'Burger Diner'),
  icecream: shop('#fce7f3', '#f9a8d4', '#fff', '🍦', 'Ice Cream'),
  bakery: shop('#fef9c3', '#a16207', '#fde68a', '🧁', 'Bakery'),
  sushi: shop('#fff7ed', '#111827', '#ef4444', '🍣', 'Sushi Bar'),
  noodles: shop('#fee2e2', '#dc2626', '#facc15', '🍜', 'Noodle House'),
  cafe: shop('#ecfccb', '#16a34a', '#fff', '☕', 'Café'),
  candy: shop('#fae8ff', '#c026d3', '#fff', '🍭', 'Candy Shop'),
  toystore: shop('#dbeafe', '#2563eb', '#facc15', '🧸', 'Toy Store'),
  bookstore: shop('#ede9fe', '#7c3aed', '#fff', '📚', 'Book Shop'),
  petshop: shop('#dcfce7', '#22c55e', '#fff', '🐾', 'Pet Shop'),
  flowers: shop('#fdf2f8', '#ec4899', '#86efac', '🌷', 'Flowers'),
  market: shop('#fef3c7', '#16a34a', '#fde68a', '🍎', 'Market'),
  arcade: shop('#1e1b4b', '#7c3aed', '#22d3ee', '🕹️', 'Arcade'),
  cinema: svgItem(170, 150, `<rect x="10" y="40" width="150" height="106" rx="4" fill="#7f1d1d" stroke="${TOWN_INK}" stroke-width="3"/><rect x="24" y="6" width="122" height="38" rx="6" fill="#111827" stroke="#facc15" stroke-width="3"/><text x="85" y="32" text-anchor="middle" font-family="Bangers,Lilita One,sans-serif" font-size="22" fill="#facc15" letter-spacing="2">CINEMA</text>${[30,50,70,90,110,130].map(x => `<circle cx="${x}" cy="44" r="3" fill="#fde047"/>`).join('')}<rect x="24" y="60" width="122" height="30" rx="3" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><text x="85" y="81" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="14" fill="#7f1d1d">🍿 NOW SHOWING</text><path d="M62 146 v-36 h46 v36" fill="#fde68a" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M85 110 v36" stroke="${TOWN_INK}" stroke-width="2"/>`),
  townhall: svgItem(200, 180, `<path d="M20 64 L100 18 L180 64z" fill="#e2e8f0" stroke="${TOWN_INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="46" r="11" fill="#fff" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M100 40 v6 l4 3" stroke="${TOWN_INK}" stroke-width="2" fill="none"/>
    <rect x="22" y="64" width="156" height="10" fill="#cbd5e1" stroke="${TOWN_INK}" stroke-width="2.5"/>${[34,62,90,118,146].map(x => `<rect x="${x}" y="74" width="16" height="84" fill="#f8fafc" stroke="${TOWN_INK}" stroke-width="2"/>`).join('')}
    <rect x="14" y="158" width="172" height="10" fill="#cbd5e1" stroke="${TOWN_INK}" stroke-width="2.5"/><rect x="6" y="168" width="188" height="10" fill="#94a3b8" stroke="${TOWN_INK}" stroke-width="2.5"/><path d="M100 18 v-14 l18 6 l-18 6" fill="#ef4444" stroke="${TOWN_INK}" stroke-width="1.5"/>`),
  clocktower: svgItem(70, 210, `<rect x="14" y="60" width="42" height="146" fill="#d6b88a" stroke="${TOWN_INK}" stroke-width="3"/><path d="M8 62 L35 14 L62 62z" fill="#1e3a8a" stroke="${TOWN_INK}" stroke-width="3"/><circle cx="35" cy="86" r="16" fill="#fff" stroke="${TOWN_INK}" stroke-width="3"/><path d="M35 76 v10 l7 5" stroke="${TOWN_INK}" stroke-width="2.5" fill="none"/>${[120,150,180].map(y => `<rect x="27" y="${y}" width="16" height="18" rx="8" fill="#bae6fd" stroke="${TOWN_INK}" stroke-width="2"/>`).join('')}`),
  skyscraper: svgItem(90, 260, `<rect x="10" y="20" width="70" height="236" fill="#60a5fa" stroke="${TOWN_INK}" stroke-width="3"/>${Array.from({length:11}, (_, r) => winRow(18, 30 + r*20, 4, 10, 6, r % 3 ? '#e0f2fe' : '#fde68a')).join('')}<path d="M45 20 v-18" stroke="${TOWN_INK}" stroke-width="3"/><circle cx="45" cy="2" r="4" fill="#ef4444"/>`),
  apartments: svgItem(130, 190, `<rect x="8" y="16" width="114" height="170" fill="#fda4af" stroke="${TOWN_INK}" stroke-width="3"/><rect x="2" y="8" width="126" height="12" fill="#e11d48" stroke="${TOWN_INK}" stroke-width="2.5"/>${Array.from({length:5}, (_, r) => winRow(18, 30 + r*28, 4, 18, 8)).join('')}<rect x="50" y="160" width="30" height="26" fill="#7c2d12" stroke="${TOWN_INK}" stroke-width="2"/>`),
  firestation: shop('#fecaca', '#dc2626', '#fff', '🚒', 'Fire Station'),
  police: shop('#dbeafe', '#1e3a8a', '#fff', '🚓', 'Police'),
  hospital: shop('#f8fafc', '#ef4444', '#fff', '🏥', 'Hospital'),
  library: shop('#fef3c7', '#92400e', '#fde68a', '📖', 'Library'),
  lamp: svgItem(30, 130, `<rect x="13" y="20" width="5" height="106" fill="#334155"/><rect x="6" y="122" width="19" height="6" rx="2" fill="#334155"/><path d="M4 22 h22 l-4 -14 h-14z" fill="#334155"/><circle cx="15" cy="20" r="6" fill="#fde68a" class="sc-firefly"/>`),
  bench: svgItem(110, 56, `<rect x="6" y="10" width="98" height="10" rx="3" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/><rect x="6" y="26" width="98" height="10" rx="3" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/><path d="M14 36 v18 M96 36 v18" stroke="#334155" stroke-width="5"/>`),
  road: svgItem(240, 34, `<rect x="0" y="0" width="240" height="34" fill="#4b5563"/><path d="M0 17 h240" stroke="#facc15" stroke-width="4" stroke-dasharray="22 16"/><rect x="0" y="0" width="240" height="3" fill="#9ca3af"/><rect x="0" y="31" width="240" height="3" fill="#9ca3af"/>`),
  crosswalk: svgItem(120, 34, `<rect x="0" y="0" width="120" height="34" fill="#4b5563"/>${[6,26,46,66,86,106].map(x => `<rect x="${x}" y="3" width="10" height="28" fill="#f8fafc"/>`).join('')}`),
  stall: svgItem(110, 100, `${awning(4, 4, 102, '#f97316', '#fff')}<rect x="10" y="20" width="90" height="10" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><path d="M14 30 v66 M96 30 v66" stroke="#7c4a24" stroke-width="5"/><rect x="8" y="60" width="94" height="36" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/><text x="55" y="58" text-anchor="middle" font-size="22">🍉🍋🍓</text>`),
  planter: svgItem(90, 60, `<rect x="6" y="28" width="78" height="30" rx="4" fill="#a16207" stroke="${TOWN_INK}" stroke-width="2"/>${[16,30,44,58,72].map((x,i) => `<circle cx="${x}" cy="24" r="9" fill="${['#f472b6','#facc15','#a78bfa','#fb7185','#f97316'][i]}" stroke="${TOWN_INK}" stroke-width="1.5"/>`).join('')}`),
  tacotruck: svgItem(180, 110, `<rect x="6" y="20" width="120" height="70" rx="8" fill="#facc15" stroke="${TOWN_INK}" stroke-width="3"/><path d="M126 40 h28 l18 22 v28 h-46z" fill="#facc15" stroke="${TOWN_INK}" stroke-width="3"/><path d="M134 46 h18 l12 16 h-30z" fill="#bae6fd" stroke="${TOWN_INK}" stroke-width="2"/><rect x="20" y="32" width="80" height="30" rx="4" fill="#fff" stroke="${TOWN_INK}" stroke-width="2"/><text x="60" y="54" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="16" fill="#b91c1c">🌮 TACOS</text>${awning(16, 22, 92, '#ef4444', '#16a34a')}<circle cx="40" cy="92" r="12" fill="#1f2937" stroke="#6b7280" stroke-width="4"/><circle cx="146" cy="92" r="12" fill="#1f2937" stroke="#6b7280" stroke-width="4"/>`)
};


/* ================= MY WORLD ART =================
   Hand-drawn items replace emoji: one consistent game-art style (dark outline, flat color,
   soft shading and a highlight), and many have a little life (sway, spin, flicker, blink, bob).
   1em = one emoji-sized item; each drawing sets its own width in em. */
const WI = '#2b2135';
const wO = (w = 3) => `stroke="${WI}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const artItem = (vw, vh, em, body, cls = '') => `<svg class="wa ${cls}" viewBox="0 0 ${vw} ${vh}" style="width:${em}em;height:${(em * vh / vw).toFixed(2)}em;display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const hi = d => `<path d="${d}" fill="#fff" opacity=".38"/>`;
const sh = d => `<path d="${d}" fill="#000" opacity=".15"/>`;
const eyes2 = (x1, x2, y, r = 3.2) => `<g class="wa-blink"><circle cx="${x1}" cy="${y}" r="${r}" fill="${WI}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${WI}"/><circle cx="${x1 + 1}" cy="${y - 1.2}" r="${(r * .36).toFixed(1)}" fill="#fff"/><circle cx="${x2 + 1}" cy="${y - 1.2}" r="${(r * .36).toFixed(1)}" fill="#fff"/></g>`;
const ground = (cx, y, rx) => `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${(rx * .16).toFixed(1)}" fill="#000" opacity=".18"/>`;
const flag = (x, y, c) => `<path d="M${x} ${y} v-26" ${wO(2.5)}/><path class="wa-flag" d="M${x} ${y - 26} q10 -4 18 2 q-8 4 -18 8z" fill="${c}" ${wO(2)}/>`;
const smoke = (x, y) => `<g class="wa-smoke"><circle cx="${x}" cy="${y}" r="6" fill="#e5e7eb" opacity=".9"/><circle cx="${x + 5}" cy="${y - 10}" r="8" fill="#f3f4f6" opacity=".8"/><circle cx="${x + 12}" cy="${y - 22}" r="10" fill="#f9fafb" opacity=".6"/></g>`;
const win = (x, y, w, h, c = '#7dd3fc') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${c}" class="wa-win" ${wO(2.5)}/><path d="M${x + w / 2} ${y} v${h} M${x} ${y + h / 2} h${w}" stroke="${WI}" stroke-width="1.6"/><path d="M${x + 3} ${y + h - 4} l${w * .4} ${-h * .6}" stroke="#fff" stroke-width="2.5" opacity=".6"/>`;
const sparkle = (x, y, s = 1, c = '#fff') => `<path class="wa-twinkle" d="M${x} ${y - 7 * s} l${2 * s} ${5 * s} ${5 * s} ${2 * s} -${5 * s} ${2 * s} -${2 * s} ${5 * s} -${2 * s} -${5 * s} -${5 * s} -${2 * s} ${5 * s} -${2 * s}z" fill="${c}"/>`;

const WORLD_ART = {
  /* ---------- nature ---------- */
  tree: artItem(100, 124, 1.5, `${ground(50, 118, 34)}<path d="M42 118 q4 -30 2 -50 h12 q-2 20 2 50 q-8 4 -16 0z" fill="#8b5a2b" ${wO()}/><path d="M50 74 l-12 -12 M52 82 l12 -10" ${wO(2.5)}/>
    <g class="wa-sway"><circle cx="30" cy="54" r="24" fill="#2f9e44" ${wO()}/><circle cx="70" cy="54" r="24" fill="#2f9e44" ${wO()}/><circle cx="50" cy="34" r="28" fill="#37b24d" ${wO()}/>
    ${hi('M34 24 q14 -14 30 -4 q-14 -2 -30 10z')}<circle cx="30" cy="60" r="4.5" fill="#ef4444" ${wO(1.5)}/><circle cx="66" cy="44" r="4.5" fill="#ef4444" ${wO(1.5)}/><circle cx="48" cy="58" r="4.5" fill="#ef4444" ${wO(1.5)}/></g>`),
  pine: artItem(90, 132, 1.3, `${ground(45, 126, 30)}<rect x="39" y="104" width="12" height="22" rx="2" fill="#7c4a1e" ${wO()}/>
    <g class="wa-sway"><path d="M45 6 L72 46 H58 L80 76 H62 L86 108 H4 L28 76 H10 L32 46 H18Z" fill="#1f7a4d" ${wO()}/>${sh('M45 6 L72 46 H58 L80 76 H62 L86 108 H45Z')}
    <path d="M45 6 l-8 12 q8 4 16 0z" fill="#fff" opacity=".85"/><path d="M28 76 q8 5 16 0 M18 46 q8 5 14 0 M52 76 q8 5 16 0" stroke="#e2f7ec" stroke-width="3" fill="none" opacity=".7"/></g>`),
  palm: artItem(116, 134, 1.6, `${ground(60, 128, 30)}<path d="M54 128 q-4 -50 10 -86 l10 3 q-12 36 -8 83z" fill="#a0703c" ${wO()}/>${[56,72,88,104].map(y => `<path d="M${56 + (128 - y) * .14} ${y} l12 2" stroke="${WI}" stroke-width="2"/>`).join('')}
    <g class="wa-sway"><path d="M68 40 q-34 -22 -62 4 q30 -8 62 0z" fill="#2fb34d" ${wO()}/><path d="M70 40 q30 -26 62 -2 q-32 -6 -62 6z" fill="#2fb34d" ${wO()}/><path d="M68 38 q-18 -34 -48 -30 q26 8 46 34z" fill="#37c25a" ${wO()}/><path d="M70 38 q14 -34 46 -32 q-24 10 -44 36z" fill="#37c25a" ${wO()}/><path d="M68 40 q-24 6 -38 38 q22 -22 40 -34z" fill="#28a043" ${wO()}/>
    <circle cx="64" cy="46" r="6" fill="#6b4423" ${wO(2)}/><circle cx="74" cy="47" r="6" fill="#7c4f2a" ${wO(2)}/></g>`),
  blossom: artItem(104, 116, 1.45, `${ground(52, 110, 34)}<path d="M46 110 q2 -26 -8 -42 l8 -4 q6 12 8 22 q4 -14 14 -22 l6 6 q-12 14 -12 40z" fill="#7a4a2a" ${wO()}/>
    <g class="wa-sway"><circle cx="28" cy="50" r="22" fill="#f9a8d4" ${wO()}/><circle cx="76" cy="50" r="22" fill="#f9a8d4" ${wO()}/><circle cx="52" cy="32" r="27" fill="#fbcfe8" ${wO()}/>${hi('M36 20 q16 -12 32 -2 q-16 -2 -32 8z')}
    ${[[30,44],[60,22],[76,54],[44,52],[66,40]].map(([x,y]) => `<g fill="#ec4899"><circle cx="${x}" cy="${y}" r="3"/><circle cx="${x+4}" cy="${y+2}" r="2.4"/><circle cx="${x-2}" cy="${y+4}" r="2.4"/></g>`).join('')}</g>
    <path class="wa-petal" d="M80 70 q4 -4 6 0 q-2 4 -6 0z" fill="#f472b6"/><path class="wa-petal b" d="M20 74 q4 -4 6 0 q-2 4 -6 0z" fill="#f9a8d4"/>`),
  sunflower: artItem(56, 120, .85, `${ground(28, 116, 16)}<path d="M28 116 V48" stroke="#3f9b3a" stroke-width="5"/><path d="M28 92 q-22 -4 -22 -18 q16 2 22 18z M28 78 q20 -6 22 -20 q-16 4 -22 20z" fill="#4cbb47" ${wO(2.5)}/>
    <g class="wa-bob">${Array.from({ length:12 }, (_, i) => `<ellipse cx="28" cy="16" rx="6" ry="13" fill="#facc15" ${wO(2)} transform="rotate(${i * 30} 28 30)"/>`).join('')}<circle cx="28" cy="30" r="12" fill="#7c4a1e" ${wO(2.5)}/>
    <path d="M22 28 q2 -2 4 0 M30 28 q2 -2 4 0" stroke="${WI}" stroke-width="1.8" fill="none"/><path d="M23 33 q5 4 10 0" stroke="${WI}" stroke-width="1.8" fill="none"/></g>`),
  tulip: artItem(70, 80, .85, `${ground(35, 77, 26)}${[[16,'#f43f5e',40],[35,'#facc15',30],[54,'#a855f7',42]].map(([x,c,y]) => `<path d="M${x} 78 V${y}" stroke="#3f9b3a" stroke-width="4"/><g class="wa-bob"><path d="M${x - 10} ${y - 18} l5 6 5 -8 5 8 5 -6 q2 18 -10 20 q-12 -2 -10 -20z" fill="${c}" ${wO(2.2)}/>${hi(`M${x - 6} ${y - 10} q2 6 6 8 q-6 0 -6 -8z`)}</g>`).join('')}<path d="M24 78 q-14 -16 -8 -26 q6 10 8 26z M44 78 q14 -18 10 -28 q-8 10 -10 28z" fill="#4cbb47" ${wO(2)}/>`),
  mushroom: artItem(76, 74, .95, `${ground(38, 70, 26)}<path d="M26 70 q-2 -16 2 -26 h20 q4 10 2 26z" fill="#fff7ed" ${wO()}/>${eyes2(32, 44, 54, 2.6)}<path d="M34 61 q4 3 8 0" stroke="${WI}" stroke-width="2" fill="none"/>
    <path d="M4 46 q2 -40 34 -42 q32 2 34 42 q-34 8 -68 0z" fill="#ef4444" ${wO()}/>${sh('M38 4 q32 2 34 42 q-14 4 -34 4z')}<circle cx="22" cy="28" r="6" fill="#fff"/><circle cx="44" cy="16" r="5" fill="#fff"/><circle cx="56" cy="32" r="6" fill="#fff"/><circle cx="34" cy="38" r="3.5" fill="#fff"/>${hi('M14 26 q8 -16 22 -18 q-14 8 -22 18z')}`),
  rock: artItem(84, 58, 1.1, `${ground(42, 54, 36)}<path d="M6 52 q-4 -22 14 -34 q14 -16 32 -10 q22 2 28 24 q4 16 -4 22z" fill="#94a3b8" ${wO()}/>${sh('M52 8 q22 2 28 24 q4 16 -4 22 h-24z')}${hi('M18 22 q10 -10 22 -10 q-10 6 -22 14z')}
    <path d="M14 20 q10 -10 22 -6 q-8 4 -12 10 q-6 -2 -10 -4z" fill="#4ade80" ${wO(1.5)}/><path d="M40 30 l6 8 M58 24 l-4 10" stroke="#64748b" stroke-width="2"/>`),
  mountain: artItem(210, 140, 2.9, `${ground(105, 136, 96)}<path d="M4 136 L70 34 L104 80 L142 14 L206 136Z" fill="#7c8db5" ${wO()}/>${sh('M142 14 L206 136 H150 L120 60Z')}${sh('M70 34 L104 80 L90 136 H60Z')}
    <path d="M142 14 L162 50 L150 46 L142 56 L132 44 L122 50Z" fill="#fff" ${wO(2)}/><path d="M70 34 L84 56 L74 52 L66 60 L58 52Z" fill="#fff" ${wO(2)}/><path d="M30 136 l20 -30 l14 14 l14 -18 l20 34z" fill="#3fa34d" ${wO(2.5)}/>`),
  volcano: artItem(180, 150, 2.6, `${ground(90, 146, 82)}<path d="M8 146 L66 44 h48 L172 146Z" fill="#6b4a3a" ${wO()}/>${sh('M90 44 h24 L172 146 H110Z')}
    <path d="M66 44 q24 10 48 0 l-6 -6 q-18 6 -36 0z" fill="#f97316" ${wO(2.5)}/><path class="wa-glow" d="M72 46 q-4 24 -14 40 q10 -6 14 6 q6 -26 4 -46z M100 46 q8 28 24 42 q-14 -4 -16 6 q-6 -20 -8 -48z" fill="#fb923c" ${wO(2)}/><path d="M76 44 q14 6 28 0" stroke="#fde047" stroke-width="4" fill="none"/>
    ${smoke(84, 30)}<g class="wa-smoke b"><circle cx="96" cy="26" r="7" fill="#d1d5db" opacity=".8"/><circle cx="100" cy="12" r="10" fill="#e5e7eb" opacity=".6"/></g>`),
  rainbow: artItem(210, 116, 2.9, `${['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'].map((c, i) => `<path d="M${20 + i * 9} 100 a${85 - i * 9} ${85 - i * 9} 0 0 1 ${170 - i * 18} 0" stroke="${c}" stroke-width="9.5" fill="none"/>`).join('')}
    <path d="M15 100 a90 90 0 0 1 180 0 M66 100 a39 39 0 0 1 78 0" stroke="${WI}" stroke-width="2.5" fill="none"/>
    <g class="wa-bob"><path d="M0 104 q0 -16 16 -14 q4 -14 20 -8 q14 -2 14 12 q10 4 4 14 h-48 q-8 -2 -6 -4z" fill="#fff" ${wO(2.5)}/></g><g class="wa-bob b"><path d="M156 104 q0 -16 16 -14 q4 -14 20 -8 q14 -2 14 12 q10 4 4 14 h-48 q-8 -2 -6 -4z" fill="#fff" ${wO(2.5)}/></g>`),
  cloud: artItem(124, 72, 1.75, `<g class="wa-drift"><path d="M14 64 q-14 -2 -10 -18 q4 -14 20 -12 q2 -22 26 -24 q20 -2 28 16 q8 -10 22 -4 q16 8 10 24 q14 6 6 18z" fill="#fff" ${wO()}/>${sh('M14 64 h82 q14 0 10 -10 q-30 10 -92 4z')}${hi('M30 26 q8 -12 22 -10 q-12 4 -16 12z')}
    ${eyes2(52, 70, 44, 3)}<path d="M56 52 q5 4 10 0" stroke="${WI}" stroke-width="2" fill="none"/><circle cx="46" cy="50" r="4" fill="#fbcfe8"/><circle cx="76" cy="50" r="4" fill="#fbcfe8"/></g>`),
  sun: artItem(104, 104, 1.35, `<g class="wa-spin">${Array.from({ length:12 }, (_, i) => `<path d="M52 2 l6 16 h-12z" fill="${i % 2 ? '#fb923c' : '#facc15'}" ${wO(2)} transform="rotate(${i * 30} 52 52)"/>`).join('')}</g>
    <circle cx="52" cy="52" r="30" fill="#fde047" ${wO()}/>${hi('M34 40 q8 -14 24 -14 q-16 6 -24 14z')}${eyes2(43, 61, 48, 3.4)}<path d="M42 60 q10 9 20 0" stroke="${WI}" stroke-width="2.5" fill="none"/><circle cx="36" cy="58" r="4.5" fill="#fb923c" opacity=".7"/><circle cx="68" cy="58" r="4.5" fill="#fb923c" opacity=".7"/>`),
  moon: artItem(96, 96, 1.3, `<g class="wa-bob"><path d="M58 8 a40 40 0 1 0 32 58 a34 34 0 1 1 -32 -58z" fill="#fef3c7" ${wO()}/>${sh('M90 66 a40 40 0 0 1 -66 10 a34 34 0 0 0 66 -10z')}<circle cx="36" cy="40" r="5" fill="#fde68a"/><circle cx="46" cy="66" r="4" fill="#fde68a"/>
    <path d="M30 54 q4 4 8 0" stroke="${WI}" stroke-width="2.2" fill="none"/><path d="M34 62 q6 4 10 0" stroke="${WI}" stroke-width="2" fill="none"/></g>${sparkle(82, 20, 1, '#fde047')}${sparkle(76, 84, .7, '#fde047')}`),
  star: artItem(84, 84, 1.05, `<g class="wa-pulse"><path d="M42 4 l11 24 26 3 -19 18 5 26 -23 -13 -23 13 5 -26 -19 -18 26 -3z" fill="#facc15" ${wO()}/>${hi('M42 12 l7 16 -14 2z')}${eyes2(35, 49, 40, 3)}<path d="M37 49 q5 4 10 0" stroke="${WI}" stroke-width="2" fill="none"/></g>${sparkle(76, 12, .7)}${sparkle(8, 70, .6)}`),
  crystal: artItem(84, 104, 1.15, `${ground(42, 100, 32)}<g class="wa-glow"><path d="M42 4 l14 30 -6 64 h-16 l-6 -64z" fill="#a78bfa" ${wO()}/><path d="M18 40 l12 18 -2 40 h-12 l-6 -40z" fill="#67e8f9" ${wO()}/><path d="M64 36 l12 22 -6 40 h-12 l-2 -40z" fill="#f0abfc" ${wO()}/>
    ${hi('M42 4 l-6 30 4 60 -6 -64z')}${hi('M18 40 l-6 18 6 38 -2 -40z')}${hi('M64 36 l-6 22 4 38 -2 -40z')}</g>${sparkle(30, 20, .8)}${sparkle(70, 22, .6)}${sparkle(58, 80, .5)}`),

  /* ---------- buildings ---------- */
  house: artItem(130, 124, 1.25, `${ground(65, 120, 60)}<rect x="88" y="10" width="14" height="30" fill="#b45309" ${wO()}/>${smoke(95, 4)}<rect x="16" y="52" width="98" height="68" rx="3" fill="#fef3c7" ${wO()}/>${sh('M80 52 h34 v68 h-34z')}
    <path d="M6 58 L65 14 L124 58Z" fill="#dc2626" ${wO()}/>${sh('M65 14 L124 58 H65Z')}<path d="M20 50 L65 18" stroke="#fff" stroke-width="3" opacity=".4"/>
    ${win(24, 66, 22, 20, '#fde68a')}${win(84, 66, 22, 20, '#fde68a')}<path d="M54 120 v-32 a11 11 0 0 1 22 0 v32z" fill="#7c3aed" ${wO(2.5)}/><circle cx="71" cy="104" r="2.2" fill="#facc15"/>
    <rect x="22" y="90" width="26" height="8" rx="2" fill="#8b5a2b" ${wO(2)}/>${[26,33,40,46].map((x,i) => `<circle cx="${x}" cy="88" r="3.5" fill="${['#f472b6','#facc15','#fb7185','#a78bfa'][i]}"/>`).join('')}`),
  garden: artItem(146, 124, 1.4, `${ground(73, 120, 68)}<rect x="30" y="54" width="86" height="66" rx="3" fill="#fdf2f8" ${wO()}/><path d="M20 60 L73 18 L126 60Z" fill="#16a34a" ${wO()}/>${sh('M73 18 L126 60 H73Z')}${[30,40,50].map(y => `<path d="M${73 - (y - 18) * 1.26} ${y} H${73 + (y - 18) * 1.26}" stroke="#15803d" stroke-width="2"/>`).join('')}
    ${win(40, 68, 20, 18, '#fde68a')}${win(86, 68, 20, 18, '#fde68a')}<path d="M62 120 v-28 a11 11 0 0 1 22 0 v28z" fill="#f472b6" ${wO(2.5)}/>
    <path d="M2 120 V96 M14 120 V96 M26 120 V96 M120 120 V96 M132 120 V96 M144 120 V96 M0 104 h30 M118 104 h28" ${wO(2.5)} stroke="#fff"/><path d="M2 120 V96 M14 120 V96 M26 120 V96 M120 120 V96 M132 120 V96 M144 120 V96" stroke="${WI}" stroke-width="1" fill="none"/>
    ${[[10,92,'#f43f5e'],[22,94,'#facc15'],[124,92,'#a855f7'],[138,94,'#f97316']].map(([x,y,c]) => `<g class="wa-bob"><circle cx="${x}" cy="${y}" r="5" fill="${c}" ${wO(1.5)}/><circle cx="${x}" cy="${y}" r="1.8" fill="#fde047"/></g>`).join('')}`),
  hut: artItem(112, 100, 1.1, `${ground(56, 96, 50)}<path d="M18 96 V58 h76 v38z" fill="#d6a76a" ${wO()}/>${[30,46,62,78].map(x => `<path d="M${x} 60 v36" stroke="#a16207" stroke-width="2"/>`).join('')}
    <path d="M4 64 Q56 -12 108 64 q-52 12 -104 0z" fill="#e8c46a" ${wO()}/>${[20,36,52,68,84].map(x => `<path d="M${x} ${62 - Math.sin((x - 4) / 104 * Math.PI) * 40} q-2 14 -4 26" stroke="#b7862d" stroke-width="2" fill="none"/>`).join('')}${sh('M56 2 Q90 20 108 64 q-24 6 -52 6z')}
    <path d="M44 96 v-22 a12 12 0 0 1 24 0 v22z" fill="#5b3a1e" ${wO(2.5)}/>`),
  tent: artItem(116, 96, 1.15, `${ground(58, 92, 54)}<path d="M8 92 L58 18 L108 92Z" fill="#fb923c" ${wO()}/><path d="M58 18 L34 92 M58 18 L82 92" stroke="#fde68a" stroke-width="8"/><path d="M8 92 L58 18 L108 92Z" fill="none" ${wO()}/>${sh('M58 18 L108 92 H58Z')}
    <path d="M58 40 L46 92 h24z" fill="#7c2d12" ${wO(2.5)}/><path d="M58 40 L70 92 h-6 q-2 -26 -6 -52z" fill="#fde68a" ${wO(2)}/>${flag(58, 20, '#22c55e')}`),
  school: artItem(176, 140, 1.65, `${ground(88, 136, 82)}<rect x="10" y="62" width="156" height="74" fill="#dc6a4a" ${wO()}/>${Array.from({ length:5 }, (_, r) => `<path d="M10 ${74 + r * 12} H166" stroke="#b8533a" stroke-width="1.5"/>`).join('')}<path d="M4 66 L88 36 L172 66Z" fill="#7f1d1d" ${wO()}/>
    <rect x="70" y="10" width="36" height="40" fill="#f5e6c8" ${wO()}/><path d="M64 14 L88 -4 L112 14Z" fill="#7f1d1d" ${wO()}/><circle cx="88" cy="30" r="11" fill="#fff" ${wO(2)}/><path d="M88 30 V23 M88 30 l5 3" stroke="${WI}" stroke-width="2"/>
    ${win(20, 78, 22, 20, '#fde68a')}${win(48, 78, 22, 20, '#fde68a')}${win(106, 78, 22, 20, '#fde68a')}${win(134, 78, 22, 20, '#fde68a')}<path d="M76 136 v-30 h24 v30z" fill="#1e3a8a" ${wO(2.5)}/><path d="M88 106 v30" stroke="${WI}" stroke-width="2"/>${flag(160, 64, '#3b82f6')}`),
  hq: artItem(132, 176, 1.3, `${ground(66, 172, 60)}<rect x="22" y="40" width="88" height="132" rx="4" fill="#1e3a8a" ${wO()}/>${sh('M80 40 h30 v132 h-30z')}${Array.from({ length:5 }, (_, r) => [32, 58, 84].map(x => `<rect x="${x}" y="${86 + r * 16}" width="16" height="10" rx="2" fill="#fde68a" class="wa-win" ${wO(1.5)}/>`).join('')).join('')}
    <path d="M66 46 l18 8 v14 q0 14 -18 20 q-18 -6 -18 -20 v-14z" fill="#facc15" ${wO(2.5)}/><path d="M66 56 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#dc2626"/>
    <rect x="58" y="14" width="16" height="26" fill="#64748b" ${wO(2.5)}/><path d="M66 14 V0" ${wO(2.5)}/><circle class="wa-blinklight" cx="66" cy="0" r="4.5" fill="#ef4444" ${wO(1.5)}/>`),
  tower: artItem(76, 176, .8, `${ground(38, 172, 30)}<rect x="14" y="62" width="48" height="110" fill="#a8a29e" ${wO()}/>${Array.from({ length:7 }, (_, r) => `<path d="M14 ${74 + r * 14} H62" stroke="#78716c" stroke-width="1.5"/><path d="M${r % 2 ? 26 : 38} ${62 + r * 14} v14" stroke="#78716c" stroke-width="1.5"/>`).join('')}${sh('M44 62 h18 v110 h-18z')}
    <path d="M6 66 L38 4 L70 66Z" fill="#6d28d9" ${wO()}/>${sh('M38 4 L70 66 H38Z')}${flag(38, 6, '#facc15')}<rect x="28" y="84" width="20" height="26" rx="10" fill="#fde047" class="wa-win" ${wO(2.5)}/><path d="M28 172 v-22 a10 10 0 0 1 20 0 v22z" fill="#5b3a1e" ${wO(2.5)}/>`),
  museum: artItem(176, 128, 1.65, `${ground(88, 124, 82)}<path d="M8 50 L88 10 L168 50Z" fill="#e7e5e4" ${wO()}/><circle cx="88" cy="36" r="8" fill="#facc15" ${wO(2)}/><rect x="10" y="50" width="156" height="12" fill="#d6d3d1" ${wO()}/>
    ${[22,52,82,112,142].map(x => `<rect x="${x}" y="62" width="14" height="50" fill="#f5f5f4" ${wO(2.5)}/><path d="M${x + 4} 64 v46" stroke="#d6d3d1" stroke-width="2"/>`).join('')}<rect x="4" y="112" width="168" height="12" fill="#d6d3d1" ${wO()}/><path d="M74 112 v-30 a14 14 0 0 1 28 0 v30z" fill="#1e293b" ${wO(2.5)}/>`),
  circus: artItem(156, 136, 1.45, `${ground(78, 132, 72)}<path d="M14 132 V74 h128 v58z" fill="#fff" ${wO()}/>${[30,46,62,78,94,110,126].map((x, i) => i % 2 ? '' : `<path d="M${x} 74 h16 v58 h-16z" fill="#ef4444"/>`).join('')}<path d="M14 132 V74 h128 v58z" fill="none" ${wO()}/>
    <path d="M6 78 Q78 -14 150 78 q-72 12 -144 0z" fill="#ef4444" ${wO()}/><path d="M78 6 Q60 40 46 82 M78 6 Q96 40 110 82 M78 6 V86" stroke="#fff" stroke-width="8" fill="none"/><path d="M6 78 Q78 -14 150 78" fill="none" ${wO()}/>
    <path d="M60 132 q18 -40 36 0z" fill="#7f1d1d" ${wO(2.5)}/>${flag(78, 8, '#facc15')}`),
  factory: artItem(176, 134, 1.65, `${ground(88, 130, 82)}<rect x="122" y="14" width="22" height="70" fill="#64748b" ${wO()}/><path d="M122 26 h22 M122 36 h22" stroke="#ef4444" stroke-width="4"/>${smoke(133, 6)}
    <path d="M8 130 V62 l36 -20 v20 l36 -20 v20 l36 -20 v20 h52 v68z" fill="#94a3b8" ${wO()}/>${sh('M116 62 h52 v68 h-52z')}
    <g class="wa-spin"><circle cx="46" cy="94" r="18" fill="#facc15" ${wO(2.5)}/>${Array.from({ length:8 }, (_, i) => `<rect x="43" y="72" width="6" height="8" fill="#facc15" ${wO(2)} transform="rotate(${i * 45} 46 94)"/>`).join('')}<circle cx="46" cy="94" r="6" fill="#64748b" ${wO(2)}/></g>
    <g class="wa-spin r"><circle cx="86" cy="104" r="12" fill="#22d3ee" ${wO(2.5)}/>${Array.from({ length:6 }, (_, i) => `<rect x="83.5" y="88" width="5" height="6" fill="#22d3ee" ${wO(1.8)} transform="rotate(${i * 60} 86 104)"/>`).join('')}<circle cx="86" cy="104" r="4" fill="#64748b"/></g>
    ${win(120, 76, 18, 16, '#fde68a')}${win(144, 76, 18, 16, '#fde68a')}<rect x="126" y="104" width="30" height="26" fill="#475569" ${wO(2.5)}/>`),
  castle: artItem(206, 176, 1.95, `${ground(103, 172, 98)}${[[8,60],[154,60]].map(([x,y]) => `<rect x="${x}" y="${y}" width="44" height="112" fill="#cbd5e1" ${wO()}/><path d="M${x - 4} ${y + 4} L${x + 22} ${y - 38} L${x + 48} ${y + 4}Z" fill="#3b82f6" ${wO()}/>${flag(x + 22, y - 36, '#ef4444')}<rect x="${x + 14}" y="${y + 24}" width="16" height="20" rx="8" fill="#fde68a" class="wa-win" ${wO(2)}/>`).join('')}
    <rect x="44" y="84" width="118" height="88" fill="#e2e8f0" ${wO()}/>${[44,64,84,104,124,144].map(x => `<rect x="${x}" y="72" width="12" height="14" fill="#e2e8f0" ${wO(2.5)}/>`).join('')}${sh('M130 84 h32 v88 h-32z')}
    <rect x="82" y="34" width="42" height="64" fill="#cbd5e1" ${wO()}/><path d="M76 38 L103 -8 L130 38Z" fill="#6d28d9" ${wO()}/>${flag(103, -6, '#facc15')}<rect x="95" y="52" width="16" height="22" rx="8" fill="#fde68a" class="wa-win" ${wO(2)}/>
    <path d="M84 172 v-36 a19 19 0 0 1 38 0 v36z" fill="#5b3a1e" ${wO(2.5)}/><path d="M90 140 v32 M98 134 v38 M106 134 v38 M114 140 v32" stroke="#3b2410" stroke-width="2"/>`),
  ufo: artItem(132, 116, 1.3, `<path class="wa-beam" d="M46 64 L22 116 h88 L86 64z" fill="#a7f3d0" opacity=".45"/><g class="wa-hover"><path d="M40 44 q0 -36 26 -36 q26 0 26 36z" fill="#bae6fd" ${wO()}/>${hi('M48 36 q2 -18 14 -22 q-8 10 -8 24z')}
    <circle cx="66" cy="30" r="9" fill="#4ade80" ${wO(2)}/>${eyes2(63, 69, 29, 1.8)}<ellipse cx="66" cy="54" rx="62" ry="16" fill="#94a3b8" ${wO()}/>${sh('M4 54 q62 22 124 0 q-62 30 -124 0z')}<path d="M10 50 q56 -10 112 0" stroke="#fff" stroke-width="2.5" opacity=".6" fill="none"/>
    ${[22,44,66,88,110].map((x, i) => `<circle class="wa-blinklight ${i % 2 ? 'b' : ''}" cx="${x}" cy="56" r="4.5" fill="${['#facc15','#f472b6','#22d3ee','#f472b6','#facc15'][i]}" ${wO(1.5)}/>`).join('')}</g>`)
};

Object.assign(WORLD_ART, {
  /* ---------- animals (they also wander, from the world screen) ---------- */
  trex: artItem(130, 112, 1.7, `${ground(62, 108, 46)}<path d="M18 70 q-18 -6 -16 -22 q14 10 30 8z" fill="#4ade80" ${wO()}/><path d="M24 72 q4 -30 34 -38 q26 -6 36 -24 q14 -12 28 0 q8 10 0 22 q-4 4 -14 4 q-6 18 -16 30 q-4 22 -22 32 q-28 8 -46 -26z" fill="#4ade80" ${wO()}/>
    ${sh('M58 104 q18 -10 22 -32 q10 -12 16 -30 q-4 26 -14 38 q-6 18 -24 24z')}<path d="M44 70 q12 6 28 2" stroke="#86efac" stroke-width="6" fill="none"/><path d="M50 106 v-14 h12 v14z M70 104 v-14 h10 v14z" fill="#4ade80" ${wO(2.5)}/>
    <path d="M86 50 q8 6 4 12 M80 54 q6 4 2 10" ${wO(2.5)}/>${eyes2(110, 110, 18, 3.4)}<path d="M100 34 l4 4 4 -4 4 4" stroke="#fff" stroke-width="2" fill="none"/><path d="M98 32 q10 4 22 0" stroke="${WI}" stroke-width="2.5" fill="none"/>${[40,52,64].map((x, i) => `<path d="M${x} ${44 - i * 4} l4 -8 4 8" fill="#16a34a" ${wO(1.5)}/>`).join('')}`),
  dino: artItem(156, 112, 2, `${ground(76, 108, 58)}<path d="M8 76 q-8 -4 -4 -10 q22 0 34 -4z" fill="#60a5fa" ${wO()}/><path d="M30 66 q10 -26 50 -24 q22 2 30 -16 q4 -16 4 -18 q4 -8 14 -6 q12 2 12 12 q0 8 -10 8 q-2 20 -10 34 q-10 30 -40 32 q-38 4 -50 -22z" fill="#60a5fa" ${wO()}/>
    ${sh('M70 92 q30 -2 40 -32 q8 -14 10 -34 q-4 32 -14 48 q-10 18 -36 18z')}<path d="M44 106 v-20 h14 v20z M88 106 v-20 h14 v20z" fill="#60a5fa" ${wO(2.5)}/>${[50,62,74,86].map(x => `<circle cx="${x}" cy="56" r="4" fill="#bfdbfe"/>`).join('')}${eyes2(132, 132, 8, 3)}<path d="M136 14 q-6 4 -10 2" stroke="${WI}" stroke-width="2" fill="none"/>`),
  dragon: artItem(144, 124, 1.85, `${ground(70, 120, 46)}<g class="wa-wing"><path d="M58 52 q-30 -40 -56 -30 q16 6 12 16 q12 -4 16 8 q12 -6 18 10z" fill="#c084fc" ${wO()}/></g><g class="wa-wing r"><path d="M84 50 q30 -42 58 -32 q-16 6 -12 16 q-12 -2 -16 8 q-12 -6 -18 10z" fill="#c084fc" ${wO()}/></g>
    <path d="M36 104 q-26 6 -30 -10 q10 4 22 -2z" fill="#7c3aed" ${wO()}/><ellipse cx="70" cy="86" rx="34" ry="28" fill="#8b5cf6" ${wO()}/><ellipse cx="70" cy="94" rx="20" ry="16" fill="#fde68a" ${wO(2)}/>${[86,94,102].map(y => `<path d="M54 ${y} q16 4 32 0" stroke="#f59e0b" stroke-width="1.5" fill="none"/>`).join('')}
    <circle cx="70" cy="42" r="24" fill="#8b5cf6" ${wO()}/><path d="M54 24 l-6 -16 12 10 M86 24 l6 -16 -12 10" fill="#fde68a" ${wO(2)}/>${eyes2(62, 78, 40, 3.4)}<ellipse cx="70" cy="54" rx="10" ry="6" fill="#a78bfa" ${wO(2)}/><circle cx="66" cy="54" r="1.5" fill="${WI}"/><circle cx="74" cy="54" r="1.5" fill="${WI}"/>
    <path d="M50 114 v-10 h12 v10z M80 114 v-10 h12 v10z" fill="#7c3aed" ${wO(2.5)}/>`),
  unicorn: artItem(124, 116, 1.6, `${ground(60, 112, 48)}<path d="M14 66 q-12 10 -6 28 q8 -12 16 -14 q-6 18 4 26 q2 -16 10 -20z" fill="#f472b6" ${wO(2.5)}/><path d="M22 60 q2 -16 26 -18 h34 q20 0 22 18 q0 22 -22 24 h-36 q-24 -2 -24 -24z" fill="#fff" ${wO()}/>
    ${[32,48,76,92].map(x => `<rect x="${x - 5}" y="80" width="11" height="30" rx="4" fill="#fff" ${wO(2.5)}/><rect x="${x - 5}" y="104" width="11" height="6" fill="#c4b5fd" ${wO(2)}/>`).join('')}${sh('M60 84 h22 q22 -2 22 -24 q-10 18 -44 20z')}
    <path d="M84 46 q4 -26 20 -30 q16 -2 18 14 q2 12 -10 16 q-12 4 -18 18z" fill="#fff" ${wO()}/><path d="M108 16 l8 -18 2 20z" fill="#facc15" ${wO(2)}/><path d="M110 12 l6 -2 M111 6 l5 -2" stroke="#f59e0b" stroke-width="1.5"/>
    <path d="M98 18 q-14 4 -14 22 q-6 -6 -4 -14 q-8 6 -8 16 q-4 -14 6 -26 q8 -6 20 2z" fill="#a78bfa" ${wO(2)}/><path d="M92 22 q-6 8 -6 18" stroke="#60a5fa" stroke-width="4" fill="none"/>${eyes2(110, 110, 26, 3)}<circle cx="116" cy="34" r="3" fill="#f9a8d4"/>`),
  dolphin: artItem(124, 84, 1.55, `<g class="wa-jump"><path d="M8 58 q20 -48 76 -44 q24 2 34 18 q-14 -2 -22 4 q-10 22 -36 28 q-20 4 -36 -2 q-8 10 -18 10 q4 -8 2 -14z" fill="#38bdf8" ${wO()}/><path d="M14 60 q30 6 60 -6 q16 -6 22 -18" stroke="#e0f2fe" stroke-width="8" fill="none" opacity=".8"/>
    <path d="M56 16 q4 -14 18 -14 q-6 8 -4 16z" fill="#0ea5e9" ${wO(2.5)}/><path d="M52 52 q8 14 20 8 q-8 -2 -12 -12z" fill="#0ea5e9" ${wO(2)}/>${eyes2(92, 92, 26, 3)}<path d="M108 34 q-6 4 -14 2" stroke="${WI}" stroke-width="2" fill="none"/></g>
    <path class="wa-splash" d="M2 82 q10 -12 16 -2 q6 -12 14 0" stroke="#7dd3fc" stroke-width="3" fill="none"/>`),
  butterfly: artItem(76, 64, .95, `<g class="wa-hover"><g class="wa-flap"><path d="M38 30 q-30 -40 -34 -10 q-2 18 34 14z" fill="#f472b6" ${wO(2.5)}/><path d="M38 34 q-26 4 -24 22 q10 8 24 -18z" fill="#c084fc" ${wO(2.5)}/><circle cx="18" cy="20" r="5" fill="#fde68a"/></g>
    <g class="wa-flap r"><path d="M38 30 q30 -40 34 -10 q2 18 -34 14z" fill="#f472b6" ${wO(2.5)}/><path d="M38 34 q26 4 24 22 q-10 8 -24 -18z" fill="#c084fc" ${wO(2.5)}/><circle cx="58" cy="20" r="5" fill="#fde68a"/></g>
    <ellipse cx="38" cy="36" rx="4" ry="16" fill="#3b2a35"/><path d="M36 22 q-6 -12 -10 -14 M40 22 q6 -12 10 -14" ${wO(2)}/></g>`),
  bee: artItem(66, 54, .8, `<g class="wa-hover"><g class="wa-buzz"><ellipse cx="26" cy="12" rx="10" ry="12" fill="#e0f2fe" ${wO(2)} opacity=".9"/><ellipse cx="40" cy="12" rx="10" ry="12" fill="#e0f2fe" ${wO(2)} opacity=".9"/></g>
    <ellipse cx="32" cy="34" rx="24" ry="16" fill="#facc15" ${wO()}/><path d="M24 20 q-4 14 0 28 M36 18 q-4 16 0 32" stroke="${WI}" stroke-width="5" fill="none"/><path d="M56 34 l8 0" ${wO(2.5)}/>${eyes2(14, 14, 30, 2.8)}<path d="M10 40 q4 3 8 0" stroke="${WI}" stroke-width="1.8" fill="none"/></g>`),
  ladybug: artItem(66, 50, .8, `${ground(33, 46, 24)}<circle cx="12" cy="30" r="10" fill="${WI}"/>${eyes2(8, 14, 28, 2)}<path d="M8 22 l-4 -10 M14 22 l2 -10" ${wO(2)}/><path d="M14 44 q0 -38 26 -38 q24 0 24 38z" fill="#ef4444" ${wO()}/><path d="M40 6 v38" stroke="${WI}" stroke-width="2.5"/>
    ${[[28,20],[52,20],[26,34],[54,34],[40,16]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${WI}"/>`).join('')}${hi('M22 14 q8 -8 14 -6 q-8 4 -14 10z')}`),
  parrot: artItem(76, 100, 1.05, `${ground(40, 96, 22)}<path d="M30 94 q-8 -10 -2 -16 M44 94 q8 -10 2 -16" ${wO(2.5)}/><path d="M26 60 q-4 34 6 40 q6 -14 8 -2 q4 -12 8 4 q8 -10 2 -42z" fill="#2563eb" ${wO()}/>
    <ellipse cx="38" cy="54" rx="20" ry="26" fill="#ef4444" ${wO()}/><path class="wa-flap" d="M48 44 q18 4 18 28 q-12 -4 -18 -8z" fill="#facc15" ${wO(2.5)}/><path d="M48 52 q10 4 12 16" stroke="#22c55e" stroke-width="4" fill="none"/>
    <circle cx="36" cy="26" r="16" fill="#ef4444" ${wO()}/><path d="M22 24 q-14 2 -12 14 q6 -6 12 -6z" fill="#fde68a" ${wO(2.5)}/><circle cx="30" cy="22" r="6" fill="#fff" ${wO(2)}/><g class="wa-blink"><circle cx="30" cy="22" r="2.6" fill="${WI}"/></g>`),
  penguin: artItem(66, 86, .95, `${ground(33, 82, 22)}<g class="wa-waddle"><ellipse cx="33" cy="48" rx="24" ry="32" fill="#1f2937" ${wO()}/><ellipse cx="33" cy="54" rx="16" ry="24" fill="#fff"/><path class="wa-flap" d="M10 44 q-10 14 -2 26 q6 -12 4 -22z" fill="#1f2937" ${wO(2.5)}/><path class="wa-flap r" d="M56 44 q10 14 2 26 q-6 -12 -4 -22z" fill="#1f2937" ${wO(2.5)}/>
    ${eyes2(26, 40, 32, 3)}<path d="M28 40 l5 6 5 -6z" fill="#f97316" ${wO(1.5)}/><path d="M20 80 q4 -6 10 0z M36 80 q4 -6 10 0z" fill="#f97316" ${wO(2)}/><circle cx="21" cy="42" r="3" fill="#f9a8d4" opacity=".8"/><circle cx="45" cy="42" r="3" fill="#f9a8d4" opacity=".8"/></g>`),
  panda: artItem(96, 94, 1.25, `${ground(48, 90, 34)}<ellipse cx="48" cy="66" rx="30" ry="24" fill="#fff" ${wO()}/><path d="M22 70 q-8 14 6 18 h12 v-14z M74 70 q8 14 -6 18 h-12 v-14z" fill="${WI}"/><path d="M26 50 q22 -10 44 0 v14 q-22 -6 -44 0z" fill="${WI}"/>
    <circle cx="20" cy="18" r="11" fill="${WI}"/><circle cx="76" cy="18" r="11" fill="${WI}"/><circle cx="48" cy="34" r="28" fill="#fff" ${wO()}/><ellipse cx="36" cy="34" rx="8" ry="10" fill="${WI}" transform="rotate(-20 36 34)"/><ellipse cx="60" cy="34" rx="8" ry="10" fill="${WI}" transform="rotate(20 60 34)"/>
    <g class="wa-blink"><circle cx="37" cy="33" r="3" fill="#fff"/><circle cx="59" cy="33" r="3" fill="#fff"/></g><ellipse cx="48" cy="44" rx="5" ry="3.5" fill="${WI}"/><path d="M42 50 q6 5 12 0" stroke="${WI}" stroke-width="2" fill="none"/><path d="M60 62 l18 -18 l4 4 -16 18z" fill="#4ade80" ${wO(2)}/>`),
  lion: artItem(116, 102, 1.55, `${ground(58, 98, 46)}<path d="M96 66 q20 -4 16 -20 q-6 4 -10 0" ${wO(3)} stroke="#d97706"/><circle cx="110" cy="44" r="5" fill="#92400e"/><ellipse cx="66" cy="70" rx="34" ry="20" fill="#fbbf24" ${wO()}/>
    ${[44,58,76,90].map(x => `<rect x="${x - 5}" y="80" width="11" height="16" rx="4" fill="#fbbf24" ${wO(2.5)}/>`).join('')}<g class="wa-bob">${Array.from({ length:12 }, (_, i) => `<ellipse cx="38" cy="22" rx="9" ry="14" fill="${i % 2 ? '#c2410c' : '#ea580c'}" ${wO(2)} transform="rotate(${i * 30} 38 42)"/>`).join('')}
    <circle cx="38" cy="42" r="22" fill="#fcd34d" ${wO()}/>${eyes2(30, 46, 38, 3)}<path d="M34 46 h8 l-4 5z" fill="${WI}"/><path d="M32 52 q6 5 12 0" stroke="${WI}" stroke-width="2" fill="none"/><circle cx="24" cy="48" r="3.5" fill="#fb923c" opacity=".6"/><circle cx="52" cy="48" r="3.5" fill="#fb923c" opacity=".6"/></g>`),
  elephant: artItem(136, 112, 1.75, `${ground(70, 108, 54)}<path d="M120 58 q14 6 10 18" ${wO(3)} stroke="#64748b"/><ellipse cx="78" cy="58" rx="46" ry="34" fill="#94a3b8" ${wO()}/>${sh('M78 92 q44 0 46 -34 q-6 26 -46 30z')}
    ${[50,70,96,114].map(x => `<rect x="${x - 8}" y="78" width="16" height="28" rx="5" fill="#94a3b8" ${wO(2.5)}/>`).join('')}<path d="M34 34 q-30 -10 -28 18 q2 22 22 18z" fill="#cbd5e1" ${wO()}/>
    <circle cx="40" cy="42" r="22" fill="#94a3b8" ${wO()}/><path class="wa-trunk" d="M24 50 q-8 20 -2 34 q4 6 8 0 q-4 -16 6 -28z" fill="#94a3b8" ${wO()}/><path d="M28 60 l-6 6 M28 70 l-6 3" stroke="#64748b" stroke-width="1.5"/>${eyes2(34, 50, 36, 3)}<path d="M50 52 q8 4 6 12 l-4 -2z" fill="#fff" ${wO(1.8)}/>`),
  giraffe: artItem(96, 156, 1.35, `${ground(46, 152, 34)}<path d="M76 92 q14 0 12 18" ${wO(2.5)} stroke="#b45309"/><ellipse cx="50" cy="96" rx="32" ry="20" fill="#fcd34d" ${wO()}/>${[24,40,62,76].map(x => `<rect x="${x - 5}" y="104" width="10" height="46" rx="4" fill="#fcd34d" ${wO(2.5)}/>`).join('')}
    <path d="M22 92 q-6 -40 2 -66 l18 0 q-4 30 6 64z" fill="#fcd34d" ${wO()}/>${[[30,40],[34,62],[28,80],[44,96],[60,90],[70,100],[28,108]].map(([x,y]) => `<path d="M${x} ${y} q5 -4 9 0 q2 6 -4 8 q-7 0 -5 -8z" fill="#c2410c"/>`).join('')}
    <ellipse cx="34" cy="16" rx="18" ry="13" fill="#fcd34d" ${wO()}/><path d="M24 6 v-8 M38 4 v-8" ${wO(2.5)}/><circle cx="24" cy="-3" r="3.5" fill="#92400e"/><circle cx="38" cy="-5" r="3.5" fill="#92400e"/>${eyes2(28, 40, 14, 2.6)}<ellipse cx="16" cy="20" rx="5" ry="4" fill="#fde68a" ${wO(1.5)}/>`),

  /* ---------- rides ---------- */
  rocket: artItem(78, 160, .95, `<g class="wa-hover"><path class="wa-flame" d="M26 128 q13 40 26 0z" fill="#f97316"/><path class="wa-flame b" d="M32 128 q7 24 14 0z" fill="#fde047"/>
    <path d="M14 104 l-12 26 h20z M64 104 l12 26 h-20z" fill="#ef4444" ${wO()}/><path d="M39 4 q28 30 24 100 q-2 22 -6 26 h-36 q-4 -4 -6 -26 q-4 -70 24 -100z" fill="#f1f5f9" ${wO()}/>${sh('M39 4 q28 30 24 100 q-2 22 -6 26 h-18z')}
    <path d="M39 4 q14 14 20 34 h-40 q6 -20 20 -34z" fill="#ef4444" ${wO()}/><circle cx="39" cy="64" r="12" fill="#7dd3fc" ${wO()}/><path d="M33 60 q4 -6 10 -4" stroke="#fff" stroke-width="3" fill="none"/><rect x="31" y="98" width="16" height="22" rx="4" fill="#ef4444" ${wO(2)}/></g>`),
  jet: artItem(170, 74, 2, `<g class="wa-hover"><path d="M8 40 q2 -14 30 -14 h90 q30 0 38 14 q-8 12 -38 12 h-90 q-28 0 -30 -12z" fill="#f8fafc" ${wO()}/>${sh('M8 40 q2 12 30 12 h90 q30 0 38 -12z')}<path d="M20 28 l-12 -24 h16 l24 22z" fill="#3b82f6" ${wO()}/>
    <path d="M70 46 l-20 26 h20 l34 -24z" fill="#3b82f6" ${wO()}/>${[64,80,96,112].map(x => `<circle cx="${x}" cy="36" r="4.5" fill="#7dd3fc" ${wO(1.5)}/>`).join('')}<path d="M140 30 q14 2 22 10 h-18z" fill="#7dd3fc" ${wO(2)}/><path d="M38 34 h96" stroke="#ef4444" stroke-width="3"/></g>`),
  heli: artItem(156, 96, 1.85, `<g class="wa-hover"><g class="wa-rotor"><path d="M10 10 h136" stroke="${WI}" stroke-width="5" stroke-linecap="round"/></g><path d="M78 10 v12" ${wO(3)}/>
    <path d="M30 52 q0 -32 42 -32 q38 0 42 30 q2 26 -36 30 h-26 q-22 0 -22 -28z" fill="#f59e0b" ${wO()}/>${sh('M72 82 h6 q38 -4 36 -32 q-4 22 -42 24z')}<path d="M80 30 q26 2 30 22 h-30z" fill="#7dd3fc" ${wO(2.5)}/><path d="M86 34 q10 2 14 10" stroke="#fff" stroke-width="3" fill="none"/>
    <path d="M30 50 h-26 l-4 -12 h6 l6 8 h18" fill="#f59e0b" ${wO(2.5)}/><g class="wa-rotor small"><path d="M4 30 v20" stroke="${WI}" stroke-width="4" stroke-linecap="round"/></g><path d="M44 86 v8 M96 84 v10 M32 94 h76" ${wO(3)}/></g>`),
  car: artItem(136, 72, 1.65, `${ground(68, 68, 60)}<path d="M8 50 q0 -16 18 -18 l18 -20 h44 l22 20 q20 2 20 18 v8 h-122z" fill="#ef4444" ${wO()}/>${sh('M8 50 h122 v8 h-122z')}<path d="M48 16 h18 v18 h-34z M72 16 h14 l18 18 h-32z" fill="#bae6fd" ${wO(2.5)}/><path d="M52 18 l-8 14" stroke="#fff" stroke-width="3" opacity=".6"/>
    ${[36,102].map(x => `<g class="wa-wheel"><circle cx="${x}" cy="58" r="12" fill="${WI}"/><circle cx="${x}" cy="58" r="5" fill="#cbd5e1"/><path d="M${x} 50 v16" stroke="#94a3b8" stroke-width="2"/></g>`).join('')}<rect x="122" y="42" width="8" height="5" rx="2" fill="#fde047"/>`),
  racecar: artItem(156, 64, 1.85, `${ground(78, 60, 70)}<path d="M4 46 l8 -18 h28 l14 -12 h34 l20 14 h36 q8 0 10 8 v10 h-150z" fill="#2563eb" ${wO()}/><path d="M4 30 h-2 v-14 h18 v12" fill="#2563eb" ${wO(2.5)}/><path d="M60 18 h24 l12 10 h-44z" fill="#bae6fd" ${wO(2)}/>
    <circle cx="74" cy="38" r="8" fill="#fff" ${wO(2)}/><text x="74" y="42" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="11" fill="${WI}">7</text><path d="M20 40 h40 M96 40 h40" stroke="#facc15" stroke-width="4"/>
    ${[32,122].map(x => `<g class="wa-wheel"><circle cx="${x}" cy="50" r="12" fill="${WI}"/><circle cx="${x}" cy="50" r="5" fill="#facc15"/></g>`).join('')}`),
  train: artItem(226, 96, 2.7, `${ground(113, 92, 104)}<rect x="12" y="38" width="62" height="40" rx="4" fill="#ef4444" ${wO()}/><rect x="74" y="20" width="48" height="58" rx="4" fill="#ef4444" ${wO()}/><rect x="70" y="12" width="56" height="12" rx="3" fill="${WI}"/>${win(84, 30, 28, 20, '#fde68a')}
    <rect x="24" y="16" width="14" height="24" fill="${WI}"/><path d="M20 16 h22 l-4 -8 h-14z" fill="${WI}"/>${smoke(31, 2)}<path d="M2 78 l10 -16 v16z" fill="#facc15" ${wO(2)}/><circle cx="16" cy="54" r="6" fill="#fde047" ${wO(2)}/>
    <rect x="132" y="34" width="86" height="44" rx="4" fill="#22c55e" ${wO()}/>${win(142, 44, 20, 16, '#fde68a')}${win(168, 44, 20, 16, '#fde68a')}${win(194, 44, 16, 16, '#fde68a')}<path d="M122 66 h10" ${wO(3)}/>
    ${[30,58,98,150,200].map(x => `<g class="wa-wheel"><circle cx="${x}" cy="80" r="10" fill="${WI}"/><circle cx="${x}" cy="80" r="4" fill="#cbd5e1"/></g>`).join('')}`),
  ship: artItem(206, 136, 2.4, `<g class="wa-rock"><rect x="78" y="34" width="22" height="40" fill="#ef4444" ${wO()}/><path d="M78 42 h22" stroke="#fff" stroke-width="5"/>${smoke(89, 26)}<rect x="110" y="44" width="22" height="30" fill="#ef4444" ${wO()}/><path d="M110 52 h22" stroke="#fff" stroke-width="5"/>
    <rect x="40" y="66" width="130" height="30" rx="3" fill="#f8fafc" ${wO()}/>${[54,72,90,108,126,144].map(x => `<circle cx="${x}" cy="80" r="4.5" fill="#7dd3fc" ${wO(1.5)}/>`).join('')}<path d="M6 92 h196 l-20 32 h-158z" fill="#1e3a8a" ${wO()}/><path d="M14 100 h180" stroke="#ef4444" stroke-width="5"/></g>
    <path class="wa-wave" d="M0 130 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" stroke="#38bdf8" stroke-width="4" fill="none"/>`),
  sailboat: artItem(116, 126, 1.35, `<g class="wa-rock"><path d="M58 8 v86" ${wO(3.5)}/><path d="M62 12 q40 34 42 76 h-42z" fill="#fff" ${wO()}/>${sh('M62 60 q20 6 42 28 h-42z')}<path d="M54 20 q-30 30 -38 68 h38z" fill="#fde68a" ${wO()}/>${flag(58, 10, '#ef4444')}
    <path d="M6 92 h104 q-6 24 -22 26 h-62 q-16 -2 -20 -26z" fill="#b45309" ${wO()}/><path d="M12 100 h92" stroke="#fde68a" stroke-width="3"/></g><path class="wa-wave" d="M-4 122 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0" stroke="#38bdf8" stroke-width="4" fill="none"/>`),
  firetruck: artItem(176, 96, 2.1, `${ground(88, 92, 80)}<rect x="8" y="34" width="112" height="44" rx="4" fill="#dc2626" ${wO()}/><path d="M120 34 h26 l22 24 v20 h-48z" fill="#dc2626" ${wO()}/><path d="M126 40 h16 l16 18 h-32z" fill="#bae6fd" ${wO(2.5)}/>
    <path d="M14 26 h100 M14 18 h100 M20 18 v8 M40 18 v8 M60 18 v8 M80 18 v8 M100 18 v8" ${wO(2.5)} stroke="#e5e7eb"/><rect x="128" y="24" width="18" height="10" rx="3" class="wa-siren" fill="#3b82f6" ${wO(2)}/>
    <path d="M18 48 h92" stroke="#facc15" stroke-width="5"/><rect x="24" y="56" width="22" height="16" rx="2" fill="#fde68a" ${wO(2)}/>${[34,104,148].map(x => `<g class="wa-wheel"><circle cx="${x}" cy="80" r="12" fill="${WI}"/><circle cx="${x}" cy="80" r="5" fill="#cbd5e1"/></g>`).join('')}`),
  scooter: artItem(84, 84, 1, `${ground(42, 80, 34)}<path d="M18 70 h44 l8 -6" ${wO(5)} stroke="#06b6d4"/><path d="M66 66 l-10 -56" ${wO(4)}/><path d="M48 10 h18" ${wO(5)} stroke="#f472b6"/>${[18,68].map(x => `<g class="wa-wheel"><circle cx="${x}" cy="72" r="9" fill="${WI}"/><circle cx="${x}" cy="72" r="3.5" fill="#f472b6"/></g>`).join('')}`)
});

Object.assign(WORLD_ART, {
  /* ---------- fun ---------- */
  ferris: artItem(156, 176, 2.2, `${ground(78, 172, 64)}<path d="M78 80 L30 172 M78 80 L126 172 M44 146 h68" ${wO(5)} stroke="#64748b"/><path d="M78 80 L30 172 M78 80 L126 172" fill="none" ${wO(2)}/>
    <g class="wa-spin slow"><circle cx="78" cy="80" r="66" fill="none" stroke="#ec4899" stroke-width="6"/><circle cx="78" cy="80" r="66" fill="none" ${wO(2)}/><circle cx="78" cy="80" r="40" fill="none" stroke="#f9a8d4" stroke-width="3"/>
    ${Array.from({ length:8 }, (_, i) => { const a = i * Math.PI / 4, x = 78 + Math.cos(a) * 66, y = 80 + Math.sin(a) * 66; return `<path d="M78 80 L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#94a3b8" stroke-width="2.5"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#fde047"/>`; }).join('')}
    ${Array.from({ length:8 }, (_, i) => { const a = i * Math.PI / 4, x = 78 + Math.cos(a) * 66, y = 80 + Math.sin(a) * 66; return `<g class="wa-gondola" style="transform-origin:${x.toFixed(1)}px ${y.toFixed(1)}px"><path d="M${(x - 9).toFixed(1)} ${(y + 4).toFixed(1)} h18 l-2 12 h-14z" fill="${['#ef4444','#3b82f6','#22c55e','#f59e0b'][i % 4]}" ${wO(2)}/></g>`; }).join('')}</g>
    <circle cx="78" cy="80" r="8" fill="#facc15" ${wO(2.5)}/>`),
  coaster: artItem(226, 136, 2.9, `${ground(113, 132, 106)}${[30,62,94,126,158,190].map(x => `<path d="M${x} 132 V${x < 110 ? 132 - (110 - Math.abs(x - 70)) * .9 : 70}" stroke="#94a3b8" stroke-width="5"/>`).join('')}
    <path d="M4 120 Q40 120 60 40 Q74 0 90 40 Q104 90 130 70 Q160 30 180 70 Q196 104 222 104" fill="none" stroke="#ef4444" stroke-width="8"/><path d="M4 120 Q40 120 60 40 Q74 0 90 40 Q104 90 130 70 Q160 30 180 70 Q196 104 222 104" fill="none" ${wO(2)}/>
    <g class="wa-coaster"><rect x="-14" y="-12" width="28" height="14" rx="4" fill="#facc15" ${wO(2.5)}/><circle cx="-6" cy="-14" r="4" fill="#fcd34d" ${wO(1.5)}/><circle cx="6" cy="-14" r="4" fill="#fcd34d" ${wO(1.5)}/></g>`),
  carousel: artItem(156, 144, 2.1, `${ground(78, 140, 70)}<ellipse cx="78" cy="128" rx="70" ry="12" fill="#a855f7" ${wO()}/><rect x="74" y="34" width="8" height="94" fill="#facc15" ${wO(2)}/>
    ${[22,54,102,134].map((x, i) => `<path d="M${x} 40 V120" stroke="#fde68a" stroke-width="3"/><g class="wa-carousel ${i % 2 ? 'b' : ''}"><path d="M${x - 14} 96 q2 -14 14 -14 q8 0 14 -6 l4 4 q-4 8 -2 16 q-14 6 -30 0z" fill="${['#fff','#f9a8d4','#bae6fd','#fde68a'][i]}" ${wO(2.5)}/><path d="M${x + 12} 78 q4 -4 6 0" stroke="#f472b6" stroke-width="3" fill="none"/></g>`).join('')}
    <path d="M6 44 Q78 -10 150 44 q-72 10 -144 0z" fill="#ec4899" ${wO()}/>${[30,54,78,102,126].map((x, i) => `<path d="M${x} ${44 - (i === 2 ? 36 : i % 2 ? 26 : 12)} L${x - 12} 46 h24z" fill="#fff" opacity=".5"/>`).join('')}<path d="M6 44 Q78 -10 150 44" fill="none" ${wO()}/>
    ${[14,34,54,78,102,122,142].map((x, i) => `<path d="M${x - 10} 44 q10 12 20 0" fill="${i % 2 ? '#fde68a' : '#f9a8d4'}" ${wO(2)}/>`).join('')}${flag(78, 10, '#22c55e')}`),
  slide: artItem(136, 116, 1.8, `${ground(68, 112, 62)}<path d="M18 112 V30 M42 112 V30" ${wO(4)} stroke="#3b82f6"/><path d="M18 112 V30 M42 112 V30" fill="none" ${wO(1.5)}/>${[50,70,90].map(y => `<path d="M18 ${y} h24" ${wO(3)}/>`).join('')}<rect x="10" y="22" width="40" height="10" rx="3" fill="#facc15" ${wO(2.5)}/>
    <path d="M44 28 q30 6 50 50 q14 30 38 32 l-4 8 q-30 -2 -44 -36 q-16 -38 -40 -44z" fill="#ef4444" ${wO()}/>${hi('M52 32 q24 8 38 40 q-18 -24 -38 -36z')}`),
  fountain: artItem(136, 106, 1.8, `${ground(68, 102, 64)}<ellipse cx="68" cy="88" rx="62" ry="16" fill="#cbd5e1" ${wO()}/><ellipse cx="68" cy="84" rx="52" ry="10" fill="#38bdf8"/><path class="wa-ripple" d="M30 84 q38 8 76 0" stroke="#e0f2fe" stroke-width="3" fill="none"/>
    <rect x="62" y="46" width="12" height="38" fill="#e2e8f0" ${wO(2.5)}/><ellipse cx="68" cy="48" rx="28" ry="8" fill="#e2e8f0" ${wO()}/><ellipse cx="68" cy="46" rx="22" ry="5" fill="#7dd3fc"/>
    <g class="wa-water"><path d="M68 44 q-4 -30 0 -40 q4 10 0 40z" fill="#bae6fd"/><path d="M66 10 q-26 6 -30 36 M70 10 q26 6 30 36" stroke="#7dd3fc" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M42 48 q-14 8 -20 34 M94 48 q14 8 20 34" stroke="#bae6fd" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>`),
  balloons: artItem(70, 120, .95, `<g class="wa-bob"><path d="M20 52 q8 30 16 68 M50 48 q-8 34 -14 72 M36 40 v80" stroke="#64748b" stroke-width="1.5" fill="none"/>
    ${[[20,30,'#ef4444'],[50,26,'#3b82f6'],[36,16,'#facc15']].map(([x,y,c]) => `<ellipse cx="${x}" cy="${y}" rx="15" ry="18" fill="${c}" ${wO(2.5)}/><path d="M${x - 3} ${y + 18} h6 l-3 4z" fill="${c}" ${wO(1.5)}/>${hi(`M${x - 9} ${y - 6} q2 -8 9 -9 q-6 4 -7 11z`)}`).join('')}</g>`),
  campfire: artItem(84, 76, 1.1, `${ground(42, 72, 38)}<path d="M8 70 l68 -14 M8 56 l68 14" ${wO(8)} stroke="#8b5a2b"/><path d="M8 70 l68 -14 M8 56 l68 14" fill="none" ${wO(2)}/>${[[10,62],[30,72],[54,72],[74,62]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#78716c" ${wO(2)}/>`).join('')}
    <g class="wa-flame"><path d="M42 4 q24 22 16 46 q-4 10 -16 10 q-12 0 -16 -10 q-8 -24 16 -46z" fill="#f97316" ${wO(2.5)}/></g><g class="wa-flame b"><path d="M42 22 q14 14 8 28 q-3 6 -8 6 q-5 0 -8 -6 q-6 -14 8 -28z" fill="#fde047"/></g>
    <circle class="wa-ember" cx="34" cy="10" r="2" fill="#fde047"/><circle class="wa-ember b" cx="52" cy="6" r="1.8" fill="#fb923c"/>`),
  kite: artItem(80, 116, 1.05, `<g class="wa-kite"><path d="M40 2 L72 34 L40 74 L8 34Z" fill="#f43f5e" ${wO()}/><path d="M40 2 L40 74 M8 34 H72" stroke="${WI}" stroke-width="2"/><path d="M40 2 L72 34 L40 34Z" fill="#facc15"/><path d="M8 34 L40 74 L40 34Z" fill="#3b82f6"/><path d="M40 2 L72 34 L40 74 L8 34Z" fill="none" ${wO()}/>
    <path d="M40 74 q-10 10 0 18 q10 8 0 18" stroke="${WI}" stroke-width="2" fill="none"/>${[84,98,110].map((y, i) => `<path d="M${40 + (i % 2 ? 4 : -4)} ${y} l-6 -4 v8z M${40 + (i % 2 ? 4 : -4)} ${y} l6 -4 v8z" fill="${['#facc15','#22c55e','#f472b6'][i]}" ${wO(1.5)}/>`).join('')}</g>`),
  ball: artItem(52, 52, .65, `<g class="wa-bounce"><circle cx="26" cy="26" r="22" fill="#fff" ${wO()}/><path d="M26 16 l9 7 -3 11 h-12 l-3 -11z" fill="${WI}"/><path d="M26 16 V4 M35 23 l11 -3 M32 34 l7 9 M20 34 l-7 9 M17 23 l-11 -3" stroke="${WI}" stroke-width="2"/>${hi('M10 18 q6 -10 16 -12 q-10 6 -14 14z')}</g>`),
  target: artItem(76, 100, 1, `${ground(38, 96, 30)}<path d="M22 96 l10 -30 M54 96 l-10 -30" ${wO(4)} stroke="#8b5a2b"/>${[34,26,18,10].map((r, i) => `<circle cx="38" cy="36" r="${r}" fill="${i % 2 ? '#fff' : '#ef4444'}" ${wO(2.2)}/>`).join('')}<path d="M38 36 l26 -24" ${wO(3)}/><path d="M60 8 l10 -4 -4 10z" fill="#facc15" ${wO(1.5)}/>`),
  trophy: artItem(70, 92, .95, `${ground(35, 90, 24)}<g class="wa-glow"><path d="M18 8 h34 v22 q0 22 -17 26 q-17 -4 -17 -26z" fill="#facc15" ${wO()}/><path d="M18 14 q-14 0 -12 12 q2 12 14 12 M52 14 q14 0 12 12 q-2 12 -14 12" fill="none" ${wO(3)}/>
    <rect x="29" y="56" width="12" height="14" fill="#f59e0b" ${wO(2)}/><rect x="18" y="70" width="34" height="14" rx="3" fill="#7c4a1e" ${wO(2.5)}/>${hi('M24 12 h8 v16 q0 10 -4 16 q-4 -10 -4 -32z')}<path d="M35 22 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" fill="#fff"/></g>${sparkle(60, 10, .7)}`),
  present: artItem(70, 72, .9, `${ground(35, 70, 30)}<rect x="8" y="30" width="54" height="38" rx="3" fill="#a855f7" ${wO()}/><rect x="4" y="20" width="62" height="14" rx="3" fill="#c084fc" ${wO()}/><path d="M32 20 v48 h6 v-48z" fill="#facc15" ${wO(2)}/>
    <g class="wa-bob"><path d="M35 20 q-24 -18 -18 -2 q4 6 18 2z M35 20 q24 -18 18 -2 q-4 6 -18 2z" fill="#facc15" ${wO(2.5)}/></g>${hi('M10 32 h20 v6 h-20z')}`),
  cupcake: artItem(56, 66, .75, `${ground(28, 64, 18)}<path d="M10 36 h36 l-5 28 h-26z" fill="#f9a8d4" ${wO()}/>${[18,26,34,42].map(x => `<path d="M${x - 2} 36 l2 28" stroke="#ec4899" stroke-width="2"/>`).join('')}<path d="M6 38 q-2 -16 10 -18 q2 -14 14 -12 q12 -4 16 8 q12 2 8 22z" fill="#fef3c7" ${wO()}/>
    ${[[18,24,'#ef4444'],[30,18,'#3b82f6'],[40,28,'#22c55e'],[24,32,'#facc15']].map(([x,y,c]) => `<rect x="${x}" y="${y}" width="5" height="2.4" rx="1" fill="${c}" transform="rotate(${x * 7} ${x} ${y})"/>`).join('')}<circle cx="30" cy="6" r="6" fill="#dc2626" ${wO(2)}/>`),
  treasure: artItem(96, 80, 1.25, `${ground(48, 76, 44)}<g class="wa-glow"><path d="M14 30 q34 -18 68 0" fill="none"/><ellipse cx="48" cy="34" rx="32" ry="10" fill="#fde047" opacity=".9"/>${sparkle(30, 20, .8)}${sparkle(62, 14, 1)}${sparkle(48, 6, .6)}</g>
    <path d="M10 34 q0 -26 38 -28 q38 2 38 28z" fill="#a16207" ${wO()}/><path d="M10 34 h76 v38 h-76z" fill="#b45309" ${wO()}/><path d="M10 44 h76 M10 62 h76" stroke="#facc15" stroke-width="4"/><path d="M10 34 h76 v38 h-76z" fill="none" ${wO()}/>
    <rect x="40" y="40" width="16" height="18" rx="3" fill="#facc15" ${wO(2)}/><circle cx="48" cy="48" r="3" fill="${WI}"/>${[[22,28],[34,24],[58,26],[70,30]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#facc15" ${wO(1.5)}/>`).join('')}`),

  /* ---------- legendary ---------- */
  lg_dragon: artItem(190, 140, 2.6, `<g class="wa-hover"><g class="wa-wing"><path d="M80 60 q-34 -60 -78 -46 q22 10 16 24 q18 -6 22 12 q18 -8 26 14z" fill="#fbbf24" ${wO()}/>${hi('M10 18 q30 -6 56 30 q-24 -20 -56 -30z')}</g><g class="wa-wing r"><path d="M110 56 q34 -60 78 -46 q-22 10 -16 24 q-18 -6 -22 12 q-18 -8 -26 14z" fill="#fbbf24" ${wO()}/></g>
    <path d="M40 100 q-30 0 -36 20 q20 -6 30 4 q4 -14 22 -12z" fill="#f59e0b" ${wO()}/><ellipse cx="94" cy="92" rx="48" ry="30" fill="#f59e0b" ${wO()}/><ellipse cx="94" cy="100" rx="30" ry="16" fill="#fef3c7" ${wO(2)}/>${sh('M94 122 q46 -2 48 -30 q-8 22 -48 24z')}
    <path d="M130 70 q14 -24 30 -26 q18 0 22 14 q2 14 -14 16 q-14 2 -24 16z" fill="#f59e0b" ${wO()}/><path d="M162 46 l4 -18 6 16 M172 50 l10 -14 -2 18" fill="#fef3c7" ${wO(2)}/>${eyes2(168, 168, 54, 3.4)}<path d="M180 64 q-8 4 -14 2" stroke="${WI}" stroke-width="2" fill="none"/>
    ${[66,84,102,120].map(x => `<path d="M${x} ${66 - (x - 60) * .06} l5 -12 5 12" fill="#fde68a" ${wO(1.8)}/>`).join('')}</g>${sparkle(20, 120, .8, '#fde047')}${sparkle(170, 120, .6, '#fde047')}`),
  lg_palace: artItem(200, 176, 2.5, `${ground(100, 172, 96)}<g class="wa-glow"><ellipse cx="100" cy="110" rx="96" ry="60" fill="#c4b5fd" opacity=".35"/></g>${[[16,74,30],[154,74,30],[64,40,72]].map(([x,y,w]) => `<path d="M${x} ${y} L${x + w / 2} ${y - 50} L${x + w} ${y}Z" fill="#a5f3fc" ${wO()}/>${hi(`M${x + w / 2} ${y - 50} L${x + 4} ${y} h6z`)}`).join('')}
    <rect x="16" y="74" width="30" height="98" fill="#e0f2fe" ${wO()}/><rect x="154" y="74" width="30" height="98" fill="#e0f2fe" ${wO()}/><rect x="46" y="96" width="108" height="76" fill="#f0f9ff" ${wO()}/><rect x="64" y="40" width="72" height="70" fill="#e0f2fe" ${wO()}/>
    ${[[24,96],[162,96],[88,60]].map(([x,y]) => `<path d="M${x} ${y + 18} v-10 a7 7 0 0 1 14 0 v10z" fill="#c084fc" class="wa-win" ${wO(2)}/>`).join('')}<path d="M86 172 v-34 a14 14 0 0 1 28 0 v34z" fill="#a855f7" ${wO(2.5)}/>
    ${[[30,30],[170,30],[100,-6],[60,90],[140,90]].map(([x,y], i) => sparkle(x, y, i ? .7 : 1, '#fff')).join('')}`),
  lg_unicorn: artItem(140, 124, 1.9, `${['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#a855f7'].map((c, i) => `<path d="M${2 + i * 3} ${84 - i * 4} q4 -30 30 -36" stroke="${c}" stroke-width="3.5" fill="none" opacity=".85"/>`).join('')}
    <g class="wa-hover">${WORLD_ART.unicorn.replace(/^<svg[^>]*>|<\/svg>$/g, '').replace(/<ellipse cx="60" cy="112"[^>]*\/>/, '')}</g>${sparkle(120, 8, .8, '#fde047')}${sparkle(20, 20, .6)}`),
  lg_phoenix: artItem(170, 150, 2.3, `<g class="wa-hover"><g class="wa-wing"><path d="M72 66 q-30 -60 -70 -50 q24 10 14 24 q22 -4 22 14 q20 -6 26 14z" fill="#f97316" ${wO()}/><path d="M20 22 q26 4 46 36" stroke="#fde047" stroke-width="5" fill="none"/></g><g class="wa-wing r"><path d="M98 66 q30 -60 70 -50 q-24 10 -14 24 q-22 -4 -22 14 q-20 -6 -26 14z" fill="#f97316" ${wO()}/><path d="M150 22 q-26 4 -46 36" stroke="#fde047" stroke-width="5" fill="none"/></g>
    <g class="wa-flame">${[[70,110,'#ef4444'],[86,118,'#f97316'],[100,110,'#ef4444']].map(([x,y,c]) => `<path d="M${x} 96 q-10 ${y - 96} 2 ${y - 66} q6 -16 0 -30z" fill="${c}" ${wO(2)}/>`).join('')}</g>
    <ellipse cx="85" cy="80" rx="24" ry="28" fill="#ef4444" ${wO()}/><ellipse cx="85" cy="86" rx="14" ry="16" fill="#fde68a"/><circle cx="85" cy="44" r="18" fill="#ef4444" ${wO()}/><path d="M80 28 q-2 -20 8 -26 q-2 14 6 22 q6 -14 14 -12 q-8 8 -8 20z" fill="#fde047" ${wO(2)}/>
    <path d="M98 44 l14 4 -14 6z" fill="#facc15" ${wO(2)}/>${eyes2(84, 92, 40, 2.8)}</g>${sparkle(30, 110, .7, '#fde047')}${sparkle(140, 120, .8, '#fde047')}`),
  lg_whale: artItem(200, 110, 2.7, `<g class="wa-hover"><path d="M150 52 q30 -30 46 -22 q-14 6 -18 18 q16 4 20 16 q-24 -4 -40 0z" fill="#6366f1" ${wO()}/><path d="M8 56 q4 -44 72 -46 q60 0 74 40 q6 28 -22 40 q-30 12 -78 6 q-46 -6 -46 -40z" fill="#818cf8" ${wO()}/>
    <path d="M14 66 q40 26 120 14 q14 -2 20 -12 q-10 24 -40 28 q-62 8 -100 -30z" fill="#e0e7ff" ${wO(2)}/>${[30,44,58,72,86,100].map(x => `<path d="M${x} 74 q4 10 8 14" stroke="#a5b4fc" stroke-width="2" fill="none"/>`).join('')}
    ${eyes2(40, 40, 50, 3.6)}<path d="M50 62 q10 6 20 2" stroke="${WI}" stroke-width="2.2" fill="none"/><path d="M70 44 q20 18 40 4" stroke="#4f46e5" stroke-width="4" fill="none"/>
    <g class="wa-spout"><path d="M56 10 q-10 -10 -4 -16 M56 10 q2 -14 10 -16 M56 10 q12 -8 18 -4" stroke="#7dd3fc" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>${[[100,30],[120,40],[86,26]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff" opacity=".7"/>`).join('')}</g>`),
  lg_rocket: artItem(96, 176, 1.25, `<g class="wa-hover"><path class="wa-flame" d="M32 140 q16 50 32 0z" fill="#a855f7"/><path class="wa-flame b" d="M40 140 q8 30 16 0z" fill="#f0abfc"/><path d="M20 110 l-16 32 h24z M76 110 l16 32 h-24z" fill="#7c3aed" ${wO()}/>
    <path d="M48 4 q36 36 30 112 q-2 22 -8 26 h-44 q-6 -4 -8 -26 q-6 -76 30 -112z" fill="#1e1b4b" ${wO()}/>${[[36,40],[60,60],[40,90],[58,110],[46,124]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join('')}<path d="M48 4 q18 18 24 40 h-48 q6 -22 24 -40z" fill="#a855f7" ${wO()}/>
    <circle cx="48" cy="74" r="13" fill="#67e8f9" ${wO()}/><path d="M48 66 l2.5 5.5 6 .5 -4.5 4 1.5 6 -5.5 -3 -5.5 3 1.5 -6 -4.5 -4 6 -.5z" fill="#fde047"/><circle cx="62" cy="20" r="18" fill="none" stroke="#f0abfc" stroke-width="2" opacity=".6"/></g>${sparkle(10, 40, .8, '#fde047')}${sparkle(88, 70, .6)}`),
  lg_rainbow: artItem(220, 130, 3, `<g class="wa-glow">${['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'].map((c, i) => `<path d="M${16 + i * 10} 120 a${94 - i * 10} ${94 - i * 10} 0 0 1 ${188 - i * 20} 0" stroke="${c}" stroke-width="10.5" fill="none"/>`).join('')}</g><path d="M11 120 a99 99 0 0 1 198 0 M66 120 a44 44 0 0 1 88 0" stroke="${WI}" stroke-width="2.5" fill="none"/>
    ${[[30,60],[110,8],[190,60],[70,26],[150,26]].map(([x,y], i) => sparkle(x, y, i % 2 ? .7 : 1.1, i % 2 ? '#fde047' : '#fff')).join('')}<path d="M98 120 q4 -10 12 -10 q8 0 12 10z" fill="#facc15" ${wO(2)}/>${[100,108,116].map(x => `<circle cx="${x}" cy="112" r="4" fill="#facc15" ${wO(1.5)}/>`).join('')}`),
  lg_trophy: artItem(100, 140, 1.4, `${ground(50, 136, 36)}<g class="wa-glow"><circle cx="50" cy="44" r="46" fill="#fde047" opacity=".25"/></g><path d="M22 8 h56 v36 q0 34 -28 40 q-28 -6 -28 -40z" fill="#facc15" ${wO()}/>${sh('M50 84 q28 -6 28 -40 v-36 h-14 v36 q0 30 -14 40z')}
    <path d="M22 18 q-22 0 -18 20 q4 20 22 18 M78 18 q22 0 18 20 q-4 20 -22 18" fill="none" ${wO(3.5)}/><rect x="42" y="84" width="16" height="20" fill="#f59e0b" ${wO(2.5)}/><rect x="24" y="104" width="52" height="26" rx="4" fill="#7c2d12" ${wO()}/><rect x="34" y="112" width="32" height="10" rx="2" fill="#fde68a" ${wO(1.5)}/>
    <path d="M50 26 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1z" fill="#fff" ${wO(1.5)}/>${hi('M30 14 h10 v26 q0 18 -6 26 q-4 -16 -4 -52z')}${sparkle(88, 10, .9)}${sparkle(10, 70, .7)}${sparkle(92, 90, .6, '#fde047')}`),

  /* ---------- mythic ---------- */
  my_portal: artItem(120, 140, 1.6, `${ground(60, 136, 46)}<path d="M18 136 V60 a42 42 0 0 1 84 0 v76" fill="#78716c" ${wO()}/><path d="M28 136 V62 a32 32 0 0 1 64 0 v74z" fill="#1e1b4b" ${wO(2.5)}/>
    <g class="wa-spin"><path d="M60 98 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0" fill="none" stroke="#a855f7" stroke-width="5" stroke-dasharray="20 10"/><path d="M60 98 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0" fill="none" stroke="#22d3ee" stroke-width="4" stroke-dasharray="12 8"/></g><circle cx="60" cy="98" r="6" fill="#f0abfc" class="wa-pulse"/>
    ${[[38,20],[82,24],[60,6]].map(([x,y]) => `<circle cx="${x}" cy="${y + 28}" r="5" fill="#a5f3fc" ${wO(1.5)}/>`).join('')}${sparkle(14, 40, .7, '#c4b5fd')}${sparkle(108, 50, .7, '#c4b5fd')}`),
  my_planet: artItem(110, 90, 1.5, `<g class="wa-hover"><ellipse cx="55" cy="48" rx="52" ry="14" fill="none" stroke="#fde68a" stroke-width="6" transform="rotate(-14 55 48)"/><circle cx="55" cy="44" r="30" fill="#f472b6" ${wO()}/>${sh('M55 74 a30 30 0 0 0 28 -40 q-6 30 -28 40z')}
    <path d="M30 34 q20 -6 50 0 M28 50 q26 -4 54 2" stroke="#fbcfe8" stroke-width="4" fill="none"/>${eyes2(46, 62, 42, 3)}<path d="M50 52 q5 4 10 0" stroke="${WI}" stroke-width="2" fill="none"/><path d="M5 56 q50 14 100 -26" stroke="#fde68a" stroke-width="6" fill="none" transform="rotate(-2 55 48)"/><path d="M5 56 q50 14 100 -26" fill="none" ${wO(1.5)}/></g>${sparkle(100, 10, .7)}${sparkle(10, 14, .6)}`),
  my_star: artItem(140, 100, 1.9, `<g class="wa-hover">${['#f0abfc','#c4b5fd','#93c5fd'].map((c, i) => `<path d="M${74 - i * 6} ${46 + i * 6} q-36 ${20 - i * 6} -70 ${30 - i * 6}" stroke="${c}" stroke-width="${6 - i}" fill="none" stroke-linecap="round" opacity=".8"/>`).join('')}
    <g class="wa-pulse"><path d="M100 6 l10 22 24 2 -18 16 6 24 -22 -12 -22 12 6 -24 -18 -16 24 -2z" fill="#fde047" ${wO()}/>${eyes2(93, 107, 40, 2.8)}<path d="M96 48 q4 4 8 0" stroke="${WI}" stroke-width="2" fill="none"/></g></g>`),
  my_genie: artItem(120, 126, 1.6, `${ground(60, 122, 40)}<path d="M18 116 q0 -14 26 -16 h40 q14 0 22 -10 q10 -6 12 4 q-4 18 -30 26 h-60 q-10 0 -10 -4z" fill="#facc15" ${wO()}/><path d="M48 100 q12 -8 24 0" fill="#f59e0b" ${wO(2)}/>
    <g class="wa-genie"><path d="M60 98 q-24 -10 -10 -30 q-16 -14 4 -26 q22 -8 30 8 q14 18 -6 30 q12 10 -18 18z" fill="#a78bfa" opacity=".85" ${wO(2.5)}/><circle cx="66" cy="34" r="16" fill="#818cf8" ${wO()}/>${eyes2(60, 72, 32, 2.8)}<path d="M60 40 q6 5 12 0" stroke="${WI}" stroke-width="2" fill="none"/><path d="M56 20 q10 -14 22 0z" fill="#ef4444" ${wO(2)}/><circle cx="67" cy="14" r="3" fill="#facc15"/></g>${sparkle(98, 30, .7, '#fde047')}${sparkle(30, 50, .6, '#fde047')}`),
  my_island: artItem(150, 140, 2, `<g class="wa-hover"><path d="M10 70 q65 -14 130 0 q-10 30 -40 46 q-20 20 -26 22 q-6 -2 -26 -22 q-30 -16 -38 -46z" fill="#a16207" ${wO()}/>${sh('M75 138 q6 -2 26 -22 q30 -16 40 -46 q-30 30 -66 68z')}<path d="M10 70 q65 -14 130 0 q-65 14 -130 0z" fill="#4ade80" ${wO()}/>
    <path d="M100 66 q-2 -26 4 -40 l6 2 q-6 14 -4 38z" fill="#a0703c" ${wO(2)}/><g class="wa-sway"><path d="M106 28 q-20 -12 -36 2 q18 -4 36 0z M108 28 q18 -14 34 0 q-18 -4 -34 2z M106 28 q-6 -18 -22 -18 q14 6 20 18z" fill="#22c55e" ${wO(2)}/></g>
    <rect x="30" y="44" width="30" height="22" fill="#fef3c7" ${wO(2.5)}/><path d="M26 46 L45 30 L64 46Z" fill="#ef4444" ${wO(2.5)}/><path class="wa-water" d="M118 96 q4 20 0 40 M126 90 q4 24 2 44" stroke="#7dd3fc" stroke-width="4" fill="none" stroke-linecap="round"/></g>`),
  my_peacock: artItem(150, 130, 2, `${ground(75, 126, 40)}<g class="wa-fan">${Array.from({ length:11 }, (_, i) => { const a = (-160 + i * 14) * Math.PI / 180, x = 75 + Math.cos(a) * 66, y = 100 + Math.sin(a) * 66;
      return `<path d="M75 100 L${x.toFixed(1)} ${y.toFixed(1)}" stroke="#16a34a" stroke-width="3"/><ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="11" ry="14" fill="${['#22c55e','#06b6d4','#a855f7'][i % 3]}" ${wO(2)} transform="rotate(${(-70 + i * 14)} ${x.toFixed(1)} ${y.toFixed(1)})"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#1e3a8a"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="#facc15"/>`; }).join('')}</g>
    <ellipse cx="75" cy="102" rx="16" ry="22" fill="#2563eb" ${wO()}/><path d="M75 82 q-4 -26 6 -34" stroke="#2563eb" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M75 82 q-4 -26 6 -34" fill="none" ${wO(2)}/><circle cx="82" cy="44" r="9" fill="#2563eb" ${wO(2.5)}/>
    <path d="M90 44 l8 2 -8 3z" fill="#facc15" ${wO(1.5)}/><g class="wa-blink"><circle cx="84" cy="42" r="2.2" fill="#fff"/></g><path d="M82 36 l-2 -10 M86 36 l2 -10" stroke="#2563eb" stroke-width="2"/><circle cx="80" cy="25" r="2.5" fill="#06b6d4"/><circle cx="88" cy="25" r="2.5" fill="#06b6d4"/>
    <path d="M68 122 l-2 -6 M82 122 l2 -6" ${wO(2.5)}/>`),

  /* ---------- streets ---------- */
  trafficlight: artItem(40, 120, .55, `${ground(20, 118, 14)}<path d="M20 118 V64" ${wO(5)} stroke="#475569"/><rect x="6" y="4" width="28" height="64" rx="8" fill="#1f2937" ${wO()}/><circle class="wa-tl r" cx="20" cy="18" r="7" fill="#ef4444"/><circle class="wa-tl y" cx="20" cy="36" r="7" fill="#facc15"/><circle class="wa-tl g" cx="20" cy="54" r="7" fill="#22c55e"/>`),
  busstop: artItem(110, 104, 1.4, `${ground(55, 100, 50)}<path d="M10 100 V30 M100 100 V30" ${wO(4)} stroke="#475569"/><path d="M4 30 h102 l-6 -12 h-90z" fill="#3b82f6" ${wO()}/><rect x="16" y="36" width="78" height="44" rx="3" fill="#bae6fd" opacity=".55" ${wO(2)}/><rect x="22" y="76" width="66" height="8" rx="2" fill="#8b5a2b" ${wO(2)}/>
    <circle cx="96" cy="16" r="10" fill="#fff" ${wO(2)}/><text x="96" y="20" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="12" fill="#2563eb">B</text>`),
  bus: artItem(190, 96, 2.3, `${ground(95, 92, 88)}<rect x="6" y="14" width="176" height="66" rx="12" fill="#facc15" ${wO()}/>${sh('M6 62 h176 v6 q0 12 -12 12 h-152 q-12 0 -12 -12z')}${[18,46,74,102,130].map(x => win(x, 24, 22, 22, '#bae6fd')).join('')}<path d="M156 24 h18 q4 0 4 4 v30 h-22z" fill="#bae6fd" ${wO(2.5)}/>
    <path d="M10 56 h170" stroke="#1f2937" stroke-width="3"/><rect x="176" y="62" width="8" height="6" rx="2" fill="#fff"/>${[40,146].map(x => `<g class="wa-wheel"><circle cx="${x}" cy="80" r="12" fill="${WI}"/><circle cx="${x}" cy="80" r="5" fill="#cbd5e1"/></g>`).join('')}`),
  taxi: artItem(136, 76, 1.65, `${ground(68, 72, 60)}<rect x="56" y="2" width="24" height="10" rx="3" fill="#fff" ${wO(2)}/><text x="68" y="10.5" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="8" fill="${WI}">TAXI</text>
    <path d="M8 54 q0 -16 18 -18 l18 -20 h44 l22 20 q20 2 20 18 v8 h-122z" fill="#facc15" ${wO()}/><path d="M48 20 h18 v18 h-34z M72 20 h14 l18 18 h-32z" fill="#bae6fd" ${wO(2.5)}/><path d="M10 48 h120" stroke="${WI}" stroke-width="5" stroke-dasharray="6 6"/>
    ${[36,102].map(x => `<g class="wa-wheel"><circle cx="${x}" cy="62" r="12" fill="${WI}"/><circle cx="${x}" cy="62" r="5" fill="#cbd5e1"/></g>`).join('')}`),
  statue: artItem(80, 150, 1.05, `${ground(40, 146, 34)}<rect x="10" y="118" width="60" height="28" rx="3" fill="#d6d3d1" ${wO()}/><rect x="16" y="110" width="48" height="10" fill="#e7e5e4" ${wO(2.5)}/>
    <path d="M28 110 q-4 -40 4 -60 q8 -6 16 0 q8 20 4 60z" fill="#5eead4" ${wO()}/><circle cx="40" cy="38" r="12" fill="#5eead4" ${wO()}/><path d="M30 30 l-2 -10 6 6 2 -10 4 10 4 -10 2 10 6 -6 -2 10" fill="#5eead4" ${wO(2)}/><path d="M50 56 q10 -18 6 -40" ${wO(5)} stroke="#5eead4"/><path d="M50 56 q10 -18 6 -40" fill="none" ${wO(2)}/>
    <path class="wa-flame" d="M56 16 q-8 -8 0 -16 q8 8 0 16z" fill="#fbbf24" ${wO(2)}/><path d="M26 66 h10 v26 h-10z" fill="#99f6e4" ${wO(2)}/>`)
});
// shops and restaurants: real storefronts (the shop helper), each with its own colors and sign
Object.assign(WORLD_ART, {
  burger:   shop('#fef3c7', '#ef4444', '#facc15', '🍔', 'Burgers'),
  bakery:   shop('#fdf2f8', '#f472b6', '#fff', '🧁', 'Bakery'),
  sushi:    shop('#ecfeff', '#0f766e', '#f8fafc', '🍣', 'Sushi'),
  noodles:  shop('#fff7ed', '#dc2626', '#fde68a', '🍜', 'Noodles'),
  cafe:     shop('#f5f5f4', '#7c4a1e', '#fef3c7', '☕', 'Café'),
  candy:    shop('#fdf4ff', '#a855f7', '#f9a8d4', '🍭', 'Candy'),
  toystore: shop('#eff6ff', '#2563eb', '#facc15', '🧸', 'Toys'),
  bookstore:shop('#fefce8', '#166534', '#fef3c7', '📚', 'Books'),
  petshop:  shop('#f0fdf4', '#22c55e', '#fff', '🐾', 'Pets'),
  flowers:  shop('#fff1f2', '#ec4899', '#bbf7d0', '🌷', 'Flowers'),
  market:   shop('#fefce8', '#16a34a', '#fef08a', '🍎', 'Market'),
  arcade:   shop('#1e1b4b', '#7c3aed', '#22d3ee', '🕹️', 'Arcade'),
  library:  shop('#f5f5f4', '#1e3a8a', '#e0e7ff', '📖', 'Library'),
  firestation: shop('#fee2e2', '#dc2626', '#fff', '🚒', 'Fire Dept'),
  police:   shop('#eff6ff', '#1e3a8a', '#fff', '🚓', 'Police'),
  hospital: shop('#f8fafc', '#ef4444', '#fff', '🏥', 'Hospital')
});
Object.assign(TOWN_SVG, WORLD_ART);

WORLD_ITEMS.push(
  ['dream','dreamhouse','🏩','Pink Dream Mansion',80], ['dream','herocar','🦇','Midnight Hero Car',70], ['dream','townhall','🏛️','Town Hall',50],
  ['dream','clocktower','🕰️','Clock Tower',35], ['dream','skyscraper','🏙️','Skyscraper',40], ['dream','apartments','🏢','Apartments',30], ['dream','cinema','🎬','Movie Theater',45],
  ['food','pizza','🍕','Pizza Place',30], ['food','burger','🍔','Burger Diner',30], ['food','icecream','🍦','Ice Cream Shop',25], ['food','bakery','🧁','Bakery',25],
  ['food','sushi','🍣','Sushi Bar',30], ['food','noodles','🍜','Noodle House',30], ['food','cafe','☕','Café',20], ['food','candy','🍭','Candy Shop',25], ['food','tacotruck','🌮','Taco Truck',25], ['food','stall','🍉','Fruit Stall',15],
  ['shops','toystore','🧸','Toy Store',30], ['shops','bookstore','📚','Book Shop',20], ['shops','petshop','🐾','Pet Shop',25], ['shops','flowers','🌷','Flower Shop',20],
  ['shops','market','🍎','Market',25], ['shops','arcade','🕹️','Arcade',35], ['shops','library','📖','Library',20], ['shops','firestation','🚒','Fire Station',30],
  ['shops','police','🚓','Police Station',30], ['shops','hospital','🏥','Hospital',30],
  ['street','road','🛣️','Road',5], ['street','crosswalk','🚸','Crosswalk',5], ['street','lamp','💡','Street Lamp',5], ['street','bench','🪑','Park Bench',5],
  ['street','planter','🌼','Flower Planter',5], ['street','trafficlight','🚦','Traffic Light',5], ['street','busstop','🚏','Bus Stop',8], ['street','bus','🚌','City Bus',25],
  ['street','taxi','🚕','Taxi',15], ['street','scooter2','🛵','Moped',10], ['street','statue','🗽','Town Statue',30]
);
const WORLD_BY_ID = Object.fromEntries(WORLD_ITEMS.map(i => [i[1], i]));

/* ---------- Legendary & Mythic world items ----------
   LEGENDARY: each unlocks with a real achievement, then still costs a lot of stars. Bought once, kept forever.
   MYTHIC: can't be bought. Only found in a Starfall Chest, which can drop after a great read (1 in 20,
   and guaranteed by the 20th great read without one). Both get a cinematic reveal and live effects in the world.
   fx: 'fly' circles the sky, 'float' bobs, 'spin' swirls, 'pulse' glows bigger. */
const LEGENDS = [
  { id:'lg_dragon',  e:'🐲', name:'Golden Sky Dragon',   price:250, req:'level6',  fx:'fly',   say:'A golden dragon soars over your world!' },
  { id:'lg_palace',  e:'🏯', name:'Crystal Palace',      price:220, req:'reads50', fx:'pulse', say:'A shining crystal palace rises from the ground!' },
  { id:'lg_unicorn', e:'🦄', name:'Rainbow Unicorn',     price:200, req:'streak7', fx:'float', say:'A rainbow unicorn gallops into your world!' },
  { id:'lg_phoenix', e:'🐦‍🔥', name:'Phoenix of Fire',     price:220, req:'perfect10', fx:'fly', say:'A phoenix bursts into flames and flies!' },
  { id:'lg_whale',   e:'🐋', name:'Sky Whale',           price:180, req:'stories25', fx:'fly', say:'A giant whale swims through the sky!' },
  { id:'lg_rocket',  e:'🚀', name:'Galaxy Rocket',       price:200, req:'badges12', fx:'pulse', say:'A galaxy rocket is ready for launch!' },
  { id:'lg_rainbow', e:'🌈', name:'Endless Rainbow',     price:180, req:'words20', fx:'pulse', say:'An endless rainbow lights up the sky!' },
  { id:'lg_trophy',  e:'🏆', name:'Hall of Fame Trophy', price:300, req:'top',     fx:'pulse', say:'The Hall of Fame Trophy! You reached the very top!' }
];
const MYTHICS = [
  { id:'my_portal', e:'🌀', name:'Galaxy Portal',        fx:'spin' },
  { id:'my_planet', e:'🪐', name:'Tiny Planet',          fx:'float' },
  { id:'my_star',   e:'🌠', name:'Wishing Star',         fx:'fly' },
  { id:'my_genie',  e:'🧞', name:'Wish Genie',           fx:'float' },
  { id:'my_island', e:'🏝️', name:'Floating Island',      fx:'float' },
  { id:'my_peacock',e:'🦚', name:'Rainbow Peacock',      fx:'pulse' }
];
LEGENDS.forEach(l => { const row = ['legendary', l.id, l.e, l.name, l.price]; WORLD_ITEMS.push(row); WORLD_BY_ID[l.id] = row; });
MYTHICS.forEach(m => { const row = ['mythic', m.id, m.e, m.name, 0]; WORLD_ITEMS.push(row); WORLD_BY_ID[m.id] = row; });
const LEGEND_FX = Object.fromEntries(LEGENDS.concat(MYTHICS).map(x => [x.id, x.fx]));
// requirement id -> [label, () => [have, need]]
function legendReq(req){
  const word = TK === 'daughter' ? 'Rank' : 'Level', top = T.levels.length;
  const perfect = () => normalSessions(K).filter(s => s.quiz && s.quiz.split('/')[0] === s.quiz.split('/')[1]).length;
  return {
    level6:    [`Reach ${word} 6`, () => [Math.min(K.level, 6), 6]],
    reads50:   ['Finish 50 readings', () => [Math.min(normalSessions(K).length, 50), 50]],
    streak7:   ['Reach your reading goal 7 days in a row', () => [Math.min(K.streak.count || 0, 7), 7]],
    perfect10: ['Get every question right on 10 stories', () => [Math.min(perfect(), 10), 10]],
    stories25: ['Finish 25 stories', () => [Math.min(normalSessions(K).filter(s => s.kind === 'story').length, 25), 25]],
    badges12:  ['Earn 12 badges', () => [Math.min(K.badges.length, 12), 12]],
    words20:   ['Master 20 tricky words', () => [Math.min(masteredWords(K).length, 20), 20]],
    top:       [`Reach the top ${word.toLowerCase()} (${top})`, () => [Math.min(K.level, top), top]]
  }[req];
}
const legendUnlocked = l => { const [have, need] = legendReq(l.req)[1](); return have >= need; };
const legendOwned = id => (K.legendOwned || []).includes(id) || (K.mythics || []).includes(id);

// Full-screen reveal with spinning light rays, the item zooming in, and a fanfare.
function epicReveal(item, tier, title, sub){
  return new Promise(res => {
    const ov = el('div',{class:'epic-overlay epic-' + tier},
      el('div',{class:'epic-rays'}),
      el('div',{class:'epic-card'},
        el('div',{class:'epic-tier'}, tier === 'mythic' ? '🌈 MYTHIC 🌈' : '✨ LEGENDARY ✨'),
        el('div',{class:'epic-item'}, item.e),
        el('h2',{class:'epic-title'}, title),
        el('p',{class:'epic-name'}, item.name),
        sub ? el('p',{class:'epic-sub'}, sub) : null,
        el('button',{class:'btn big', onclick:()=>{ ov.remove(); res(); }},'AMAZING! ▶')));
    document.body.append(ov);
    try { [523,659,784,1047,784,1047,1319].forEach((f, i) => setTimeout(() => { try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + .02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + .45);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + .5); } catch(e){} }, i * 160)); } catch(e){}
    confetti(160); setTimeout(() => confetti(120), 900);
    say(`${tier === 'mythic' ? 'Mythic' : 'Legendary'}! ${item.name}! ${item.say || ''}`);
  });
}
// Called with the badges: shows the reveal the first time each legendary's achievement is reached.
async function checkLegends(){
  K.legendSeen = K.legendSeen || [];
  for (const l of LEGENDS){
    if (K.legendSeen.includes(l.id) || !legendUnlocked(l)) continue;
    K.legendSeen.push(l.id); save();
    await epicReveal(l, 'legendary', 'LEGENDARY UNLOCKED!', `${legendReq(l.req)[0]}: done! Find it in My World › ✨ Legendary for 💫 ${legendCosmic(l)} Cosmic Power.`);
  }
}
// After a great read: maybe a Starfall Chest with a random mythic inside.
const CHEST_ODDS = 20;
const CHEST_SVG = `<svg viewBox="0 0 120 100" width="200" height="167" aria-label="treasure chest">
  <ellipse cx="60" cy="94" rx="52" ry="6" fill="#000" opacity=".35"/>
  <rect x="10" y="44" width="100" height="48" rx="8" fill="#92400e" stroke="#451a03" stroke-width="5"/>
  <path d="M10 48 Q10 14 60 14 Q110 14 110 48Z" fill="#b45309" stroke="#451a03" stroke-width="5"/>
  <rect x="10" y="44" width="100" height="9" fill="#fbbf24" stroke="#78350f" stroke-width="2.5"/>
  <rect x="24" y="16" width="10" height="76" fill="#fbbf24" stroke="#78350f" stroke-width="2.5"/>
  <rect x="86" y="16" width="10" height="76" fill="#fbbf24" stroke="#78350f" stroke-width="2.5"/>
  <rect x="50" y="42" width="20" height="24" rx="4" fill="#fde68a" stroke="#78350f" stroke-width="3"/>
  <circle cx="60" cy="52" r="3.5" fill="#78350f"/><rect x="58.5" y="52" width="3" height="8" fill="#78350f"/>
  <g class="sparkle"><path d="M8 10 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3z" fill="#fde047"/><path d="M106 4 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5z" fill="#f0abfc"/></g>
</svg>`;
async function maybeStarfallChest(){
  K.chestPity = (K.chestPity || 0) + 1;
  if (Math.random() >= 1 / CHEST_ODDS && K.chestPity < CHEST_ODDS){ save(); return; }
  K.chestPity = 0;
  const left = MYTHICS.filter(m => !(K.mythics || []).includes(m.id));
  await new Promise(res => {
    const ov = el('div',{class:'epic-overlay epic-mythic'}, el('div',{class:'epic-rays'}),
      el('div',{class:'epic-card'}, el('div',{class:'epic-tier'},'🌠 STARFALL CHEST 🌠'), el('div',{class:'chest-shake', html: CHEST_SVG}),
        el('h2',{class:'epic-title'},'A Starfall Chest fell from the sky!'), el('p',{class:'epic-sub'},'Super rare! Tap to open it.'),
        el('button',{class:'btn big', onclick:()=>{ ov.remove(); res(); }},'🗝️ Open it!')));
    document.body.append(ov); beep('level'); confetti(60); say('Whoa! A Starfall Chest fell from the sky!');
  });
  if (!left.length){ K.stars += 25; save(); await modal(el('div',{}, el('div',{class:'big-e'},'💰'), el('h2',{},'Chest full of stars!'), el('p',{},'You already found every mythic! +25 ⭐')), [['Yay! ▶','',1]]); return; }
  const m = pick(left);
  K.mythics = (K.mythics || []).concat(m.id); save();
  await epicReveal(m, 'mythic', 'MYTHIC FOUND!', 'Only found in Starfall Chests. Place it in My World › ✨ Legendary!');
}
const WORLD_CATS = { dream:'🏙️ Town', food:'🍕 Food', shops:'🛍️ Shops', street:'🚦 Streets', home:'🏠 Buildings', nature:'🌳 Nature', fun:'🎡 Fun', ride:'🚀 Rides', animal:'🦖 Animals', holiday:'🎉 Holidays', friends:'💛 My Friends' };
const WORLD_THEMES = {
  meadow:  { name:'Sunny Meadow', price:0,  sky:'linear-gradient(#7dd3fc,#e0f2fe)', ground:'linear-gradient(#86efac,#22c55e)' },
  beach:   { name:'Beach Day',    price:25, sky:'linear-gradient(#38bdf8,#bae6fd)', ground:'linear-gradient(#fde68a 0 45%,#38bdf8 45%)' },
  snow:    { name:'Snow Land',    price:25, sky:'linear-gradient(#a5b4fc,#e0e7ff)', ground:'linear-gradient(#f8fafc,#cbd5e1)' },
  night:   { name:'Night Sky',    price:30, sky:'radial-gradient(#fff 1px,transparent 1.5px) 0 0/40px 40px, linear-gradient(#0f172a,#312e81)', ground:'linear-gradient(#166534,#14532d)' },
  candy:   { name:'Candy Land',   price:40, sky:'linear-gradient(#fbcfe8,#fdf2f8)', ground:'repeating-linear-gradient(45deg,#f9a8d4 0 20px,#fff 20px 40px)' },
  space:   { name:'Outer Space',  price:40, sky:'radial-gradient(#fff 1.2px,transparent 1.7px) 0 0/34px 34px, linear-gradient(#020617,#1e1b4b)', ground:'radial-gradient(#94a3b8 10px,transparent 11px) 0 0/60px 40px, linear-gradient(#64748b,#334155)' },
  lava:    { name:'Volcano Island', price:40, sky:'linear-gradient(#7c2d12,#fb923c)', ground:'linear-gradient(#292524,#7f1d1d)' },
  // ---- new places (Nov 2) ----
  town:      { name:'Town Center',       price:30, sky:'linear-gradient(#60a5fa,#e0f2fe)', ground:'linear-gradient(#e7e5e4,#d6d3d1)' },
  sunset:    { name:'Sunset Beach',      price:30, sky:'linear-gradient(#f97316,#fde68a)' },
  tropic:    { name:'Tropical Island',   price:35, sky:'linear-gradient(#22d3ee,#a5f3fc)' },
  forest:    { name:'Enchanted Forest',  price:30, sky:'linear-gradient(#065f46,#a7f3d0)' },
  desert:    { name:'Desert Dunes',      price:30, sky:'linear-gradient(#fb923c,#fef3c7)' },
  waterpark: { name:'Splash Water Park', price:45, sky:'linear-gradient(#0ea5e9,#e0f2fe)' },
  jungle:    { name:'Jungle Falls',      price:40, sky:'linear-gradient(#15803d,#bbf7d0)' },
  under:     { name:'Under the Sea',     price:45, sky:'linear-gradient(#0c4a6e,#22d3ee)' },
  rainbow:   { name:'Rainbow Land',      price:40, sky:'linear-gradient(#f472b6,#a78bfa,#60a5fa)' },
  castle:    { name:'Castle Kingdom',    price:45, sky:'linear-gradient(#6366f1,#e0e7ff)' },
  dino:      { name:'Dino Valley',       price:40, sky:'linear-gradient(#ca8a04,#fef9c3)' },
  pirate:    { name:'Pirate Cove',       price:40, sky:'linear-gradient(#1e3a8a,#93c5fd)' },
  farm:      { name:'Autumn Farm',       price:30, sky:'linear-gradient(#f59e0b,#fef3c7)' },
  blossom:   { name:'Cherry Blossom Garden', price:35, sky:'linear-gradient(#f9a8d4,#fdf2f8)' },
  skycity:   { name:'Sky City',          cosmic:8,  sky:'linear-gradient(#3b82f6,#c7d2fe)' },
  clouds:    { name:'Cloud Kingdom',     cosmic:8,  sky:'linear-gradient(#a5b4fc,#fdf4ff)' },
  aurora:    { name:'Northern Lights',   cosmic:10, sky:'linear-gradient(#020617,#065f46,#7c3aed)' }
};
const WORLD_W = 1800, WORLD_H = 470, GROUND_Y = 300;

/* ---------- island scenery ----------
   Each place draws a layered scene: sky and clouds, far and near mountains, hills with trees,
   a sparkling lake with a dock, a sandy shore, and grass where things are placed (from y≈280).
   Positions come from a seeded random, so the scene looks the same every visit. */
const SCENE_PAL = {
  meadow:{ sky:['#4cc3ff','#d6f3ff'], sun:'#fff7b0', far:'#a7c0e0', mid:'#8e9fb6', midHi:'#c3cfdc', cap:'#ffffff', hill:'#5cc85e', hill2:'#43a94b', tree:'#1f8a46', tree2:'#14663a', water:['#3cc6ff','#0f86e0'], sand:'#f7dfa1', grass:['#82dc58','#4fb53e'], tuft:'#3f9e34', trees:'pine' },
  beach: { sky:['#2fb9f5','#e3f8ff'], sun:'#fff3a3', far:'#b5d3ee', mid:'#d6c08f', midHi:'#efe0b8', cap:'#f5ead0', hill:'#86d06f', hill2:'#5fb655', tree:'#2f9e54', tree2:'#7c5a33', water:['#2ee0f2','#0891d6'], sand:'#fde7a3', grass:['#fde7a3','#f3cf79'], tuft:'#d9b45a', trees:'palm' },
  snow:  { sky:['#8ea6ff','#eef2ff'], sun:'#ffffff', far:'#cdd6fb', mid:'#dfe6f1', midHi:'#ffffff', cap:'#ffffff', hill:'#f4f7fb', hill2:'#dfe7f1', tree:'#2f6f5e', tree2:'#1f4f43', water:['#c5ecff','#86cdf2'], sand:'#e6edf5', grass:['#ffffff','#dde6f0'], tuft:'#c3d0de', trees:'snowpine' },
  night: { sky:['#070b22','#2b2f7d'], sun:'#fef6c3', far:'#283363', mid:'#323d6c', midHi:'#46538a', cap:'#c7d2fe', hill:'#1f5c3a', hill2:'#174a2f', tree:'#0f3d26', tree2:'#0a2c1b', water:['#2849a8','#0b1a4a'], sand:'#8f8c78', grass:['#2f7a45','#1c5530'], tuft:'#174a2a', trees:'pine', stars:true },
  candy: { sky:['#ffbde4','#fff1f9'], sun:'#ffffff', far:'#f7add6', mid:'#ea8dc6', midHi:'#ffd0ea', cap:'#ffffff', hill:'#ffb6dc', hill2:'#f79ccc', tree:'#c084fc', tree2:'#a855f7', water:['#cbbcff','#a58bfa'], sand:'#ffe3f4', grass:['#ffd3ee','#f9a8d4'], tuft:'#f472b6', trees:'lolly' },
  space: { sky:['#020617','#231e5c'], sun:'#fb923c', far:'#4c1d95', mid:'#5b21b6', midHi:'#7c3aed', cap:'#c4b5fd', hill:'#3b4558', hill2:'#2b3446', tree:'#22d3ee', tree2:'#0e7490', water:['#2ee6ff','#6366f1'], sand:'#9aa6b8', grass:['#6b778c','#3a4457'], tuft:'#4b566b', trees:'crystal', stars:true },
  town:     { sky:['#5aa9ff','#e3f2ff'], sun:'#fff7c2', far:'#a8bfdc', mid:'#8ea4c2', midHi:'#c1d0e4', cap:'#ffffff', hill:'#7cc96e', hill2:'#5aab55', tree:'#22a05a', tree2:'#15803d', water:['#7dd3fc','#0ea5e9'], sand:'#d6d3d1', grass:['#e7e5e4','#d6d3d1'], tuft:'#e7e5e4', trees:'round', noMtn:true, noDock:true, extra:'town' },
  sunset:   { sky:['#ff7a3d','#ffe3a3'], sun:'#ffefb0', far:'#c46b8e', mid:'#a35a7d', midHi:'#d892a6', cap:'#ffd1c4', hill:'#7fbf6a', hill2:'#5d9a52', tree:'#2f7a46', tree2:'#7c5a33', water:['#ff9f6b','#7c3aed'], sand:'#ffd39a', grass:['#ffd39a','#f2b66c'], tuft:'#d99a4b', trees:'palm', extra:'sunset' },
  tropic:   { sky:['#19c8f0','#e6fcff'], sun:'#fff7b0', far:'#9be3d6', mid:'#4fb38a', midHi:'#86d9b4', cap:'#4fb38a', hill:'#38b26b', hill2:'#249a57', tree:'#1f9a52', tree2:'#7c5a33', water:['#2df0e6','#0a8fd6'], sand:'#fff0b8', grass:['#fff0b8','#f6d987'], tuft:'#e2bd62', trees:'palm', extra:'tropic', noMtn:true },
  forest:   { sky:['#2d8f6f','#d4f7e6'], sun:'#fffbd1', far:'#4e9b7e', mid:'#2f6f57', midHi:'#4f9478', cap:'#2f6f57', hill:'#2e8b4f', hill2:'#1f6b3c', tree:'#166534', tree2:'#14532d', water:['#57d5c8','#1d8a87'], sand:'#a07a52', grass:['#4caf50','#2e7d32'], tuft:'#1b5e20', trees:'oak', dense:true, extra:'forest' },
  desert:   { sky:['#ff9e4a','#fff2cc'], sun:'#fff7c2', far:'#e8b37a', mid:'#d99a5e', midHi:'#f2c58e', cap:'#d99a5e', hill:'#f0c27e', hill2:'#e0a964', tree:'#3f8f4f', tree2:'#2d6b3a', water:['#3fd0e8','#1792c9'], sand:'#f4d08f', grass:['#f6d59a','#e7b86d'], tuft:'#c99247', trees:'cactus', extra:'desert' },
  waterpark:{ sky:['#1fb2f5','#e9f9ff'], sun:'#fffbd1', far:'#b9dcf2', mid:'#8fc3e6', midHi:'#c6e4f7', cap:'#ffffff', hill:'#7bd36b', hill2:'#5bb553', tree:'#2f9e54', tree2:'#7c5a33', water:['#53f2ff','#13a4ec'], sand:'#ffe9b0', grass:['#9be36b','#64c44a'], tuft:'#4ea338', trees:'palm', extra:'waterpark', noMtn:true },
  jungle:   { sky:['#2fa25c','#dcfce7'], sun:'#fffbd1', far:'#3c8f5a', mid:'#2b7448', midHi:'#3f9562', cap:'#2b7448', hill:'#1f8a3f', hill2:'#166a30', tree:'#15803d', tree2:'#065f46', water:['#5fe3d0','#0f8f84'], sand:'#a8865a', grass:['#3fbf5a','#238a3c'], tuft:'#14532d', trees:'jungle', dense:true, extra:'jungle' },
  under:    { sky:['#06395e','#2bb7dd'], sun:false, far:'#0b5577', mid:'#0a6a8f', midHi:'#2e8fb3', cap:'#0a6a8f', hill:'#e9cf8f', hill2:'#d4b574', tree:'#fb7185', tree2:'#f59e0b', water:['#1fa7cf','#0b6f99'], sand:'#f3dba0', grass:['#f3dba0','#e2c27e'], tuft:'#2fa36b', trees:'coral', noMtn:true, noDock:true, extra:'under' },
  rainbow:  { sky:['#ff9fd6','#bfe2ff'], sun:'#ffffff', far:'#d8b4fe', mid:'#c4b5fd', midHi:'#ede9fe', cap:'#ffffff', hill:'#86efac', hill2:'#4ade80', tree:'#f472b6', tree2:'#a78bfa', water:['#a5f3fc','#818cf8'], sand:'#fde68a', grass:['#bbf7d0','#86efac'], tuft:'#f9a8d4', trees:'round', extra:'rainbow' },
  castle:   { sky:['#6d7cf5','#eef0ff'], sun:'#fff7c2', far:'#a5b0e8', mid:'#8a95cf', midHi:'#c3cbf2', cap:'#ffffff', hill:'#5fbf5f', hill2:'#469f4a', tree:'#1f7a3d', tree2:'#14532d', water:['#60a5fa','#1d4ed8'], sand:'#c9b48a', grass:['#7fd36a','#4fae45'], tuft:'#3a8f33', trees:'pine', extra:'castle' },
  dino:     { sky:['#e2a33b','#fff7d6'], sun:'#fff3b0', far:'#b88a5a', mid:'#9b6f45', midHi:'#c4976a', cap:'#9b6f45', hill:'#8bbf4a', hill2:'#6a9e35', tree:'#3f7f2a', tree2:'#7c5a33', water:['#4fd1c5','#0f766e'], sand:'#c9a26b', grass:['#9ccc5a','#6b9e35'], tuft:'#4d7c25', trees:'fern', extra:'dino' },
  pirate:   { sky:['#2b4fa8','#bcd7ff'], sun:'#fff7c2', far:'#5b7bb8', mid:'#4a5f8a', midHi:'#7b8fb5', cap:'#4a5f8a', hill:'#5aa860', hill2:'#3f8a49', tree:'#1f7a3d', tree2:'#7c5a33', water:['#1f6fd1','#0b2e6b'], sand:'#efd7a0', grass:['#efd7a0','#d9b878'], tuft:'#b89350', trees:'palm', extra:'pirate' },
  farm:     { sky:['#f6a83b','#fff4d6'], sun:'#fff3b0', far:'#d7a46a', mid:'#b98049', midHi:'#dba673', cap:'#b98049', hill:'#d1b04a', hill2:'#b38f2e', tree:'#ea580c', tree2:'#b45309', water:['#7cc6e8','#2f7fb0'], sand:'#c79a5a', grass:['#c8b452','#9c8a2e'], tuft:'#7a6a22', trees:'autumn', extra:'farm', noMtn:true },
  blossom:  { sky:['#ffb3d9','#fff3fa'], sun:'#ffffff', far:'#e9b7d6', mid:'#cf9fc0', midHi:'#f1cfe3', cap:'#ffffff', hill:'#9ad98b', hill2:'#77c06a', tree:'#f9a8d4', tree2:'#ec4899', water:['#a5d8ff','#5b9bd5'], sand:'#f4e3c8', grass:['#b6e8a2','#8fcf7b'], tuft:'#f472b6', trees:'round', extra:'blossom' },
  skycity:  { sky:['#3d7bf2','#dfe6ff'], sun:'#ffffff', far:'#b8c6f5', mid:'#9fb0e8', midHi:'#dbe3ff', cap:'#ffffff', hill:'#ffffff', hill2:'#e6ebff', tree:'#7dd3fc', tree2:'#38bdf8', water:['#ffffff','#dbe4ff'], sand:'#ffffff', grass:['#ffffff','#e3e9ff'], tuft:'#c7d2fe', trees:'none', noMtn:true, noDock:true, extra:'skycity' },
  clouds:   { sky:['#9fb1ff','#fff5ff'], sun:'#fff7c2', far:'#ffffff', mid:'#f5f3ff', midHi:'#ffffff', cap:'#ffffff', hill:'#ffffff', hill2:'#f1eaff', tree:'#fde68a', tree2:'#f9a8d4', water:['#ffffff','#e9e3ff'], sand:'#ffffff', grass:['#ffffff','#efe8ff'], tuft:'#ddd6fe', trees:'none', noMtn:true, noDock:true, extra:'clouds' },
  aurora:   { sky:['#020617','#0b3b3a'], sun:'#e0f2fe', far:'#1e293b', mid:'#273449', midHi:'#3b4a63', cap:'#e2e8f0', hill:'#e2e8f0', hill2:'#cbd5e1', tree:'#1f4f43', tree2:'#163a31', water:['#1e3a5f','#0b1a33'], sand:'#cbd5e1', grass:['#f1f5f9','#cbd5e1'], tuft:'#94a3b8', trees:'snowpine', stars:true, extra:'aurora' },
  lava:  { sky:['#6f2410','#ff9a4d'], sun:'#ffe08a', far:'#4a2a1d', mid:'#5c3322', midHi:'#7a4a33', cap:'#ff7a3d', hill:'#45403f', hill2:'#36312f', tree:'#1f1a17', tree2:'#000000', water:['#ffb347','#e0321c'], sand:'#80766f', grass:['#4a4542','#2c2826'], tuft:'#1f1b19', trees:'dead' }
};
/* Place-specific scenery. SCENE_SKY draws behind the mountains; SCENE_EXTRA draws in front of the
   hills/trees but behind the lake and grass (the play area). Each gets (width, height, random, palette). */
const cloudPuff = (x, y, c, col='#fff') => `<g transform="translate(${x} ${y}) scale(${c})"><ellipse cx="0" cy="0" rx="60" ry="22" fill="${col}"/><ellipse cx="-30" cy="-10" rx="30" ry="22" fill="${col}"/><ellipse cx="22" cy="-18" rx="36" ry="28" fill="${col}"/></g>`;
const SCENE_SKY = {
  sunset: (W) => `<circle cx="${W/2}" cy="236" r="120" fill="#ffd166" opacity=".9"/><circle cx="${W/2}" cy="236" r="160" fill="#ff8a3d" opacity=".25"/>`,
  rainbow: (W) => ['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#8b5cf6'].map((c, i) => `<path d="M${W/2 - 620 + i*22} 250 A${620 - i*22} ${210 - i*8} 0 0 1 ${W/2 + 620 - i*22} 250" fill="none" stroke="${c}" stroke-width="22" opacity=".85"/>`).join(''),
  aurora: (W, H, R) => [0,1,2].map(i => `<path class="sc-aurora" style="animation-delay:-${i*2}s" d="M0 ${70+i*28} C${W*.2} ${20+i*30} ${W*.4} ${130+i*20} ${W*.6} ${60+i*25} S${W} ${40+i*30} ${W} ${90+i*24}" fill="none" stroke="${['#34d399','#a78bfa','#22d3ee'][i]}" stroke-width="${28-i*6}" opacity=".45" stroke-linecap="round"/>`).join(''),
  skycity: (W, H, R) => { let s = ''; for (let i = 0; i < 7; i++) s += cloudPuff(R()*W, 200 + R()*60, 1.4 + R(), '#ffffff'); return s; },
  clouds: (W, H, R) => { let s = ''; for (let i = 0; i < 9; i++) s += cloudPuff(R()*W, 150 + R()*100, 1.3 + R()*1.2, i % 3 ? '#ffffff' : '#fdf4ff'); return s; },
  under: (W, H, R) => { let s = `<g opacity=".25">`; for (let i = 0; i < 8; i++) s += `<path d="M${R()*W} 0 L${R()*W} 260" stroke="#e0f2fe" stroke-width="${20+R()*40}"/>`; return s + `</g>`; }
};
const SCENE_EXTRA = {
  town: (W, H, R) => { let s = ''; let x = 0;
    while (x < W){ const w = 50 + R()*70, h = 70 + R()*130, c = ['#93c5fd','#a5b4fc','#fca5a5','#fde68a','#86efac','#c4b5fd','#f9a8d4'][Math.floor(R()*7)];
      s += `<rect x="${x}" y="${246-h}" width="${w}" height="${h}" fill="${c}" stroke="#475569" stroke-width="2" opacity=".75"/>`;
      for (let yy = 246-h+10; yy < 236; yy += 18) for (let xx = x+8; xx < x+w-10; xx += 16) s += `<rect x="${xx}" y="${yy}" width="8" height="10" fill="#fff" opacity=".6"/>`;
      x += w + 4 + R()*20; }
    return s + `<rect x="0" y="244" width="${W}" height="10" fill="#9ca3af"/>`; },
  sunset: (W, H, R) => { let s = ''; for (let i = 0; i < 4; i++) s += `<path d="M${200+i*380} 200 l12 -6 l12 6 M${230+i*380} 180 l9 -5 l9 5" stroke="#4a2545" stroke-width="3" fill="none"/>`; return s; },
  tropic: (W, H, R) => { let s = ''; [[300,1],[900,1.4],[1450,.9]].forEach(([x, k]) => { s += `<ellipse cx="${x}" cy="246" rx="${150*k}" ry="${40*k}" fill="#f6dc8f"/><ellipse cx="${x}" cy="240" rx="${120*k}" ry="${30*k}" fill="#3fbf6b"/>`; }); s += `<g transform="translate(1100 244)"><path d="M-40 0 L40 0 L30 12 L-30 12Z" fill="#8b5a2b"/><path d="M0 0 V-40" stroke="#5b3a1a" stroke-width="3"/><path d="M2 -38 L26 -8 L2 -8Z" fill="#fff"/></g>`; return s; },
  forest: (W, H, R) => { let s = ''; for (let i = 0; i < 14; i++){ const x = R()*W, y = 240 + R()*10; s += `<g transform="translate(${x} ${y})"><rect x="-3" y="-12" width="6" height="12" fill="#f8fafc"/><ellipse cx="0" cy="-14" rx="12" ry="8" fill="#ef4444"/><circle cx="-4" cy="-16" r="2" fill="#fff"/><circle cx="4" cy="-14" r="1.6" fill="#fff"/></g>`; } for (let i = 0; i < 24; i++) s += `<circle class="sc-firefly" style="animation-delay:-${(R()*4).toFixed(1)}s" cx="${R()*W}" cy="${120+R()*120}" r="2.5" fill="#fef08a"/>`; return s; },
  desert: (W, H, R) => `<path d="M260 246 L380 120 L500 246Z" fill="#e2b46c"/><path d="M380 120 L500 246 L400 246Z" fill="#c9954d"/><path d="M560 246 L640 160 L720 246Z" fill="#e2b46c"/><path d="M640 160 L720 246 L655 246Z" fill="#c9954d"/><g transform="translate(1300 246)"><ellipse cx="0" cy="0" rx="90" ry="12" fill="#2fb8d8"/><path d="M-50 0 Q-46 -40 -40 -70" stroke="#7c5a33" stroke-width="5" fill="none"/>${[-60,-20,20,60].map(a => `<path d="M-40 -70 q${Math.cos(a*Math.PI/180)*22} -8 ${Math.cos(a*Math.PI/180)*36} 12" stroke="#2f9e54" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('')}</g><g transform="translate(980 230)"><ellipse cx="0" cy="0" rx="26" ry="16" fill="#c08a4a"/><path d="M-10 -12 q4 -14 12 -2 M8 -14 q4 -12 12 0" fill="#c08a4a"/><path d="M20 -8 q14 -10 18 -24" stroke="#c08a4a" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-16 14 v14 M-4 14 v14 M8 14 v14 M18 14 v14" stroke="#a87438" stroke-width="5"/></g>`,
  waterpark: (W, H, R) => { const slide = (x, c, flip) => `<g transform="translate(${x} 0) scale(${flip ? -1 : 1} 1)"><rect x="-6" y="90" width="12" height="160" fill="#94a3b8"/><rect x="40" y="120" width="10" height="130" fill="#94a3b8"/><rect x="-24" y="80" width="56" height="14" rx="4" fill="#64748b"/><path d="M20 90 C120 100 20 150 110 170 S60 230 160 246" stroke="${c}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M20 90 C120 100 20 150 110 170 S60 230 160 246" stroke="#fff" stroke-width="4" fill="none" stroke-dasharray="10 14" opacity=".7"/></g>`;
    return slide(180, '#f43f5e') + slide(700, '#facc15', true) + slide(1250, '#22c55e') + `<rect x="840" y="226" width="300" height="24" rx="12" fill="#5ee7ff" stroke="#fff" stroke-width="4"/><g class="sc-bob"><circle cx="900" cy="236" r="9" fill="none" stroke="#f97316" stroke-width="5"/><circle cx="1060" cy="238" r="9" fill="none" stroke="#a855f7" stroke-width="5"/></g>${[400,1550,1700].map(x => `<g transform="translate(${x} 246)"><path d="M0 0 V-60" stroke="#475569" stroke-width="3"/><path d="M-30 -56 Q0 -76 30 -56Z" fill="${['#f43f5e','#3b82f6','#facc15'][x%3]}"/></g>`).join('')}`; },
  jungle: (W, H, R) => `<path d="M780 40 Q760 120 800 246 L860 246 Q830 140 850 40Z" fill="#7dd3fc" opacity=".8"/><path d="M790 40 L795 246 M815 40 L822 246 M838 40 L845 246" stroke="#fff" stroke-width="3" opacity=".7" class="sc-shimmer"/><path d="M700 60 Q750 40 790 40 L850 40 Q910 40 940 60 L940 90 L700 90Z" fill="#57534e"/>${[1,2,3,4,5].map(i => `<path d="M${R()*W} 0 q${(R()-.5)*30} 80 ${(R()-.5)*20} ${120+R()*80}" stroke="#2f7a3a" stroke-width="4" fill="none"/>`).join('')}<g transform="translate(1350 150)"><circle cx="0" cy="0" r="12" fill="#7c4a24"/><circle cx="0" cy="3" r="7" fill="#d4a373"/><path d="M0 12 q20 20 0 40" stroke="#7c4a24" stroke-width="4" fill="none"/></g>`,
  under: (W, H, R) => { let s = ''; for (let i = 0; i < 26; i++){ const x = R()*W; s += `<path d="M${x} 250 q-8 -30 0 -60 q8 -30 0 -60" stroke="${R() < .5 ? '#16a34a' : '#22c55e'}" stroke-width="6" fill="none" class="sc-sway" style="animation-delay:-${(R()*3).toFixed(1)}s"/>`; }
    for (let i = 0; i < 10; i++){ const x = R()*W, y = 60 + R()*160, c = ['#fb923c','#facc15','#f472b6','#60a5fa'][i%4]; s += `<g class="sc-fish" style="animation-duration:${(20+R()*20).toFixed(0)}s;animation-delay:-${(R()*20).toFixed(0)}s"><g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="16" ry="9" fill="${c}"/><path d="M14 0 l12 -8 v16z" fill="${c}"/><circle cx="-8" cy="-2" r="2" fill="#000"/></g></g>`; }
    for (let i = 0; i < 30; i++) s += `<circle class="sc-bubble" style="animation-delay:-${(R()*6).toFixed(1)}s" cx="${R()*W}" cy="${100+R()*150}" r="${2+R()*5}" fill="none" stroke="#e0f2fe" stroke-width="1.5"/>`;
    return s + `<g transform="translate(1400 238)"><path d="M-40 10 L-30 -20 L30 -20 L40 10Z" fill="#a16207"/><rect x="-32" y="-34" width="64" height="16" rx="6" fill="#ca8a04"/><circle cx="0" cy="-26" r="4" fill="#fde047"/></g>`; },
  rainbow: (W, H, R) => { let s = ''; for (let i = 0; i < 8; i++) s += cloudPuff(R()*W, 200 + R()*40, .8, '#fff'); for (let i = 0; i < 20; i++) s += `<path class="sc-firefly" style="animation-delay:-${(R()*4).toFixed(1)}s" d="M${R()*W} ${40+R()*180} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#fde047"/>`; return s; },
  castle: (W) => { const x = W/2 - 160, t = (tx, h, c) => `<rect x="${tx}" y="${246-h}" width="44" height="${h}" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/><path d="M${tx-6} ${246-h} L${tx+22} ${246-h-40} L${tx+50} ${246-h}Z" fill="${c}"/><path d="M${tx+22} ${246-h-40} v-18" stroke="#334155" stroke-width="2"/><path d="M${tx+22} ${246-h-58} l16 6 l-16 6z" fill="#facc15"/>`;
    return `<rect x="${x+40}" y="146" width="240" height="100" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>${[0,1,2,3,4,5,6,7].map(i => `<rect x="${x+42+i*30}" y="134" width="16" height="14" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>`).join('')}<path d="M${x+130} 246 v-50 a30 30 0 0 1 60 0 v50z" fill="#7c4a24"/>` + t(x, 150, '#ef4444') + t(x+276, 150, '#ef4444') + t(x+138, 200, '#3b82f6') + `<path d="M${x-120} 246 h560" stroke="#60a5fa" stroke-width="8" opacity=".6"/>`; },
  dino: (W, H, R) => `<path d="M1200 246 L1300 110 L1340 120 L1420 246Z" fill="#6b4b33"/><path d="M1300 110 q10 -30 30 -60 q10 30 10 70" fill="#ef4444" opacity=".7" class="sc-firefly"/><g transform="translate(420 190)"><ellipse cx="0" cy="20" rx="60" ry="28" fill="#4d7c0f"/><path d="M40 6 Q90 -60 120 -70 q12 -4 12 8 q-6 10 -20 8 Q100 -30 60 14Z" fill="#4d7c0f"/><circle cx="122" cy="-64" r="2.5" fill="#000"/><path d="M-60 20 q-50 0 -80 -10" stroke="#4d7c0f" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M-30 44 v12 M-6 44 v12 M20 44 v12 M38 44 v12" stroke="#3f6212" stroke-width="10" stroke-linecap="round"/></g><g transform="translate(900 120) scale(.6)"><path d="M0 0 l40 -10 l20 10 l40 -30 l-20 30 l40 6 l-60 10 l-20 14z" fill="#7c2d12" opacity=".7"/></g><g transform="translate(1000 230)"><ellipse cx="0" cy="0" rx="18" ry="22" fill="#f5f5f4"/><path d="M-12 -6 l6 4 l6 -6 l6 6 l6 -4" stroke="#a8a29e" stroke-width="2" fill="none"/></g>`,
  pirate: (W) => `<g transform="translate(1250 230)"><path d="M-120 0 L120 0 L95 32 L-95 32Z" fill="#7c4a24"/><rect x="-120" y="-6" width="240" height="8" fill="#5b3418"/><path d="M-30 0 V-150 M50 0 V-120" stroke="#3f2a1d" stroke-width="6"/><path d="M-26 -140 Q20 -110 -26 -60Z" fill="#f8fafc"/><path d="M54 -112 Q90 -90 54 -50Z" fill="#f8fafc"/><path d="M-30 -150 h-30 v18 h30z" fill="#111827"/><circle cx="-45" cy="-141" r="4" fill="#fff"/></g><g transform="translate(300 246)"><path d="M-30 0 L-20 -26 L20 -26 L30 0Z" fill="#a16207"/><rect x="-24" y="-38" width="48" height="14" rx="5" fill="#ca8a04"/><circle cx="0" cy="-30" r="4" fill="#fde047"/><text x="40" y="-6" font-size="22">💰</text></g><text x="700" y="240" font-size="40">❌</text>`,
  farm: (W) => `<g transform="translate(300 246)"><rect x="-80" y="-90" width="160" height="90" fill="#b91c1c"/><path d="M-96 -88 L0 -150 L96 -88Z" fill="#7f1d1d"/><path d="M-30 0 v-60 h60 v60" fill="#fef3c7"/><path d="M-30 -60 L30 0 M30 -60 L-30 0" stroke="#b91c1c" stroke-width="5"/><rect x="-14" y="-125" width="28" height="22" fill="#fef3c7"/></g><g transform="translate(560 246)"><rect x="-24" y="-130" width="48" height="130" rx="22" fill="#94a3b8"/><path d="M-24 -110 a24 24 0 0 1 48 0" fill="#64748b"/></g>${[900,1040,1180,1320,1460,1600].map((x,i) => `<g transform="translate(${x} 240)"><circle cx="0" cy="0" r="${12+i%3*4}" fill="#f97316"/><path d="M0 -${12+i%3*4} v-8" stroke="#166534" stroke-width="4"/></g>`).join('')}<g transform="translate(760 240)"><path d="M0 0 V-60 M-26 -44 H26" stroke="#7c4a24" stroke-width="5"/><circle cx="0" cy="-66" r="10" fill="#fde68a"/><path d="M-10 -72 h20 l-4 -8 h-12z" fill="#a16207"/></g>`,
  blossom: (W, H, R) => { let s = `<g transform="translate(${W/2} 246)"><path d="M-140 0 Q0 -90 140 0" stroke="#dc2626" stroke-width="12" fill="none"/><path d="M-110 -24 V0 M110 -24 V0" stroke="#dc2626" stroke-width="10"/></g><g transform="translate(1400 246)"><rect x="-40" y="-60" width="80" height="60" fill="#fef3c7"/><path d="M-60 -60 L0 -100 L60 -60Z" fill="#b91c1c"/><path d="M-50 -82 L0 -112 L50 -82" stroke="#b91c1c" stroke-width="8" fill="none"/></g>`;
    for (let i = 0; i < 40; i++) s += `<ellipse class="sc-petal" style="animation-delay:-${(R()*8).toFixed(1)}s;animation-duration:${(6+R()*6).toFixed(1)}s" cx="${R()*W}" cy="${R()*60}" rx="4" ry="2.5" fill="#f9a8d4"/>`; return s; },
  skycity: (W, H, R) => { let s = ''; const tower = (x, h, c, w=60) => `<rect x="${x}" y="${246-h}" width="${w}" height="${h}" rx="6" fill="${c}"/>${Array.from({length:Math.floor(h/24)}, (_, j) => `<rect x="${x+10}" y="${256-h+j*24}" width="${w-20}" height="8" rx="3" fill="#e0f2fe" opacity=".8"/>`).join('')}`;
    [[120,150,'#6366f1'],[200,210,'#0ea5e9',70],[290,120,'#a855f7'],[560,180,'#14b8a6'],[640,240,'#3b82f6',80],[740,140,'#6366f1'],[1080,200,'#0ea5e9'],[1160,150,'#a855f7',70],[1500,230,'#3b82f6',80],[1600,160,'#14b8a6']].forEach(([x,h,c,w]) => s += tower(x,h,c,w));
    s += `<path d="M640 6 V0" stroke="#fff"/><circle cx="680" cy="0" r="0"/>`;
    for (let i = 0; i < 6; i++){ const x = R()*W, y = 60 + R()*100; s += `<g class="sc-fish" style="animation-duration:${(30+R()*30).toFixed(0)}s;animation-delay:-${(R()*30).toFixed(0)}s"><g transform="translate(${x} ${y})"><ellipse cx="0" cy="0" rx="22" ry="7" fill="#e2e8f0"/><ellipse cx="0" cy="-5" rx="9" ry="6" fill="#7dd3fc"/></g></g>`; }
    s += `<path d="M380 170 Q480 140 560 170" stroke="#e0e7ff" stroke-width="6" fill="none"/><path d="M820 160 Q950 120 1080 160" stroke="#e0e7ff" stroke-width="6" fill="none"/>`;
    for (let i = 0; i < 6; i++) s += cloudPuff(R()*W, 250, 1.6, '#ffffff'); return s; },
  clouds: (W, H, R) => { let s = ''; for (let i = 0; i < 10; i++) s += cloudPuff(R()*W, 250 + R()*10, 1.2 + R()*.8, '#ffffff'); s += `<g transform="translate(${W/2 - 400} 246)"><rect x="-90" y="-130" width="180" height="130" fill="#fdf4ff" stroke="#e9d5ff" stroke-width="3"/>${[-80,-40,0,40,80].map(x => `<rect x="${x-10}" y="-146" width="20" height="18" fill="#fdf4ff" stroke="#e9d5ff" stroke-width="3"/>`).join('')}<path d="M-120 -130 L-90 -190 L-60 -130Z M60 -130 L90 -190 L120 -130Z" fill="#fde68a"/><path d="M-20 0 v-50 a20 20 0 0 1 40 0 v50z" fill="#f9a8d4"/></g>`;
    for (let i = 0; i < 14; i++) s += `<path class="sc-firefly" style="animation-delay:-${(R()*4).toFixed(1)}s" d="M${R()*W} ${40+R()*140} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#fde68a"/>`; return s; },
  aurora: (W, H, R) => `<g transform="translate(420 246)"><path d="M-50 0 A50 40 0 0 1 50 0Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/><path d="M-30 -14 h60 M-40 -26 h80" stroke="#cbd5e1" stroke-width="2"/><path d="M-10 0 v-16 a10 10 0 0 1 20 0 v16" fill="#475569"/></g><g transform="translate(1300 240)"><ellipse cx="0" cy="0" rx="18" ry="20" fill="#f8fafc"/><circle cx="0" cy="-22" r="12" fill="#f8fafc"/><circle cx="-4" cy="-24" r="1.6"/><circle cx="4" cy="-24" r="1.6"/><path d="M-4 -18 l4 4 l4 -4" fill="#f97316"/></g>`
};
function seeded(n){ return () => { n = (n * 1664525 + 1013904223) % 4294967296; return n / 4294967296; }; }
/* ---------- time of day: the sky and light follow the real clock ---------- */
function dayPhase(){ const h = new Date().getHours(); return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 20 ? 'sunset' : 'night'; }
const PHASE = {
  dawn:     { name:'Sunrise',   icon:'🌅', sky:['#2f3c8f','#c86a9a','#ffb27a'], sun:'#ffd59e', sunX:.16, sunY:215, sunR:46, cloud:'#ffd0c0', tint:'#ffa58a', tintOp:.5 },
  morning:  { name:'Morning',   icon:'🌤️', sky:['#3aa6f5','#8fd3ff','#e6f7ff'], sun:'#fff8d6', sunX:.3, sunY:110, sunR:32, cloud:'#ffffff', tint:null },
  afternoon:{ name:'Afternoon', icon:'☀️', sky:['#1b7fe6','#58b8ff','#cbeaff'], sun:'#fffbe8', sunX:.62, sunY:62, sunR:30, cloud:'#ffffff', tint:'#ffe7b0', tintOp:.16 },
  sunset:   { name:'Sunset',    icon:'🌇', sky:['#2a1b5e','#c43c78','#ff9a4a'], sun:'#ffc46b', sunX:.84, sunY:222, sunR:52, cloud:'#ffb08f', tint:'#ff8550', tintOp:.55 },
  night:    { name:'Night',     icon:'🌙', sky:['#040720','#121a52','#28377f'], moon:true, cloud:'#7f8bc4', tint:'#26338c', tintOp:.62 }
};
const FIXED_SKY = ['night','space','under','aurora','lava'];
// a light layer over a whole scene (items and heroes too) so everything is lit by the time of day
function todLayer(cls, glows){
  const ph = PHASE[dayPhase()], wrap = el('div',{class:'tod-layer ' + (cls || '')});
  if (ph.tint) wrap.append(el('div',{class:'tod-tint', style:`background:${ph.tint};opacity:${document.documentElement.classList.contains('lowfx') ? (ph.tintOp * .2).toFixed(2) : ph.tintOp}`}));
  if (dayPhase() === 'sunset' || dayPhase() === 'dawn') wrap.append(el('div',{class:'tod-rays ' + dayPhase()}));
  if (glows && (dayPhase() === 'night' || dayPhase() === 'sunset')){
    const g = el('div',{class:'tod-glows'});
    glows.forEach(([x, y, r]) => g.append(el('i',{style:`left:${x - r}px;top:${y - r}px;width:${r*2}px;height:${r*2}px;opacity:${dayPhase() === 'night' ? 1 : .55}`})));
    wrap.append(g);
  }
  if (dayPhase() === 'night'){ const f = el('div',{class:'tod-flies'}); for (let i = 0; i < 18; i++) f.append(el('i',{style:`left:${(i*53)%100}%;top:${30 + (i*37)%65}%;animation-delay:-${(i*.7).toFixed(1)}s;animation-duration:${(5 + i%5)}s`})); wrap.append(f); }
  return wrap;
}
function todBadge(place){ const ph = PHASE[dayPhase()]; return el('div',{class:'tod-badge ' + dayPhase()}, `${ph.icon} ${ph.name}`); }
function sceneSVG(themeId){
  const P0 = SCENE_PAL[themeId] || SCENE_PAL.meadow, PH = PHASE[dayPhase()], live = !FIXED_SKY.includes(themeId);
  const P = live ? Object.assign({}, P0, { sky: dayPhase() === 'morning' ? P0.sky : PH.sky, stars: dayPhase() === 'night', sun: P0.sun === false ? false : (PH.moon ? false : PH.sun) }) : P0, R = seeded([...themeId].reduce((a, c) => a + c.charCodeAt(0), 7));
  const W = WORLD_W, H = WORLD_H;
  // a jagged ridge line across the whole width
  const ridge = (base, minH, maxH, step) => { let d = `M0 ${base}`; for (let x = 0; x <= W + step; x += step) d += ` L${x} ${base - minH - R() * (maxH - minH)} L${x + step / 2} ${base - minH * 0.5 - R() * minH}`; return d + ` L${W} ${base + 40} L0 ${base + 40}Z`; };
  const hills = (base, amp) => { let d = `M0 ${base}`; for (let x = 0; x <= W; x += 150) d += ` Q${x + 75} ${base - amp - R() * amp} ${x + 150} ${base}`; return d + ` L${W} ${base + 60} L0 ${base + 60}Z`; };
  const tree = (x, y, s) => {
    if (P.trees === 'palm') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q4 -30 2 -58" stroke="${P.tree2}" stroke-width="5" fill="none"/>${[-60,-20,20,60,100].map(a => `<path d="M2 -58 q${Math.cos(a*Math.PI/180)*26} ${-10+Math.sin(a*Math.PI/180)*6} ${Math.cos(a*Math.PI/180)*40} 14" stroke="${P.tree}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    if (P.trees === 'lolly') return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-2" y="-40" width="4" height="40" fill="#fff"/><circle cx="0" cy="-48" r="16" fill="${R() < .5 ? P.tree : '#f472b6'}"/><path d="M-10 -48 a10 10 0 1 1 10 10" stroke="#fff" stroke-width="3" fill="none"/></g>`;
    if (P.trees === 'crystal') return `<g transform="translate(${x} ${y}) scale(${s})" opacity=".9"><path d="M0 0 L-8 -30 L0 -52 L8 -30Z" fill="${P.tree}"/><path d="M0 -52 L8 -30 L0 0Z" fill="${P.tree2}"/></g>`;
    if (P.trees === 'none') return '';
    if (P.trees === 'cactus') return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-6" y="-50" width="12" height="50" rx="6" fill="${P.tree}"/><path d="M-6 -26 h-10 v-14" stroke="${P.tree}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M6 -32 h9 v-12" stroke="${P.tree}" stroke-width="9" fill="none" stroke-linecap="round"/><rect x="-2" y="-46" width="3" height="40" fill="${P.tree2}" opacity=".5"/></g>`;
    if (P.trees === 'oak' || P.trees === 'round' || P.trees === 'autumn'){ const c = R() < .5 ? P.tree : P.tree2;
      return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-22" width="8" height="24" fill="#7a4b2a"/><circle cx="0" cy="-40" r="22" fill="${c}"/><circle cx="-14" cy="-30" r="14" fill="${c}"/><circle cx="14" cy="-30" r="14" fill="${c}"/><circle cx="-6" cy="-48" r="8" fill="#fff" opacity=".18"/></g>`; }
    if (P.trees === 'jungle') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q-3 -34 1 -64" stroke="#6b4423" stroke-width="6" fill="none"/>${[-70,-35,0,35,70,110,145].map(a => `<path d="M1 -64 q${Math.cos(a*Math.PI/180)*22} ${-14+Math.sin(a*Math.PI/180)*8} ${Math.cos(a*Math.PI/180)*44} 10" stroke="${a%2?P.tree:P.tree2}" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    if (P.trees === 'fern') return `<g transform="translate(${x} ${y}) scale(${s})">${[-50,-25,0,25,50].map(a => `<path d="M0 0 q${a*.4} -30 ${a*.9} -44" stroke="${P.tree}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}</g>`;
    if (P.trees === 'coral') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 V-30 M0 -16 L-12 -30 M0 -22 L10 -38 M-12 -30 V-40" stroke="${R() < .5 ? P.tree : P.tree2}" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
    if (P.trees === 'dead') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 L0 -40 M0 -26 L-12 -38 M0 -32 L10 -44" stroke="${P.tree}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
    const snow = P.trees === 'snowpine' ? `<path d="M0 -62 L-8 -48 L8 -48Z M-12 -34 L12 -34 L0 -44Z" fill="#fff"/>` : '';
    return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-8" width="6" height="10" fill="#7a4b2a"/><path d="M0 -62 L-14 -36 L-7 -36 L-20 -12 L20 -12 L7 -36 L14 -36Z" fill="${P.tree}"/><path d="M0 -62 L14 -36 L7 -36 L20 -12 L0 -12Z" fill="${P.tree2}" opacity=".55"/>${snow}</g>`;
  };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/>${P.sky[2] ? `<stop offset=".6" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/>` : `<stop offset="1" stop-color="${P.sky[1]}"/>`}</linearGradient>
    <linearGradient id="sc-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.water[0]}"/><stop offset="1" stop-color="${P.water[1]}"/></linearGradient>
    <linearGradient id="sc-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.grass[0]}"/><stop offset="1" stop-color="${P.grass[1]}"/></linearGradient>
    <radialGradient id="sc-sun"><stop offset="0" stop-color="${P.sun}"/><stop offset=".35" stop-color="${P.sun}" stop-opacity=".9"/><stop offset="1" stop-color="${P.sun}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sc-sky)"/>`;
  if (P.stars) for (let i = 0; i < 90; i++) s += `<circle cx="${R() * W}" cy="${R() * 180}" r="${(R() * 1.4 + .4).toFixed(1)}" fill="#fff" opacity="${(R() * .6 + .3).toFixed(2)}"/>`;
  if (P.sun && live){ const sx = W * PH.sunX, sy = PH.sunY, sr = PH.sunR; s += `<circle cx="${sx}" cy="${sy}" r="${sr * 4.5}" fill="url(#sc-sun)"/><circle cx="${sx}" cy="${sy}" r="${sr}" fill="${P.sun}"/>`; }
  else if (P.sun) s += `<circle cx="1480" cy="78" r="90" fill="url(#sc-sun)"/><circle cx="1480" cy="78" r="30" fill="${P.sun}"/>`;
  if (live && PH.moon) s += `<circle cx="${W*.78}" cy="70" r="110" fill="#c7d2fe" opacity=".12"/><circle cx="${W*.78}" cy="70" r="30" fill="#f8fafc"/><circle cx="${W*.78 - 9}" cy="64" r="5" fill="#cbd5e1"/><circle cx="${W*.78 + 8}" cy="80" r="4" fill="#cbd5e1"/>`;
  if (P.extra && SCENE_SKY[P.extra]) s += SCENE_SKY[P.extra](W, H, R, P);
  // drifting clouds
  for (let i = 0; i < (P.sun === false ? 0 : 6); i++){ const x = R() * W, y = 30 + R() * 90, c = R() * .5 + .8;
    s += `<g class="sc-cloud" style="animation-duration:${(60 + R() * 60).toFixed(0)}s;animation-delay:-${(R() * 60).toFixed(0)}s" opacity="${P.stars ? .35 : .9}"><g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${c.toFixed(2)})" fill="${live ? PH.cloud : '#fff'}"><ellipse cx="0" cy="0" rx="46" ry="18"/><ellipse cx="-24" cy="-8" rx="24" ry="18"/><ellipse cx="16" cy="-14" rx="28" ry="22"/></g></g>`; }
  // far mountains, near mountains with highlights and caps
  if (!P.noMtn) s += `<path d="${ridge(232, 60, 140, 160)}" fill="${P.far}"/>`;
  const peaks = [];
  if (!P.noMtn) for (let x = 60; x < W; x += 260 + R() * 120) peaks.push([x, 110 + R() * 60, 120 + R() * 80]);
  peaks.forEach(([x, top, half]) => {
    s += `<path d="M${x - half} 250 L${x} ${top} L${x + half} 250Z" fill="${P.mid}"/><path d="M${x} ${top} L${x + half} 250 L${x + half * .2} 250Z" fill="${P.midHi}" opacity=".55"/>`;
    s += `<path d="M${x} ${top} L${x - half * .22} ${top + 30} L${x - half * .08} ${top + 24} L${x + half * .06} ${top + 34} L${x + half * .22} ${top + 30}Z" fill="${P.cap}" opacity=".95"/>`;
  });
  // hills with trees
  s += `<path d="${hills(238, 26)}" fill="${P.hill2}"/><path d="${hills(252, 18)}" fill="${P.hill}"/>`;
  for (let i = 0; i < (P.dense ? 90 : 46); i++){ const x = R() * W, y = 226 + R() * 30; s += tree(x.toFixed(0), y.toFixed(0), (.55 + R() * .5).toFixed(2)); }
  if (P.extra && SCENE_EXTRA[P.extra]) s += SCENE_EXTRA[P.extra](W, H, R, P);
  // lake with shimmer, a dock and a float ring
  s += `<rect x="0" y="246" width="${W}" height="32" fill="url(#sc-water)"/>`;
  for (let i = 0; i < 28; i++) s += `<rect class="sc-shimmer" style="animation-delay:-${(R() * 3).toFixed(1)}s" x="${(R() * W).toFixed(0)}" y="${(250 + R() * 24).toFixed(0)}" width="${(16 + R() * 34).toFixed(0)}" height="2.5" rx="1.5" fill="#fff" opacity=".7"/>`;
  if (!P.noDock) s += `<g transform="translate(250 252)"><rect x="0" y="0" width="120" height="9" fill="#a0693c"/><rect x="0" y="-4" width="120" height="5" fill="#c08350"/>${[6, 40, 74, 108].map(px => `<rect x="${px}" y="6" width="6" height="18" fill="#7a4b2a"/>`).join('')}</g>`;
  if (!P.noDock) s += `<g class="sc-bob"><circle cx="1180" cy="262" r="10" fill="none" stroke="#ff5a5a" stroke-width="6"/><circle cx="1180" cy="262" r="10" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="7 8"/></g>`;
  // sandy shore and grass
  let shore = `M0 274`; for (let x = 0; x <= W; x += 120) shore += ` Q${x + 60} ${266 + R() * 8} ${x + 120} 274`;
  s += `<path d="${shore} L${W} 296 L0 296Z" fill="${P.sand}"/>`;
  let edge = `M0 286`; for (let x = 0; x <= W; x += 90) edge += ` Q${x + 45} ${278 + R() * 10} ${x + 90} 286`;
  s += `<path d="${edge} L${W} ${H} L0 ${H}Z" fill="url(#sc-grass)"/>`;
  for (let i = 0; i < 160; i++){ const x = R() * W, y = 300 + R() * (H - 300); s += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l-3 -9 M${x.toFixed(0)} ${y.toFixed(0)} l1 -11 M${x.toFixed(0)} ${y.toFixed(0)} l4 -8" stroke="${P.tuft}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`; }
  if (P.extra === 'town'){ for (let x = 0; x < W; x += 40) s += `<path d="M${x} 296 V${H}" stroke="#a8a29e" stroke-width="1.5" opacity=".6"/>`; for (let y = 310; y < H; y += 30) s += `<path d="M0 ${y} H${W}" stroke="#a8a29e" stroke-width="1.5" opacity=".6"/>`; }
  return s + '</svg>';
}
// tall grass along the front edge, drawn over everything so things look like they stand in it
function frontGrassSVG(themeId){
  const P = SCENE_PAL[themeId] || SCENE_PAL.meadow, R = seeded(99);
  if (P.extra === 'town') return `<svg xmlns="http://www.w3.org/2000/svg" width="${WORLD_W}" height="44" viewBox="0 0 ${WORLD_W} 44" preserveAspectRatio="none"><rect y="24" width="${WORLD_W}" height="20" fill="#9ca3af"/><rect y="22" width="${WORLD_W}" height="4" fill="#78716c"/></svg>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${WORLD_W}" height="44" viewBox="0 0 ${WORLD_W} 44" preserveAspectRatio="none">`;
  for (let x = 0; x < WORLD_W; x += 7){ const h = 18 + R() * 24, lean = (R() - .5) * 14;
    s += `<path d="M${x} 44 Q${x + lean / 2} ${44 - h / 2} ${x + lean} ${44 - h}" stroke="${R() < .5 ? P.grass[1] : P.tuft}" stroke-width="5" fill="none" stroke-linecap="round"/>`; }
  return s + '</svg>';
}

function worldOf(k){
  const D = DB.kids[k];
  D.world = Object.assign({ theme:'meadow', themes:['meadow'], items:[], nextId:1 }, D.world || {});
  return D.world;
}
function friendItems(k){
  const D = DB.kids[k], all = k === 'dev' ? TRACKS.son.rewards.concat(TRACKS.daughter.rewards) : TRACKS[trackOf(k)].rewards;
  return (D.collection || []).map(n => { const r = all.find(x => x[1] === n); return r ? ['friends','f_'+n, r[0], n, 0] : null; }).filter(Boolean);
}

let worldSel = null, worldCat = 'home', worldZoom = 1;
function screenWorld(visitKid){
  const owner = visitKid || kid, readOnly = !!visitKid && visitKid !== kid;
  const W = worldOf(owner), theme = WORLD_THEMES[W.theme] || WORLD_THEMES.meadow;
  const visitIds = playerIds(false).filter(id => id !== kid && id !== owner).slice(0, 4);
  const themeId = WORLD_THEMES[W.theme] ? W.theme : 'meadow';
  const stage = el('div',{class:'world-stage', style:`width:${WORLD_W}px;height:${WORLD_H}px;background:${(SCENE_PAL[themeId] || SCENE_PAL.meadow).sky[1]}`});
  stage.append(el('div',{class:'world-scene', html: sceneSVG(themeId)}), el('div',{class:'world-front', html: frontGrassSVG(themeId)}));
  stage.append(el('div',{class:'world-ground', style:`top:${GROUND_Y - 20}px`}));
  // the owner's avatar lives in their world and wanders around (see the life loop at the end)
  const avBody = el('div',{class:'av-body', html: avatarSVG(DB.kids[owner].avatar, 120)});
  const bubble = el('div',{class:'av-bubble'});
  const av = el('div',{class:'world-avatar'}, bubble, avBody);
  let ax = 60;
  av.style.left = ax + 'px'; av.style.top = (GROUND_Y - 110) + 'px';
  stage.append(av);
  const nodes = {};
  const place = it => {
    const n = el('div',{class:'world-item' + (worldSel === it.id ? ' sel' : '') + (TOWN_SVG[it.k] ? ' drawn' : ''), 'data-id':it.id}, TOWN_SVG[it.k] ? null : it.e);
    if (TOWN_SVG[it.k]) n.innerHTML = TOWN_SVG[it.k];
    n.style.left = it.x + 'px'; n.style.top = it.y + 'px';
    n.style.fontSize = Math.round(64 * it.s) + 'px';
    n.style.transform = it.f ? 'scaleX(-1)' : '';
    n.style.zIndex = it.z || 1;
    // animals and friends wander around a little, like pets
    const cat = (WORLD_BY_ID[it.k] || ['friends'])[0];
    if (cat === 'animal' || cat === 'friends'){ n.classList.add('wander'); n.style.setProperty('--wd', (6 + (it.id % 5)) + 's'); n.style.setProperty('--wdl', '-' + (it.id % 7) + 's'); }
    if (/^inf_/.test(it.k)){ n.classList.add('inflatable'); n.style.setProperty('--wdl', '-' + (it.id % 4) + 's'); } // blow-ups sway on their air base
    if (cat === 'treasure' && TREASURE_BY_ID[it.k] && (TREASURE_BY_ID[it.k].r === 'legendary' || TREASURE_BY_ID[it.k].r === 'mythic')){ n.classList.add(TREASURE_BY_ID[it.k].r === 'mythic' ? 'mythic' : 'legend', 'fx-pulse'); n.style.setProperty('--wdl', '-' + (it.id % 9) + 's'); }
    if (cat === 'legendary' || cat === 'mythic'){ n.classList.add(cat === 'mythic' ? 'mythic' : 'legend', 'fx-' + (LEGEND_FX[it.k] || 'pulse')); n.style.setProperty('--wdl', '-' + (it.id % 9) + 's'); }
    if (!readOnly) attachDrag(n, it);
    nodes[it.id] = n; stage.append(n);
  };
  W.items.forEach(place);
  if (!FIXED_SKY.includes(themeId)) stage.append(todLayer('world'));
  const scroller = el('div',{class:'world-scroll'});
  const zw = zoomable({ view: scroller, content: stage, W: WORLD_W, H: WORLD_H, start: worldZoom, max: 2.5, fit: 'width', onZoom: z => { worldZoom = z; } });
  if (!FIXED_SKY.includes(themeId) && zw.frame) zw.frame.append(todBadge());

  // selection toolbar
  const tools = el('div',{class:'world-tools hidden'});
  const selected = () => W.items.find(i => i.id === worldSel);
  const refreshSel = () => {
    Object.values(nodes).forEach(n => n.classList.toggle('sel', +n.dataset.id === worldSel));
    tools.classList.toggle('hidden', !selected());
  };
  const act = fn => () => { const it = selected(); if (!it) return; fn(it); save(); const n = nodes[it.id];
    if (n){ n.style.fontSize = Math.round(64*it.s)+'px'; n.style.transform = it.f ? 'scaleX(-1)' : ''; n.style.zIndex = it.z || 1; } };
  tools.append(
    el('button',{class:'btn small', onclick:act(it => it.s = Math.min(4, +(it.s + 0.25).toFixed(2)))},'➕ Bigger'),
    el('button',{class:'btn small', onclick:act(it => it.s = Math.max(0.5, +(it.s - 0.25).toFixed(2)))},'➖ Smaller'),
    el('button',{class:'btn small', onclick:act(it => it.f = !it.f)},'↔️ Flip'),
    el('button',{class:'btn small', onclick:act(it => it.z = Math.max(...W.items.map(i => i.z || 1)) + 1)},'⬆️ Front'),
    el('button',{class:'btn small red', onclick:async()=>{ const it = selected(); if (!it) return;
      // removing gives back only half of what the item cost; legendary and mythic items go back to the vault instead
      const def = WORLD_BY_ID[it.k], vault = def && (def[0] === 'legendary' || def[0] === 'mythic');
      const price = def && !vault ? def[4] : 0, refund = Math.floor(price / 2);
      if (vault) say(`The ${def[3]} goes back to your Legendary Vault. You can put it out again any time.`);
      if (price){
        const ok = await modal(el('div',{}, el('div',{class:'big-e'}, it.e), el('h2',{}, `Remove the ${def[3]}?`),
          el('p',{}, `You paid ⭐ ${price}. If you remove it, you only get ⭐ ${refund} back.`)), [['Keep it','green',false],[`Remove (+${refund} ⭐)`,'red',true]]);
        if (!ok) return;
      }
      W.items = W.items.filter(i => i !== it); K.spent = Math.max(0, (K.spent||0) - refund);
      nodes[it.id].remove(); delete nodes[it.id]; worldSel = null; save(); refreshSel(); bal.textContent = '⭐ ' + balance();
      if (refund) say(`You got ${refund} stars back.`); }},'🗑️ Remove'));
  function attachDrag(n, it){
    n.addEventListener('pointerdown', ev => {
      ev.preventDefault(); worldSel = it.id; refreshSel();
      const sx = ev.clientX, sy = ev.clientY, ox = it.x, oy = it.y;
      n.setPointerCapture(ev.pointerId); n.classList.add('drag');
      const move = e => { it.x = Math.max(-20, Math.min(WORLD_W - 40, ox + (e.clientX - sx) / zw.z)); it.y = Math.max(-20, Math.min(WORLD_H - 40, oy + (e.clientY - sy) / zw.z));
        n.style.left = it.x + 'px'; n.style.top = it.y + 'px'; };
      const up = () => { n.removeEventListener('pointermove', move); n.removeEventListener('pointerup', up); n.removeEventListener('pointercancel', up); n.classList.remove('drag'); save(); };
      n.addEventListener('pointermove', move); n.addEventListener('pointerup', up); n.addEventListener('pointercancel', up);
    });
  }
  stage.addEventListener('pointerdown', ev => { if (ev.target === stage || ev.target.classList.contains('world-ground')){ worldSel = null; refreshSel(); } });

  // build palette
  const bal = el('span',{class:'pill cosmic-mix', onclick:()=>cosmicInfo()}, '⭐ ' + balance() + '   💫 ' + cosmicBal());
  const palette = el('div',{class:'world-palette'});
  const catTabs = el('div',{class:'tabs shop-tabs'});
  const drawPalette = () => {
    catTabs.innerHTML = ''; palette.innerHTML = '';
    Object.entries(WORLD_CATS).forEach(([c, label]) => catTabs.append(el('button',{class:'tab' + (c===worldCat?' active':''), onclick:()=>{ worldCat = c; drawPalette(); }}, label)));
    catTabs.append(el('button',{class:'tab' + (worldCat==='theme'?' active':''), onclick:()=>{ worldCat = 'theme'; drawPalette(); }},'🎨 Places'));
    catTabs.append(el('button',{class:'tab legend-tab' + (worldCat==='legend'?' active':''), onclick:()=>{ worldCat = 'legend'; drawPalette(); }},'✨ Legendary'));
    if (worldCat === 'legend'){
      const inWorld = id => W.items.some(i => i.k === id);
      const putOut = (row) => {
        const sl = scroller.scrollLeft / zw.z;
        const it = { id: W.nextId++, k:row[1], e:row[2], x: Math.round(sl + 300 + Math.random()*300), y: GROUND_Y - 150, s:1.8, f:false, z: W.items.length + 2 };
        W.items.push(it); worldSel = it.id; save(); place(it); refreshSel();
        const n = nodes[it.id]; if (n){ n.classList.add('summon'); setTimeout(() => n.classList.remove('summon'), 1600); }
        confetti(90); beep('level'); burst('WOW!'); drawPalette();
      };
      LEGENDS.forEach(l => {
        const row = WORLD_BY_ID[l.id], owned = legendOwned(l.id), open = owned || legendUnlocked(l), [label, prog] = legendReq(l.req), [have, need] = prog();
        palette.append(el('button',{class:'world-chip rar-legendary legend-chip' + (open ? '' : ' locked'), onclick: async () => {
          if (!open){ say(`${l.name} is locked. ${label}. You have ${have} of ${need}.`); return; }
          if (owned){ if (inWorld(l.id)) { say(`Your ${l.name} is already in your world!`); return; } putOut(row); return; }
          if (cosmicBal() < legendCosmic(l)){ say(`You need ${legendCosmic(l)} Cosmic Power for the ${l.name}. You have ${cosmicBal()}. Keep reading!`); beep('bad'); return; }
          K.cosmicSpent = (K.cosmicSpent||0) + legendCosmic(l); K.legendOwned = (K.legendOwned || []).concat(l.id); save(); bal.textContent = '⭐ ' + balance() + '   💫 ' + cosmicBal();
          await epicReveal(l, 'legendary', 'LEGENDARY SUMMONED!', 'It\'s yours forever. Watch it come alive in your world!');
          putOut(row); checkBadges(); }},
          el('span',{class:'chip-e' + (open ? '' : ' silhouette'), html: TOWN_SVG[l.id] || l.e}),
          el('span',{class:'chip-name'}, l.name),
          open ? el('span',{class:'chip-price' + (owned ? '' : ' cosmic')}, owned ? (inWorld(l.id) ? '✓ In world' : 'Place it') : '💫 ' + legendCosmic(l))
               : el('span',{class:'chip-req'}, `🔒 ${label} · ${have}/${need}`)));
      });
      MYTHICS.forEach(m => {
        const row = WORLD_BY_ID[m.id], owned = legendOwned(m.id);
        palette.append(el('button',{class:'world-chip rar-mythic legend-chip' + (owned ? '' : ' locked'), onclick:()=>{
          if (!owned){ say(`Mythic items are only found in Starfall Chests. Great reads can make one fall from the sky!`); return; }
          if (inWorld(m.id)){ say(`Your ${m.name} is already in your world!`); return; }
          putOut(row); }},
          el('span',{class:'chip-e' + (owned ? '' : ' silhouette'), html: owned ? (TOWN_SVG[m.id] || m.e) : '❔'}),
          el('span',{class:'chip-name'}, owned ? m.name : 'Mythic ???'),
          el('span',{class: owned ? 'chip-price' : 'chip-req'}, owned ? (inWorld(m.id) ? '✓ In world' : 'Place it') : `🌠 Starfall Chest only · ${K.chestPity || 0}/${CHEST_ODDS}`)));
      });
      return;
    }
    if (worldCat === 'theme'){
      Object.entries(WORLD_THEMES).forEach(([id, t]) => {
        const owned = W.themes.includes(id), on = W.theme === id;
        const cost = t.cosmic ? { cur:'cosmic', amt:t.cosmic } : { cur:'star', amt:t.price };
        palette.append(el('button',{class:'world-chip theme-chip' + (on?' on':'') + (t.cosmic && !owned ? ' cosmic-place' : ''), style:`background:${t.sky}`, onclick:()=>{
          if (!owned){ if (!canPay(cost)){ say(cost.cur === 'cosmic' ? `${t.name} costs ${cost.amt} Cosmic Power. Keep reading to collect more!` : 'Keep reading to earn more stars!'); beep('bad'); return; } pay(cost); W.themes.push(id); beep('level'); confetti(40); say(`Welcome to ${t.name}!`); }
          W.theme = id; save(); screenWorld(); }},
          el('span',{class:'chip-name'}, t.name), el('span',{class:'chip-price' + (cost.cur === 'cosmic' && !owned ? ' cosmic' : '')}, owned ? (on ? '✓ Here' : 'Go!') : costLabel(cost))));
      });
      return;
    }
    if (worldCat === 'treasure'){
      chestState();
      const mine = TREASURES.filter(t => K.treasures[t.id]).sort((a, b) => RARITY_ORDER.indexOf(b.r) - RARITY_ORDER.indexOf(a.r));
      if (!mine.length) palette.append(el('p',{class:'muted', style:'color:#fff'}, 'Open treasure chests to find treasures. Then place them here for free!'));
      mine.forEach(t => { const used = W.items.filter(i => i.k === t.id).length, left = (K.treasures[t.id] || 0) - used;
        palette.append(el('button',{class:'world-chip rar-' + t.r + (left > 0 ? '' : ' locked'), onclick:()=>{
          if (left <= 0){ say(`All your ${t.name}s are already in your world!`); return; }
          const sl = scroller.scrollLeft / zw.z;
          const it = { id: W.nextId++, k:t.id, e:t.e, x: Math.round(sl + 300 + Math.random()*300), y: GROUND_Y - 90, s: t.r === 'mythic' ? 1.8 : t.r === 'legendary' ? 1.5 : 1.1, f:false, z: W.items.length + 2 };
          W.items.push(it); worldSel = it.id; save(); place(it); refreshSel(); beep('star'); drawPalette(); }},
          el('span',{class:'chip-e'}, t.e), el('span',{class:'chip-name'}, t.name), el('span',{class:'chip-price'}, `Lv ${t.ilvl} · ${left}/${K.treasures[t.id]}`)));
      });
      return;
    }
    const list = worldCat === 'friends' ? friendItems(kid) : WORLD_ITEMS.filter(i => i[0] === worldCat);
    if (!list.length) palette.append(el('p',{class:'muted', style:'color:#fff'}, 'Collect friends by reading great stories. They live here for free!'));
    list.forEach(([cat, id, e, name, price, lvl]) => {
      const locked = lvl && K.level < lvl;
      palette.append(el('button',{class:'world-chip rar-' + (cat === 'friends' ? 'epic' : rarity(price, lvl)) + (locked?' locked':''), onclick:()=>{
        if (locked){ say(`Unlocks at level ${lvl}!`); return; }
        if (balance() < price){ say('Keep reading to earn more stars!'); beep('bad'); return; }
        K.spent = (K.spent||0) + price;
        const sl = scroller.scrollLeft / zw.z;
        const it = { id: W.nextId++, k:id, e, x: Math.round(sl + 300 + Math.random()*300), y: GROUND_Y - 80 - Math.round(Math.random()*60), s: /^inf_/.test(id) ? 1.9 : cat==='home' ? 1.6 : cat==='ride' ? 1.2 : 1, f:false, z: W.items.length + 2 };
        W.items.push(it); worldSel = it.id; save(); place(it); refreshSel(); beep('star'); bal.textContent = '⭐ ' + balance() + '   💫 ' + cosmicBal();
        checkBadges(); }},
        el('span',{class:'chip-e', html: TOWN_SVG[id] || e}), el('span',{class:'chip-name'}, name), el('span',{class:'chip-price'}, locked ? `🔒 Lv ${lvl}` : price ? '⭐ ' + price : 'Free')));
    });
  };
  if (!readOnly) drawPalette();

  const s = el('div',{class:'screen world-screen'},
    el('div',{class:'topbar'},
      el('button',{class:'btn ghost small', onclick:()=>{ worldSel = null; screenHome(); }},'← Back'),
      el('h1',{class:'title'}, readOnly ? `${kidName(owner)}'s World` : `${kidName()}'s World`),
      readOnly ? el('button',{class:'btn small', onclick:()=>screenWorld()},'🏠 My World')
               : el('div',{class:'row'}, bal, ...visitIds.map(id => el('button',{class:'btn small blue', onclick:()=>{ worldSel = null; screenWorld(id); }}, `👀 Visit ${kidName(id)}`)))),
    readOnly && !DB.kids[owner].world?.items?.length ? el('div',{class:'banner'}, `${kidName(owner)} hasn't built anything here yet. (Worlds update when ${kidName(owner)} plays.)`) : null,
    zw.frame,
    el('div',{class:'row', style:'margin-top:10px'},
      el('button',{class:'btn small blue', onclick:()=>scroller.scrollTo({ left: (ax + 60) * zw.z - scroller.clientWidth/2, behavior:'smooth' })},'🔎 Find my buddy'),
      el('span',{class:'world-hint', style:'margin:0'}, readOnly ? `Watch ${kidName(owner)}'s buddy play!` : 'Tap your buddy to make them jump!')),
    readOnly ? null : el('div',{class:'world-hint'}, 'Tap something to buy it, then drag it anywhere! Tap a thing in your world to change it. Removing something gives back only half its stars.'),
    readOnly ? null : tools,
    readOnly ? null : catTabs,
    readOnly ? null : palette,
    cloudStatusNode());
  show(s);
  refreshSel();
  // redraw when the other kid (or another device) saves, unless something here is being moved
  onCloudUpdate = () => { if (!document.querySelector('.world-item.drag')) screenWorld(visitKid); };

  // ---- buddy life loop: wander, play, and use the things in the world ----
  const life = ++worldLifeGen;
  const alive = () => life === worldLifeGen && av.isConnected;
  let facing = 1;
  const setFace = d => { facing = d; avBody.style.transform = d < 0 ? 'scaleX(-1)' : ''; };
  const pop = (txt, ms=1900) => { bubble.textContent = txt; bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
    setTimeout(() => { if (bubble.textContent === txt) bubble.classList.remove('show'); }, ms); };
  const pose = (cls, ms) => { avBody.classList.add(cls); return wsleep(ms).then(() => avBody.classList.remove(cls)); };
  const itemAct = (it, cls, ms) => { const n = nodes[it.id]; if (!n) return wsleep(ms); n.classList.add(cls); return wsleep(ms).then(() => n.classList.remove(cls)); };
  const hide = async ms => { av.classList.add('away'); await wsleep(ms); av.classList.remove('away'); };
  const walkTo = async x => {
    x = Math.max(0, Math.min(WORLD_W - 120, Math.round(x)));
    const dist = Math.abs(x - ax); if (dist < 4) return;
    setFace(x > ax ? 1 : -1);
    const secs = Math.max(0.4, dist / 110);
    av.style.transition = `left ${secs}s linear, opacity .4s`; avBody.classList.add('walking');
    av.style.left = x + 'px'; ax = x;
    await wsleep(secs * 1000);
    avBody.classList.remove('walking');
  };
  const ctx = { pop, pose, itemAct, hide };
  const visit = async it => {
    const w = Math.round(64 * (it.s || 1)), fromLeft = it.x - 100 >= 0;
    await walkTo(fromLeft ? it.x - 100 : it.x + w - 20);
    if (!alive() || !W.items.includes(it)) return;
    setFace(fromLeft ? 1 : -1);
    const def = WORLD_BY_ID[it.k], cat = def ? def[0] : 'friends';
    await (BUDDY_ACTS[it.k] || BUDDY_ACTS['@' + cat] || BUDDY_ACTS['@any'])(Object.assign({ it }, ctx));
  };
  const idle = [
    () => walkTo(ax + (Math.random() < .5 ? -1 : 1) * (150 + Math.random() * 350)),
    () => walkTo(ax + (Math.random() < .5 ? -1 : 1) * (150 + Math.random() * 350)),
    async () => { pop('🦘'); await pose('jumping', 700); await pose('jumping', 700); },
    async () => { pop(pick(['😊','🎵','😎'])); await pose('sitting', 3000); },
    async () => { pop('👋'); await pose('waving', 1500); },
    async () => { pop('🎶'); await pose('dancing', 2400); },
    async () => { pop('💤', 3200); await pose('sitting', 3400); },
    async () => { setFace(-facing); await wsleep(600); setFace(-facing); pop('👀'); await wsleep(700); }
  ];
  avBody.addEventListener('pointerdown', ev => { ev.stopPropagation(); beep('tap'); pop(pick(['😄','🎉','⭐','💖','🤩'])); pose('jumping', 700); });
  (async () => {
    await wsleep(900);
    while (alive()){
      if (W.items.length && Math.random() < 0.55) await visit(pick(W.items));
      else await pick(idle)();
      await wsleep(500 + Math.random() * 1200);
    }
  })();
}

// What the buddy does with each kind of world item. Keys are item ids, '@category', or '@any'.
let worldLifeGen = 0;
const wsleep = ms => new Promise(r => setTimeout(r, ms));
const BUDDY_ACTS = {
  '@home': async c => { c.pop('🚪'); await wsleep(700); c.pop(pick(['💤','📺','🍪','🎮']), 2600); await c.hide(2800); c.pop('👋'); },
  '@nature': async c => { c.pop('😌', 2800); await c.pose('sitting', 3000); },
  sunflower: async c => { c.pop('🌻😊'); await c.pose('bend', 1800); },
  tulip: async c => { c.pop('🌷😊'); await c.pose('bend', 1800); },
  blossom: async c => { c.pop('🌸😊'); await c.pose('bend', 1800); },
  rock: async c => { c.pop('⛰️'); await c.pose('jumping', 700); await c.pose('jumping', 700); },
  mountain: async c => { c.pop('🧗'); await c.pose('jumping', 700); await c.pose('jumping', 700); },
  volcano: async c => { c.pop('😮'); await Promise.all([c.itemAct(c.it, 'act-wiggle', 2400), c.pose('waving', 1500)]); },
  sun: async c => { c.pop('😎'); await c.pose('waving', 1500); },
  moon: async c => { c.pop('🌙💤', 3000); await c.pose('sitting', 3200); },
  star: async c => { c.pop('✨🤩'); await c.pose('jumping', 700); },
  cloud: async c => { c.pop('☁️'); await c.itemAct(c.it, 'act-float', 2400); },
  rainbow: async c => { c.pop('🌈🤩'); await c.pose('dancing', 2400); },
  crystal: async c => { c.pop('💎✨'); await c.itemAct(c.it, 'act-hop', 1500); },
  ball: async c => { c.pop('⚽'); await c.pose('jumping', 500); await c.itemAct(c.it, 'act-kick', 1400); },
  balloons: async c => { c.pop('🎈'); await Promise.all([c.pose('jumping', 700), c.itemAct(c.it, 'act-float', 2400)]); },
  kite: async c => { c.pop('🪁'); await Promise.all([c.pose('waving', 1500), c.itemAct(c.it, 'act-float', 2400)]); },
  campfire: async c => { c.pop('🔥😊', 2800); await c.pose('sitting', 3000); },
  icecream: async c => { c.pop('😋'); await c.pose('munch', 1800); },
  cupcake: async c => { c.pop('😋'); await c.pose('munch', 1800); },
  pizza: async c => { c.pop('🍕😋'); await c.pose('munch', 1800); },
  trophy: async c => { c.pop('🏆'); await c.pose('jumping', 700); await c.pose('jumping', 700); },
  present: async c => { c.pop('🎁'); await c.itemAct(c.it, 'act-hop', 1500); c.pop('🎉'); await c.pose('dancing', 1800); },
  treasure: async c => { c.pop('💰✨'); await c.pose('jumping', 700); },
  fountain: async c => { c.pop('💦'); await c.itemAct(c.it, 'act-wiggle', 2400); },
  target: async c => { c.pop('🎯'); await c.pose('waving', 1200); c.pop('🎯✅'); await c.itemAct(c.it, 'act-wiggle', 1200); },
  slide: async c => { c.pop('🛝'); await c.pose('jumping', 700); await c.pose('sitting', 1400); c.pop('😄'); },
  ferris: async c => { c.pop('🎡'); await Promise.all([c.hide(3200), c.itemAct(c.it, 'act-spin', 3000)]); c.pop('😄'); },
  carousel: async c => { c.pop('🎠'); await Promise.all([c.hide(3200), c.itemAct(c.it, 'act-spin', 3000)]); c.pop('😄'); },
  coaster: async c => { c.pop('🎢'); await Promise.all([c.hide(2800), c.itemAct(c.it, 'act-wiggle', 2400)]); c.pop('😆'); },
  '@ride': async c => { const fly = ['rocket','jet','heli'].includes(c.it.k), boat = ['ship','sailboat'].includes(c.it.k);
    c.pop(fly ? '🚀' : boat ? '⚓' : '🏁');
    await Promise.all([c.hide(3300), c.itemAct(c.it, fly ? 'act-fly' : boat ? 'act-bob' : 'act-drive', 3200)]); c.pop('😄'); },
  '@animal': async c => { c.pop('❤️'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('waving', 1500)]); },
  '@friends': async c => { c.pop('👋💛'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('jumping', 700)]); },
  // holidays
  xmastree: async c => { c.pop('🎄✨'); await c.pose('dancing', 2400); },
  santa: async c => { c.pop('🎅👋'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('jumping', 700)]); c.pop('🎁😄'); },
  mrsclaus: async c => { c.pop('🍪😋'); await c.pose('munch', 1800); },
  reindeer: async c => { c.pop('🦌❤️'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('waving', 1500)]); },
  sleigh: async c => { c.pop('🛷🎶'); await Promise.all([c.hide(3300), c.itemAct(c.it, 'act-fly', 3200)]); c.pop('🤩'); },
  snowman: async c => { c.pop('⛄'); await c.pose('waving', 1500); c.pop('❄️😄'); },
  giftpile: async c => { c.pop('🎁'); await c.itemAct(c.it, 'act-hop', 1500); c.pop('🎉'); await c.pose('dancing', 1800); },
  cookies: async c => { c.pop('🍪😋'); await c.pose('munch', 1800); },
  hotcocoa: async c => { c.pop('☕😋'); await c.pose('munch', 1800); },
  ghost: async c => { c.pop('😱'); await c.pose('jumping', 700); c.pop('😂'); await c.itemAct(c.it, 'act-float', 2400); },
  witch: async c => { c.pop('🧙✨'); await c.pose('waving', 1500); },
  vampire: async c => { c.pop('😱'); await c.pose('jumping', 700); c.pop('🧛😄'); },
  zombie: async c => { c.pop('🧟'); await Promise.all([c.itemAct(c.it, 'act-wiggle', 2400), c.pose('dancing', 2400)]); },
  skeleton: async c => { c.pop('💀🎶'); await c.pose('dancing', 2400); },
  jackolantern: async c => { c.pop('🎃😄'); await c.pose('jumping', 700); },
  haunted: async c => { c.pop('👻🚪'); await wsleep(700); c.pop('😱', 2600); await c.hide(2800); c.pop('😂'); },
  candy: async c => { c.pop('🍬😋'); await c.pose('munch', 1800); },
  broom: async c => { c.pop('🧹✨'); await Promise.all([c.hide(3300), c.itemAct(c.it, 'act-fly', 3200)]); c.pop('😄'); },
  easterbunny: async c => { c.pop('🐰❤️'); await Promise.all([c.itemAct(c.it, 'act-hop', 1500), c.pose('jumping', 700)]); },
  easteregg: async c => { c.pop('🥚🔎'); await c.pose('bend', 1800); c.pop('🎉'); },
  eggbasket: async c => { c.pop('🧺🥚'); await c.pose('bend', 1800); },
  chick: async c => { c.pop('🐣❤️'); await c.itemAct(c.it, 'act-hop', 1500); },
  turkey: async c => { c.pop('🦃'); await Promise.all([c.itemAct(c.it, 'act-wiggle', 2400), c.pose('waving', 1500)]); },
  pie: async c => { c.pop('🥧😋'); await c.pose('munch', 1800); },
  fireworks: async c => { c.pop('🎆🤩'); await Promise.all([c.itemAct(c.it, 'act-burst', 2400), c.pose('jumping', 700)]); },
  sparkler: async c => { c.pop('🎇'); await c.pose('waving', 1500); },
  popper: async c => { c.pop('🎉'); await c.pose('jumping', 700); await c.pose('dancing', 1800); },
  menorah: async c => { c.pop('🕎✨', 2800); await c.pose('sitting', 3000); },
  diya: async c => { c.pop('🪔✨', 2800); await c.pose('sitting', 3000); },
  candles: async c => { c.pop('🕯️✨', 2800); await c.pose('sitting', 3000); },
  lantern: async c => { c.pop('🏮'); await c.itemAct(c.it, 'act-float', 2400); },
  '@holiday': async c => {
    if (/^inf_/.test(c.it.k)){ c.pop('😆'); await Promise.all([c.pose('jumping', 700), c.itemAct(c.it, 'act-wiggle', 2400)]); await c.pose('jumping', 700); return; } // bounce on the blow-ups
    c.pop(c.it.e + '😊'); await c.pose('dancing', 1800);
  },
  '@legendary': async c => { c.pop('🤩✨'); await Promise.all([c.itemAct(c.it, 'act-burst', 2400), c.pose('jumping', 700)]); await c.pose('jumping', 700); c.pop('💛'); },
  '@mythic': async c => { c.pop('😲🌈'); await Promise.all([c.itemAct(c.it, 'act-burst', 2400), c.pose('dancing', 2400)]); },
  '@any': async c => { c.pop('😊'); await c.pose('waving', 1200); }
};

/* ================= PHONICS PATH: lesson engine =================
   Each lesson follows an explicit "I do / we do / you do" routine:
   review → learn the pattern → blend words → build (spell) words →
   heart words → read a decodable story (+ hear-it-first) → questions →
   mastery check. Spaced review pulls words from earlier lessons and the
   missed-word tracker. Repeated reading lets kids beat their own speed.
   ================================================================= */
const MULTI_G = ['augh','tch','igh','oul','sh','ch','th','wh','ck','ng','nk','qu','ai','ay','ee','ea','oa','ow','oo','ar','or','er','ir','ur','oi','oy','ou','ey','ie','ew'];
const G_SOUND = { b:'buh', c:'kuh', d:'duh', f:'fff', g:'guh', h:'huh', j:'juh', k:'kuh', l:'lll', m:'mmm', n:'nnn', p:'puh', q:'kwuh', r:'rrr', s:'sss', t:'tuh', v:'vvv', w:'wuh', x:'ks', y:'yuh', z:'zzz',
  a:'aah', e:'eh', i:'ih', o:'ah', u:'uh', sh:'shhh', ch:'chuh', th:'thh', wh:'wuh', ck:'kuh', ng:'ng', nk:'nk', qu:'kwuh', tch:'chuh', igh:'eye', augh:'aff', oul:'ood',
  ai:'ay', ay:'ay', ee:'ee', ea:'ee', oa:'oh', ow:'oh', oo:'oo', ar:'are', or:'or', er:'er', ir:'er', ur:'er', oi:'oy', oy:'oy', ou:'ow', ey:'ay', ie:'eh', ew:'oo', le:'ul', "'":'' };
const LONG_V = { a:'ay', e:'ee', i:'eye', o:'oh', u:'you' };
function graphemes(word){
  const w = word.toLowerCase().replace(/[^a-z']/g,'');
  const out = []; let i = 0;
  while (i < w.length){
    let m = MULTI_G.find(g => w.startsWith(g, i));
    if (w.endsWith('le') && i === w.length - 2 && /[^aeiou]le$/.test(w)) m = 'le';
    m = m || w[i];
    out.push({ g:m, sound:G_SOUND[m] ?? m });
    i += m.length;
  }
  // magic e: vowel + consonant + e at the end → long vowel, silent e
  if (/[aeiou][^aeiouwy]e$/.test(w) && out.length >= 3 && out[out.length-1].g === 'e'){
    out[out.length-1].silent = true; out[out.length-1].sound = '';
    const v = out[out.length-3]; if (v && LONG_V[v.g]){ v.sound = LONG_V[v.g]; v.long = true; }
  }
  return out;
}

function pathState(){
  K.path = Object.assign({ placed:false, done:{}, tries:{}, best:{} }, K.path || {});
  return K.path;
}
function nextLesson(){ const P = pathState(); return PHONICS.find(l => !P.done[l.id]) || null; }
function reviewWords(n){
  const P = pathState();
  const pool = PHONICS.filter(l => P.done[l.id] && l.words).flatMap(l => l.words);
  const tracked = practiceWords(K).filter(w => pool.includes(w));
  return [...new Set(tracked.concat(shuffle(pool)))].slice(0, n);
}

/* ---------- path map ---------- */
function screenPath(){
  stopAll();
  const P = pathState(), nxt = nextLesson();
  const stages = PHONICS_STAGES.map(st => {
    const ls = PHONICS.filter(l => l.stage === st.n);
    const doneN = ls.filter(l => P.done[l.id]).length;
    return el('div',{class:'card path-stage'},
      el('div',{class:'path-stage-head'}, el('span',{class:'path-icon'}, st.icon),
        el('div',{}, el('h2',{}, `Stage ${st.n}: ${st.name}`), el('p',{class:'muted'}, st.desc)),
        el('span',{class:'pill'}, `${doneN}/${ls.length}`)),
      el('div',{class:'path-nodes'}, ...ls.map((l,i) => {
        const d = P.done[l.id], isNext = nxt && nxt.id === l.id;
        const state = d ? (d.tested ? 'tested' : 'done') : isNext ? 'next' : 'locked';
        const node = el('button',{class:'path-node ' + state + (i%2 ? ' low' : ''), onclick:()=>{
          if (state === 'locked'){ say('Finish the lessons before this one first!'); return; }
          beep('tap'); runLesson(l); }},
          el('span',{class:'pn-show'}, l.stage === 0 ? l.title.split(' ').slice(0,3).join(' ') : l.show),
          el('span',{class:'pn-title'}, l.title),
          el('span',{class:'pn-state'}, state === 'done' ? '⭐'.repeat(d.stars||1) : state === 'tested' ? '✓ known' : state === 'next' ? '▶ GO!' : '🔒'));
        return node;
      })));
  });
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
      el('h1',{class:'title'},'🧠 Skills'),
      el('button',{class:'btn small', onclick:()=>startPathCheck()},'🎯 Phonics Check')),
    nxt ? el('div',{class:'card next-card'},
      el('div',{class:'series-tag'}, `Next skill · Stage ${nxt.stage}`),
      el('h2',{}, nxt.title), el('p',{}, nxt.say),
      el('p',{style:'font-weight:600'}, '📖 Your stories will practice this skill automatically. Want extra practice? Do the mini-lesson!'),
      el('button',{class:'btn', onclick:()=>runLesson(nxt)},'🧠 Practice now')) :
      el('div',{class:'banner'},'🎓 You finished the whole Phonics Path! Replay any lesson to earn more stars.'),
    ...stages);
  show(s);
}

/* ---------- phonics check (placement) ---------- */
function pathIntro(){
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🧠 Phonics Path'), el('div')),
    el('div',{class:'card'},
      el('h2',{style:'margin-top:0'},'First, a quick Phonics Check!'),
      el('p',{style:'font-size:20px'},'Read 4 short lines of words. Easy ones first, then harder. It tells us which lesson to start on, so you never repeat stuff you already know.'),
      el('div',{class:'row'},
        el('button',{class:'btn big', onclick:startPathCheck},'▶ Start the check'),
        el('button',{class:'btn small gray', onclick:()=>{ setPathStart(PHONICS_DEFAULT_START[TK]); screenPath(); }}, `Skip: start at lesson ${PHONICS_DEFAULT_START[TK]}`))));
  show(s);
}
function setPathStart(id){
  const P = pathState(); P.placed = true;
  for (const l of PHONICS){ if (l.id === id) break; if (!P.done[l.id]) P.done[l.id] = { tested:true, date:todayStr() }; }
  save();
}
function startPathCheck(){
  const P = pathState();
  P.done = Object.fromEntries(Object.entries(P.done).filter(([,d]) => !d.tested));
  const pages = [1,2,3,4].map(st => {
    const words = shuffle(PHONICS.filter(l => l.stage === st && l.words).flatMap(l => l.words.filter(w => !/'/.test(w)))).slice(0,6);
    return { probeStage:st, tokens: words.map(w => ({ disp:w, n:norm(w) })) };
  });
  beginRun({ kind:'story', level:K.level, title:'Phonics Check', pages }, { mode:'lesson', onStop:screenPath, onDone:() => {
    let start = '4-1';
    for (const p of run.act.pages){
      const acc = p.status.filter(x => x === 'ok').length / p.tokens.length;
      if (acc < 0.85){ start = p.probeStage === 1 && acc < 0.5 ? '0-1' : PHONICS.find(l => l.stage === p.probeStage).id; break; }
    }
    setPathStart(start); confetti(50); beep('level');
    const L0 = PHONICS_BY_ID[start];
    modal(el('div',{}, el('div',{class:'big-e'},'🎯'), el('h2',{}, `Start at Lesson ${start}!`), el('p',{}, `Stage ${L0.stage}: ${L0.title}. The lessons before it are marked as known.`)), [['Let\'s go! ▶','',1]]).then(screenPath);
  }});
}

/* ---------- running a lesson ---------- */
let LS = null; // lesson session
function runLesson(lesson){
  ensureSkillStart();
  const P = pathState();
  const steps = [];
  const rev = reviewWords(4);
  if (rev.length) steps.push('review');
  steps.push('learn');
  if (lesson.letters){ steps.push('listen', 'sayletters'); }
  else { steps.push('blend', 'build'); if (lesson.heart && lesson.heart.length) steps.push('heart'); steps.push('read', 'questions'); }
  LS = { lesson, steps, i:0, rev, scores:{}, started:Date.now() };
  P.tries[lesson.id] = (P.tries[lesson.id] || 0) + 1; save();
  nextStep();
}
function stepBar(){
  const names = { review:'Review', learn:'Learn', listen:'Listen', sayletters:'Say it', blend:'Blend', build:'Build', heart:'Heart words', read:'Read', questions:'Think' };
  return el('div',{class:'step-bar'}, ...LS.steps.map((s,i) => el('span',{class:'step' + (i < LS.i ? ' done' : i === LS.i ? ' now' : '')}, names[s])));
}
function nextStep(){
  if (!LS) return screenPath();
  if (LS.i >= LS.steps.length) return lessonResults();
  const step = LS.steps[LS.i], L = LS.lesson;
  const advance = (key, val) => { if (key) LS.scores[key] = val; LS.i++; nextStep(); };
  const lessonRun = (act, key, extra={}) => beginRun(act, Object.assign({ mode:'lesson', onStop:()=>{ LS = null; screenPath(); }, onDone:(res, a) => {
    trackWords(a); save(); advance(key, res); }}, extra));
  if (step === 'review'){
    lessonRun({ kind:'words', level:K.level, title:'🔁 Quick Review', pages: LS.rev.map(w => ({ single:true, blend:true, g:graphemes(w), tokens:[{disp:w, n:norm(w)}] })) }, 'review');
  } else if (step === 'learn'){ screenLearn(() => advance()); }
  else if (step === 'listen'){ screenListen(score => advance('listen', score)); }
  else if (step === 'sayletters'){
    lessonRun({ kind:'letters', level:K.level, title:'Say the sounds', pages: shuffle(L.letters).map(([l,,k,e]) => ({ single:true, letter:l, pic:e, keyword:k, tokens:[{disp:l.toUpperCase()+l, n:l}] })) }, 'say');
  } else if (step === 'blend'){
    lessonRun({ kind:'words', level:K.level, title:`Blend it: ${L.show}`, pages: L.words.map(w => ({ single:true, blend:true, g:graphemes(w), tokens:[{disp:w, n:norm(w)}] })) }, 'blend');
  } else if (step === 'build'){ screenBuild(score => advance('build', score)); }
  else if (step === 'heart'){
    lessonRun({ kind:'words', level:K.level, title:'❤️ Heart words', pages: L.heart.map(([w,part,tip]) => ({ single:true, heart:{ part, tip }, tokens:[{disp:w, n:norm(w)}] })) }, 'heart');
  } else if (step === 'read'){
    const pages = storyPages(L.text);
    lessonRun({ kind:'story', level:K.level, title:'📖 ' + L.title, pages }, 'read', { echo:true });
  } else if (step === 'questions'){ screenLessonQuiz(score => advance('questions', score)); }
}

function screenLearn(done){
  const L = LS.lesson;
  const body = el('div',{class:'card learn-card'});
  body.append(el('div',{class:'learn-big'}, L.show));
  if (L.letters){
    body.append(el('div',{class:'letter-grid'}, ...L.letters.map(([l,snd,kw,e]) => el('button',{class:'letter-tile', onclick:()=>say(`${snd}. ${snd}, like ${kw}.`, {rate:0.75})},
      el('b',{}, l), el('span',{}, e), el('small',{}, kw)))));
  } else {
    body.append(el('div',{class:'ex-row'}, ...L.ex.map(([w,e]) => el('button',{class:'ex-word', onclick:()=>say(w, {rate:0.7})}, el('span',{class:'ex-e'}, e), el('span',{}, w)))));
  }
  body.append(el('p',{class:'learn-say'}, L.say),
    el('div',{class:'row'}, el('button',{class:'btn blue', onclick:()=>say(L.say, {rate:0.85})},'🔊 Hear it again'), el('button',{class:'btn big', onclick:done},'Got it! ▶')));
  show(el('div',{class:'screen'}, lessonTop(), stepBar(), body));
  say(L.say, { rate:0.85 });
}
function lessonTop(){
  return el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); LS = null; screenPath(); }},'← Back'),
    el('div',{class:'pageinfo'}, `Lesson ${LS.lesson.id}: ${LS.lesson.title}`), el('div',{style:'width:80px'}));
}

/* Stage 0 listening game: hear a sound, tap the letter */
function screenListen(done){
  const L = LS.lesson;
  const rounds = shuffle(L.letters).slice(0, 6);
  let r = 0, right = 0;
  const render = () => {
    if (r >= rounds.length) return done(right / rounds.length);
    const [l, snd, kw, e] = rounds[r];
    const opts = shuffle([l, ...shuffle(L.letters.map(x => x[0]).filter(x => x !== l)).slice(0,2)]);
    const prompt = `Which letter says ${snd}, like in ${kw}?`;
    let answered = false;
    const grid = el('div',{class:'listen-grid'}, ...opts.map(o => el('button',{class:'listen-opt', onclick:ev=>{
      if (answered) return; answered = true;
      if (o === l){ right++; ev.currentTarget.classList.add('right'); beep('ok'); burst(); }
      else { ev.currentTarget.classList.add('wrong'); beep('bad'); [...grid.children].forEach(c => { if (c.textContent === l) c.classList.add('right'); }); say(`${l} says ${snd}`); }
      setTimeout(() => { r++; render(); }, 1300);
    }}, o)));
    show(el('div',{class:'screen'}, lessonTop(), stepBar(),
      el('div',{class:'card center'}, el('p',{class:'q-text'}, `👂 Which letter makes this sound?`), el('div',{class:'big-e'}, e),
        el('button',{class:'btn blue', onclick:()=>say(prompt, {rate:0.75})},'🔊 Hear it'), grid,
        el('p',{class:'muted'}, `${r+1} of ${rounds.length}`))));
    say(prompt, { rate:0.75 });
  };
  render();
}

/* Build it: hear a word, spell it with sound tiles (encoding) */
function screenBuild(done){
  const L = LS.lesson;
  const items = L.build.map(b => Array.isArray(b) ? { word:b.join(''), parts:b } : { word:b, parts:graphemes(b).map(x => x.g) });
  buildGame(items, L.words, () => el('div',{}, lessonTop(), stepBar()), done);
}
let buildGen = 0;
function buildGame(items, poolWords, header, done){
  let k = 0, right = 0;
  const gen = ++buildGen;
  const render = () => {
    if (gen !== buildGen) return;
    if (k >= items.length) return done(right / items.length);
    const it = items[k];
    const pool = [...new Set(poolWords.concat(items.map(x => x.word)).flatMap(w => graphemes(w).map(x => x.g)))];
    const distract = shuffle(pool.filter(g => !it.parts.includes(g)).concat(['a','e','i','o','u','s','t','m'].filter(g => !it.parts.includes(g)))).slice(0, 3);
    const tiles = shuffle(it.parts.map((p,i) => ({ p, id:'t'+i })).concat(distract.map((p,i) => ({ p, id:'d'+i }))));
    const placed = [];
    let tries = 0;
    const slots = el('div',{class:'build-slots'});
    const tray = el('div',{class:'build-tray'});
    const fb = el('div',{class:'feedback'});
    const draw = () => {
      slots.innerHTML = '';
      it.parts.forEach((_,i) => { const t = placed[i];
        slots.append(el('button',{class:'build-slot' + (t ? ' full' : ''), onclick:()=>{ if (t){ placed.splice(i,1); draw(); } }}, t ? t.p : '')); });
      tray.innerHTML = '';
      tiles.forEach(t => { const used = placed.includes(t);
        tray.append(el('button',{class:'build-tile' + (used ? ' used' : ''), onclick:()=>{ if (used || placed.length >= it.parts.length) return;
          placed.push(t); say(G_SOUND[t.p] || t.p, {rate:0.8}); draw(); if (placed.length === it.parts.length) check(); }}, t.p)); });
    };
    const check = () => {
      const got = placed.map(t => t.p).join('');
      if (got === it.word){ if (tries === 0) right++; fb.textContent = '✅ ' + pick(['You built it!','Perfect spelling!','Nailed it!']); fb.style.color = 'var(--ok)'; beep('ok'); burst();
        say(it.word); setTimeout(() => { k++; render(); }, 1400); }
      else { tries++; beep('bad'); fb.style.color = 'var(--bad)';
        if (tries >= 2){ fb.textContent = `It's spelled: ${it.parts.join(' · ')}`; say(`${it.word} is spelled ${it.parts.join(', ')}`); setTimeout(() => { k++; render(); }, 2600); }
        else { fb.textContent = 'Not quite! Listen again and try.'; setTimeout(() => { placed.length = 0; draw(); say(it.word, {rate:0.6}); }, 900); } }
    };
    draw();
    show(el('div',{class:'screen'}, header(),
      el('div',{class:'card center'},
        el('p',{class:'q-text'}, '🧱 Build the word you hear!'),
        el('div',{class:'row center'}, el('button',{class:'btn blue big', onclick:()=>say(it.word, {rate:0.7})},'🔊 Hear word'), el('button',{class:'btn', onclick:()=>say(it.word, {rate:0.35})},'🐢 Slowly')),
        slots, tray, fb, el('p',{class:'muted'}, `Word ${k+1} of ${items.length} · tap a filled box to take a tile back`))));
    say(it.word, { rate:0.7 });
  };
  render();
}

/* Quick comprehension check after the decodable story */
function screenLessonQuiz(done){
  const qs = (LS.lesson.qs || []).map(([q, o, a]) => ({ q, opts: shuffle(o.map((t,i) => ({ t, right:i===a }))) }));
  if (!qs.length) return done(1);
  let i = 0, right = 0;
  const render = () => {
    if (i >= qs.length) return done(right / qs.length);
    const item = qs[i]; let answered = false;
    const fb = el('div',{class:'feedback'});
    const next = el('button',{class:'btn hidden', onclick:()=>{ i++; render(); }}, i < qs.length - 1 ? 'Next ▶' : 'Finish ▶');
    const opts = el('div',{class:'options'}, ...item.opts.map(o => { const b = el('button',{class:'opt'}, el('span',{}, o.t), el('span',{class:'say', onclick:ev=>{ ev.stopPropagation(); say(o.t); }},'🔊'));
      b.onclick = () => { if (answered) return; answered = true;
        if (o.right){ right++; b.classList.add('right'); beep('ok'); burst(); fb.textContent = 'Yes! 🎉'; }
        else { b.classList.add('wrong'); beep('bad'); fb.textContent = 'Good try! The answer is in green.'; [...opts.children].forEach((c,j) => { if (item.opts[j].right) c.classList.add('right'); }); }
        next.classList.remove('hidden'); };
      return b; }));
    show(el('div',{class:'screen'}, lessonTop(), stepBar(),
      el('div',{class:'quiz-layout'},
        passageCard('📖 ' + LS.lesson.title, LS.lesson.text, LS.marks || (LS.marks = {})),
        el('div',{class:'card'}, el('div',{class:'row', style:'align-items:flex-start'}, el('p',{class:'q-text grow'}, item.q), el('button',{class:'btn small blue', onclick:()=>say(item.q)},'🔊')),
          opts, fb, el('div',{class:'row', style:'margin-top:10px'}, next)))));
    if (TK === 'son') say(item.q);
  };
  render();
}

/* Mastery decision + rewards + repeated reading */
async function lessonResults(){
  const L = LS.lesson, S = LS.scores, P = pathState();
  const acc = r => r ? r.accuracy : null;
  let mastered, parts = [];
  if (L.letters){
    mastered = (S.listen ?? 0) >= 0.67 && (acc(S.say) ?? 0) >= 0.75;
    parts = [['👂 Listening', Math.round((S.listen||0)*100) + '%'], ['🗣️ Saying sounds', Math.round((acc(S.say)||0)*100) + '%']];
  } else {
    const b = acc(S.blend) ?? 0, rd = acc(S.read) ?? 0, q = S.questions ?? 1;
    mastered = b >= 0.8 && rd >= 0.9 && q >= 0.5;
    parts = [['🔗 Blending', Math.round(b*100) + '%'], ['🧱 Building', Math.round((S.build||0)*100) + '%'], ['📖 Story reading', Math.round(rd*100) + '%'],
      ['⏱️ Words per minute', S.read && S.read.wcpm ? S.read.wcpm : '–'], ['🤔 Questions', Math.round(q*100) + '%']];
  }
  const tries = P.tries[L.id] || 1;
  const moveOn = mastered || tries >= 3;
  const stars = mastered ? 3 : moveOn ? 1 : 1;
  if (mastered && !(P.done[L.id] && P.done[L.id].mastered)) addCosmic(2, 'Lesson mastered!');
  K.stars += stars;
  const goalJustHit = addReadingTime(Math.min(Date.now() - LS.started, MAX_ACTIVITY_MS));
  const wc = S.read && S.read.wcpm;
  if (wc) P.best[L.id] = Math.max(P.best[L.id] || 0, wc);
  if (moveOn) P.done[L.id] = { stars: mastered ? 3 : 1, mastered, date: todayStr(), scores: parts, needsReview: !mastered };
  K.sessions.unshift({ id: kid + '_' + Date.now(), date: new Date().toISOString(), level: K.level, title: `Phonics ${L.id}: ${L.title}`, kind:'lesson', mode:'lesson',
    total: S.read ? S.read.total : 0, correct: S.read ? S.read.correct : 0, helped: S.read ? S.read.helped : 0,
    accuracy: S.read ? Math.round(S.read.accuracy*1000)/10 : Math.round((acc(S.say)||0)*1000)/10, wcpm: wc || null,
    quiz: S.questions != null ? Math.round(S.questions * (L.qs||[]).length) + '/' + (L.qs||[]).length : null, missed: S.read ? [...new Set(S.read.missed)].slice(0,20) : [], stars, ms: Math.min(Date.now() - LS.started, MAX_ACTIVITY_MS) });
  save();
  if (mastered){ confetti(90); beep('level'); say('Lesson mastered! Amazing!'); } else beep('star');
  const nxt = nextLesson();
  const card = el('div',{class:'card'},
    el('div',{class:'result-avatar'}),
    el('div',{class:'stars'}, ...[0,1,2].map(i => el('span',{}, i < stars ? '⭐' : '☆'))),
    el('h2',{class:'center'}, mastered ? `Lesson ${L.id} mastered!` : moveOn ? 'Good effort! Moving on, and we\'ll review this one.' : 'Almost there! Let\'s try this lesson again soon.'),
    el('div',{class:'result-grid'}, ...parts.map(([k,v]) => el('div',{class:'stat'}, el('b',{}, v), el('span',{}, k)))),
    el('div',{class:'row', style:'margin-top:14px'},
      S.read ? el('button',{class:'btn blue', onclick:()=>rereadForSpeed(L)}, `🔁 Read it again${wc ? ` (beat ${wc} wpm!)` : ''}`) : null,
      nxt && moveOn ? el('button',{class:'btn big green', onclick:()=>{ LS = null; runLesson(nxt); }},'Next lesson ▶') : null,
      !moveOn ? el('button',{class:'btn big', onclick:()=>{ LS = null; runLesson(L); }},'🔄 Try again') : null,
      el('button',{class:'btn gray', onclick:()=>{ LS = null; screenPath(); }},'🗺️ Path')));
  show(el('div',{class:'screen'}, el('div',{class:'topbar'},
    el('button',{class:'btn ghost small', onclick:()=>{ LS = null; screenPath(); }},'← Back'),
    el('h1',{class:'title'}, mastered ? 'Mastered!' : 'Nice work!'), el('div')), card));
  const av = $('.result-avatar'); if (av) av.append(avatarNode(110));
  if (goalJustHit) await celebrateGoal();
  await checkBadges();
}
function rereadForSpeed(L){
  const before = pathState().best[L.id] || 0;
  const pages = storyPages(L.text);
  beginRun({ kind:'story', level:K.level, title:'🔁 Speed read: ' + L.title, pages }, { mode:'lesson', onStop:screenPath, onDone:async (res, a) => {
    trackWords(a);
    const P = pathState(), now = res.wcpm || 0;
    if (now) P.best[L.id] = Math.max(before, now);
    const beat = now > before;
    if (beat){ K.stars += 2; addCosmic(1, 'New speed record!'); confetti(70); beep('level'); say(`New record! ${now} words per minute!`); }
    save();
    await modal(el('div',{}, el('div',{class:'big-e'}, beat ? '🚀' : '💪'), el('h2',{}, beat ? 'New speed record!' : 'Smooth reading!'),
      el('p',{}, `Before: ${before || '–'} wpm → Now: ${now || '–'} wpm${beat ? ' · +2 ⭐' : ''}`),
      el('p',{}, `Accuracy: ${Math.round(res.accuracy*100)}%`)), [['🗺️ Back to path','',1]]);
    LS = null; screenPath();
  }});
}

/* ================= SKILLS INSIDE STORIES =================
   Every story gets a focus phonics pattern, picked from the kid's next
   not-yet-mastered skill that appears in that story. Flow:
   Skill Spark (learn pattern + blend 3 words from the story + heart-word
   preview) → read the story with pattern words highlighted → questions →
   Word Builder (spell 2 story words) → results with skill progress.
   ========================================================== */
const SK_C = '[^aeiouy]';
const cvc = v => w => w.length <= 4 && new RegExp(`^${SK_C}{1,2}${v}${SK_C}{1,2}$`).test(w) && !/(sh|ch|th|wh|ck|ng)/.test(w);
const SKILL_DETECT = {
  '1-1': cvc('a'), '1-2': cvc('i'), '1-3': cvc('o'), '1-4': cvc('u'), '1-5': cvc('e'),
  '2-1': w => /sh/.test(w), '2-2': w => /ch/.test(w) && !/^chr/.test(w), '2-3': w => /ck/.test(w), '2-4': w => /th/.test(w),
  '2-5': w => /^wh|ng$/.test(w), '2-6': w => /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sl|sm|sn|sp|st|sw|tr|tw)[aeiou]/.test(w),
  '2-7': w => /[aeiou](mp|nd|nt|st|lk|lt|sk|ft|nk|lp)$/.test(w), '2-8': w => w.length >= 5 && /(ing|ed)$/.test(w),
  '3-1': w => /a[^aeiouwy]e$/.test(w), '3-2': w => /[io][^aeiouwy]e$/.test(w) && !/(ive|ove|one)$/.test(w), '3-3': w => /[ue][^aeiouwy]e$/.test(w) && w.length >= 4,
  '3-4': w => /ai|ay/.test(w), '3-5': w => /ee|ea/.test(w), '3-6': w => /oa|ow$/.test(w), '3-7': w => /igh/.test(w) || /^[^aeiou]{1,3}y$/.test(w),
  '3-8': w => /ar|or/.test(w), '3-9': w => /er|ir|ur/.test(w), '3-10': w => /oi|oy|ou|ow/.test(w) && !/ow$/.test(w), '3-11': w => /oo/.test(w),
  '4-2': w => w.length >= 6 && /^[^aeiou]*[aeiou][^aeiou]{2}[aeiou][^aeiouy]+$/.test(w), '4-3': w => /[^aeiou]le$/.test(w) && w.length >= 5,
  '4-4': w => /^(un|re)[a-z]{3,}/.test(w) && !/^(under|ready|really|reach|read|rest)/.test(w), '4-5': w => w.length >= 6 && /(ful|less|ly)$/.test(w),
  '4-6': w => false
};
const HEART_WORDS = {};
PHONICS.forEach(l => (l.heart || []).forEach(([w, part, tip]) => { HEART_WORDS[norm(w)] = { word:w, part, tip, lesson:l.id }; }));
const heartNew = w => HEART_WORDS[w] && !skillKnown(HEART_WORDS[w].lesson);

function skillsState(){ K.skills = K.skills || {}; return K.skills; }
function ensureSkillStart(){ const P = pathState(); if (!P.placed) setPathStart(PHONICS_DEFAULT_START[TK]); skillsState(); }
function skillKnown(id){ const P = pathState(); return !!P.done[id] || !!(skillsState()[id] && skillsState()[id].mastered); }
function chooseFocus(story){
  ensureSkillStart();
  const IRREG = new Set(['floor','door','flood','blood','great','break','steak','bread','head','dead','ready','heavy','early','learn','heard','pear','bear','wear','sword','word','world','worm','warm','war','work','toward','cousin','country','touch','young','enough','shoulder','your','four','pour','could','would','should','eyes','buy','guy']);
  const ws = [...new Set(story.text.split(/\s+/).map(norm).filter(Boolean))].filter(w => !HEART_WORDS[w] && !IRREG.has(w));
  const cands = PHONICS.filter(l => SKILL_DETECT[l.id]).map(l => ({ l, words: ws.filter(w => SKILL_DETECT[l.id](w)) })).filter(c => c.words.length >= 3);
  if (!cands.length) return null;
  const fresh = cands.find(c => !skillKnown(c.l.id));
  const ch = fresh || cands.slice().sort((a,b) => b.words.length - a.words.length)[0];
  return { id: ch.l.id, lesson: ch.l, words: ch.words, review: !fresh };
}
function tileRow(word, big){
  return el('div',{class:'tile-row' + (big ? ' big' : '')}, ...graphemes(word).map(g =>
    el('button',{class:'snd-tile' + (g.silent ? ' silent' : '') + (g.long ? ' long' : ''), onclick:ev=>{ ev.stopPropagation(); if (g.sound) say(g.sound, {rate:0.8}); else say('quiet e'); }}, g.g)));
}
function heartWordNode(w){
  const h = HEART_WORDS[norm(w)]; if (!h) return el('span',{}, w);
  const i = h.word.toLowerCase().indexOf(h.part.toLowerCase());
  return el('span',{class:'heart-word'}, h.word.slice(0, i), el('span',{class:'heart-part'}, h.word.slice(i, i + h.part.length)), h.word.slice(i + h.part.length));
}

function startStoryWithSkill(act){
  const focus = chooseFocus(act.story);
  if (!focus) return beginRun(act, { mode:'normal' });
  const L = focus.lesson;
  const power = focus.words.slice().sort((a,b) => a.length - b.length).slice(0, 3);
  const hearts = [...new Set(act.story.text.split(/\s+/).map(norm))].filter(heartNew).slice(0, 2);
  const go = () => beginRun(act, { mode:'normal', focus });
  const warm = () => beginRun({ kind:'words', level:K.level, title:'⚡ Warm-up', pages: power.map(w => ({ single:true, blend:true, tokens:[{disp:w, n:w}] })) },
    { mode:'lesson', onStop:()=>screenHome(), onDone:(res, a) => { trackWords(a); save(); go(); } });
  const s = el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'),
      el('div',{class:'pageinfo'}, (act.emoji||'') + ' ' + act.title), el('div',{style:'width:80px'})),
    el('div',{class:'card spark-card'},
      el('div',{class:'series-tag'}, focus.review ? '🔁 Skill Review' : '⚡ Skill Spark'),
      el('div',{class:'spark-head'}, el('div',{class:'learn-big'}, L.show),
        el('div',{}, el('h2',{style:'margin:0'}, `This story has ${L.title} words!`), el('p',{class:'learn-say'}, L.say))),
      el('h3',{}, '💥 Power words from the story (tap the sounds!)'),
      el('div',{class:'power-words'}, ...power.map(w => el('div',{class:'power-word'}, tileRow(w, true),
        el('button',{class:'btn small blue', onclick:()=>{ say(w, {rate:0.35}); setTimeout(()=>say(w), 1600); }}, `🔊 ${w}`)))),
      hearts.length ? el('div',{class:'heart-preview'}, el('h3',{}, '❤️ Heart words (you just have to know the red part)'),
        ...hearts.map(w => el('button',{class:'heart-chip', onclick:()=>say(`${HEART_WORDS[w].word}. ${HEART_WORDS[w].tip}`)}, heartWordNode(w), el('small',{}, HEART_WORDS[w].tip)))) : null,
      el('div',{class:'row', style:'margin-top:16px'},
        el('button',{class:'btn big', onclick:warm},'▶ Warm up & read'),
        el('button',{class:'btn gray small', onclick:go},'Skip to the story'))));
  show(s);
  say(`This story has lots of ${L.title} words. ${L.say}`, { rate:0.9 });
}

/* Word Builder after the story: spell two of the story's pattern words */
function storyBuilder(focus, done){
  const words = focus.words.filter(w => w.length <= 8 && !/'/.test(w)).sort((a,b) => a.length - b.length);
  const picks = shuffle(words.slice(0, 5)).slice(0, 2);
  if (!picks.length) return done();
  const items = picks.map(w => ({ word:w, parts:graphemes(w).map(g => g.g) }));
  buildGame(items, focus.words, () => el('div',{class:'topbar'},
    el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); done(); }},'← Back'), // skips the builder, keeps the story's results
    el('div',{class:'pageinfo'}, `🧱 Word Builder: ${focus.lesson.title}`), el('div',{style:'width:80px'})), () => done());
}

/* Skill progress after a story */
function scoreFocus(act, focus){
  let reads = 0, right = 0;
  const set = new Set(focus.words);
  act.pages.forEach(p => p.tokens.forEach((t,i) => { if (set.has(t.n)){ reads++; if (p.status[i] === 'ok' && !p.helped[i]) right++; } }));
  return { reads, right };
}
async function commitSkill(act, focus){
  const S = skillsState();
  const r = scoreFocus(act, focus);
  const s = S[focus.id] = Object.assign({ reads:0, right:0, stories:0, mastered:null }, S[focus.id] || {});
  s.reads += r.reads; s.right += r.right; s.stories++; s.last = todayStr();
  let newly = false;
  if (!s.mastered && s.stories >= 2 && s.reads >= 6 && s.right / s.reads >= 0.9){
    s.mastered = todayStr(); newly = true; addCosmic(3, 'New skill: ' + focus.lesson.title);
    const P = pathState(); P.done[focus.id] = Object.assign({ mastered:true, stars:3, date:todayStr(), viaStories:true }, P.done[focus.id] || {});
    K.stars += 5;
  }
  save();
  if (newly){
    confetti(120); beep('level'); burst('SKILL UP!'); say(`New skill unlocked: ${focus.lesson.title}!`);
    await modal(el('div',{}, el('div',{class:'big-e'},'🏅'), el('h2',{}, `Skill unlocked: ${focus.lesson.title}!`),
      el('p',{}, `You read ${s.right} of ${s.reads} ${focus.lesson.title} words right across ${s.stories} stories. +5 ⭐`)), [['Awesome! ▶','',1]]);
  }
}

/* ================= BOSS BATTLES =================
   3 great reads unlock the level's boss instead of an automatic level-up.
   Beat the boss to rise a level:
     Miles (read aloud): 90%+ of words read right AND 80%+ questions right
     Gianna (quiet):     4 or 5 of 5 tough questions right
   Reading pages and right answers knock the boss's power bar down live. */

/* ================= BOSS ART =================
   Big, armored, original boss monsters drawn in SVG (replacing the emoji faces).
   One sturdy "brute" body with spiked armor, plus special bodies (phantom, blob, kraken) and
   head/extra parts (horns, mane, crown, wings, tail, mask, beak...) mixed per boss. */
const BOSS_LOOKS = {
  son: {
    1:{ body:'brute', f:['antennae','wings','bug'], skin:'#65a30d', belly:'#d9f99d', eye:'#facc15' },
    2:{ body:'blob', skin:'#92400e', belly:'#d6a26a', eye:'#fde047' },
    3:{ body:'brute', f:['eyestalks','shell','crown'], skin:'#7c3aed', belly:'#ddd6fe', eye:'#fde047' },
    4:{ body:'brute', f:['ears','bandit','tail','pirate'], skin:'#64748b', belly:'#e2e8f0', eye:'#fbbf24' },
    5:{ body:'brute', f:['ears','tail','mane'], skin:'#ea580c', belly:'#ffedd5', eye:'#a3e635', mane:'#fff7ed' },
    6:{ body:'brute', f:['crown','sparks','wide'], skin:'#2563eb', belly:'#bfdbfe', eye:'#fde047' },
    7:{ body:'brute', f:['beak','tufts','wings'], skin:'#0f766e', belly:'#99f6e4', eye:'#fde047' },
    8:{ body:'phantom', f:['mask','tophat'], skin:'#be123c', belly:'#fecdd3', eye:'#fde047' },
    9:{ body:'brute', f:['ears','bandit','tail'], skin:'#57534e', belly:'#d6d3d1', eye:'#fbbf24' },
    10:{ body:'brute', f:['horns','tophat','mane'], skin:'#7c3aed', belly:'#e9d5ff', eye:'#34d399', mane:'#f0abfc' },
    11:{ body:'phantom', f:['hood'], skin:'#64748b', belly:'#e2e8f0', eye:'#67e8f9' },
    12:{ body:'brute', f:['horns','mane','crown','wings','tail','cape','fire'], skin:'#312e81', belly:'#c7d2fe', eye:'#f43f5e', mane:'#f97316' }
  },
  daughter: {
    1:{ body:'brute', f:['ears','tusks','mane'], skin:'#4d7c0f', belly:'#d9f99d', eye:'#fde047', mane:'#78350f' },
    2:{ body:'brute', f:['horns','wings','rock'], skin:'#78716c', belly:'#d6d3d1', eye:'#f97316' },
    3:{ body:'phantom', f:['hood','vines'], skin:'#166534', belly:'#bbf7d0', eye:'#a3e635' },
    4:{ body:'kraken', skin:'#1d4ed8', belly:'#93c5fd', eye:'#fde047' },
    5:{ body:'phantom', f:['hood'], skin:'#475569', belly:'#cbd5e1', eye:'#67e8f9' },
    6:{ body:'brute', f:['rock','horns','crown'], skin:'#78716c', belly:'#a8a29e', eye:'#38bdf8' },
    7:{ body:'brute', f:['horns','mane','wings','tail','ice'], skin:'#0891b2', belly:'#cffafe', eye:'#e0f2fe', mane:'#f0f9ff' },
    8:{ body:'phantom', f:['horns','crown','storm'], skin:'#4c1d95', belly:'#c4b5fd', eye:'#f0abfc' },
    9:{ body:'brute', f:['pirate','cape','mane'], skin:'#0f766e', belly:'#ccfbf1', eye:'#fde047', mane:'#e2e8f0' },
    10:{ body:'brute', f:['horns','rock','storm','wide'], skin:'#334155', belly:'#94a3b8', eye:'#4ade80' },
    11:{ body:'phantom', f:['crown','hood'], skin:'#475569', belly:'#cbd5e1', eye:'#7dd3fc' },
    12:{ body:'brute', f:['horns','wings','tail','crown','ice','cape'], skin:'#7c3aed', belly:'#e9d5ff', eye:'#f0f9ff', mane:'#c4b5fd' }
  }
};
let bossSeq = 0;
function bossArt(B, size = 160, track){
  const tk = track || TK, lv = Object.keys(BOSSES[tk] || {}).find(k => BOSSES[tk][k] === B);
  const L = Object.assign({ body:'brute', f:[], skin:B.color, belly:'#fde68a', eye:'#fde047', mane:'#1f2937' }, (BOSS_LOOKS[tk] || {})[lv] || {});
  const has = x => L.f.includes(x), u = 'bs' + (++bossSeq), O = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"`;
  const armor = '#27213a', horn = has('ice') ? '#e0f2fe' : has('rock') ? '#d6d3d1' : '#fef3c7';
  const mirror = d => `<path d="${d}" transform="translate(240 0) scale(-1 1)"`;
  const spikes = (pts, c = '#f8fafc') => pts.map(([x, y, a]) => `<path d="M${x-6} ${y} L${x} ${y-15} L${x+6} ${y}Z" transform="rotate(${a || 0} ${x} ${y})" fill="${c}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`).join('');
  let back = '', body = '', head = '', front = '';
  // glowing aura behind every boss
  back += `<defs><radialGradient id="${u}a"><stop offset="0" stop-color="${L.skin}" stop-opacity=".75"/><stop offset=".6" stop-color="${L.skin}" stop-opacity=".25"/><stop offset="1" stop-color="${L.skin}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
    <filter id="${u}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle cx="120" cy="124" r="118" fill="url(#${u}a)"/>`;
  if (has('wings')){ const w = 'M80 96 Q24 34 4 94 Q24 88 30 112 Q40 92 54 116 Q62 98 82 122Z';
    back += `<path d="${w}" fill="${armor}" ${O}/>${mirror(w)} fill="${armor}" ${O}/><path d="M80 98 L30 64 M80 104 L44 104" stroke="${L.skin}" stroke-width="3" opacity=".7"/>`; }
  if (has('cape')) back += `<path d="M66 100 Q40 180 30 230 L210 230 Q200 180 174 100Z" fill="#7f1d1d" ${O}/><path d="M66 100 Q40 180 30 230 L50 230 Q60 170 80 106Z" fill="#450a0a"/>`;
  if (has('tail')) back += `<path d="M150 192 Q216 214 230 160 Q236 186 214 206 Q190 222 152 206Z" fill="${L.skin}" ${O}/>` + (has('ears') ? `<path d="M222 172 Q236 160 230 150 Q238 176 220 190Z" fill="${L.belly}"/>` : spikes([[214,196,40],[226,178,70]]));
  if (has('shell')) back += `<g ${O}><circle cx="120" cy="140" r="78" fill="#a16207"/><path d="M120 140 m0 -60 a60 60 0 1 1 -1 0 M120 140 m0 -38 a38 38 0 1 1 -1 0 M120 140 m0 -16 a16 16 0 1 1 -1 0" fill="none" stroke="#713f12" stroke-width="5"/></g>`;

  const face = (cx, cy) => {
    let h = '';
    const ex = 15, ey = -6;
    if (has('horns')) h += `<path d="M${cx-30} ${cy-26} Q${cx-58} ${cy-50} ${cx-46} ${cy-82} Q${cx-40} ${cy-56} ${cx-18} ${cy-36}Z" fill="${horn}" ${O}/>${`<path d="M${cx+30} ${cy-26} Q${cx+58} ${cy-50} ${cx+46} ${cy-82} Q${cx+40} ${cy-56} ${cx+18} ${cy-36}Z" fill="${horn}" ${O}/>`}`;
    if (has('ears')) h += `<path d="M${cx-38} ${cy-18} L${cx-50} ${cy-64} L${cx-14} ${cy-36}Z M${cx+38} ${cy-18} L${cx+50} ${cy-64} L${cx+14} ${cy-36}Z" fill="${L.skin}" ${O}/><path d="M${cx-38} ${cy-26} L${cx-44} ${cy-52} L${cx-24} ${cy-36}Z M${cx+38} ${cy-26} L${cx+44} ${cy-52} L${cx+24} ${cy-36}Z" fill="${L.belly}"/>`;
    if (has('antennae')) h += `<path d="M${cx-14} ${cy-34} Q${cx-30} ${cy-80} ${cx-52} ${cy-78} M${cx+14} ${cy-34} Q${cx+30} ${cy-80} ${cx+52} ${cy-78}" stroke="${INK}" stroke-width="4" fill="none"/><circle cx="${cx-52}" cy="${cy-78}" r="8" fill="${L.eye}" ${O} filter="url(#${u}g)"/><circle cx="${cx+52}" cy="${cy-78}" r="8" fill="${L.eye}" ${O} filter="url(#${u}g)"/>`;
    if (has('eyestalks')) h += `<path d="M${cx-16} ${cy-30} L${cx-26} ${cy-74} M${cx+16} ${cy-30} L${cx+26} ${cy-74}" stroke="${L.skin}" stroke-width="10" stroke-linecap="round"/><circle cx="${cx-26}" cy="${cy-78}" r="11" fill="${L.eye}" ${O} filter="url(#${u}g)"/><circle cx="${cx+26}" cy="${cy-78}" r="11" fill="${L.eye}" ${O} filter="url(#${u}g)"/><ellipse cx="${cx-25}" cy="${cy-78}" rx="3" ry="7" fill="${INK}"/><ellipse cx="${cx+27}" cy="${cy-78}" rx="3" ry="7" fill="${INK}"/>`;
    if (has('mane')) h += `<path d="M${cx-46} ${cy-4} L${cx-60} ${cy-26} L${cx-44} ${cy-30} L${cx-50} ${cy-52} L${cx-28} ${cy-46} L${cx-24} ${cy-70} L${cx-6} ${cy-52} L${cx+6} ${cy-74} L${cx+16} ${cy-50} L${cx+34} ${cy-66} L${cx+34} ${cy-42} L${cx+56} ${cy-48} L${cx+46} ${cy-26} L${cx+62} ${cy-20} L${cx+46} ${cy-4}Z" fill="${L.mane}" ${O}/>`;
    if (has('tufts')) h += `<path d="M${cx-34} ${cy-26} L${cx-48} ${cy-58} L${cx-20} ${cy-38}Z M${cx+34} ${cy-26} L${cx+48} ${cy-58} L${cx+20} ${cy-38}Z" fill="${L.skin}" ${O}/>`;
    // the head
    h += `<ellipse cx="${cx}" cy="${cy}" rx="${has('wide') ? 54 : 44}" ry="38" fill="${L.skin}" ${O}/><ellipse cx="${cx}" cy="${cy}" rx="${has('wide') ? 54 : 44}" ry="38" fill="url(#${u}s)"/>`;
    if (has('rock')) h += `<path d="M${cx-30} ${cy-20} l10 8 l-4 10 M${cx+24} ${cy-26} l-6 12 l10 6" stroke="${INK}" stroke-width="2.5" fill="none" opacity=".6"/><circle cx="${cx+26}" cy="${cy-24}" r="6" fill="#65a30d" opacity=".8"/>`;
    if (has('bandit')) h += `<path d="M${cx-42} ${cy-16} Q${cx} ${cy-6} ${cx+42} ${cy-16} L${cx+38} ${cy+2} Q${cx} ${cy+10} ${cx-38} ${cy+2}Z" fill="#1f2937"/>`;
    // snout / beak and mouth
    if (has('beak')) h += `<path d="M${cx-14} ${cy+6} L${cx} ${cy+38} L${cx+14} ${cy+6}Z" fill="#f59e0b" ${O}/><path d="M${cx-12} ${cy+12} L${cx+12} ${cy+12}" stroke="${INK}" stroke-width="2"/>`;
    else {
      h += `<ellipse cx="${cx}" cy="${cy+16}" rx="${has('wide') ? 44 : 30}" ry="20" fill="${L.belly}" ${O}/>`;
      h += `<path d="M${cx-(has('wide') ? 34 : 22)} ${cy+20} Q${cx} ${cy+34} ${cx+(has('wide') ? 34 : 22)} ${cy+20}" stroke="${INK}" stroke-width="3.5" fill="#7f1d1d"/>`;
      h += `<path d="M${cx-16} ${cy+24} l4 -12 l4 12z M${cx+8} ${cy+24} l4 -12 l4 12z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
      h += `<circle cx="${cx-7}" cy="${cy+8}" r="2.6" fill="${INK}"/><circle cx="${cx+7}" cy="${cy+8}" r="2.6" fill="${INK}"/>`;
      if (has('tusks')) h += `<path d="M${cx-24} ${cy+24} q-4 -20 6 -26 q-2 14 2 24z M${cx+24} ${cy+24} q4 -20 -6 -26 q2 14 -2 24z" fill="#fef3c7" ${O}/>`;
    }
    // glowing angry eyes
    if (!has('eyestalks')){
      h += `<g filter="url(#${u}g)"><path d="M${cx-ex-12} ${cy+ey-6} Q${cx-ex} ${cy+ey-12} ${cx-ex+11} ${cy+ey-2} Q${cx-ex} ${cy+ey+8} ${cx-ex-12} ${cy+ey-6}Z" fill="${L.eye}" ${O}/>
        <path d="M${cx+ex+12} ${cy+ey-6} Q${cx+ex} ${cy+ey-12} ${cx+ex-11} ${cy+ey-2} Q${cx+ex} ${cy+ey+8} ${cx+ex+12} ${cy+ey-6}Z" fill="${L.eye}" ${O}/></g>
        <ellipse cx="${cx-ex+1}" cy="${cy+ey-2}" rx="2.6" ry="6" fill="${INK}"/><ellipse cx="${cx+ex-1}" cy="${cy+ey-2}" rx="2.6" ry="6" fill="${INK}"/>
        <path d="M${cx-ex-16} ${cy+ey-16} L${cx-4} ${cy+ey-8} M${cx+ex+16} ${cy+ey-16} L${cx+4} ${cy+ey-8}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
    }
    if (has('mask')) h += `<path d="M${cx-46} ${cy-20} Q${cx} ${cy-30} ${cx+46} ${cy-20} Q${cx+44} ${cy+4} ${cx+20} ${cy+2} Q${cx} ${cy-8} ${cx-20} ${cy+2} Q${cx-44} ${cy+4} ${cx-46} ${cy-20}Z" fill="#fff" ${O}/><ellipse cx="${cx-18}" cy="${cy-10}" rx="9" ry="6" fill="${L.eye}" filter="url(#${u}g)"/><ellipse cx="${cx+18}" cy="${cy-10}" rx="9" ry="6" fill="${L.eye}" filter="url(#${u}g)"/>`;
    // hats and crowns
    if (has('crown')) h += `<path d="M${cx-30} ${cy-30} L${cx-34} ${cy-62} L${cx-16} ${cy-46} L${cx} ${cy-70} L${cx+16} ${cy-46} L${cx+34} ${cy-62} L${cx+30} ${cy-30}Z" fill="#facc15" ${O}/><circle cx="${cx}" cy="${cy-40}" r="5" fill="#ef4444" stroke="${INK}" stroke-width="2"/><circle cx="${cx-20}" cy="${cy-38}" r="3.5" fill="#3b82f6"/><circle cx="${cx+20}" cy="${cy-38}" r="3.5" fill="#22c55e"/>`;
    if (has('tophat')) h += `<path d="M${cx-40} ${cy-30} h80 v-8 h-80z M${cx-26} ${cy-38} v-44 h52 v44z" fill="#111827" ${O}/><rect x="${cx-26}" y="${cy-50}" width="52" height="9" fill="#be123c"/>`;
    if (has('pirate')) h += `<path d="M${cx-50} ${cy-28} Q${cx} ${cy-80} ${cx+50} ${cy-28} Q${cx} ${cy-40} ${cx-50} ${cy-28}Z" fill="#111827" ${O}/><text x="${cx}" y="${cy-42}" font-size="16" text-anchor="middle">☠️</text>`;
    if (has('hood')) h += `<path d="M${cx-52} ${cy+18} Q${cx-56} ${cy-60} ${cx} ${cy-96} Q${cx+56} ${cy-60} ${cx+52} ${cy+18} Q${cx+46} ${cy-36} ${cx} ${cy-44} Q${cx-46} ${cy-36} ${cx-52} ${cy+18}Z" fill="${armor}" ${O}/>`;
    if (has('vines')) h += `<path d="M${cx-48} ${cy-10} q-10 30 4 50 M${cx+48} ${cy-10} q12 26 -2 50" stroke="#15803d" stroke-width="5" fill="none"/><circle cx="${cx-46}" cy="${cy+20}" r="5" fill="#ef4444"/><circle cx="${cx+48}" cy="${cy+28}" r="5" fill="#ef4444"/>`;
    return h;
  };
  const armorPads = () => `<g ${O}><path d="M44 112 Q46 84 76 84 Q96 88 94 112Z" fill="${armor}"/><path d="M196 112 Q194 84 164 84 Q144 88 146 112Z" fill="${armor}"/></g>` + spikes([[56,92,-30],[74,84,-8],[184,92,30],[166,84,8]]);
  const fists = () => {
    const band = (x, y) => `<rect x="${x-20}" y="${y-8}" width="40" height="14" rx="5" fill="${armor}" ${O}/>` + spikes([[x-12,y-8,-20],[x,y-9,0],[x+12,y-8,20]]);
    return `<path d="M68 114 Q26 128 30 170 L58 170 Q58 144 84 132Z" fill="${L.skin}" ${O}/><path d="M172 114 Q214 128 210 170 L182 170 Q182 144 156 132Z" fill="${L.skin}" ${O}/>
      ${band(44, 160)}${band(196, 160)}
      <circle cx="44" cy="180" r="18" fill="${L.skin}" ${O}/><circle cx="196" cy="180" r="18" fill="${L.skin}" ${O}/>
      <path d="M34 176 h20 M34 184 h20 M186 176 h20 M186 184 h20" stroke="${INK}" stroke-width="2" opacity=".5"/>`;
  };
  if (L.body === 'brute'){
    body += `<path d="M82 186 L80 226 L112 226 L112 186Z M158 186 L160 226 L128 226 L128 186Z" fill="${L.skin}" ${O}/>` + `<path d="M76 228 l6 -10 l6 10z M88 228 l6 -10 l6 10z M100 228 l6 -10 l6 10z M128 228 l6 -10 l6 10z M140 228 l6 -10 l6 10z M152 228 l6 -10 l6 10z" fill="#f8fafc" stroke="${INK}" stroke-width="2"/>`;
    body += `<path d="M66 106 Q56 198 120 202 Q184 198 174 106 Q148 86 120 88 Q92 86 66 106Z" fill="${L.skin}" ${O}/><path d="M66 106 Q56 198 120 202 Q184 198 174 106 Q148 86 120 88 Q92 86 66 106Z" fill="url(#${u}s)"/>`;
    body += `<path d="M90 116 Q120 106 150 116 L146 190 Q120 200 94 190Z" fill="${L.belly}" ${O}/><path d="M92 134 Q120 128 148 134 M92 152 Q120 146 148 152 M94 170 Q120 164 146 170" stroke="${INK}" stroke-width="2.5" fill="none" opacity=".55"/>`;
    if (has('bug')) body += `<path d="M64 140 l-22 -6 M64 156 l-24 4 M176 140 l22 -6 M176 156 l24 4" stroke="${INK}" stroke-width="4"/>`;
    body += `<rect x="78" y="176" width="84" height="14" rx="6" fill="${armor}" ${O}/><rect x="110" y="174" width="20" height="18" rx="4" fill="#facc15" ${O}/>`;
    body += fists() + armorPads();
    head = face(120, 64);
  } else if (L.body === 'phantom'){
    body += `<path d="M64 104 Q50 190 66 226 Q80 206 92 228 Q104 208 116 230 Q128 208 140 228 Q154 206 168 226 Q186 190 176 104 Q150 84 120 86 Q90 84 64 104Z" fill="${L.skin}" opacity=".92" ${O}/>`;
    body += `<path d="M64 104 Q50 190 66 226 Q80 206 92 228 Q104 208 116 230 Q128 208 140 228 Q154 206 168 226 Q186 190 176 104 Q150 84 120 86 Q90 84 64 104Z" fill="url(#${u}s)"/>`;
    body += `<path d="M68 112 Q28 120 20 160 Q34 150 40 166 Q46 146 74 136Z M172 112 Q212 120 220 160 Q206 150 200 166 Q194 146 166 136Z" fill="${L.skin}" ${O}/>`;
    body += `<path d="M92 120 Q120 140 148 120" stroke="${L.belly}" stroke-width="4" fill="none" opacity=".7"/>`;
    if (has('storm')) body += `<path d="M30 60 l14 22 l-10 2 l14 24 M210 54 l-14 22 l10 2 l-14 24" stroke="#fde047" stroke-width="4" fill="none" filter="url(#${u}g)" class="boss-zap"/>`;
    head = face(120, 64);
  } else if (L.body === 'blob'){
    body += `<path d="M40 210 Q20 140 60 100 Q90 60 130 64 Q190 70 206 130 Q224 196 196 212 Q182 200 172 216 Q150 202 136 220 Q118 204 100 220 Q84 200 70 216 Q56 200 40 210Z" fill="${L.skin}" ${O}/><path d="M40 210 Q20 140 60 100 Q90 60 130 64 Q190 70 206 130 Q224 196 196 212Z" fill="url(#${u}s)"/>`;
    body += `<circle cx="80" cy="110" r="8" fill="${L.belly}" opacity=".6"/><circle cx="170" cy="150" r="11" fill="${L.belly}" opacity=".5"/><circle cx="64" cy="170" r="6" fill="${L.belly}" opacity=".5"/>`;
    head = face(124, 128);
  } else if (L.body === 'kraken'){
    const tent = (x, d) => `<path d="M${x} 170 Q${x + d*24} 210 ${x + d*44} 214 Q${x + d*56} 200 ${x + d*44} 194 Q${x + d*30} 196 ${x + d*12} 166Z" fill="${L.skin}" ${O}/>`;
    body += [72, 96, 120, 144, 168].map((x, i) => tent(x, i < 2 ? -1 : i > 2 ? 1 : (i % 2 ? 1 : -1))).join('');
    body += `<path d="M30 120 Q10 150 26 176 Q34 156 50 160 Q40 140 60 126Z M210 120 Q230 150 214 176 Q206 156 190 160 Q200 140 180 126Z" fill="${L.skin}" ${O}/>`;
    body += `<ellipse cx="120" cy="110" rx="70" ry="74" fill="${L.skin}" ${O}/><ellipse cx="120" cy="110" rx="70" ry="74" fill="url(#${u}s)"/>`;
    body += `<circle cx="84" cy="64" r="8" fill="${L.belly}" opacity=".6"/><circle cx="154" cy="58" r="10" fill="${L.belly}" opacity=".6"/><circle cx="168" cy="96" r="6" fill="${L.belly}" opacity=".6"/>`;
    head = face(120, 124);
  }
  // fire / sparks / ice in front
  if (has('fire')) front += `<g class="boss-fire">${flameShape(34, 30, 1.3, '#f97316', '#fde047')}${flameShape(206, 26, 1.1, '#ef4444', '#fdba74')}</g>`;
  if (has('sparks')) front += `<path d="M26 40 l12 18 l-8 2 l12 20 M214 36 l-12 18 l8 2 l-12 20" stroke="#fde047" stroke-width="4" fill="none" filter="url(#${u}g)" class="boss-zap"/>`;
  if (has('ice')) front += `<g fill="#e0f2fe" ${O}><path d="M24 40 l6 -14 l6 14 l-6 6z"/><path d="M210 30 l6 -14 l6 14 l-6 6z"/></g>`;
  return `<svg viewBox="0 -28 240 268" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="boss-svg">${back}<g class="boss-body">${body}${head}</g>${front}</svg>`;
}

function bossFor(level){ return (BOSSES[TK] || {})[level] || null; }
function bossReady(){ return K.bossReady === K.level && !!bossFor(K.level); }
function bossCard(){
  const B = bossFor(K.level); if (!B) return null;
  const rec = (K.bossLog || {})[K.level] || { tries:0 };
  return el('div',{class:'card boss-card', style:`--boss:${B.color}`},
    el('div',{class:'boss-tag'}, K.level >= T.levels.length ? '👑 FINAL BOSS' : `⚔️ LEVEL ${K.level} BOSS`),
    el('div',{class:'boss-row'},
      el('div',{class:'boss-face art', html: bossArt(B, 170)}),
      el('div',{class:'grow'},
        el('h2',{}, B.name), el('p',{class:'boss-taunt'}, `"${B.taunt}"`),
        el('div',{class:'hp'}, el('div',{class:'hp-fill', style:'width:100%'}), el('span',{}, 'BOSS POWER 100%')),
        el('p',{class:'muted', style:'color:#fff;opacity:.9'}, TK === 'daughter'
          ? 'Read the boss story, then get 4 or 5 tough questions right to win!'
          : 'Read the boss story out loud, then get 4 or 5 of the 5 questions right to win!'),
        rec.tries ? el('p',{class:'muted', style:'color:#fde68a'}, `Battles tried: ${rec.tries}. You can do it!`) : null,
        el('button',{class:'btn big boss-btn', onclick:()=>{ beep('tap'); bossIntro(); }},'⚔️ BATTLE!'))));
}
function bossIntro(level){
  level = level || K.level;
  const B = bossFor(level);
  const ov = el('div',{class:'boss-intro', style:`--boss:${B.color}`},
    el('div',{class:'epic-rays'}),
    el('div',{class:'boss-intro-card'},
      el('div',{class:'boss-vs'}, K.hero ? heroNode(130) : el('div',{html: avatarSVG(K.avatar, 120)}), el('span',{class:'vs'},'VS'), el('div',{class:'boss-face big art', html: bossArt(B, 220)})),
      (K.bossesBeaten || []).includes(level) || level < K.level ? el('p',{style:'color:#fde68a;font-weight:700'}, `Rematch! Win to collect a missing ${(setForLevel(level) || {}).name || ''} gear piece.`) : null,
      el('h2',{}, B.name), el('p',{class:'boss-taunt'}, `"${B.taunt}"`),
      el('div',{class:'row center'},
        el('button',{class:'btn big boss-btn', onclick:()=>{ ov.remove(); startBossBattle(level); }},'⚔️ FIGHT WITH READING!'),
        el('button',{class:'btn small gray', onclick:()=>ov.remove()},'Not yet'))));
  document.body.append(ov); beep('level'); say(`${B.name} appears! ${B.taunt}`);
}
function startBossBattle(level){
  level = level || K.level;
  const B = bossFor(level);
  if (bossResting(level)){ beep('tap'); say('The boss is resting. Come back tomorrow for a rematch!'); modal(el('div',{}, el('div',{class:'big-e'},'😴'), el('h2',{}, B.name + ' is resting'), el('p',{}, 'You battled today. Answers count, so the rematch is tomorrow. Read a story today to get stronger!')), [['OK','',1]]); return; }
  K.bossLog = K.bossLog || {}; const rec = K.bossLog[level] = Object.assign({ tries:0, wins:0 }, K.bossLog[level] || {});
  const resuming = K.bossRun && K.bossRun.level === level && K.bossRun.date === todayStr() && !K.bossRun.done;
  if (!resuming) rec.tries++; save();
  const story = Object.assign({ series:'boss' }, B.story);
  if (TK === 'daughter'){
    startQuietRead(story, { storyKey:'boss_' + level, boss:B, level });
    run.opts.boss = B; bossHud();
  } else {
    const pages = storyPages(story.text);
    beginRun({ kind:'story', level, title:'⚔️ ' + story.title, emoji:B.e, story, storyKey:'boss_' + level, series:'boss', pages }, { mode:'normal', boss:B });
  }
}
// Boss power: 100% from questions for both kids (the mic doesn't score)
function bossPower(){
  if (!run || !run.opts.boss) return 100;
  const a = run.act, quiz = run.quiz;
  const qFrac = quiz ? quiz.correct / quiz.qs.length : 0;
  void a; return Math.max(0, Math.round(100 - 100 * qFrac));   // questions decide the battle, so only questions drain the boss
}
function bossHud(hit){
  if (!run || !run.opts.boss){ const h = $('.boss-hud'); if (h) h.remove(); return; }
  const B = run.opts.boss, pw = bossPower();
  let h = $('.boss-hud');
  if (!h){ h = el('div',{class:'boss-hud', style:`--boss:${B.color}`}, el('span',{class:'boss-face sm art', html: bossArt(B, 52)}), el('div',{class:'grow'}, el('b',{}, B.name), el('div',{class:'hp'}, el('div',{class:'hp-fill'}), el('span',{})))); document.body.append(h); }
  h.querySelector('.hp-fill').style.width = pw + '%';
  h.querySelector('.hp span').textContent = `BOSS POWER ${pw}%`;
  if (hit){ const f = h.querySelector('.boss-face'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); }
}
async function bossResult(){
  const r = run, a = r.act, B = r.opts.boss, R = r.reading || computeReading();
  const quiz = r.quiz ? { c:r.quiz.correct, t:r.quiz.qs.length } : { c:0, t:1 };
  const won = quiz.c / quiz.t >= 0.8;   // boss fights are won on the questions
  if (K.bossRun && K.bossRun.level === a.level){ K.bossRun.done = true; K.bossRun.won = won; }
  const hud = $('.boss-hud'); if (hud) hud.remove();
  addReadingTime(Math.min(Date.now() - r.startedAt, MAX_ACTIVITY_MS));
  if (!a.quiet) trackWords(a);
  K.sessions.unshift({ id:r.sessionId, date:new Date().toISOString(), level:a.level, title:'⚔️ Boss: ' + B.name, kind:'story', mode:'boss', series:'boss',
    total:R.total||0, correct:R.correct||0, helped:R.helped||0, accuracy: a.quiet ? Math.round(quiz.c / quiz.t * 1000)/10 : Math.round((R.accuracy||0)*1000)/10,
    wcpm:R.wcpm||null, quiz: quiz.c + '/' + quiz.t, missed:[...new Set(R.missed||[])].slice(0,20), stars: won ? 3 : 1, ms: Date.now() - r.startedAt });
  const rec = K.bossLog[a.level];
  const replay = a.level !== K.level || (K.bossesBeaten || []).includes(a.level);
  if (won && replay){
    rec.wins++; rec.date = todayStr();
    K.bossesBeaten = [...new Set((K.bossesBeaten || []).concat(a.level))];
    K.stars += 3; save();
    confetti(100); beep('level'); burst('K.O.!'); say(`You beat ${B.name} again!`);
    await modal(el('div',{}, el('div',{class:'big-e', html: bossArt(B, 140)}), el('h2',{}, `${B.name} defeated again!`), el('p',{}, `"${B.defeat}" +3 ⭐`)), [['🎁 Get my loot!','',1]]);
    await bossGearDrop(a.level, true); awardChest('gold', 'Boss defeated');
    await checkBadges(); run = null; return screenQuestMap();
  }
  if (won){
    rec.wins++; rec.date = todayStr();
    K.bossesBeaten = [...new Set((K.bossesBeaten || []).concat(a.level))];
    K.bossReady = null; K.stars += 10;
    const top = K.level >= T.levels.length;
    if (!top){ K.level++; K.passStreak = 0; K.failStreak = 0; awardTrophiesUpTo(K.level); }
    save();
    addCosmic(5, `Defeated ${B.name}!`);
    const ov = el('div',{class:'boss-intro boss-win', style:`--boss:${B.color}`}, el('div',{class:'epic-rays'}),
      el('div',{class:'boss-intro-card'},
        el('div',{class:'boss-face big defeated art', html: bossArt(B, 220)}),
        el('h2',{}, 'BOSS DEFEATED!'), el('p',{class:'boss-taunt'}, `"${B.defeat}"`),
        el('p',{style:'font-size:22px;font-weight:700'}, top ? '👑 You beat the FINAL BOSS! You are a reading legend!' : `${TK === 'daughter' ? 'Rank' : 'Level'} ${K.level} unlocked! +10 ⭐ +5 💫`),
        el('button',{class:'btn big', onclick:async()=>{ ov.remove(); await bossGearDrop(a.level, false); awardChest('gold', 'Boss defeated'); if (!top){ awardChest('cosmic', 'Level up'); await levelUpCinematic(K.level, { cosmic:false }); } await checkBadges(); run = null; screenHome(); }},'🏆 Victory! Get my loot ▶')));
    document.body.append(ov); confetti(160); beep('level'); burst('K.O.!');
    say(`You defeated ${B.name}! ${B.defeat}`);
  } else {
    save();
    const pw = bossPower();
    const tip = `You got ${quiz.c} of ${quiz.t} questions right. You need ${Math.ceil(quiz.t*0.8)} to win.`;
    await modal(el('div',{}, el('div',{class:'big-e', html: bossArt(B, 140)}), el('h2',{}, `${B.name} is still standing!`),
      el('p',{}, `Boss power left: ${pw}%. ${tip}`), el('p',{}, 'Every battle makes you stronger. The boss rests tonight. Rematch tomorrow!')), [['💪 Back','',1]]);
    await checkBadges(); run = null; replay ? screenQuestMap() : screenHome();
  }
}


/* ================= LEVEL-UP CELEBRATION =================
   A full-screen moment: light bursts, the crest flips from the old rank to the new one,
   then each reward appears one at a time. Resolves when the reader taps Continue. */
const RANK_COLORS = ['#a16207','#a16207','#64748b','#64748b','#ca8a04','#ca8a04','#7c3aed','#7c3aed','#0f766e','#c2410c','#0284c7','#b91c1c'];
function rankCrestSVG(n, col){
  const laurel = side => Array.from({ length:7 }, (_, i) => { const a = (200 + i * 19) * Math.PI / 180, r = 98, x = 120 + side * Math.cos(a) * r * -1, y = 128 + Math.sin(a) * r * -1;
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="9" ry="18" transform="rotate(${side * (110 - i * 19)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="url(#lvl-leaf)" stroke="#5b3a06" stroke-width="2"/>`; }).join('');
  return `<svg viewBox="0 0 240 260" class="lv-crest-svg">
  <defs><linearGradient id="lvl-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d1"/><stop offset=".45" stop-color="#fbbf24"/><stop offset="1" stop-color="#92400e"/></linearGradient>
  <linearGradient id="lvl-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(col, .35)}"/><stop offset=".6" stop-color="${col}"/><stop offset="1" stop-color="${shade(col, -.45)}"/></linearGradient>
  <linearGradient id="lvl-leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs>
  ${laurel(1)}${laurel(-1)}
  <path d="M120 20 L200 50 Q204 150 120 232 Q36 150 40 50Z" fill="url(#lvl-gold)" stroke="#5b3a06" stroke-width="4" stroke-linejoin="round"/>
  <path d="M120 36 L186 60 Q188 146 120 214 Q52 146 54 60Z" fill="url(#lvl-face)" stroke="#3b2506" stroke-width="2.5"/>
  <path d="M120 36 L186 60 Q186 80 180 100 Q120 70 60 100 Q54 80 54 60Z" fill="#fff" opacity=".16"/>
  <path d="M84 14 l10 18 l12 -22 l14 22 l14 -22 l12 22 l10 -18 l-6 30 h-60z" fill="url(#lvl-gold)" stroke="#5b3a06" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="120" cy="30" r="5" fill="#f0abfc" stroke="#5b3a06" stroke-width="1.5"/>
  <text x="120" y="160" text-anchor="middle" class="lv-num" font-family="'Cinzel Decorative','Cinzel',serif" font-weight="900" font-size="92" fill="#fff8dc" stroke="#3b2506" stroke-width="3" paint-order="stroke">${n}</text>
  </svg>`;
}
function levelUpCinematic(level, opts = {}){
  return new Promise(resolve => {
    const girl = TK === 'daughter', word = girl ? 'Rank' : 'Level', L = levelDef(level), tr = (TROPHIES[TK] || [])[level - 1];
    const col = RANK_COLORS[(level - 1) % RANK_COLORS.length], S = setForLevel(level), B = bossFor(level);
    const rewards = [];
    if (tr) rewards.push([tr[0], `${tr[1]} trophy`, 'Your new trophy is on the shelf']);
    if (opts.cosmic !== false) rewards.push(['💫', '+5 Cosmic Power', 'Spend it on legendary things']);
    if (opts.chest !== false) rewards.push(['🎁', 'Cosmic treasure chest', 'Open it on your home screen']);
    if (L && L.stories && L.stories.length) rewards.push(['📜', `${L.stories.length} new ${girl ? 'chapters' : 'stories'}`, L.stories.slice(0, 2).map(x => x.title).join(' · ')]);
    if (S) rewards.push(['🛡️', `${S.name} armor revealed`, B ? `Beat ${B.name} to win the pieces` : 'Win the pieces in battle']);
    if (level === AVATAR_UNLOCK_LEVEL) rewards.push(['🐾', 'New reading buddy', 'Find it in the Star Shop']);
    if (typeof legendaryAt === 'function' && legendaryAt(level)) rewards.push(['✨', `Legendary ${girl ? 'dragon' : 'Pocket Pal'}`, 'It can now appear when you read']);
    const sparks = el('div',{class:'lv-sparks'}); for (let i = 0; i < 30; i++) sparks.append(el('i',{style:`left:${(i * 41) % 100}%;animation-delay:-${(i * .37).toFixed(2)}s;animation-duration:${4 + (i % 4)}s`}));
    const crest = el('div',{class:'lv-crest', html: rankCrestSVG(Math.max(1, level - 1), col)});
    const list = el('div',{class:'lv-rewards'});
    const go = el('button',{class:'lv-go', onclick:()=>{ ov.classList.add('out'); setTimeout(() => { ov.remove(); resolve(); }, 450); }}, el('span',{}, 'Continue ▶'));
    const ov = el('div',{class:'lv-overlay', style:`--rank:${col}`},
      el('div',{class:'lv-rays'}), el('div',{class:'lv-ring'}), sparks,
      el('div',{class:'lv-stage'},
        el('div',{class:'lv-kicker'}, opts.newLevels ? '✦ New adventures unlocked ✦' : '✦ ' + kidName() + ' ✦'),
        crest,
        el('h1',{class:'lv-title', 'data-t': girl ? 'RANK UP!' : 'LEVEL UP!'}, girl ? 'RANK UP!' : 'LEVEL UP!'),
        el('div',{class:'lv-name'}, `${word} ${level} · ${L ? L.title : ''}`),
        el('div',{class:'lv-hero', html: heroSVG(120)}),
        list, go));
    document.body.append(ov);
    try { beep('level'); } catch(e){}
    // the crest flips from the old number to the new one
    setTimeout(() => { crest.classList.add('flip'); setTimeout(() => { crest.innerHTML = rankCrestSVG(level, col); crest.classList.remove('flip'); crest.classList.add('flash'); ov.classList.add('boom'); confetti(140); try { beep('star'); } catch(e){} }, 260); }, 900);
    setTimeout(() => say(girl ? `Rank up! You are now a ${L ? L.title : 'rank ' + level}!` : `Level up! Welcome to level ${level}, ${L ? L.title : ''}!`), 1100);
    rewards.forEach((r, i) => setTimeout(() => { list.append(el('div',{class:'lv-rw'}, el('span',{class:'lv-ri'}, r[0]), el('span',{}, el('b',{}, r[1]), el('small',{}, r[2])))); try { beep('tap'); } catch(e){} }, 1700 + i * 420));
    setTimeout(() => go.classList.add('on'), 1900 + rewards.length * 420);
  });
}

/* ================= REAL BOOKS: log the books they read on paper ================= */
const REAL_BOOK_IDEAS = {
  son: ['Nate the Great','Pete the Cat (I Can Read)','Elephant & Piggie','Frog and Toad Are Friends','Hi! Fly Guy','Danny and the Dinosaur','Go, Dog. Go!','Green Eggs and Ham','The Cat in the Hat','Bob Books'],
  daughter: ['Dragon Masters','The Baby-Sitters Club (graphic novel)','Frog and Toad Together','Henry and Mudge','Mercy Watson','Magic Tree House','Princess in Black','Owl Diaries','Elephant & Piggie','Fly Guy']
};
const BOOK_COVERS = ['📕','📗','📘','📙','🐉','🐱','🦖','🦄','🚀','🕵️','🏰','🌈'];
function realBooks(){ K.realBooks = K.realBooks || []; return K.realBooks; }
function screenRealBooks(){
  stopAll();
  const list = realBooks();
  const shelf = el('div',{class:'real-shelf'}, ...list.slice().reverse().map(b => el('div',{class:'real-book', title:b.title},
    el('span',{class:'rb-cover'}, b.cover), el('span',{class:'rb-title'}, b.title), el('span',{class:'rb-meta'}, '⭐'.repeat(b.rating||0) + ' · ' + b.date))));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'📚 My Real Books'), el('div')),
    el('div',{class:'card'},
      el('h2',{style:'margin-top:0'}, `${list.length} real book${list.length === 1 ? '' : 's'} read!`),
      el('p',{style:'font-size:19px'}, 'Finished a paper book? Add it to your shelf! Tell about it in your own words to earn +5 ⭐ and +2 💫.'),
      el('button',{class:'btn big', onclick:addRealBook},'➕ I finished a book!')),
    list.length ? el('div',{class:'card', style:'margin-top:16px'}, shelf) : null));
}
function addRealBook(){
  let cover = BOOK_COVERS[0], rating = 0;
  const title = el('input',{type:'text', class:'rb-input', placeholder:'Book title'});
  const ideas = el('div',{class:'rb-ideas'}, ...REAL_BOOK_IDEAS[TK].map(t => el('button',{class:'chip', onclick:()=>{ title.value = t; }}, t)));
  const covers = el('div',{class:'rb-covers'}, ...BOOK_COVERS.map(c => { const b = el('button',{class:'rb-cov' + (c === cover ? ' on' : ''), onclick:()=>{ cover = c; [...covers.children].forEach(x => x.classList.toggle('on', x === b)); }}, c); return b; }));
  const stars = el('div',{class:'rb-stars'}, ...[1,2,3,4,5].map(n => { const b = el('button',{onclick:()=>{ rating = n; [...stars.children].forEach((x,i) => x.textContent = i < n ? '⭐' : '☆'); }}, '☆'); return b; }));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:screenRealBooks},'← Back'), el('h1',{class:'title'},'➕ Add a Book'), el('div')),
    el('div',{class:'card'},
      el('h3',{style:'margin-top:0'},'1. What book did you read?'), title, el('p',{class:'muted'},'Ideas:'), ideas,
      el('h3',{},'2. Pick a cover'), covers,
      el('h3',{},'3. How much did you like it?'), stars,
      el('div',{class:'row', style:'margin-top:16px'},
        el('button',{class:'btn big', onclick:()=>{ if (!title.value.trim()){ say('Type the name of the book first!'); return; } retellBook({ title:title.value.trim(), cover, rating }); }},'▶ Next: tell about it')))));
}
// Retell: kid explains the book out loud; speech is captured (not scored word-by-word).
function retellBook(book){
  let words = [], listening = false, rec = null;
  const out = el('div',{class:'rb-heard'}, 'Tap the 🎤 and tell what happened in the book: who was in it, what happened, and how it ended.');
  const count = el('div',{class:'muted'});
  const need = TK === 'son' ? 12 : 25;
  const mic = el('button',{class:'mic', onclick:()=>{
    if (useManual()){ return; }
    if (listening){ try { rec.stop(); } catch(e){} return; }
    try { rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true; } catch(e){ return; }
    let finals = [];
    rec.onresult = ev => { let interim = []; for (let i = ev.resultIndex; i < ev.results.length; i++){ const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) finals.push(t); else interim.push(t); }
      const all = finals.concat(interim).join(' '); words = all.split(/\s+/).filter(Boolean); out.textContent = all; count.textContent = `${words.length} words · ${words.length >= need ? '✅ great retell!' : `say about ${need - words.length} more`}`; };
    rec.onend = () => { listening = false; mic.classList.remove('on'); mic.textContent = '🎤'; };
    rec.start(); listening = true; mic.classList.add('on'); mic.textContent = '⏹'; }}, '🎤');
  const finish = (approved) => {
    if (!approved && words.length < need){ say(`Tell me a little more about ${book.title}!`); return; }
    try { if (rec) rec.stop(); } catch(e){}
    realBooks().push({ title:book.title, cover:book.cover, rating:book.rating, date:todayStr(), retell: out.textContent.slice(0, 400) });
    K.stars += 5; save(); addCosmic(2, 'Real book: ' + book.title); awardChest('wood', 'Real book');
    confetti(90); beep('level'); say(`You added ${book.title} to your shelf! Great reading!`);
    checkBadges().then(screenRealBooks);
  };
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:screenRealBooks},'← Back'), el('h1',{class:'title'}, book.cover + ' ' + book.title), el('div')),
    el('div',{class:'card center'},
      el('h2',{style:'margin-top:0'},'Tell about the book!'),
      el('p',{style:'font-size:19px'},'Who was in it? What happened? How did it end? What was your favorite part?'),
      useManual() ? el('p',{class:'banner'},'Tell a grown-up about the book, then they tap ✓ below.') : mic,
      out, count,
      el('div',{class:'row center', style:'margin-top:14px'},
        useManual() ? null : el('button',{class:'btn big green', onclick:()=>finish(false)},'✅ Done telling'),
        el('button',{class:'btn small gray', onclick:()=>finish(true)},'✓ Grown-up heard it')))));
  say('Tell me about the book! Who was in it, and what happened?');
}

/* ================= HERO, GEAR SETS & QUEST MAP =================
   Each kid has a person hero (their own look) with their buddy as a companion.
   8 gear slots, 9 original tier sets (Traveler starter + one set per level).
   Loot: a great read at a level drops a random common piece of that level's set.
   Beating that level's boss drops the rare pieces (helmet + weapon).
   Beaten bosses can be re-battled on the Quest Map to collect missing pieces.
   ================================================================= */
const GEAR_SLOTS = ['helmet','shoulders','chest','gloves','belt','pants','boots','weapon'];
const SLOT_LABEL = { helmet:'Helmet', shoulders:'Shoulders', chest:'Chest Armor', gloves:'Gloves', belt:'Belt', pants:'Pants', boots:'Boots', weapon:'Weapon' };
const SLOT_ICON  = { helmet:'⛑️', shoulders:'🛡️', chest:'🦺', gloves:'🧤', belt:'🎗️', pants:'👖', boots:'🥾', weapon:'⚔️' };
const BOSS_PIECES = ['helmet','weapon'];
const COMMON_PIECES = GEAR_SLOTS.filter(s => !BOSS_PIECES.includes(s));
// tier = level that drops it. motif changes the shapes; colors: prim (main), sec, trim (metal), gem (glow)
const GEAR_SETS = [
  { id:'traveler', tier:0, name:'Traveler',        title:'Traveler',          motif:'cloth',   prim:'#8b5e3c', sec:'#c9a27a', trim:'#6b4a2e', gem:'#fde68a' },
  { id:'squire',   tier:1, name:'Oakwood Squire',  title:'Oakwood Squire',    motif:'leaf',    prim:'#6b8e3d', sec:'#a3c26a', trim:'#8b5e3c', gem:'#d9f99d' },
  { id:'ember',    tier:2, name:'Ember',           title:'Ember Knight',      motif:'flame',   prim:'#b91c1c', sec:'#f97316', trim:'#facc15', gem:'#fde047' },
  { id:'frost',    tier:3, name:'Frostguard',      title:'Frostguard',        motif:'crystal', prim:'#1e40af', sec:'#93c5fd', trim:'#e0f2fe', gem:'#a5f3fc' },
  { id:'jade',     tier:4, name:'Jade Guardian',   title:'Jade Guardian',     motif:'leaf',    prim:'#065f46', sec:'#34d399', trim:'#fbbf24', gem:'#6ee7b7' },
  { id:'storm',    tier:5, name:'Stormcaller',     title:'Stormcaller',       motif:'storm',   prim:'#4c1d95', sec:'#6366f1', trim:'#facc15', gem:'#fde047' },
  { id:'shadow',   tier:6, name:'Nightshade',      title:'Nightshade Ranger', motif:'shadow',  prim:'#1f1235', sec:'#7e22ce', trim:'#c084fc', gem:'#e879f9' },
  { id:'starforge',tier:7, name:'Starforged',      title:'Starforged Champion',motif:'star',   prim:'#1e3a8a', sec:'#312e81', trim:'#fbbf24', gem:'#fef08a' },
  { id:'celestial',tier:8, name:'Celestial',       title:'Celestial Legend',  motif:'wing',    prim:'#f8fafc', sec:'#fde68a', trim:'#f59e0b', gem:'#f0abfc' },
  // ranks 9–12: the legendary sets
  { id:'tempest',  tier:9, name:'Tempest',         title:'Tempest Warden',    motif:'storm',   prim:'#0f766e', sec:'#5eead4', trim:'#e2e8f0', gem:'#a5f3fc' },
  { id:'phoenix',  tier:10,name:'Phoenix',         title:'Phoenix Lord',      motif:'flame',   prim:'#9a3412', sec:'#fbbf24', trim:'#fef3c7', gem:'#fde047' },
  { id:'glacier',  tier:11,name:'Glacier Crown',   title:'Glacier Sovereign', motif:'crystal', prim:'#e0f2fe', sec:'#7dd3fc', trim:'#c0c0d8', gem:'#38bdf8' },
  { id:'dragonlord',tier:12,name:'Dragonlord',     title:'Dragonlord',        motif:'shadow',  prim:'#111827', sec:'#b91c1c', trim:'#fbbf24', gem:'#f87171' }
];
const ARCHMAGE = { id:'archmage', tier:9, name:'Archmage', title:'Archmage Supreme', motif:'wizard', prim:'#3b0764', sec:'#7c3aed', trim:'#fbbf24', gem:'#67e8f9' };
const SET_BY_ID = Object.fromEntries(GEAR_SETS.concat([ARCHMAGE]).map(g => [g.id, g]));
const armorySets = () => (isDev() ? GEAR_SETS.concat([ARCHMAGE]) : GEAR_SETS).map(g => g.id === 'traveler' ? starterSet() : g);
// starter outfits: a pink-and-lavender Blossom outfit for Gia's track, a blue Explorer outfit with a red scarf for Miles's
const STARTER = {
  daughter: { id:'traveler', tier:0, name:'Blossom', title:'Blossom', motif:'petal', prim:'#ec4899', sec:'#fbcfe8', trim:'#a855f7', gem:'#fde68a', boot:'#f9a8d4', belt:'#c084fc', buckle:'#fde68a', pants:'#c4b5fd' },
  son:      { id:'traveler', tier:0, name:'Explorer', title:'Explorer', motif:'scout', prim:'#2563eb', sec:'#93c5fd', trim:'#1e3a8a', gem:'#facc15', boot:'#374151', belt:'#1f2937', buckle:'#facc15', pants:'#475569' }
};
// whose hero is being drawn (K is swapped while drawing the other kid's hero)
function heroKidKey(){ const k = Object.keys(DB.kids).find(x => DB.kids[x] === K); if (k && k !== 'dev') return styleOf(k) === 'girl' ? 'daughter' : 'son'; return K && K.__style ? (K.__style === 'girl' ? 'daughter' : 'son') : (TK || 'son'); }
const starterSet = () => STARTER[heroKidKey()];
const setForLevel = lv => GEAR_SETS.find(g => g.tier === lv);
const SKIN_TONES = ['#fde3c8','#f5c9a0','#e0a878','#c68a5a','#9a6440','#6b4428'];
const HAIR_COLORS = ['#1f1b18','#5b3a21','#a0612f','#e7c46a','#b5462a','#f472b6','#60a5fa','#a78bfa','#f1f5f9'];
const HAIR_STYLES = { short:'Short', spiky:'Spiky', long:'Long', ponytail:'Ponytail', curly:'Curly', buns:'Space Buns' };

function heroState(){
  K.hero = K.hero || null;
  K.gear = Object.assign({ owned:{ traveler: GEAR_SLOTS.slice() }, eq:{} }, K.gear || {});
  GEAR_SLOTS.forEach(s => { if (!K.gear.eq[s]) K.gear.eq[s] = 'traveler'; });
  return K.gear;
}
const hasPiece = (setId, slot) => (heroState().owned[setId] || []).includes(slot);
function givePiece(setId, slot){ const G = heroState(); G.owned[setId] = G.owned[setId] || []; if (!G.owned[setId].includes(slot)) G.owned[setId].push(slot); save(); }
function fullSetOn(){ const G = heroState(); const id = G.eq.helmet; return id && id !== 'traveler' && GEAR_SLOTS.every(s => G.eq[s] === id) ? SET_BY_ID[id] : null; }
function setCount(setId){ return (heroState().owned[setId] || []).length; }

/* ---------- hero drawing ---------- */
function spikes(cx, cy, n, len, spread, base, col, stroke){
  let s = '';
  for (let i = 0; i < n; i++){ const a = (base - spread/2 + spread * (n === 1 ? .5 : i/(n-1))) * Math.PI/180;
    const x2 = cx + Math.cos(a) * len, y2 = cy + Math.sin(a) * len, px = Math.cos(a + Math.PI/2) * 5, py = Math.sin(a + Math.PI/2) * 5;
    s += `<path d="M${cx+px} ${cy+py} L${x2} ${y2} L${cx-px} ${cy-py}Z" fill="${col}" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round"/>`; }
  return s;
}
const flameShape = (x, y, k, c1, c2) => `<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0 C-10 -8 -6 -20 0 -30 C2 -22 8 -20 6 -12 C10 -16 12 -22 10 -28 C18 -18 16 -4 0 0Z" fill="${c1}"/><path d="M2 -2 C-2 -8 0 -14 3 -18 C5 -12 8 -10 6 -4Z" fill="${c2}"/></g>`;
const starShape = (x, y, r, c) => `<path d="M${x} ${y-r} l${r*.3} ${r*.62} l${r*.68} ${r*.1} l-${r*.5} ${r*.48} l${r*.12} ${r*.68} l-${r*.6} -${r*.32} l-${r*.6} ${r*.32} l${r*.12} -${r*.68} l-${r*.5} -${r*.48} l${r*.68} -${r*.1}z" fill="${c}"/>`;
const INK = '#24141f'; // dark warm outline: crisp, game-art look
let heroSeq = 0;
const EYE_COLORS = ['#6b3f1f','#2f6fd6','#2f9e5b','#8b5cf6','#2a2230'];

function gearPiece(slot, S, hero){
  const { prim, sec, trim, gem, motif } = S;
  const glow = S.tier >= 2 ? `filter="url(#hglow)"` : '';
  switch (slot){
    case 'pants': return `<rect x="72" y="160" width="27" height="52" rx="6" fill="${S.tier ? prim : (S.pants || prim)}" stroke="${INK}" stroke-width="3"/><rect x="101" y="160" width="27" height="52" rx="6" fill="${S.tier ? prim : (S.pants || prim)}" stroke="${INK}" stroke-width="3"/>
      ${S.tier ? `<rect x="76" y="176" width="19" height="14" rx="4" fill="${sec}" stroke="${trim}" stroke-width="2"/><rect x="105" y="176" width="19" height="14" rx="4" fill="${sec}" stroke="${trim}" stroke-width="2"/>` : ''}
      ${motif === 'flame' ? flameShape(85, 206, .5, sec, gem) + flameShape(114, 206, .5, sec, gem) : ''}${motif === 'star' ? starShape(85, 198, 5, trim) + starShape(114, 198, 5, trim) : ''}`;
    case 'boots': return `<path d="M70 204 h30 v22 q0 8 -8 8 h-30 q-6 0 -4 -7 l6 -5 z" fill="${S.tier ? sec : (S.boot || '#5b3a21')}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M100 204 h30 v22 q0 8 -8 8 h-18 q-6 0 -4 -7z" fill="${S.tier ? sec : (S.boot || '#5b3a21')}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${S.tier ? `<rect x="70" y="204" width="30" height="7" fill="${trim}" stroke="${INK}" stroke-width="2"/><rect x="100" y="204" width="30" height="7" fill="${trim}" stroke="${INK}" stroke-width="2"/>` : ''}
      ${motif === 'wing' ? `<path d="M70 210 q-14 -6 -16 -16 q10 4 16 6z M130 210 q14 -6 16 -16 q-10 4 -16 6z" fill="#fff" stroke="${trim}" stroke-width="1.5"/>` : ''}
      ${motif === 'crystal' ? spikes(70, 212, 2, 12, 40, 200, '#e0f2fe', '#60a5fa') + spikes(130, 212, 2, 12, 40, 340, '#e0f2fe', '#60a5fa') : ''}${motif === 'flame' ? flameShape(68, 214, .45, '#f97316', '#fde047') + flameShape(132, 214, .45, '#f97316', '#fde047') : ''}`;
    case 'chest': if (motif === 'wizard') return `<path d="M68 104 q32 -10 64 0 l14 112 q-46 10 -92 0z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M100 100 v114" stroke="${trim}" stroke-width="4"/><path d="M56 208 q44 10 88 0" stroke="${trim}" stroke-width="4" fill="none"/>
        ${starShape(80, 150, 6, trim)}${starShape(122, 176, 5, gem)}${starShape(76, 192, 4, gem)}${starShape(124, 132, 4, trim)}<path d="M84 130 a6 6 0 1 0 7 -7 a5 5 0 1 1 -7 7z" fill="${trim}"/>
        <circle cx="100" cy="120" r="7" fill="${gem}" stroke="${trim}" stroke-width="2.5" ${glow}/>`;
      return `<path d="M68 104 q32 -10 64 0 l4 56 h-72z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      ${S.tier ? `<path d="M80 108 q20 -6 40 0 l-2 34 q-18 10 -36 0z" fill="${sec}" stroke="${trim}" stroke-width="3"/><path d="M100 108 v42" stroke="${trim}" stroke-width="2"/>` : `<path d="M90 104 l10 14 l10 -14" stroke="${S.sec}" stroke-width="3" fill="none"/>`}
      ${S.tier >= 2 ? `<circle cx="100" cy="126" r="7" fill="${gem}" stroke="${trim}" stroke-width="2.5" ${glow}/>` : ''}
      ${motif === 'scout' ? `<path d="M84 102 q16 12 32 0 l-6 10 q-10 6 -20 0z" fill="#ef4444" stroke="${INK}" stroke-width="2"/><path d="M96 110 l-6 18 l8 -4z" fill="#ef4444" stroke="${INK}" stroke-width="2"/>${starShape(118, 128, 6, gem)}` : ''}
      ${motif === 'petal' ? `<path d="M86 104 q14 10 28 0" stroke="#fff" stroke-width="4" fill="none"/>${[[90,126],[110,136]].map(([x,y]) => [0,72,144,216,288].map(a => `<circle cx="${x + Math.cos(a*Math.PI/180)*4}" cy="${y + Math.sin(a*Math.PI/180)*4}" r="3" fill="#fff"/>`).join('') + `<circle cx="${x}" cy="${y}" r="2.5" fill="${gem}"/>`).join('')}` : ''}
      ${motif === 'flame' ? flameShape(100, 120, .55, '#f97316', gem) : ''}${motif === 'leaf' && S.tier ? `<path d="M100 132 q-10 -10 0 -20 q10 10 0 20z" fill="${trim}"/>` : ''}
      ${motif === 'storm' ? `<path d="M104 112 l-8 14 h7 l-5 12 l12 -16 h-7 l5 -10z" fill="${gem}" stroke="${INK}" stroke-width="1.2"/>` : ''}
      ${motif === 'star' ? starShape(100, 126, 9, trim) : ''}${motif === 'shadow' ? `<path d="M86 112 q14 26 28 0" stroke="${trim}" stroke-width="2.5" fill="none"/>` : ''}
      ${motif === 'wing' ? `<path d="M100 114 q-14 6 -18 18 q10 -4 18 -4 q8 0 18 4 q-4 -12 -18 -18z" fill="${trim}"/>` : ''}
      ${S.tier ? `<path d="M64 160 h72 l-4 16 h-64z" fill="${sec}" stroke="${INK}" stroke-width="2.5"/><path d="M76 160 v16 M88 160 v16 M100 160 v16 M112 160 v16 M124 160 v16" stroke="${trim}" stroke-width="1.5"/>` : ''}`;
    case 'belt': return `<rect x="66" y="152" width="68" height="11" rx="3" fill="${S.tier ? trim : (S.belt || '#5b3a21')}" stroke="${INK}" stroke-width="2.5"/><rect x="93" y="149" width="14" height="17" rx="3" fill="${S.tier ? gem : (S.buckle || '#c9a27a')}" stroke="${INK}" stroke-width="2.5"/>`;
    case 'gloves': return [52, 148].map(x => `<circle cx="${x}" cy="160" r="9" fill="${S.tier ? sec : hero.skin}" stroke="${INK}" stroke-width="3"/>${S.tier ? `<rect x="${x-10}" y="146" width="20" height="9" rx="3" fill="${trim}" stroke="${INK}" stroke-width="2"/>` : ''}${motif === 'crystal' ? spikes(x, 148, 1, 10, 0, x < 100 ? 200 : 340, '#e0f2fe', '#60a5fa') : ''}`).join('');
    case 'shoulders': {
      if (!S.tier) return `<circle cx="66" cy="106" r="10" fill="${prim}" stroke="${INK}" stroke-width="3"/><circle cx="134" cy="106" r="10" fill="${prim}" stroke="${INK}" stroke-width="3"/>`;
      const big = 12 + Math.min(S.tier, 6) * 1.5;
      let s = '';
      [[66, -1], [134, 1]].forEach(([x, d]) => {
        const outA = d < 0 ? 200 : 340;
        if (motif === 'flame') s += flameShape(x + d*6, 96, .9, '#f97316', gem) + flameShape(x - d*4, 94, .7, '#ef4444', '#fde047');
        if (motif === 'crystal') s += spikes(x, 100, 3, big + 10, 80, d < 0 ? 230 : 310, '#e0f2fe', '#60a5fa');
        if (motif === 'storm') s += `<path d="M${x} 96 l${d*16} -20 l${-d*4} 12 l${d*14} -6 l${-d*18} 22z" fill="${gem}" stroke="${INK}" stroke-width="1.5"/>`;
        if (motif === 'shadow') s += `<path d="M${x} 98 q${d*24} -8 ${d*20} -34 q${-d*4} 18 ${-d*18} 30z" fill="${sec}" stroke="${INK}" stroke-width="2"/>`;
        if (motif === 'wing') s += `<path d="M${x} 100 q${d*30} -30 ${d*38} -6 q${-d*12} -2 ${-d*16} 6 q${-d*6} -6 ${-d*18} 4z" fill="#fff" stroke="${trim}" stroke-width="2"/>`;
        if (motif === 'leaf') s += `<path d="M${x} 100 q${d*18} -22 ${d*30} -10 q${-d*14} 16 ${-d*30} 10z" fill="${sec}" stroke="${INK}" stroke-width="1.5"/>`;
        // layered pauldron: swept main plate, two lames, gold edge (drawn for the right side, mirrored for the left)
        const k = .95 + Math.min(S.tier, 9) * .05;
        s += `<g transform="translate(${x + d*2} 108) scale(${d*k} ${k})">
          <path d="M-6 16 Q6 26 20 18 Q19 27 12 30 Q2 32 -5 26Z" fill="${prim}" stroke="${INK}" stroke-width="${3/k}" stroke-linejoin="round"/>
          <path d="M-10 8 Q8 18 25 6 Q26 15 20 19 Q4 25 -9 17Z" fill="${sec}" stroke="${INK}" stroke-width="${3/k}" stroke-linejoin="round"/>
          <path d="M-13 7 Q-12 -13 4 -16 Q20 -19 ${S.tier >= 4 ? '31 -30' : '27 -22'} Q32 -8 26 6 Q12 16 -13 7Z" fill="${prim}" stroke="${INK}" stroke-width="${3/k}" stroke-linejoin="round"/>
          <path d="M-10 -3 Q-6 -13 5 -13.5 Q19 -15.5 ${S.tier >= 4 ? '28 -26' : '25 -19'}" fill="none" stroke="${trim}" stroke-width="${3.4/k}" stroke-linecap="round"/>
          <path d="M-6 -8 Q2 -12 10 -11" stroke="#fff" stroke-width="${2.2/k}" opacity=".45" fill="none" stroke-linecap="round"/>
          ${S.tier >= 3 ? `<path d="M6 -4 l4 5 l-4 5 l-4 -5z" fill="${gem}" stroke="${INK}" stroke-width="${1.4/k}" ${glow}/>` : ''}
        </g>`;
        if (motif === 'star') s += starShape(x, 104, 6, trim);
        void outA;
      });
      return s; }
    case 'helmet': {
      if (motif === 'wizard') return `<path d="M50 60 q50 -16 100 0 q-4 10 -50 10 q-46 0 -50 -10z" fill="${prim}" stroke="${INK}" stroke-width="3"/>
        <path d="M66 58 q14 -40 30 -58 q22 -24 46 -20 q-20 6 -26 22 q-8 26 -2 56z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M68 52 q26 8 50 0 l1 -9 q-26 8 -49 0z" fill="${trim}" stroke="${INK}" stroke-width="2"/>
        ${starShape(92, 30, 6, trim)}${starShape(110, 14, 4, gem)}<path d="M78 40 a5 5 0 1 0 6 -6 a4 4 0 1 1 -6 6z" fill="${trim}"/><circle cx="142" cy="-20" r="5" fill="${gem}" ${glow}/>`;
      if (!S.tier) return `<path d="M64 52 q36 -30 72 0 l-4 6 q-32 -18 -64 0z" fill="${prim}" stroke="${INK}" stroke-width="2.5"/><path d="M64 52 q36 -30 72 0" stroke="${S.sec}" stroke-width="3" fill="none"/>`;
      let s = '';
      if (motif === 'shadow') return `<path d="M58 70 q-2 -56 42 -58 q44 2 42 58 q-6 18 -10 30 q-2 -36 -32 -38 q-30 2 -32 38 q-6 -12 -10 -30z" fill="${prim}" stroke="${INK}" stroke-width="3"/><path d="M70 44 q30 -22 60 0" stroke="${trim}" stroke-width="2.5" fill="none"/><circle cx="100" cy="30" r="4" fill="${gem}" ${glow}/><path d="M66 42 q-22 -8 -28 -34 q14 14 32 22z M134 42 q22 -8 28 -34 q-14 14 -32 22z" fill="${trim}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M84 56 l10 6 M116 56 l-10 6" stroke="${gem}" stroke-width="3" stroke-linecap="round" ${glow}/>`;
      if (motif === 'wing') s += `<path d="M66 50 q-30 -14 -34 -36 q16 4 26 18 q-4 -14 2 -24 q10 14 14 32z" fill="#fff" stroke="${trim}" stroke-width="2"/><path d="M134 50 q30 -14 34 -36 q-16 4 -26 18 q4 -14 -2 -24 q-10 14 -14 32z" fill="#fff" stroke="${trim}" stroke-width="2"/>`;
      if (motif === 'crystal') s += spikes(100, 30, 5, 22, 100, 270, '#e0f2fe', '#60a5fa');
      if (motif === 'flame') s += flameShape(100, 26, 1.1, '#f97316', gem) + flameShape(84, 32, .7, '#ef4444', '#fde047') + flameShape(116, 32, .7, '#ef4444', '#fde047');
      if (motif === 'storm') s += `<path d="M70 40 l-14 -26 l18 14z M130 40 l14 -26 l-18 14z" fill="${gem}" stroke="${INK}" stroke-width="1.5"/>`;
      if (motif === 'leaf') s += `<path d="M78 34 q-14 -22 -4 -30 q8 12 10 26z M122 34 q14 -22 4 -30 q-8 12 -10 26z" fill="${sec}" stroke="${INK}" stroke-width="1.5"/>`;
      if (motif === 'star') s += starShape(100, 18, 14, trim) + starShape(78, 30, 6, trim) + starShape(122, 30, 6, trim);
      s += `<path d="M62 66 q-2 -42 38 -44 q40 2 38 44 l-8 0 q-2 -26 -30 -28 q-28 2 -30 28z" fill="${prim}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M62 66 l-2 24 q6 4 10 0 l2 -24z M138 66 l2 24 q-6 4 -10 0 l-2 -24z" fill="${sec}" stroke="${INK}" stroke-width="2.5"/>
        <path d="M66 50 q34 -20 68 0" stroke="${trim}" stroke-width="3.5" fill="none"/>
        <path d="M63 60 q37 -10 74 0 l-1 6 q-36 -9 -72 0z" fill="${sec}" stroke="${INK}" stroke-width="2"/>
        <path d="M96 58 h8 l-.6 18 l-3.4 5 l-3.4 -5z" fill="${prim}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
        ${S.tier >= 3 && motif !== 'wing' && motif !== 'flame' ? `<path d="M100 8 q-10 10 -6 18 q-2 -2 -2 6 l8 -1 l8 1 q0 -8 -2 -6 q4 -8 -6 -18z" fill="${trim}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>` : ''}`;
      if (S.tier >= 2) s += `<path d="M94 38 h12 l-6 10z" fill="${gem}" stroke="${trim}" stroke-width="1.5" ${glow}/>`;
      return s; }
    case 'weapon': {
      if (hero.weapon === 'laser'){
        const c = S.tier ? S.gem : '#38bdf8', len = 100 + S.tier * 4;
        return `<path d="M160 146 L160 ${146-len}" stroke="${c}" stroke-width="22" stroke-linecap="round" opacity=".45"/><path d="M160 146 L160 ${146-len}" stroke="${c}" stroke-width="10" stroke-linecap="round"/><path d="M160 146 L160 ${146-len}" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
          <rect x="153" y="144" width="14" height="32" rx="4" fill="${S.tier ? S.trim : '#94a3b8'}" stroke="${INK}" stroke-width="2.5"/><rect x="153" y="152" width="14" height="4" fill="${INK}"/><rect x="153" y="162" width="14" height="4" fill="${INK}"/><circle cx="160" cy="148" r="2.5" fill="${c}"/>`;
      }
      if (motif === 'wizard' || hero.weapon === 'wizard'){
        return `<path d="M158 238 L160 50" stroke="#5b3a21" stroke-width="8" stroke-linecap="round"/><path d="M158 238 L160 50" stroke="#8b5e3c" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M160 58 q-18 -6 -16 -24 q4 12 16 14 q12 -2 16 -14 q2 18 -16 24z" fill="${trim}" stroke="${INK}" stroke-width="2"/>
          <circle cx="160" cy="30" r="16" fill="${gem}" opacity=".45" ${glow}/>${starShape(160, 30, 13, '#fff')}${starShape(160, 30, 8, gem)}
          <g class="hero-spark">${starShape(140, 14, 4, trim)}</g><g class="hero-spark" style="animation-delay:-.6s">${starShape(182, 40, 3.5, '#fff')}</g>`;
      }
      if ((hero.weapon || 'sword') === 'staff'){
        return `<path d="M158 238 L160 58" stroke="${S.tier ? trim : '#6b4a2e'}" stroke-width="7" stroke-linecap="round"/><path d="M158 238 L160 58" stroke="${S.tier ? sec : '#8b5e3c'}" stroke-width="3" stroke-linecap="round"/>
          ${motif === 'wing' ? `<path d="M160 52 q-26 -6 -30 -24 q14 6 30 14 q16 -8 30 -14 q-4 18 -30 24z" fill="#fff" stroke="${trim}" stroke-width="2"/>` : ''}
          ${motif === 'crystal' ? spikes(160, 46, 3, 18, 70, 270, '#e0f2fe', '#60a5fa') : ''}${motif === 'flame' ? flameShape(160, 44, 1, '#f97316', gem) : ''}
          <circle cx="160" cy="46" r="${S.tier ? 13 : 8}" fill="${S.tier ? gem : '#a3c26a'}" stroke="${INK}" stroke-width="3" ${S.tier >= 2 ? glow : ''}/><circle cx="156" cy="42" r="3.5" fill="#fff" opacity=".8"/>`;
      }
      const blade = S.tier ? (motif === 'shadow' ? '#a855f7' : motif === 'flame' ? '#fdba74' : motif === 'crystal' ? '#bae6fd' : motif === 'storm' ? '#c7d2fe' : motif === 'wing' ? '#fef9c3' : '#e2e8f0') : '#cbd5e1';
      const len = 92 + S.tier * 4;
      let s = '';
      if (S.tier >= 2) s += `<path d="M154 ${150-len} L166 ${150-len} L168 146 L152 146Z" fill="${gem}" opacity=".45"/>`;
      s += `<path d="M160 ${140-len} L168 ${150-len+12} L167 146 L153 146 L152 ${150-len+12}Z" fill="${blade}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M160 ${146-len} V142" stroke="#fff" stroke-width="2" opacity=".7"/>`;
      if (motif === 'flame') s += flameShape(150, 120, .6, '#f97316', gem) + flameShape(170, 96, .5, '#ef4444', gem);
      if (motif === 'storm') s += `<path d="M152 ${150-len*.6} l16 10 l-12 2 l14 12" stroke="${gem}" stroke-width="2.5" fill="none"/>`;
      s += `<rect x="140" y="144" width="40" height="8" rx="4" fill="${S.tier ? trim : '#6b4a2e'}" stroke="${INK}" stroke-width="2.5"/><rect x="155" y="150" width="10" height="22" rx="3" fill="${S.tier ? prim : '#5b3a21'}" stroke="${INK}" stroke-width="2.5"/><circle cx="160" cy="175" r="5" fill="${S.tier ? gem : '#c9a27a'}" stroke="${INK}" stroke-width="2"/>`;
      if (motif === 'wing') s += `<path d="M140 148 q-16 -14 -10 -26 q8 10 14 22z M180 148 q16 -14 10 -26 q-8 10 -14 22z" fill="#fff" stroke="${trim}" stroke-width="1.5"/>`;
      return s; }
  }
  return '';
}
function hairBack(h){
  const c = h.hairColor;
  if (h.hairStyle === 'long') return `<path d="M62 60 q-6 60 6 84 q32 10 64 0 q12 -24 6 -84z" fill="${c}" stroke="${INK}" stroke-width="3"/>`;
  if (h.hairStyle === 'ponytail') return `<path d="M128 44 q34 6 30 46 q-4 26 -16 36 q8 -30 -6 -50z" fill="${c}" stroke="${INK}" stroke-width="3"/>`;
  if (h.hairStyle === 'buns') return `<circle cx="66" cy="34" r="16" fill="${c}" stroke="${INK}" stroke-width="3"/><circle cx="134" cy="34" r="16" fill="${c}" stroke="${INK}" stroke-width="3"/>`;
  if (h.hairStyle === 'curly') return `<g fill="${c}" stroke="${INK}" stroke-width="3">${[[62,64],[60,86],[140,64],[140,86]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join('')}</g>`;
  return '';
}
function hairFront(h){
  const c = h.hairColor;
  if (h.hairStyle === 'spiky') return `<path d="M64 60 l-2 -20 l12 6 l2 -20 l12 12 l10 -18 l8 18 l12 -14 l2 20 l14 -6 l-4 22 q-30 -20 -66 0z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  if (h.hairStyle === 'curly') return `<g fill="${c}" stroke="${INK}" stroke-width="3">${[[70,44],[86,34],[102,32],[118,36],[132,46],[78,54]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="12"/>`).join('')}</g>`;
  return `<path d="M64 64 q-4 -40 36 -40 q40 0 36 40 q-10 -18 -30 -20 q-2 10 -12 12 q4 -8 2 -12 q-20 4 -32 20z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
}
function heroShield(C, girl){
  const face = C.tier ? C.prim : (girl ? '#7c3aed' : '#1e3a8a'), rim = C.tier ? C.trim : '#fbbf24', boss = C.tier ? C.gem : (girl ? '#f9a8d4' : '#facc15');
  const emb = C.motif === 'flame' ? flameShape(46, 180, .55, '#f97316', '#fde047') : C.motif === 'star' || !C.tier ? starShape(46, 168, 10, boss)
    : C.motif === 'crystal' ? spikes(46, 176, 3, 14, 70, 270, '#e0f2fe', '#60a5fa') : C.motif === 'storm' ? `<path d="M50 156 l-10 14 h7 l-5 14 l13 -18 h-7 l5 -10z" fill="${boss}" stroke="${INK}" stroke-width="1.5"/>`
    : C.motif === 'wing' ? `<path d="M46 170 q-14 -4 -16 -14 q8 2 16 6 q8 -4 16 -6 q-2 10 -16 14z" fill="#fff" stroke="${rim}" stroke-width="1.5"/>` : `<circle cx="46" cy="168" r="6" fill="${boss}" stroke="${INK}" stroke-width="2"/>`;
  return `<g class="hero-shield"><path d="M22 142 Q46 132 70 142 Q72 178 46 200 Q20 178 22 142Z" fill="${shade(face, -.35)}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M26 145 Q46 137 66 145 Q67 176 46 194 Q25 176 26 145Z" fill="${face}"/>
    <path d="M26 145 Q46 137 66 145" stroke="${rim}" stroke-width="4" fill="none"/><path d="M46 140 V196" stroke="${rim}" stroke-width="2.5" opacity=".55"/>
    <path d="M30 150 Q40 145 46 145 L44 172 Q34 166 30 150Z" fill="#fff" opacity=".18"/>${emb}</g>`;
}
function heroSVGClassic(size=200, override={}){
  const h = Object.assign({ skin:SKIN_TONES[1], hairColor:HAIR_COLORS[1], hairStyle:'short', weapon:'sword' }, K.hero || {}, override.hero || {});
  const G = heroState(), eq = Object.assign({}, G.eq, override.eq || {});
  const S = slot => (eq[slot] && eq[slot] !== 'traveler' && SET_BY_ID[eq[slot]]) || starterSet();
  const girl = heroKidKey() === 'daughter';
  if (!h.outfit) h.outfit = girl ? 'dress' : 'pants';
  const full = override.eq ? null : fullSetOn();
  const WZo = override.wiz || K.wiz || {}, hatOn = !!(WZo.hat && HAT_BY[WZo.hat]), robeOn = !!(WZo.robe && ROBE_BY[WZo.robe]), wandOn = !!(WZo.wandOn && WZo.wand);
  const helmOn = S('helmet').tier > 0 && !hatOn;
  const u = 'h' + (++heroSeq), eye = h.eyes || EYE_COLORS[0];
  // ---- materials: armor pieces get metal / gem gradients instead of flat fills ----
  let matDefs = ''; const made = {};
  const matFor = (Sx) => { const k = u + 'm' + Sx.id + (Sx === starterSet() ? 'st' : ''); if (made[k]) return k; made[k] = 1;
    const metal = (id, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, .5)}"/><stop offset=".22" stop-color="${shade(c, .15)}"/><stop offset=".5" stop-color="${c}"/><stop offset=".8" stop-color="${shade(c, -.28)}"/><stop offset="1" stop-color="${shade(c, -.45)}"/></linearGradient>`;
    const cloth = (id, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, .18)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -.22)}"/></linearGradient>`;
    const gold = (id, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, .65)}"/><stop offset=".38" stop-color="${c}"/><stop offset=".55" stop-color="${shade(c, -.3)}"/><stop offset=".72" stop-color="${shade(c, .25)}"/><stop offset="1" stop-color="${shade(c, -.4)}"/></linearGradient>`;
    const f = Sx.tier ? metal : cloth;
    matDefs += f(k + 'p', Sx.prim) + f(k + 's', Sx.sec) + (Sx.tier ? gold(k + 't', Sx.trim) : cloth(k + 't', Sx.trim))
      + `<radialGradient id="${k}g" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${shade(Sx.gem, .35)}"/><stop offset=".8" stop-color="${Sx.gem}"/><stop offset="1" stop-color="${shade(Sx.gem, -.35)}"/></radialGradient>`;
    return k; };
  const GP = (slot, Sx) => { let out = gearPiece(slot, Sx, h); if (!Sx) return out; const k = matFor(Sx);
    const rep = (c, suf) => { if (!c) return; out = out.split(`fill="${c}"`).join(`fill="url(#${k}${suf})"`); };
    rep(Sx.gem, 'g'); rep(Sx.trim, 't'); rep(Sx.sec, 's'); rep(Sx.prim, 'p');
    return out; };
  const HV = window.__heroVar || {}, hs = HV.h || .76, bs = HV.b || 1.1, ny = 238 - 134 * bs;
  const HEAD_T = `translate(100 ${ny + 2}) scale(${hs}) translate(-100 -97)`;
  const BODY_T = `translate(100 238) scale(${HV.w || .95} ${bs}) translate(-100 -238)`;
  const C0 = S('chest');
  let s = `<svg viewBox="0 0 200 250" width="${size}" height="${size*1.25}" xmlns="http://www.w3.org/2000/svg" class="hero-svg" style="overflow:visible">
  <defs><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="${u}a"><stop offset="0" stop-color="${full ? full.gem : '#fff'}" stop-opacity=".75"/><stop offset="1" stop-color="${full ? full.gem : '#fff'}" stop-opacity="0"/></radialGradient>
  <radialGradient id="${u}s" cx="42%" cy="38%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="${h.skin}" stop-opacity="0"/><stop offset="1" stop-color="#7a3b2e" stop-opacity=".22"/></radialGradient>
  <linearGradient id="${u}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${eye}"/><stop offset=".55" stop-color="${eye}"/><stop offset="1" stop-color="#fff" stop-opacity=".85"/></linearGradient>
  <radialGradient id="${u}b"><stop offset="0" stop-color="#ff7a93" stop-opacity=".75"/><stop offset="1" stop-color="#ff7a93" stop-opacity="0"/></radialGradient>
  <linearGradient id="${u}v" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#1c0f1c" stop-opacity=".22"/></linearGradient></defs>`;
  if (full) s += `<ellipse class="hero-aura" cx="100" cy="130" rx="96" ry="118" fill="url(#${u}a)"/>${[[30,60],[170,80],[24,170],[176,190],[60,20],[150,24]].map(([x,y],i) => `<g class="hero-spark" style="animation-delay:-${i*.4}s">${starShape(x, y, 6, full.gem)}</g>`).join('')}`;
  s += `<ellipse cx="100" cy="238" rx="56" ry="8" fill="#000" opacity=".18"/>`;
  if (C0.tier >= 2 && !full) s += `<defs><radialGradient id="${u}r"><stop offset="0" stop-color="${C0.gem}" stop-opacity=".55"/><stop offset="1" stop-color="${C0.gem}" stop-opacity="0"/></radialGradient></defs><ellipse cx="100" cy="120" rx="${70 + C0.tier * 3}" ry="${100 + C0.tier * 3}" fill="url(#${u}r)"/>`;
  s += `<g transform="${BODY_T}">`;
  { const C = S('chest');
    if (C.motif !== 'wizard'){
      const TC = K.tower && K.tower.cape && TOWER_CAPE_BY_ID[K.tower.cape];
      const cape = TC ? TC.color : C.cape || (C.tier ? (C.motif === 'wing' ? '#fef3c7' : C.motif === 'flame' ? '#7f1d1d' : C.motif === 'crystal' ? '#e0f2fe' : C.motif === 'star' ? '#312e81' : shade(C.sec, -.25)) : (girl ? '#7c3aed' : '#b91c1c'));
      const lining = TC ? TC.edge : C.tier ? C.sec : (girl ? '#f9a8d4' : '#facc15'), edge = TC ? TC.edge : C.tier ? C.trim : '#fbbf24';
      s += `<defs><linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(cape, .18)}"/><stop offset=".55" stop-color="${cape}"/><stop offset="1" stop-color="${shade(cape, -.45)}"/></linearGradient></defs>
      <g class="hero-cape"><path d="M66 100 Q40 160 18 234 Q36 222 50 236 Q70 222 88 238 Q106 224 124 238 Q142 222 158 236 Q172 222 184 232 Q160 160 134 100Z" fill="${lining}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M66 100 Q44 160 28 228 Q46 218 60 230 Q78 218 94 232 Q112 220 128 232 Q146 218 172 228 Q156 160 134 100Z" fill="url(#${u}c)"/>
      <path d="M86 112 Q80 170 74 222 M114 112 Q120 170 128 222" stroke="${shade(cape, -.4)}" stroke-width="2.5" fill="none" opacity=".55"/>
      <path d="M66 100 Q40 160 18 234" stroke="${edge}" stroke-width="2" fill="none" opacity=".8"/></g>`;
    } }
  if (!helmOn || h.hairStyle === 'long' || h.hairStyle === 'ponytail') s += `</g><g transform="${HEAD_T}">${hairBack(h)}</g><g transform="${BODY_T}">`;
  // arms (skin), then body pieces
  s += `<path d="M68 106 L52 158" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M68 106 L52 158" stroke="${S('chest').tier ? S('chest').sec : S('chest').prim}" stroke-width="10" stroke-linecap="round"/>
        <path d="M132 106 L148 158" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M132 106 L148 158" stroke="${S('chest').tier ? S('chest').sec : S('chest').prim}" stroke-width="10" stroke-linecap="round"/>`;
  s += GP('pants', S('pants')) + GP('boots', S('boots')) + GP('chest', S('chest'));
  if (h.outfit === 'dress' && S('chest').motif !== 'wizard'){ const C = S('chest'), fill = C.tier ? C.prim : C.prim, hem = C.tier ? C.trim : C.sec;
    s += `<path d="M68 148 h64 q14 26 20 50 q-10 6 -18 0 q-8 6 -17 0 q-9 6 -17 0 q-9 6 -17 0 q-8 6 -17 0 q-8 6 -18 0 q6 -24 20 -50z" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M52 194 q8 6 18 0 q8 6 17 0 q9 6 17 0 q9 6 17 0 q8 6 17 0 q8 6 18 0" fill="none" stroke="${hem}" stroke-width="4"/><path d="M82 156 l-6 34 M100 156 v36 M118 156 l6 34" stroke="${C.tier ? C.sec : '#fff'}" stroke-width="2" opacity=".5"/>
      ${C.motif === 'petal' ? [[78,176],[100,182],[122,176]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff"/><circle cx="${x}" cy="${y}" r="1.8" fill="${C.gem}"/>`).join('') : ''}`; }
  s += GP('belt', S('belt'));
  { const C = S('chest');   // tabard: a hanging front panel like real plate armor (not with a dress, robe or wizard coat)
    if (C.tier && h.outfit !== 'dress' && !robeOn && C.motif !== 'wizard'){ const k = matFor(C);
      s += `<path d="M86 163 h28 l2 38 l-16 10 l-16 -10z" fill="url(#${k}s)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M89 166 h22 l1.6 33 l-12.6 8 l-12.6 -8z" fill="none" stroke="url(#${k}t)" stroke-width="2.2"/>
        <path d="M100 176 l6 8 l-6 8 l-6 -8z" fill="url(#${k}g)" stroke="${INK}" stroke-width="1.5"/>`; } }
  if (robeOn) s += robeArt(WZo.robe, WZo.house);
  s += `<path d="M54 104 L146 104 L150 232 L50 232z" fill="url(#${u}v)" style="mix-blend-mode:multiply" opacity=".9"/>`;
  s += `<rect x="92" y="90" width="16" height="16" fill="${h.skin}" stroke="${INK}" stroke-width="3"/><path d="M92 92 h16 v6 q-8 4 -16 0z" fill="#7a3b2e" opacity=".2"/>`;
  s += GP('shoulders', S('shoulders'));
  s += `</g><g transform="${HEAD_T}">`;
  // head + face
  // big round game-style eyes: soft lash on the outer side, two shines, no frown
  const eyeAt = (x, flip) => { const o = flip ? 1 : -1; // o = direction of the outer corner
    return `<g>
      <path d="M${x - o*6.5} 67 Q${x} 63.5 ${x + o*7.5} 67.5 Q${x + o*6} 76 ${x} 76.5 Q${x - o*6} 75.5 ${x - o*6.5} 67z" fill="#fff"/>
      <ellipse cx="${x - o*.6}" cy="70.8" rx="4.6" ry="5.4" fill="url(#${u}i)"/>
      <ellipse cx="${x - o*.6}" cy="71.2" rx="2.2" ry="2.8" fill="#140c18"/>
      <circle cx="${x - o*2}" cy="69" r="1.5" fill="#fff"/>${girl ? `<path d="M${x + o*7.6} 67.6 l${o*3.4} -2.8 M${x + o*5} 65 l${o*2.6} -3.4" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/>` : ''}
      <path d="M${x - o*6.8} 67.4 Q${x} 63 ${x + o*8} 67.8" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${girl ? `<path d="M${x + o*7.2} 64 l${o*3} -2.6 M${x + o*5.4} 62.2 l${o*2.2} -2.8" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>` : `<path d="M${x + o*7.4} 64.2 l${o*1.8} -1.2" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`}
    </g>`; };
  s += `<circle cx="100" cy="64" r="34" fill="${h.skin}" stroke="${INK}" stroke-width="3"/><circle cx="100" cy="64" r="33" fill="url(#${u}s)"/>
    ${eyeAt(86, false)}${eyeAt(114, true)}
    <path d="M77 56 Q86 56 94 61 L93 63.5 Q85 59.5 77.5 59z" fill="${h.hairColor === '#f1f5f9' ? '#94a3b8' : shade(h.hairColor, -.25)}" stroke="${INK}" stroke-width="1.2"/><path d="M123 56 Q114 56 106 61 L107 63.5 Q115 59.5 122.5 59z" fill="${h.hairColor === '#f1f5f9' ? '#94a3b8' : shade(h.hairColor, -.25)}" stroke="${INK}" stroke-width="1.2"/>
    <path d="M70 74 q4 14 14 20 M130 74 q-4 14 -14 20" stroke="#7a3b2e" stroke-width="2" opacity=".18" fill="none" stroke-linecap="round"/>
    <path d="M100 70 l-2.6 9 q2.6 1.6 5 0" stroke="#9a5a45" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${girl ? `<path d="M93 85.4 q7 4.6 14 -1 q-7 1.4 -14 1z" fill="#c2566b"/>` : ''}<path d="M92 86 q8 3.6 16 -1.4" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  if (h.beard) s += `<path d="M70 70 q4 22 14 34 q8 26 16 34 q8 -8 16 -34 q10 -12 14 -34 q-6 14 -18 16 q-12 -6 -24 0 q-12 -2 -18 -16z" fill="${h.beardColor || '#f1f5f9'}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M90 86 q10 -5 20 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const bow = !helmOn && girl && h.bow !== false ? `<g transform="translate(${h.hairStyle === 'buns' ? 100 : 126} ${h.hairStyle === 'buns' ? 28 : 36}) rotate(18)"><path d="M0 0 l-16 -10 q-4 10 0 20z M0 0 l16 -10 q4 10 0 20z" fill="${S('chest').tier ? S('chest').gem : '#f472b6'}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle r="5" fill="${S('chest').tier ? S('chest').trim : '#ec4899'}" stroke="${INK}" stroke-width="2"/></g>` : '';
  const shine = `<path d="M74 47 q9 -13 25 -15" stroke="#fff" stroke-width="4.5" opacity=".32" fill="none" stroke-linecap="round"/><path d="M104 32 q6 0 11 2" stroke="#fff" stroke-width="3" opacity=".25" fill="none" stroke-linecap="round"/>`;
  s += hatOn ? hairFront(h) + shine + hatArt(WZo.hat, WZo.house) : helmOn ? GP('helmet', S('helmet')) : hairFront(h) + shine + bow + (S('helmet').id === 'traveler' && override.showCap ? gearPiece('helmet', S('helmet'), h) : '');
  s += '</g>';
  s += `<g transform="${BODY_T}">` + GP('gloves', S('gloves'));
  if (!wandOn && ((h.weapon || 'sword') === 'sword' || h.weapon === 'laser')) s += heroShield(S('chest'), girl);
  const wpn = override.wpn !== undefined ? override.wpn : K.wpn;
  s += '<g transform="translate(160 150) scale(.9) translate(-160 -150)">' + (wandOn ? wandArt(142, 170, 178, 104, WZo.wand.wood, WZo.wand.core, 6.5) : wpn && LW_BY_ID[wpn] ? legendWeaponSVG(wpn) : GP('weapon', S('weapon'))) + '</g>';
  return s + `</g><defs>${matDefs}</defs></svg>`;
}
/* ---------- Hero Art 3.0: anime hero cards (Gia = Rune Reader, Miles = Hard-Light Knight) ---------- */
const HERO_CLASSIC = /[?&]classic=1/.test(location.search);
const HERO_WAIST = HERO_CLASSIC ? .68 : .56, HERO_CLIP = HERO_CLASSIC ? .13 : .15;
function heroSVG(size = 200, override = {}){
  if (HERO_CLASSIC) return heroSVGClassic(size, override);
  const girl = heroKidKey() === 'daughter';
  const h = Object.assign({ skin: SKIN_TONES[1], hairColor: girl ? '#7c3aed' : '#1f1b18', hairStyle: 'short', weapon: 'sword' }, K.hero || {}, override.hero || {});
  const G = heroState(), eq = Object.assign({}, G.eq, override.eq || {});
  const S = slot => (eq[slot] && eq[slot] !== 'traveler' && SET_BY_ID[eq[slot]]) || null;
  const full = override.eq ? null : fullSetOn();
  const WZo = override.wiz || K.wiz || {}, hatOn = !!(WZo.hat && HAT_BY[WZo.hat]), robeOn = !!(WZo.robe && ROBE_BY[WZo.robe]), wandOn = !!(WZo.wandOn && WZo.wand);
  const wpn = override.wpn !== undefined ? override.wpn : K.wpn, legend = wpn && LW_BY_ID[wpn];
  const u = 'a' + (++heroSeq), INKc = '#1b1424';
  let gn = 0; const defs = [];
  const sh = (c, a) => shade(c, a);
  const lin = (stops, x2 = 0, y2 = 1) => { const id = u + 'g' + (++gn); defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`); return `url(#${id})`; };
  const radg = (stops) => { const id = u + 'g' + (++gn); defs.push(`<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`); return `url(#${id})`; };
  const cloth = c => lin([[0, sh(c, .25)], [.55, c], [1, sh(c, -.4)]], 1, 1);
  const LOWFX = document.documentElement.classList.contains('lowfx');   // old iPads / phones: no blur filters (they re-render every frame and flicker)
  const GL = LOWFX ? '' : `filter="url(#${u}gl)"`, BL = LOWFX ? '' : `filter="url(#${u}bl)"`;
  const P = (d, f, sw = 2.4, x = '') => `<path d="${d}" fill="${f}" stroke="${INKc}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${x}/>`;
  const L = (d, c, w, x = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${x}/>`;
  const MIR = s => `<g transform="translate(300 0) scale(-1 1)">${s}</g>`;
  const limb = (d, f, w) => L(d, INKc, w + 5) + L(d, f, w);
  const spark = (x, y, r, c) => `<path d="M${x} ${y-r} L${x+r*.25} ${y-r*.25} L${x+r} ${y} L${x+r*.25} ${y+r*.25} L${x} ${y+r} L${x-r*.25} ${y+r*.25} L${x-r} ${y} L${x-r*.25} ${y-r*.25}Z" fill="${c}" ${GL}/>`;
  // ---- palette: base look, then each equipped set recolours its part ----
  const base = girl ? { coat:'#e9d5ff', coat2:'#6d28d9', trim:'#a855f7', glow:'#f0abfc', shirt:'#312e81', low:'#4c1d95', legs:'#1e1b4b', boots:'#4c1d95', bootT:'#a855f7', glove:h.skin, belt:'#312e81', gem:'#f0abfc', head:'#f0abfc', wglow:'#f0abfc' }
                    : { coat:'#e2e8f0', coat2:'#1d4ed8', trim:'#3b82f6', glow:'#93c5fd', shirt:'#94a3b8', low:'#1e3a8a', legs:'#1e293b', boots:'#cbd5e1', bootT:'#3b82f6', glove:'#cbd5e1', belt:'#111827', gem:'#60a5fa', head:'#94a3b8', wglow:'#93c5fd' };
  const C = Object.assign({}, base);
  const ch = S('chest'); if (ch){ C.coat = sh(ch.prim, .3); C.coat2 = sh(ch.prim, -.25); C.trim = ch.trim; C.glow = ch.gem; C.shirt = sh(ch.sec, -.35); }
  const pa = S('pants'); if (pa){ C.low = pa.prim; C.legs = sh(pa.prim, -.45); }
  const bo = S('boots'); if (bo){ C.boots = bo.prim; C.bootT = bo.trim; }
  const gv = S('gloves'); if (gv) C.glove = gv.prim;
  const be = S('belt'); if (be){ C.belt = sh(be.prim, -.3); C.gem = be.gem; }
  const he = S('helmet'); if (he) C.head = he.prim;
  const we = S('weapon'); if (we) C.wglow = we.gem;
  if (robeOn){ const R = wizColors(ROBE_BY[WZo.robe], WZo.house); if (R){ C.coat = R.prim; C.coat2 = sh(R.prim, -.35); C.trim = R.sec; } }
  const sp = S('shoulders'), tier = ch ? ch.tier : 0;
  const hs = (h.hairStyle === 'long' || h.hairStyle === 'ponytail') ? h.hairStyle : girl ? 'bob' : 'spiky';
  const eye = h.eyes || (girl ? '#ec4899' : '#2563eb'), hair = h.hairColor, skin = h.skin;
  const gem = full ? full.gem : C.glow;
  const SY = .8, BT = `translate(0 434) scale(1 ${SY}) translate(0 -434)`, HT = `translate(0 ${(434 - 288 * SY - 146).toFixed(1)})`;
  let s = `<svg viewBox="-6 60 304 380" width="${size}" height="${size*1.25}" xmlns="http://www.w3.org/2000/svg" class="hero-svg ah" style="overflow:visible">`;
  let body = '';
  // ---- aura / ground ----
  body += `<ellipse cx="150" cy="250" rx="${120 + tier * 4}" ry="${150 + tier * 4}" fill="${radg([[0, gem, tier ? .45 : .25], [.6, gem, .1], [1, gem, 0]])}" ${full ? 'class="hero-aura"' : ''}/>`;
  body += `<ellipse cx="150" cy="430" rx="78" ry="9" fill="#000" opacity=".28"/><ellipse cx="150" cy="430" rx="66" ry="6" fill="none" stroke="${gem}" stroke-width="2" opacity=".7"/>`;
  if (full) [[30, 120], [270, 150], [40, 320], [262, 340], [70, 70], [232, 80]].forEach(([x, y], i) => body += `<g class="hero-spark" style="animation-delay:-${i * .4}s">${spark(x, y, 7, full.gem)}</g>`);
  body += `<g transform="${BT}">`;
  // hard-light wings from chest tier 4
  if (tier >= 4){ const w = 70 + Math.min(tier, 9) * 9;
    body += [-1, 1].map(d => `<g ${GL} opacity=".85">${P(`M${150 + d*18} 160 C${150 + d*60} ${120 - tier*2} ${150 + d*w} ${110 - tier*3} ${150 + d*(w + 20)} ${70 - tier*3} C${150 + d*(w + 6)} 150 ${150 + d*(w - 10)} 190 ${150 + d*(w - 30)} 226 C${150 + d*(w - 40)} 206 ${150 + d*(w - 60)} 204 ${150 + d*(w - 70)} 214 C${150 + d*50} 196 ${150 + d*34} 190 ${150 + d*24} 196Z`, lin([[0, sh(gem, .6), .75], [1, gem, .25]]), 1.6)}${L(`M${150 + d*24} 168 L${150 + d*(w + 16)} ${74 - tier*3} M${150 + d*26} 182 L${150 + d*(w - 30)} 222`, '#fff', 1.4, 'opacity=".6"')}</g>`).join('');
    if (tier >= 7) body += `<ellipse cx="150" cy="58" rx="34" ry="9" fill="none" stroke="${gem}" stroke-width="3" ${GL}/>`; }
  // ---- coat tail, legs, boots ----
  const coat = cloth(C.coat), coat2 = cloth(C.coat2);
  body += `<g class="ah-cape">${P('M116 150 C98 240 90 320 80 404 Q114 394 150 400 Q186 394 220 404 C210 320 202 240 184 150Z', coat2)}${L('M80 404 Q114 394 150 400 Q186 394 220 404', C.trim, 2.5)}</g>`;
  // ---- hair (back) ----
  body += `</g><g transform="${HT}">`;
  const hairF = lin([[0, sh(hair, .15)], [1, sh(hair, -.45)]]);
  if (hs === 'long') body += P('M124 76 C104 140 112 220 98 296 Q118 282 128 296 Q122 230 136 170 Q150 210 150 230 Q150 210 164 170 Q178 230 172 296 Q182 282 202 296 C188 220 196 140 176 76Z', hairF);
  if (hs === 'ponytail') body += P('M170 70 C206 74 214 130 204 190 C200 220 210 250 220 266 C196 262 186 232 190 196 C194 150 188 110 168 92Z', hairF);
  if (hs === 'bob') body += P('M122 84 C116 120 118 140 124 152 Q136 146 140 152 L160 152 Q164 146 176 152 C182 140 184 120 178 84Z', hairF);
  body += `</g><g transform="${BT}">`;
  const leg = cloth(C.legs), bt = cloth(C.boots);
  body += P('M130 292 C128 336 130 380 129 412 L147 412 C148 380 150 340 151 298Z', leg) + P('M149 298 C150 340 152 380 153 412 L171 412 C170 380 172 336 170 292Z', leg);
  body += P('M126 366 L149 366 L149 424 Q150 434 140 434 L118 434 Q118 425 127 421Z', bt) + P('M151 366 L174 366 L173 421 Q182 425 182 434 L160 434 Q150 434 151 424Z', bt);
  body += L('M126 372 H149 M151 372 H174', C.bootT, 3) + L('M129 386 L146 386 M154 386 L171 386', C.glow, 1.6, GL);
  if (bo && bo.tier >= 3) body += [-1, 1].map(d => P(`M${150 + d*24} 372 L${150 + d*40} 352 L${150 + d*30} 376Z`, cloth(C.bootT), 1.6)).join('');
  body += girl ? P('M126 224 L174 224 L190 300 Q170 308 150 302 Q130 308 110 300Z', cloth(C.low)) + L('M110 300 Q130 308 150 302 Q170 308 190 300', C.trim, 2)
               : P('M126 224 L174 224 L178 296 L152 300 L150 284 L148 300 L122 296Z', cloth(C.low));
  // ---- torso, belt, coat front ----
  body += P('M131 146 L169 146 L173 228 L127 228Z', cloth(C.shirt));
  if (!girl) body += P('M134 150 Q150 144 166 150 L164 200 Q150 208 136 200Z', cloth(sh(C.shirt, .35)), 2) + `<path d="M150 160 l8 10 l-8 12 l-8 -12z" fill="${C.glow}" stroke="${INKc}" stroke-width="1.6" ${GL}/>`;
  else body += L('M140 160 L160 172 M160 160 L140 172 M141 184 L159 196 M159 184 L141 196', C.trim, 1.8);
  body += P('M126 222 L174 222 L175 234 L125 234Z', cloth(C.belt), 2) + `<rect x="144" y="222" width="12" height="12" rx="2" fill="${C.gem}" stroke="${INKc}" stroke-width="1.5" ${GL}/>`;
  const panel = P('M121 144 C112 200 110 262 104 338 Q118 334 132 330 C134 262 136 200 142 150Z', coat);
  body += panel + MIR(panel) + L('M141 152 C135 200 133 262 131 330 M159 152 C165 200 167 262 169 330', C.trim, 2.6) + L('M126 170 C122 230 118 290 114 326 M174 170 C178 230 182 290 186 326', C.glow, 1.4, GL + ' opacity=".9"');
  if (robeOn && ROBE_BY[WZo.robe] && ROBE_BY[WZo.robe].house && HOUSES[WZo.house]) body += `<g transform="translate(110 250) scale(.13)">${crestInner(WZo.house)}</g>`;
  // ---- pose ----
  const holdsRight = wandOn || legend || !girl || !!we;
  const book = girl && !holdsRight;
  const armL = book ? 'M120 150 Q100 186 108 206 Q116 214 130 208' : !girl ? 'M120 150 Q96 172 86 196 Q82 206 84 216' : 'M120 150 Q104 190 106 222 Q108 246 112 266';
  const armR = book ? 'M180 150 Q200 186 192 206 Q184 214 170 208' : 'M180 150 Q200 190 196 222 Q194 246 190 266';
  const end = d => d.trim().split(/[ QCLM]+/).filter(Boolean).slice(-2).map(Number);
  // hard-light hex shield (Miles) sits behind the left hand
  if (!girl){ const sc = C.wglow;
    body += `<g class="hero-shield" transform="translate(72 206)" ${GL}><path d="M0 -50 L42 -26 L42 24 L0 50 L-42 24 L-42 -26Z" fill="${sc}" opacity=".22" stroke="${sh(sc, .4)}" stroke-width="2.4"/>${[[0,-26],[-22,-13],[22,-13],[-22,13],[22,13],[0,26],[0,0]].map(([x,y]) => `<path d="M${x} ${y-11} L${x+10} ${y-5.5} L${x+10} ${y+5.5} L${x} ${y+11} L${x-10} ${y+5.5} L${x-10} ${y-5.5}Z" fill="none" stroke="${sh(sc, .6)}" stroke-width=".9" opacity=".8"/>`).join('')}</g>`; }
  const sleeve = cloth(C.coat);
  body += limb(armL, sleeve, 15) + limb(armR, sleeve, 15);
  [armL, armR].forEach(d => { const [x, y] = end(d); body += `<circle cx="${x}" cy="${y - 7}" r="8.5" fill="${C.trim}" stroke="${INKc}" stroke-width="2"/><circle cx="${x}" cy="${y + 2}" r="7" fill="${C.glove}" stroke="${INKc}" stroke-width="2"/>`; });
  // shoulders: soft cuffs at tier 0, armoured pauldrons that grow with the shoulder set
  if (sp){ const k = .9 + Math.min(sp.tier, 9) * .07, pf = cloth(sp.prim);
    const pd = `<g transform="translate(118 146) scale(${k})">${P('M-14 16 C-26 -4 -12 -24 12 -18 L18 4 C8 2 -2 8 -6 18Z', pf)}${L('M-16 6 C-18 -10 -4 -20 12 -16', sp.trim, 2.6)}${sp.tier >= 3 ? `<path d="M0 -2 l4 5 l-4 5 l-4 -5z" fill="${sp.gem}" stroke="${INKc}" stroke-width="1.2" ${GL}/>` : ''}${sp.tier >= 5 ? P('M-8 -14 L-18 -34 L2 -18Z', cloth(sp.trim), 1.6) : ''}</g>`;
    body += pd + MIR(pd);
  } else { const sd = P('M110 160 C106 142 118 132 134 136 C130 146 124 152 120 162Z', cloth(C.coat2), 2.2); body += sd + MIR(sd); }
  const col = P('M128 140 C126 124 132 118 138 116 L144 142Z', coat); body += col + MIR(col);
  body += `<rect x="143" y="128" width="14" height="18" fill="${skin}" stroke="${INKc}" stroke-width="2"/>`;
  // ---- face ----
  body += `</g><g transform="${HT}">`;
  body += P('M125 92 Q125 121 150 137 Q175 121 175 92 Q175 62 150 60 Q125 62 125 92Z', lin([[0, sh(skin, .12)], [.7, skin], [1, sh(skin, -.12)]]));
  body += `<path d="M125 98 Q127 122 150 137 Q138 124 133 104Z" fill="#a0523d" opacity=".12"/>`;
  [-1, 1].forEach(d => { const x = 150 + d * 11.5, y = 104, ir = lin([[0, sh(eye, -.55)], [.45, eye], [1, sh(eye, .55)]]);
    body += `<path d="M${x - d*7.5} ${y} Q${x} ${y-6.5} ${x + d*7.5} ${y-1.5} Q${x + d*5} ${y+6.5} ${x} ${y+6.5} Q${x - d*6.5} ${y+5.5} ${x - d*7.5} ${y}Z" fill="#fff"/>`;
    body += `<ellipse cx="${x + d*.4}" cy="${y + 1.2}" rx="4.6" ry="5.6" fill="${ir}"/><ellipse cx="${x + d*.4}" cy="${y + 1.6}" rx="2" ry="2.8" fill="${sh(eye, -.75)}"/>`;
    body += `<circle cx="${x - 1.5}" cy="${y - 1.4}" r="1.6" fill="#fff"/><circle cx="${x + 1.8}" cy="${y + 3.6}" r=".9" fill="#fff" opacity=".8"/>`;
    body += `<path d="M${x - d*8.5} ${y + .8} Q${x - d*2} ${y - 8.2} ${x + d*9} ${y - 2.2} L${x + d*11} ${y - 4.4} L${x + d*8.6} ${y - .4} Q${x} ${y - 6} ${x - d*8.5} ${y + .8}Z" fill="${INKc}"/>`;
    body += L(`M${x - d*6.5} ${y - 10.5} Q${x + d} ${y - 13} ${x + d*7.5} ${y - 11}`, sh(hair, -.35), 1.8); });
  body += L('M150.5 112 l-1.6 4.2 l2 .4', '#c08470', 1.2);
  body += girl ? `<path d="M145.5 123.5 Q150 128 154.5 123.5 Q150 125 145.5 123.5Z" fill="#b5475c" stroke="${INKc}" stroke-width="1.1"/>` : L('M146 124.5 Q150 126.5 154 124', '#7a3341', 1.5);
  body += `<ellipse cx="135" cy="117" rx="5" ry="2.2" fill="#ff8fa3" opacity=".22"/><ellipse cx="165" cy="117" rx="5" ry="2.2" fill="#ff8fa3" opacity=".22"/>`;
  if (h.beard) body += P('M128 112 Q132 134 150 142 Q168 134 172 112 Q164 126 150 126 Q136 126 128 112Z', h.beardColor || '#f1f5f9', 1.8);
  // ---- hair (front) ----
  const hairT = lin([[0, sh(hair, .3)], [.6, hair], [1, sh(hair, -.3)]]);
  if (hs === 'spiky') body += P('M122 98 C114 82 112 66 120 56 L114 40 L130 46 L132 28 L144 42 L152 22 L160 40 L172 28 L174 46 L188 42 L180 58 C188 70 186 86 178 98 L172 84 L168 100 L160 80 L154 100 L148 78 L140 98 L136 80 L130 98Z', hairT);
  else body += P('M123 96 C119 66 134 52 150 52 C166 52 181 66 177 96 L171 82 L168 100 L161 78 L156 99 L150 74 L144 98 L139 78 L132 99 L129 82Z', hairT);
  if (hs !== 'spiky'){ const lock = P('M126 84 C120 112 124 132 118 152 C128 144 132 124 133 100Z', hairT); body += lock + MIR(lock); }
  body += L('M132 64 Q146 56 160 60', '#fff', 3, 'opacity=".45"') + L('M138 70 Q146 66 152 67', '#fff', 1.6, 'opacity=".35"');
  // ---- headgear ----
  if (hatOn) body += `<g transform="translate(76 48.6) scale(.74)">${hatArt(WZo.hat, WZo.house)}</g>`;
  else if (girl){ // headphones (helmet slot colours them)
    body += L('M121 84 C120 50 180 50 179 84', '#1f2937', 4) + P('M116 84 h10 v22 h-10z', cloth(C.head), 2) + P('M174 84 h10 v22 h-10z', cloth(C.head), 2);
    if (he && he.tier >= 2) body += `<circle cx="121" cy="95" r="3" fill="${he.gem}" ${GL}/><circle cx="179" cy="95" r="3" fill="${he.gem}" ${GL}/>`;
    if (he && he.tier >= 4) body += `<path d="M150 40 l6 9 l-6 9 l-6 -9z" fill="${he.gem}" stroke="${INKc}" stroke-width="1.4" ${GL}/>` + L('M128 58 Q150 44 172 58', he.trim, 2.4);
  } else if (he){ // knight circlet / crest
    body += P('M124 70 Q150 58 176 70 L174 78 Q150 68 126 78Z', cloth(he.prim), 1.8) + `<path d="M150 58 l6 9 l-6 10 l-6 -10z" fill="${he.gem}" stroke="${INKc}" stroke-width="1.4" ${GL}/>`;
    if (he.tier >= 3) body += [-1, 1].map(d => P(`M${150 + d*24} 72 L${150 + d*40} ${52 - he.tier} L${150 + d*30} 74Z`, cloth(he.trim), 1.6)).join('');
  }
  // ---- held items ----
  body += `</g><g transform="${BT}">`;
  const RH = end(armR);
  if (book){
    body += `<g transform="translate(150 186)"><path d="M-34 -6 Q-17 -14 0 -6 Q17 -14 34 -6 L34 18 Q17 10 0 18 Q-17 10 -34 18Z" fill="#fef3c7" stroke="${INKc}" stroke-width="2"/><path d="M0 -6 V18" stroke="${INKc}" stroke-width="1.5"/><path d="M-28 0 h22 M-28 6 h18 M6 0 h22 M10 6 h18" stroke="${C.wglow}" stroke-width="1.6" ${GL}/></g>`;
  }
  if (girl){ // orbiting runes (always — she is the Rune Reader)
    const cy = book ? 150 : 200, cx = book ? 150 : 84;
    body += `<ellipse cx="${cx}" cy="${cy}" rx="${book ? 62 : 40}" ry="${book ? 24 : 15}" fill="none" stroke="${C.wglow}" stroke-width="1" stroke-dasharray="2 6" opacity=".8"/>`;
    body += ['ᚱ','ᛟ','ᚨ','ᛞ','ᛖ','ᚷ'].slice(0, book ? 6 : 4).map((r, i, a) => { const t = i / a.length * Math.PI * 2; return `<text x="${(cx + Math.cos(t) * (book ? 62 : 40)).toFixed(1)}" y="${(cy + Math.sin(t) * (book ? 24 : 15)).toFixed(1)}" fill="${C.wglow}" font-size="16" font-family="serif" text-anchor="middle" ${GL}>${r}</text>`; }).join('');
    if (!book) body += `<g transform="translate(84 206) rotate(-10) scale(.6)"><path d="M-34 -6 Q-17 -14 0 -6 Q17 -14 34 -6 L34 18 Q17 10 0 18 Q-17 10 -34 18Z" fill="#fef3c7" stroke="${INKc}" stroke-width="3"/></g>`;
  }
  if (wandOn) body += wandArt(RH[0], RH[1], RH[0] + 34, RH[1] - 74, WZo.wand.wood, WZo.wand.core, 7);
  else if (legend) body += `<g transform="translate(${RH[0] - 160 * 1.5} ${RH[1] - 160 * 1.5}) scale(1.5)">${legendWeaponSVG(wpn)}</g>`;
  else if (!girl || we){
    const blade = C.wglow, len = 110 + (we ? Math.min(we.tier, 8) * 6 : 0);
    if ((h.weapon || 'sword') === 'staff') body += L(`M${RH[0]} ${RH[1] + 150} L${RH[0] + 4} ${RH[1] - 150}`, '#422006', 6) + `<circle cx="${RH[0] + 4}" cy="${RH[1] - 156}" r="12" fill="${blade}" stroke="${INKc}" stroke-width="2" ${GL}/>`;
    else body += `<path d="M${RH[0]} ${RH[1]} L${RH[0] + 4} ${RH[1] - len}" stroke="${blade}" stroke-width="14" stroke-linecap="round" opacity=".35" ${BL}/>` + L(`M${RH[0]} ${RH[1]} L${RH[0] + 4} ${RH[1] - len}`, blade, 6, GL) + L(`M${RH[0]} ${RH[1]} L${RH[0] + 4} ${RH[1] - len}`, '#fff', 2)
      + P(`M${RH[0] - 14} ${RH[1] - 4} Q${RH[0]} ${RH[1] - 12} ${RH[0] + 14} ${RH[1] - 4} Q${RH[0]} ${RH[1] + 2} ${RH[0] - 14} ${RH[1] - 4}Z`, cloth(C.trim), 1.8);
  }
  s += `<defs><filter id="${u}gl" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${u}bl" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>${defs.join('')}</defs>`;
  return s + body + '</g></svg>';
}
function profileHero(k, size){ const keep = K; K = DB.kids[k]; try { return size ? riderNode(size) : heroNode(110); } finally { K = keep; } }
function heroNode(size=170, withBuddy=true){
  const wrap = el('div',{class:'hero-wrap'}, el('div',{class:'hero-main', html: heroSVG(size)}));
  if (withBuddy && K.avatar && K.avatar.base) wrap.append(el('div',{class:'hero-buddy', html: avatarSVG(K.avatar, Math.round(size*.42))}));
  const full = fullSetOn();
  if (full) wrap.append(el('div',{class:'hero-title', style:`--gem:${full.gem}`}, '✨ ' + full.title));
  return wrap;
}

/* ---------- hero creator ---------- */
function screenHeroCreate(after){
  const h = Object.assign({ skin:SKIN_TONES[1], hairColor:HAIR_COLORS[1], hairStyle: styleOf(kid) === 'girl' ? 'long' : 'spiky', weapon:'sword', outfit: styleOf(kid) === 'girl' ? 'dress' : 'pants', bow: styleOf(kid) === 'girl' }, K.hero || {});
  const prev = el('div',{class:'hero-create-prev'});
  const draw = () => { prev.innerHTML = heroSVG(220, { hero:h }); };
  const row = (label, items, render, key) => el('div',{class:'hc-row'}, el('h3',{}, label),
    el('div',{class:'hc-opts'}, ...items.map(v => { const b = el('button',{class:'hc-opt' + (h[key] === v ? ' on' : ''), onclick:()=>{ h[key] = v; [...b.parentNode.children].forEach(x => x.classList.toggle('on', x === b)); draw(); beep('tap'); }}, render(v)); return b; })));
  draw();
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('div'), el('h1',{class:'title'}, `Make your hero, ${kidName()}!`), el('div')),
    el('div',{class:'hero-create'}, el('div',{class:'card center'}, prev, el('p',{class:'muted'}, 'Your buddy will be your companion on every quest!')),
      el('div',{class:'card grow'},
        row('Skin', SKIN_TONES, v => el('span',{class:'swatch', style:`background:${v}`}), 'skin'),
        row('Hair style', Object.keys(HAIR_STYLES), v => HAIR_STYLES[v], 'hairStyle'),
        row('Hair color', HAIR_COLORS, v => el('span',{class:'swatch', style:`background:${v}`}), 'hairColor'),
        row('Weapon', isDev() ? ['wizard','staff','sword','laser'] : ['sword','staff','laser'], v => ({ sword:'⚔️ Sword', staff:'🪄 Magic Staff', laser:'✨ Laser Sword', wizard:'🌟 Star Staff' })[v], 'weapon'),
        row('Eyes', EYE_COLORS, v => el('span',{class:'hc-swatch', style:`background:radial-gradient(circle at 35% 30%, #fff 0 18%, ${v} 22%)`}), 'eyes'),
        isDev() ? row('Beard', [true,false], v => v ? '🧔 Wizard beard' : '🙂 No beard', 'beard') : null,
        styleOf(kid) === 'girl' ? row('Outfit', ['dress','pants'], v => v === 'dress' ? '👗 Dress' : '👖 Pants', 'outfit') : null,
        styleOf(kid) === 'girl' ? row('Hair bow', [true,false], v => v ? '🎀 Bow' : 'No bow', 'bow') : null,
        el('button',{class:'btn big', style:'margin-top:16px', onclick:()=>{ K.hero = h; heroState(); save(); confetti(70); beep('level'); say('Your hero is ready for adventure!'); (after || screenHome)(); }},'✅ This is me!')))));
}

/* ---------- loot ---------- */
function lootReveal(setId, slot, fromBoss){
  const S = SET_BY_ID[setId];
  return new Promise(res => {
    const ov = el('div',{class:'epic-overlay loot-overlay', style:`--gem:${S.gem}`}, el('div',{class:'epic-rays'}),
      el('div',{class:'epic-card'},
        el('div',{class:'epic-tier'}, fromBoss ? '🏆 BOSS LOOT 🏆' : '🎁 GEAR DROP 🎁'),
        el('div',{class:'loot-hero', html: heroSVG(190, { eq: Object.assign({}, heroState().eq, { [slot]: setId }) })}),
        el('h2',{class:'epic-title'}, `${S.name} ${SLOT_LABEL[slot]}!`),
        el('p',{class:'epic-sub'}, `${setCount(setId)} of 8 ${S.name} pieces · ${8 - setCount(setId) ? `${8 - setCount(setId)} more for the full set glow!` : 'FULL SET! Wear them all to glow!'}`),
        el('div',{class:'row center'},
          el('button',{class:'btn big', onclick:()=>{ heroState().eq[slot] = setId; if (slot === 'weapon'){ K.wpn = null; wandOff(); } save(); ov.remove(); res(); }},'⚔️ Equip it!'),
          el('button',{class:'btn small gray', onclick:()=>{ ov.remove(); res(); }},'Later'))));
    document.body.append(ov); confetti(fromBoss ? 120 : 60); beep('level');
    say(`You got the ${S.name} ${SLOT_LABEL[slot]}!`);
  });
}
// after a great read: a common piece from this level's set (or a lower conquered set once that one is done)
async function maybeGearDrop(){
  if (!K.hero) return;
  const tiers = [K.level].concat((K.bossesBeaten || []).slice().sort((a,b) => b - a));
  for (const lv of tiers){
    const S = setForLevel(lv); if (!S) continue;
    const missing = COMMON_PIECES.filter(p => !hasPiece(S.id, p));
    if (missing.length){ const p = pick(missing); givePiece(S.id, p); await lootReveal(S.id, p, false); return; }
  }
}
async function bossGearDrop(level, replay){
  if (!K.hero) return;
  const S = setForLevel(level); if (!S) return;
  const missing = (replay ? GEAR_SLOTS : BOSS_PIECES).filter(p => !hasPiece(S.id, p));
  const drops = replay ? missing.slice(0, 1) : missing;
  for (const p of drops){ givePiece(S.id, p); await lootReveal(S.id, p, true); }
  if (!drops.length) { K.stars += 5; save(); await modal(el('div',{}, el('div',{class:'big-e'},'💰'), el('h2',{},'Treasure!'), el('p',{}, `You already have the whole ${S.name} set. +5 ⭐`)), [['Yay! ▶','',1]]); }
  if (setCount(S.id) === 8 && !(K.setsDone || []).includes(S.id)){
    K.setsDone = (K.setsDone || []).concat(S.id); save(); addCosmic(3, `Full ${S.name} set!`);
  }
}

/* ---------- armory ---------- */
let armorySlot = 'chest';
function legendGrid(grid){
  const own = weaponState(), n = LEGEND_WEAPONS.filter(w => own[w.id]).length;
  grid.append(el('div',{class:'lw-head'}, el('b',{}, `🌟 ${n}/${LEGEND_WEAPONS.length} found`),
    el('span',{class:'muted'}, ' Find them in Gold & Cosmic chests, or buy one. ⭐ ' + balance() + '  💫 ' + cosmicBal()),
    K.wpn ? el('button',{class:'btn small ghost', onclick:()=>{ K.wpn = null; wandOff(); save(); beep('tap'); screenArmory(); }}, '↩️ Use my set weapon') : null));
  LEGEND_WEAPONS.forEach(W => {
    const have = !!own[W.id] || isDev(), on = K.wpn === W.id, R = RARITY[W.r];
    const cost = (W.price.cur === 'cosmic' ? '💫 ' : '⭐ ') + W.price.amt;
    grid.append(el('button',{class:'armory-item lw-item r-' + W.r + (have ? '' : ' locked') + (on ? ' on' : ''), style:`--rc:${R.c}`, onclick:()=>{
        if (have){ K.wpn = on ? null : W.id; if (!on) wandOff(); save(); beep('tap'); if (!on) say(W.name + '!'); screenArmory(); return; }
        if (!canPay(W.price)){ say(`${W.name}. ${R.n}. Find it in a chest, or save up ${W.price.amt} ${W.price.cur === 'cosmic' ? 'Cosmic Power' : 'stars'}.`); beep('bad'); return; }
        if (!confirm(`Buy ${W.name} for ${cost}?`)) return;
        pay(W.price); giveWeapon(W); K.wpn = W.id; wandOff(); save(); confetti(W.r === 'mythic' ? 120 : 60); beep('level'); burst(R.n.toUpperCase() + '!'); say(W.name + '!'); screenArmory(); }},
      el('div',{class:'ai-pic lw-pic' + (have ? '' : ' dim'), html: weaponIcon(W.id, 150)}),
      el('div',{class:'lw-rar'}, R.n + ' · Lv ' + W.ilvl),
      el('div',{class:'ai-name'}, W.name),
      el('div',{class:'ai-sub'}, have ? (on ? '✓ In hand' : W.blurb) : '🔒 ' + cost)));
  });
}
function screenArmory(){
  stopAll();
  const G = heroState();
  const prev = el('div',{class:'armory-prev'}, heroNode(230));
  const grid = el('div',{class:'armory-grid' + (armorySlot === 'legend' ? ' lw-grid' : '')});
  if (armorySlot === 'legend') legendGrid(grid);
  else if (armorySlot === 'wizard') wizardWardrobe(grid);
  else armorySets().forEach(S => {
    const owned = hasPiece(S.id, armorySlot), on = G.eq[armorySlot] === S.id;
    const where = S.tier === 0 ? 'Starter gear' : BOSS_PIECES.includes(armorySlot) ? `Beat the Level ${S.tier} boss` : `Great reads at Level ${S.tier}`;
    grid.append(el('button',{class:'armory-item' + (owned ? '' : ' locked') + (on ? ' on' : ''), style:`--gem:${S.gem};--prim:${S.prim}`, onclick:()=>{
        if (!owned){ say(`${S.name} ${SLOT_LABEL[armorySlot]}. ${where} to get it!`); return; }
        G.eq[armorySlot] = S.id; if (armorySlot === 'weapon'){ K.wpn = null; wandOff(); } save(); beep('tap'); screenArmory(); }},
      el('div',{class:'ai-pic', html: owned ? heroSVG(84, Object.assign({ eq: Object.assign({}, G.eq, { [armorySlot]: S.id }) }, armorySlot === 'weapon' ? { wpn:null, wiz:Object.assign({}, K.wiz || {}, { wandOn:false }) } : {})) : ''}, owned ? null : '🔒'),
      el('div',{class:'ai-name'}, S.name), el('div',{class:'ai-sub'}, owned ? (on ? '✓ Wearing' : 'Tap to wear') : where)));
  });
  const sets = el('div',{class:'set-list'}, ...armorySets().filter(S => S.tier).map(S => {
    const n = setCount(S.id);
    return el('div',{class:'set-row', style:`--gem:${S.gem};--prim:${S.prim}`},
      el('span',{class:'set-dot'}), el('b',{}, S.name), el('span',{class:'muted'}, `Level ${S.tier}`),
      el('div',{class:'set-bar'}, el('div',{style:`width:${n/8*100}%`})), el('span',{}, `${n}/8`),
      n === 8 ? el('button',{class:'btn small', onclick:()=>{ GEAR_SLOTS.forEach(s => G.eq[s] = S.id); K.wpn = null; wandOff(); save(); burst('SET!'); screenArmory(); }},'Wear set') : null);
  }));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🛡️ Armory'),
      el('button',{class:'btn small blue', onclick:()=>screenHeroCreate(screenArmory)},'✏️ Change look')),
    el('div',{class:'shop-layout'}, prev,
      el('div',{class:'grow'},
        el('div',{class:'tabs shop-tabs'}, ...GEAR_SLOTS.map(sl => el('button',{class:'tab' + (sl === armorySlot ? ' active' : ''), onclick:()=>{ armorySlot = sl; screenArmory(); }}, SLOT_ICON[sl] + ' ' + SLOT_LABEL[sl])),
          el('button',{class:'tab lw-tab' + (armorySlot === 'legend' ? ' active' : ''), onclick:()=>{ armorySlot = 'legend'; screenArmory(); }}, '🌟 Legendary Weapons'),
          el('button',{class:'tab ww-tab' + (armorySlot === 'wizard' ? ' active' : ''), onclick:()=>{ armorySlot = 'wizard'; screenArmory(); }}, '🧙 Wizard')),
        grid,
        el('div',{class:'card', style:'margin-top:16px'}, el('h2',{style:'margin-top:0'},'Gear sets'),
          el('p',{class:'muted'},'Wear all 8 pieces of one set to unlock its glowing set bonus and title!'), sets)))));
}


/* ---------- Hall of Heroes: profile showcase ---------- */
function screenHeroHall(){
  stopAll();
  const other = playerIds(false).find(id => id !== kid && DB.kids[id].hero), O = other ? DB.kids[other] : null;
  const tile = (icon, n, label, on=true) => el('div',{class:'hh-tile' + (on ? '' : ' off'), title:label}, el('span',{class:'hh-ic'}, icon), n != null ? el('span',{class:'hh-n'}, n) : null);
  const buddies = Object.entries(AVATAR_BASES).filter(([,b]) => b.kid).map(([id,b]) => tile(b.emoji, null, b.name, K.avatar.owned.includes(id) || K.level >= AVATAR_UNLOCK_LEVEL));
  const bosses = T.levels.map((_, i) => { const B = bossFor(i+1); if (!B) return null; const r = (K.bossLog||{})[i+1]; return tile((K.bossesBeaten||[]).includes(i+1) ? B.e : '❔', r && r.wins ? r.wins : null, B.name, (K.bossesBeaten||[]).includes(i+1)); }).filter(Boolean);
  const sets = GEAR_SETS.filter(g => g.tier).map(g => el('div',{class:'hh-tile set' + (setCount(g.id) ? '' : ' off'), style:`--gem:${g.gem};--prim:${g.prim}`, title:g.name}, el('span',{class:'hh-gem'}), el('span',{class:'hh-n'}, setCount(g.id) + '/8')));
  const stage = el('div',{class:'hh-stage'},
    el('div',{class:'hh-spot main'}, riderNode(200), el('div',{class:'hh-name'}, kidName()), el('div',{class:'hh-sub'}, `${TK==='daughter'?'Rank':'Level'} ${K.level} · ${(fullSetOn() || {}).title || 'Adventurer'}`)));
  if (O && O.hero){ const keep = K; K = O; try { stage.append(el('div',{class:'hh-spot side'}, heroNode(130), el('div',{class:'hh-name small'}, kidName(other)))); } finally { K = keep; } }
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🏛️ Hall of Heroes'), el('button',{class:'btn small', onclick:screenArmory},'🛡️ Armory')),
    el('div',{class:'hh-panel'},
      el('div',{class:'hh-rows'},
        el('div',{class:'hh-box'}, el('h3',{},'Companions'), el('div',{class:'hh-row'}, ...buddies)),
        el('div',{class:'hh-box grow'}, el('h3',{},'Bosses Defeated'), el('div',{class:'hh-row'}, ...bosses)),
        el('div',{class:'hh-box grow'}, el('h3',{},'Gear Sets'), el('div',{class:'hh-row'}, ...sets))),
      stage,
      el('div',{class:'hh-stats'}, ...[['⭐', balance(), 'Stars'],['💫', cosmicBal(), 'Cosmic'],['🔥', K.streak.count||0, 'Day streak'],['📖', normalSessions(K).length, 'Stories'],['📚', (K.realBooks||[]).length, 'Real books'],['🎯', masteredWords(K).length, 'Words mastered'],['🎖️', K.badges.length, 'Badges']]
        .map(([e,n,l]) => el('div',{class:'hh-stat'}, el('b',{}, e + ' ' + n), el('span',{}, l)))))));
}
/* ---------- quest map ---------- */
const MAP_SPOTS = [[9,82],[25,60],[14,34],[34,18],[52,40],[46,72],[68,80],[88,46],[76,18],[62,8],[90,10],[94,76]];
function screenQuestMap(){
  stopAll();
  const map = el('div',{class:'quest-map'});
  let path = 'M' + MAP_SPOTS.slice(0, T.levels.length).map(([x,y]) => `${x*10} ${y*6}`).join(' L');
  map.innerHTML = `<svg viewBox="0 0 1000 600" preserveAspectRatio="none" class="qm-svg"><path d="${path}" stroke="#7c5a33" stroke-width="12" fill="none" stroke-dasharray="2 22" stroke-linecap="round"/></svg>`;
  for (let lv = 1; lv <= T.levels.length; lv++){
    const B = bossFor(lv), S = setForLevel(lv), [x, y] = MAP_SPOTS[lv-1] || [50,50];
    if (!B) continue;
    const beaten = (K.bossesBeaten || []).includes(lv), current = lv === K.level && !beaten, ready = current && bossReady();
    const state = beaten ? 'beaten' : current ? (ready ? 'ready' : 'current') : lv < K.level ? 'skipped' : 'locked';
    const node = el('button',{class:'qm-node ' + state, style:`left:${x}%;top:${y}%;--boss:${B.color};--gem:${S ? S.gem : '#fff'}`, onclick:()=>{
      if (state === 'locked'){ say(`${B.name} is far ahead. Keep reading to get there!`); return; }
      if (state === 'current'){ const left = Math.max(0, LEVEL_UP_STREAK - (K.passStreak || 0)); say(`${B.name} is sleeping. Read ${left} more great stor${left === 1 ? 'y' : 'ies'} to wake the boss!`); return; }
      bossIntro(lv); }},
      el('div',{class:'qm-face', html: state === 'locked' ? '❔' : bossArt(B, 64)}),
      el('div',{class:'qm-label'}, el('b',{}, state === 'locked' ? '???' : B.name), el('span',{}, `${S ? S.name : ''} set ${S ? setCount(S.id) : 0}/8`)),
      el('div',{class:'qm-badge'}, state === 'beaten' ? '✅ Re-battle for gear' : state === 'ready' ? '⚔️ BATTLE!' : state === 'current' ? '💤 Read to wake' : state === 'skipped' ? '⚔️ Battle for gear' : '🔒'));
    map.append(node);
  }
  const here = MAP_SPOTS[Math.min(K.level, T.levels.length) - 1];
  if (here) map.append(el('div',{class:'qm-you', style:`left:${here[0]}%;top:${here[1]}%`, html: heroSVG(70)}));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🗺️ Quest Map'),
      el('button',{class:'btn small', onclick:screenArmory},'🛡️ Armory')),
    el('p',{class:'subtitle'}, 'Great reads wake each boss and drop gear. Beat a boss for its helmet and weapon. Beaten bosses can be battled again for missing pieces!'),
    map));
}

/* ================= TREASURE CHESTS & RARITY =================
   Chests drop one treasure plus bonus stars. Treasures have a rarity and an item level, and can be
   placed in My World › 🎁 Treasures (one copy per treasure found).
   Earned: great reads (wooden / silver), boss wins (gold), level ups (cosmic), Town Hall quests, real books.
   Chests can also be bought with stars or 💫. */
const RARITY = {
  common:    { n:'Common',    c:'#94a3b8', lv:[1,10]  },
  uncommon:  { n:'Uncommon',  c:'#22c55e', lv:[11,20] },
  rare:      { n:'Rare',      c:'#3b82f6', lv:[21,35] },
  legendary: { n:'Legendary', c:'#f59e0b', lv:[36,50] },
  mythic:    { n:'Mythic',    c:'#d946ef', lv:[51,60] }
};
const RARITY_ORDER = ['common','uncommon','rare','legendary','mythic'];
const TREASURES = [
  ['common',   [['pebble','🪨','Shiny Pebble'],['daisy','🌼','Daisy Pot'],['shroom','🍄','Toadstool'],['shell','🐚','Seashell'],['balloon','🎈','Red Balloon'],['basket','🧺','Picnic Basket'],['kite','🪁','Kite'],['acorn','🌰','Lucky Acorn'],['duckie','🦆','Rubber Duck'],['candle','🕯️','Cozy Candle']]],
  ['uncommon', [['lantern','🏮','Paper Lantern'],['cactus','🌵','Happy Cactus'],['teddy','🧸','Big Teddy'],['bell','🔔','Golden Bell'],['music','🎶','Music Box'],['clover','🍀','Four-Leaf Clover'],['sled','🛷','Snow Sled'],['owl','🦉','Owl Statue']]],
  ['rare',     [['crystal','🔮','Crystal Ball'],['guardian','🗿','Stone Guardian'],['gate','⛩️','Sun Gate'],['telescope','🔭','Star Telescope'],['harp','🪕','Moon Banjo'],['orb','🧿','Wishing Orb'],['amber','🦋','Amber Butterfly']]],
  ['legendary',[['throne','👑','Royal Throne'],['volcano','🌋','Mini Volcano'],['unicorn','🦄','Unicorn Statue'],['phoenix','🐦‍🔥','Phoenix Perch'],['trident','🔱','Sea King Trident']]],
  ['mythic',   [['galaxy','🌌','Galaxy Portal'],['planet','🪐','Ringed Planet'],['fallen','🌠','Fallen Star'],['rainbow','🌈','Rainbow Bridge']]]
].flatMap(([r, list]) => list.map(([id, e, name], i) => { const [a, b] = RARITY[r].lv; return { id:'tr_' + id, e, name, r, ilvl: Math.round(a + (b - a) * (list.length > 1 ? i / (list.length - 1) : .5)) }; }));
const TREASURE_BY_ID = Object.fromEntries(TREASURES.map(t => [t.id, t]));
TREASURES.forEach(t => { const row = ['treasure', t.id, t.e, t.name, 0]; WORLD_ITEMS.push(row); WORLD_BY_ID[t.id] = row; });
WORLD_CATS.treasure = '🎁 Treasures';
/* ================= LEGENDARY WEAPONS =================
   Original collectible weapons (shown in the hero's hand instead of the set weapon).
   Found in Gold & Cosmic chests (sometimes Silver), or bought in the Armory › Weapons tab.
   All drawn around the hand pivot (160,146) with the weapon pointing up. */
const LW_GLOW = 'filter="url(#hglow)"';
const lwGrip = (c, wrap='#1f1235') => `<rect x="154" y="136" width="12" height="38" rx="4" fill="${c}" stroke="${INK}" stroke-width="2.5"/><path d="M154 144 l12 -4 M154 152 l12 -4 M154 160 l12 -4 M154 168 l12 -4" stroke="${wrap}" stroke-width="2" opacity=".55"/>`;
const lwPommel = (gem) => `<circle cx="160" cy="178" r="6" fill="${gem}" stroke="${INK}" stroke-width="2.5"/><circle cx="158" cy="176" r="1.8" fill="#fff" opacity=".8"/>`;
const lwShaft = (top, c1, c2, bot=238) => `<path d="M158 ${bot} L160 ${top}" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M158 ${bot} L160 ${top}" stroke="${c1}" stroke-width="6" stroke-linecap="round"/><path d="M157 ${bot-6} L159 ${top+6}" stroke="${c2}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
const lwSpark = (x, y, r, c, d=0) => `<g class="hero-spark" style="animation-delay:${d}s">${starShape(x, y, r, c)}</g>`;
const LW_DRAW = {
  dagger: () => `<path d="M160 136 L152 128 Q146 98 166 70 Q158 100 168 128Z" fill="#c4b5fd" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M158 126 Q154 104 162 84" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
    <path d="M144 136 q16 -8 32 0 l-4 6 h-24z" fill="#4c1d95" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>${lwGrip('#312e81')}${lwPommel('#a855f7')}`,
  bow: (o) => `<path d="M135 50 Q188 146 135 240" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M135 50 Q188 146 135 240" fill="none" stroke="${o.wood}" stroke-width="7" stroke-linecap="round"/>
    <path d="M140 64 Q176 146 140 228" fill="none" stroke="${o.hi}" stroke-width="2" opacity=".7"/><path d="M135 50 L135 240" stroke="${o.string}" stroke-width="1.8"/>
    ${o.wing ? `<path d="M138 56 q-26 -4 -34 -26 q16 6 30 4 q-10 -8 -12 -20 q14 10 22 30z M138 234 q-26 4 -34 26 q16 -6 30 -4 q-10 8 -12 20 q14 -10 22 -30z" fill="${o.wing}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
      : `<path d="M135 50 q-14 -10 -10 -24 q10 8 10 24z M135 240 q-14 10 -10 24 q10 -8 10 -24z" fill="${o.leaf}" stroke="${INK}" stroke-width="2"/>`}
    <rect x="154" y="132" width="14" height="28" rx="5" fill="${o.grip}" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="161" cy="146" r="${o.wing ? 7 : 5}" fill="${o.gem}" stroke="${INK}" stroke-width="2" ${o.wing ? LW_GLOW : ''}/>
    ${o.wing ? lwSpark(118, 40, 5, '#fff') + lwSpark(120, 252 - 30, 4, '#fde68a', -.7) : `<path d="M172 120 q8 -6 12 2 q-8 4 -12 -2z M172 172 q8 6 12 -2 q-8 -4 -12 2z" fill="${o.leaf}" stroke="${INK}" stroke-width="1.5"/>`}`,
  staff: (o) => `${lwShaft(58, o.shaft, o.hi)}
    <path d="M160 62 C136 58 128 34 140 14 C140 34 148 44 160 46 C172 44 180 34 180 14 C192 34 184 58 160 62Z" fill="${o.head}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    ${o.ring ? `<ellipse cx="160" cy="34" rx="28" ry="9" fill="none" stroke="${o.ring}" stroke-width="3" ${LW_GLOW}/>` : ''}
    <circle cx="160" cy="34" r="17" fill="${o.gem}" opacity=".35"/><circle cx="160" cy="34" r="11" fill="${o.gem}" stroke="${INK}" stroke-width="3" ${LW_GLOW}/><circle cx="156" cy="30" r="3.5" fill="#fff" opacity=".85"/>
    ${o.star ? starShape(160, 34, 7, '#fff') + lwSpark(130, 10, 4.5, o.ring) + lwSpark(194, 22, 3.5, '#fff', -.5) + lwSpark(186, 62, 3, o.ring, -1) : lwSpark(186, 20, 3.5, '#fff')}`,
  crescent: () => `${lwShaft(64, '#475569', '#cbd5e1')}
    <path d="M160 66 C118 62 108 22 138 2 C128 30 140 50 160 52 C180 50 192 30 182 2 C212 22 202 62 160 66Z" fill="#e2e8f0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M136 14 C130 34 142 54 160 58 C178 54 190 34 184 14" fill="none" stroke="#93c5fd" stroke-width="2.5"/>
    <circle cx="160" cy="64" r="7" fill="#60a5fa" stroke="${INK}" stroke-width="2.5" ${LW_GLOW}/><rect x="152" y="196" width="14" height="8" rx="2" fill="#94a3b8" stroke="${INK}" stroke-width="2"/>`,
  hammer: () => `${lwShaft(64, '#6b4a2e', '#a07450', 182)}
    <rect x="126" y="30" width="68" height="38" rx="7" fill="#64748b" stroke="${INK}" stroke-width="3"/><rect x="126" y="30" width="68" height="10" rx="5" fill="#94a3b8" opacity=".8"/>
    <rect x="146" y="28" width="28" height="42" rx="4" fill="#ca8a04" stroke="${INK}" stroke-width="2.5"/><circle cx="160" cy="49" r="6" fill="#fde047" stroke="${INK}" stroke-width="2"/>
    <path d="M160 28 L156 14 L164 14Z" fill="#cbd5e1" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>${lwPommel('#ca8a04').replace(/178/g, '186').replace(/176/g, '184')}`,
  crystal: () => `<path d="M160 18 L173 58 L167 138 L153 138 L147 58Z" fill="#fbcfe8" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M160 18 L160 138 M147 58 L160 76 L173 58 M153 110 L160 96 L167 110" stroke="#f472b6" stroke-width="1.8" fill="none"/><path d="M156 40 L152 60" stroke="#fff" stroke-width="2.5" opacity=".8"/>
    ${spikes(160, 140, 5, 16, 140, 270, '#a5f3fc', '#06b6d4')}<rect x="140" y="136" width="40" height="8" rx="4" fill="#0e7490" stroke="${INK}" stroke-width="2.5"/>${lwGrip('#155e75')}${lwPommel('#f472b6')}`,
  axe: () => `${lwShaft(40, '#3b0764', '#a78bfa', 184)}
    <path d="M163 44 Q200 36 208 68 Q212 98 198 116 Q188 96 163 92Z" fill="#7c3aed" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M200 50 Q212 80 198 112" fill="none" stroke="#e9d5ff" stroke-width="3.5" stroke-linecap="round"/><path d="M168 56 Q184 64 180 84" stroke="#c084fc" stroke-width="2" fill="none"/>
    <path d="M157 58 L136 50 L142 66 L157 72Z" fill="#a78bfa" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="164" cy="68" r="7" fill="#f0abfc" stroke="${INK}" stroke-width="2.5" ${LW_GLOW}/>
    <path d="M160 40 q-6 -14 0 -26 q6 12 0 26z" fill="#c084fc" stroke="${INK}" stroke-width="2"/>${lwSpark(206, 34, 4, '#f0abfc')}${lwSpark(190, 124, 3, '#fff', -.8)}`,
  greatsword: () => `<path d="M160 10 L174 34 L172 138 L148 138 L146 34Z" fill="#fde68a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M160 22 L160 132" stroke="#f59e0b" stroke-width="3"/><path d="M152 38 L152 126" stroke="#fff" stroke-width="2.5" opacity=".7"/>
    <path d="M128 132 q12 -22 32 -8 q20 -14 32 8 l-6 12 h-52z" fill="#f59e0b" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="160" cy="134" r="9" fill="#fb923c" stroke="${INK}" stroke-width="2.5" ${LW_GLOW}/>${starShape(160, 134, 5, '#fff7ed')}
    ${lwGrip('#92400e')}${lwPommel('#fbbf24')}${lwSpark(140, 20, 4.5, '#fef3c7')}${lwSpark(182, 60, 3.5, '#fff', -.6)}`,
  runeblade: () => `<path d="M160 16 L171 30 L176 72 L169 138 L151 138 L144 72 L149 30Z" fill="#bae6fd" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M160 26 L160 132" stroke="#7dd3fc" stroke-width="2"/>
    <g stroke="#22d3ee" stroke-width="2.2" fill="none" stroke-linecap="round" ${LW_GLOW}><path d="M155 50 l5 -6 l5 6"/><path d="M155 74 h10 M160 68 v12"/><path d="M155 100 l10 8 M165 100 l-10 8"/><path d="M156 124 q4 -6 8 0"/></g>
    <path d="M160 142 q-32 -2 -40 -30 q16 16 40 12 q24 4 40 -12 q-8 28 -40 30z" fill="#94a3b8" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="160" cy="136" r="7" fill="#67e8f9" stroke="${INK}" stroke-width="2.5" ${LW_GLOW}/>${lwGrip('#1e3a5f')}${lwPommel('#67e8f9')}
    ${lwSpark(138, 30, 4, '#e0f2fe')}${lwSpark(184, 92, 3.5, '#fff', -.9)}`,
  stormblade: () => `<path d="M160 12 L168 28 L167 138 L153 138 L152 28Z" fill="#e0e7ff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M161 22 l-6 22 l9 2 l-9 24 l10 2 l-10 30 l9 2 l-6 28" stroke="#facc15" stroke-width="2.6" fill="none" stroke-linejoin="round" ${LW_GLOW} class="hero-spark"/>
    <path d="M160 140 q-30 -18 -40 -44 q14 12 26 26 q-4 -16 0 -30 q6 22 14 48z M160 140 q30 -18 40 -44 q-14 12 -26 26 q4 -16 0 -30 q-6 22 -14 48z" fill="#3b82f6" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="160" cy="138" r="7" fill="#93c5fd" stroke="${INK}" stroke-width="2.5" ${LW_GLOW}/>${lwGrip('#1e40af')}${lwPommel('#60a5fa')}
    <path d="M186 40 l-8 12 l6 1 l-6 12" stroke="#fde047" stroke-width="2" fill="none" class="hero-spark"/><path d="M134 70 l6 10 l-5 1 l5 10" stroke="#93c5fd" stroke-width="2" fill="none" class="hero-spark" style="animation-delay:-.7s"/>`,
  emberhammer: () => `${lwShaft(66, '#292524', '#f97316', 190)}
    <path d="M158 180 l2 -24 M159 120 l1 -30" stroke="#fb923c" stroke-width="2" ${LW_GLOW}/>
    ${flameShape(140, 36, 1.1, '#f97316', '#fde047')}${flameShape(178, 34, 1.2, '#ef4444', '#fdba74')}${flameShape(160, 30, 1.4, '#f97316', '#fef08a')}
    <path d="M122 34 h76 l-4 40 h-68z" fill="#44403c" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M128 44 l14 10 l-6 12 M192 42 l-12 12 l8 12 M150 38 l10 14 l10 -14" stroke="#fb923c" stroke-width="2.6" fill="none" stroke-linecap="round" ${LW_GLOW}/>
    <rect x="148" y="70" width="24" height="12" rx="3" fill="#78350f" stroke="${INK}" stroke-width="2.5"/><circle cx="160" cy="54" r="7" fill="#fde047" stroke="${INK}" stroke-width="2.5" ${LW_GLOW}/>
    ${lwSpark(116, 22, 3.5, '#fdba74')}${lwSpark(204, 58, 3, '#fde047', -.5)}${lwSpark(186, 4 + 10, 3, '#fff', -1)}`,
  glaive: () => `<path d="M150 30 C206 46 216 150 164 232 C184 160 184 86 146 50Z" fill="#4ade80" stroke="${INK}" stroke-width="3" stroke-linejoin="round" ${LW_GLOW}/>
    <path d="M154 44 C194 66 200 150 172 214" fill="none" stroke="#dcfce7" stroke-width="2.5" opacity=".9"/><path d="M162 60 C186 84 188 150 170 196" fill="none" stroke="#166534" stroke-width="3"/>
    <path d="M190 90 l14 -8 l-6 14z M196 150 l14 4 l-12 8z" fill="#14532d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M164 130 H182 M164 164 H180" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M164 130 H182 M164 164 H180" stroke="#365314" stroke-width="3" stroke-linecap="round"/>
    <rect x="153" y="124" width="12" height="46" rx="4" fill="#1a2e05" stroke="${INK}" stroke-width="2.5"/><path d="M153 134 l12 -4 M153 144 l12 -4 M153 154 l12 -4 M153 164 l12 -4" stroke="#84cc16" stroke-width="1.6" opacity=".7"/>
    ${lwSpark(206, 52, 4, '#bbf7d0')}${lwSpark(180, 228, 3.5, '#4ade80', -.6)}${lwSpark(214, 120, 3, '#fff', -1.1)}`
};
const LEGEND_WEAPONS = [
  // id, name, rarity, drawing, options, short blurb
  ['shadowfang', 'Shadowfang Dagger',   'uncommon',  'dagger',     {}, 'Quick and quiet.'],
  ['wildwood',   'Wildwood Bow',        'uncommon',  'bow',        { wood:'#8b5a2b', hi:'#c08a5a', string:'#fef3c7', leaf:'#22c55e', grip:'#3f2a14', gem:'#86efac' }, 'Carved from a talking tree.'],
  ['tidecrest',  'Tidecrest Staff',     'rare',      'staff',      { shaft:'#1e3a8a', hi:'#93c5fd', head:'#38bdf8', gem:'#e0f2fe' }, 'Calls the ocean waves.'],
  ['moonsilver', 'Moonsilver Crescent', 'rare',      'crescent',   {}, 'Shines like a new moon.'],
  ['ironclad',   'Ironclad Warhammer',  'rare',      'hammer',     {}, 'Heavy, loud, and very strong.'],
  ['crystalshard','Crystal Shard Sword','rare',      'crystal',    {}, 'Grown inside a crystal cave.'],
  ['sunfeather', 'Sunfeather Longbow',  'legendary', 'bow',        { wood:'#f59e0b', hi:'#fef3c7', string:'#fff', wing:'#fde68a', grip:'#92400e', gem:'#fb923c' }, 'Made with a phoenix feather.'],
  ['voidbloom',  'Voidbloom Axe',       'legendary', 'axe',        {}, 'Blooms with purple starlight.'],
  ['sunspire',   'Sunspire Greatsword', 'legendary', 'greatsword', {}, 'As bright as noon.'],
  ['frostwail',  'Frostwail Runeblade', 'legendary', 'runeblade',  {}, 'Glowing ice runes hum softly.'],
  ['stormcaller','Stormcaller Blade',   'legendary', 'stormblade', {}, 'Crackles with friendly lightning.'],
  ['emberfall',  'Emberfall Hammer',    'mythic',    'emberhammer',{}, 'Forged in a dragon volcano.'],
  ['twinmoon',   'Twin Moon Glaive',    'mythic',    'glaive',     {}, 'Glows green under two moons.'],
  ['starforged', 'Starforged Staff',    'mythic',    'staff',      { shaft:'#312e81', hi:'#c4b5fd', head:'#7c3aed', gem:'#f0abfc', ring:'#67e8f9', star:true }, 'Holds a tiny piece of a star.']
].map(([id, name, r, draw, o, blurb], i, all) => {
  const same = all.filter(w => w[2] === r), j = same.findIndex(w => w[0] === id), [a, b] = RARITY[r].lv;
  return { id, name, r, draw, o, blurb, ilvl: Math.round(a + (b - a) * (same.length > 1 ? j / (same.length - 1) : .5)),
    price: { uncommon:{ cur:'star', amt:40 }, rare:{ cur:'star', amt:90 }, legendary:{ cur:'cosmic', amt:20 }, mythic:{ cur:'cosmic', amt:40 } }[r] };
});
const LW_BY_ID = Object.fromEntries(LEGEND_WEAPONS.map(w => [w.id, w]));
const LW_DROP = { silver:{ p:.06, r:['uncommon','rare'] }, gold:{ p:.25, r:['rare','legendary','mythic'], w:[60,34,6] }, cosmic:{ p:.45, r:['rare','legendary','mythic'], w:[30,52,18] } };
function weaponState(){ K.weapons = K.weapons || {}; return K.weapons; }
function legendWeaponSVG(id){
  const W = LW_BY_ID[id]; if (!W) return '';
  return `<g class="lw lw-${W.r}">${LW_DRAW[W.draw](W.o)}</g>`;
}
function weaponIcon(id, size = 84){
  return `<svg viewBox="100 0 120 250" width="${size * .48}" height="${size}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${legendWeaponSVG(id)}</svg>`;
}
function rollWeaponDrop(chestType){
  const D = LW_DROP[chestType]; if (!D || Math.random() >= D.p) return null;
  let r = D.r[0];
  if (D.w){ let n = Math.random() * 100; for (let i = 0; i < D.r.length; i++){ n -= D.w[i]; if (n < 0){ r = D.r[i]; break; } } } else r = pick(D.r);
  const pool = LEGEND_WEAPONS.filter(w => w.r === r), fresh = pool.filter(w => !weaponState()[w.id]);
  return pick(fresh.length ? fresh : pool);
}
function giveWeapon(W){
  const first = !weaponState()[W.id];
  K.weapons[W.id] = (K.weapons[W.id] || 0) + 1;
  if (first && !K.wpn) K.wpn = W.id;           // first legendary weapon goes straight into the hero's hand
  if (!first) K.stars += 5;                    // duplicates turn into stars
  save(); return first;
}
/* ================= FLYING MOUNTS =================
   Original flying creatures the hero rides. Owned in K.mounts {id:count}, ridden mount in K.mount.
   Each drawer returns { back, front, seat:[x,y] } in a 320×260 box facing right:
   back is drawn first, then the hero sitting at the seat, then front (saddle) over the hero's legs. */
const mEye = (x, y, r, iris, glow) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*1.15}" fill="${glow ? iris : '#fff'}" stroke="${INK}" stroke-width="2.5" ${glow ? LW_GLOW : ''}/>` +
  (glow ? `<ellipse cx="${x+1}" cy="${y+1}" rx="${r*.35}" ry="${r*.7}" fill="#f0fdf4"/>` : `<ellipse cx="${x+1}" cy="${y+1}" rx="${r*.62}" ry="${r*.78}" fill="${iris}"/><ellipse cx="${x+1}" cy="${y+2}" rx="${r*.32}" ry="${r*.42}" fill="#140c18"/><circle cx="${x-r*.3}" cy="${y-r*.35}" r="${r*.3}" fill="#fff"/>`);
const mHappyEye = (x, y) => `<path d="M${x-7} ${y+2} q7 -9 14 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const mSaddle = (x, y, c, t) => `<path d="M${x-34} ${y+12} q34 -10 68 0 q4 3 0 6 l-8 26 q-26 8 -52 0 l-8 -26 q-4 -3 0 -6z" fill="${c}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M${x-28} ${y+40} q28 7 56 0" stroke="${t}" stroke-width="3" fill="none"/><path d="M${x-30} ${y+20} q30 -6 60 0" stroke="${t}" stroke-width="2.5" fill="none" opacity=".8"/>
  <path d="M${x+8} ${y+30} v16" stroke="#6b4a2e" stroke-width="2.5"/><path d="M${x+1} ${y+44} h15 q6 0 6 6 v3 h-24 q-2 -9 3 -9z" fill="#5b3a21" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
const mWing = (cls, ox, oy, d, fill, extra = '') => `<g class="${cls}" style="transform-origin:${ox}px ${oy}px"><path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>${extra}</g>`;
const MOUNT_DRAW = {
  dragon: o => {
    const wingD = 'M176 128 L132 30 Q150 44 164 22 Q176 52 198 34 Q214 62 236 56 Q222 100 204 132Z';
    const fingers = `<path d="M176 128 L164 26 M180 128 L198 38 M188 130 L234 58" stroke="${INK}" stroke-width="2" opacity=".55"/>`;
    const tufts = o.fluffy ? `<g fill="${o.belly}" stroke="${INK}" stroke-width="2">${[[214,124,12],[226,112,10],[232,98,9],[118,138,11],[104,146,9]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>` : '';
    const spikes = [[128,124],[146,116],[200,118]].map(([x,y]) => `<path d="M${x-7} ${y+4} L${x} ${y-12} L${x+7} ${y+4}Z" fill="${o.horn}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`).join('');
    const claws = (x, y) => `<path d="M${x} ${y} q-4 18 4 26 M${x+8} ${y} q0 18 8 24" stroke="${o.body}" stroke-width="11" stroke-linecap="round" fill="none"/>` +
      `<path d="M${x+2} ${y+26} l-6 6 M${x+8} ${y+28} l0 8 M${x+16} ${y+24} l6 6" stroke="${o.claw || '#f8fafc'}" stroke-width="3.5" stroke-linecap="round" ${o.claw ? LW_GLOW : ''}/>`;
    return { seat:[150, 118],
      back: `<g transform="translate(-26 6) rotate(-8 186 128)">` + mWing('mw2', 186, 128, wingD, o.wing2, fingers) + `</g>` +
        `<path d="M112 146 Q60 176 22 124 Q66 158 112 132Z" fill="${o.body}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M24 126 l-18 -16 l4 24z" fill="${o.horn}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        ${claws(116, 166)}
        <ellipse cx="160" cy="146" rx="62" ry="36" fill="${o.body}" stroke="${INK}" stroke-width="3"/><ellipse cx="166" cy="160" rx="44" ry="17" fill="${o.belly}"/>
        <path d="M120 132 q30 -18 70 -10" stroke="#fff" stroke-width="4" opacity=".25" fill="none" stroke-linecap="round"/>${spikes}
        <path d="M200 132 Q226 112 230 84 L258 90 Q248 128 216 158Z" fill="${o.body}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        ${claws(196, 168)}
        <path d="M236 64 l-14 -24 l22 14z M252 60 l-2 -26 l14 20z" fill="${o.horn}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
        <ellipse cx="248" cy="80" rx="27" ry="21" fill="${o.body}" stroke="${INK}" stroke-width="3"/><ellipse cx="272" cy="88" rx="17" ry="12" fill="${o.body}" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="272" cy="92" rx="12" ry="6" fill="${o.belly}"/><circle cx="282" cy="84" r="2.2" fill="${INK}"/><path d="M262 96 q8 6 18 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        ${o.fluffy ? mHappyEye(250, 76) : mEye(251, 75, 8, o.eye, o.glowEye)}<ellipse cx="236" cy="88" rx="6" ry="3.5" fill="#f9a8d4" opacity=".55"/>${tufts}
        ${mWing('mw', 186, 128, wingD, o.wing, fingers)}`,
      front: mSaddle(150, 120, o.saddle, o.trim) };
  },
  bird: o => {
    const wingD = 'M178 124 Q150 34 92 16 Q118 44 108 54 Q86 48 74 56 Q104 74 98 84 Q82 86 76 96 Q124 116 150 136Z';
    const feathers = `<path d="M150 128 Q124 96 100 84 M162 122 Q136 72 108 54 M172 122 Q160 64 122 32" stroke="${o.line}" stroke-width="2.4" fill="none" opacity=".8"/>` +
      (o.pattern ? `<path d="M128 70 l10 -6 l6 12 l-10 6z M114 86 l10 -4 l4 10 l-10 4z" fill="${o.pattern}" stroke="${INK}" stroke-width="1.5"/>` : '');
    const tail = `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round">${[[-18,0],[0,1],[18,2]].map(([a,i]) => `<path transform="rotate(${a} 116 150)" d="M118 146 Q72 140 30 152 Q72 164 118 158Z" fill="${i === 1 ? o.wing : o.wing2}"/>`).join('')}</g>`;
    const crest = o.fire ? flameShape(236, 74, 1.3, '#f97316', '#fde047') + flameShape(222, 80, 1, '#ef4444', '#fdba74') + flameShape(248, 78, .9, '#f59e0b', '#fff7ed')
      : `<path d="M230 78 q-6 -22 6 -30 q0 14 8 22 q2 -16 14 -20 q-6 14 -4 26z" fill="${o.crest}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
    const trail = o.fire ? `<g class="hero-spark">${flameShape(40, 170, 1.4, '#f97316', '#fde047')}${flameShape(70, 182, 1.1, '#ec4899', '#fdba74')}</g><g class="hero-spark" style="animation-delay:-.7s">${flameShape(18, 150, 1, '#f43f5e', '#fde047')}</g>` : '';
    const lines = o.circuit ? `<path d="M130 140 h24 l8 8 h22 M150 162 h30 l6 -6" stroke="${o.circuit}" stroke-width="2.5" fill="none" ${LW_GLOW}/>` : '';
    return { seat:[158, 114],
      back: trail + `<g transform="translate(-22 4) rotate(-10 178 126)">` + mWing('mw2', 178, 126, wingD, o.wing2) + `</g>` + tail +
        `<path d="M150 180 l-4 22 M180 180 l4 22" stroke="${o.leg}" stroke-width="7" stroke-linecap="round"/><path d="M138 206 l8 -4 l8 4 M176 206 l8 -4 l8 4" stroke="${o.claw || INK}" stroke-width="4" stroke-linecap="round" fill="none"/>
        <ellipse cx="166" cy="146" rx="58" ry="42" fill="${o.body}" stroke="${INK}" stroke-width="3"/><ellipse cx="180" cy="160" rx="38" ry="22" fill="${o.belly}"/>${lines}
        <path d="M126 128 q30 -22 74 -12" stroke="#fff" stroke-width="4" opacity=".25" fill="none" stroke-linecap="round"/>
        ${crest}<circle cx="236" cy="104" r="28" fill="${o.body}" stroke="${INK}" stroke-width="3"/><ellipse cx="240" cy="116" rx="17" ry="10" fill="${o.belly}"/>
        <path d="M258 98 L288 108 L258 118Z" fill="${o.beak}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M260 108 h22" stroke="${INK}" stroke-width="1.5"/>
        ${mEye(242, 98, 8.5, o.eye, o.glowEye)}<ellipse cx="226" cy="114" rx="6" ry="3.5" fill="#f9a8d4" opacity=".55"/>
        ${mWing('mw', 178, 126, wingD, o.wing, feathers)}`,
      front: mSaddle(156, 116, o.saddle, o.trim) };
  },
  bug: o => {
    const wingA = o.bee ? 'M170 120 Q150 30 104 34 Q86 70 150 132Z' : 'M172 122 Q160 20 92 18 Q60 40 86 84 Q60 104 92 128 Q128 140 160 132Z';
    const spots = o.bee ? '' : `<circle cx="108" cy="52" r="11" fill="${o.spot}" stroke="${INK}" stroke-width="2"/><circle cx="108" cy="52" r="5" fill="${o.wing2}"/><circle cx="100" cy="106" r="7" fill="${o.spot}" stroke="${INK}" stroke-width="2"/>`;
    const veins = `<path d="M168 124 Q140 70 104 36 M164 128 Q120 100 92 112" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".35"/>`;
    const stripes = o.bee ? `<path d="M96 132 q-6 18 0 36 M114 124 q-8 26 0 52 M132 122 q-8 28 0 56" stroke="${INK}" stroke-width="9" fill="none"/>` : `<path d="M100 136 q-4 14 0 28 M118 128 q-6 22 0 44" stroke="${o.belly}" stroke-width="5" fill="none" opacity=".7"/>`;
    const legs = [[160,172],[180,174],[200,170]].map(([x,y], i) => `<path d="M${x} ${y} q${-4 + i*4} 16 ${-8 + i*6} 30" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('');
    return { seat:[170, 116],
      back: `<g transform="translate(-14 2) rotate(-12 172 124)" opacity="${o.bee ? .75 : 1}">` + mWing('mw2', 172, 124, wingA, o.wing2, '') + `</g>` + legs +
        `<ellipse cx="114" cy="150" rx="48" ry="32" fill="${o.body}" stroke="${INK}" stroke-width="3"/>${stripes}${o.bee ? `<path d="M64 150 l-14 0" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` : ''}
        <circle cx="178" cy="142" r="34" fill="${o.body2}" stroke="${INK}" stroke-width="3"/><path d="M152 126 q20 -14 46 -4" stroke="#fff" stroke-width="4" opacity=".3" fill="none" stroke-linecap="round"/>
        <path d="M228 114 q8 -34 28 -40 M240 120 q18 -26 40 -24" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="256" cy="74" r="6" fill="${o.tip}" stroke="${INK}" stroke-width="2"/><circle cx="280" cy="96" r="6" fill="${o.tip}" stroke="${INK}" stroke-width="2"/>
        <circle cx="232" cy="136" r="27" fill="${o.body2}" stroke="${INK}" stroke-width="3"/>${mEye(238, 130, 10, o.eye, o.glowEye)}${mEye(222, 134, 7, o.eye, o.glowEye)}
        ${o.fangs ? `<path d="M240 158 l-3 10 l-4 -9 M250 156 l-2 9 l-4 -8" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` : `<path d="M236 152 q8 7 16 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`}
        ${mWing('mw', 172, 124, wingA, o.wing, (o.bee ? '' : spots) + veins).replace('<path', `<path opacity="${o.bee ? .8 : 1}"`)}`,
      front: mSaddle(168, 118, o.saddle, o.trim) };
  }
};
const MOUNTS = [
  // id, name, rarity, body, colors, blurb
  ['puffowl',   'Puffwing Owl',        'common',    'bird',   { body:'#d6c4a8', belly:'#f5ecd9', wing:'#b8996c', wing2:'#8f744e', line:'#7a5f3d', crest:'#b8996c', beak:'#f59e0b', leg:'#f59e0b', eye:'#7c4a24', saddle:'#ef4444', trim:'#fde68a' }, 'A sleepy, cozy first friend.'],
  ['buzzwing',  'Buzzwing Bee',        'uncommon',  'bug',    { bee:true, body:'#facc15', body2:'#3b2a35', wing:'#e0f2fe', wing2:'#bae6fd', eye:'#1e293b', tip:'#facc15', saddle:'#7c3aed', trim:'#fde68a' }, 'Fast, fuzzy, and always humming.'],
  ['sunroc',    'Sunfeather Roc',      'rare',      'bird',   { body:'#f97316', belly:'#fed7aa', wing:'#fde68a', wing2:'#f97316', line:'#9a3412', pattern:'#1f2937', crest:'#fde68a', beak:'#facc15', leg:'#1f2937', claw:'#facc15', eye:'#7c2d12', saddle:'#14532d', trim:'#fde68a' }, 'Its wings glow like a sunset.'],
  ['gloomwing', 'Gloomwing Moth',      'rare',      'bug',    { body:'#9d174d', body2:'#831843', wing:'#be185d', wing2:'#831843', spot:'#4ade80', eye:'#4ade80', glowEye:true, tip:'#4ade80', fangs:true, saddle:'#1f2937', trim:'#4ade80' }, 'Spooky looking, very gentle.'],
  ['stormcrow', 'Stormcrow',           'rare',      'bird',   { body:'#374151', belly:'#4b5563', wing:'#4b5563', wing2:'#1f2937', line:'#22d3ee', circuit:'#22d3ee', crest:'#1f2937', beak:'#111827', leg:'#111827', claw:'#22d3ee', eye:'#22d3ee', glowEye:true, saddle:'#0e7490', trim:'#67e8f9' }, 'Rides the thunder clouds.'],
  ['frostmane', 'Frostmane Dragon',    'legendary', 'dragon', { fluffy:true, body:'#e0f2fe', belly:'#ffffff', wing:'#93c5fd', wing2:'#60a5fa', horn:'#bfdbfe', eye:'#2563eb', saddle:'#2563eb', trim:'#e0f2fe' }, 'Big, soft, and loves hugs.'],
  ['shadowwing','Shadowwing Drake',    'legendary', 'dragon', { body:'#374151', belly:'#9ca3af', wing:'#1f2937', wing2:'#111827', horn:'#e5e7eb', eye:'#22d3ee', glowEye:true, saddle:'#7c3aed', trim:'#c4b5fd' }, 'Flies faster than the night wind.'],
  ['voidclaw',  'Voidclaw Nightmare',  'mythic',    'dragon', { body:'#4c1d95', belly:'#7c3aed', wing:'#5b21b6', wing2:'#2e1065', horn:'#c4b5fd', claw:'#d946ef', eye:'#f0abfc', glowEye:true, saddle:'#1e1b4b', trim:'#f0abfc' }, 'Its claws glow with purple magic.'],
  ['phoenix',   'Sunburst Phoenix',    'mythic',    'bird',   { fire:true, body:'#facc15', belly:'#fef9c3', wing:'#fb923c', wing2:'#ec4899', line:'#be123c', crest:'#f97316', beak:'#f59e0b', leg:'#b45309', claw:'#fde047', eye:'#9a3412', saddle:'#be123c', trim:'#fde047' }, 'Born from a falling star.']
].map(([id, name, r, body, o, blurb]) => ({ id, name, r, body, o, blurb,
  price: { common:null, uncommon:{ cur:'star', amt:60 }, rare:{ cur:'star', amt:150 }, legendary:{ cur:'cosmic', amt:30 }, mythic:{ cur:'cosmic', amt:60 } }[r] }));
const MOUNT_BY_ID = Object.fromEntries(MOUNTS.map(m => [m.id, m]));
const MOUNT_DROP = { gold:{ p:.05, r:['uncommon','rare'] }, cosmic:{ p:.15, r:['rare','legendary','mythic'], w:[45,42,13] } };
function mountState(){ K.mounts = K.mounts || {}; if (!K.mounts.puffowl) K.mounts.puffowl = 1; return K.mounts; }
function mountSVG(id, size = 200, withRider = true, flap = true){
  const M = MOUNT_BY_ID[id]; if (!M) return '';
  const D = MOUNT_DRAW[M.body](M.o), [sx, sy] = D.seat;
  let rider = '';
  if (withRider){ const hw = HERO_CLASSIC ? 90 : 112, hh = hw * 1.25, cid = 'rc' + (++heroSeq); // the hero's waist is ~68% down the hero picture
    // sitting: hide the hero's legs below the hips; the saddle and a boot in the stirrup go on top
    rider = `<clipPath id="${cid}"><rect x="0" y="0" width="320" height="${sy + hh*HERO_CLIP}"/></clipPath><g clip-path="url(#${cid})">` +
      heroSVG(hw).replace('<svg ', `<svg x="${sx - hw/2}" y="${sy - hh*HERO_WAIST}" `) + '</g>'; }
  return `<svg viewBox="0 0 320 260" width="${size}" height="${size*260/320}" xmlns="http://www.w3.org/2000/svg" class="mount-svg${flap ? ' flap' : ''} m-${M.r}">
    <defs><filter id="hglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g class="m-bob">${D.back}${rider}${D.front}</g></svg>`;
}
function rollMountDrop(chestType){
  const D = MOUNT_DROP[chestType]; if (!D || Math.random() >= D.p) return null;
  let r = D.r[0];
  if (D.w){ let n = Math.random() * 100; for (let i = 0; i < D.r.length; i++){ n -= D.w[i]; if (n < 0){ r = D.r[i]; break; } } } else r = pick(D.r);
  const pool = MOUNTS.filter(m => m.r === r), fresh = pool.filter(m => !mountState()[m.id]);
  return fresh.length ? pick(fresh) : null;   // only new mounts drop
}
function giveMount(M){ mountState()[M.id] = 1; K.mount = M.id; save(); }
/* the hero, riding when a mount is chosen (used in Hall of Heroes, Town Square, Stables) */
function riderNode(size){
  if (!K.mount || !MOUNT_BY_ID[K.mount] || !K.hero) return heroNode(size);
  return el('div',{class:'hero-wrap rider', html: mountSVG(K.mount, size * 1.45)});
}

function screenStables(){
  stopAll();
  const own = mountState(); save();
  const cur = K.mount && own[K.mount] ? K.mount : null;
  const stage = el('div',{class:'st-stage ph-' + dayPhase()}, el('div',{class:'st-clouds'}), cur ? el('div',{class:'st-ride', html: mountSVG(cur, 470)}) : el('div',{class:'st-walk'}, heroNode(170)));
  const flights = flightsLeft();
  const grid = el('div',{class:'st-grid'}, ...MOUNTS.map(M => {
    const have = !!own[M.id] || isDev(), on = cur === M.id, R = RARITY[M.r];
    const cost = M.price ? (M.price.cur === 'cosmic' ? '💫 ' : '⭐ ') + M.price.amt : 'Free';
    return el('button',{class:'st-card r-' + M.r + (have ? '' : ' locked') + (on ? ' on' : ''), style:`--rc:${R.c}`, onclick:()=>{
        if (have){ K.mount = on ? null : M.id; if (!own[M.id]) own[M.id] = 1; save(); beep('tap'); if (!on) say(M.name + '!'); screenStables(); return; }
        if (!M.price || !canPay(M.price)){ say(`${M.name}. Find it in a Cosmic Chest, or save up ${M.price.amt} ${M.price.cur === 'cosmic' ? 'Cosmic Power' : 'stars'}.`); beep('bad'); return; }
        if (!confirm(`Adopt ${M.name} for ${cost}?`)) return;
        pay(M.price); giveMount(M); confetti(M.r === 'mythic' ? 140 : 70); beep('level'); burst(R.n.toUpperCase() + '!'); say(`${M.name} is yours! Let's fly!`); screenStables(); }},
      el('div',{class:'st-pic' + (have ? '' : ' dim'), html: mountSVG(M.id, 150, false, false)}),
      el('div',{class:'lw-rar'}, R.n), el('div',{class:'ai-name'}, M.name),
      el('div',{class:'ai-sub'}, have ? (on ? '✓ Riding' : M.blurb) : '🔒 ' + cost));
  }));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🪽 Sky Stables'),
      el('span',{class:'pill cosmic-mix'}, '⭐ ' + balance() + '   💫 ' + cosmicBal())),
    stage,
    el('div',{class:'row center', style:'margin:10px 0 4px'},
      el('button',{class:'btn big' + (cur && flights ? '' : ' gray'), onclick:()=>{
        if (!cur){ say('Pick a mount to ride first!'); return; }
        if (!flights){ say('Read a story to earn another flight!'); beep('bad'); return; }
        screenFly(); }}, '☁️ Fly! ' + (isDev() ? '(∞)' : `(${flights} left today)`))),
    el('p',{class:'subtitle'}, 'Every story you read today earns a flight. Find new mounts in Cosmic Chests, or adopt one with stars or 💫.'),
    grid));
}

/* ----- Fly! — a short sky ride: steer to collect stars and fly through the word clouds ----- */
function flightsLeft(){
  if (isDev()) return 9;
  const today = todayStr(), read = K.sessions.filter(s => s.mode === 'normal' && s.date && todayStr(new Date(s.date)) === today).length;
  const used = K.flights && K.flights.day === today ? K.flights.used : 0;
  return Math.max(0, Math.min(3, read + 1) - used);   // one free flight a day, plus one per story (max 3)
}
function flyWords(){
  const L = levelDef(K.level), pool = new Set();
  ((L && L.stories) || []).forEach(s => s.text.split(/\s+/).forEach(w => { w = w.replace(/[^A-Za-z]/g, ''); if (/^[a-z]{3,7}$/.test(w)) pool.add(w); }));
  return [...pool];
}
function screenFly(){
  stopAll();
  const today = todayStr();
  K.flights = K.flights && K.flights.day === today ? K.flights : { day:today, used:0 }; K.flights.used++; save();
  const words = flyWords(), sky = el('div',{class:'fly-sky ph-' + dayPhase()}), hud = el('div',{class:'fly-hud'}), goal = el('div',{class:'fly-goal'});
  const rider = el('div',{class:'fly-rider', html: mountSVG(K.mount, 230)});
  for (let i = 0; i < 6; i++) sky.append(el('div',{class:'fly-cloud', style:`top:${8 + i*15}%;animation-duration:${9 + i*2.5}s;animation-delay:-${i*3}s;transform:scale(${.6 + (i%3)*.3})`}));
  sky.append(rider, hud, goal);
  let y = 45, ty = 45, score = 0, things = [], t0 = performance.now(), last = t0, nextStar = 0, nextWord = 1500, target = null, over = false, raf;
  const DUR = 45000;
  const aim = ev => { const r = sky.getBoundingClientRect(); ty = Math.max(6, Math.min(88, ((ev.clientY - r.top) / r.height) * 100)); };
  sky.addEventListener('pointerdown', aim); sky.addEventListener('pointermove', ev => { if (ev.buttons || ev.pointerType !== 'mouse') aim(ev); });
  const spawn = (kind, text, yy) => { const n = el('div',{class:'fly-thing ' + kind}, text); n.style.top = yy + '%'; sky.append(n); things.push({ n, kind, text, x:104, y:yy }); };
  const newWords = () => {
    if (words.length < 2) return;
    const a = pick(words); let b = pick(words); while (b === a) b = pick(words);
    target = a; goal.textContent = '☁️ Fly through: ' + a; goal.classList.remove('pop'); void goal.offsetWidth; goal.classList.add('pop');
    if (TK === 'son') say(a);
    const top = Math.random() < .5; spawn('word', a, top ? 22 : 66); spawn('word', b, top ? 66 : 22);
  };
  const tick = now => {
    if (over) return;
    const dt = Math.min(50, now - last); last = now; const el2 = now - t0;
    y += (ty - y) * Math.min(1, dt / 120); rider.style.top = y + '%';
    if (el2 > nextStar){ spawn('star', '⭐', 10 + Math.random() * 78); nextStar = el2 + 900 + Math.random() * 700; }
    if (el2 > nextWord){ newWords(); nextWord = el2 + 7000; }
    things = things.filter(T => {
      T.x -= dt * (T.kind === 'word' ? .016 : .024); T.n.style.left = T.x + '%';
      if (!T.hit && T.x < 30 && T.x > 14 && Math.abs(T.y - y) < (T.kind === 'word' ? 13 : 9)){
        T.hit = true;
        if (T.kind === 'star'){ score++; beep('star'); T.n.classList.add('got'); }
        else if (T.text === target){ score += 5; beep('level'); T.n.classList.add('got'); burst('+5'); target = null; goal.textContent = ''; things.filter(o => o.kind === 'word' && o !== T).forEach(o => o.n.classList.add('fade')); }
        else if (target){ beep('bad'); T.n.classList.add('bonk'); say('That says ' + T.text + '. Try the other one!'); }
      }
      if (T.x < -20){ T.n.remove(); return false; }
      return true;
    });
    hud.textContent = `⭐ ${score}   ⏱️ ${Math.ceil((DUR - el2) / 1000)}`;
    if (el2 >= DUR) return finish();
    raf = requestAnimationFrame(tick);
  };
  const finish = () => {
    over = true; cancelAnimationFrame(raf);
    const prize = Math.min(5, Math.floor(score / 6));
    if (prize){ K.stars += prize; save(); }
    sky.append(el('div',{class:'fly-end'}, el('h2',{}, '🌈 What a flight!'), el('p',{}, `You collected ${score} sky points` + (prize ? ` and earned ${prize} ⭐!` : '.')),
      el('div',{class:'row center'}, el('button',{class:'btn blue', onclick:screenStables}, '🪽 Stables'), el('button',{class:'btn', onclick:()=>screenHome()}, '🏠 Home'))));
    confetti(prize ? 60 : 20); beep('level');
  };
  show(el('div',{class:'screen fly-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>{ over = true; cancelAnimationFrame(raf); screenStables(); }},'← Land'), el('h1',{class:'title'}, '☁️ ' + MOUNT_BY_ID[K.mount].name)),
    el('p',{class:'subtitle'}, 'Touch the sky to steer. Grab stars and fly through the right word!'), sky));
  raf = requestAnimationFrame(tick);
}

const CHESTS = {
  wood:   { n:'Wooden Chest', body:'#b7793f', band:'#6b4a2e', glow:'#fde68a', odds:{ common:70, uncommon:25, rare:5 },                               stars:2,  cosmic:0, buy:{ cur:'star', amt:15 } },
  silver: { n:'Silver Chest', body:'#cbd5e1', band:'#64748b', glow:'#e0f2fe', odds:{ common:35, uncommon:40, rare:22, legendary:3 },             stars:4,  cosmic:0, buy:{ cur:'star', amt:40 } },
  gold:   { n:'Gold Chest',   body:'#facc15', band:'#b45309', glow:'#fef08a', odds:{ uncommon:30, rare:50, legendary:18, mythic:2 },             stars:8,  cosmic:1, buy:{ cur:'star', amt:100 } },
  cosmic: { n:'Cosmic Chest', body:'#7c3aed', band:'#312e81', glow:'#f0abfc', odds:{ rare:40, legendary:50, mythic:10 },                         stars:15, cosmic:3, buy:{ cur:'cosmic', amt:12 } }
};
const CHEST_ORDER = ['wood','silver','gold','cosmic'];
function chestSVG(type, size = 90){
  const C = CHESTS[type], ink = '#1f1235';
  return `<svg viewBox="0 0 120 100" width="${size}" height="${size*100/120}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="94" rx="46" ry="6" fill="#000" opacity=".2"/>
    <rect x="12" y="44" width="96" height="48" rx="8" fill="${C.body}" stroke="${ink}" stroke-width="4"/>
    <path d="M12 46 q0 -36 48 -36 q48 0 48 36z" fill="${C.body}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M18 40 q4 -22 42 -24" stroke="#fff" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
    <rect x="12" y="42" width="96" height="9" fill="${C.band}" stroke="${ink}" stroke-width="3"/>
    <rect x="28" y="12" width="10" height="80" fill="${C.band}" stroke="${ink}" stroke-width="3"/><rect x="82" y="12" width="10" height="80" fill="${C.band}" stroke="${ink}" stroke-width="3"/>
    <rect x="50" y="40" width="20" height="24" rx="4" fill="${C.glow}" stroke="${ink}" stroke-width="3"/><circle cx="60" cy="50" r="3.5" fill="${ink}"/><path d="M60 52 v6" stroke="${ink}" stroke-width="3"/>
    ${type === 'cosmic' ? '<circle cx="44" cy="74" r="3" fill="#fff"/><circle cx="76" cy="68" r="2" fill="#fff"/><circle cx="96" cy="80" r="2.5" fill="#f0abfc"/><circle cx="22" cy="62" r="2" fill="#67e8f9"/>' : ''}
    ${type === 'gold' ? '<path d="M100 20 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#fff" opacity=".9"/>' : ''}</svg>`;
}
function chestState(){ K.chests = Object.assign({ wood:0, silver:0, gold:0, cosmic:0 }, K.chests || {}); K.treasures = K.treasures || {}; return K.chests; }
const chestCount = () => { const c = chestState(); return CHEST_ORDER.reduce((t, k) => t + (c[k] || 0), 0); };
function awardChest(type, why){
  chestState()[type]++; save();
  const t = el('div',{class:'chest-toast', onclick:()=>{ t.remove(); screenChests(); }}, el('div',{class:'ct-chest', html: chestSVG(type, 54)}),
    el('div',{}, el('b',{}, `You got a ${CHESTS[type].n}!`), el('small',{}, (why ? why + ' · ' : '') + 'Tap to open')));
  t.style.top = (16 + document.querySelectorAll('.chest-toast, .cosmic-toast').length * 78) + 'px';
  document.body.append(t); setTimeout(() => t.classList.add('out'), 3600); setTimeout(() => t.remove(), 4200);
  beep('ok');
}
function rollRarity(type){
  const odds = CHESTS[type].odds; let n = Math.random() * 100;
  for (const r of RARITY_ORDER){ if (!odds[r]) continue; n -= odds[r]; if (n < 0) return r; }
  return Object.keys(odds).pop();
}
function rollTreasure(type){
  const r = rollRarity(type), pool = TREASURES.filter(t => t.r === r);
  const owned = chestState() && K.treasures, fresh = pool.filter(t => !owned[t.id]);
  return pick(fresh.length && Math.random() < .7 ? fresh : pool); // new things are more likely
}
function openChest(type, again){
  const C = chestState();
  if (!isDev()){ if (!C[type]) return; C[type]--; }
  const t = rollTreasure(type), R = RARITY[t.r], first = !K.treasures[t.id];
  K.treasures[t.id] = (K.treasures[t.id] || 0) + 1;
  K.stars += CHESTS[type].stars; save();
  if (CHESTS[type].cosmic) addCosmic(CHESTS[type].cosmic, CHESTS[type].n);
  const lw = rollWeaponDrop(type), lwNew = lw ? giveWeapon(lw) : false;
  const mt = rollMountDrop(type); if (mt) giveMount(mt);
  const big = t.r === 'legendary' || t.r === 'mythic';
  const chest = el('div',{class:'oc-chest', html: chestSVG(type, 180)});
  const reveal = el('div',{class:'oc-reveal hidden', style:`--rc:${R.c}`},
    el('div',{class:'oc-rar'}, R.n.toUpperCase()),
    el('div',{class:'oc-item'}, t.e),
    el('h2',{class:'oc-name'}, t.name),
    el('div',{class:'oc-meta'}, el('span',{class:'oc-ilvl'}, 'Item Lv ' + t.ilvl), first ? el('span',{class:'oc-new'}, 'NEW!') : el('span',{class:'oc-dup'}, '×' + K.treasures[t.id])),
    el('p',{class:'oc-bonus'}, `+${CHESTS[type].stars} ⭐` + (CHESTS[type].cosmic ? `  +${CHESTS[type].cosmic} 💫` : '')),
    el('p',{class:'oc-hint'}, 'Place it in My World › 🎁 Treasures'),
    lw ? el('div',{class:'oc-weapon r-' + lw.r, style:`--rc:${RARITY[lw.r].c}`},
      el('div',{class:'ocw-pic', html: weaponIcon(lw.id, 120)}),
      el('div',{}, el('div',{class:'oc-rar'}, '⚔️ ' + RARITY[lw.r].n.toUpperCase() + ' WEAPON!'), el('h3',{}, lw.name), el('small',{}, lwNew ? 'NEW! It is in your hand now. See it in the Armory.' : 'You already have it, so you get +5 ⭐'))) : null,
    mt ? el('div',{class:'oc-weapon r-' + mt.r, style:`--rc:${RARITY[mt.r].c}`},
      el('div',{class:'ocw-pic', html: mountSVG(mt.id, 150, false, false)}),
      el('div',{}, el('div',{class:'oc-rar'}, '🪽 NEW FLYING MOUNT!'), el('h3',{}, mt.name), el('small',{}, 'You are riding it now. Visit the Sky Stables to fly!'))) : null,
    el('div',{class:'row center'},
      (isDev() || C[type] > 0) ? el('button',{class:'btn', onclick:()=>{ ov.remove(); openChest(type, true); }}, `Open another (${isDev() ? '∞' : C[type]})`) : null,
      el('button',{class:'btn blue', onclick:()=>{ ov.remove(); screenChests(); }}, 'Done ✨')));
  const ov = el('div',{class:'oc-overlay' + (big ? ' big' : '') + ' r-' + t.r, style:`--rc:${R.c}`}, el('div',{class:'oc-rays'}), chest, reveal);
  document.body.append(ov);
  beep('tap');
  setTimeout(() => { chest.classList.add('pop'); beep('star'); }, 900);
  setTimeout(() => { chest.remove(); reveal.classList.remove('hidden'); confetti(big ? 140 : t.r === 'rare' ? 60 : 25); if (big){ beep('level'); burst(t.r === 'mythic' ? 'MYTHIC!' : 'LEGENDARY!'); } say(`${R.n}! ${t.name}!` + (lw ? ` And a weapon! ${lw.name}!` : '') + (mt ? ` And a flying mount! ${mt.name}!` : '')); if ((lw || mt) && !big) confetti(80); }, 1300);
}
function screenChests(){
  stopAll();
  const C = chestState();
  const bal = el('span',{class:'pill cosmic-mix'}, '⭐ ' + balance() + '   💫 ' + cosmicBal());
  const chestCard = type => { const X = CHESTS[type], n = isDev() ? '∞' : C[type];
    return el('div',{class:'chest-card ch-' + type},
      el('div',{class:'chest-pic' + (C[type] || isDev() ? ' ready' : ''), html: chestSVG(type, 110)}),
      el('h3',{}, X.n), el('div',{class:'chest-n'}, `You have ${n}`),
      el('div',{class:'chest-odds'}, ...RARITY_ORDER.filter(r => X.odds[r]).map(r => el('span',{style:`--rc:${RARITY[r].c}`}, `${RARITY[r].n} ${X.odds[r]}%`)), LW_DROP[type] ? el('span',{class:'chest-wpn'}, `⚔️ Weapon ${Math.round(LW_DROP[type].p * 100)}%`) : null, MOUNT_DROP[type] ? el('span',{class:'chest-wpn'}, `🪽 Mount ${Math.round(MOUNT_DROP[type].p * 100)}%`) : null),
      el('button',{class:'btn' + (C[type] || isDev() ? '' : ' gray'), onclick:()=>{ if (!C[type] && !isDev()){ say('Read great stories and do Town Hall quests to earn chests!'); return; } openChest(type); }}, '🔓 Open'),
      el('button',{class:'btn small ghost chest-buy', onclick:()=>{ if (!canPay(X.buy)){ say(X.buy.cur === 'cosmic' ? 'You need more Cosmic Power!' : 'Keep reading to earn more stars!'); beep('bad'); return; } pay(X.buy); C[type]++; save(); beep('star'); screenChests(); }}, 'Buy ' + costLabel(X.buy))); };
  const found = TREASURES.filter(t => K.treasures[t.id]).length;
  const coll = RARITY_ORDER.map(r => { const list = TREASURES.filter(t => t.r === r);
    return el('div',{class:'tr-group', style:`--rc:${RARITY[r].c}`},
      el('h3',{}, el('span',{class:'tr-dot'}), `${RARITY[r].n}`, el('small',{}, ` · Item Lv ${RARITY[r].lv[0]}–${RARITY[r].lv[1]} · ${list.filter(t => K.treasures[t.id]).length}/${list.length}`)),
      el('div',{class:'tr-grid'}, ...list.map(t => { const have = K.treasures[t.id] || 0;
        return el('div',{class:'tr-tile' + (have ? '' : ' off') + ' r-' + r, title: t.name},
          el('div',{class:'tr-e'}, have ? t.e : '❔'), el('div',{class:'tr-name'}, have ? t.name : '???'),
          el('div',{class:'tr-lv'}, have ? `Lv ${t.ilvl}` + (have > 1 ? ` · ×${have}` : '') : RARITY[r].n)); }))); });
  show(el('div',{class:'screen chest-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🎁 Treasure Chests'), bal),
    el('p',{class:'subtitle'}, 'Earn chests by reading great stories, beating bosses, leveling up and doing Town Hall quests.'),
    el('div',{class:'chest-row'}, ...CHEST_ORDER.map(chestCard)),
    el('div',{class:'card tr-card'}, el('h2',{style:'margin-top:0'}, `🏆 My Treasures · ${found}/${TREASURES.length}`), ...coll)));
}

/* ================= TOWN HALL QUESTS =================
   Four quest-givers inside the Town Hall. Each quest takes a minute or two and pays a chest once a day;
   finishing all four in one day pays a Gold Chest. They can be replayed any time for practice. */
const QUEST_NPCS = [
  { id:'spell',    e:'🦊', name:'Scribe Pip',       title:'Spelling Sprint',  desc:'Spell 3 words with letter tiles.',     chest:'silver' },
  { id:'detect',   e:'🐢', name:'Professor Shell',  title:'Word Detective',   desc:'Hear a word, find it fast!',             chest:'wood' },
  { id:'sentence', e:'🐻', name:'Captain Bruno',    title:'Sentence Builder', desc:'Put the words in the right order.',      chest:'silver' },
  { id:'aloud',    e:'🧚', name:'Storyteller Wren', title:'Read Aloud',       desc:'Read a sentence out loud to Wren.',      chest:'wood' }
];
const QUEST_FALLBACK = {
  son: ['The cat sat on the mat.','I can see a big red bus.','The dog ran to the park.','We like to play in the sun.','My hat is on the bed.','Look at the fish in the pond.'],
  daughter: ['The dragon spread its wings and flew over the castle.','Maya found a secret map inside an old book.','The friends worked together to solve the mystery.','A bright star glowed above the quiet village.','She whispered the magic word and the door opened.']
};
function questState(){ const t = todayStr(); if (!K.quests || K.quests.date !== t) K.quests = { date:t, done:[], grand:false }; return K.quests; }
function questSentences(n){
  const [lo, hi] = TK === 'son' ? [3, 8] : [5, 12];
  let pool = [];
  for (const lv of [K.level, K.level - 1, K.level + 1]){
    const L = T.levels[lv - 1]; if (!L || !L.stories) continue;
    L.stories.forEach(s => (s.text || '').replace(/[“”"]/g, '').replace(/([.!?])\s+/g, '$1\n').split('\n').forEach(x => { x = x.trim(); const w = x.split(/\s+/).length; if (w >= lo && w <= hi && /^[A-Z][A-Za-z ,'’]+[.!?]$/.test(x)) pool.push(x); }));
    if (pool.length >= 8) break;
  }
  if (pool.length < n) pool = pool.concat(QUEST_FALLBACK[TK]);
  return shuffle([...new Set(pool)]).slice(0, n);
}
function questWords(n){
  let w = spellWords(n + 4, 3);
  if (w.length < n) w = w.concat(shuffle(TK === 'son' ? ['cat','dog','sun','hat','big','run','fish','frog','jump','play'] : ['dragon','castle','friend','secret','bright','quiet','magic','forest','river','wonder']));
  return [...new Set(w)];
}
function screenTownHall(){
  stopAll();
  const Q = questState();
  const hero = el('div',{class:'th-hero'}, heroNode(120));
  let heroX = 8;
  hero.style.left = heroX + '%';
  const go = (npc, x) => { beep('tap'); hero.classList.toggle('flip', x < heroX); hero.classList.add('walking'); hero.style.left = x + '%'; const d = Math.abs(x - heroX); heroX = x; setTimeout(() => { hero.classList.remove('walking'); startQuest(npc); }, 300 + d * 18); };
  const npcs = QUEST_NPCS.map((q, i) => { const x = 20 + i * 19, done = Q.done.includes(q.id);
    const n = el('button',{class:'th-npc' + (done ? ' done' : ''), style:`left:${x}%`, onclick:()=>go(q, x - 6)},
      el('div',{class:'th-bubble'}, done ? '✅' : '❗'),
      el('div',{class:'th-e'}, q.e), el('div',{class:'th-name'}, q.name),
      el('div',{class:'th-quest'}, q.title), el('div',{class:'th-reward', html: chestSVG(q.chest, 30)}));
    return n; });
  const doneN = Q.done.length;
  show(el('div',{class:'screen th-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenTownSquare()},'← Town'), el('h1',{class:'title'},'🏛️ Town Hall'),
      el('button',{class:'btn small blue', onclick:screenQuestMap},'🗺️ Quest Map')),
    el('div',{class:'th-hall'},
      el('div',{class:'th-wall'}, ...[0,1,2,3,4].map(i => el('div',{class:'th-arch'})), el('div',{class:'th-banner b1'}), el('div',{class:'th-banner b2'}),
        el('div',{class:'th-board'}, el('b',{}, '📜 Today\'s Quests'), el('div',{class:'th-prog'}, ...QUEST_NPCS.map(q => el('span',{class: Q.done.includes(q.id) ? 'on' : ''}, Q.done.includes(q.id) ? '✓' : q.e))),
          el('small',{}, Q.grand ? '🏆 Grand Quest done! Gold Chest won.' : `Finish all 4 today for a Gold Chest! (${doneN}/4)`))),
      el('div',{class:'th-floor'}), ...npcs, hero),
    el('p',{class:'subtitle', style:'text-align:center'}, 'Tap someone to start a quest. Each quest gives a chest once a day, and you can practice again any time.')));
  if (!K.thHello){ K.thHello = 1; save(); say('Welcome to the Town Hall! Tap a friend to start a quest.'); }
}
function questFrame(q, body, sub){
  return el('div',{class:'screen quest-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); screenTownHall(); }},'← Town Hall'), el('h1',{class:'title'}, q.e + ' ' + q.title), el('div')),
    el('div',{class:'card quest-card'}, el('div',{class:'quest-npc'}, el('span',{class:'qn-e'}, q.e), el('div',{}, el('b',{}, q.name), sub ? el('div',{class:'qn-say'}, sub) : null)), body));
}
async function questComplete(q){
  const Q = questState(), first = !Q.done.includes(q.id);
  confetti(80); beep('level'); burst('QUEST DONE!');
  if (first){ Q.done.push(q.id); K.stars += 2; save(); }
  say(first ? `Quest complete! You earned a ${CHESTS[q.chest].n}!` : 'Great practice!');
  await modal(el('div',{}, el('div',{class:'big-e'}, q.e), el('h2',{}, 'Quest complete!'),
    first ? el('div',{html: chestSVG(q.chest, 120)}) : null,
    el('p',{}, first ? `${q.name} gives you a ${CHESTS[q.chest].n} and +2 ⭐!` : 'You already got today\'s chest from this quest. Come back tomorrow for another!')), [['Yay! ▶','',1]]);
  if (first) awardChest(q.chest, q.title);
  if (first && Q.done.length >= QUEST_NPCS.length && !Q.grand){
    Q.grand = true; save();
    confetti(140); say('You finished every quest today! Here is a Gold Chest!');
    await modal(el('div',{}, el('div',{class:'big-e'},'🏆'), el('h2',{},'Grand Quest complete!'), el('div',{html: chestSVG('gold', 130)}), el('p',{},'All 4 quests done today. A Gold Chest for you!')), [['Amazing! ▶','',1]]);
    awardChest('gold', 'Grand Quest');
  }
  screenTownHall();
}
function startQuest(q){
  ({ spell:questSpell, detect:questDetect, sentence:questSentence, aloud:questAloud })[q.id](q);
}
// 🦊 Spelling Sprint: hear the word, tap letter tiles in order (wrong taps just wiggle)
function questSpell(q){
  const words = questWords(3).slice(0, 3); let i = 0;
  const area = el('div',{class:'qs-area'});
  const round = () => {
    const w = words[i], got = [];
    const slots = el('div',{class:'qs-slots'}, ...[...w].map(() => el('span',{class:'qs-slot'})));
    const decoys = shuffle('abcdefghijklmnoprstuw'.split('').filter(c => !w.includes(c))).slice(0, 2);
    const tiles = el('div',{class:'qs-tiles'}, ...shuffle([...w, ...decoys]).map(ch => { const b = el('button',{class:'qs-tile', onclick:()=>{
      if (ch === w[got.length]){ slots.children[got.length].textContent = ch; slots.children[got.length].classList.add('on'); got.push(ch); b.disabled = true; b.classList.add('used'); beep('tap');
        if (got.length === w.length){ beep('star'); say(w + '! Great spelling!'); setTimeout(() => { i++; i < words.length ? round() : questComplete(q); }, 1100); } }
      else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); beep('bad'); } }}, ch); return b; }));
    area.replaceChildren(el('div',{class:'q-step'}, `Word ${i + 1} of ${words.length}`), el('button',{class:'btn blue', onclick:()=>say(w)}, '🔊 Hear the word'), slots, tiles);
    say(`Spell: ${w}`);
  };
  show(questFrame(q, area, 'Listen to the word, then tap the letters in order!')); round();
}
// 🐢 Word Detective: hear a word, pick it from three
function questDetect(q){
  const pool = questWords(8), targets = pool.slice(0, 5); let i = 0, right = 0;
  const area = el('div',{class:'qs-area'});
  const round = () => {
    const w = targets[i], others = shuffle(pool.filter(x => x !== w)).sort((a, b) => (b[0] === w[0]) - (a[0] === w[0]) || Math.abs(a.length - w.length) - Math.abs(b.length - w.length)).slice(0, 2);
    let miss = false;
    const opts = el('div',{class:'qd-opts'}, ...shuffle([w, ...others]).map(o => el('button',{class:'qd-opt', onclick:e => {
      if (o === w){ e.target.classList.add('right'); beep('star'); if (!miss) right++; setTimeout(() => { i++; i < targets.length ? round() : questComplete(q); }, 700); }
      else { miss = true; e.target.classList.add('wrong'); e.target.disabled = true; beep('bad'); say(o + '. Try again!'); } }}, o)));
    area.replaceChildren(el('div',{class:'q-step'}, `Clue ${i + 1} of ${targets.length}`), el('button',{class:'btn blue', onclick:()=>say(w)}, '🔊 Hear it again'), opts);
    say(`Find the word: ${w}`);
  };
  show(questFrame(q, area, 'I will say a word. Can you find it?')); round();
}
// 🐻 Sentence Builder: tap words in order to build the sentence
function questSentence(q){
  const sents = questSentences(2); let i = 0;
  const area = el('div',{class:'qs-area'});
  const round = () => {
    const s = sents[i], words = s.split(/\s+/), built = [];
    const line = el('div',{class:'qb-line'});
    const bank = el('div',{class:'qb-bank'}, ...shuffle(words.map((w, k) => [w, k])).map(([w]) => { const b = el('button',{class:'qb-word', onclick:()=>{
      if (w === words[built.length]){ built.push(w); line.append(el('span',{class:'qb-placed'}, w)); b.remove(); beep('tap');
        if (built.length === words.length){ beep('star'); say(s); setTimeout(() => { i++; i < sents.length ? round() : questComplete(q); }, 1800); } }
      else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); beep('bad'); } }}, w); return b; }));
    area.replaceChildren(el('div',{class:'q-step'}, `Sentence ${i + 1} of ${sents.length}`), el('button',{class:'btn blue', onclick:()=>say(s)}, '🔊 Hear the sentence'), line, bank);
    say(i === 0 ? 'Put the words in order to make a sentence!' : 'One more!');
  };
  show(questFrame(q, area, TK === 'son' ? 'Tap the words in order. Start with the big letter!' : 'Tap the words in the right order to build the sentence.')); round();
}
// 🧚 Read Aloud: read a sentence; the microphone checks the words (or a grown-up taps ✓)
function questAloud(q){
  const sents = questSentences(2); let i = 0, rec = null;
  const area = el('div',{class:'qs-area'});
  const round = () => {
    const s = sents[i], words = s.split(/\s+/), keys = words.map(norm), hit = keys.map(() => false);
    const line = el('div',{class:'qa-line'}, ...words.map(w => el('span',{class:'qa-w'}, w)));
    const status = el('div',{class:'qa-status'}, useManual() ? 'Read it to a grown-up!' : 'Tap 🎤 and read the sentence.');
    const done = () => { try { rec && rec.stop(); } catch(e){} beep('star'); say('Beautiful reading!'); setTimeout(() => { i++; i < sents.length ? round() : questComplete(q); }, 1100); };
    const mark = heard => { const toks = tokenizeHeard(heard).map(t => t.n || t.w || t); let p = 0;
      toks.forEach(h => { for (let k = p; k < keys.length && k < p + 3; k++) if (!hit[k] && wordMatch(keys[k], norm(String(h)))){ hit[k] = true; line.children[k].classList.add('ok'); p = k + 1; break; } });
      const n = hit.filter(Boolean).length; status.textContent = `${n} of ${keys.length} words`; if (n >= Math.ceil(keys.length * .8)) done(); };
    const mic = el('button',{class:'mic', onclick:()=>{
      if (mic.classList.contains('on')){ try { rec.stop(); } catch(e){} return; }
      try { rec = new SR(); rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true; } catch(e){ status.textContent = 'The microphone is not working. A grown-up can tap ✓.'; return; }
      rec.onresult = ev => { let t = ''; for (let k = 0; k < ev.results.length; k++) t += ' ' + ev.results[k][0].transcript; mark(t); };
      rec.onend = () => { mic.classList.remove('on'); mic.textContent = '🎤'; };
      rec.onerror = () => { status.textContent = 'I could not hear you. Try again, or a grown-up can tap ✓.'; };
      rec.start(); mic.classList.add('on'); mic.textContent = '⏹'; status.textContent = 'Listening…'; }}, '🎤');
    area.replaceChildren(el('div',{class:'q-step'}, `Sentence ${i + 1} of ${sents.length}`), line,
      el('div',{class:'row center'}, useManual() ? null : mic, el('button',{class:'btn blue', onclick:()=>say(s)}, '🔊 Hear it'), el('button',{class:'btn small gray', onclick:done}, '✓ Grown-up heard it')), status);
  };
  show(questFrame(q, area, 'Read this sentence out loud to me!')); round();
}

/* ---------- zoom: ＋/－ buttons, "see all", full screen, pinch and ctrl+wheel ----------
   The content keeps its own pixel size; a sizer div takes the scaled size so the view scrolls normally. */
function zoomable({ view, content, W, H, start = 1, max = 2.5, fit = 'contain', onZoom }){
  const sizer = el('div',{class:'zoom-sizer'}, content);
  view.append(sizer);
  content.style.transformOrigin = '0 0';
  let z = 1, frame = null;
  const fitZ = () => fit === 'width' ? view.clientWidth / W : Math.min(view.clientWidth / W, view.clientHeight / H);
  const apply = () => { content.style.transform = `scale(${z})`; sizer.style.width = W*z + 'px'; sizer.style.height = H*z + 'px'; view.style.maxHeight = frame && frame.classList.contains('zoom-full') ? '' : Math.ceil(H*z) + 10 + 'px'; };
  const set = (nz, fx, fy) => {
    const lo = Math.min(.35, fitZ() || .35);
    nz = Math.max(lo, Math.min(max, nz));
    if (fx == null){ fx = view.clientWidth / 2; fy = view.clientHeight / 2; }
    const wx = (view.scrollLeft + fx) / z, wy = (view.scrollTop + fy) / z;
    z = nz; apply();
    view.scrollLeft = wx*z - fx; view.scrollTop = wy*z - fy;
    onZoom && onZoom(z);
  };
  z = start; apply();
  // pinch with two fingers
  let pinch = null;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  view.addEventListener('touchstart', e => { if (e.touches.length === 2){ const r = view.getBoundingClientRect(); pinch = { d:dist(e.touches), z, x:(e.touches[0].clientX + e.touches[1].clientX)/2 - r.left, y:(e.touches[0].clientY + e.touches[1].clientY)/2 - r.top }; } }, { passive:true });
  view.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2){ e.preventDefault(); set(pinch.z * dist(e.touches) / pinch.d, pinch.x, pinch.y); } }, { passive:false });
  view.addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; });
  view.addEventListener('gesturestart', e => e.preventDefault());
  view.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = view.getBoundingClientRect(); set(z * Math.exp(-e.deltaY / 250), e.clientX - r.left, e.clientY - r.top); }, { passive:false });
  frame = el('div',{class:'zoom-frame'});
  const fullBtn = el('button',{class:'zoom-btn', title:'Big screen', onclick:()=>{ beep('tap'); const on = !frame.classList.contains('zoom-full'); frame.classList.toggle('zoom-full', on); document.body.classList.toggle('zoom-lock', on); fullBtn.textContent = on ? '✕' : '⛶'; setTimeout(() => set(on ? Math.max(z, view.clientWidth / W, view.clientHeight / H) : z), 30); }}, '⛶');
  const controls = el('div',{class:'zoom-ctl'},
    el('button',{class:'zoom-btn', title:'Zoom in', onclick:()=>{ beep('tap'); set(z * 1.3); }}, '＋'),
    el('button',{class:'zoom-btn', title:'Zoom out', onclick:()=>{ beep('tap'); set(z / 1.3); }}, '－'),
    el('button',{class:'zoom-btn wide', title:'See everything', onclick:()=>{ beep('tap'); set(fitZ(), 0, 0); view.scrollTo(0, 0); }}, '🔭 All'),
    fullBtn);
  frame.append(controls, view);
  return { frame, get z(){ return z; }, set, fit:() => set(fitZ(), 0, 0), exitFull:() => { frame.classList.remove('zoom-full'); document.body.classList.remove('zoom-lock'); } };
}

/* ================= BIG WORLD =================
   Families who choose "Big World" share a tiny public record per hero (first name, look, spot in town, last wave)
   in world/{uid}_{playerId}. Nothing else is shared: no progress, no email, no messages. "Just our family" removes it. */
const WORLD = { peers:{}, sub:null };
const worldOn = () => familyMode() && !!(FB.user && FB.mod && FB.mod.world) && (DB.worldMode || 'world') === 'world';
const myWid = k => FB.user ? 'w:' + FB.user.uid + '_' + (k || kid) : null;
const isWorldId = k => typeof k === 'string' && k.startsWith('w:');
function setWorldMode(m){
  const was = DB.worldMode || 'world'; DB.worldMode = m; save(); try { cloudPush('settings'); } catch(e){}
  if (m === 'solo'){ worldStop(); if (FB.user && FB.mod && FB.mod.world) playerIds(true).forEach(id => FB.mod.world.remove(FB.user.uid + '_' + id).catch(()=>{})); }
  else if (was !== m) worldListen();
}
// only plain values (colors, ids, numbers) from other families are ever drawn
const W_OK = /^[#\w .,%-]{0,40}$/;
function worldClean(v, depth = 0){
  if (depth > 4) return null;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (typeof v === 'boolean' || v === null) return v;
  if (typeof v === 'string') return W_OK.test(v) ? v : null;
  if (Array.isArray(v)) return v.slice(0, 30).map(x => worldClean(x, depth + 1));
  if (typeof v === 'object'){ const o = {}; Object.keys(v).slice(0, 40).forEach(k => { if (/^\w{1,24}$/.test(k)){ const c = worldClean(v[k], depth + 1); if (c !== null) o[k] = c; } }); return o; }
  return null;
}
function worldPublish(rec){
  if (!worldOn() || isDev() || !DB.players[kid] || DB.players[kid].removed) return;
  const pub = { x:rec.x, y:rec.y, here:!!rec.here, look:rec.look, emote:rec.emote || null, emoteTs:rec.emoteTs || 0, emoteTo:rec.emoteTo || 'all', level:K.level, track:trackOf(kid) };
  FB.mod.world.set(FB.user.uid + '_' + kid, { uid:FB.user.uid, pid:kid, name:String(kidName()).slice(0, 20), json:JSON.stringify(pub).slice(0, 6000), ts:Date.now() }).catch(()=>{});
}
function worldListen(){
  if (WORLD.sub || !worldOn()) return;
  try {
    WORLD.sub = FB.mod.world.listen(Date.now() - 14 * 86400000, docs => {
      const seen = {};
      docs.forEach(d => {
        if (!d || d.uid === FB.user.uid || typeof d.json !== 'string') return;
        let raw, r; try { raw = JSON.parse(d.json); r = worldClean(raw); } catch(e){ return; }
        if (!r || !raw) return;
        r.emote = PZ_EMOTES.some(([e]) => e === raw.emote) ? raw.emote : null;
        r.emoteTo = /^(all|w:[\w-]{1,80})$/.test(raw.emoteTo || '') ? raw.emoteTo : 'all';
        const k = 'w:' + d.id;
        r.name = String(d.name || 'Friend').replace(/[^\p{L}\p{N} '-]/gu, '').slice(0, 20) || 'Friend';
        r.ts = d.ts; r.world = true; seen[k] = 1;
        const old = WORLD.peers[k]; WORLD.peers[k] = r;
        if (PZ.onRemote && (!old || old.ts !== r.ts)) PZ.onRemote(r, k);
      });
      Object.keys(WORLD.peers).forEach(k => { if (!seen[k]) delete WORLD.peers[k]; });
    }, () => { WORLD.sub = null; });
  } catch(e){ WORLD.sub = null; }
}
function worldStop(){ try { WORLD.sub && WORLD.sub(); } catch(e){} WORLD.sub = null; WORLD.peers = {}; }

/* ================= TOWN SQUARE (shared plaza) =================
   Both heroes live here. Tap the ground to walk, tap a building to go in, tap your brother or sister
   to wave or high-five. With cloud save on (the Claude link), each kid's spot and waves are shared
   live through the docs rq/plaza_son and rq/plaza_daughter. On the GitHub site this works on one iPad
   only, so a wave left for someone not in town waits as a note until they come back. */
const PZ_W = 1600, PZ_H = 1120, PZ_C = { x:800, y:620 };
const PZ_EMOTES = [['👋','Wave'],['✋','High five'],['💃','Dance'],['🎉','Cheer'],['❤️','Hug'],['😂','Silly']];
const PZ_BUILDINGS = [
  { id:'townhall', x:800, y:330, w:320, h:200, wall:'#f6ead3', roof:'#c2410c', trim:'#d9b26a', kind:'dome', icon:'🏛️', name:'Town Hall', sub:'Quests & Quest Map', go:() => screenTownHall() },
  { id:'library',  x:330, y:400, w:230, h:160, wall:'#f3e3c7', roof:'#2f5fc4', trim:'#c9a46a', kind:'gable', icon:'📖', name:'Library', sub:'Read a story', go:() => screenHome() },
  { id:'shop',     x:1270, y:400, w:230, h:160, wall:'#f6e1e8', roof:'#9333ea', trim:'#d6a6c9', kind:'gable', icon:'🛍️', name:'Shop', sub:'Gear & treats', go:() => screenShop() },
  { id:'armory',   x:210, y:770, w:210, h:155, wall:'#e7ddd0', roof:'#7f1d1d', trim:'#a8a29e', kind:'gable', icon:'🛡️', name:'Armory', sub:'Your armor', go:() => screenArmory() },
  { id:'heroes',   x:1390, y:770, w:220, h:165, wall:'#f6ead3', roof:'#b45309', trim:'#d9b26a', kind:'dome', icon:'🏛️', name:'Hall of Heroes', sub:'See both heroes', go:() => screenHeroHall() },
  { id:'trophy',   x:520, y:1040, w:170, h:170, wall:'#efe6d6', roof:'#ca8a04', trim:'#d9b26a', kind:'tower', icon:'🏆', name:'Trophy Tower', sub:'Trophies', go:() => screenTrophies() },
  { id:'roost',    x:1080, y:1040, w:200, h:150, wall:'#e8f0e0', roof:'#15803d', trim:'#a3b18a', kind:'gable', icon:'🐾', name:'Pet Roost', sub:'Your collection', go:() => screenCollection() },
  { id:'portal',   x:800, y:1095, w:150, h:150, kind:'portal', icon:'🏗️', name:'My World', sub:'Build!', go:() => screenWorld() }
];
const PZ_NPCS = [
  { id:'owl',   e:'🦉', name:'Mayor Hoot',    x:1000, y:470 },
  { id:'baker', e:'🐰', name:'Baker Bun',     x:560,  y:560 },
  { id:'keeper', e:'🧞', name:'Treasure Keeper', x:1170, y:600 },
  { id:'well',  e:'⛲', name:'Wishing Fountain', x:PZ_C.x, y:PZ_C.y, hidden:true }
];
const PZ_WORDS = {
  son: ['the','and','look','jump','play','said','come','here','little','where','funny','yellow','down','help','make','away'],
  daughter: ['because','through','friend','enormous','courage','whisper','mystery','discover','treasure','ancient','journey','brilliant','curious','dangerous','imagine','together']
};
const PZ_RIDDLES = {
  son: [['What rhymes with CAT?',['hat','dog','sun']], ['Which word starts like BALL?',['bat','cup','fish']], ['I am yellow and up in the sky. What am I?',['the sun','a fish','a shoe']],
        ['What rhymes with PIG?',['big','pan','top']], ['Which one is an animal?',['frog','rock','cup']], ['Which word has the short A sound, like apple?',['map','me','go']],
        ['What do you read?',['a book','a spoon','a sock']], ['What rhymes with RED?',['bed','cat','run']], ['Which word ends like DOG?',['log','dot','sun']], ['What do bees make?',['honey','milk','bread']]],
  daughter: [['I have keys but open no locks. What am I?',['a piano','a door','a car']], ['What has pages but is not a tree?',['a book','a leaf','a cloud']],
        ['Which word means very big?',['enormous','tiny','quiet']], ['What gets wetter the more it dries?',['a towel','the sun','a rock']],
        ['Which word is an action (a verb)?',['jump','blue','table']], ['What is the opposite of brave?',['scared','strong','happy']],
        ['I have a head and a tail but no body. What am I?',['a coin','a cat','a kite']], ['Which word means the same as quick?',['fast','slow','sleepy']],
        ['What can you catch but not throw?',['a cold','a ball','a fish']], ['Which word is a compound word?',['sunflower','happy','running']]]
};
const PZ = { pos:null, sub:false, beat:null, mine:null, timers:[] };
// everyone else who can show up in town: the other kid, plus the Wizard once he has visited
const pzOthers = () => { const pl = DB.plaza || {};
  const ids = Object.keys(DB.players || {}).filter(id => { const P = DB.players[id]; return id !== kid && !P.removed && (!P.wizard || pl[id]); });
  Object.keys(pl).forEach(id => { if (id !== kid && !ids.includes(id) && !(DB.players[id] && DB.players[id].removed)) ids.push(id); });
  return ids.slice(0, 8); };
const pzDayIdx = () => Math.floor(Date.now() / 86400000);
function pzRec(k){ if (isWorldId(k)) return WORLD.peers[k] || null; DB.plaza = DB.plaza || {}; return DB.plaza[k] || null; }
function pzOnline(r){ return !!(r && r.here && Date.now() - r.ts < 75000); }
function pzPush(extra = {}){
  DB.plaza = DB.plaza || {};
  const prev = DB.plaza[kid] || { sent:[] };
  const rec = Object.assign({}, prev, { x:PZ.pos.x, y:PZ.pos.y, here:true, name:kidName(), look:{ hero:K.hero, eq:(K.gear || {}).eq, wpn:K.wpn || null, mount:K.mount || null, avatar:K.avatar, style:styleOf(kid) } }, extra, { ts:Date.now() });
  rec.sent = (rec.sent || []).slice(-8);
  DB.plaza[kid] = rec; K.plazaPos = { x:PZ.pos.x, y:PZ.pos.y }; save();
  if (CLOUD.on && CLOUD.db){ try { CLOUD.db.doc('rq/plaza_' + kid).set({ json:JSON.stringify(rec), ts:rec.ts }).catch(()=>{}); } catch(e){} }
  worldPublish(rec);
}
function pzSubscribe(){
  worldListen();
  if (PZ.sub || !CLOUD.on || !CLOUD.db) return;
  PZ.sub = true;
  [...new Set(['son','daughter','dev'].concat(Object.keys(DB.players || {})))].forEach(k => {
    try {
      CLOUD.db.doc('rq/plaza_' + k).onSnapshot(snap => {
        const d = snap.exists ? snap.data() : null; if (!d || typeof d.json !== 'string') return;
        let r; try { r = JSON.parse(d.json); } catch(e){ return; }
        DB.plaza = DB.plaza || {};
        if (k === kid && document.querySelector('.plaza-world')) return; // I'm the one moving here
        if (!DB.plaza[k] || r.ts >= DB.plaza[k].ts){ DB.plaza[k] = r; if (PZ.onRemote && k !== kid) PZ.onRemote(r, k); }
      }, () => {});
    } catch(e){}
  });
}
function pzToast(text){
  const t = el('div',{class:'pz-toast'}, text); document.body.append(t);
  setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
}
function pzHeroFor(k, size){
  // someone who plays on another device (the Wizard) is drawn from the look they share in town
  let D = DB.kids[k];
  if (!D){ const look = (pzRec(k) || {}).look;
    if (!look || !look.hero) return el('div',{class:'hero-wrap', html:`<div style="font-size:${size*.7}px">🧙</div>`});
    D = Object.assign(freshKid(), { __style:look.style, hero:look.hero, gear:{ owned:{}, eq:look.eq || {} }, wpn:look.wpn || null, mount:look.mount || null, avatar:Object.assign({ base:null, owned:[], equipped:{} }, look.avatar || {}) }); }
  if (D.hero){ const keep = K; K = D; try { return riderNode(size); } finally { K = keep; } }
  return el('div',{class:'hero-wrap', html: D.avatar && D.avatar.base ? avatarSVG(D.avatar, size) : `<div style="font-size:${size*.7}px">${trackOf(k) === 'son' ? '🐲' : '🐰'}</div>`});
}

/* ----- the drawn town ----- */
function pzTree(x, y, s, gold, R){
  // painted tree: dark under-canopy, mid clusters with a soft gradient, sunlit highlights on top-left
  const g0 = gold ? 'pzGoldTree' : 'pzGreenTree', dark = gold ? '#c27c0e' : '#2f7d3a', lite = gold ? '#fff1a8' : '#c8f59a';
  let g = `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="4" rx="40" ry="10" fill="#1d3b12" opacity=".2"/>
    <path d="M-7 2 q3 -42 -5 -62 q8 4 12 0 q6 4 12 0 q-9 22 -4 62z" fill="#8b5a2b" stroke="${INK}" stroke-width="2"/><path d="M-1 0 q1 -30 -3 -52" stroke="#b07a44" stroke-width="3" fill="none" opacity=".6"/>
    <ellipse cx="0" cy="-70" rx="46" ry="30" fill="${dark}"/>`;
  for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; g += `<circle cx="${Math.cos(a)*26}" cy="${-86 + Math.sin(a)*20}" r="${21 + R()*8}" fill="url(#${g0})" stroke="${dark}" stroke-width="1.5"/>`; }
  g += `<circle cx="0" cy="-92" r="27" fill="url(#${g0})" stroke="${dark}" stroke-width="1.5"/>`;
  for (let i = 0; i < 5; i++) g += `<ellipse cx="${-22 + R()*26}" cy="${-110 + R()*26}" rx="${7 + R()*5}" ry="${4 + R()*3}" fill="${lite}" opacity=".55"/>`;
  if (gold) for (let i = 0; i < 4; i++) g += `<path d="M${-30 + R()*60} ${-60 + R()*30} q4 -4 8 0 q-4 4 -8 0z" fill="#e98a16" opacity=".8"/>`;
  return g + `</g>`;
}
function pzCottage(x, y, roof){
  return `<g><rect x="${x-50}" y="${y-70}" width="100" height="70" fill="#f1e6d2" stroke="#5b4636" stroke-width="3"/><path d="M${x-62} ${y-66} L${x} ${y-120} L${x+62} ${y-66}z" fill="${roof}" stroke="#1e293b" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${x-12}" y="${y-40}" width="24" height="40" rx="10" fill="#7c4a24"/><rect x="${x-40}" y="${y-56}" width="18" height="18" fill="#fde68a" stroke="#5b4636" stroke-width="2"/><rect x="${x+22}" y="${y-56}" width="18" height="18" fill="#fde68a" stroke="#5b4636" stroke-width="2"/>
    <rect x="${x+24}" y="${y-118}" width="12" height="30" fill="#8b6b4a"/></g>`;
}
function pzBuildingSVG(b){
  const ink = '#2a2118', L = b.x - b.w/2, T = b.y - b.h;
  if (b.kind === 'portal') return `<g data-b="${b.id}" class="pz-b"><ellipse cx="${b.x}" cy="${b.y}" rx="90" ry="20" fill="#000" opacity=".15"/>
    <path d="M${b.x-70} ${b.y} v-90 a70 70 0 0 1 140 0 v90" fill="none" stroke="#a78bfa" stroke-width="22"/><path d="M${b.x-70} ${b.y} v-90 a70 70 0 0 1 140 0 v90" fill="none" stroke="#ede9fe" stroke-width="8"/>
    <path d="M${b.x-56} ${b.y} v-86 a56 56 0 0 1 112 0 v86z" fill="url(#pzPortal)" class="pz-portal"/>
    <rect x="${b.x-70}" y="${b.y-200}" width="140" height="32" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/><text x="${b.x}" y="${b.y-178}" text-anchor="middle" class="pz-sign">${b.icon} ${b.name}</text></g>`;
  let roof = '';
  if (b.kind === 'dome') roof = `<rect x="${L-10}" y="${T-14}" width="${b.w+20}" height="16" fill="${b.trim}" stroke="${ink}" stroke-width="3"/>
    <path d="M${b.x-b.w*.32} ${T-14} a${b.w*.32} ${b.w*.3} 0 0 1 ${b.w*.64} 0z" fill="${b.roof}" stroke="${ink}" stroke-width="3"/>
    <path d="M${b.x-b.w*.2} ${T-30} q${b.w*.2} -${b.w*.16} ${b.w*.4} 0" fill="none" stroke="#fcd34d" stroke-width="4" opacity=".7"/>
    <path d="M${b.x} ${T-14-b.w*.3} v-26" stroke="${ink}" stroke-width="4"/><circle cx="${b.x}" cy="${T-14-b.w*.3-30}" r="8" fill="#facc15" stroke="${ink}" stroke-width="2"/>
    ${[L-4, L+b.w-30].map(x => `<rect x="${x}" y="${T-60}" width="34" height="${b.h+60}" fill="${b.wall}" stroke="${ink}" stroke-width="3"/><path d="M${x-6} ${T-58} L${x+17} ${T-100} L${x+40} ${T-58}z" fill="${b.roof}" stroke="${ink}" stroke-width="3"/><rect x="${x+10}" y="${T-30}" width="14" height="24" rx="7" fill="#fde68a" stroke="${ink}" stroke-width="2"/>`).join('')}`;
  else if (b.kind === 'tower') roof = `<path d="M${L-16} ${T+2} L${b.x} ${T-110} L${L+b.w+16} ${T+2}z" fill="${b.roof}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M${b.x} ${T-110} v-24 l20 7 l-20 7" fill="#ef4444" stroke="${ink}" stroke-width="2"/>`;
  else roof = `<path d="M${L-16} ${T+4} L${b.x} ${T-b.h*.5} L${L+b.w+16} ${T+4}z" fill="${b.roof}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M${L-4} ${T-6} L${b.x} ${T-b.h*.5+14}" stroke="#fff" stroke-width="3" opacity=".25"/>`;
  const nWin = Math.max(2, Math.floor(b.w / 64)), gap = b.w / nWin;
  let wins = '';
  for (let i = 0; i < nWin; i++){ const wx = L + gap*i + gap/2 - 12; wins += `<path d="M${wx} ${T+60} v-26 a12 12 0 0 1 24 0 v26z" fill="#fde68a" stroke="${ink}" stroke-width="2.5"/><path d="M${wx+12} ${T+22} v38" stroke="${ink}" stroke-width="1.5" opacity=".5"/>`; }
  return `<g data-b="${b.id}" class="pz-b"><ellipse cx="${b.x}" cy="${b.y+4}" rx="${b.w*.62}" ry="18" fill="#000" opacity=".14"/>
    <rect x="${L}" y="${T}" width="${b.w}" height="${b.h}" rx="4" fill="${b.wall}" stroke="${ink}" stroke-width="3"/><rect x="${L+2}" y="${T+2}" width="${b.w-4}" height="${b.h-4}" rx="3" fill="url(#pzWallShade)"/>${roof}<path d="M${L} ${T} h${b.w}" stroke="url(#pzRoofShine)" stroke-width="0"/>${wins}
    <rect x="${L-6}" y="${b.y-12}" width="${b.w+12}" height="12" fill="${b.trim}" stroke="${ink}" stroke-width="2.5"/>
    <path d="M${b.x-22} ${b.y-12} v-40 a22 22 0 0 1 44 0 v40z" fill="#7c4a24" stroke="${ink}" stroke-width="3"/><circle cx="${b.x+12}" cy="${b.y-34}" r="3" fill="#facc15"/>
    ${[b.x-36, b.x+36].map(x => `<circle cx="${x}" cy="${b.y-56}" r="12" fill="#fde68a" opacity=".45" class="sc-firefly"/><circle cx="${x}" cy="${b.y-56}" r="5" fill="#fff7c2" stroke="${ink}" stroke-width="1.5"/>`).join('')}
    <rect x="${b.x-90}" y="${T+70}" width="180" height="${b.h > 160 ? 46 : 40}" rx="10" fill="#fff" stroke="${ink}" stroke-width="3"/><text x="${b.x}" y="${T+92}" text-anchor="middle" class="pz-sign">${b.icon} ${b.name}</text><text x="${b.x}" y="${T+106}" text-anchor="middle" class="pz-sub">${b.sub}</text></g>`;
}
function pzSceneSVG(){
  const R = seeded(77), C = PZ_C;
  let s = `<svg viewBox="0 0 ${PZ_W} ${PZ_H}" width="${PZ_W}" height="${PZ_H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="pzGrass" cx="50%" cy="55%" r="70%"><stop offset="0" stop-color="#8fd16a"/><stop offset="1" stop-color="#4f9e3c"/></radialGradient>
    <radialGradient id="pzPortal" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#c4b5fd"/><stop offset="1" stop-color="#6d28d9"/></radialGradient>
    <radialGradient id="pzGoldTree" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffe27a"/><stop offset=".55" stop-color="#f6b81c"/><stop offset="1" stop-color="#d98a08"/></radialGradient>
    <radialGradient id="pzGreenTree" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#a6e36f"/><stop offset=".55" stop-color="#5cb547"/><stop offset="1" stop-color="#2f8a3a"/></radialGradient>
    <linearGradient id="pzWallShade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a3a20" stop-opacity=".28"/></linearGradient>
    <linearGradient id="pzRoofShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="pzSun" cx="12%" cy="0%" r="90%"><stop offset="0" stop-color="#fff6c8" stop-opacity=".55"/><stop offset=".5" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>
    <pattern id="pzCobble" width="28" height="22" patternUnits="userSpaceOnUse"><rect width="28" height="22" fill="#efe4cf"/><path d="M0 11 h28 M14 0 v11 M0 0 v0 M7 11 v11 M21 11 v11" stroke="#d6c6a6" stroke-width="2"/></pattern></defs>
    <rect width="${PZ_W}" height="${PZ_H}" fill="url(#pzGrass)"/>`;
  for (let i = 0; i < 26; i++) s += `<ellipse cx="${R()*PZ_W}" cy="${R()*PZ_H}" rx="${60 + R()*90}" ry="${26 + R()*30}" fill="#c8f59a" opacity="${.12 + R()*.12}"/>`;
  for (let i = 0; i < 260; i++) s += `<path d="M${R()*PZ_W} ${R()*PZ_H} l3 -9 l3 9" stroke="#3f8a33" stroke-width="2" fill="none" opacity=".5"/>`;
  for (let i = 0; i < 70; i++){ const x = R()*PZ_W, y = R()*PZ_H, c = ['#fff','#ffd6e7','#fff3a3'][i % 3]; s += `<circle cx="${x}" cy="${y}" r="2.6" fill="${c}"/><circle cx="${x+5}" cy="${y+2}" r="2.2" fill="${c}"/><circle cx="${x+2}" cy="${y-4}" r="2" fill="${c}"/>`; }
  // winding cobblestone paths from the plaza to every door
  PZ_BUILDINGS.forEach((b, i) => {
    const dx = b.x - C.x, dy = (b.y + 10) - C.y, len = Math.hypot(dx, dy) || 1, bend = (i % 2 ? 1 : -1) * Math.min(120, len * .25);
    const mx = C.x + dx/2 - dy/len*bend, my = C.y + dy/2 + dx/len*bend, d = `M${C.x} ${C.y} Q${mx} ${my} ${b.x} ${b.y+14}`;
    s += `<path d="${d}" stroke="#bfa982" stroke-width="80" fill="none" stroke-linecap="round"/><path d="${d}" stroke="url(#pzCobble)" stroke-width="68" fill="none" stroke-linecap="round"/>`;
  });
  // flower beds between the paths
  const beds = [[560,760],[1040,760],[620,440],[980,880],[440,620],[1160,600]];
  beds.forEach(([x, y]) => { s += `<ellipse cx="${x}" cy="${y}" rx="70" ry="34" fill="#5fae45" stroke="#c9b48c" stroke-width="6"/>`;
    for (let i = 0; i < 14; i++) s += `<circle cx="${x - 55 + R()*110}" cy="${y - 22 + R()*44}" r="${4 + R()*3}" fill="${['#f472b6','#facc15','#fb7185','#a78bfa','#fff'][i % 5]}"/>`; });
  // central plaza, garden ring, fountain and statue
  s += `<circle cx="${C.x}" cy="${C.y}" r="190" fill="#bfa982"/><circle cx="${C.x}" cy="${C.y}" r="182" fill="url(#pzCobble)"/>
    <circle cx="${C.x}" cy="${C.y}" r="120" fill="#5fae45" stroke="#d9b26a" stroke-width="8"/>`;
  for (let i = 0; i < 26; i++){ const a = i / 26 * Math.PI * 2; s += `<circle cx="${C.x + Math.cos(a)*102}" cy="${C.y + Math.sin(a)*102}" r="7" fill="${['#f472b6','#fde047','#fff','#c084fc'][i % 4]}"/>`; }
  s += `<g data-b="well" class="pz-b"><circle cx="${C.x}" cy="${C.y}" r="76" fill="#e7dcc8" stroke="#8a7a5c" stroke-width="4"/><circle cx="${C.x}" cy="${C.y}" r="62" fill="#60a5fa"/>
    <circle cx="${C.x}" cy="${C.y}" r="40" fill="none" stroke="#dbeafe" stroke-width="3" class="pz-ripple"/><circle cx="${C.x}" cy="${C.y}" r="52" fill="none" stroke="#dbeafe" stroke-width="2" class="pz-ripple d2"/>
    <rect x="${C.x-16}" y="${C.y-60}" width="32" height="60" fill="#e7dcc8" stroke="#8a7a5c" stroke-width="3"/>
    <path d="M${C.x-40} ${C.y-66} q20 -16 40 0 q20 -16 40 0 v-4 q-20 -14 -40 0 q-20 -14 -40 0z" fill="#facc15" stroke="#a16207" stroke-width="3"/><path d="M${C.x} ${C.y-70} v-4" stroke="#a16207" stroke-width="3"/>
    <path d="M${C.x} ${C.y-112} l7 15 l16 2 l-12 11 l3 16 l-14 -8 l-14 8 l3 -16 l-12 -11 l16 -2z" fill="#fde047" stroke="#a16207" stroke-width="2.5" class="pz-star"/></g>`;
  // cottages and lamps around the edges
  [[90,260,'#2f5fc4'],[1510,260,'#2f5fc4'],[110,1090,'#2f5fc4'],[1490,1090,'#2f5fc4'],[300,1110,'#c2410c'],[1300,1110,'#c2410c'],[560,180,'#2f5fc4'],[1040,180,'#2f5fc4']].forEach(([x, y, r]) => s += pzCottage(x, y, r));
  [[640,620],[960,620],[800,430],[800,820],[470,520],[1130,520],[470,860],[1130,860]].forEach(([x, y]) => s += `<path d="M${x} ${y} v-60" stroke="#334155" stroke-width="5"/><rect x="${x-9}" y="${y-76}" width="18" height="20" rx="4" fill="#fde68a" stroke="#334155" stroke-width="3"/><circle cx="${x}" cy="${y-66}" r="18" fill="#fde68a" opacity=".3" class="sc-firefly"/>`);
  // golden and green trees, back to front
  const trees = [[40,120],[200,100],[420,90],[680,70],[930,70],[1180,90],[1400,100],[1560,140],[40,520],[1560,520],[60,900],[1540,900],[380,620],[1220,620],[700,980],[900,980],[300,960],[1300,960],[620,280],[980,280]];
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y], i) => s += pzTree(x, y, .9 + R()*.35, i % 3 !== 2, R));
  PZ_BUILDINGS.forEach(b => s += pzBuildingSVG(b));
  // painted light: warm sunlight from the top-left, soft shadow at the far edges
  s += `<rect width="${PZ_W}" height="${PZ_H}" fill="url(#pzSun)" pointer-events="none"/>`;
  return s + '</svg>';
}

/* ----- screen ----- */

/* ---- town-square power effects (one-shot CSS animations, removed afterwards) ---- */
const PZM = { mode:null };
function powerGemSVG(c){ return `<svg viewBox="0 0 72 80" width="72" height="80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="74" rx="20" ry="5" fill="#000" opacity=".25"/><circle cx="36" cy="34" r="30" fill="${c}" opacity=".3"/><path d="M36 6 L60 28 L36 70 L12 28Z" fill="${c}" stroke="#24141f" stroke-width="3.5" stroke-linejoin="round"/><path d="M12 28 H60 M36 6 L28 28 L36 70 L44 28Z" fill="none" stroke="#24141f" stroke-width="2" opacity=".55"/><path d="M22 24 L32 12" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`; }
function pzPowerFx(world, id, x, y, left){
  const ink = '#24141f', c = (POWERS[id] || {}).color || '#fff';
  const fx = (cls, html, ms, dx = 0, dy = 0) => { const n = el('div',{class:'pzp ' + cls, style:`left:${x + dx}px;top:${y + dy}px;z-index:${Math.round(y) + 5}`, html}); world.append(n); setTimeout(() => n.remove(), ms); return n; };
  const dir = left ? -1 : 1;
  if (id === 'frost'){ fx('pzp-ring', `<svg viewBox="0 0 300 120" width="300" height="120"><ellipse cx="150" cy="60" rx="140" ry="50" fill="#e0f2fe" opacity=".85" stroke="#38bdf8" stroke-width="5"/><path d="M40 60 l30 -14 l-6 20 l40 -26 l-8 26 l44 -18 l-6 22 l40 -20 l-4 24 l36 -14" stroke="#7dd3fc" stroke-width="5" fill="none"/></svg>`, 2600, -150, -40);
    for (let i = 0; i < 8; i++) fx('pzp-flake', '❄️', 2200, (Math.random() - .5) * 260, -180 - Math.random() * 80).style.animationDelay = (i * .08) + 's'; }
  if (id === 'storm'){ fx('pzp-cloud', `<svg viewBox="0 0 220 150" width="220" height="150"><path d="M30 70 Q20 36 54 34 Q66 6 104 16 Q140 0 160 32 Q200 30 196 66 Q206 88 180 92 H44 Q14 92 30 70Z" fill="#64748b" stroke="${ink}" stroke-width="4"/><path d="M104 92 L88 120 H104 L94 148 L126 110 H110 L120 92Z" fill="#facc15" stroke="${ink}" stroke-width="3"/>${[50,70,140,160,180].map((rx, i) => `<path class="pzp-drop" style="animation-delay:${i * .12}s" d="M${rx} 96 l-6 16" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>`).join('')}</svg>`, 3000, -110, -290);
    fx('pzp-flash', '', 700, -400, -400); }
  if (id === 'laser'){ fx('pzp-laser', `<svg viewBox="0 0 420 40" width="420" height="40"><path d="M0 12 H420 M0 28 H420" stroke="#ef4444" stroke-width="9" stroke-linecap="round"/><path d="M0 12 H420 M0 28 H420" stroke="#fee2e2" stroke-width="3"/></svg>`, 1200, left ? -430 : 10, -168).style.transformOrigin = left ? 'right center' : 'left center';
    fx('pzp-boom', '💥', 1300, dir * 420 - 30, -190); }
  if (id === 'sorcery'){ const f = fx('pzp-fireball', `<svg viewBox="0 0 90 90" width="90" height="90"><circle cx="45" cy="45" r="30" fill="#f97316" stroke="${ink}" stroke-width="4"/><circle cx="45" cy="45" r="16" fill="#fde68a"/><path d="M15 40 Q-6 30 4 14 Q14 28 24 26 Q20 8 38 2 Q36 18 48 18" fill="#fb923c" stroke="${ink}" stroke-width="3"/></svg>`, 1500, dir * 20 - 45, -200); f.style.setProperty('--dx', dir * 250 + 'px');
    setTimeout(() => { fx('pzp-boom big', '💥', 1200, dir * 270 - 40, -210); for (let i = 0; i < 4; i++) fx('pzp-bolt', '⚡', 1100, dir * 270 - 40 + (Math.random() - .5) * 160, -230 + (Math.random() - .5) * 120); }, 900); }
  if (id === 'light'){ fx('pzp-halo', `<svg viewBox="0 0 320 320" width="320" height="320"><defs><radialGradient id="pzl"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#fde047" stop-opacity=".6"/><stop offset="1" stop-color="#fde047" stop-opacity="0"/></radialGradient></defs><circle cx="160" cy="160" r="160" fill="url(#pzl)"/>${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => `<path d="M160 6 L168 70 L152 70Z" fill="#fff7c2" transform="rotate(${a} 160 160)"/>`).join('')}</svg>`, 2600, -160, -240); }
  if (id === 'totem'){ const t = el('div',{class:'pz-totem', style:`left:${x + 60}px;top:${y - 150}px;z-index:${Math.round(y)}`, html:`<svg viewBox="0 0 60 150" width="60" height="150"><ellipse cx="30" cy="144" rx="24" ry="5" fill="#000" opacity=".25"/><rect x="14" y="20" width="32" height="124" rx="4" fill="#b45309" stroke="${ink}" stroke-width="3"/><path d="M0 34 L14 28 L14 44Z M60 34 L46 28 L46 44Z" fill="#fde68a" stroke="${ink}" stroke-width="2.5"/><circle cx="23" cy="36" r="4" fill="${ink}"/><circle cx="37" cy="36" r="4" fill="${ink}"/><path d="M22 50 h16 M14 64 h32 M14 104 h32" stroke="${ink}" stroke-width="3"/><circle cx="23" cy="80" r="5" fill="#fff"/><circle cx="37" cy="80" r="5" fill="#fff"/><path d="M20 92 q10 7 20 0" stroke="${ink}" stroke-width="3" fill="none"/><path d="M14 20 L30 2 L46 20Z" fill="#16a34a" stroke="${ink}" stroke-width="3"/></svg>`});
    world.querySelectorAll('.pz-totem').forEach(o => o.remove()); world.append(t); fx('pzp-halo small', `<svg viewBox="0 0 200 200" width="200" height="200"><circle cx="100" cy="100" r="90" fill="#fbbf24" opacity=".35"/></svg>`, 1600, -40, -230); }
  if (id === 'truesight'){ fx('pzp-sweep', `<svg viewBox="0 0 600 600" width="600" height="600"><circle cx="300" cy="300" r="290" fill="none" stroke="#f59e0b" stroke-width="10" stroke-dasharray="30 20"/><circle cx="300" cy="300" r="200" fill="#f59e0b" opacity=".12"/></svg>`, 2000, -300, -370);
    fx('pzp-eye', powerEmblem('truesight', 90), 1800, -45, -270); }
  if (id === 'sky'){ for (let i = 0; i < 6; i++) fx('pzp-flake', '🪶', 1800, (Math.random() - .5) * 180, -160 - Math.random() * 60).style.animationDelay = (i * .1) + 's'; }
  if (id === 'blink'){ fx('pzp-portal', `<svg viewBox="0 0 160 70" width="160" height="70"><ellipse cx="80" cy="35" rx="76" ry="30" fill="#ec4899" opacity=".35" stroke="#ec4899" stroke-width="5"/><ellipse cx="80" cy="35" rx="46" ry="16" fill="#fbcfe8" opacity=".8"/></svg>`, 900, -80, -40); }
  if (id === 'invisible'){ fx('pzp-flake', '👻', 1600, -20, -200); }
}

function screenTownSquare(){
  if (!K.hero) return screenHeroCreate(screenTownSquare);
  pzSubscribe(); PZM.mode = null;
  PZ.pos = Object.assign({ x:760, y:760 }, K.plazaPos || {});
  const world = el('div',{class:'plaza-world', html: pzSceneSVG()});
  const view = el('div',{class:'plaza-view'});
  const zz = zoomable({ view, content: world, W: PZ_W, H: PZ_H, start: PZ.z || (innerWidth < 600 ? .7 : 1), max: 2.2, onZoom: z => { PZ.z = z; } });
  const frame = zz.frame; frame.classList.add('plaza-frame'); frame.append(todBadge('Storybrook'));
  const actor = (node, name, cls) => el('div',{class:'plaza-actor ' + (cls || '')}, el('div',{class:'pz-tag'}, name), node);
  const me = actor(pzHeroFor(kid, 96), kidName(), 'me' + (isDev() ? ' wizard' : ''));
  world.append(me);
  world.append(todLayer('plaza', [[640,554,60],[960,554,60],[800,364,60],[800,754,60],[470,454,60],[1130,454,60],[470,794,60],[1130,794,60],[PZ_C.x, PZ_C.y - 100, 90]]
    .concat(PZ_BUILDINGS.map(b => [b.x, b.y - 40, 110]))
    .concat([[90,260],[1510,260],[110,1090],[1490,1090],[300,1110],[1300,1110],[560,180],[1040,180]].map(([x, y]) => [x, y - 30, 70]))));
  const put = (n, x, y, w = 96) => { n.style.left = (x - w/2) + 'px'; n.style.top = (y - w*1.25 - 30) + 'px'; n.style.zIndex = Math.round(y); };
  const bubble = (n, text, big) => { n.querySelectorAll('.pz-bubble').forEach(b => b.remove()); const b = el('div',{class:'pz-bubble' + (big ? ' big' : '')}, text); n.append(b); setTimeout(() => b.remove(), 2600); };
  const camera = (x, y, smooth = true) => view.scrollTo({ left: x*zz.z - view.clientWidth/2, top: y*zz.z - view.clientHeight/2, behavior: smooth ? 'smooth' : 'auto' });
  K.plazaSeenBy = K.plazaSeenBy || {};

  // everyone else in town: live if they're here now, otherwise napping at their last spot
  const others = pzOthers();
  const homeSpot = { son:{ x:900, y:720 }, daughter:{ x:680, y:720 }, dev:{ x:1000, y:520 } };
  const spotFor = (id, i) => homeSpot[id] || (homeSpot[id] = isWorldId(id) ? { x: 260 + (i * 197) % 1080, y: 640 + ((i * 131) % 380) } : { x: 560 + (i % 4) * 160, y: 860 + Math.floor(i / 4) * 90 });
  others.forEach((id, i) => spotFor(id, i));
  const P = {};
  const addOther = (k, i) => {
    if (P[k]) return;
    const n = actor(pzHeroFor(k, 96), kidName(k), 'sib' + (k === 'dev' ? ' wizard' : '') + (isWorldId(k) ? ' worlder' : ''));
    P[k] = { k, n, pos: Object.assign({}, spotFor(k, i)), seenEmote: 0 };
    world.append(n);
    n.onclick = e => { e.stopPropagation(); beep('tap'); tapOther(P[k]); };
  };
  others.forEach(addOther);
  const worldIds = () => Object.keys(WORLD.peers).sort((a, b) => WORLD.peers[b].ts - WORLD.peers[a].ts).slice(0, 16);
  worldIds().forEach((k, i) => { addOther(k, i); others.push(k); });
  const forMe = m => !m.to || m.to === 'all' || m.to === kid || m.to === myWid();
  const draw = (k, r) => {
    const o = P[k]; if (!o) return;
    const live = pzOnline(r), n = o.n, name = kidName(k);
    if (r && typeof r.x === 'number') o.pos = { x:r.x, y:r.y };
    const dur = live && n._x != null ? Math.min(3, Math.hypot(o.pos.x - n._x, o.pos.y - n._y) / 240) : 0;
    n.style.transitionDuration = dur + 's';
    if (n._x != null && live && Math.abs(o.pos.x - n._x) > 4) n.classList.toggle('flip', o.pos.x < n._x);
    if (dur > .05){ n.classList.add('walking'); setTimeout(() => n.classList.remove('walking'), dur*1000); }
    put(n, o.pos.x, o.pos.y); n._x = o.pos.x; n._y = o.pos.y;
    n.classList.toggle('away', !live);
    n.querySelector('.pz-tag').textContent = name + (live ? ' 🟢' : ' 💤');
    if (live && r.emote && r.emoteTs > o.seenEmote && Date.now() - r.emoteTs < 15000 && forMe({ to:r.emoteTo })){
      o.seenEmote = r.emoteTs; bubble(n, r.emote, true);
      if (r.emote === '💃'){ n.classList.add('dance'); setTimeout(() => n.classList.remove('dance'), 2000); }
    }
    const fresh = ((r && r.sent) || []).filter(m => m.ts > (K.plazaSeenBy[k] || 0) && forMe(m));
    if (fresh.length){
      fresh.forEach((m, i) => setTimeout(() => { pzToast(live && Date.now() - m.ts < 20000 ? `${name}: ${m.e} ${m.label}!` : `${name} left you a ${m.e} ${m.label} while you were away!`); beep('ok'); }, i * 900));
      K.plazaSeenBy[k] = Math.max(...fresh.map(m => m.ts)); save();
    }
  };
  PZ.onRemote = (r, k) => { if (!document.body.contains(world)) return;
    if (!P[k] && isWorldId(k)){ if (Object.keys(P).filter(isWorldId).length >= 16) return; addOther(k, Object.keys(P).length); others.push(k); draw(k, r); updStatus(); return; }
    draw(k, r); };

  // walking
  let walkT = null, walkId = 0;
  const walkTo = (x, y, then) => {
    x = Math.max(50, Math.min(PZ_W - 50, x)); y = Math.max(150, Math.min(PZ_H - 20, y));
    const fly = PZM.mode === 'sky', tp = PZM.mode === 'blink';
    const dc = Math.hypot(x - PZ_C.x, y - PZ_C.y); if (dc < 84 && !fly){ const f = 84 / (dc || 1); x = PZ_C.x + (x - PZ_C.x)*f; y = PZ_C.y + (y - PZ_C.y)*f + (dc ? 0 : 84); }
    const d = Math.hypot(x - PZ.pos.x, y - PZ.pos.y), dur = tp ? .01 : Math.max(.2, d / (fly ? 640 : 260)), id = ++walkId;
    if (tp){ pzPowerFx(world, 'blink', PZ.pos.x, PZ.pos.y); pzPowerFx(world, 'blink', x, y); me.classList.remove('blink-in'); void me.offsetWidth; me.classList.add('blink-in'); beep('star'); }
    me.style.transitionDuration = dur + 's';
    if (Math.abs(x - PZ.pos.x) > 4) me.classList.toggle('flip', x < PZ.pos.x);
    me.classList.add('walking'); put(me, x, y); camera(x, y);
    frame.querySelectorAll('.pz-pop').forEach(p => p.remove());
    clearTimeout(walkT);
    walkT = setTimeout(() => { if (id !== walkId) return; me.classList.remove('walking'); PZ.pos = { x, y }; pzPush(); }, dur * 1000);
    then && then(); // answer the tap right away; the hero keeps walking over
  };
  // pop-up cards dock at the bottom of the town view so they're never cut off
  const pop = (...kids) => { frame.querySelectorAll('.pz-pop').forEach(p => p.remove()); const p = el('div',{class:'pz-pop'}, ...kids, el('button',{class:'pz-x', onclick:e => { e.stopPropagation(); p.remove(); }},'✕')); p.onclick = e => e.stopPropagation(); frame.append(p); return p; };
  const closePop = () => frame.querySelectorAll('.pz-pop').forEach(p => p.remove());
  const leave = fn => { zz.exitFull(); pzPush({ here:false }); fn(); };

  // buildings and the fountain
  // iPad Safari won't send "click" for taps on plain shapes, so taps are read from pointer events
  // (a finger that moves more than a little is a scroll, not a tap)
  let tapStart = null;
  world.addEventListener('pointerdown', e => { tapStart = e.isPrimary ? { x:e.clientX, y:e.clientY, t:Date.now() } : null; });
  world.addEventListener('pointercancel', () => { tapStart = null; });
  world.addEventListener('pointerup', e => {
    const st = tapStart; tapStart = null;
    if (!st || Math.hypot(e.clientX - st.x, e.clientY - st.y) > 12 || Date.now() - st.t > 800) return;
    if (e.target.closest('.plaza-actor, .pz-npc')) return;
    const g = e.target.closest('[data-b]');
    if (g && g.dataset.b === 'well') return walkTo(PZ_C.x, PZ_C.y + 96, wish);
    if (g){ const b = PZ_BUILDINGS.find(x => x.id === g.dataset.b); beep('tap');
      return walkTo(b.x, b.y + 30, () => { say(b.name + '. ' + b.sub); pop(el('div',{class:'pz-pop-e'}, b.icon), el('b',{}, b.name), el('small',{}, b.sub), el('button',{class:'btn small', onclick:() => leave(b.go)}, 'Go in ▶')); }); }
    const r = world.getBoundingClientRect(); walkTo((e.clientX - r.left) / zz.z, (e.clientY - r.top) / zz.z + 10);
  });
  function wish(){
    const today = todayStr();
    if (K.pzWish === today && !isDev()){ say('The fountain is resting. Come back tomorrow for another wish!'); return pop(el('div',{class:'pz-pop-e'},'⛲'), el('b',{},'Wishing Fountain'), el('small',{},'One wish a day. Come back tomorrow!')); }
    pop(el('div',{class:'pz-pop-e'},'⛲'), el('b',{},'Wishing Fountain'), el('small',{},'Toss a coin and make a wish!'),
      el('button',{class:'btn small', onclick:() => { K.pzWish = today; const n = 1 + Math.floor(Math.random()*5); K.stars += n; save(); closePop();
        const coin = el('div',{class:'pz-coin', style:`left:${PZ.pos.x}px;top:${PZ.pos.y - 120}px`},'🪙'); world.append(coin); setTimeout(() => coin.remove(), 1200);
        setTimeout(() => { beep('star'); confetti(30); bubble(me, `+${n}⭐`, true); say(`Your wish came true! ${n} stars!`); }, 900); }}, '🪙 Make a wish'));
  }

  // townsfolk
  PZ_NPCS.filter(n => !n.hidden).forEach(n => {
    const node = el('div',{class:'pz-npc', style:`left:${n.x-36}px;top:${n.y-90}px;z-index:${n.y}`}, el('div',{class:'pz-tag'}, n.name), el('div',{class:'pz-npc-e'}, n.e));
    if (n.id === 'baker') node.append(el('div',{class:'pz-stall'},'🥐🧁🍪'));
    node.onclick = e => { e.stopPropagation(); beep('tap'); walkTo(n.x + 70, n.y + 10, () => n.id === 'owl' ? owl() : n.id === 'keeper' ? keeper() : baker()); };
    world.append(node);
  });
  function owl(){
    const list = PZ_WORDS[TK], w = list[pzDayIdx() % list.length], done = K.pzWord === todayStr() && !isDev();
    say(`Hoot hoot! The word of the day is: ${w}. Can you read it out loud?`);
    pop(el('div',{class:'pz-pop-e'},'🦉'), el('small',{},'Word of the day'), el('div',{class:'pz-word'}, w),
      el('button',{class:'btn small ghost', onclick:() => say(w)}, '🔊 Hear it'),
      done ? el('small',{},'✅ You got today\'s word star!') : el('button',{class:'btn small', onclick:e => { K.pzWord = todayStr(); K.stars += 1; save(); beep('star'); bubble(me,'+1⭐',true); say('Hoot! Great reading!'); e.target.replaceWith(el('small',{},'✅ +1 ⭐')); }}, '🗣️ I read it!'));
  }
  function keeper(){
    const n = chestCount();
    say(n ? `You have ${n} treasure chest${n === 1 ? '' : 's'}! Let's open them!` : 'Earn chests by reading great stories and doing quests in the Town Hall!');
    pop(el('div',{class:'pz-pop-e', html: chestSVG(n ? 'gold' : 'wood', 70)}), el('b',{},'Treasure Keeper'), el('small',{}, n ? `You have ${isDev() ? '∞' : n} chest${n === 1 ? '' : 's'} to open!` : 'Read great stories and finish Town Hall quests to earn chests.'),
      el('button',{class:'btn small', onclick:() => leave(screenChests)}, '🎁 Treasure Chests'));
  }
  function baker(){
    const list = PZ_RIDDLES[TK], [q, opts] = list[(pzDayIdx() + (isDev() ? Math.floor(Math.random()*list.length) : 0)) % list.length];
    if (K.pzRiddle === todayStr() && !isDev()){ say('You already solved my riddle today! Come back tomorrow for a new one.'); return pop(el('div',{class:'pz-pop-e'},'🐰'), el('b',{},'Baker Bun'), el('small',{},'New riddle tomorrow! 🧁')); }
    say(q);
    const p = pop(el('div',{class:'pz-pop-e'},'🧁'), el('b',{},'Riddle time!'), el('div',{class:'pz-q'}, q));
    shuffle(opts.map((o, i) => [o, i === 0])).forEach(([o, right]) => p.insertBefore(el('button',{class:'btn small blue', onclick:e => {
      if (right){ K.pzRiddle = todayStr(); K.stars += 2; save(); beep('star'); confetti(25); bubble(me,'+2⭐',true); say('Yes! You got it! Here are two stars.'); setTimeout(() => p.remove(), 1200); }
      else { beep('bad'); e.target.disabled = true; say('Not quite. Try again!'); }
    }}, o), p.querySelector('.pz-x')));
  }

  // tap someone else
  function tapOther(o){
    const r = pzRec(o.k), live = pzOnline(r), name = kidName(o.k);
    walkTo(o.pos.x + (PZ.pos.x < o.pos.x ? -90 : 90), o.pos.y, () => {
      pop(el('b',{}, live ? `${name} is here!` : `${name} is away 💤`), el('small',{}, live ? 'Send a wave or a high five!' : 'Leave something. They\'ll see it next time!'),
        el('div',{class:'pz-emotes'}, ...PZ_EMOTES.map(([em, label]) => el('button',{class:'pz-em', onclick:() => { closePop(); emote(em, label, o.k); }}, em))));
    });
  }
  // emotes: to one person, or to everyone in town from the bar
  function emote(em, label, to = 'all'){
    bubble(me, em, true); beep('ok');
    if (em === '💃'){ me.classList.add('dance'); setTimeout(() => me.classList.remove('dance'), 2000); }
    const prev = pzRec(kid) || {}, sent = (prev.sent || []).concat([{ e:em, label, to, ts:Date.now() }]);
    pzPush({ emote:em, emoteTo:to, emoteTs:Date.now(), sent });
    const targets = to === 'all' ? others : [to];
    const liveNear = targets.filter(k => pzOnline(pzRec(k)) && Math.hypot(PZ.pos.x - P[k].pos.x, PZ.pos.y - P[k].pos.y) < 220);
    if (em === '✋' && liveNear.length && K.pzHigh5 !== todayStr()){
      K.pzHigh5 = todayStr(); K.stars += 2; save(); setTimeout(() => { confetti(40); burst('HIGH FIVE!'); bubble(me, '+2⭐', true); say('Team high five! Two stars!'); }, 400);
    } else if (to !== 'all' && !pzOnline(pzRec(to))) pzToast(isWorldId(to) ? `${kidName(to)} is away right now. Try again when they're in town!` : `${em} sent! ${kidName(to)} will see it next time.`);
  }
  const bar = el('div',{class:'pz-bar'}, el('span',{class:'pz-bar-l'},'Say hi:'), ...PZ_EMOTES.map(([em, label]) => el('button',{class:'pz-em', title:label, onclick:() => emote(em, label)}, em)));

  // a little life: critters wander
  const critters = ['🐈','🐓','🦆','🐿️','🦋'].map((c, i) => { const n = el('div',{class:'pz-critter'}, c); n._x = 300 + i*260; n._y = 560 + (i % 2)*300; n.style.left = n._x + 'px'; n.style.top = n._y + 'px'; world.append(n); return n; });
  const wander = () => { if (!document.body.contains(world)) return; const n = pick(critters); const nx = Math.max(60, Math.min(PZ_W-60, n._x + (Math.random()-.5)*260)), ny = Math.max(200, Math.min(PZ_H-60, n._y + (Math.random()-.5)*160));
    n.classList.toggle('flip', nx > n._x); n._x = nx; n._y = ny; n.style.left = nx + 'px'; n.style.top = ny + 'px'; n.style.zIndex = Math.round(ny); setTimeout(wander, 1400 + Math.random()*1600); };
  setTimeout(wander, 800);

  const kidsNames = others.filter(k => k !== 'dev' && !isWorldId(k)).map(k => kidName(k)).join(' and ') || 'your family';
  const status = el('div',{class:'pz-status'});
  function updStatus(){ try {
    const wn = others.filter(isWorldId).length;
    status.textContent = worldOn() ? `🌍 Big World is on. ${wn ? wn + (wn === 1 ? ' hero' : ' heroes') + ' from other families ' + (wn === 1 ? 'is' : 'are') + ' in town. Tap one to wave!' : 'Heroes from other families will show up here when they play.'}`
      : CLOUD.on ? `☁️ Town is live. When ${kidsNames} opens Town Square, you'll see each other here.` : `📱 On this link, ${kidsNames} can only visit from this device. Use the Claude link to play together on different iPads.`;
  } catch(e){} }
  updStatus();
  show(el('div',{class:'screen plaza-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn small', onclick:() => leave(() => screenHome())}, '← Back'), el('h1',{class:'title'}, '🏰 Storybrook Square'), el('div')),
    frame, status));
  frame.append(bar);
  // ---- special power in town: big effect around the hero, movement powers change how you travel,
  //      and once a day the power uncovers a hidden Power Gem nearby (+3 ⭐)
  if (PW()){
    const pid = PW(), PWR = POWERS[pid], toggles = { sky:'Flying', blink:'Teleport', invisible:'Invisible' };
    const gem = () => {
      if (K.pzGem === todayStr() || world.querySelector('.pz-gem')) return;
      const a = Math.random() * Math.PI * 2, r = 260 + Math.random() * 180;
      const gx = Math.max(80, Math.min(PZ_W - 80, PZ.pos.x + Math.cos(a) * r)), gy = Math.max(220, Math.min(PZ_H - 60, PZ.pos.y + Math.sin(a) * r));
      const g = el('div',{class:'pz-gem', style:`left:${gx - 36}px;top:${gy - 60}px;z-index:${Math.round(gy)};--pc:${PWR.color}`, html:powerGemSVG(PWR.color)});
      g.onclick = e => { e.stopPropagation(); walkTo(gx, gy + 10, () => setTimeout(() => {
        if (K.pzGem === todayStr()) return; K.pzGem = todayStr(); K.stars += 3; save(); g.remove();
        beep('level'); confetti(50); bubble(me, '+3⭐', true); say(`You found a Power Gem! Three stars!`); }, PZM.mode === 'blink' ? 200 : 700)); };
      world.append(g); setTimeout(() => say(`Your ${PWR.name} power uncovered a hidden Power Gem! Go get it!`), 900);
    };
    const btn = el('button',{class:'pz-power', style:`--pc:${PWR.color}`, onclick:() => {
      closePop();
      if (toggles[pid]){
        PZM.mode = PZM.mode === pid ? null : pid;
        me.classList.toggle('flying', PZM.mode === 'sky'); me.classList.toggle('ghost', PZM.mode === 'invisible');
        btn.querySelector('b').textContent = toggles[pid] + (PZM.mode ? ': ON' : ': OFF');
        if (PZM.mode){ pzPowerFx(world, pid, PZ.pos.x, PZ.pos.y, me.classList.contains('flip')); beep('star'); say(pid === 'sky' ? 'You can fly! Tap anywhere to soar there.' : pid === 'blink' ? 'Teleport ready! Tap anywhere to blink there.' : 'You are invisible!'); emote(pid === 'sky' ? '🪽' : pid === 'blink' ? '✨' : '👻', PWR.name); gem(); }
        return;
      }
      pzPowerFx(world, pid, PZ.pos.x, PZ.pos.y, me.classList.contains('flip')); beep('level');
      emote({ truesight:'👁️', frost:'❄️', storm:'🌪️', laser:'🔆', totem:'🗿', light:'🌟', sorcery:'🔥' }[pid] || '⚡', PWR.name);
      gem();
    }}, el('span',{html:powerEmblem(pid, 34)}), el('b',{}, toggles[pid] ? toggles[pid] + ': OFF' : PWR.name));
    frame.append(btn);
  }
  const fx = el('div',{class:'pz-fx'});
  for (let i = 0; i < 16; i++){ const leaf = el('span',{class:'pz-leaf ' + (i % 3 === 0 ? 'petal' : 'maple')}); leaf.style.left = (Math.random()*100) + '%'; leaf.style.animationDelay = (-Math.random()*14) + 's'; leaf.style.animationDuration = (9 + Math.random()*8) + 's'; leaf.style.setProperty('--sway', (20 + Math.random()*60) + 'px'); fx.append(leaf); }
  view.after(fx);
  put(me, PZ.pos.x, PZ.pos.y); me.style.transitionDuration = '0s';
  others.forEach(k => draw(k, pzRec(k)));
  requestAnimationFrame(() => camera(PZ.pos.x, PZ.pos.y, false));
  pzPush();
  clearInterval(PZ.beat);
  PZ.beat = setInterval(() => { if (!document.body.contains(world)){ clearInterval(PZ.beat); return; } pzPush(); others.forEach(k => draw(k, pzRec(k))); }, 30000);
  if (!K.pzHello){ K.pzHello = 1; save(); say(`Welcome to Storybrook Square! Tap anywhere to walk. Tap a building to go inside.`); }
}

/* ================= WIZARD MODE (grown-up, this device only) =================
   A hidden third player for testing: everything free and unlocked, either reading track, any level.
   Turned on from Grown-ups › Wizard Mode or by opening the app link with #wizard on the end.
   Kept only on this device (never sent to cloud save), so the kids' iPads never show it. */
function wizardSetup(){
  const W = DB.kids.dev;
  W.placed = true; W.level = W.level || 1;
  if (!W.avatar.base){ W.avatar.base = 'dragon'; }
  if (!W.hero){
    W.hero = { skin:SKIN_TONES[1], hairColor:'#f1f5f9', hairStyle:'short', weapon:'wizard', beard:true, beardColor:'#f1f5f9' };
    W.gear = { owned:{ traveler:GEAR_SLOTS.slice(), archmage:GEAR_SLOTS.slice() }, eq:Object.fromEntries(GEAR_SLOTS.map(s => [s, 'archmage'])) };
    wizardUnlockAll();
  }
  save();
}
function wizardUnlockAll(){
  const W = DB.kids.dev;
  W.gear = W.gear || { owned:{}, eq:{} };
  GEAR_SETS.concat([ARCHMAGE]).forEach(g => W.gear.owned[g.id] = GEAR_SLOTS.slice());
  W.avatar.owned = [...new Set((W.avatar.owned || []).concat(Object.keys(AVATAR_BASES).filter(id => AVATAR_BASES[id].kid), SHOP.map(x => x[1])))];
  W.legendOwned = LEGENDS.map(l => l.id); W.legendSeen = LEGENDS.map(l => l.id);
  W.mythics = MYTHICS.map(m => m.id);
  W.treasures = Object.fromEntries(TREASURES.map(t => [t.id, 3]));
  W.collection = [...new Set(['son','daughter'].flatMap(t => TRACKS[t].rewards.map(r => r[1])))];
  const Wd = (function(){ const keep = K; K = W; try { return worldOf('dev'); } finally { K = keep; } })();
  Wd.themes = Object.keys(WORLD_THEMES);
  save();
}
function screenWizard(){
  stopAll();
  const W = DB.kids.dev, row = (...k) => el('div',{class:'row wiz-row'}, ...k);
  const sec = (title, ...k) => el('div',{class:'card wiz-card'}, el('h3',{}, title), ...k);
  const done = t => { pzToast('🧙 ' + t); beep('star'); };
  const name = el('input',{class:'wiz-input', value: kidName('dev')});
  const levels = T.levels.map((L, i) => el('button',{class:'btn small' + (W.level === i+1 ? '' : ' ghost'), onclick:()=>{ W.level = i+1; W.placed = true; W.passStreak = 0; W.failStreak = 0; W.bossReady = null; awardTrophiesUpTo(i+1); save(); done(`Now at level ${i+1}: ${L.title}`); screenWizard(); }}, String(i+1)));
  const bossBtns = T.levels.map((L, i) => bossFor(i+1) ? el('button',{class:'btn small ghost', onclick:()=>{ W.level = i+1; save(); bossIntro(i+1); }}, `${bossFor(i+1).e} ${i+1}`) : null);
  show(el('div',{class:'screen wizard-screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🧙 Wizard Tools'), el('div')),
    el('p',{class:'subtitle'}, 'Only on this device. Stars and 💫 never run out, every shop item, place, pet, legendary and gear set is unlocked. The kids never see this profile on their iPads.'),
    el('div',{class:'wiz-grid'},
      sec('📚 Reading track',
        row(el('button',{class:'btn small' + (TK === 'daughter' ? '' : ' ghost'), onclick:()=>{ DB.devTrack = 'daughter'; save(); setKid('dev'); done(`${kidName('daughter')}'s track`); screenWizard(); }}, `🐉 ${kidName('daughter')}'s track`),
            el('button',{class:'btn small' + (TK === 'son' ? '' : ' ghost'), onclick:()=>{ DB.devTrack = 'son'; save(); setKid('dev'); done(`${kidName('son')}'s track`); screenWizard(); }}, `🐲 ${kidName('son')}'s track`)),
        el('p',{class:'muted'}, 'Stories, phonics, spelling, bosses and the level guide follow this track.')),
      sec('🎚️ Jump to level', row(...levels), el('p',{class:'muted'}, 'Reading progress, level-locked items and the next boss follow your level.')),
      sec('⚔️ Fight a boss now', row(...bossBtns)),
      sec('🧪 Test things',
        row(el('button',{class:'btn small blue', onclick:()=>{ W.placed = false; save(); screenPlacementIntro(); }}, '📏 Placement test'),
            el('button',{class:'btn small blue', onclick:()=>{ ensureSkillStart(); screenPath(); }}, '🧠 Phonics path'),
            el('button',{class:'btn small blue', onclick:()=>{ beep('tap'); TK === 'daughter' ? startSpellCheck() : startSpelling(); }}, '✏️ Spelling'),
            el('button',{class:'btn small blue', onclick:()=>{ lootReveal((setForLevel(W.level) || SET_BY_ID.ember).id, pick(GEAR_SLOTS), false); }}, '🎁 Gear drop'),
            el('button',{class:'btn small blue', onclick:()=>{ W.chestPity = 999; W.mythics = []; maybeStarfallChest().then(() => wizardUnlockAll()); }}, '🌠 Starfall chest')),
        row(el('button',{class:'btn small blue', onclick:screenChests}, '🎁 Chests'), el('button',{class:'btn small blue', onclick:screenTownHall}, '🏛️ Town Hall quests')),
        row(el('button',{class:'btn small', onclick:()=>{ ['pzWish','pzRiddle','pzWord','pzHigh5','quests'].forEach(k => delete W[k]); W.today = { date:null, ms:0 }; save(); done('Daily rewards reset'); }}, '🔄 Reset daily stuff'),
            el('button',{class:'btn small', onclick:()=>{ wizardUnlockAll(); done('Everything unlocked'); }}, '🔓 Unlock everything again'))),
      sec('🪄 Your wizard',
        row(name, el('button',{class:'btn small', onclick:()=>{ DB.devName = name.value.trim() || 'The Wizard'; if (DB.players.dev) DB.players.dev.name = DB.devName; save(); done('Name saved'); }}, 'Save name')),
        el('p',{class:'muted'}, 'This is the name the kids see on you in Town Square.'),
        row(el('button',{class:'btn small blue', onclick:()=>screenHeroCreate(screenWizard)}, '✏️ Change look'), el('button',{class:'btn small blue', onclick:screenArmory}, '🛡️ Armory'),
            el('button',{class:'btn small blue', onclick:()=>screenWorld()}, '🏗️ My World'), el('button',{class:'btn small blue', onclick:screenTownSquare}, '🏰 Town Square'))),
      sec('⚠️ Wizard profile',
        row(el('button',{class:'btn small gray', onclick:async ()=>{ const ok = await modal(el('div',{}, el('h2',{},'Start the Wizard over?'), el('p',{},'Clears the Wizard\'s reading history and world. The kids\' progress is not touched.')), [['Cancel','gray',false],['Start over','',true]]); if (ok){ DB.kids.dev = freshKid(); DB.kids.dev.avatar = { base:null, owned:[], equipped:{} }; save(); enterKid('dev'); } }}, 'Start over'),
            el('button',{class:'btn small gray', onclick:()=>{ DB.devOn = false; save(); screenProfiles(); }}, 'Hide Wizard on this device')),
        el('p',{class:'muted'}, 'To bring the Wizard back: Grown-ups › Wizard Mode, or open the app link with #wizard at the end.')))));
}

/* ---------- Practice: skills, tricky words and spelling in one place ---------- */
function screenPractice(){
  stopAll();
  const tricky = Object.values(K.words || {}).filter(w => !w.mastered && w.miss).length;
  const card = (e, title, text, label, go, cls) => el('div',{class:'card next-card ' + (cls || '')},
    el('div',{style:'font-size:56px;line-height:1'}, e), el('h2',{}, title), el('p',{}, text), el('button',{class:'btn big blue', onclick:()=>{ beep('tap'); go(); }}, label));
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()},'← Back'), el('h1',{class:'title'},'🎯 Practice'), el('div')),
    el('div',{class:'cards'},
      V2 && K ? (() => { const lm = LM(), placed = !!lm.placedAt, plan = placed ? CURR.planLesson(lm, [], { recent:K.v2recent }) : null;
        return card('🗺️', 'Skill Quest', placed ? (plan.objectives.length ? 'Today: ' + plan.objectives.map(o => o.kid).join(' + ') + '.' : 'Training picked just for you.') : 'Take a quick Reading Check so every quest fits you.',
          placed ? '⚔️ Start Quest' : '🧭 Reading Check', v2Start, 'v2-quest-card'); })() : null,
      card('🧠', 'Skills', 'Sound and word lessons, one step at a time.', '🧠 Skills', () => { ensureSkillStart(); screenPath(); }),
      card('🎯', 'Tricky Words', tricky ? `${tricky} word${tricky === 1 ? '' : 's'} to practice from your reading.` : 'Words you miss while reading show up here.', '🎯 Words', screenWords),
      card('✏️', 'Spelling', TK === 'daughter' ? 'Hear a word, then type it.' : 'Hear a word, then build it with letter tiles.', '✏️ Spell', () => TK === 'daughter' ? startSpellCheck() : startSpelling()))));
}

/* ================= PARENT AREA ================= */
function screenPin(after){
  stopAll();
  let entered = '';
  const dots = el('div',{class:'pin-dots'},'○○○○');
  const msg = el('p',{class:'muted'},'Enter the grown-up PIN');
  const pad = el('div',{class:'pad'});
  const press = d => {
    if (d === '⌫') entered = entered.slice(0,-1); else if (entered.length < 4) entered += d;
    dots.textContent = '●'.repeat(entered.length) + '○'.repeat(4-entered.length);
    if (entered.length === 4){
      if (entered === DB.pin) setTimeout(()=> after ? after() : screenPlayers(), 150);
      else { msg.textContent = 'Not quite. Try again.'; entered = ''; setTimeout(()=>dots.textContent='○○○○', 300); }
    }
  };
  ['1','2','3','4','5','6','7','8','9','','0','⌫'].forEach(d => pad.append(d ? el('button',{onclick:()=>press(d)}, d) : el('div')));
  const back = () => kid && !after ? screenHome() : screenProfiles();
  document.body.className = 'parent';
  show(el('div',{class:'screen center', style:'align-items:center;justify-content:center'},
    el('div',{class:'card', style:'max-width:420px;width:100%;text-align:center'},
      el('h2',{},'🔒 Grown-ups Only'), msg, dots, pad,
      el('button',{class:'btn small gray', style:'margin-top:18px', onclick:back},'Cancel'))));
}

/* Weekly summary for grown-ups: minutes and activities per day, this week vs last week, tricky words,
   and one plain-language suggestion. Minutes come from each session's `ms` (recorded from Nov 2026 on). */
/* ================= PROGRESS REPORT (for grown-ups, by email) =================
   Builds a plain-text report per player for the last 7 days: what's going well, what needs work,
   tricky words, and one tip. Sent from the device with the Share sheet / Mail app. */
function towerReport(k, since){
  const T = k.tower; if (!T || !T.log || !T.log.length) return [];
  const wk = T.log.filter(x => new Date(x.d + 'T12:00') >= since), cleared = wk.filter(x => x.pass).length;
  const byType = {}; wk.filter(x => x.type !== 'guardian').forEach(x => (byType[x.type] = byType[x.type] || []).push(x.acc));
  const speeds = wk.filter(x => x.wcpm).map(x => x.wcpm).reverse();
  return [``, `🗼 Tower of Tales: best floor ${T.best || 0}, difficulty step ${T.diff} of 6`,
    `  • This week: ${wk.length} floor tries, ${cleared} cleared`,
    ...Object.entries(byType).map(([t, a]) => `  • ${FLOOR_TYPES[t] ? FLOOR_TYPES[t].name : t}: ${Math.round(a.reduce((x, y) => x + y, 0) / a.length)}% of words right`),
    ...(speeds.length ? [`  • Speed Runs (words a minute): ${speeds.join(' → ')}`] : [])];
}
function progressReport(id, days = 7){
  const k = DB.kids[id], name = kidName(id), tr = trackOf(id);
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));
  const recent = (k.sessions || []).filter(x => new Date(x.date) >= since);
  const reads = recent.filter(x => x.mode === 'normal' && x.kind === 'story'), minutes = Math.round(recent.reduce((t, x) => t + (x.ms || 0), 0) / 60000);
  const quiz = reads.filter(x => x.quiz).map(x => x.quiz.split('/').map(Number)), qRight = quiz.reduce((t, q) => t + q[0], 0), qAll = quiz.reduce((t, q) => t + q[1], 0);
  const acc = reads.filter(x => x.total && tr === 'son'), accAvg = acc.length ? Math.round(acc.reduce((t, x) => t + x.accuracy, 0) / acc.length) : null;
  const sinceKey = todayStr(since), types = {};
  (k.qlog || []).filter(x => x.d >= sinceKey).forEach(x => { const t = types[x.t] = types[x.t] || [0, 0]; t[1]++; if (x.ok) t[0]++; });
  const typeList = Object.entries(types).map(([t, [r, n]]) => ({ t, r, n, p: Math.round(r / n * 100) }));
  const good = [], work = [];
  typeList.filter(x => x.n >= 3 && x.p >= 80).sort((a, b) => b.p - a.p).forEach(x => good.push(`${x.t}: ${x.r} of ${x.n} right (${x.p}%)`));
  typeList.filter(x => x.n >= 2 && x.p < 65).sort((a, b) => a.p - b.p).forEach(x => work.push(`${x.t}: ${x.r} of ${x.n} right (${x.p}%)`));
  if (accAvg != null) (accAvg >= 92 ? good : work).push(`Reading out loud: ${accAvg}% of words read right`);
  const before = (k.sessions || []).find(x => new Date(x.date) < since), levelUps = before ? k.level - before.level : 0;
  if (levelUps > 0) good.push(`Moved up ${levelUps} level${levelUps > 1 ? 's' : ''} this week (now ${TRACK_INFO[tr].word} ${k.level})`);
  const books = recent.filter(x => x.book).length; if (books) good.push(`Read ${books} chapter${books > 1 ? 's' : ''} of chapter books`);
  const spell = recent.filter(x => x.mode === 'spelling'); if (spell.length){ const r = spell.reduce((t, x) => t + (x.correct || 0), 0), n = spell.reduce((t, x) => t + (x.total || 0), 0); if (n) (r / n >= .8 ? good : work).push(`Spelling: ${r} of ${n} words right`); }
  const missed = {}; recent.forEach(x => (x.missed || []).forEach(w => missed[w] = (missed[w] || 0) + 1));
  const tricky = Object.entries(missed).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, n]) => n > 1 ? `${w} (×${n})` : w);
  const weak = typeList.filter(x => x.n >= 2 && x.p < 65).sort((a, b) => a.p - b.p)[0];
  const TIPS = { 'Main idea': `After a story, ask ${name}: "What was that MOSTLY about, in one sentence?"`,
    "Author's purpose & message": `Ask: "Why do you think the author wrote this? What did they want us to learn?"`,
    'Clues & evidence': `When ${name} answers, ask "How do you know? Show me where it says that."`,
    'Predicting': `Pause before the last page and ask "What do you think will happen next, and why?"`,
    'Order of events': `Have ${name} retell a story using "first, next, then, last."`,
    'Spotting what did NOT happen': `Play "true or false" about a story you read together.`,
    'Word meaning': `When you hit a new word, guess its meaning together from the sentence around it.`,
    'Why & how (inference)': `Ask "why do you think they did that?" about characters in books and shows.`,
    'Story details': `Have ${name} read a little slower and use the story highlighter for important details.` };
  const tip = !recent.length ? `No reading logged this week. A short story at the same time each day builds the habit.` : weak ? TIPS[weak.t] : (qAll && qRight / qAll >= .85 ? `${name} is doing great. Try a longer story or the next chapter book.` : `Keep it up. Short, daily reads beat long, rare ones.`);
  const lines = [
    `📚 ${name} (${TRACK_INFO[tr].name} · ${TRACK_INFO[tr].word} ${k.level})`,
    `This week: ${reads.length} stories, ${minutes} min, ${qAll ? `${qRight}/${qAll} questions right (${Math.round(qRight / qAll * 100)}%)` : 'no quizzes yet'}`,
    ``, `✅ Doing well:`, ...(good.length ? good.map(x => '  • ' + x) : ['  • (not enough answers yet this week)']),
    ``, `🎯 Needs practice:`, ...(work.length ? work.map(x => '  • ' + x) : ['  • Nothing stands out. Nice!']),
    ...(tricky.length ? [``, `🔤 Tricky words: ${tricky.join(', ')}`] : []),
    ...towerReport(k, since),
    ``, `💡 Tip: ${tip}`];
  return { name, good, work, tricky, tip, text: lines.join('\n'), reads: reads.length, minutes, qRight, qAll };
}
function screenReport(){
  stopAll(); document.body.className = 'parent';
  const ids = playerIds(false), reps = ids.map(id => Object.assign({ id }, progressReport(id)));
  const when = new Date().toLocaleDateString(undefined, { month:'short', day:'numeric' });
  const subject = `Storyborne weekly report · ${when}`;
  const body = reps.map(r => r.text).join('\n\n────────────\n\n') + `\n\nSent from Storyborne: Rise of the Readers`;
  const to = DB.reportEmail || DB.familyEmail || '';
  const email = el('input',{type:'email', placeholder:'Your email', value: to, class:'wiz-input', style:'max-width:320px'});
  const msg = el('span',{class:'muted'});
  const send = async () => {
    DB.reportEmail = email.value.trim(); save();
    if (navigator.share){ try { await navigator.share({ title: subject, text: body }); return; } catch(e){ if (e && e.name === 'AbortError') return; } }
    location.href = `mailto:${encodeURIComponent(DB.reportEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const card = r => el('div',{class:'card rep-card'},
    el('h2',{style:'margin-top:0'}, `📚 ${r.name}`),
    el('div',{class:'result-grid'},
      el('div',{class:'stat'}, el('b',{}, r.reads), el('span',{}, 'stories this week')),
      el('div',{class:'stat'}, el('b',{}, r.minutes + ' min'), el('span',{}, 'reading time')),
      el('div',{class:'stat'}, el('b',{}, r.qAll ? Math.round(r.qRight / r.qAll * 100) + '%' : '–'), el('span',{}, 'questions right'))),
    el('h3',{}, '✅ Doing well'), el('ul',{}, ...(r.good.length ? r.good : ['Not enough answers yet this week']).map(x => el('li',{}, x))),
    el('h3',{}, '🎯 Needs practice'), el('ul',{}, ...(r.work.length ? r.work : ['Nothing stands out. Nice!']).map(x => el('li',{}, x))),
    r.tricky.length ? el('p',{}, el('b',{}, '🔤 Tricky words: '), r.tricky.join(', ')) : null,
    ...(() => { const sn = new Date(); sn.setHours(0,0,0,0); sn.setDate(sn.getDate() - 6); const L = towerReport(DB.kids[r.id], sn).filter(Boolean); return L.length ? [el('div',{class:'tw-rep'}, el('h3',{}, L[0]), ...L.slice(1).map(x => el('div',{}, x)))] : []; })(),
    el('p',{class:'week-tip'}, '💡 ' + r.tip));
  show(el('div',{class:'screen', style:'max-width:900px'},
    el('div',{class:'row', style:'justify-content:space-between;margin-bottom:12px'}, el('h1',{style:'margin:0;font-size:28px'}, '📧 Weekly report'), el('button',{class:'btn small', onclick:screenPlayers}, 'Done')),
    el('div',{class:'card'}, el('p',{style:'margin-top:0'}, 'The last 7 days for every player. Send it to yourself by email.'),
      el('div',{class:'row', style:'gap:8px;flex-wrap:wrap'}, email,
        el('button',{class:'btn', onclick:send}, '✉️ Email this report'),
        el('button',{class:'btn small gray', onclick:async ()=>{ try { await navigator.clipboard.writeText(subject + '\n\n' + body); msg.textContent = 'Copied!'; } catch(e){ msg.textContent = 'Could not copy'; } }}, '📋 Copy')), msg),
    ...reps.map(card)));
}

function weeklySummary(which){
  const k = DB.kids[which], name = kidName(which);
  const dayKey = d => todayStr(d);
  const days = Array.from({ length:7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const inRange = (s, from, to) => { const t = new Date(s.date); return t >= from && t < to; };
  const start = n => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - n); return d; };
  const thisWeek = k.sessions.filter(s => inRange(s, start(6), new Date(Date.now() + 1)));
  const lastWeek = k.sessions.filter(s => inRange(s, start(13), start(6)));
  const minutes = list => Math.round(list.reduce((t, s) => t + (s.ms || 0), 0) / 60000);
  const quizAvg = list => { const q = list.filter(s => s.quiz).map(s => { const [c, t] = s.quiz.split('/').map(Number); return c / t; }); return q.length ? Math.round(q.reduce((a, b) => a + b, 0) / q.length * 100) : null; };
  const accAvg = list => { const r = list.filter(s => s.mode === 'normal' && s.total); return r.length ? Math.round(r.reduce((t, s) => t + s.accuracy, 0) / r.length) : null; };
  const stories = list => list.filter(s => s.mode === 'normal' && s.kind === 'story').length;
  const perDay = days.map(d => { const list = k.sessions.filter(s => dayKey(new Date(s.date)) === dayKey(d)); return { d, n: list.length, min: minutes(list) }; });
  const maxMin = Math.max(goalMin(which), ...perDay.map(x => x.min));
  const goalDays = perDay.filter(x => x.min >= goalMin(which)).length;
  const qNow = quizAvg(thisWeek), qBefore = quizAvg(lastWeek), aNow = accAvg(thisWeek);
  const tricky = practiceWords(k).slice(0, 5).map(w => k.words[w].disp || w);
  const arrow = (now, before) => now == null || before == null ? '' : now > before ? ` ▲ up from ${before}%` : now < before ? ` ▼ down from ${before}%` : ' (same as last week)';
  let tip;
  if (!thisWeek.length) tip = `No reading yet this week. A short story at a set time each day (after school or before bed) builds the habit.`;
  else if (qNow != null && qNow < 70) tip = `Questions are the hard part right now. Before answering, ask ${name} to tell you what happened in the story, and encourage highlighting clues.`;
  else if (trackOf(which) === 'son' && aNow != null && aNow < 90) tip = `Some words are tricky. Have ${name} tap 👂 Hear it first, then read the same story again. A second read builds speed and confidence.`;
  else if (goalDays < 4) tip = `${name} met the ${goalMin(which)}-minute goal on ${goalDays} of 7 days. A regular reading time helps the streak grow.`;
  else if (tricky.length >= 3) tip = `Great week! Practice these words together: ${tricky.slice(0, 3).join(', ')}.`;
  else tip = `Great week! ${name} is ready for a challenge. Try a longer story or the next chapter book.`;
  return el('div',{class:'card weekly'},
    el('h2',{}, `📅 ${name}'s week`),
    el('div',{class:'week-bars'}, ...perDay.map(x => el('div',{class:'week-day'},
      el('div',{class:'week-bar-wrap'}, el('div',{class:'week-bar' + (x.min >= goalMin(which) ? ' met' : ''), style:`height:${Math.round(x.min / maxMin * 100)}%`})),
      el('b',{}, x.min + 'm'), el('span',{class:'muted'}, x.d.toLocaleDateString(undefined, { weekday:'short' })), el('span',{class:'muted'}, x.n ? x.n + ' done' : '–')))),
    el('div',{class:'result-grid'},
      el('div',{class:'stat'}, el('b',{}, minutes(thisWeek) + ' min'), el('span',{}, `read this week (goal met ${goalDays}/7 days)`)),
      el('div',{class:'stat'}, el('b',{}, stories(thisWeek)), el('span',{}, `stories & chapters finished (last week ${stories(lastWeek)})`)),
      el('div',{class:'stat'}, el('b',{}, qNow == null ? '–' : qNow + '%'), el('span',{}, 'questions right' + arrow(qNow, qBefore))),
      trackOf(which) === 'son' ? el('div',{class:'stat'}, el('b',{}, aNow == null ? '–' : aNow + '%'), el('span',{}, 'words read right' + arrow(aNow, accAvg(lastWeek)))) : null),
    el('p',{}, el('b',{},'Tricky words: '), tricky.length ? tricky.join(', ') : 'none right now 🎉'),
    el('p',{class:'week-tip'}, '💡 ' + tip));
}

function screenParent(which){
  document.body.className = 'parent';
  CLOUD.editing = which && which !== 'dev' ? which : null;
  if (!which || !DB.kids[which] || !playerOf(which) || playerOf(which).wizard) which = playerIds(false)[0];
  if (!which) return screenPlayers();
  const k = DB.kids[which], track = TRACKS[trackOf(which)];
  const label = kidName(which) + ' (' + TRACK_INFO[trackOf(which)].sub + ')';
  const wizRow = el('div',{class:'card', style:'margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap'}, el('b',{},'🧙 Wizard Mode'),
    el('span',{class:'muted', style:'flex:1'}, 'A secret grown-up player on this device only: everything free, any track or level, for testing.'),
    el('button',{class:'btn small', onclick:()=>{ DB.devOn = true; save(); enterKid('dev'); }}, DB.devOn ? 'Open Wizard' : 'Turn on'));
  const tabs = el('div',{class:'tabs'},
    el('button',{class:'tab players-tab', onclick:()=>screenPlayers()},'👨‍👩‍👧 All players'),
    ...playerIds(false).map(id => el('button',{class:'tab' + (which===id?' active':''), onclick:()=>screenParent(id)}, TRACK_INFO[trackOf(id)].icon + ' ' + kidName(id))));

  const recent = k.sessions.filter(s => s.mode === 'normal').slice(0,10);
  const avg = f => recent.length ? Math.round(recent.reduce((t,s)=>t+(f(s)||0),0)/recent.length) : '–';
  const quizPct = recent.filter(s=>s.quiz).map(s => { const [c,t]=s.quiz.split('/').map(Number); return c/t; });
  const wordRows = Object.entries(k.words).sort((a,b) => (!!a[1].mastered - !!b[1].mastered) || (b[1].miss - a[1].miss));

  const levelSel = el('select',{}, ...track.levels.map(L => { const o = el('option',{value:L.n}, `Level ${L.n}: ${L.title}`); if (L.n === k.level) o.selected = true; return o; }));
  const table = el('table',{}, el('tr',{}, ...['Date','Lvl','Activity','Accuracy','WCPM','Quiz','Missed','🎧'].map(h=>el('th',{},h))));
  k.sessions.slice(0,40).forEach(s => {
    const d = new Date(s.date);
    table.append(el('tr',{},
      el('td',{}, d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})),
      el('td',{}, s.level), el('td',{}, s.title + (s.mode!=='normal' ? ' (warm-up)' : '')),
      el('td',{}, s.accuracy + '%'), el('td',{}, s.wcpm ?? '–'), el('td',{}, s.quiz ?? '–'),
      el('td',{}, (s.missed||[]).slice(0,6).join(', ')),
      el('td',{}, s.hasRec ? el('button',{class:'btn small blue', onclick:ev=>playRec(s.id, ev.currentTarget)},'▶') : '–')));
  });

  const exportBox = el('textarea',{readonly:true});
  const importBox = el('textarea',{placeholder:'Paste exported progress here, then tap Import'});
  const status = el('p',{class:'muted'});

  const s = el('div',{class:'screen', style:'max-width:1000px'},
    el('div',{class:'row', style:'justify-content:space-between;margin-bottom:12px'},
      el('h1',{style:'margin:0;font-size:30px'},'Grown-up Dashboard'),
      el('button',{class:'btn small', onclick:()=>{ document.body.className=''; kid ? (setKid(kid), screenHome()) : screenProfiles(); }},'Done')),
    wizRow,
    tabs,
    weeklySummary(which),
    el('div',{class:'card'},
      el('h2',{}, label),
      el('div',{class:'result-grid'},
        el('div',{class:'stat'}, el('b',{}, k.placed ? k.level + '/' + track.levels.length : 'Not placed'), el('span',{},'current level')),
        el('div',{class:'stat'}, el('b',{}, avg(s=>s.accuracy) + (recent.length?'%':'')), el('span',{},'avg accuracy (last 10)')),
        el('div',{class:'stat'}, el('b',{}, trackOf(which)==='daughter' || k.level>=4 ? avg(s=>s.wcpm) : '–'), el('span',{},'avg words/min')),
        el('div',{class:'stat'}, el('b',{}, quizPct.length ? Math.round(quizPct.reduce((a,b)=>a+b,0)/quizPct.length*100)+'%' : '–'), el('span',{},'avg quiz score')),
        el('div',{class:'stat'}, el('b',{}, k.passStreak + ' / ' + k.failStreak), el('span',{},'pass / struggle streak')),
        el('div',{class:'stat'}, el('b',{}, k.streak.count||0), el('span',{},'day streak'))),
      el('p',{class:'muted'}, `Stars earned ${k.stars} · spent ${k.spent||0} · 💫 Cosmic ${(k.cosmic||0)-(k.cosmicSpent||0)} (earned ${k.cosmic||0}) · trophies ${k.trophies.length}/${track.levels.length} · badges ${k.badges.length}/${BADGES.length} · collection ${k.collection.length}/${track.rewards.length}`),
      (() => { let bk = null; try { bk = JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}')[which]; } catch(e){}
        if (!bk || bk.score <= kidScore(k)) return null;
        return el('div',{class:'banner', style:'margin:8px 0'}, `💾 This iPad has a better saved copy of ${kidName(which)}: level ${bk.level}, ${bk.reads} reads (${new Date(bk.at).toLocaleDateString()}). `,
          el('button',{class:'btn small', onclick:async ()=>{ const ok = await modal(el('div',{}, el('h2',{}, 'Restore saved progress?'), el('p',{}, `Brings back ${kidName(which)}'s level ${bk.level}, buddy, stars, items and reading history from that copy, and keeps anything newer.`)), [['Cancel','gray',false],['Restore','',true]]);
            if (!ok) return; DB.kids[which] = Object.assign(freshKid(), mergeKid(DB.kids[which], JSON.parse(bk.json), false)); CLOUD.editing = which; CLOUD.dirty[which] = true; save(); screenParent(which); }}, '↩️ Restore')); })(),
      (DB.backup || {})[which] ? el('div',{class:'banner', style:'margin:8px 0'}, `💾 A copy of ${kidName(which)}'s earlier progress (level ${DB.backup[which].level}, saved ${new Date(DB.backup[which].at).toLocaleDateString()}) is on this iPad. `,
        el('button',{class:'btn small', onclick:async ()=>{ const ok = await modal(el('div',{}, el('h2',{}, 'Restore earlier progress?'), el('p',{}, `Puts ${kidName(which)} back to level ${DB.backup[which].level} with that copy's stars, world and history.`)), [['Cancel','gray',false],['Restore','',true]]);
          if (!ok) return; DB.kids[which] = Object.assign(freshKid(), JSON.parse(DB.backup[which].json)); delete DB.backup[which]; CLOUD.editing = which; CLOUD.dirty[which] = true; save(); screenParent(which); }}, '↩️ Restore')) : null,
      el('h3',{},'Level controls'),
      el('div',{class:'row'}, levelSel,
        el('button',{class:'btn small blue', onclick:()=>{ if (+levelSel.value < k.level) k.resetAt = Date.now(); k.level = +levelSel.value; k.placed = true; k.passStreak = 0; k.failStreak = 0; CLOUD.editing = which; save(); status.textContent = 'Level set to ' + k.level + '.'; screenParent(which); }},'Set level'),
        el('button',{class:'btn small gray', onclick:()=>{ k.placed = false; save(); status.textContent = 'Placement check will run next time.'; }},'Redo placement check'),
        el('button',{class:'btn small gray', onclick:()=>{ k.avatar.base = null; save(); status.textContent = 'They\'ll pick a new buddy next time they open the app. Shop items stay.'; }},'Let them re-pick buddy'),
        el('button',{class:'btn small red', onclick:async()=>{
          const ok = await modal(el('div',{}, el('h2',{},'Reset all progress?'), el('p',{},`This erases ${label}'s levels, stars, collection and history on this iPad.`)), [['Cancel','gray',false],['Reset','red',true]]);
          if (ok){ DB.kids[which] = Object.assign(freshKid(), { resetAt: Date.now() }); CLOUD.editing = which; save(); idb.clear(which + '_'); screenParent(which); }
        }},'Reset progress')),
      status),
    el('div',{class:'card'},
      el('h2',{},'⚔️ Bosses & 📚 Real Books'),
      el('p',{class:'muted'}, 'Boss battles: ' + (Object.entries(k.bossLog||{}).map(([lv, r]) => `${(BOSSES[which][lv]||{}).e || ''} L${lv}: ${r.wins ? '✅ beaten' : '❌ not yet'} (${r.tries} tr${r.tries === 1 ? 'y' : 'ies'})`).join(' · ') || 'none yet') + (k.bossReady ? ` · Boss waiting at level ${k.bossReady}` : '')),
      (k.realBooks||[]).length ? el('table',{}, el('tr',{}, ...['Date','Book','Rating','What they said'].map(h => el('th',{}, h))),
        ...k.realBooks.slice().reverse().map(b => el('tr',{}, el('td',{}, b.date), el('td',{}, b.cover + ' ' + b.title), el('td',{}, '⭐'.repeat(b.rating||0)), el('td',{style:'font-size:14px'}, b.retell || '—'))))
        : el('p',{class:'muted'}, 'No real books logged yet.')),
    el('div',{class:'card'},
      el('h2',{},'Word tracker'),
      el('p',{class:'muted'}, `Every missed or helped word is tracked. A word is mastered after it's read right ${MASTER_STREAK} times in a row (in stories or practice). ${practiceWords(k).length} to practice · ${masteredWords(k).length} mastered.`),
      wordRows.length ? el('div',{style:'overflow-x:auto;max-height:420px;overflow-y:auto'}, el('table',{},
        el('tr',{}, ...['Word','Times missed','Right in a row','Status','Last missed',''].map(h=>el('th',{},h))),
        ...wordRows.map(([w,r]) => el('tr',{},
          el('td',{style:'font-weight:600;font-size:18px'}, r.disp||w), el('td',{}, r.miss), el('td',{}, r.streak + ' / ' + MASTER_STREAK),
          el('td',{}, r.mastered ? '✅ mastered ' + r.mastered : '🎯 practicing'), el('td',{}, r.last || '–'),
          el('td',{}, el('button',{class:'btn small gray', onclick:()=>{ delete k.words[w]; save(); screenParent(which); }},'Remove')))))) : el('p',{class:'muted'},'No missed words yet.'),
      el('div',{class:'row', style:'margin-top:10px'},
        (()=>{ const i = el('input',{type:'text', placeholder:'Add a word to practice'}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const inp = ev.currentTarget.previousSibling; const w = norm(inp.value); if (w){ k.words[w] = k.words[w] || { miss:0, streak:0, mastered:null, last:null, disp:inp.value.trim() }; k.words[w].mastered = null; save(); screenParent(which); } }},'Add word'))),
    el('div',{class:'card'}, el('h2',{},'Reading history'), k.sessions.length ? el('div',{style:'overflow-x:auto'}, table) : el('p',{class:'muted'},'No sessions yet.')),
    el('div',{class:'card'},
      el('h2',{},'Settings (this iPad)'),
      el('label',{class:'toggle'}, (()=>{ const c = el('input',{type:'checkbox'}); c.checked = !!DB.record; c.onchange = () => { DB.record = c.checked; save(); }; return c; })(),
        'Save audio recordings of reading (keep this OFF on iPads: recording at the same time makes the iPad hear kids worse)'),
      el('label',{class:'toggle'}, (()=>{ const c = el('input',{type:'checkbox'}); c.checked = !!DB.forceManual; c.onchange = () => { DB.forceManual = c.checked; save(); }; return c; })(),
        'Grown-up scoring mode (you tap missed words instead of the app listening)'),
      el('p',{class:'muted'}, 'Listening available in this browser: ' + (srSupported ? 'yes ✅' : 'no ❌ (open in Safari from an https:// address)')),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const sel = el('select',{style:'max-width:100%'},
          el('option',{value:''},'Reading voice: best available (auto)'),
          ...englishVoices().map(v => el('option',{value:v.name}, v.name + ' (' + v.lang + ')')));
          sel.value = DB.voiceName || ''; sel.onchange = () => { DB.voiceName = sel.value || null; save(); pickVoice(); say('Hi! This is how I will sound when I read to you.'); }; return sel; })(),
        el('button',{class:'btn small blue', onclick:()=>{ pickVoice(); say('Hi! This is how I will sound when I read to you.'); }},'🔊 Test voice')),
      el('p',{class:'muted'}, 'Now using: ' + (voice ? voice.name : 'device default') + '. For the most natural voice on iPad: Settings › Accessibility › Spoken Content › Voices › English, download an "Enhanced" or "Premium" voice (like Ava or Zoe), then pick it here.'),
      el('div',{class:'row'}, (()=>{ const i = el('input',{type:'text', value: kidName(which)}); i.onchange = () => { if (i.value.trim()){ playerOf(which).name = i.value.trim(); if (DB.names[which]) DB.names[which] = i.value.trim(); save(); savePlayerMeta && savePlayerMeta(which); } }; return i; })(), el('span',{class:'muted'},'Name shown in the app')),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const i = el('input',{type:'number', min:'5', max:'60', step:'5', value: goalMin(which), style:'width:110px'});
          i.onchange = () => { const v = Math.max(5, Math.min(60, parseInt(i.value, 10) || 10)); DB.goalMin = Object.assign({}, DB.goalMin, { [which]: v }); i.value = v; save(); }; return i; })(),
        el('span',{class:'muted'}, `Daily reading goal in minutes for ${kidName(which)} (the day streak grows when it's reached)`)),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const i = el('input',{type:'text', value: CAT}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const v = ev.currentTarget.previousSibling.value.trim().replace(/[^A-Za-z' -]/g,''); if (v){ DB.catName = v[0].toUpperCase() + v.slice(1); save(); location.reload(); } }},'Rename the cat'),
        el('span',{class:'muted'},`Miles's story cat (now "${CAT}") — renames him in every story`)),
      el('div',{class:'row', style:'margin-top:8px'}, (()=>{ const sel = el('select',{},
          el('option',{value:''},'Ask who\'s reading (show everyone)'),
          ...playerIds(false).map(id => el('option',{value:id},'Always open ' + kidName(id))));
          sel.value = DB.pinKid || ''; sel.onchange = () => { DB.pinKid = sel.value || null; save(); }; return sel; })(),
        el('span',{class:'muted'},'When this iPad opens the app')),
      el('div',{class:'row', style:'margin:8px 0'}, (()=>{ const i = el('input',{type:'number', placeholder:'Bonus stars', style:'width:150px'}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const v = parseInt(ev.currentTarget.previousSibling.value,10); if (v){ k.stars += v; save(); screenParent(which); } }},'Give stars'),
        el('button',{class:'btn small', onclick:ev=>{ const v = parseInt(ev.currentTarget.previousSibling.previousSibling.value,10); if (v){ k.cosmic = (k.cosmic||0) + v; save(); screenParent(which); } }},'Give 💫 Cosmic')),
      el('div',{class:'row'}, (()=>{ const i = el('input',{type:'number', placeholder:'New 4-digit PIN', inputmode:'numeric'}); return i; })(),
        el('button',{class:'btn small blue', onclick:ev=>{ const v = ev.currentTarget.previousSibling.value.trim(); if (/^\d{4}$/.test(v)){ DB.pin = v; save(); status.textContent = 'PIN changed.'; ev.currentTarget.previousSibling.value=''; } else status.textContent = 'PIN must be 4 digits.'; }},'Change PIN'))),
    el('div',{class:'card'},
      el('h2',{},'Back up / move progress'),
      el('p',{class:'muted'},'Progress lives on each iPad. Export here, then Import on another device to copy it over. (Recordings stay on this iPad.)'),
      el('div',{class:'row'},
        el('button',{class:'btn small blue', onclick:()=>{ exportBox.value = JSON.stringify(DB); exportBox.select?.(); }},'Show export'),
        el('button',{class:'btn small blue', onclick:async()=>{ exportBox.value = JSON.stringify(DB); try { await navigator.clipboard.writeText(exportBox.value); status2.textContent = 'Copied to clipboard ✅'; } catch(e){ status2.textContent = 'Copy blocked here. Select the text below and copy it.'; } }},'Copy'),
        el('button',{class:'btn small blue', onclick:()=>{ try { const b = new Blob([JSON.stringify(DB,null,1)],{type:'application/json'}); const a = el('a',{href:URL.createObjectURL(b), download:'reading-quest-progress-' + todayStr() + '.json'}); document.body.append(a); a.click(); a.remove(); status2.textContent='Download started (if your browser allows it).'; } catch(e){ status2.textContent='Download not allowed here; use Copy.'; } }},'Download file')),
      exportBox,
      el('h3',{},'Import'),
      importBox,
      el('div',{class:'row'},
        el('button',{class:'btn small green', onclick:()=>doImport(importBox.value)},'Import pasted text'),
        (()=>{ const f = el('input',{type:'file', accept:'.json,application/json'}); f.onchange = async () => { if (f.files[0]) doImport(await f.files[0].text()); }; return f; })()),
      (status2 = el('p',{class:'muted'}))));
  show(s);
  function doImport(txt){
    try { const d = JSON.parse(txt); if (!d.kids) throw 0; DB = Object.assign(load(), d); for (const kk of Object.keys(DB.players)) if (d.kids[kk]) DB.kids[kk] = Object.assign(freshKid(), d.kids[kk]); save(); status2.textContent = 'Imported ✅'; setTimeout(()=>screenParent(which), 600); }
    catch(e){ status2.textContent = 'That doesn\'t look like a Storyborne export.'; }
  }
}
let status2 = null;
let playing = null;
async function playRec(id, btn){
  if (playing){ playing.pause(); playing = null; btn.textContent = '▶'; return; }
  const clips = await idb.get(id);
  if (!clips || !clips.length){ btn.textContent = 'n/a'; return; }
  let i = 0; btn.textContent = '⏹';
  const next = () => {
    if (i >= clips.length){ playing = null; btn.textContent = '▶'; return; }
    const au = new Audio(URL.createObjectURL(clips[i++])); playing = au;
    au.onended = next; au.play().catch(()=>{ btn.textContent = '▶'; playing = null; });
  };
  next();
}

/* If something breaks, show a small note with the error so a grown-up can report it (instead of a dead button). */
function showErr(msg){
  if (document.querySelector('.err-note')) return;
  const n = el('div',{class:'err-note', onclick:()=>n.remove()}, '⚠️ Oops, something went wrong. Tap to close. Details for Dad: ' + String(msg).slice(0, 160));
  document.body.append(n); setTimeout(() => n.remove(), 15000);
}
window.addEventListener('error', e => showErr((e.message || 'error') + (e.lineno ? ' @' + e.lineno : '')));
window.addEventListener('unhandledrejection', e => showErr(e.reason && (e.reason.message || e.reason)));

/* ================= TITLE SCREEN =================
   An epic opening vista (original art): a lone hero on a cliff at sunrise, a far-off academy castle,
   a floating island with a waterfall, a dragon gliding through golden clouds, and the glowing
   Storyborne crest. Tap anywhere to begin. Shown once per visit; the app loads underneath. */
function titleSceneSVG(night){
  const N = (day, nite) => night ? nite : day;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cloud = (x, y, s, o, cls) => `<g class="${cls}" opacity="${o}" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="160" ry="54" fill="url(#tsCloud)"/><ellipse cx="-90" cy="-26" rx="90" ry="58" fill="url(#tsCloud)"/>
    <ellipse cx="40" cy="-52" rx="110" ry="74" fill="url(#tsCloud)"/><ellipse cx="140" cy="-14" rx="80" ry="48" fill="url(#tsCloud)"/></g>`;
  const ridge = (pts, fill, op = 1) => `<path d="M0 1000 L${pts} L1600 1000Z" fill="${fill}" opacity="${op}"/>`;
  const pts = (base, amp, step, seed) => { const a = []; let k = seed; for (let x = 0; x <= 1600; x += step){ k = (k * 9301 + 49297) % 233280; a.push(`${x} ${Math.round(base - (k / 233280) * amp)}`); } return a.join(' L'); };
  const sparks = [...Array(26)].map((_, i) => `<circle class="ts-mote" cx="${rnd(40, 1560)}" cy="${rnd(620, 980)}" r="${rnd(1.6, 4)}" fill="${i % 3 ? N('#fde68a', '#bae6fd') : '#a5f3fc'}" style="animation-delay:-${rnd(0, 9).toFixed(1)}s;animation-duration:${rnd(7, 13).toFixed(1)}s"/>`).join('');
  const rays = [...Array(14)].map((_, i) => `<path d="M0 0 L${-26} -1300 L26 -1300Z" transform="rotate(${-70 + i * 10.5})" fill="${N('#fff7d6', '#cfe3f5')}" opacity="${(i % 2 ? .05 : .09) * N(1, .5)}"/>`).join('');
  return `<svg class="ts-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tsSky" x1="0" y1="0" x2="0" y2="1">${N(`<stop offset="0" stop-color="#1e1b4b"/><stop offset=".32" stop-color="#4c3b8f"/><stop offset=".55" stop-color="#c2669b"/><stop offset=".72" stop-color="#f6a85e"/><stop offset=".86" stop-color="#ffe2a3"/>`, `<stop offset="0" stop-color="#050b1a"/><stop offset=".35" stop-color="#13243d"/><stop offset=".62" stop-color="#2d4a5e"/><stop offset=".85" stop-color="#6b8a96"/>`)}</linearGradient>
    <radialGradient id="tsSun" cx="${N(1040, 520)}" cy="${N(470, 130)}" r="420" gradientUnits="userSpaceOnUse">${N(`<stop offset="0" stop-color="#fffbe8"/><stop offset=".12" stop-color="#fff1b8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffcf7a" stop-opacity=".45"/><stop offset="1" stop-color="#ff9a5a" stop-opacity="0"/>`, `<stop offset="0" stop-color="#f8fbff" stop-opacity=".9"/><stop offset=".15" stop-color="#cfe3f5" stop-opacity=".5"/><stop offset=".5" stop-color="#7fa6c4" stop-opacity=".16"/><stop offset="1" stop-color="#7fa6c4" stop-opacity="0"/>`)}</radialGradient>
    <radialGradient id="tsCloud" cx=".4" cy=".25" r=".9">${N(`<stop offset="0" stop-color="#fff6dc"/><stop offset=".45" stop-color="#f7c99a"/><stop offset="1" stop-color="#9a6aa8"/>`, `<stop offset="0" stop-color="#e2ecf4"/><stop offset=".5" stop-color="#8ea5b8"/><stop offset="1" stop-color="#3a4d63"/>`)}</radialGradient>
    <linearGradient id="tsFar" x1="0" y1="0" x2="0" y2="1">${N(`<stop offset="0" stop-color="#8c7bb8"/><stop offset="1" stop-color="#d9a7b5"/>`, `<stop offset="0" stop-color="#3b5170"/><stop offset="1" stop-color="#5f7d92"/>`)}</linearGradient>
    <linearGradient id="tsMid" x1="0" y1="0" x2="0" y2="1">${N(`<stop offset="0" stop-color="#4f4a8a"/><stop offset="1" stop-color="#7a6aa0"/>`, `<stop offset="0" stop-color="#24344d"/><stop offset="1" stop-color="#3a5068"/>`)}</linearGradient>
    <linearGradient id="tsNear" x1="0" y1="0" x2="0" y2="1">${N(`<stop offset="0" stop-color="#2a2f5e"/><stop offset="1" stop-color="#1d2244"/>`, `<stop offset="0" stop-color="#16213a"/><stop offset="1" stop-color="#0d1526"/>`)}</linearGradient>
    <linearGradient id="tsRock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3350"/><stop offset=".6" stop-color="#181528"/><stop offset="1" stop-color="#0c0a16"/></linearGradient>
    <linearGradient id="tsFall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#e0f2fe" stop-opacity="0"/></linearGradient>
    <linearGradient id="tsMist" x1="0" y1="0" x2="0" y2="1">${N(`<stop offset="0" stop-color="#ffd9b0" stop-opacity="0"/><stop offset=".5" stop-color="#ffd9b0" stop-opacity=".55"/><stop offset="1" stop-color="#ffd9b0" stop-opacity="0"/>`, `<stop offset="0" stop-color="#dbe8f0" stop-opacity="0"/><stop offset=".5" stop-color="#dbe8f0" stop-opacity=".5"/><stop offset="1" stop-color="#dbe8f0" stop-opacity="0"/>`)}</linearGradient>
    <filter id="tsBlur"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="tsGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1600" height="1000" fill="url(#tsSky)"/>
  ${[...Array(night ? 90 : 40)].map(() => `<circle cx="${rnd(0, 1600)}" cy="${rnd(0, night ? 420 : 260)}" r="${rnd(.8, 2)}" fill="#fff" opacity="${rnd(.3, .9).toFixed(2)}" class="ts-twinkle" style="animation-delay:-${rnd(0, 4).toFixed(1)}s"/>`).join('')}
  <g class="ts-rays" transform="translate(${N(1040, 520)} ${N(470, 130)})">${rays}</g>
  <circle cx="${N(1040, 520)}" cy="${N(470, 130)}" r="420" fill="url(#tsSun)"/>
  ${N(`<circle cx="1040" cy="470" r="46" fill="#fffdf2" filter="url(#tsGlow)"/>`, `<circle cx="520" cy="130" r="52" fill="#f4f8ff" filter="url(#tsGlow)"/><circle cx="504" cy="118" r="10" fill="#d8e3ef" opacity=".7"/><circle cx="540" cy="144" r="7" fill="#d8e3ef" opacity=".6"/>`)}
  ${cloud(260, 300, 1.4, .85, 'ts-drift1')}${cloud(1380, 250, 1.2, .8, 'ts-drift2')}${cloud(760, 190, .9, .7, 'ts-drift1')}
  <!-- floating island with a waterfall -->
  <g class="ts-float" transform="translate(1400 520) scale(.85)">
    <path d="M-120 0 Q-110 -24 -60 -30 Q0 -40 60 -30 Q120 -22 124 0 Q90 30 60 70 Q30 120 0 150 Q-20 110 -50 80 Q-90 40 -120 0Z" fill="#5b4a7a"/>
    <path d="M-120 0 Q-110 -24 -60 -30 Q0 -40 60 -30 Q120 -22 124 0 Q60 10 0 8 Q-60 10 -120 0Z" fill="#6aa86e"/>
    <path d="M-70 -30 q4 -46 14 -40 q8 -30 22 0 q10 -6 10 40z" fill="#4a8a5a"/><path d="M40 -30 q2 -36 12 -32 q8 -22 18 2 q6 0 6 30z" fill="#3e7a4e"/>
    <path d="M-20 -32 v-50 l20 -24 l20 24 v50z" fill="#d6c4e8"/><path d="M-20 -82 l20 -40 l20 40z" fill="#7c3aed"/><rect x="-6" y="-66" width="12" height="16" rx="6" fill="#fde68a" filter="url(#tsGlow)"/>
    <rect x="70" y="4" width="16" height="230" fill="url(#tsFall)" class="ts-fall"/>
  </g>
  <!-- far mountains -->
  ${ridge(pts(620, 170, 80, 7), 'url(#tsFar)', .9)}
  <!-- the academy castle on a far hill -->
  <g transform="translate(660 530) scale(1.15)" class="ts-castle">
    <path d="M-160 120 Q-60 40 0 50 Q80 40 180 120Z" fill="${N('#7a6aa0', '#34465f')}"/>
    <g fill="${N('#5a4f88', '#26324a')}">
      <rect x="-90" y="-10" width="40" height="90"/><path d="M-96 -10 l26 -60 l26 60z"/>
      <rect x="-40" y="-70" width="50" height="150"/><path d="M-48 -70 l33 -90 l33 90z"/>
      <rect x="20" y="-30" width="44" height="110"/><path d="M14 -30 l28 -70 l28 70z"/>
      <rect x="74" y="0" width="34" height="80"/><path d="M68 0 l23 -50 l23 50z"/>
      <rect x="-120" y="30" width="250" height="50"/>
    </g>
    <g fill="#ffd77a" filter="url(#tsGlow)"><rect x="-22" y="-40" width="10" height="16" rx="5"/><rect x="-74" y="20" width="8" height="12" rx="4"/><rect x="38" y="0" width="8" height="12" rx="4"/><rect x="86" y="24" width="7" height="10" rx="3"/><circle cx="-15" cy="-160" r="5"/></g>
  </g>
  <rect x="0" y="560" width="1600" height="160" fill="url(#tsMist)" class="ts-mist"/>
  ${ridge(pts(720, 140, 60, 21), 'url(#tsMid)')}
  ${cloud(1100, 700, 1.6, .55, 'ts-drift2')}
  ${ridge(pts(830, 90, 45, 3), 'url(#tsNear)')}
  <!-- a dragon gliding across the sky -->
  <g class="ts-dragon"><g transform="scale(.9)">
    <path d="M0 0 Q30 -8 60 0 Q80 4 96 -4 Q88 8 70 10 Q40 14 10 8 Q-30 10 -60 24 Q-34 4 0 0Z" fill="#2a2140"/>
    <path class="ts-wing" d="M30 0 Q10 -60 -40 -80 Q0 -40 -6 -10Z M40 2 Q70 -50 120 -60 Q84 -24 70 4Z" fill="#2a2140"/>
  </g></g>
  <g fill="#2a2140" class="ts-birds"><path d="M0 0 q8 -6 16 0 q8 -6 16 0 q-8 -2 -16 3 q-8 -5 -16 -3z" transform="translate(560 360)"/><path d="M0 0 q6 -5 12 0 q6 -5 12 0 q-6 -2 -12 2 q-6 -4 -12 -2z" transform="translate(600 390)"/><path d="M0 0 q6 -5 12 0 q6 -5 12 0 q-6 -2 -12 2 q-6 -4 -12 -2z" transform="translate(530 395)"/></g>
  <!-- the foreground cliff and the hero -->
  <path d="M0 1000 L0 700 Q60 660 140 650 L260 632 Q330 628 380 660 Q430 700 470 780 Q520 880 560 1000Z" fill="url(#tsRock)"/>
  <path d="M140 650 L260 632 Q330 628 380 660 L370 676 Q300 660 230 668 Q170 676 120 690Z" fill="#4a4266" opacity=".7"/>
  <g transform="translate(320 646) scale(1.75)">
    <ellipse cx="0" cy="0" rx="40" ry="7" fill="#000" opacity=".35"/>
    <path class="ts-cape" d="M-14 -96 Q-34 -50 -40 -6 Q-20 2 -6 -4 Q2 -40 10 -92Z" fill="#7f1d1d"/>
    <path d="M-12 -4 L-8 -46 L-2 -46 L-4 -4Z M4 -4 L4 -46 L10 -46 L12 -4Z" fill="#1a1426"/>
    <path d="M-14 -50 Q-16 -96 0 -100 Q16 -96 14 -50Z" fill="#1f1830"/>
    <circle cx="0" cy="-112" r="13" fill="#1f1830"/><path d="M-12 -118 q6 -14 18 -10 q10 4 8 14 q-6 -6 -14 -6 q-8 0 -12 2z" fill="#3b2a1a"/>
    <path d="M14 -84 L34 -60 L38 -64 L18 -88Z" fill="#1f1830"/>
    <g class="ts-sword"><path d="M36 -62 L84 -150 L88 -146 L42 -58Z" fill="#e0f2fe" filter="url(#tsGlow)"/><path d="M30 -66 L46 -56" stroke="#facc15" stroke-width="5" stroke-linecap="round"/></g>
    <path d="M-22 -80 Q-34 -66 -30 -48 L-22 -50 Q-24 -64 -14 -74Z" fill="#1f1830"/>
    <g class="ts-shield"><circle cx="-14" cy="-72" r="22" fill="#2a2140" stroke="#c99a3a" stroke-width="4"/><circle cx="-14" cy="-72" r="14" fill="#3a2f5a" stroke="#8a6a2a" stroke-width="2"/>
      <path d="M-14 -82 L-11 -75 L-4 -72 L-11 -69 L-14 -62 L-17 -69 L-24 -72 L-17 -75Z" fill="#f6c453"/><circle cx="-14" cy="-72" r="2.5" fill="#fff7cc"/></g>
  </g>
  ${sparks}
  <rect width="1600" height="1000" fill="url(#tsMist)" opacity=".25" class="ts-mist2"/>
</svg>`;
}

/* the second title scene: a moonlit, misty academy on a crag, a robed young wizard with a glowing wand */
function moonSceneSVG(){
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pts = (base, amp, step, seed) => { const a = []; let k = seed; for (let x = 0; x <= 1600; x += step){ k = (k * 9301 + 49297) % 233280; a.push(`${x} ${Math.round(base - (k / 233280) * amp)}`); } return a.join(' L'); };
  const ridge = (p, fill, op = 1) => `<path d="M0 1000 L${p} L1600 1000Z" fill="${fill}" opacity="${op}"/>`;
  const cloud = (x, y, s, o, cls) => `<g class="${cls}" opacity="${o}" transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="170" ry="50" fill="url(#msCloud)"/><ellipse cx="-90" cy="-22" rx="90" ry="52" fill="url(#msCloud)"/>
    <ellipse cx="50" cy="-46" rx="110" ry="66" fill="url(#msCloud)"/><ellipse cx="150" cy="-10" rx="80" ry="44" fill="url(#msCloud)"/></g>`;
  // a tall gothic tower: body, pointed roof, lit windows
  const tower = (x, base, w, h, roof, lit = 2) => {
    let s = `<rect x="${x - w/2}" y="${base - h}" width="${w}" height="${h}" fill="#2b3550"/><path d="M${x - w/2 - 6} ${base - h} L${x} ${base - h - roof} L${x + w/2 + 6} ${base - h}Z" fill="#1f2840"/>`;
    for (let i = 0; i < lit; i++) s += `<rect x="${x - 4}" y="${base - h + 18 + i * 34}" width="8" height="14" rx="4" fill="#ffd27a" filter="url(#msGlow)" class="ms-win" style="animation-delay:-${rnd(0, 5).toFixed(1)}s"/>`;
    return s;
  };
  const motes = [...Array(30)].map((_, i) => `<circle class="ts-mote" cx="${rnd(40, 1560)}" cy="${rnd(600, 980)}" r="${rnd(1.4, 3.6)}" fill="${i % 3 ? '#bae6fd' : '#fde68a'}" style="animation-delay:-${rnd(0, 9).toFixed(1)}s;animation-duration:${rnd(8, 14).toFixed(1)}s"/>`).join('');
  return `<svg class="ts-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="msSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b1a"/><stop offset=".35" stop-color="#13243d"/><stop offset=".65" stop-color="#2d4a5e"/><stop offset=".85" stop-color="#6b8a96"/></linearGradient>
    <radialGradient id="msMoonGlow" cx="1180" cy="230" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8fbff" stop-opacity=".9"/><stop offset=".15" stop-color="#cfe3f5" stop-opacity=".55"/><stop offset=".5" stop-color="#7fa6c4" stop-opacity=".18"/><stop offset="1" stop-color="#7fa6c4" stop-opacity="0"/></radialGradient>
    <radialGradient id="msCloud" cx=".4" cy=".2" r=".9"><stop offset="0" stop-color="#e2ecf4"/><stop offset=".5" stop-color="#8ea5b8"/><stop offset="1" stop-color="#3a4d63"/></radialGradient>
    <linearGradient id="msMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dbe8f0" stop-opacity="0"/><stop offset=".5" stop-color="#dbe8f0" stop-opacity=".6"/><stop offset="1" stop-color="#dbe8f0" stop-opacity="0"/></linearGradient>
    <linearGradient id="msRock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c3346"/><stop offset=".6" stop-color="#121826"/><stop offset="1" stop-color="#070a12"/></linearGradient>
    <linearGradient id="msCrag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4760"/><stop offset="1" stop-color="#1a2234"/></linearGradient>
    <radialGradient id="msWand"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#a5f3fc"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
    <filter id="msGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1600" height="1000" fill="url(#msSky)"/>
  ${[...Array(70)].map(() => `<circle cx="${rnd(0, 1600)}" cy="${rnd(0, 420)}" r="${rnd(.6, 1.9)}" fill="#fff" opacity="${rnd(.3, 1).toFixed(2)}" class="ts-twinkle" style="animation-delay:-${rnd(0, 4).toFixed(1)}s"/>`).join('')}
  <circle cx="1180" cy="230" r="360" fill="url(#msMoonGlow)"/>
  <circle cx="1180" cy="230" r="62" fill="#f4f8ff"/><circle cx="1160" cy="214" r="12" fill="#d8e3ef" opacity=".7"/><circle cx="1204" cy="246" r="8" fill="#d8e3ef" opacity=".6"/><circle cx="1188" cy="206" r="5" fill="#d8e3ef" opacity=".6"/>
  ${cloud(1300, 330, 1.3, .55, 'ts-drift2')}${cloud(300, 220, 1.5, .5, 'ts-drift1')}
  ${ridge(pts(640, 200, 70, 11), '#2a3a52', .85)}
  <!-- the academy on its crag -->
  <g class="ts-castle" transform="translate(0 20)">
    <path d="M560 1000 L600 640 Q640 560 700 540 L760 470 Q800 440 850 452 L940 470 Q1010 470 1050 520 L1110 600 L1150 1000Z" fill="url(#msCrag)"/>
    <path d="M640 600 Q700 560 760 560 M980 520 Q1040 560 1080 620" stroke="#4d5d7a" stroke-width="4" fill="none" opacity=".6"/>
    ${tower(700, 560, 46, 170, 90, 3)}${tower(760, 500, 40, 120, 70, 2)}
    <rect x="690" y="430" width="300" height="80" fill="#26304a"/>
    ${tower(840, 470, 64, 260, 130, 5)}${tower(910, 470, 42, 170, 92, 3)}${tower(970, 490, 50, 210, 110, 4)}${tower(1040, 540, 38, 140, 76, 2)}
    <rect x="700" y="450" width="360" height="12" fill="#1c2438"/>
    ${[...Array(9)].map((_, i) => `<rect x="${722 + i * 36}" y="470" width="8" height="12" rx="4" fill="#ffd27a" filter="url(#msGlow)" class="ms-win" style="animation-delay:-${(i * .7).toFixed(1)}s"/>`).join('')}
    <path d="M1060 560 Q1120 580 1180 640" stroke="#2b3550" stroke-width="16" fill="none"/>
  </g>
  <rect x="0" y="560" width="1600" height="200" fill="url(#msMist)" class="ts-mist"/>
  ${ridge(pts(780, 120, 55, 29), '#1c2a3e')}
  ${cloud(1150, 820, 2, .45, 'ts-drift1')}${cloud(200, 860, 1.6, .4, 'ts-drift2')}
  <!-- winged creatures circling the towers -->
  <g class="ms-flyer" fill="#0b1220"><path d="M0 0 Q14 -16 30 -6 Q46 -18 62 0 Q46 -6 31 4 Q16 -6 0 0Z"/></g>
  <g class="ms-flyer ms-f2" fill="#0b1220"><path d="M0 0 Q10 -12 22 -4 Q34 -14 46 0 Q34 -4 23 3 Q12 -4 0 0Z"/></g>
  <g class="ts-dragon" style="animation-duration:34s"><g transform="scale(.7)">
    <path d="M0 0 Q30 -8 60 0 Q80 4 96 -4 Q88 8 70 10 Q40 14 10 8 Q-30 10 -60 24 Q-34 4 0 0Z" fill="#0b1220"/>
    <path class="ts-wing" d="M30 0 Q10 -60 -40 -80 Q0 -40 -6 -10Z M40 2 Q70 -50 120 -60 Q84 -24 70 4Z" fill="#0b1220"/></g></g>
  <!-- foreground cliff and the young wizard -->
  <path d="M0 1000 L0 690 Q80 650 170 646 L300 640 Q370 640 410 676 Q460 730 490 820 Q520 900 540 1000Z" fill="url(#msRock)"/>
  <path d="M170 646 L300 640 Q370 640 410 676 L398 690 Q330 668 260 672 Q200 678 150 694Z" fill="#475571" opacity=".6"/>
  <g transform="translate(300 650) scale(1.8)">
    <ellipse cx="0" cy="0" rx="34" ry="6" fill="#000" opacity=".4"/>
    <path class="ts-cape" d="M-6 -104 Q-30 -60 -34 -2 Q-6 4 18 -2 Q20 -50 12 -100Z" fill="#1e3a8a"/>
    <path d="M-6 -104 Q-30 -60 -34 -2 Q-24 0 -16 -2 Q-18 -50 -2 -100Z" fill="#172554"/>
    <path d="M-10 -100 Q-16 -124 0 -136 Q16 -124 12 -100Z" fill="#1e3a8a"/>
    <path d="M10 -84 Q26 -76 38 -90" stroke="#1e3a8a" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M38 -90 L60 -122" stroke="#5b3a1a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="61" cy="-124" r="26" fill="url(#msWand)" class="ms-wand"/><circle cx="61" cy="-124" r="4" fill="#fff"/>
  </g>
  <g class="ms-spell">${[...Array(10)].map((_, i) => `<circle cx="${410 + i * 22}" cy="${426 - i * 14 + (i % 2 ? 8 : -8)}" r="${3 - i * .2}" fill="#a5f3fc" filter="url(#msGlow)" style="animation-delay:-${(i * .25).toFixed(2)}s"/>`).join('')}</g>
  ${motes}
  <rect width="1600" height="1000" fill="url(#msMist)" opacity=".3" class="ts-mist2"/>
</svg>`;
}

function titleCrestSVG(){
  return `<svg class="ts-crest" viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="tcGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7cc"/><stop offset=".45" stop-color="#f6c453"/><stop offset="1" stop-color="#a86a12"/></linearGradient>
      <radialGradient id="tcLight"><stop offset="0" stop-color="#fffbe6"/><stop offset=".5" stop-color="#ffe49a" stop-opacity=".6"/><stop offset="1" stop-color="#ffe49a" stop-opacity="0"/></radialGradient></defs>
    <circle cx="110" cy="70" r="70" fill="url(#tcLight)" class="tc-pulse"/>
    <path d="M110 18 L118 52 L152 60 L118 68 L110 102 L102 68 L68 60 L102 52Z" fill="#fffbe6" class="tc-star"/>
    <path d="M24 92 Q66 72 110 96 Q154 72 196 92 L196 132 Q154 112 110 136 Q66 112 24 132Z" fill="url(#tcGold)" stroke="#5a3a08" stroke-width="3" stroke-linejoin="round"/>
    <path d="M110 96 L110 136" stroke="#5a3a08" stroke-width="3"/>
    <path d="M40 102 Q74 88 102 104 M40 114 Q74 100 102 116 M118 104 Q146 88 180 102 M118 116 Q146 100 180 114" stroke="#8a5a10" stroke-width="2" fill="none" opacity=".7"/>
  </svg>`;
}
function showTitleScreen(){
  try {
    if (navigator.webdriver || sessionStorage.getItem('rqTitleSeen')) return;
    sessionStorage.setItem('rqTitleSeen', '1');
  } catch(e){}
  // two scenes take turns: golden sunrise quest, and a moonlit misty academy
  // same hero, sword and shield: golden sunrise by day, moonlit blue at night (7 pm – 6 am)
  const hr = new Date().getHours(), night = hr >= 19 || hr < 6, cx = 470;
  const ts = el('div',{class:'title-screen' + (night ? ' night' : ''), html: titleSceneSVG(night)});
  // tall screens (iPad held upright): crop the scene around the hero and the castle instead of the middle
  const fit = () => { const a = innerWidth / innerHeight, svg = ts.querySelector('.ts-svg'); if (!svg) return;
    if (a < 1.3){ const w = Math.max(600, 1000 * a); svg.setAttribute('viewBox', `${Math.max(0, cx - w / 2)} 0 ${w} 1000`); } else svg.setAttribute('viewBox', '0 0 1600 1000'); };
  fit(); addEventListener('resize', fit);
  ts.append(el('div',{class:'ts-logo'},
    el('div',{class:'ts-crest-wrap', html: titleCrestSVG()}),
    el('h1',{class:'ts-title'}, 'Storyborne'),
    el('div',{class:'ts-sub'}, '✦ Rise of the Readers ✦')),
    el('div',{class:'ts-tap'}, 'Tap to begin'));
  const go = () => {
    if (ts.classList.contains('out')) return;
    ts.classList.add('out'); try { beep('level'); } catch(e){}
    setTimeout(() => ts.remove(), 1300);
  };
  ts.addEventListener('pointerup', go);
  document.body.append(ts);
}

/* the epic vista stays behind every kid screen (day or night), blurred and darkened so cards stay readable */
/* =================================================================
   TOWER OF TALES (prototype): climb floor by floor by reading out loud.
   Every floor needs the mic (or grown-up scoring) to clear. Difficulty adapts.
   ================================================================= */
const TOWER_TOP = 30, TOWER_SEASON = { name:'Frost Spire', icon:'❄️' };
const TOWER_BY_ID = {};
['son','daughter'].forEach(tk => Object.values(TOWER_PASSAGES[tk]).flat().forEach(p => TOWER_BY_ID[p.id] = p));
const TOWER_CAPES = [
  { floor:10, id:'starweave', name:'Starweave Cape', color:'#1e1b4b', edge:'#fbbf24' },
  { floor:20, id:'emberveil', name:'Emberveil Cape', color:'#9a3412', edge:'#fde047' },
  { floor:30, id:'aurora',    name:'Aurora Cape',    color:'#0f766e', edge:'#a5f3fc' } ];
const TOWER_CAPE_BY_ID = Object.fromEntries(TOWER_CAPES.map(c => [c.id, c]));
const FLOOR_TYPES = {
  story:   { icon:'📜', name:'Story Floor',    how:'Read the story out loud. Then answer 2 questions.' },
  riddle:  { icon:'❓', name:'Riddle Room',    how:'Read the riddle out loud. Then pick the answer.' },
  words:   { icon:'🚪', name:'Word Gate',      how:'Read 8 tricky words to open the gate.' },
  echo:    { icon:'🔔', name:'Echo Hall',      how:'Listen first. Then read it back with the same voice and feeling.' },
  speed:   { icon:'⚡', name:'Speed Run',      how:'Read a story you already beat, smooth and steady. Beat your best speed!' },
  treasure:{ icon:'💰', name:'Treasure Floor', how:'Read the story and answer 2 questions to win a treasure chest!' },
  guardian:{ icon:'🛡️', name:'Guardian Floor', how:'Read 3 short passages well in a row to defeat the guardian.' }
};
function towerStartStep(){ const lv = K.level || 1;
  return TK === 'daughter' ? (lv <= 2 ? 1 : lv <= 4 ? 2 : lv <= 6 ? 3 : lv <= 7 ? 4 : 5) : (lv <= 5 ? 1 : lv <= 7 ? 2 : lv <= 9 ? 3 : lv <= 11 ? 4 : 5); }
function towerState(){
  const T = K.tower = K.tower || {}, D = { floor:1, best:0, diff:0, up:0, down:0, day:null, used:0, stars:{}, seen:[], cleared:[], wpm:{}, items:[], cape:null, log:[] };
  Object.keys(D).forEach(k => { if (T[k] === undefined) T[k] = D[k]; });
  if (!T.diff) T.diff = towerStartStep();
  if (T.day !== todayStr()){ T.day = todayStr(); T.used = 0; }
  return T;
}
function torchMax(){
  const today = todayStr(), reads = (K.sessions || []).filter(s => s.mode === 'normal' && s.kind === 'story' && todayStr(new Date(s.date)) === today).length;
  return Math.min(DB.towerCap || 10, 5 + reads);
}
const torchesLeft = () => isDev() ? 99 : Math.max(0, torchMax() - towerState().used);
function floorType(n){
  if (n % 10 === 0) return 'guardian';
  if (n % 5 === 0) return 'treasure';
  const r = n % 5;
  if (r === 1 || r === 3) return 'story';
  if (r === 2) return n % 4 === 2 ? 'riddle' : 'words';
  return towerState().cleared.length >= 2 && n % 3 === 1 ? 'speed' : 'echo';
}
function towerPick(step, avoid = []){
  const T = towerState(), ids = (TOWER_STEPS[TK] || {})[step] || [];
  const fresh = ids.filter(id => !T.seen.includes(id) && !avoid.includes(id));
  const id = shuffle(fresh.length ? fresh : ids.filter(i => !avoid.includes(i)))[0] || ids[0];
  if (!T.seen.includes(id)) T.seen.push(id);
  return TOWER_BY_ID[id];
}
const firstSentences = (text, n) => text.replace(/\n+/g, ' ').match(/[^.!?]+[.!?]+["”]?/g).slice(0, n).join(' ').trim();
function guardianFor(n){ const bs = BOSSES[TK] || {}, keys = Object.keys(bs); return bs[keys[(Math.floor(n / 10) * 3 + 1) % keys.length]]; }
function towerRead(src, extra, then){
  let done = false; // the reader can report "done" twice (last word + mic stop); count it once
  const pages = src.pages || storyPages(src.text);
  beginRun({ kind: src.kind || 'story', level:K.level, title: src.title, emoji: src.emoji || '🗼', pages },
    Object.assign({ mode:'tower', onStop: screenTower, onDone: (res, act) => { if (done) return; done = true; try { K.words = K.words || {}; trackWords(act); } catch(e){} then(res); } }, extra || {}));
}
function towerQuiz(qs, title, done){
  let i = 0, right = 0;
  const step = () => {
    if (i >= qs.length) return done(right);
    const [q, opts, ans] = qs[i], order = shuffle(opts.map((o, j) => j));
    let locked = false;
    const fb = el('div',{class:'tw-fb'});
    const buttons = order.map(j => { const b = el('button',{class:'opt', onclick:()=>{
      if (locked) return; locked = true;
      const ok = j === ans; if (ok) right++;
      b.classList.add(ok ? 'right' : 'wrong'); if (!ok) buttons[order.indexOf(ans)].classList.add('right');
      beep(ok ? 'ok' : 'no'); trackQ(q, ok);
      fb.textContent = ok ? '✨ Yes!' : 'The right answer is in green.';
      setTimeout(() => { i++; step(); }, ok ? 900 : 1800);
    }}, opts[j]); return b; });
    show(el('div',{class:'screen'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:screenTower},'← Tower'), el('div',{class:'pageinfo'}, `${title} · Question ${i+1} of ${qs.length}`), el('div',{style:'width:80px'})),
      el('div',{class:'card tw-q'}, el('h2',{class:'q-text'}, q, ' ', el('button',{class:'btn small blue', onclick:()=>say(q)},'🔊')), el('div',{class:'tw-opts'}, ...buttons), fb)));
    say(q);
  };
  step();
}
function towerBegin(n){
  const T = towerState(), type = floorType(n), F = FLOOR_TYPES[type];
  if (!isDev()) T.used++;
  save();
  const label = `Floor ${n} · ${F.name}`;
  const end = (acc, right = 0, total = 0, more = {}) => towerFinish(n, type, acc, right, total, more);
  if (type === 'story' || type === 'treasure'){
    const P = towerPick(T.diff);
    return towerRead(P, {}, res => res.accuracy < .9 ? end(res.accuracy, 0, 0, { res, pid:P.id }) : towerQuiz(P.q, label, r => end(res.accuracy, r, P.q.length, { res, pid:P.id })));
  }
  if (type === 'riddle'){
    const R = shuffle(TOWER_RIDDLES[TK])[0];
    return towerRead({ title:'Riddle Room', emoji:'❓', text:R[0] }, {}, res => res.accuracy < .9 ? end(res.accuracy, 0, 0, { res }) : towerQuiz([R], label, r => end(res.accuracy, r, 1, { res })));
  }
  if (type === 'words'){
    let ws = practiceWords(K).slice(0, 8);
    if (ws.length < 8){ const pool = [...new Set(towerPick(T.diff).text.split(/\s+/).map(norm).filter(w => w.length >= 5))]; ws = ws.concat(shuffle(pool).filter(w => !ws.includes(w))).slice(0, 8); }
    const pages = ws.map(w => ({ single:true, tokens:[{ disp:(K.words && K.words[w] && K.words[w].disp || w).toLowerCase(), n:w }] }));
    return towerRead({ kind:'words', title:'Word Gate', emoji:'🚪', pages }, {}, res => end(res.accuracy, 0, 0, { res }));
  }
  if (type === 'echo'){
    const P = towerPick(T.diff), text = firstSentences(P.text, 3);
    towerRead({ title:'Echo Hall', emoji:'🔔', text }, { echo:true }, res => end(res.accuracy, 0, 0, { res }));
    setTimeout(() => { try { readAlong(); } catch(e){} }, 500);
    return;
  }
  if (type === 'speed'){
    const id = shuffle(T.cleared.filter(i => TOWER_BY_ID[i] && TOWER_STEPS[TK] && Object.values(TOWER_STEPS[TK]).flat().includes(i)))[0];
    const P = TOWER_BY_ID[id] || towerPick(T.diff);
    return towerRead(P, {}, res => end(res.accuracy, 0, 0, { res, pid:P.id, wcpm:res.wcpm }));
  }
  if (type === 'guardian') return towerGuardian(n, 3, 0, []);
}
// guardian: 3 rounds; every round read at 90%+ is a hit
function towerGuardian(n, hp, round, used){
  const B = guardianFor(n), T = towerState();
  if (hp <= 0) return towerFinish(n, 'guardian', 1, 0, 0, { guardian:B });
  if (round >= 3) return towerFinish(n, 'guardian', 0, 0, 0, { guardian:B, hp });
  const hearts = el('div',{class:'tw-hp'}, ...[0,1,2].map(i => el('span',{class: i < hp ? 'on' : ''}, '❤️')));
  show(el('div',{class:'screen tw-guard'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:screenTower},'← Tower'), el('div',{class:'pageinfo'}, `Floor ${n} · Guardian`), el('div',{style:'width:80px'})),
    el('div',{class:'card center tw-gcard'},
      el('div',{class:'tw-gart' + (round ? ' hit' : ''), html: bossArt(B, 190, TK)}),
      el('h2',{}, B.name), hearts,
      el('p',{class:'tw-taunt'}, round ? `Ouch! ${hp} hit${hp === 1 ? '' : 's'} to go!` : '“' + B.taunt + '”'),
      el('p',{}, `Round ${round + 1} of 3. Read it well to strike!`),
      el('button',{class:'btn green', onclick:()=>{
        const P = towerPick(Math.max(1, T.diff), used), text = firstSentences(P.text, TK === 'son' ? 4 : 5);
        towerRead({ title:`Strike ${round + 1}`, emoji:'⚔️', text }, {}, res => {
          const hit = res.accuracy >= .9; beep(hit ? 'star' : 'no');
          towerGuardian(n, hit ? hp - 1 : hp, round + 1, used.concat(P.id));
        });
      }}, '⚔️ Strike!'))));
  say(round ? `${hp} more to go!` : B.taunt);
}
function towerFinish(n, type, acc, right, total, more){
  const T = towerState(), res = more.res;
  const pass = type === 'guardian' ? acc >= 1 : acc >= .9 && (!total || right >= Math.ceil(total / 2));
  const stars = !pass ? 0 : type === 'guardian' ? 3 : acc >= .98 && right === total ? 3 : acc >= .95 ? 2 : 1;
  // adapt difficulty: two great floors in a row = harder; two rough floors in a row = easier (one step at a time)
  let moved = 0;
  if (type !== 'guardian' && type !== 'words'){
    if (acc >= .98 && (!total || right === total)){ T.up++; T.down = 0; if (T.up >= 2 && T.diff < 6){ T.diff++; T.up = 0; moved = 1; } }
    else if (acc < .9){ T.down++; T.up = 0; if (T.down >= 2 && T.diff > 1){ T.diff--; T.down = 0; moved = -1; } }
    else { T.up = 0; T.down = 0; }
  }
  T.log.unshift({ d: todayStr(), n, type, acc: Math.round(acc * 100), q: total ? right + '/' + total : null, wcpm: more.wcpm || null, step: T.diff, pass });
  T.log = T.log.slice(0, 300);
  const gains = [];
  let speedBest = null;
  if (pass){
    if (more.pid && !T.cleared.includes(more.pid)) T.cleared.push(more.pid);
    if (more.wcpm && more.pid){ const old = T.wpm[more.pid] || 0; speedBest = { old, now: more.wcpm }; if (more.wcpm > old) T.wpm[more.pid] = more.wcpm; }
    T.stars[n] = Math.max(T.stars[n] || 0, stars);
    const first = n >= T.floor;
    if (first){ T.floor = n + 1; T.best = Math.max(T.best, n); }
    const st = [0, 2, 3, 5][stars] + (speedBest && speedBest.now > speedBest.old && speedBest.old ? 3 : 0);
    K.stars += st; gains.push(`⭐ +${st} stars`);
    if (first && type === 'treasure'){ const C = chestState(), kind = n % 15 === 0 ? 'gold' : 'silver'; C[kind]++; gains.push(`🎁 A ${kind} treasure chest!`); }
    if (first && type === 'guardian'){ const cape = TOWER_CAPES.find(c => c.floor === n);
      if (cape && !T.items.includes(cape.id)){ T.items.push(cape.id); T.cape = cape.id; gains.push(`🦸 ${cape.name}! (You're wearing it now)`); }
      addCosmic(2, `You beat the Floor ${n} guardian!`); }
    if (first && n % 5 === 0) gains.push(`🚩 Checkpoint reached!`);
  }
  save();
  const missed = res ? [...new Set(res.missed || [])].filter(w => !/^\d+$/.test(w)).slice(0, 10) : [];
  const chips = missed.length ? el('div',{class:'tw-missed'}, el('p',{}, 'Tap a word to hear it:'), ...missed.map(w => el('button',{class:'chip', onclick:()=>say(w, { rate:.75 })}, (K.words && K.words[w] && K.words[w].disp) || w))) : null;
  const accLine = type === 'guardian' ? (pass ? 'You defeated the guardian!' : `The guardian still has ${more.hp} ❤️ left. Read each passage carefully!`)
    : `You read ${Math.round(acc * 100)}% of the words right${total ? ` and got ${right} of ${total} question${total > 1 ? 's' : ''}` : ''}.`;
  const left = torchesLeft();
  const s = el('div',{class:'screen tw-end'},
    el('div',{class:'card center tw-endcard ' + (pass ? 'win' : 'lose')},
      more.guardian ? el('div',{class:'tw-gart' + (pass ? ' beaten' : ''), html: bossArt(more.guardian, 150, TK)}) : null,
      el('h1',{class:'title'}, pass ? `Floor ${n} cleared!` : 'So close!'),
      pass ? el('div',{class:'tw-stars'}, ...[1,2,3].map(i => el('span',{class: i <= stars ? 'on' : ''}, '★'))) : null,
      el('p',{}, accLine),
      speedBest ? el('p',{class:'tw-speed'}, `⚡ ${speedBest.now} words a minute` + (speedBest.old ? (speedBest.now > speedBest.old ? ` · New best! (was ${speedBest.old})` : ` · Your best is ${speedBest.old}`) : ' · Your first time!')) : null,
      moved > 0 ? el('p',{class:'tw-moved'}, '📈 Amazing reading! The next floors get a little harder.') : moved < 0 ? el('p',{class:'tw-moved'}, '🧭 The next floors will be a little easier. You\'ve got this!') : null,
      gains.length ? el('div',{class:'tw-gains'}, ...gains.map(g => el('div',{}, g))) : null,
      !pass && type !== 'guardian' ? el('p',{class:'muted'}, total && acc >= .9 ? 'You read it well! Get more questions right to clear the floor.' : 'Read 9 out of every 10 words right to clear the floor.') : null,
      chips,
      el('div',{class:'row center', style:'gap:10px;flex-wrap:wrap;margin-top:12px'},
        pass && n < TOWER_TOP && left ? el('button',{class:'btn green', onclick:()=>towerIntro(n + 1)}, `Next floor ▶`) : null,
        !pass && left ? el('button',{class:'btn', onclick:()=>towerIntro(n)}, `🔥 Try again`) : null,
        el('button',{class:'btn ghost', onclick:screenTower}, '🗼 Back to tower')),
      !left ? el('p',{class:'muted'}, 'Your torches are out for today. Read a story to light another one!') : null));
  show(s);
  if (pass){ beep('star'); confetti(stars * 30); say(type === 'guardian' ? 'You defeated the guardian!' : `Floor ${n} cleared!`); }
  else say('So close! Try again.');
}
async function towerIntro(n){
  const T = towerState(), type = floorType(n), F = FLOOR_TYPES[type];
  if (n > T.floor){ say(`Clear floor ${T.floor} first!`); return; }
  if (!torchesLeft()){ await modal(el('div',{}, el('div',{class:'big-e'},'🔥'), el('h2',{},'Out of torches'), el('p',{}, 'Each floor uses a torch. Read a story in your adventure to light another one! New torches come tomorrow.')), [['OK','',1]]); return; }
  const B = type === 'guardian' ? guardianFor(n) : null;
  const go = await modal(el('div',{class:'tw-intro'},
      B ? el('div',{class:'tw-gart', html: bossArt(B, 130, TK)}) : el('div',{class:'big-e'}, F.icon),
      el('h2',{}, `Floor ${n}: ${F.name}`), B ? el('p',{}, el('b',{}, B.name), ' guards this floor!') : null,
      el('p',{}, F.how), el('p',{class:'muted'}, `🔥 ${isDev() ? '∞' : torchesLeft()} torch${torchesLeft() === 1 ? '' : 'es'} left today · this uses 1`)),
    [['Not yet','gray',false],['Begin ▶','green',true]]);
  say('');
  if (go) towerBegin(n);
}
function screenTower(){
  stopAll();
  const T = towerState(); save();
  const ph = dayPhase();
  const col = el('div',{class:'tw-col'});
  for (let n = 1; n <= TOWER_TOP; n++){
    const type = floorType(n), F = FLOOR_TYPES[type], st = T.stars[n] || 0;
    const state = n < T.floor ? 'done' : n === T.floor ? 'current' : 'locked';
    const B = type === 'guardian' ? guardianFor(n) : null;
    const node = el('button',{class:'tw-node ' + state + ' t-' + type, onclick:()=>{ beep('tap');
        if (state === 'done') say(`Floor ${n}. You got ${st} star${st === 1 ? '' : 's'} here!`); else towerIntro(n); }},
      el('span',{class:'tw-n'}, n), el('span',{class:'tw-i'}, state === 'locked' && type !== 'guardian' ? '🔒' : F.icon),
      state === 'done' ? el('span',{class:'tw-s'}, '★'.repeat(st) + '☆'.repeat(3 - st)) : null);
    const row = el('div',{class:'tw-floor ' + state + (n % 2 ? ' l' : ' r') + (n % 5 === 0 ? ' check' : ''), 'data-n': n},
      el('div',{class:'tw-win'}), el('div',{class:'tw-win b'}), node,
      B ? el('div',{class:'tw-guardian' + (state === 'done' ? ' beaten' : ''), html: bossArt(B, 74, TK)}) : null,
      n % 5 === 0 && n % 10 !== 0 ? el('div',{class:'tw-flag'}, state === 'done' ? '🚩' : '🏳️') : null,
      state === 'current' ? el('div',{class:'tw-me'}, heroNode(62, false)) : null);
    col.append(row);
  }
  col.append(el('div',{class:'tw-crown'}, el('div',{class:'tw-banner'}, `${TOWER_SEASON.icon} ${TOWER_SEASON.name}`), el('div',{class:'tw-battle'})));
  const sky = el('div',{class:'tw-sky ph-' + ph}, el('div',{class:'tw-stars-bg'}), col);
  const cur = T.floor > TOWER_TOP ? null : T.floor;
  const capes = T.items.length ? el('div',{class:'tw-capes'}, el('b',{}, 'Tower capes: '),
    ...T.items.map(id => { const c = TOWER_CAPE_BY_ID[id]; return el('button',{class:'btn small' + (T.cape === id ? '' : ' ghost'), onclick:()=>{ T.cape = T.cape === id ? null : id; save(); screenTower(); }}, (T.cape === id ? '✓ ' : '') + c.name); })) : null;
  const torches = torchesLeft();
  show(el('div',{class:'screen tw-screen'},
    el('div',{class:'topbar'}, homeBtn(), el('h1',{class:'title tw-title'}, '🗼 Tower of Tales'),
      el('div',{class:'pill tw-torch'}, isDev() ? '🔥 ∞' : `🔥 ${torches} / ${torchMax()}`)),
    el('p',{class:'subtitle center'}, cur ? `Floor ${cur} is waiting. Read out loud to climb!` : 'You reached the top! A new tower comes next season.'),
    todBadgeInline(), sky, capes,
    el('p',{class:'muted center tw-help'}, '🔥 5 torches a day, +1 for every story you read in your adventure. 🚩 Checkpoints every 5 floors. 🛡️ Guardians every 10.')));
  const target = col.querySelector(`[data-n="${cur || TOWER_TOP}"]`);
  if (target) setTimeout(() => target.scrollIntoView({ block:'center' }), 60);
}
function todBadgeInline(){ const b = todBadge(); b.classList.add('inline'); return b; }

function mountEpicBg(){
  const ph = dayPhase(), night = ph === 'night';
  let bg = document.getElementById('epic-bg');
  if (bg && bg.dataset.phase === ph) return;
  if (bg) bg.remove();
  bg = el('div',{id:'epic-bg', 'data-phase': ph, class: (night ? 'night great-hall ' : '') + 'ph-' + ph, html: night ? greatHallSVG() : titleSceneSVG(night)});
  if (!night && PHASE[ph].tint) bg.append(el('div',{class:'tod-tint', style:`background:${PHASE[ph].tint};opacity:${PHASE[ph].tintOp}`}));
  bg.append(el('div',{class:'eb-shade'}));
  document.body.prepend(bg);
}
/* ======================= WIZARD SCHOOL (original): houses, wands, owl mail, Great Hall, robes & hats =======================
   Starhaven Academy of Reading Magic. Everything here is original: names, houses, crests and art.
   Data lives in K.wiz. House points = stars earned from reading this week (derived from K.sessions, nothing extra to keep in sync). */
const HOUSES = {
  emberwing:  { id:'emberwing',  name:'Emberwing',  trait:'brave',   icon:'🐉', prim:'#9f1d1d', sec:'#f59e0b', dark:'#4c0b0b', motto:'Courage lights the way' },
  tidecaller: { id:'tidecaller', name:'Tidecaller', trait:'kind',    icon:'🌊', prim:'#1e3a8a', sec:'#cbd5e1', dark:'#0b1a45', motto:'Kindness flows like water' },
  starwatch:  { id:'starwatch',  name:'Starwatch',  trait:'curious', icon:'🦉', prim:'#4c1d95', sec:'#e9d5ff', dark:'#230b4d', motto:'Wonder sees the farthest' },
  rootheart:  { id:'rootheart',  name:'Rootheart',  trait:'loyal',   icon:'🌳', prim:'#14532d', sec:'#d4a017', dark:'#082a16', motto:'Together we grow strong' }
};
const HOUSE_IDS = Object.keys(HOUSES);
const SORT_QS = [
  ['Pick a door to open.', ['🔥 A door glowing with warm fire','🌊 A door with waves splashing on it','✨ A door covered in twinkling stars','🌳 A door made of a living tree']],
  ['A friend is stuck. What do you do?', ['Rush in to help right away','Stay calm and make them feel better','Think up a clever plan','Stay by their side until it is fixed']],
  ['Pick a magic pet.', ['🐲 A baby dragon','🐢 A glowing sea turtle','🦉 A wise little owl','🦊 A forest fox']],
  ['What sounds most fun?', ['Climbing the tallest tower','Helping a lost creature find home','Reading a secret book','Building a fort with friends']],
  ['Choose a treasure.', ['🗡️ A sword of fire','🐚 A shell that sings','🔭 A telescope that sees far stars','🌱 A seed that grows a tree house']]
];
const WAND_WOODS = [
  { id:'oak',      name:'Oak',      col:'#8b5a2b', dark:'#5b3a1a', cost:0,  desc:'Strong and steady' },
  { id:'willow',   name:'Willow',   col:'#cdb88e', dark:'#8a7650', cost:30, desc:'Bendy and gentle' },
  { id:'cherry',   name:'Cherry',   col:'#a3402e', dark:'#5e2016', cost:30, desc:'Bold and bright' },
  { id:'birch',    name:'Birch',    col:'#f1ede4', dark:'#3f3f46', cost:40, desc:'Pale with dark marks', spots:true },
  { id:'ebony',    name:'Ebony',    col:'#2b2b30', dark:'#09090b', cost:50, desc:'Dark as midnight' },
  { id:'starwood', name:'Starwood', col:'#4f46e5', dark:'#1e1b4b', cost:80, desc:'Grown under falling stars', spark:true }
];
const WAND_CORES = [
  { id:'starlight',   name:'Starlight',    glow:'#fde68a', cost:0,  desc:'A spark of a star' },
  { id:'dragonscale', name:'Dragon Scale', glow:'#fb923c', cost:30, desc:'Warm as dragon fire' },
  { id:'moonstone',   name:'Moonstone',    glow:'#93c5fd', cost:30, desc:'Cool moon magic' },
  { id:'fairydust',   name:'Fairy Dust',   glow:'#f9a8d4', cost:40, desc:'Giggly and sparkly' },
  { id:'stormglass',  name:'Storm Glass',  glow:'#a5f3fc', cost:50, desc:'Crackles like lightning' },
  { id:'sunheart',    name:'Sunheart',     glow:'#fef08a', cost:80, desc:'The heart of the sunrise', big:true }
];
const WOOD_BY = Object.fromEntries(WAND_WOODS.map(w => [w.id, w])), CORE_BY = Object.fromEntries(WAND_CORES.map(c => [c.id, c]));
const ROBES = [
  { id:'house',    name:'House Robe',     cost:0,  house:true },
  { id:'midnight', name:'Midnight Robe',  cost:40, prim:'#111827', sec:'#9ca3af' },
  { id:'starry',   name:'Starry Robe',    cost:60, prim:'#1e1b4b', sec:'#fde68a', stars:true },
  { id:'snowy',    name:'Snowfall Robe',  cost:60, prim:'#e5e7eb', sec:'#60a5fa' },
  { id:'royal',    name:'Royal Robe',     cost:80, prim:'#581c87', sec:'#fbbf24', stars:true }
];
const HATS = [
  { id:'house',    name:'House Hat',      cost:0,  house:true },
  { id:'classic',  name:'Classic Hat',    cost:25, prim:'#6d28d9', sec:'#fbbf24' },
  { id:'starry',   name:'Starry Hat',     cost:40, prim:'#1e1b4b', sec:'#fde68a', stars:true },
  { id:'crescent', name:'Moon Hat',       cost:50, prim:'#0f172a', sec:'#e2e8f0', moon:true },
  { id:'flower',   name:'Blossom Hat',    cost:40, prim:'#be185d', sec:'#fbcfe8', flower:true }
];
const ROBE_BY = Object.fromEntries(ROBES.map(r => [r.id, r])), HAT_BY = Object.fromEntries(HATS.map(h => [h.id, h]));
function wandOff(){ if (K && K.wiz) K.wiz.wandOn = false; }
function WZ(k){ const kk = k || K; kk.wiz = Object.assign({ house:null, woods:[], cores:[], wand:null, wandOn:false, robes:[], hats:[], robe:null, hat:null, letters:[], accept:false, lastWeek:null, cups:{} }, kk.wiz || {}); return kk.wiz; }
const wizColors = (item, house) => item && item.house ? (HOUSES[house] ? { prim:HOUSES[house].prim, sec:HOUSES[house].sec } : { prim:'#4c1d95', sec:'#fbbf24' }) : item;
const wStar = (x, y, r, c) => { let p = ''; for (let i = 0; i < 10; i++){ const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; p += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); } return `<path d="${p}Z" fill="${c}"/>`; };

/* ---------- art: wand, robe, hat (drawn into heroSVG's 200×250 space) ---------- */
function wandArt(x1, y1, x2, y2, woodId, coreId, wpx){
  const W = WOOD_BY[woodId] || WAND_WOODS[0], C = CORE_BY[coreId] || WAND_CORES[0], w = wpx || 6;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const P = (t, half) => [x1 + dx * t + nx * half, y1 + dy * t + ny * half];
  const poly = (t0, t1, h0, h1) => { const a = P(t0, h0), b = P(t1, h1), c = P(t1, -h1), d = P(t0, -h0); return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)} L${c[0].toFixed(1)} ${c[1].toFixed(1)} L${d[0].toFixed(1)} ${d[1].toFixed(1)}Z`; };
  const tip = P(1, 0), ink = '#24141f';
  let s = `<circle cx="${tip[0]}" cy="${tip[1]}" r="${w * (C.big ? 3.4 : 2.6)}" fill="${C.glow}" opacity=".35"/><circle cx="${tip[0]}" cy="${tip[1]}" r="${w * 1.5}" fill="${C.glow}" opacity=".55"/>`;
  s += `<path d="${poly(0, 1, w * .62, w * .28)}" fill="${W.col}" stroke="${ink}" stroke-width="${w * .38}" stroke-linejoin="round"/>`;
  s += `<path d="${poly(0, .34, w * .78, w * .66)}" fill="${W.dark}" stroke="${ink}" stroke-width="${w * .38}" stroke-linejoin="round"/>`;   // grip
  [.1, .2, .3].forEach(t => { const a = P(t, w * .72), b = P(t, -w * .72); s += `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="${W.col}" stroke-width="${w * .22}" opacity=".7"/>`; });
  if (W.spots) [.45, .6, .75].forEach((t, i) => { const a = P(t, (i % 2 ? 1 : -1) * w * .15); s += `<ellipse cx="${a[0]}" cy="${a[1]}" rx="${w * .3}" ry="${w * .14}" fill="${W.dark}"/>`; });
  if (W.spark) [.5, .72].forEach(t => { const a = P(t, 0); s += wStar(a[0], a[1], w * .32, '#e0e7ff'); });
  const hl = P(.4, w * .2), hl2 = P(.92, w * .1);
  s += `<path d="M${hl[0].toFixed(1)} ${hl[1].toFixed(1)} L${hl2[0].toFixed(1)} ${hl2[1].toFixed(1)}" stroke="#fff" stroke-width="${w * .18}" opacity=".45" stroke-linecap="round"/>`;
  s += wStar(tip[0], tip[1], w * 1.25, '#fff') + wStar(tip[0], tip[1], w * .7, C.glow);
  return s;
}
function robeArt(robeId, house){
  const R = wizColors(ROBE_BY[robeId], house); if (!R) return ''; const ink = '#24141f', dk = shade(R.prim, -.35);
  let s = `<path d="M64 100 L78 110 L66 168 L40 162 Z" fill="${R.prim}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M40 162 L66 168" stroke="${R.sec}" stroke-width="4"/>
    <path d="M136 100 L122 110 L134 168 L160 162 Z" fill="${R.prim}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M160 162 L134 168" stroke="${R.sec}" stroke-width="4"/>
    <path d="M66 100 Q56 150 48 230 L84 230 Q88 160 95 110 Z" fill="${R.prim}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M134 100 Q144 150 152 230 L116 230 Q112 160 105 110 Z" fill="${R.prim}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M95 110 Q88 160 84 230 M105 110 Q112 160 116 230" stroke="${R.sec}" stroke-width="4" fill="none"/>
    <path d="M70 120 Q64 170 60 222 M130 120 Q136 170 140 222" stroke="${dk}" stroke-width="2.5" fill="none" opacity=".6"/>
    <path d="M66 100 L95 110 L100 124 L105 110 L134 100 L128 96 L100 108 L72 96Z" fill="${R.sec}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>`;
  if (R.stars) [[58,190],[70,150],[140,170],[130,206],[56,214],[144,140]].forEach(([x,y]) => s += wStar(x, y, 4, R.sec));
  if (ROBE_BY[robeId] && ROBE_BY[robeId].house && HOUSES[house]) s += `<g transform="translate(122 128) scale(.16)">${crestInner(house)}</g>`;
  return s;
}
function hatArt(hatId, house){
  const H = wizColors(HAT_BY[hatId], house); if (!H) return ''; const ink = '#24141f', dk = shade(H.prim, -.3);
  let s = `<path d="M58 46 Q100 58 142 46 Q150 40 140 36 Q100 46 60 36 Q50 40 58 46Z" fill="${dk}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M70 40 Q78 24 94 12 Q110 2 128 4 Q114 10 112 20 Q118 30 130 40 Q100 48 70 40Z" fill="${H.prim}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M72 36 Q100 44 128 36 L130 40 Q100 48 70 40Z" fill="${H.sec}" stroke="${ink}" stroke-width="2"/>
    <path d="M90 18 Q104 8 122 6" stroke="#fff" stroke-width="2.5" opacity=".3" fill="none" stroke-linecap="round"/>`;
  if (H.stars) [[88,28],[104,18],[116,30]].forEach(([x,y]) => s += wStar(x, y, 3.6, H.sec));
  if (H.moon) s += `<path d="M98 16 a8 8 0 1 0 8 14 a6 6 0 1 1 -8 -14z" fill="${H.sec}" stroke="${ink}" stroke-width="1.5"/>`;
  if (H.flower) s += `<g transform="translate(118 36)">${[0,72,144,216,288].map(a => `<ellipse cx="0" cy="-5" rx="3.4" ry="5" fill="${H.sec}" stroke="${ink}" stroke-width="1" transform="rotate(${a})"/>`).join('')}<circle r="3" fill="#facc15" stroke="${ink}" stroke-width="1"/></g>`;
  if (HAT_BY[hatId] && HAT_BY[hatId].house && HOUSES[house]) s += `<g transform="translate(92 22) scale(.1)">${crestInner(house)}</g>`;
  return s;
}
/* crest: shield in house colours with an original emblem, drawn in a 200×220 box */
function crestInner(id){
  const H = HOUSES[id] || HOUSES.starwatch, ink = '#24141f';
  let s = `<path d="M100 6 L186 30 Q190 130 100 214 Q10 130 14 30 Z" fill="${H.prim}" stroke="${H.sec}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M100 6 L186 30 Q190 130 100 214 Q10 130 14 30 Z" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M100 24 L170 42 Q172 124 100 192 Z" fill="#000" opacity=".14"/>`;
  const c = H.sec;
  if (id === 'emberwing') s += `<path d="M100 60 Q70 70 52 52 Q56 86 82 96 Q60 110 58 138 Q80 120 100 124 Q120 120 142 138 Q140 110 118 96 Q144 86 148 52 Q130 70 100 60Z" fill="${c}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><path d="M100 124 Q92 150 100 170 Q108 150 100 124Z" fill="${c}" stroke="${ink}" stroke-width="3.5"/><circle cx="100" cy="84" r="9" fill="${H.dark}"/>`;
  if (id === 'tidecaller') s += `<path d="M40 120 Q60 96 80 120 Q100 144 120 120 Q140 96 160 120 L160 140 Q140 116 120 140 Q100 164 80 140 Q60 116 40 140Z" fill="${c}" stroke="${ink}" stroke-width="3.5"/><path d="M52 84 Q72 60 92 84 Q112 108 132 84 Q148 66 160 78" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round"/><circle cx="148" cy="62" r="8" fill="${c}"/>`;
  if (id === 'starwatch') s += `<ellipse cx="100" cy="104" rx="46" ry="52" fill="${c}" stroke="${ink}" stroke-width="4"/><circle cx="82" cy="94" r="15" fill="#fff" stroke="${ink}" stroke-width="3"/><circle cx="118" cy="94" r="15" fill="#fff" stroke="${ink}" stroke-width="3"/><circle cx="82" cy="94" r="7" fill="${H.dark}"/><circle cx="118" cy="94" r="7" fill="${H.dark}"/><path d="M94 110 L100 122 L106 110Z" fill="#f59e0b" stroke="${ink}" stroke-width="2.5"/><path d="M62 64 L74 80 M138 64 L126 80" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>${wStar(100, 46, 12, c)}`;
  if (id === 'rootheart') s += `<circle cx="100" cy="86" r="42" fill="${c}" stroke="${ink}" stroke-width="4"/><circle cx="74" cy="100" r="22" fill="${c}" stroke="${ink}" stroke-width="4"/><circle cx="126" cy="100" r="22" fill="${c}" stroke="${ink}" stroke-width="4"/><path d="M92 118 L90 160 Q80 168 70 170 L130 170 Q120 168 110 160 L108 118Z" fill="${H.dark}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><path d="M90 160 Q76 152 66 156 M110 160 Q124 152 134 156" stroke="${ink}" stroke-width="4" fill="none"/>`;
  return s;
}
const crestSVG = (id, size) => `<svg viewBox="0 0 200 220" width="${size}" height="${size * 1.1}" xmlns="http://www.w3.org/2000/svg">${crestInner(id)}</svg>`;

/* ---------- Great Hall (static, no animation: fast on old iPads) ---------- */
function greatHallSVG(){
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  let s = `<svg class="ts-svg gh-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="ghCeil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b24"/><stop offset=".7" stop-color="#1b1f4d"/><stop offset="1" stop-color="#2c2560"/></linearGradient>
    <linearGradient id="ghWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3150"/><stop offset="1" stop-color="#1a1426"/></linearGradient>
    <linearGradient id="ghFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a22"/><stop offset="1" stop-color="#1a110d"/></linearGradient>
    <linearGradient id="ghTable" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c4a26"/><stop offset="1" stop-color="#4a2a14"/></linearGradient>
    <radialGradient id="ghGlow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <radialGradient id="ghWin" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#c7d8ff"/><stop offset="1" stop-color="#4b5fa8"/></radialGradient></defs>`;
  s += `<rect width="1600" height="1000" fill="url(#ghWall)"/>`;
  // starry enchanted ceiling (vault)
  s += `<path d="M0 0 H1600 V250 Q800 120 0 250Z" fill="url(#ghCeil)"/>`;
  for (let i = 0; i < 90; i++){ const x = rnd() * 1600, y = rnd() * 220 * (1 - Math.abs(x - 800) / 1600); s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(rnd() * 1.8 + .6).toFixed(1)}" fill="#fff" opacity="${(rnd() * .6 + .4).toFixed(2)}"/>`; }
  s += wStar(380, 70, 9, '#fff7d6') + wStar(1220, 52, 11, '#fff7d6') + wStar(820, 40, 7, '#fff7d6');
  // ribs of the vault
  [-600, -300, 0, 300, 600].forEach(o => s += `<path d="M${800 + o * 2.2} 0 Q${800 + o * .9} 160 ${800 + o * .55} 250" stroke="#5a4a74" stroke-width="10" fill="none" opacity=".7"/>`);
  // far wall with big arched window
  s += `<rect x="520" y="230" width="560" height="300" fill="#2a2240"/><path d="M700 520 V330 Q800 230 900 330 V520Z" fill="url(#ghWin)" stroke="#8b7aa8" stroke-width="8"/>
    <path d="M800 260 V520 M700 400 H900 M745 300 V520 M855 300 V520" stroke="#3a2f55" stroke-width="5"/>
    <g transform="translate(800 400)"><path d="M-40 0 Q-20 -10 0 0 Q20 -10 40 0 V30 Q20 20 0 30 Q-20 20 -40 30Z" fill="#fbbf24" stroke="#5b3a1a" stroke-width="3"/>${wStar(0, -26, 16, '#fff7d6')}</g>`;
  // side walls in perspective with tall windows
  s += `<path d="M0 250 L520 230 L520 530 L0 760Z" fill="#2f2744"/><path d="M1600 250 L1080 230 L1080 530 L1600 760Z" fill="#2f2744"/>`;
  [[90, 280, 70, 300], [270, 268, 54, 230], [410, 258, 40, 180]].forEach(([x, y, w, h]) => {
    s += `<path d="M${x} ${y + h} V${y + w * .6} Q${x + w / 2} ${y - w * .3} ${x + w} ${y + w * .6} V${y + h}Z" fill="url(#ghWin)" opacity=".75" stroke="#5a4a74" stroke-width="5"/>`;
    const X = 1600 - x - w; s += `<path d="M${X} ${y + h} V${y + w * .6} Q${X + w / 2} ${y - w * .3} ${X + w} ${y + w * .6} V${y + h}Z" fill="url(#ghWin)" opacity=".75" stroke="#5a4a74" stroke-width="5"/>`;
  });
  // house banners hanging on the far wall
  HOUSE_IDS.forEach((id, i) => { const H = HOUSES[id], x = [560, 640, 920, 1000][i];
    s += `<path d="M${x} 240 h50 v150 l-25 -18 l-25 18z" fill="${H.prim}" stroke="${H.sec}" stroke-width="4"/><g transform="translate(${x + 7} 270) scale(.18)">${crestInner(id)}</g>`; });
  // floor
  s += `<path d="M0 760 L520 530 H1080 L1600 760 V1000 H0Z" fill="url(#ghFloor)"/>`;
  // head table + four long house tables receding to the far wall
  s += `<path d="M560 520 H1040 L1050 548 H550Z" fill="url(#ghTable)" stroke="#2a170b" stroke-width="3"/>`;
  [[150, 610], [520, 735], [1080, 865], [1450, 990]].forEach(([bx, fx], i) => {
    const H = HOUSES[HOUSE_IDS[i]], tl = 620 + i * 0, x1 = bx, x2 = fx;
    const farL = 610 + i * 100, farR = farL + 30;
    s += `<path d="M${x1 - 70} 1000 L${farL} 550 L${farR} 550 L${x1 + 70} 1000Z" fill="url(#ghTable)" stroke="#2a170b" stroke-width="3"/>`;
    s += `<path d="M${x1 - 70} 1000 L${farL} 550" stroke="${H.sec}" stroke-width="3" opacity=".5"/>`;
    for (let t = .15; t < .95; t += .12){ const x = (x1 + (farL + 15 - x1) * t), y = 1000 - 450 * t, w = 10 * (1 - t) + 3; s += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${w.toFixed(1)}" ry="${(w * .4).toFixed(1)}" fill="#fcd34d" opacity=".85"/>`; }
  });
  // floating candles (static) with soft glows
  for (let i = 0; i < 46; i++){
    const depth = rnd(), x = 80 + rnd() * 1440, y = 270 + depth * 330 + rnd() * 40, sc = .45 + depth * 1.1;
    if (x > 690 && x < 910 && y < 520 && depth < .4) continue;
    s += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${sc.toFixed(2)})"><circle cx="0" cy="-26" r="26" fill="url(#ghGlow)"/><rect x="-5" y="-14" width="10" height="34" rx="2" fill="#fdf6e3" stroke="#c9b48a" stroke-width="1.5"/><path d="M0 -26 Q6 -18 0 -14 Q-6 -18 0 -26Z" fill="#ffcf5c"/><path d="M0 -22 Q2.5 -18 0 -16 Q-2.5 -18 0 -22Z" fill="#fff8d6"/></g>`;
  }
  return s + '</svg>';
}

/* ---------- house points + trophy ---------- */
function weekKeyOf(d){ const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return todayStr(x); }
function housePoints(k, wk){ const kk = DB.kids[k]; if (!kk) return 0; wk = wk || weekKeyOf(new Date()); return (kk.sessions || []).filter(s => s.date && weekKeyOf(new Date(s.date)) === wk).reduce((t, s) => t + (s.stars || 0), 0); }
const HOUSE_GOAL = 120;
function houseStandings(wk){ const out = {}; HOUSE_IDS.forEach(h => out[h] = { pts:0, members:[] }); playerIds(false).forEach(id => { const w = DB.kids[id].wiz; if (w && w.house){ const p = housePoints(id, wk); out[w.house].pts += p; out[w.house].members.push([id, p]); } }); return out; }
function houseChip(){
  const W = WZ(); if (!W.house) return el('span',{class:'pill house-pill', onclick:()=>screenGreatHall()}, '🎩 Get sorted!');
  const H = HOUSES[W.house], pts = houseStandings()[W.house].pts;
  return el('span',{class:'pill house-pill', style:`--hp:${H.prim};--hs:${H.sec}`, onclick:()=>screenGreatHall()}, el('span',{class:'hp-crest', html:crestSVG(W.house, 20)}), ` ${H.name} · ${pts} pts`);
}

/* ---------- owl mail ---------- */
const HEADMISTRESS = 'Headmistress Elowen Quill';
function owlCheck(){
  const W = WZ(), wk = weekKeyOf(new Date());
  if (!W.accept){ W.accept = true; W.letters.unshift({ id:'accept', date:new Date().toISOString(), title:'Your letter from Starhaven Academy', kind:'accept', read:false,
    body:`Dear ${kidName()},\n\nWe are delighted to tell you that you have a place at Starhaven Academy of Reading Magic!\n\nAt Starhaven, every story you read makes your magic stronger. First, visit the Great Hall, where the Sorting Stone will choose your house. Then visit the Wandwright in Town Square. Your first wand is a gift from the Academy.\n\nWe can't wait to see what you read.\n\nYours magically,\n${HEADMISTRESS}` }); }
  const last = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return weekKeyOf(d); })();
  if (W.lastWeek !== last){
    W.lastWeek = last;
    const sess = (K.sessions || []).filter(s => s.date && weekKeyOf(new Date(s.date)) === last);
    if (sess.length){
      const stars = sess.reduce((t, s) => t + (s.stars || 0), 0), stories = sess.filter(s => s.kind === 'story' || (s.v2 && s.v2.storyId)).length;
      const t0 = new Date(last).getTime(), t1 = t0 + 7 * 864e5;
      const spells = (K.lm && K.lm.m && typeof CURR !== 'undefined') ? Object.entries(K.lm.m).filter(([, m]) => m.at >= t0 && m.at < t1).map(([id]) => CURR.SKILL[id] && CURR.SKILL[id].kid).filter(Boolean) : [];
      const H = W.house && HOUSES[W.house];
      const won = H && houseStandings(last)[W.house].pts >= HOUSE_GOAL;
      if (won) W.cups[last] = W.house;
      W.letters.unshift({ id:'w' + last, date:new Date().toISOString(), title:'News from Starhaven: week of ' + new Date(last).toLocaleDateString(undefined, { month:'short', day:'numeric' }), kind:'week', read:false,
        body:`Dear ${kidName()},\n\nWhat a week! You did ${sess.length} reading session${sess.length > 1 ? 's' : ''}${stories ? ` and read ${stories} stor${stories > 1 ? 'ies' : 'y'}` : ''}, earning ${stars} stars.` +
          (H ? ` That added ${stars} points to ${H.name}.` : '') +
          (won ? ` ${H.name} reached ${HOUSE_GOAL} points and wins the House Trophy for the week! 🏆` : '') +
          (spells.length ? `\n\nYou mastered ${spells.length > 1 ? 'new skills' : 'a new skill'}: ${spells.join(', ')}. That is real reading magic.` : '') +
          `\n\nThe candles in the Great Hall burn brighter every time you open a book. Keep reading!\n\nYours magically,\n${HEADMISTRESS}` });
    }
  }
  W.letters = W.letters.slice(0, 30);
}
let owlShown = false;
function owlPopup(){
  if (owlShown || !K || (navigator.webdriver && !window.__owlTest)) return; const W = WZ(), unread = W.letters.filter(l => !l.read);
  if (!unread.length || W.owlNag === todayStr() && unread.every(l => l.nagged)) return; owlShown = true;
  setTimeout(() => { if (document.querySelector('.overlay') || !document.querySelector('#app .home-nav') || !K.hero){ owlShown = false; return; }
    const first = unread[unread.length - 1]; W.owlNag = todayStr(); unread.forEach(l => l.nagged = true); save();
    modal(el('div',{class:'center'}, el('div',{style:'font-size:72px'}, '🦉'), el('h2',{}, unread.length > 1 ? unread.length + ' owls have arrived!' : 'An owl has arrived!'), el('p',{}, first.title)), [['Open the letter','',1],['Later','gray',0]])
      .then(ok => { if (ok) screenOwlMail(first.id); }); }, 900);
}
function screenOwlMail(openId){
  stopAll(); const W = WZ();
  const L = openId ? W.letters.find(l => l.id === openId) : null;
  if (L){
    L.read = true; save();
    const H = W.house && HOUSES[W.house];
    const actions = L.kind === 'accept' ? el('div',{class:'row center'},
      !W.house ? el('button',{class:'btn big', onclick:()=>screenSorting()}, '🪨 Go to the Sorting') : null,
      el('button',{class:'btn big blue', onclick:()=>screenWandShop()}, '🪄 Get my wand')) : null;
    show(el('div',{class:'screen'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenOwlMail()}, '← Letters'), el('h1',{class:'title'}, '🦉 Owl Mail'), el('div')),
      el('div',{class:'letter'},
        el('div',{class:'letter-seal', style:`--seal:${H ? H.prim : '#9f1d1d'}`, html: H ? crestSVG(W.house, 40) : '✦'}),
        el('h2',{}, L.title), ...L.body.split('\n\n').map(p => el('p',{}, ...p.split('\n').flatMap((ln, i) => i ? [el('br'), ln] : [ln]))),
        el('button',{class:'btn small blue', onclick:()=>say(L.body.replace(/\n+/g, ' '))}, '🔊 Read it to me')),
      actions));
    return;
  }
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenGreatHall()}, '← Great Hall'), el('h1',{class:'title'}, '🦉 Owl Mail'), el('div')),
    el('div',{class:'card'}, W.letters.length ? el('div',{class:'letter-list'}, ...W.letters.map(l => el('button',{class:'letter-row' + (l.read ? '' : ' unread'), onclick:()=>screenOwlMail(l.id)},
      el('span',{}, l.read ? '📜' : '✉️'), el('b',{}, l.title), el('small',{}, new Date(l.date).toLocaleDateString(undefined, { month:'short', day:'numeric' }))))) : el('p',{}, 'No letters yet. Owls come every week you read!'))));
}

/* ---------- sorting ceremony ---------- */
function sortingStoneSVG(glow){
  return `<svg viewBox="0 0 240 240" width="220" height="220" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="ssg"><stop offset="0" stop-color="${glow}" stop-opacity=".8"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="sss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d8aa3"/><stop offset="1" stop-color="#3f3b54"/></linearGradient></defs>
    <circle cx="120" cy="110" r="110" fill="url(#ssg)"/><ellipse cx="120" cy="206" rx="80" ry="14" fill="#000" opacity=".3"/>
    <path d="M60 196 Q46 120 82 64 Q120 20 160 60 Q196 110 180 196Z" fill="url(#sss)" stroke="#24141f" stroke-width="5" stroke-linejoin="round"/>
    <path d="M86 88 Q104 70 124 80 M96 120 l20 -8 l-4 20 l18 -6 M140 150 q10 -10 20 -2" stroke="${glow}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M78 80 Q92 52 120 46" stroke="#fff" stroke-width="5" opacity=".3" fill="none" stroke-linecap="round"/></svg>`;
}
function screenSorting(){
  stopAll(); const W = WZ();
  if (W.house) return screenGreatHall();
  const tally = Object.fromEntries(HOUSE_IDS.map(h => [h, 0])); let i = 0;
  const ask = () => {
    if (i >= SORT_QS.length) return reveal();
    const [q, opts] = SORT_QS[i];
    const order = shuffle(opts.map((t, j) => [t, HOUSE_IDS[j]]));
    show(el('div',{class:'screen'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenGreatHall()}, '← Back'), el('div',{class:'pageinfo'}, `The Sorting · ${i + 1} / ${SORT_QS.length}`), el('div',{style:'width:80px'})),
      el('div',{class:'card sort-card'},
        el('div',{class:'sort-stone', html:sortingStoneSVG('#a78bfa')}),
        el('h2',{}, q), el('button',{class:'btn small blue', onclick:()=>say(q + ' ' + order.map(o => o[0].replace(/^\S+\s/, '')).join('. '))}, '🔊 Hear it'),
        el('div',{class:'sort-opts'}, ...order.map(([t, h]) => el('button',{class:'sort-opt', onclick:()=>{ beep('tap'); tally[h]++; i++; ask(); }}, t))))));
    say(q);
  };
  const reveal = (forced) => {
    const max = Math.max(...Object.values(tally)), tied = HOUSE_IDS.filter(h => tally[h] === max);
    if (tied.length > 1 && !forced){
      show(el('div',{class:'screen'}, el('div',{class:'card sort-card'},
        el('div',{class:'sort-stone', html:sortingStoneSVG('#fde68a')}),
        el('h2',{}, 'Hmm… the Sorting Stone sees more than one path for you!'), el('p',{}, 'You choose:'),
        el('div',{class:'sort-opts'}, ...tied.map(h => el('button',{class:'sort-opt', style:`border-color:${HOUSES[h].sec}`, onclick:()=>reveal(h)}, el('span',{html:crestSVG(h, 40)}), ' ' + HOUSES[h].name + ' (' + HOUSES[h].trait + ')'))))));
      say('The Sorting Stone sees more than one path for you. You choose!');
      return;
    }
    const h = forced || tied[0], H = HOUSES[h];
    show(el('div',{class:'screen'}, el('div',{class:'card sort-card'}, el('div',{class:'sort-stone thinking', html:sortingStoneSVG(H.sec)}), el('h2',{}, 'The Sorting Stone is thinking…'))));
    say('Hmm. I see a ' + H.trait + ' heart…');
    setTimeout(() => {
      W.house = h; W.robes = [...new Set(W.robes.concat('house'))]; W.hats = [...new Set(W.hats.concat('house'))]; W.robe = W.robe || 'house'; W.hat = W.hat || 'house'; save();
      confetti(110); beep('level'); say(H.name + '!');
      show(el('div',{class:'screen'}, el('div',{class:'card sort-card house-reveal', style:`--hp:${H.prim};--hs:${H.sec}`},
        el('div',{class:'sort-crest', html:crestSVG(h, 170)}),
        el('h1',{class:'title'}, H.name + '!'), el('p',{class:'house-motto'}, '“' + H.motto + '”'),
        el('p',{}, `Every star you earn from reading adds points to ${H.name}. You got your house robe and hat. Find them in the Armory!`),
        el('div',{class:'hero-main', html:heroSVG(170)}),
        el('div',{class:'row center'}, el('button',{class:'btn big', onclick:()=>screenGreatHall()}, '🏰 To the Great Hall'), el('button',{class:'btn big blue', onclick:()=>screenWandShop()}, '🪄 Get my wand')))));
    }, 2200);
  };
  ask();
}

/* ---------- Great Hall screen ---------- */
function screenGreatHall(){
  stopAll(); const W = WZ(); owlCheck(); save();
  const st = houseStandings(), unread = W.letters.filter(l => !l.read).length;
  const mine = W.house && HOUSES[W.house];
  const cups = Object.values(W.cups || {}).length;
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('h1',{class:'title'}, '🏰 The Great Hall'), el('div')),
    el('div',{class:'gh-banner', html:greatHallSVG()}, el('div',{class:'gh-cap'}, 'Starhaven Academy of Reading Magic')),
    !W.house ? el('div',{class:'card center'}, el('div',{class:'sort-stone small', html:sortingStoneSVG('#a78bfa')}), el('h2',{}, 'The Sorting Stone is waiting for you!'), el('p',{}, 'Answer 5 questions and the stone will choose your house.'), el('button',{class:'btn big', onclick:()=>screenSorting()}, '🪨 Begin the Sorting')) : null,
    mine ? el('div',{class:'card house-card', style:`--hp:${mine.prim};--hs:${mine.sec}`},
      el('div',{class:'hc-crest', html:crestSVG(W.house, 90)}),
      el('div',{class:'grow'}, el('h2',{}, mine.name), el('p',{class:'house-motto'}, '“' + mine.motto + '”'),
        el('div',{class:'v2-prog'}, el('div',{class:'v2-bar'}, el('i',{style:`width:${Math.min(100, st[W.house].pts / HOUSE_GOAL * 100)}%;background:${mine.sec}`})), el('span',{}, `${st[W.house].pts} / ${HOUSE_GOAL} points this week`)),
        el('p',{class:'muted'}, st[W.house].pts >= HOUSE_GOAL ? '🏆 Your house earned the House Trophy this week!' : `Reach ${HOUSE_GOAL} points by Sunday to win the House Trophy. Every reading star = 1 point.`),
        cups ? el('p',{}, '🏆 House Trophies won: ' + cups) : null)) : null,
    el('div',{class:'card'}, el('h2',{}, 'House points this week'),
      el('div',{class:'house-table'}, ...HOUSE_IDS.map(h => { const H = HOUSES[h], x = st[h];
        return el('div',{class:'ht-row', style:`--hp:${H.prim};--hs:${H.sec}`}, el('span',{html:crestSVG(h, 34)}), el('b',{}, H.name), el('span',{class:'muted'}, x.members.length ? x.members.map(([id]) => kidName(id)).join(', ') : '—'), el('span',{class:'ht-pts'}, x.pts)); }))),
    el('div',{class:'cards'},
      el('div',{class:'card next-card'}, el('div',{style:'font-size:56px;line-height:1'}, '🦉'), el('h2',{}, 'Owl Mail'), el('p',{}, unread ? `${unread} new letter${unread > 1 ? 's' : ''}!` : 'Letters from the Headmistress.'), el('button',{class:'btn big blue', onclick:()=>screenOwlMail()}, unread ? '✉️ Read' : '📜 Letters')),
      el('div',{class:'card next-card'}, el('div',{style:'font-size:56px;line-height:1'}, '🪄'), el('h2',{}, 'Wandwright'), el('p',{}, W.wand ? 'Upgrade your wand.' : 'Your first wand is free!'), el('button',{class:'btn big blue', onclick:()=>screenWandShop()}, '🪄 Wands')),
      el('div',{class:'card next-card'}, el('div',{style:'font-size:56px;line-height:1'}, '🧙'), el('h2',{}, 'Wizard Wardrobe'), el('p',{}, 'Robes and hats in the Armory.'), el('button',{class:'btn big blue', onclick:()=>{ armorySlot = 'wizard'; screenArmory(); }}, '🧙 Wardrobe')))));
}

/* ---------- wand shop ---------- */
function screenWandShop(sel){
  stopAll(); const W = WZ();
  let gift = false;
  if (!W.woods.includes('oak') || !W.cores.includes('starlight')){ W.woods = [...new Set(W.woods.concat('oak'))]; W.cores = [...new Set(W.cores.concat('starlight'))]; if (!W.wand){ W.wand = { wood:'oak', core:'starlight' }; W.wandOn = true; gift = true; } save(); }
  sel = sel || Object.assign({}, W.wand);
  const preview = el('div',{class:'wand-prev'},
    el('div',{class:'wand-hero', html:heroSVG(190, { wiz:Object.assign({}, W, { wand:sel, wandOn:true }) })}),
    el('div',{class:'wand-big', html:`<svg viewBox="0 0 320 90" width="100%" xmlns="http://www.w3.org/2000/svg">${wandArt(24, 70, 290, 22, sel.wood, sel.core, 11)}</svg>`}),
    el('h2',{}, `${WOOD_BY[sel.wood].name} + ${CORE_BY[sel.core].name}`), el('p',{class:'muted'}, `${WOOD_BY[sel.wood].desc}. ${CORE_BY[sel.core].desc}.`));
  const isOwned = (kind, id) => (kind === 'wood' ? W.woods : W.cores).includes(id);
  const tile = (kind, it) => {
    const owned = isOwned(kind, it.id), on = sel[kind] === it.id;
    const art = kind === 'wood' ? wandArt(10, 40, 110, 12, it.id, sel.core, 6) : wandArt(10, 40, 110, 12, sel.wood, it.id, 6);
    return el('button',{class:'armory-item' + (on ? ' on' : '') + (owned ? '' : ' locked'), onclick:async ()=>{
      if (!owned){
        if (balance() < it.cost){ say(`You need ${it.cost} stars for ${it.name}. Keep reading!`); return; }
        const ok = await modal(el('div',{class:'center'}, el('h2',{}, `${it.name}?`), el('p',{}, `${it.cost} ⭐`)), [['Buy','',1],['Not now','gray',0]]); if (!ok) return;
        K.spent = (K.spent || 0) + it.cost; (kind === 'wood' ? W.woods : W.cores).push(it.id); beep('star');
      }
      sel = Object.assign({}, sel, { [kind]:it.id }); beep('tap'); screenWandShop(sel); }},
      el('div',{class:'ai-pic', html:`<svg viewBox="0 0 120 52" width="100%" xmlns="http://www.w3.org/2000/svg">${art}</svg>`}),
      el('div',{class:'ai-name'}, it.name), el('div',{class:'ai-sub'}, owned ? (on ? '✓ Chosen' : 'Tap to choose') : it.cost + ' ⭐'));
  };
  const same = W.wand && W.wand.wood === sel.wood && W.wand.core === sel.core;
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('h1',{class:'title'}, '🪄 The Wandwright'), el('span',{class:'pill'}, '⭐ ' + balance())),
    gift ? el('div',{class:'card center'}, el('h2',{}, '🎁 A gift from Starhaven!'), el('p',{}, 'Your first wand: Oak with a Starlight core. Buy new woods and cores with stars and mix them any way you like.')) : null,
    el('div',{class:'shop-layout'}, el('div',{class:'card'}, preview,
      el('div',{class:'row center'},
        same ? null : el('button',{class:'btn big', onclick:()=>{ W.wand = sel; W.wandOn = true; save(); confetti(50); beep('level'); say('Your new wand is ready!'); screenWandShop(sel); }}, '✨ Use this wand'),
        el('button',{class:'btn ' + (W.wandOn ? 'gray' : 'blue'), onclick:()=>{ W.wandOn = !W.wandOn; save(); screenWandShop(sel); }}, W.wandOn ? '⚔️ Hold my weapon instead' : '🪄 Hold my wand'))),
      el('div',{class:'grow'},
        el('div',{class:'card wand-sec'}, el('h2',{style:'margin-top:0'}, '🌳 Wand wood'), el('div',{class:'armory-grid'}, ...WAND_WOODS.map(w => tile('wood', w)))),
        el('div',{class:'card wand-sec'}, el('h2',{style:'margin-top:0'}, '✨ Wand core'), el('div',{class:'armory-grid'}, ...WAND_CORES.map(c => tile('core', c))))))));
}

/* ---------- wardrobe tab in the Armory ---------- */
function wizardWardrobe(grid){
  const W = WZ();
  const item = (kind, it) => {
    const list = kind === 'robe' ? W.robes : W.hats, owned = list.includes(it.id), on = W[kind] === it.id;
    const houseLocked = it.house && !W.house;
    const ov = Object.assign({}, W, { [kind]:it.id });
    return el('button',{class:'armory-item' + (owned ? '' : ' locked') + (on ? ' on' : ''), onclick:async ()=>{
        if (houseLocked){ say('Get sorted into a house in the Great Hall to unlock this!'); return; }
        if (!owned){
          if (balance() < it.cost){ say(`You need ${it.cost} stars. Keep reading!`); return; }
          const ok = await modal(el('div',{class:'center'}, el('h2',{}, it.name + '?'), el('p',{}, it.cost + ' ⭐')), [['Buy','',1],['Not now','gray',0]]); if (!ok) return;
          K.spent = (K.spent || 0) + it.cost; list.push(it.id); beep('star');
        }
        W[kind] = on ? null : it.id; save(); beep('tap'); screenArmory(); }},
      el('div',{class:'ai-pic', html: heroSVG(84, { wiz:ov })}),
      el('div',{class:'ai-name'}, it.name), el('div',{class:'ai-sub'}, houseLocked ? '🎩 Get sorted first' : owned ? (on ? '✓ Wearing (tap to remove)' : 'Tap to wear') : it.cost + ' ⭐'));
  };
  grid.append(el('h3',{class:'ww-h'}, '🧥 Robes'), ...ROBES.map(r => item('robe', r)), el('h3',{class:'ww-h'}, '🎩 Hats'), ...HATS.map(h => item('hat', h)),
    el('h3',{class:'ww-h'}, '🪄 Wand'),
    el('button',{class:'armory-item' + (W.wandOn && W.wand ? ' on' : ''), onclick:()=>{ if (!W.wand) return screenWandShop(); W.wandOn = !W.wandOn; save(); screenArmory(); }},
      el('div',{class:'ai-pic', html: W.wand ? `<svg viewBox="0 0 120 52" width="100%" xmlns="http://www.w3.org/2000/svg">${wandArt(10, 40, 110, 12, W.wand.wood, W.wand.core, 6)}</svg>` : ''}, W.wand ? null : '🪄'),
      el('div',{class:'ai-name'}, W.wand ? 'My wand' : 'No wand yet'), el('div',{class:'ai-sub'}, !W.wand ? 'Visit the Wandwright' : W.wandOn ? '✓ Holding (tap for weapon)' : 'Tap to hold')),
    el('button',{class:'armory-item', onclick:()=>screenWandShop()}, el('div',{class:'ai-pic', style:'font-size:44px'}, '🏪'), el('div',{class:'ai-name'}, 'Wandwright'), el('div',{class:'ai-sub'}, 'New woods & cores')));
}

/* ---------- hooks into the existing game ---------- */
const _screenHomeW = screenHome;
screenHome = function(msg){
  _screenHomeW(msg);
  if (!K || kid === 'dev' && !K.wiz) return;
  owlCheck(); save();
  const stats = document.querySelector('#app .screen .stats');
  if (stats) stats.append(houseChip());
  owlPopup();
};
PZ_BUILDINGS.push(
  { id:'hall',  x:420,  y:650, w:170, h:150, wall:'#e7e0f0', roof:'#4c1d95', trim:'#c4b5fd', kind:'tower', icon:'🏰', name:'Great Hall', sub:'Houses & owl mail', go:() => screenGreatHall() },
  { id:'wands', x:1130, y:780, w:170, h:130, wall:'#efe6f7', roof:'#6d28d9', trim:'#fbbf24', kind:'gable', icon:'🪄', name:'Wandwright', sub:'Wands', go:() => screenWandShop() });

/* ======================= EXPERT QUESTIONS (Gia from Rank 5) =======================
   Harder than Challenge: who-said-it, order of 4 events, spot the exact sentence (changed details),
   word meaning in context, plus the story's deepest written questions with look-alike wrong answers. All from memory. */
const SAY_V = 'said|asked|whispered|shouted|called|cried|yelled|replied|answered|added|muttered|explained|laughed|gasped|begged|snapped|announced|exclaimed|admitted|agreed|warned|growled|sighed';
const NOT_NAMES = new Set('He She They It The I We Then But And When So You His Her Their Its There This That What Where Why How One Two Everyone Nobody Someone Mom Dad Yes No Oh Maybe Just Now Soon Still At In On As If'.split(' '));
function storyNames(text){
  const t = text.replace(/\s+/g, ' '), cnt = {};
  (t.match(/(?<=[a-z,;] )[A-Z][a-z]{2,}/g) || []).forEach(n => { if (!NOT_NAMES.has(n)) cnt[n] = (cnt[n] || 0) + 1; });
  return Object.keys(cnt).filter(n => cnt[n] >= 2).sort((a, b) => cnt[b] - cnt[a]);
}
function quoteSpeakers(text){
  const t = text.replace(/\s+/g, ' '), out = [], Q = '[“"]', E = '[”"]';
  const pats = [new RegExp(`${Q}([^”"]{18,120}?)[,.!?]?${E},?\\s+(?:${SAY_V})\\s+([A-Z][a-z]+)`, 'g'), new RegExp(`${Q}([^”"]{18,120}?)[,.!?]?${E},?\\s+([A-Z][a-z]+)\\s+(?:${SAY_V})`, 'g')];
  pats.forEach(re => { let m; while ((m = re.exec(t))) if (!NOT_NAMES.has(m[2])) out.push({ q:m[1].trim(), who:m[2] }); });
  let m; const re3 = new RegExp(`([A-Z][a-z]+)\\s+(?:${SAY_V})[,:]?\\s+${Q}([^”"]{18,120}?)${E}`, 'g');
  while ((m = re3.exec(t))) if (!NOT_NAMES.has(m[1])) out.push({ q:m[2].replace(/[,.!?]$/, '').trim(), who:m[1] });
  return out;
}
const DETAIL_COLORS = ['red','blue','green','gold','golden','silver','purple','white','black','orange','yellow','pink','gray','brown'];
const DETAIL_NUMS = ['two','three','four','five','six','seven','eight','nine','ten','twelve','hundred'];
function expertExtras(story){
  const out = [], text = story.text, names = storyNames(text), plain = storySentences(text).filter(x => !/["“”]/.test(x));
  // 1. who said it?
  const quotes = quoteSpeakers(text).filter(x => names.includes(x.who) || names.length < 3);
  const qPick = shuffle(quotes).find(x => names.filter(n => n !== x.who).length >= 2);
  if (qPick){ const wrong = shuffle(names.filter(n => n !== qPick.who)).slice(0, 3);
    out.push({ q:`Who said this: “${qPick.q}”?`, opts:shuffle([qPick.who, ...wrong].map(t => ({ t, right:t === qPick.who }))) }); }
  // 2. order of four events
  if (plain.length >= 8){
    const n = plain.length, ev = [.08, .35, .62, .9].map(f => tidy(plain[Math.min(n - 1, Math.floor(n * f))]));
    if (new Set(ev).size === 4){
      const L = ['A','B','C','D'], disp = shuffle([0, 1, 2, 3]);           // disp[k] = which event is shown as letter k
      const letterOf = e => L[disp.indexOf(e)], right = [0, 1, 2, 3].map(letterOf).join(' → ');
      const perms = new Set([right]); while (perms.size < 4) perms.add(shuffle([0, 1, 2, 3]).map(letterOf).join(' → '));
      out.push({ q:'Put these in story order:\n' + L.map((l, k) => `${l}) ${ev[disp[k]]}`).join('\n'), order:true, opts:shuffle([...perms].map(t => ({ t, right:t === right }))) });
    }
  }
  // 3. which sentence is EXACTLY right? (one detail changed in the others)
  for (const s of shuffle(plain)){
    const words = s.split(' ');
    const swap = (list) => { const i = words.findIndex((w, j) => list.includes(w.replace(/[^\w]/g, '').toLowerCase()) || (list === names && j > 0 && list.includes(w.replace(/[^\w]/g, '')))); return i; };
    let i = swap(names), pool = names, cap = true;
    if (i < 0){ i = swap(DETAIL_COLORS); pool = DETAIL_COLORS; cap = false; }
    if (i < 0){ i = swap(DETAIL_NUMS); pool = DETAIL_NUMS; cap = false; }
    if (i < 0) continue;
    const orig = words[i].replace(/[^\w]/g, ''), alts = shuffle(pool.filter(x => x.toLowerCase() !== orig.toLowerCase())).slice(0, 3);
    if (alts.length < 3) continue;
    const fake = alts.map(a => { const w = words.slice(); w[i] = words[i].replace(orig, cap || /^[A-Z]/.test(orig) ? a[0].toUpperCase() + a.slice(1) : a); return tidy(w.join(' ')); });
    out.push({ q:'Which sentence is EXACTLY what the story says?', opts:shuffle([{ t:tidy(s), right:true }, ...fake.map(t => ({ t, right:false }))]) });
    break;
  }
  // 4. word meaning in context
  const defs = Object.entries(GLOSSARY);
  for (const s of shuffle(storySentences(text).filter(x => !/["“”]/.test(x)))){
    const w = s.split(/\s+/).map(x => x.replace(/[^\w'-]/g, '')).find(x => x.length > 4 && defFor(x));
    if (!w) continue;
    const d = defFor(w), wrong = shuffle(defs.map(x => x[1]).filter(x => x !== d)).slice(0, 3);
    out.push({ q:`“${tidy(s)}”\nWhat does “${w}” mean here?`, opts:shuffle([d, ...wrong].map(t => ({ t, right:t === d }))) });
    break;
  }
  return out;
}
function expertQuiz(story){
  const ch = challengeQuiz(story);                     // starts with the story's deepest written questions (look-alike wrong answers)
  const deep = ch.filter(x => !/happened (FIRST|LAST)|did NOT happen/.test(x.q)).slice(0, 2);
  const extra = shuffle(expertExtras(story)), notHap = ch.filter(x => /did NOT happen/.test(x.q));
  const out = deep.concat(extra.slice(0, 3));
  const spare = extra.slice(3).concat(notHap, ch.filter(x => !out.includes(x)));
  while (out.length < 5 && spare.length) out.push(spare.shift());
  const qs = shuffle(out).slice(0, 5); qs.extra = spare; return qs;
}

/* ======================= PATH OF POWERS: one unique power per hero, earned from Rank 5 ======================= */
const POWERS = {
  truesight: { name:'Truesight Eyes', color:'#f59e0b', use:'Hard words', desc:'Your eyes see inside hard words. While reading, tap a word to see its chunks (5 per story) without it counting as help. In quizzes, see what tricky words mean.' },
  frost:     { name:'Frostbound',     color:'#38bdf8', use:'Freeze time', desc:'Ice power! Once per quiz, freeze a wrong answer in ice and try again.' },
  storm:     { name:'Stormcaller',    color:'#64748b', use:'Wind & rain', desc:'Wind and rain obey you. Once per quiz, blow one wrong answer away.' },
  sky:       { name:'Skyborne',       color:'#a78bfa', use:'Flight',      desc:'You can fly! Once per quiz, soar over the story and see the sentence that holds the answer glow.' },
  blink:     { name:'Blink',          color:'#ec4899', use:'Teleport',    desc:'Teleport! Once per quiz, vanish from a question and land on a new one.' },
  laser:     { name:'Laser Gaze',     color:'#ef4444', use:'Laser eyes',  desc:'Perfect aim: every quiz you get 100% right earns +3 bonus stars. In boss battles, laser away two wrong answers once.' },
  totem:     { name:'Totem Keeper',   color:'#b45309', use:'Shaman totems', desc:'You carve spirit totems. Once per quiz, the Wisdom Totem whispers the secret of how to solve the question. Every quiz with 4+ right, your Totem of Plenty gives +1 star.' },
  light:     { name:'Lightbringer',   color:'#facc15', use:'Paladin light', desc:'Holy light! After you get 2 answers right in a quiz, your light can shine once and leave only 2 choices.' },
  invisible: { name:'Invisibility',   color:'#7c3aed', use:'Invisible',   desc:'Nobody can see you! Once per memory quiz, sneak a secret 5-second peek at the story and keep your memory bonus. In boss battles, turn invisible once so a wrong answer misses you.' },
  sorcery:   { name:'Sorcerer',       color:'#f97316', use:'Fireballs & lightning', desc:'Get 3 right in a row and a lightning wave strikes: +2 stars, every time! In boss battles, hurl a fireball once to burn away two wrong answers.' }
};
const TOTEM_TIPS = {
  'comp.sequence':'Picture the story like a movie. What happened at the start, the middle and the end?',
  'comp.cause':'Find the thing that happened, then look for the reason (the word "because" often hides near it).',
  'comp.character':'Think about what the character DID and SAID. Feelings show in actions.',
  'comp.infer':'The answer is not written. Put a clue from the story together with what you already know.',
  'comp.main_idea':'Which answer covers the WHOLE story, not just one part?',
  'comp.predict':'What do the clues point to? Pick what would most likely happen, not the silliest.',
  'comp.details':'Small words matter: names, colors and numbers. Which one matches exactly?',
  'comp.fact_opinion':'Can it be proven? That is a fact. Is it what someone feels? That is an opinion.',
  'comp.pov':'Look for I and we (a character tells it) or he, she and they (a narrator tells it).',
  'comp.compare':'Look for what is the SAME for both.',
  'comp.purpose':'Is it to teach, to entertain, or to get you to do something?',
  'voc.meaning':'Read the sentence around the word. Try each answer in its place. Which one makes sense?',
  'comp.literal':'This answer is right there in the story. Who, what, where or when?'
};
function powerEmblem(id, size){
  const P = POWERS[id], c = P.color, ink = '#24141f';
  const art = {
    truesight:`<path d="M20 60 Q60 22 100 60 Q60 98 20 60Z" fill="#fff" stroke="${ink}" stroke-width="5"/><circle cx="60" cy="60" r="20" fill="${c}" stroke="${ink}" stroke-width="4"/><path d="M60 46 L64 56 L74 60 L64 64 L60 74 L56 64 L46 60 L56 56Z" fill="#fff7d6"/>`,
    frost:`<g stroke="${ink}" stroke-width="10" stroke-linecap="round">${[0,60,120].map(a => `<path d="M60 18 V102" transform="rotate(${a} 60 60)"/>`).join('')}</g><g stroke="#e0f2fe" stroke-width="5" stroke-linecap="round">${[0,60,120].map(a => `<path d="M60 18 V102 M60 30 l-10 -9 M60 30 l10 -9 M60 90 l-10 9 M60 90 l10 9" transform="rotate(${a} 60 60)"/>`).join('')}</g><circle cx="60" cy="60" r="9" fill="${c}" stroke="${ink}" stroke-width="3"/>`,
    storm:`<path d="M28 52 Q24 32 44 30 Q50 14 70 20 Q90 16 92 36 Q106 40 100 54 Z" fill="#cbd5e1" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/><path d="M62 54 L50 76 H62 L54 98 L78 68 H66 L74 54Z" fill="#facc15" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><path d="M34 66 l-4 10 M44 70 l-4 10 M86 66 l-4 10 M96 62 l-4 10" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>`,
    sky:`<path d="M58 66 Q36 30 10 34 Q20 46 16 54 Q30 52 32 62 Q44 58 58 66Z" fill="#fff" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><path d="M62 66 Q84 30 110 34 Q100 46 104 54 Q90 52 88 62 Q76 58 62 66Z" fill="#fff" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="70" r="10" fill="${c}" stroke="${ink}" stroke-width="4"/>`,
    blink:`<path d="M60 18 A42 42 0 1 1 18 60" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/><path d="M60 34 A26 26 0 1 1 34 60" fill="none" stroke="#fbcfe8" stroke-width="8" stroke-linecap="round"/><circle cx="60" cy="60" r="10" fill="#fff" stroke="${ink}" stroke-width="4"/>${wStar(26, 30, 9, '#fff7d6')}`,
    totem:`<rect x="44" y="20" width="32" height="84" rx="4" fill="#d97706" stroke="${ink}" stroke-width="4"/><path d="M30 34 L44 30 L44 44Z M90 34 L76 30 L76 44Z" fill="#fde68a" stroke="${ink}" stroke-width="3"/><circle cx="53" cy="36" r="4" fill="${ink}"/><circle cx="67" cy="36" r="4" fill="${ink}"/><path d="M52 48 h16" stroke="${ink}" stroke-width="4"/><path d="M44 60 h32 M44 82 h32" stroke="${ink}" stroke-width="4"/><circle cx="53" cy="70" r="4" fill="#fff"/><circle cx="67" cy="70" r="4" fill="#fff"/><path d="M50 94 q10 6 20 0" stroke="${ink}" stroke-width="3" fill="none"/>`,
    light:`${[0,45,90,135,180,225,270,315].map(a => `<path d="M60 8 L64 28 L56 28Z" fill="#fde68a" transform="rotate(${a} 60 60)"/>`).join('')}<path d="M60 30 L86 40 Q86 74 60 92 Q34 74 34 40Z" fill="#fff" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>${wStar(60, 60, 17, c)}`,
    sorcery:`<circle cx="50" cy="66" r="24" fill="${c}" stroke="${ink}" stroke-width="4"/><path d="M30 56 Q20 36 36 26 Q36 40 46 44 Q44 28 58 18 Q58 34 70 42 Q78 34 76 24 Q90 40 74 58" fill="#fdba74" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="68" r="11" fill="#fef3c7"/><path d="M86 52 L76 74 H86 L80 98 L102 66 H92 L98 52Z" fill="#facc15" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>`,
    invisible:`<path d="M60 18 Q90 18 90 52 V98 L80 90 L70 100 L60 90 L50 100 L40 90 L30 98 V52 Q30 18 60 18Z" fill="#fff" fill-opacity=".55" stroke="${ink}" stroke-width="4" stroke-dasharray="9 6" stroke-linejoin="round"/><ellipse cx="50" cy="50" rx="6" ry="8" fill="${c}"/><ellipse cx="70" cy="50" rx="6" ry="8" fill="${c}"/>${wStar(94, 24, 8, '#fff7d6')}${wStar(24, 80, 6, '#fff7d6')}`,
    laser:`<path d="M14 58 Q36 34 58 58 Q36 78 14 58Z M62 58 Q84 34 106 58 Q84 78 62 58Z" fill="#fff" stroke="${ink}" stroke-width="4"/><circle cx="36" cy="57" r="8" fill="${c}"/><circle cx="84" cy="57" r="8" fill="${c}"/><path d="M36 66 L22 108 M84 66 L98 108" stroke="${c}" stroke-width="8" stroke-linecap="round"/><path d="M36 66 L22 108 M84 66 L98 108" stroke="#fee2e2" stroke-width="3" stroke-linecap="round"/>`
  }[id];
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="56" fill="${c}" opacity=".22"/><circle cx="60" cy="60" r="56" fill="none" stroke="${c}" stroke-width="4"/>${art}</svg>`;
}
const PW = () => (K && K.power && POWERS[K.power.id]) ? K.power.id : null;
const TRIALS = [
  { id:'focus',    name:'Trial of Focus',    need:5, of:5,  desc:'Read a story from the NEXT rank once. Then answer 5 expert questions from memory. You need all 5.' },
  { id:'words',    name:'Trial of Words',    need:7, of:8,  desc:'8 tricky words, each in its sentence. What does it mean? You need 7 of 8.' },
  { id:'clues',    name:'Trial of Clues',    need:7, of:8,  desc:'8 detective puzzles: hidden clues, predictions, main ideas, fact or opinion. You need 7 of 8.' },
  { id:'memory',   name:'Trial of Memory',   need:5, of:6,  desc:'Read a long story ONE time. Then 6 expert questions, no looking back. You need 5 of 6.' },
  { id:'guardian', name:'The Power Guardian',need:9, of:10, desc:'The final test: read one more story, then 10 of the hardest questions. You need 9 of 10.' }
];
function PP(){ K.powerPath = Object.assign({ done:[], rest:{}, tries:0 }, K.powerPath || {}); return K.powerPath; }
const trialIcon = i => ['🎯','📖','🔍','🧠','🛡️'][i];
function trialStory(offset){
  const lv = Math.min(T.levels.length, K.level + 1), L = T.levels.find(l => l.n === lv) || T.levels[T.levels.length - 1];
  let pool = (L.stories || []).filter(s => s.qs && s.qs.length >= 4 && s.text);
  if (TK === 'daughter' && typeof DAUGHTER_EXTRA !== 'undefined' && DAUGHTER_EXTRA[lv]) pool = pool.concat(DAUGHTER_EXTRA[lv].filter(s => s.text && s.qs));
  const used = PP().used || [];
  pool = pool.filter(s => !used.includes(s.title)).sort((a, b) => b.text.length - a.text.length);
  return pool[offset % Math.max(1, pool.length)] || L.stories[0];
}
const asItem = q => { const a = q.opts.findIndex(o => o.right); return { skill:CURR.tagQuestion(q.q), type:'pick', prompt:q.q, options:q.opts.map(o => ({ t:o.t })), answer:a, explain:'Answer: ' + q.opts[a].t }; };
function vocabTrialItems(n){
  const defs = Object.entries(GLOSSARY), seen = new Set(), items = [];
  const stories = shuffle(allTrackStories(TK).filter(s => s.text));
  for (const st of stories){
    for (const s of shuffle(storySentences(st.text).filter(x => !/["“”]/.test(x)))){
      const w = s.split(/\s+/).map(x => x.replace(/[^\w'-]/g, '')).find(x => x.length > 4 && defFor(x) && !seen.has(defFor(x)));
      if (!w) continue; const d = defFor(w); seen.add(d);
      const o = shuffle([d, ...shuffle(defs.map(x => x[1]).filter(x => x !== d)).slice(0, 3)]);
      items.push({ skill:'voc.context', type:'pick', prompt:`“${tidy(s).replace(new RegExp('\\b' + w + '\\b'), '**' + w + '**')}”\nWhat does “${w}” mean here?`, options:o.map(t => ({ t })), answer:o.indexOf(d), explain:`${w}: ${d}` });
      break;
    }
    if (items.length >= n) break;
  }
  return items;
}
function cluesTrialItems(n){
  const ids = shuffle(['comp.infer','comp.predict','comp.main_idea','comp.fact_opinion','comp.pov','comp.compare','comp.purpose','comp.infer']);
  CURR.seed(Date.now()); const items = [], seen = new Set();
  for (let i = 0; items.length < n && i < 40; i++){ const it = CURR.makeItem(ids[i % ids.length], 5, i); if (it && !seen.has(it.prompt)){ seen.add(it.prompt); items.push(it); } }
  return items;
}
function screenPowers(){
  stopAll(); const P = PP(), today = todayStr();
  if (PW()) return screenMyPower();
  const locked = K.level < 5;
  const step = P.done.length, T0 = TRIALS[step];
  const resting = T0 && P.rest[T0.id] === today;
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('h1',{class:'title'}, '⚡ Path of Powers'), el('div')),
    el('div',{class:'card pow-intro'},
      el('div',{class:'pow-emblems', html:Object.keys(POWERS).map(id => powerEmblem(id, 58)).join('')}),
      el('h2',{}, 'Every hero has ONE hidden power.'),
      el('p',{}, 'Pass all 5 trials to awaken yours: Truesight Eyes, Frostbound, Stormcaller, Skyborne, Blink, Laser Gaze, Totem Keeper, Lightbringer, Sorcerer or Invisibility. Each power can belong to only one hero in your family.'),
      el('p',{class:'muted'}, 'The trials are hard on purpose. If you fail one, your power needs to rest until tomorrow.')),
    locked ? el('div',{class:'card center'}, el('h2',{}, '🔒 Reach Rank 5 to begin'), el('p',{}, `You are Rank ${K.level}. Keep reading and beating bosses!`)) :
    el('div',{class:'pow-path'}, ...TRIALS.map((t, i) => {
      const done = i < step, cur = i === step;
      return el('div',{class:'card pow-step' + (done ? ' done' : cur ? ' cur' : ' lock')},
        el('div',{class:'pow-num'}, done ? '✓' : trialIcon(i)),
        el('div',{class:'grow'}, el('h3',{}, `${i + 1}. ${t.name}`), el('p',{}, t.desc)),
        cur ? (resting ? el('div',{class:'pow-rest'}, '💤 Resting. Try again tomorrow!') : el('button',{class:'btn big', onclick:()=>runTrial(i)}, '⚔️ Begin')) : done ? el('b',{class:'pow-ok'}, 'Passed') : el('span',{class:'muted'}, '🔒'));
    })),
    !locked && step >= TRIALS.length ? el('div',{class:'card center'}, el('h2',{}, 'All trials passed!'), el('button',{class:'btn big', onclick:()=>screenAwaken()}, '✨ Awaken my power')) : null));
}
function runTrial(i){
  const t = TRIALS[i], P = PP(), sid = kid + '_trial_' + Date.now();
  const finish = res => {
    const k = res.filter(r => r.ok).length, pass = k >= t.need;
    P.tries++;
    if (pass){ P.done.push(t.id); confetti(80); beep('level'); }
    else { P.rest[t.id] = todayStr(); beep('bad'); }
    if (typeof CURR !== 'undefined' && K.lm) CURR.commit(K.lm);
    K.sessions.unshift({ id:sid, date:new Date().toISOString(), level:K.level, title:'⚡ ' + t.name, kind:'trial', mode:'trial', accuracy:Math.round(k / res.length * 1000) / 10, quiz:k + '/' + res.length, stars: pass ? 10 : 2, missed:[], total:0, correct:0, helped:0 });
    K.stars += pass ? 10 : 2; save();
    show(el('div',{class:'screen'}, el('div',{class:'card center pow-result ' + (pass ? 'win' : 'lose')},
      el('div',{class:'hero-main', html:heroSVG(150)}),
      el('h1',{class:'title'}, pass ? `${t.name}: PASSED!` : 'Not this time…'),
      el('p',{style:'font-size:22px'}, `${k} of ${res.length} right (needed ${t.need}).`),
      el('p',{}, pass ? (i === TRIALS.length - 1 ? 'You defeated the Power Guardian! Your power is ready to awaken.' : 'The next trial is open. +10 ⭐') : 'Your power must rest. Come back tomorrow and try again. Real heroes try again! +2 ⭐'),
      el('div',{class:'row center'}, pass && i === TRIALS.length - 1 ? el('button',{class:'btn big', onclick:()=>screenAwaken()}, '✨ Awaken my power') : el('button',{class:'btn big', onclick:()=>screenPowers()}, '⚡ Path of Powers'), el('button',{class:'btn gray', onclick:()=>screenHome()}, '🏠 Home')))));
  };
  const ask = (items, title) => v2RunItems(items, { mode:'placement', src:'trial', sid, title, finishLabel:'See result', onQuit:screenPowers, onDone:finish });
  const readThen = (story, build, title) => {
    P.used = (P.used || []).concat(story.title).slice(-30);
    const t0 = Date.now();
    show(el('div',{class:'screen'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenPowers()}, '← Back'), el('div',{class:'pageinfo'}, title + ' · read carefully, ONE time'), el('div',{style:'width:80px'})),
      el('div',{class:'card v2-read'}, el('h2',{}, (story.emoji || '📖') + ' ' + story.title),
        ...story.text.split(/\n\s*\n/).map(p => el('p',{}, ...p.split(/(\s+)/).map(w => /\S/.test(w) ? el('span',{class:'v2-w', onclick:ev=>{ ev.target.classList.add('helped'); say(w.replace(/[^\w']/g, '')); }}, w) : w))),
        el('p',{class:'muted'}, 'When you tap Done, the story disappears. The questions are answered from memory.'),
        el('button',{class:'btn big', onclick:async ()=>{ if (Date.now() - t0 < Math.min(60000, story.text.split(/\s+/).length * 150)){ const ok = await modal(el('p',{}, 'That was fast! Are you sure you read it all?'), [['Yes, I\'m ready','',1],['Keep reading','gray',0]]); if (!ok) return; } ask(build(story), title); }}, '✓ Done reading'))));
  };
  const ex = (story, n) => { const q = expertQuiz(story); return q.concat(q.extra || []).slice(0, n).map(asItem); };
  if (t.id === 'focus') readThen(trialStory(0), s => ex(s, 5), t.name);
  if (t.id === 'words') ask(vocabTrialItems(8), t.name);
  if (t.id === 'clues') ask(cluesTrialItems(8), t.name);
  if (t.id === 'memory') readThen(trialStory(1), s => ex(s, 6), t.name);
  if (t.id === 'guardian') readThen(trialStory(2), s => shuffle(ex(s, 5).concat(vocabTrialItems(3), cluesTrialItems(2))), t.name);
}
function takenPowers(){ const out = {}; playerIds(false).forEach(id => { const k = DB.kids[id]; if (id !== kid && k && k.power && k.power.id) out[k.power.id] = kidName(id); }); return out; }
function screenAwaken(){
  stopAll(); const P = PP(); if (P.done.length < TRIALS.length) return screenPowers(); if (PW()) return screenMyPower();
  const taken = takenPowers();
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenPowers()}, '← Back'), el('h1',{class:'title'}, '✨ Awakening'), el('div')),
    el('div',{class:'card center'}, el('h2',{}, 'Choose the power that lives inside you.'), el('p',{class:'muted'}, 'This choice is forever. Each power belongs to only one hero in your family.')),
    el('div',{class:'pow-grid'}, ...Object.entries(POWERS).map(([id, p]) => el('button',{class:'pow-card' + (taken[id] ? ' taken' : ''), style:`--pc:${p.color}`, onclick:async ()=>{
      if (taken[id]) return say(`${p.name} belongs to ${taken[id]}.`);
      say(p.name + '. ' + p.desc);
      const ok = await modal(el('div',{class:'center'}, el('div',{html:powerEmblem(id, 120)}), el('h2',{}, p.name + '?'), el('p',{}, p.desc), el('p',{class:'muted'}, 'This is forever!')), [['Awaken it!','',1],['Not yet','gray',0]]);
      if (!ok) return;
      K.power = { id, at:new Date().toISOString() }; save();
      confetti(140); beep('level'); say('Your power has awakened! You are ' + p.name + '!');
      screenMyPower(true);
    }}, el('div',{html:powerEmblem(id, 96)}), el('h3',{}, p.name), el('div',{class:'pow-use'}, p.use), el('p',{}, p.desc), taken[id] ? el('div',{class:'pow-taken'}, '🔒 ' + taken[id] + '\'s power') : null)))));
}
function screenMyPower(fresh){
  stopAll(); const id = PW(); if (!id) return screenPowers(); const p = POWERS[id];
  document.body.dataset.power = id;
  show(el('div',{class:'screen'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('h1',{class:'title'}, '⚡ My Power'), el('div')),
    el('div',{class:'card center pow-mine', style:`--pc:${p.color}`},
      fresh ? el('h2',{}, 'YOUR POWER HAS AWAKENED!') : null,
      el('div',{class:'pow-mine-art'}, el('div',{class:'hero-main', html:heroSVG(190)}), el('div',{class:'pow-mine-em', html:powerEmblem(id, 110)})),
      el('h1',{class:'title'}, p.name), el('div',{class:'pow-use'}, p.use), el('p',{style:'font-size:20px'}, p.desc),
      el('p',{class:'muted'}, 'Look for the ⚡ power button in your story quizzes and boss battles.'),
      el('button',{class:'btn big', onclick:()=>screenHome()}, '🏠 Home'))));
}
function powerButton(Q, item, optsBox, card, fb, memoryReveal){
  const id = PW(); if (!id || run.opts.trial) return null;
  const p = POWERS[id], boss = !!run.opts.boss;
  if ((id === 'laser' || id === 'sorcery') && !boss) return null;   // their quiz bonuses are automatic
  if (id === 'light' && Q.correct < 2 && !Q.powerUsed) return el('button',{class:'btn small power-btn', style:`--pc:${p.color}`, disabled:true}, el('span',{html:powerEmblem(id, 26)}), ` Light charging… (${Q.correct}/2 right)`);
  if (id === 'truesight'){
    const words = [...new Set((item.q + ' ' + item.opts.map(o => o.t).join(' ')).split(/\s+/).map(x => x.replace(/[^\w'-]/g, '')).filter(x => x.length > 4 && defFor(x)))];
    if (!words.length) return null;
    return el('button',{class:'btn small power-btn', style:`--pc:${p.color}`, onclick:ev=>{ beep('star'); ev.target.replaceWith(el('div',{class:'pow-defs'}, ...words.map(w => el('div',{}, el('b',{}, '👁️ ' + w + ': '), defFor(w))))); }}, el('span',{html:powerEmblem(id, 26)}), ' Truesight');
  }
  if (Q.powerUsed) return null;
  if (id === 'invisible' && !boss && !(memoryReveal && card.classList.contains('peek-hidden'))) return null;   // nothing to sneak a look at
  const use = () => { Q.powerUsed = true; beep('star'); burst(p.name.toUpperCase() + '!'); };
  const label = { frost:'Freeze time', storm:'Blow away a wrong answer', sky:'Fly to the clue', blink:'Teleport to a new question', laser:'Laser blast', invisible: boss ? 'Turn invisible' : 'Secret 5-second peek', totem:'Ask the Wisdom Totem', light:'Shine the light', sorcery:'Hurl a fireball' }[id];
  const b = el('button',{class:'btn small power-btn', style:`--pc:${p.color}`, onclick:()=>{
    const btns = [...optsBox.children], wrongs = btns.filter((c, i) => !item.opts[i].right && !c.classList.contains('gone') && !c.classList.contains('wrong'));
    if (id === 'totem'){ const tag = CURR.tagQuestion(item.q); fb.textContent = '🗿 The Wisdom Totem whispers: ' + (item.order ? 'Find the event that starts the story first, then the one that ends it. Only one order fits both!' : TOTEM_TIPS[tag] || TOTEM_TIPS['comp.literal']); fb.style.color = '#92400e'; use(); b.remove(); }
    if (id === 'storm' || id === 'laser' || id === 'sorcery' || id === 'light'){ shuffle(wrongs).slice(0, id === 'storm' ? 1 : 2).forEach(c => { c.classList.add('gone'); c.disabled = true; }); use(); b.remove(); }
    if (id === 'invisible'){
      if (boss){ Q.frostArmed = item; use(); b.textContent = '👻 Invisible: a wrong answer will miss you'; b.disabled = true; return; }
      const cover = card.querySelector('.peek-cover'); card.classList.remove('peek-hidden'); if (cover) cover.style.display = 'none';
      use(); b.textContent = '👻 Peeking… 5'; b.disabled = true; let n = 5;
      const tick = setInterval(() => { n--; if (n > 0){ b.textContent = '👻 Peeking… ' + n; return; } clearInterval(tick); if (!item.looked){ card.classList.add('peek-hidden'); if (cover) cover.style.display = ''; } b.textContent = '👻 Peek used'; }, 1000);
      return;
    }
    if (id === 'frost'){ Q.frostArmed = item; use(); b.textContent = '❄️ Time frozen: a wrong answer gets a second try'; b.disabled = true; }
    if (id === 'blink'){ const nx = (Q.qs.extra || []).shift(); if (!nx){ fb.textContent = 'No spare questions to teleport to here.'; return; } Q.qs[Q.i] = nx; use(); renderQuestion(); }
    if (id === 'sky'){
      if (memoryReveal) memoryReveal();
      const right = item.opts.find(o => o.right).t.replace(/[^\w\s'’-]/g, ' ');
      const sc = proofScores(card.sentences, item.q, right), best = Math.max(0, ...sc);
      if (best >= 1){ card.sentSpans[sc.indexOf(best)].forEach(n => n.classList.add('proof-ok')); card.sentSpans[sc.indexOf(best)][0].scrollIntoView({ block:'center', behavior:'smooth' }); fb.textContent = '🪽 You flew over the story. The glowing sentence holds the clue!'; }
      else fb.textContent = '🪽 You flew over the story. This one needs your own thinking!';
      use(); b.remove();
    }
  }}, el('span',{html:powerEmblem(id, 26)}), ' ' + label);
  return b;
}
function addPowerChip(){
  const id = PW(); const stats = document.querySelector('#app .screen .stats'); if (!stats) return;
  document.body.dataset.power = id || '';
  if (id) stats.append(el('span',{class:'pill power-pill', style:`--pc:${POWERS[id].color}`, onclick:()=>screenMyPower()}, el('span',{html:powerEmblem(id, 22)}), ' ' + POWERS[id].name));
}
const _screenHomeP = screenHome;
screenHome = function(msg){ _screenHomeP(msg); if (K) addPowerChip(); };

/* passive power effects, called after every quiz answer */
function powerOnAnswer(Q, right, fb){
  const id = PW(); if (!id || run.opts.trial) return;
  Q.streak = right ? (Q.streak || 0) + 1 : 0;
  const bonus = (n, why) => { run.proofStars = (run.proofStars || 0) + n; setTimeout(() => { fb.textContent += `  ${why} +${n} ⭐`; }, 40); };
  if (id === 'sorcery' && right && Q.streak > 0 && Q.streak % 3 === 0){ bonus(2, '⚡ Lightning wave!'); burst('LIGHTNING!'); }
  const last = Q.i === Q.qs.length - 1;
  if (id === 'laser' && last && Q.correct === Q.qs.length) bonus(3, '🔆 Laser perfect!');
  if (id === 'totem' && last && Q.correct >= 4) bonus(1, '🗿 Totem of Plenty!');
}
/* Truesight in the read-aloud reader: first tap on a long word shows its chunks (not counted as help), 5 per story */
function chunkWord(w){
  const D = { th:'1', sh:'2', ch:'3', ph:'4', gh:'5', wh:'6', ck:'7', qu:'9' }, back = Object.fromEntries(Object.entries(D).map(([k, v]) => [v, k]));
  const t = w.toLowerCase().replace(/th|sh|ch|ph|gh|wh|ck|qu/g, m => D[m]);
  const m = t.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/g); if (!m) return w;
  if (m.length > 1 && /^[^aeiouy]*e$/.test(m[m.length - 1])){ const l = m.pop(); m[m.length - 1] += l; }   // silent e stays with its chunk
  const out = m.map(c => c.replace(/[1-9]/g, d => back[d]));
  return out.join('').length === w.length ? out.join(' · ') : w;
}
function truesightTap(p, i){
  if (PW() !== 'truesight' || !run) return false;
  const w = (p.tokens[i].disp || '').replace(/[^A-Za-z]/g, '');
  if (w.length < 5) return false;
  p.tsShown = p.tsShown || {}; if (p.tsShown[i]) return false;
  if (run.tsLeft == null) run.tsLeft = 5; if (run.tsLeft <= 0) return false;
  p.tsShown[i] = 1; run.tsLeft--; beep('star');
  const t = el('div',{class:'ts-chunks'}, el('span',{html:powerEmblem('truesight', 34)}), el('b',{}, chunkWord(w)), el('small',{}, `Truesight: ${run.tsLeft} left. Tap again to hear it.`));
  document.body.append(t); setTimeout(() => t.remove(), 3500);
  return true;
}

if (navigator.webdriver) window.__sb = { expertQuiz, expertExtras, challengeQuiz, allTrackStories, quoteSpeakers, storyNames, chunkWord, heroSVG, mountSVG, MOUNTS, getK: () => K, getDB: () => DB, GEAR_SETS, GEAR_SLOTS };
mountEpicBg(); setInterval(mountEpicBg, 10 * 60 * 1000);
if (navigator.webdriver) window.__landing = () => screenFamilyLogin();
/* ======================= STORYBORNE 2.0: adaptive curriculum UI =======================
   Engine: curriculum.js (window.CURR). This block only renders it and feeds it evidence.
   Evidence comes from: lesson activities, placement, v2 story reads, AND every v1 story/quiz (hooks below). */
const V2 = typeof CURR !== 'undefined';
function LM(k){ const kk = k || K; kk.lm = CURR.ensure(kk.lm); return kk.lm; }
function v2Sid(){ return kid + '_v2_' + Date.now(); }
const v2Esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[c]);
const v2Bold = s => v2Esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="v2-hl">$1</b>').replace(/\n/g, '<br>');
const STATE_INFO = { na:['Not introduced','#94a3b8','○'], emerging:['Emerging','#f97316','◔'], developing:['Developing','#eab308','◑'], mastered:['Mastered','#22c55e','●'], review:['Needs review','#ef4444','↻'] };

/* ---------- library: every existing story, tagged by the engine ---------- */
let V2LIB = null;
function v2Library(){
  if (V2LIB && V2LIB.tk === TK && V2LIB.custom === (K.v2custom || []).length) return V2LIB.list;
  const out = [], add = (st, src, lvl) => {
    if (!st || !st.text || !st.qs || st.qs.length < 3) return;
    const id = src + ':' + st.title;
    if (out.some(x => x.id === id)) return;
    const a = CURR.analyzeText(st.text);
    out.push({ id, title:st.title, emoji:st.emoji || '📖', text:st.text, qs:st.qs.map(q => [q[0], q[1], q[2], q[3] || CURR.tagQuestion(q[0])]), band:a.band, analysis:a, src, lvl });
  };
  const trackStories = tr => (tr.levels || []).forEach(L => (L.stories || []).forEach(st => add(st, tr.key || 'track', L.n)));
  if (typeof SON_TRACK !== 'undefined') trackStories(SON_TRACK);
  if (typeof DAUGHTER_TRACK !== 'undefined') trackStories(DAUGHTER_TRACK);
  if (typeof DAUGHTER_EXTRA !== 'undefined') Object.entries(DAUGHTER_EXTRA).forEach(([lv, arr]) => arr.forEach(st => add(st, 'tales', +lv)));
  (K.v2custom || []).forEach(st => add(st, 'lab', 0));
  V2LIB = { tk:TK, custom:(K.v2custom || []).length, list:out };
  return out;
}
const v2Theme = () => K.v2theme || (TK === 'daughter' ? 'fantasy' : 'animals');

/* ---------- hooks: v1 activities also feed the learner model ---------- */
const _trackQ = trackQ;
trackQ = function(q, ok){
  _trackQ(q, ok);
  if (!V2 || !K) return;
  const lm = LM(), sid = run && run.sessionId || v2Sid();
  CURR.record(lm, { s:CURR.tagQuestion(q), k:ok ? 1 : 0, n:1, ind:true, c:0.9, src:'story', sid });
};
function v2ReadConfidence(res){
  // grown-up scoring is reliable; speech recognition on young readers is not ground truth
  if (useManual()) return 0.95;
  if (!res || !res.total) return 0.5;
  return 0.5;   // the iPad mic isn't reliable for young readers: mic results are kept for practice but never count toward skill mastery
}
function v2WordsFromRun(act){
  const words = [];
  (act.pages || []).forEach(p => (p.tokens || []).forEach((t, i) => { if (!t.skip && t.n) words.push({ w:t.n, ok:p.status[i] === 'ok', helped:!!(p.helped && p.helped[i]) }); }));
  return words;
}
function v2StoryHook(r, R){
  if (!V2 || !r || !r.act || r.act.quiet || r.act.kind !== 'story') return;
  const lm = LM(), text = (r.act.story && r.act.story.text) || '';
  const ev = CURR.storyEvidence(v2WordsFromRun(r.act), { names:CURR.properNames(text), wcpm:R && R.wcpm, band:CURR.currentBand(lm), c:v2ReadConfidence(R) });
  ev.forEach(e => CURR.record(lm, Object.assign(e, { sid:r.sessionId })));
  CURR.commit(lm);
}

/* ---------- entry point: first card in the existing Practice screen (no new home UI) ---------- */
function v2Start(){ beep('tap'); LM().placedAt ? v2Lesson() : v2PlacementIntro(); }
const v2Hero = (n) => { try { return el('div',{class:'v2-hero', html:heroSVG(n || 130)}); } catch(e){ return el('div',{class:'v2-big-e'}, '⭐'); } };
/* ---------- activity player (shared by lessons and placement) ---------- */
const DECODE_DOMAINS = ['ph','dec','sw','pa'];
function v2RunItems(items, o){
  let i = 0; const results = [];
  const lm = LM();
  const step = () => {
    if (i >= items.length) return o.onDone(results);
    const it = items[i], sk = CURR.SKILL[it.skill], decodeItem = DECODE_DOMAINS.includes(sk.domain);
    let tries = 0, helped = false, locked = false;
    const fb = el('div',{class:'v2-fb'});
    const nextBtn = el('button',{class:'btn big hidden', onclick:()=>{ i++; step(); }}, i < items.length - 1 ? 'Next ▶' : (o.finishLabel || 'Done ✓'));
    const optBox = el('div',{class:'v2-opts' + (it.options.some(x => x.big) ? ' big' : '')});
    const answer = (idx, btn) => {
      if (locked) return;
      const right = idx === it.answer;
      tries++;
      // first try counts as independent (unless help was used on a decoding item); a retry is always "assisted"
      const ind = tries === 1 && !(helped && decodeItem);
      if (!o.norecord) CURR.record(lm, { s:it.skill, k:right ? 1 : 0, n:1, ind, c:0.9, src:o.src || 'activity', sid:o.sid });
      if (tries === 1) results.push({ skill:it.skill, ok:right, ind, role:it.role });
      if (right){
        locked = true; btn.classList.add('right'); beep('ok');
        fb.innerHTML = '✨ ' + v2Esc(tries === 1 ? CURR_PRAISE() : 'You figured it out!') + ' <span class="muted">' + v2Esc(it.explain || '') + '</span>';
        nextBtn.classList.remove('hidden');
        if (it.word) say(it.word, { rate:0.8 });
      } else if (o.mode === 'placement' || tries >= 2){
        locked = true; btn.classList.add('wrong');
        [...optBox.children][it.answer].classList.add('right');
        fb.innerHTML = (o.mode === 'placement' ? '👍 Thanks! ' : '💡 ') + v2Esc(it.explain || '');
        nextBtn.classList.remove('hidden');
      } else {
        btn.classList.add('wrong'); btn.disabled = true; beep('no');
        fb.innerHTML = '💡 Not quite. Look again and try one more time!' + (it.explain && it.type === 'read' ? ' <button class="btn small blue" id="v2hint">🔊 Hear the word</button>' : '');
        const hb = fb.querySelector('#v2hint'); if (hb) hb.onclick = () => { helped = true; say(it.word, { rate:0.7 }); };
      }
    };
    it.options.forEach((op, idx) => {
      const b = el('button',{class:'v2-opt' + (op.big ? ' big' : ''), 'data-ok': navigator.webdriver && idx === it.answer ? '1' : null}, el('span',{class:'v2-opt-t'}, op.t), op.label ? el('small',{}, op.label) : null);
      b.onclick = () => answer(idx, b);
      optBox.append(b);
    });
    const canHear = it.say && (it.type === 'hear' || it.type === 'pick');
    const helpBtn = it.type === 'read' && o.mode !== 'placement' ? el('button',{class:'btn small gray', onclick:()=>{ helped = true; say(it.word, { rate:0.7 }); helpBtn.textContent = '🔊 heard (counts as help)'; }}, '🆘 Hear it') : null;
    const roleTag = { gap:'🧱 Rebuild', review:'🔁 Review', confirm:'✅ Check', target:'🎯 New skill', target2:'🎯 Skill' }[it.role] || (o.mode === 'placement' ? '🧭 Reading check' : '');
    const s = el('div',{class:'screen v2'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>{ stopAll(); o.onQuit ? o.onQuit() : screenHome(); }}, '← Back'),
        el('div',{class:'pageinfo'}, (o.title || 'Adventure') + ' · ' + (i + 1) + ' / ' + items.length), el('div',{style:'width:80px'})),
      el('div',{class:'v2-steps'}, ...items.map((_, j) => el('span',{class:'v2-dot' + (j < i ? ' on' : j === i ? ' cur' : '')}))),
      el('div',{class:'card v2-item'},
        el('div',{class:'v2-role'}, roleTag, el('span',{class:'v2-skill'}, sk.kid)),
        el('div',{class:'v2-prompt', html:v2Bold(it.prompt)}),
        it.show ? el('div',{class:'v2-show'}, it.show) : null,
        it.pic && it.type !== 'read' ? el('div',{class:'v2-pic'}, it.pic) : null,
        el('div',{class:'row center'}, canHear ? el('button',{class:'btn small blue', onclick:()=>say(it.say, { rate:0.8 })}, it.type === 'hear' ? '🔊 Hear the word' : '🔊 Hear the question') : null, helpBtn),
        optBox, fb, nextBtn));
    show(s);
    if (it.type === 'hear' || (o.mode === 'placement' && it.say && DECODE_DOMAINS.includes(sk.domain) && sk.domain === 'pa')) setTimeout(() => say(it.say, { rate:0.8 }), 350);
  };
  step();
}
const CURR_PRAISE = () => ['Yes! 🎉','You got it! ⭐','Awesome! 🙌','Spot on! 🌟','Nailed it! 💪'][Math.floor(Math.random() * 5)];

/* ---------- placement: branching, tap-based, parent can pick a starting point ---------- */
function v2PlacementIntro(){
  const pickRow = el('div',{class:'v2-start'});
  const choices = [['auto','✨ Let the check decide'],['letters','🔤 Still learning letters'],['words','🐣 Reads short words'],['sentences','📗 Reads simple books'],['chapter','📚 Reads chapter books']];
  let choice = 'auto';
  choices.forEach(([v, t]) => { const b = el('button',{class:'v2-chip' + (v === choice ? ' on' : ''), onclick:()=>{ choice = v; [...pickRow.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); }}, t); pickRow.append(b); });
  show(el('div',{class:'screen v2'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('div'), el('div',{style:'width:80px'})),
    el('div',{class:'card v2-intro'},
      v2Hero(),
      el('h1',{class:'title'}, 'Reading Check'),
      el('p',{}, 'A few quick taps so the game knows exactly which skills to train. It gets harder until it finds your edge, then it stops. Most kids finish in 5 minutes.'),
      el('p',{class:'muted'}, 'Grown-ups (optional): where do you think they are? The check still tests it.'), pickRow,
      el('button',{class:'btn big', onclick:()=>v2Placement(choice)}, '▶ Start'))));
}
function v2Placement(choice){
  const lm = LM(), sid = v2Sid(), P = CURR.placementStart(choice);
  CURR.seed(Date.now());
  const rung = () => {
    const id = CURR.LADDER[P.i];
    const items = [0, 1, 2].map(j => Object.assign(CURR.makeItem(id, 3, j), { skill:id }));
    v2RunItems(items, { mode:'placement', src:'placement', norecord:true, sid, title:'Reading Check', finishLabel:'Next ▶', onQuit:screenHome,
      onDone: res => {
        CURR.placementStep(P, res.filter(r => r.ok).length, 3);
        P.done ? finishCode() : rung();
      } });
  };
  const finishCode = () => {
    const r = CURR.applyPlacement(lm, P, sid);
    // comprehension: one passage near the placed level, questions tagged by skill
    const lib = v2Library().filter(b => Math.abs(b.band - r.band) <= 1 && b.qs.length >= 4);
    const st = lib.sort((a, b) => Math.abs(a.band - r.band) - Math.abs(b.band - r.band) || a.analysis.words - b.analysis.words)[0];
    if (!st) return done(r);
    v2ReadAndAsk(st, { sid, src:'placement', title:'Reading Check', placement:true, onDone:o => { const q = o.quiz || []; CURR.applyCompPlacement(lm, q.filter(x => x.ok).length, q.length, r.band); done(r); } });
  };
  const done = r => {
    CURR.commit(lm); save();
    const B = CURR.BANDS[r.band], st = CURR.allStates(lm);
    const strong = CURR.SKILLS.filter(s => CURR.isM(st[s.id])).slice(-4).map(s => s.kid);
    confetti(60); beep('level');
    show(el('div',{class:'screen v2 center'},
      el('div',{class:'card v2-intro'},
        v2Hero(), el('h1',{class:'title'}, 'Reading Check done!'),
        el('p',{}, 'Your Skill Quests are ready. Each one trains the exact skill you need next.'),
        strong.length ? el('p',{}, '💪 Already strong: ' + strong.join(', ')) : null,

        el('button',{class:'btn big', onclick:()=>v2Lesson()}, '⚔️ Start first quest'),
        el('button',{class:'btn gray small', onclick:()=>screenHome()}, 'Home'))));
  };
  rung();
}

/* ---------- story step: read (aloud with mic / grown-up scoring, or to yourself) then tagged questions ---------- */
function v2ReadAndAsk(st, o){
  const lm = LM();
  const newWords = (o.check && o.check.stats.newVocab || []).slice(0, 3);
  const choose = el('div',{class:'card v2-intro'},
    el('div',{class:'v2-big-e'}, st.emoji || '📖'), el('h1',{class:'title'}, st.title),
    newWords.length ? el('div',{class:'v2-treasure'}, el('b',{}, '💎 Treasure words: '), ...newWords.map(w => el('button',{class:'v2-chip', onclick:()=>say(w)}, '🔊 ' + w))) : null,
    el('p',{}, o.placement ? 'Read this story, then answer the questions.' : 'How do you want to read today?'),
    el('div',{class:'row center'},
      el('button',{class:'btn big', onclick:()=>aloud()}, '🎤 Read out loud'),
      el('button',{class:'btn big blue', onclick:()=>quiet()}, '🤫 Read to myself')),
    el('p',{class:'muted'}, 'Out loud lets the game check every word. Tapping a word for help is fine: it just counts as practice, not as reading on your own.'));
  show(el('div',{class:'screen v2'}, el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('div'), el('div',{style:'width:80px'})), choose));
  const aloud = () => {
    const act = { kind:'story', level:K.level, title:st.title, emoji:st.emoji, story:st, pages:storyPages(st.text), v2:true };
    beginRun(act, { mode:'v2', onStop:screenHome, onDone:(res, a) => {
      const sid = o.sid, words = v2WordsFromRun(a), c = v2ReadConfidence(res);
      CURR.storyEvidence(words, { names:CURR.properNames(st.text), wcpm:res.wcpm, band:CURR.currentBand(lm), c }).forEach(e => CURR.record(lm, Object.assign(e, { sid, src:o.src || 'story' })));
      o.read = { aloud:true, total:res.total, correct:res.correct, helped:res.helped, accuracy:res.accuracy, wcpm:res.wcpm, conf:c };
      questions();
    } });
  };
  const quiet = () => {
    const t0 = Date.now();
    show(el('div',{class:'screen v2'},
      el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('div',{class:'pageinfo'}, st.title), el('div',{style:'width:80px'})),
      el('div',{class:'card v2-read'}, ...st.text.split(/\n\s*\n/).map(p => el('p',{}, ...p.split(/(\s+)/).map(w => /\S/.test(w) ? el('span',{class:'v2-w', onclick:ev=>{ ev.target.classList.add('helped'); o.taps = (o.taps || 0) + 1; say(w.replace(/[^\w']/g, '')); }}, w) : w))),
        el('button',{class:'btn big', onclick:()=>{ o.read = { aloud:false, ms:Date.now() - t0, taps:o.taps || 0 }; questions(); }}, 'I finished ✓'))));
  };
  const questions = () => {
    const qs = st.qs.slice(0, 5).map(([q, opts, ans, tag]) => {
      const sh = shuffle(opts.map((t, i) => ({ t, right:i === ans })));
      return { skill:tag || CURR.tagQuestion(q), type:'pick', prompt:q, say:q, options:sh.map(x => ({ t:x.t })), answer:sh.findIndex(x => x.right), explain:'The answer: ' + opts[ans] + '.' };
    });
    // sequencing practice made from the story itself when that's the comprehension focus
    if (o.compFocus === 'comp.sequence' && !qs.some(q => q.skill === 'comp.sequence')){
      const sents = CURR.sentences(st.text).filter(s => CURR.tokens(s).length >= 4);
      if (sents.length >= 4){
        const a = sents[0], b = sents[Math.floor(sents.length / 2)], c2 = sents[sents.length - 1];
        const sh = shuffle([a, b, c2]);
        qs.push({ skill:'comp.sequence', type:'pick', prompt:'Which of these happened FIRST in the story?', options:sh.map(t => ({ t })), answer:sh.indexOf(a), explain:'First: “' + a + '”' });
      }
    }
    v2RunItems(qs, { mode:o.placement ? 'placement' : 'lesson', src:o.src || 'story', sid:o.sid, title:st.title, onQuit:screenHome, onDone:res => { o.quiz = res; o.onDone(o); } });
  };
}

/* ---------- the lesson: planner → activities → story → questions → summary ---------- */
async function v2Lesson(){
  stopAll();
  const lm = LM(), before = CURR.allStates(lm), sid = v2Sid(), t0 = Date.now();
  const plan = CURR.planLesson(lm, v2Library(), { recent:K.v2recent || [], seed:Date.now() });
  // no library story fits → template forge (validated) — never serve a story that failed validation
  if (!plan.story){
    for (let n = 0; n < 4 && !plan.story; n++){
      const f = CURR.forgeStory(plan, v2Theme(), n), v = CURR.validateStory(f, { known:plan.constraints.known, target:plan.constraints.target, band:plan.decodeBand, constraints:plan.constraints });
      if (v.pass){ plan.story = f; plan.storyCheck = v; }
    }
  }
  K.v2resume = { at:Date.now() }; save();
  const brief = el('div',{class:'card v2-intro'},
    v2Hero(),
    el('h1',{class:'title'}, 'Today\'s Quest'),
    el('div',{class:'v2-objs'}, ...plan.objectives.map(ob => el('div',{class:'v2-objrow'}, '🎯 ', el('b',{}, ob.kid)))),
    el('p',{}, `${plan.activities.length} quick challenges` + (plan.story ? `, then the story “${plan.story.title}”.` : '.')),
    el('details',{class:'v2-why'}, el('summary',{}, 'Grown-ups: why this lesson?'), ...plan.why.map(w => el('p',{}, w)),
      plan.storyCheck ? el('p',{}, `Story check: ${plan.storyCheck.checks.filter(c => c.pass).length}/${plan.storyCheck.checks.length} constraints passed for this reader.`) : null),
    el('button',{class:'btn big', onclick:()=>go()}, '⚔️ Begin'));
  show(el('div',{class:'screen v2'}, el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenHome()}, '← Back'), el('div'), el('div',{style:'width:80px'})), brief));
  const out = { plan, sid };
  const go = () => v2RunItems(plan.activities, { mode:'lesson', sid, title:'Training', finishLabel: plan.story ? 'To the story ▶' : 'Finish ✓', onQuit:screenHome,
    onDone: res => { out.drills = res; plan.story ? v2ReadAndAsk(plan.story, { sid, check:plan.storyCheck, compFocus:plan.compFocus, onDone:o => { out.story = o; extras(); } }) : finish(); } });
  // optional grown-up observations: expression/phrasing after an aloud read, retelling when it's on the frontier
  const extras = () => {
    const st = CURR.allStates(lm), askRetell = !CURR.isM(st['comp.retell']) && CURR.SKILL['comp.retell'].pre.every(p => CURR.isM(st[p]));
    const askFlu = out.story && out.story.read && out.story.read.aloud;
    if (!askRetell && !askFlu) return finish();
    const rows = el('div',{});
    const rate = (label, ids) => { const r = el('div',{class:'v2-rate'}, el('b',{}, label)); [1, 2, 3, 4].forEach(n => r.append(el('button',{class:'v2-chip', onclick:ev=>{ [...r.querySelectorAll('button')].forEach(b => b.classList.remove('on')); ev.target.classList.add('on'); ids.forEach(id => { out.rated = out.rated || {}; out.rated[id] = n; }); }}, ['','1 word-by-word','2 two-word bits','3 mostly phrases','4 smooth + expressive'][n]))); return r; };
    if (askFlu) rows.append(rate('How did it sound? (NAEP fluency scale)', ['flu.expression','flu.phrasing']));
    if (askRetell){
      const r = el('div',{class:'v2-rate'}, el('b',{}, 'Retell: ask “Tell me the story.” Tap what they included:'));
      ['Beginning','Middle','End','Main character'].forEach(p => r.append(el('label',{class:'v2-chk'}, (()=>{ const c = el('input',{type:'checkbox'}); c.onchange = () => { out.retell = out.retell || {}; out.retell[p] = c.checked; }; return c; })(), p)));
      rows.append(r);
    }
    show(el('div',{class:'screen v2'}, el('div',{class:'card v2-intro'},
      el('h2',{}, '👀 Grown-up check (optional)'), el('p',{class:'muted'}, 'Only a grown-up who listened should answer. Skipping is fine: nothing is guessed.'), rows,
      el('div',{class:'row center'}, el('button',{class:'btn big', onclick:()=>{ save1(true); }}, 'Save'), el('button',{class:'btn gray', onclick:()=>finish()}, 'Skip')))));
    const save1 = () => {
      if (out.rated) Object.entries(out.rated).forEach(([id, n]) => CURR.record(lm, { s:id, k:n >= 3 ? 1 : 0, n:1, ind:true, c:0.9, src:'parent', sid }));
      if (out.retell){ const got = ['Beginning','Middle','End','Main character'].filter(p => out.retell[p]).length; CURR.record(lm, { s:'comp.retell', k:got >= 3 ? 1 : 0, n:1, ind:true, c:0.9, src:'parent', sid, note:got + '/4 parts' }); }
      finish();
    };
  };
  const finish = () => {
    const newly = CURR.commit(lm), after = CURR.allStates(lm);
    const all = [...(out.drills || []), ...((out.story && out.story.quiz) || [])];
    const right = all.filter(r => r.ok && r.ind).length;
    const practiced = [...new Set(all.map(r => r.skill))];
    const stars = 3 + right + newly.length * 5 + (todayLessons() === 0 ? 5 : 0);
    K.stars += stars;
    if (plan.story){ K.v2recent = [plan.story.id, ...(K.v2recent || []).filter(x => x !== plan.story.id)].slice(0, 12); }
    const rd = out.story && out.story.read, qz = out.story && out.story.quiz;
    K.sessions.unshift({ id:sid, date:new Date().toISOString(), level:K.level, title:'🗺️ ' + (plan.story ? plan.story.title : 'Skill training'), kind:'lesson2', mode:'lesson2',
      total: rd && rd.total || 0, correct: rd && rd.correct || 0, helped: rd ? (rd.helped || rd.taps || 0) : 0,
      accuracy: rd && rd.aloud ? Math.round(rd.accuracy * 1000) / 10 : (qz && qz.length ? Math.round(qz.filter(x => x.ok).length / qz.length * 1000) / 10 : 0),
      wcpm: rd && rd.wcpm || null, quiz: qz && qz.length ? qz.filter(x => x.ok).length + '/' + qz.length : null, missed:[], stars, ms: Date.now() - t0,
      v2:{ skills:practiced, drills:(out.drills || []).length, drillsRight:(out.drills || []).filter(x => x.ok && x.ind).length, assisted:all.filter(r => !r.ind).length, aloud:!!(rd && rd.aloud), conf: rd && rd.conf, mastered:newly, storyId: plan.story && plan.story.id, generated: plan.story && plan.story.generated || null } });
    K.sessions = K.sessions.slice(0, 200);
    delete K.v2resume; save();
    if (newly.length){ confetti(90); beep('level'); } else { confetti(30); beep('star'); }
    const moved = practiced.filter(id => before[id].state !== after[id].state);
    show(el('div',{class:'screen v2'},
      el('div',{class:'card v2-intro'},
        v2Hero(),
        el('h1',{class:'title'}, newly.length ? 'Skill mastered!' : 'Quest complete!'),
        newly.length ? el('div',{class:'v2-mastered'}, ...newly.map(id => el('div',{class:'v2-mrow'}, '🏅 ', el('b',{}, CURR.SKILL[id].kid)))) : null,
        el('p',{}, `+${stars} ⭐ for trying, getting answers right on your own, and finishing.`),
        el('div',{class:'v2-skillsum'}, ...practiced.map(id => { const a = after[id], b = before[id], I = STATE_INFO[a.state];
          return el('div',{class:'v2-srow'}, el('span',{class:'v2-dotc', style:`background:${I[1]}`}), el('span',{}, CURR.SKILL[id].kid), el('span',{class:'muted'}, (b.state !== a.state ? STATE_INFO[b.state][0] + ' → ' : '') + I[0])); })),
        moved.length ? null : el('p',{class:'muted'}, 'Mastery needs the same skill right on more than one day, so keep coming back!'),
        el('div',{class:'row center'}, el('button',{class:'btn big', onclick:()=>v2Lesson()}, '▶ Next quest'), el('button',{class:'btn gray', onclick:()=>screenHome()}, '🏠 Home')))));
  };
}
function todayLessons(){ return (K.sessions || []).filter(s => s.kind === 'lesson2' && s.date && todayStr(new Date(s.date)) === todayStr()).length; }

/* ---------- parent dashboard 2.0 ---------- */
function v2Parent(which, tab){
  which = which || kid; tab = tab || 'overview';
  const k = DB.kids[which]; if (!k) return screenPlayers();
  const prevK = K, prevKid = kid;
  const lm = LM(k), st = CURR.allStates(lm), band = CURR.currentBand(lm), B = CURR.BANDS[band];
  document.body.className = 'parent';
  const name = kidName(which);
  const tabs = el('div',{class:'tabs'}, ...[['overview','Overview'],['skills','Skill map'],['history','History'],['library','Library'],['lab','Story Lab'],['controls','Controls']]
    .map(([id, t]) => el('button',{class:'tab' + (tab === id ? ' active' : ''), onclick:()=>v2Parent(which, id)}, t)));
  const kidTabs = el('div',{class:'row'}, ...playerIds(false).map(id => el('button',{class:'btn small ' + (id === which ? '' : 'gray'), onclick:()=>v2Parent(id, tab)}, kidName(id))));
  const body = el('div',{});
  const sess = (k.sessions || []);
  if (tab === 'overview'){
    const read = sess.filter(s => ['normal','lesson2'].includes(s.mode));
    const mins = Math.round(sess.reduce((t, s) => t + (s.ms || 0), 0) / 60000);
    const codeSk = CURR.SKILLS.filter(s => ['ph','dec','sw'].includes(s.domain));
    const codeIds = new Set(codeSk.map(s => s.id)), okEv = lm.ev.filter(e => codeIds.has(e.s) && e.ind && e.c >= CURR.CONFIG.minConfidence);
    const ind = [okEv.reduce((t, e) => t + e.k, 0), okEv.reduce((t, e) => t + e.n, 0)];
    const ast = codeSk.reduce((t, s) => { const m = lm.sum[s.id]; return m ? [t[0] + m.ak, t[1] + m.an] : t; }, [0, 0]);
    const mReal = CURR.SKILLS.filter(s => CURR.isM(st[s.id]) && !st[s.id].inferred).length, mInf = CURR.SKILLS.filter(s => st[s.id].inferred).length;
    K = k; const plan = lm.placedAt ? CURR.planLesson(lm, [], {}) : null; K = prevK;
    const stat = (b, t) => el('div',{class:'stat'}, el('b',{}, b), el('span',{}, t));
    body.append(
      el('div',{class:'card'}, el('h2',{}, `${B.icon} ${name}: Storyborne Level ${band} · ${B.name}`), el('p',{class:'muted'}, B.desc + (lm.placedAt ? '' : ' · Reading Check not taken yet.')),
        el('div',{class:'stats'}, stat(read.length, 'reading sessions'), stat(mins + ' min', 'total time'), stat(read.filter(s => s.kind === 'story' || s.v2 && s.v2.storyId).length, 'stories'),
          stat(ind[1] ? Math.round(ind[0] / ind[1] * 100) + '%' : '–', 'independent word accuracy (' + ind[1] + ' words)'),
          stat(ast[1] ? Math.round(ast[0] / ast[1] * 100) + '%' : '–', 'with help (' + ast[1] + ', not counted)'),
          stat(mReal + (mInf ? ' + ' + mInf : ''), 'skills mastered' + (mInf ? ' (+ placement-inferred)' : '')))),
      plan ? el('div',{class:'card'}, el('h2',{}, '🎯 Current focus'), ...plan.why.map(w => el('p',{}, w))) : null,
      el('div',{class:'card'}, el('h2',{}, '💡 Recommendations'), el('p',{class:'muted'}, 'Generated only from recorded evidence.'),
        ...CURR.recommendations(lm, name).map(r => el('div',{class:'v2-rec ' + r.kind}, { win:'🏅', alert:'⚠️', next:'➡️', insight:'🔎', practice:'🏠', support:'🤝', note:'ℹ️' }[r.kind] + ' ' + r.text))));
  }
  if (tab === 'skills'){
    body.append(el('div',{class:'card'}, el('h2',{}, 'Skill map'), el('div',{class:'v2-legend'}, ...Object.entries(STATE_INFO).map(([, I]) => el('span',{}, el('i',{style:`background:${I[1]}`}), I[0])), el('span',{}, el('i',{class:'inf'}), 'Inferred from placement')),
      ...CURR.DOMAINS.map(D => el('div',{class:'v2-domain'}, el('h3',{}, D.icon + ' ' + D.name),
        el('div',{class:'v2-chips'}, ...CURR.SKILLS.filter(s => s.domain === D.id).map(s => { const x = st[s.id], I = STATE_INFO[x.state];
          return el('button',{class:'v2-skchip' + (x.inferred ? ' inf' : ''), style:`--sc:${I[1]}`, onclick:()=>v2SkillModal(lm, s.id)},
            el('span',{class:'v2-skb'}, 'L' + s.band), el('span',{}, s.name), el('small',{}, x.n ? Math.round(x.acc * 100) + '% · ' + x.n : I[0])); }))))));
  }
  if (tab === 'history'){
    const t = el('table',{}, el('tr',{}, ...['Date','Activity','Time','Accuracy','Questions','Help','Mode','Skills'].map(h => el('th',{}, h))));
    sess.slice(0, 60).forEach(s => { const d = new Date(s.date);
      t.append(el('tr',{}, el('td',{}, d.toLocaleDateString(undefined, { month:'short', day:'numeric' })), el('td',{}, s.title), el('td',{}, s.ms ? Math.max(1, Math.round(s.ms / 60000)) + 'm' : '–'),
        el('td',{}, s.total || s.v2 ? (s.accuracy ?? '–') + '%' : '–'), el('td',{}, s.quiz || '–'), el('td',{}, s.helped || (s.v2 && s.v2.assisted) || 0),
        el('td',{}, s.v2 ? (s.v2.aloud ? '🎤 aloud' + (s.v2.conf < 0.6 ? ' (low conf.)' : '') : '🤫 quiet') : s.mode),
        el('td',{style:'font-size:13px'}, s.v2 ? s.v2.skills.map(id => CURR.SKILL[id] ? CURR.SKILL[id].name : id).join(', ') : ''))); });
    body.append(el('div',{class:'card'}, el('h2',{}, 'Reading history'), el('p',{class:'muted'}, 'Help = words tapped for help or retried answers. They are recorded but never count toward mastery.'), el('div',{style:'overflow-x:auto'}, t)));
  }
  if (tab === 'library'){
    K = k; const lib = v2Library(); K = prevK;
    const known = [...CURR.masteredSet(lm)];
    const readIds = new Map(); sess.filter(s => s.v2 && s.v2.storyId).forEach(s => { if (!readIds.has(s.v2.storyId)) readIds.set(s.v2.storyId, s); });
    const rows = lib.slice().sort((a, b) => a.band - b.band || a.analysis.fk - b.analysis.fk).map(b => {
      const v = CURR.validateStory(b, { known, band:Math.max(1, band) }), r = readIds.get(b.id);
      return el('tr',{ onclick:()=>v2CheckModal(b, v), style:'cursor:pointer' }, el('td',{}, b.emoji + ' ' + b.title), el('td',{}, 'L' + b.band), el('td',{}, b.analysis.fk), el('td',{}, b.analysis.words),
        el('td',{style:'font-size:13px'}, b.analysis.patterns.map(p => CURR.SKILL[p.skill].kid).slice(0, 3).join(', ')), el('td',{}, v.pass ? '✅' : '✗ ' + v.failed.length),
        el('td',{}, r ? new Date(r.date).toLocaleDateString(undefined, { month:'short', day:'numeric' }) + ' · ' + (r.quiz || '') : ''));
    });
    body.append(el('div',{class:'card'}, el('h2',{}, `Story library (${lib.length})`), el('p',{class:'muted'}, `Every story is analysed by the engine: level, readability (FK), phonics patterns, and whether it passes validation for ${name} right now. Tap a story to see its checks.`),
      el('div',{style:'overflow-x:auto;max-height:560px;overflow-y:auto'}, el('table',{}, el('tr',{}, ...['Story','Level','FK','Words','Practices','Fits now','Last read'].map(h => el('th',{}, h))), ...rows))));
  }
  if (tab === 'lab') body.append(v2Lab(k, lm, band));
  if (tab === 'controls'){
    body.append(el('div',{class:'card'}, el('h2',{}, 'Controls'),
      el('div',{class:'row'}, el('button',{class:'btn', onclick:async ()=>{ const ok = await modal(el('p',{}, `Re-run the Reading Check for ${name}? Their evidence history is kept.`), [['Re-run','',1],['Cancel','gray',0]]); if (ok){ lm.placedAt = null; lm.placed = {}; save(); v2Parent(which, 'controls'); } }}, '🧭 Re-run Reading Check next time')),
      el('p',{}, 'Story theme (never overrides the curriculum):'),
      el('div',{class:'row'}, ...Object.entries(CURR.THEMES).map(([id, T]) => el('button',{class:'v2-chip' + ((k.v2theme || (trackOf(which) === 'daughter' ? 'fantasy' : 'animals')) === id ? ' on' : ''), onclick:()=>{ k.v2theme = id; save(); v2Parent(which, 'controls'); }}, T.icon + ' ' + id))),
      el('p',{class:'muted'}, 'Microphone: listening runs in the browser only (Safari speech recognition). No audio is stored unless “Save audio recordings” is on in the main grown-ups page. Grown-up scoring mode is the most accurate option.'),
      el('div',{class:'row'}, el('button',{class:'btn gray', onclick:()=>{ const blob = new Blob([JSON.stringify({ name, lm, sessions:sess }, null, 1)], { type:'application/json' }); const a = el('a',{ href:URL.createObjectURL(blob), download:name + '-reading-profile.json' }); document.body.append(a); a.click(); a.remove(); }}, '⬇️ Export reading profile'),
        el('button',{class:'btn red', onclick:async ()=>{ const ok = await modal(el('p',{}, `Delete ${name}'s 2.0 skill profile (evidence log)? Stories, stars and items stay.`), [['Delete','red',1],['Cancel','gray',0]]); if (ok){ delete k.lm; save(); v2Parent(which, 'controls'); } }}, '🗑️ Delete skill profile'))));
  }
  show(el('div',{class:'screen parent-screen v2'},
    el('div',{class:'topbar'}, el('button',{class:'btn ghost small', onclick:()=>screenParent(which)}, '← Grown-ups'), el('div',{class:'pageinfo'}, '📊 Reading Skills'), el('button',{class:'btn small', onclick:()=>{ if (prevKid) screenHome(); else screenProfiles(); }}, 'Exit')),
    kidTabs, tabs, body));
}
function v2Spark(ser){
  if (!ser || ser.length < 2) return null;
  const pts = ser.filter(x => x[2]).map(x => x[1] / x[2]); if (pts.length < 2) return null;
  const w = 260, h = 60, d = pts.map((p, i) => (i ? 'L' : 'M') + (i / (pts.length - 1) * w).toFixed(1) + ' ' + (h - 4 - p * (h - 8)).toFixed(1)).join(' ');
  return el('div',{html:`<svg viewBox="0 0 ${w} ${h}" class="v2-spark"><line x1="0" x2="${w}" y1="${h - 4 - .9 * (h - 8)}" y2="${h - 4 - .9 * (h - 8)}" stroke="#22c55e" stroke-dasharray="4 4" opacity=".6"/><path d="${d}" fill="none" stroke="#6366f1" stroke-width="3" stroke-linejoin="round"/></svg>`});
}
function v2SkillModal(lm, id){
  const s = CURR.SKILL[id], x = CURR.skillState(lm, id), I = STATE_INFO[x.state], sm = lm.sum[id] || {};
  const evs = lm.ev.filter(e => e.s === id).slice(-10).reverse();
  modal(el('div',{class:'v2-skillmodal'},
    el('h2',{}, s.name), el('div',{class:'v2-state', style:`background:${I[1]}`}, I[0] + (x.inferred ? ' (from placement)' : '')),
    el('p',{}, s.desc), el('p',{class:'muted'}, 'Example: ' + s.ex),
    el('p',{}, el('b',{}, 'Why: '), x.why),
    el('p',{class:'muted'}, `Mastery rule: ${Math.round(s.crit.acc * 100)}%+ on ${s.crit.n}+ independent items, across ${CURR.CONFIG.minSessions}+ sessions on ${CURR.CONFIG.minDays}+ days. Help and low-confidence checks don't count.`),
    el('p',{}, `Independent: ${sm.ik || 0}/${sm.in || 0} · With help: ${sm.ak || 0}/${sm.an || 0}` + (x.lowConf ? ` · Low-confidence (excluded): ${x.lowConf}` : '')),
    s.pre.length ? el('p',{}, 'Needs first: ' + s.pre.map(p => CURR.SKILL[p].name).join(', ')) : null,
    v2Spark(lm.series[id]),
    evs.length ? el('table',{}, el('tr',{}, ...['When','Result','Source','Counted?'].map(h => el('th',{}, h))), ...evs.map(e => el('tr',{}, el('td',{}, new Date(e.t).toLocaleDateString(undefined, { month:'short', day:'numeric' })), el('td',{}, e.k + '/' + e.n + (e.note ? ' · ' + e.note : '')), el('td',{}, e.src), el('td',{}, e.ind && e.c >= CURR.CONFIG.minConfidence ? '✓' : e.ind ? 'low conf.' : 'helped')))) : el('p',{class:'muted'}, 'No evidence yet.')),
    [['Close','',0]]);
}
function v2CheckModal(story, v){
  modal(el('div',{class:'v2-skillmodal'}, el('h2',{}, (story.emoji || '') + ' ' + story.title),
    el('div',{class:'v2-state', style:`background:${v.pass ? '#22c55e' : '#ef4444'}`}, v.pass ? 'Passes validation' : `Fails ${v.failed.length} check${v.failed.length > 1 ? 's' : ''}`),
    el('table',{}, ...v.checks.map(c => el('tr',{}, el('td',{}, c.pass ? '✅' : '❌'), el('td',{}, c.label), el('td',{}, String(c.value)), el('td',{class:'muted'}, String(c.limit))))),
    el('details',{}, el('summary',{}, 'Story text'), el('p',{style:'white-space:pre-wrap'}, story.text))), [['Close','',0]]);
}

/* ---------- Story Lab: AI (when available) or template generation, always validated ---------- */
function v2Lab(k, lm, band){
  const box = el('div',{class:'card'});
  const prevK = K; K = k; const plan = CURR.planLesson(lm, [], { seed:Date.now() }); K = prevK;
  const req = CURR.generationRequest(plan, { theme:k.v2theme || 'fantasy' });
  const out = el('div',{});
  const ta = el('textarea',{rows:8, placeholder:'Paste a story here to check it against this reader… (blank line between paragraphs)', style:'width:100%;font-size:16px'});
  const showResult = (story, v, note) => {
    out.innerHTML = '';
    out.append(el('h3',{}, (v.pass ? '✅ ' : '❌ ') + story.title + (note ? ' · ' + note : '')),
      el('p',{style:'white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:12px'}, story.text),
      story.qs && story.qs.length ? el('ol',{}, ...story.qs.map(q => el('li',{}, q[0] + ' ', el('small',{class:'muted'}, '(' + (CURR.SKILL[q[3] || CURR.tagQuestion(q[0])] || {}).name + ')')))) : null,
      el('table',{}, ...v.checks.map(c => el('tr',{}, el('td',{}, c.pass ? '✅' : '❌'), el('td',{}, c.label), el('td',{}, String(c.value)), el('td',{class:'muted'}, String(c.limit))))),
      v.pass ? el('button',{class:'btn green', onclick:()=>{ k.v2custom = (k.v2custom || []).concat([{ title:story.title, emoji:story.emoji || '✨', text:story.text, qs:story.qs }]).slice(-40); V2LIB = null; save(); out.prepend(el('p',{class:'banner'}, 'Added to the library. Lessons can now pick it.')); }}, '➕ Add to library') : el('p',{class:'muted'}, 'Not added: a story must pass every check before a child sees it.'));
  };
  const validate = s => CURR.validateStory(s, { known:plan.constraints.known, target:plan.constraints.target, band:plan.decodeBand, constraints:plan.constraints });
  const aiBtn = el('button',{class:'btn hidden'}, '✨ Generate with AI');
  (async () => { try { const sample = window.claude && await window.claude.use('sample'); if (!sample) return; aiBtn.classList.remove('hidden');
    aiBtn.onclick = async () => {
      aiBtn.disabled = true; let failed = null, last = null;
      for (let attempt = 1; attempt <= 3; attempt++){
        out.innerHTML = ''; out.append(el('p',{}, `Writing draft ${attempt}… then checking it against ${k === prevK ? 'this reader' : 'the profile'}.`));
        try {
          const j = await sample.json(CURR.generationPrompt(req, failed), { modelTier:'default' });
          const story = { title:j.title || 'New story', emoji:'✨', text:String(j.text || ''), qs:(j.questions || []).map(q => [q.q, q.choices, q.answer]), generated:'ai' };
          const v = validate(story); last = [story, v];
          if (v.pass){ showResult(story, v, 'AI draft ' + attempt + ' passed'); break; }
          failed = v.failed;
          if (attempt === 3) showResult(story, v, 'AI failed 3 times; not served');
        } catch(e){ out.innerHTML = ''; out.append(el('p',{}, 'AI unavailable right now (' + (e.code || e.message || 'error') + '). Use the template generator.')); break; }
      }
      aiBtn.disabled = false;
    }; } catch(e){} })();
  box.append(el('h2',{}, '🧪 Story Lab'),
    el('p',{class:'muted'}, 'The curriculum engine fills the request below. A generator (AI or template) writes the story. The validator checks it deterministically against this reader before it can be used.'),
    el('details',{}, el('summary',{}, 'Generation request (from the curriculum engine)'), el('pre',{style:'white-space:pre-wrap;font-size:12px;max-height:260px;overflow:auto'}, JSON.stringify(req, null, 1))),
    el('div',{class:'row'}, aiBtn,
      el('button',{class:'btn blue', onclick:()=>{ const n = Math.floor(Math.random() * 1000); const f = CURR.forgeStory(plan, k.v2theme || 'fantasy', n); showResult(f, validate(f), 'template'); }}, '🧩 Template story'),
      el('button',{class:'btn gray', onclick:()=>{ const t = ta.value.trim(); if (!t) return; const qs = []; showResult({ title:'Pasted story', text:t, qs }, validate({ text:t, qs }), 'pasted (add 4+ questions to pass)'); }}, '🔍 Check pasted text')),
    ta, out);
  return box;
}

const _screenParent = screenParent;
screenParent = function(which){
  _screenParent(which);
  const scr = document.querySelector('#app .screen'); if (!scr || !V2) return;
  const w = CLOUD.editing || which || playerIds(false)[0];
  const b = el('div',{class:'card v2-parent-cta'}, el('b',{}, '📊 Reading Skills'), el('span',{class:'muted'}, 'Skill map, evidence, recommendations, story library and Story Lab'), el('button',{class:'btn', onclick:()=>v2Parent(w)}, 'Open'));
  const tabs = scr.querySelector('.tabs'); tabs ? tabs.after(b) : scr.prepend(b);
};

/* ---------------- boot ---------------- */
showTitleScreen();
window.addEventListener('pagehide', stopAll);
document.addEventListener('visibilitychange', () => { if (document.hidden && recogOn) stopRecog(); });
// ask the browser not to clear this app's saved data when the iPad is low on space
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){}
if (familyMode()){
  // show the cached profiles right away when this device already belongs to a family; sign-in is checked in the background
  if (DB.family) bootLocal(); else { const s = el('div',{class:'screen center'}, el('h1',{class:'title center'}, '📚 Storyborne'), el('p',{class:'subtitle center'}, 'Loading…')); show(s); }
  familyStart();
} else { bootLocal(); cloudStart(); }
watchForUpdates();

// test hooks
window.__RQ = { graphemes: typeof graphemes !== 'undefined' ? graphemes : null, align, wordMatch, tokenizeHeard, letterMatch, checkBadges, maybeStarfallChest, get run(){ return run; }, get DB(){ return DB; } };
/* ---------- Quest Path: the leveling map (one chapter = one level) ---------- */
let qpReturn = false;
function qpState(){ return K.qp && K.qp.lvl === K.level ? K.qp : { lvl: K.level, spell: false, lab: false }; }
function qpGo(fn){ return () => { beep('tap'); qpReturn = true; fn(); }; }
function qpStops(){
  const G = TK === 'daughter', L = levelDef(K.level), Q = qpState(), streak = Math.min(K.passStreak || 0, LEVEL_UP_STREAK), ready = bossReady();
  const series = G ? [] : seriesAt(K.level);
  const readGo = (i) => {
    if (G){ const book = currentBook(); if (i === 1 && book){ const bs = bookState(book.id); return { label: book.title.length > 18 ? 'Chapter Book' : book.title, ic:'📚', go: () => startChapter(book, bs.ch) }; }
      const st = nextQuietStory(); return { label: st ? (st.title.length > 18 ? 'Short Story' : st.title) : 'Short Story', ic:'📖', go: startQuietStory }; }
    if (L.kind !== 'story' && (i !== 1 || !series.length)) return { label: L.kind === 'letters' ? 'Letter Sounds' : L.title, ic:'🔤', go: () => startActivity() };
    const sid = series[i % Math.max(1, series.length)]; const st = sid ? storyFor(K.level, sid).story : null;
    return { label: st ? (st.title.length > 18 ? 'Story Time' : st.title) : 'Story Time', ic:'📖', go: () => startActivity(sid) };
  };
  const read = (i) => { const r = readGo(i), state = i < streak || ready ? 'done' : i === streak ? 'now' : 'next'; if (state === 'done') r.label = 'Great read!'; if (state === 'next') r.label = G ? 'Next story' : 'Next read'; if (state === 'now' && r.ic === '📖' && storyPool().length){ r.label = 'Pick a story'; r.go = storyPickerModal; } return Object.assign(r, { kind:'read', state }); };
  const spell = { kind:'spell', label: G ? 'Spelling Check' : 'Spelling', letters: G ? 'ABC' : 'CAT', state: Q.spell ? 'done' : 'bonus', go: () => { Q.spell = true; K.qp = Q; save(); G ? startSpellCheck() : (spellWords().length ? startSpelling() : startSpellCheck()); } };
  const tricky = !G && practiceWords(K).length;
  const lab = { kind:'lab', label: tricky ? 'Tricky Words' : 'Skill Lab', ic: tricky ? '🎯' : '🧠', state: Q.lab ? 'done' : 'bonus', go: () => { Q.lab = true; K.qp = Q; save(); tricky ? startPractice() : v2Start(); } };
  const B = bossFor(K.level), beat = (K.bossesBeaten || []).includes(K.level);
  const boss = B ? { kind:'boss', label: B.name, B, state: beat ? 'done' : ready ? 'now' : 'locked', go: () => bossIntro() } : { kind:'gate', label: (G ? 'Rank ' : 'Level ') + (K.level + 1), state: ready ? 'now' : 'locked', go: () => {} };
  return [read(0), spell, read(1), lab, read(2), boss];
}
// point on the trail (three cubic segments) for t in 0..1
function qpTrail(t){
  const S = [[[-20,560],[140,560],[170,470],[285,492]], [[285,492],[405,514],[425,390],[550,390]], [[550,390],[670,390],[700,470],[825,420]], [[825,420],[905,388],[965,352],[1040,360]]];
  const k = Math.min(3, Math.floor(t * 4)), u = t * 4 - k, [a, b, c, d] = S[k], m = 1 - u;
  return [0, 1].map(j => m*m*m*a[j] + 3*m*m*u*b[j] + 3*m*u*u*c[j] + u*u*u*d[j]);
}
function qpScene(G){
  const tree = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="0" width="10" height="40" fill="#78350f"/><circle cx="0" cy="-8" r="26" fill="${c}"/><circle cx="-16" cy="4" r="18" fill="${c}"/><circle cx="16" cy="4" r="18" fill="${c}"/><circle cx="-6" cy="-16" r="10" fill="#fff" opacity=".12"/></g>`;
  const pine = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="20" width="6" height="16" fill="#78350f"/><path d="M0 -40 L22 0 L10 0 L26 24 L-26 24 L-10 0 L-22 0Z" fill="#1e3a8a" opacity=".85"/></g>`;
  let s = `<defs><linearGradient id="qpsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G ? '#c4b5fd' : '#7dd3fc'}"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient>
    <linearGradient id="qpgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fef08a"/><stop offset=".6" stop-color="#facc15"/><stop offset="1" stop-color="#eab308"/></linearGradient>
    <linearGradient id="qpblue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
    <linearGradient id="qpgrey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs>`;
  s += `<rect width="1024" height="640" fill="url(#qpsky)"/><path d="M0 230 L130 140 L250 220 L380 120 L520 220 L660 140 L820 230 L950 150 L1024 200 V640 H0Z" fill="${G ? '#7c3aed' : '#60a5fa'}" opacity=".32"/>`;
  s += `<path d="M0 290 Q240 220 500 270 T1024 250 V640 H0Z" fill="${G ? '#4ade80' : '#86efac'}"/>`;
  if (G){
    s += `<g transform="translate(130 110)"><rect x="-40" y="0" width="80" height="170" fill="#e7e5e4" stroke="#78716c" stroke-width="3"/><path d="M-52 4 L0 -70 L52 4Z" fill="#7c3aed" stroke="#4c1d95" stroke-width="3"/><path d="M0 -70 v-24 l18 8 l-18 8" fill="#f43f5e"/><rect x="-14" y="40" width="28" height="40" rx="14" fill="#1e293b"/><rect x="-14" y="110" width="28" height="60" rx="14" fill="#78350f"/></g>`;
    s += `<g class="qp-fly" transform="translate(250 70) scale(.9)"><path d="M0 20 C20 0 50 4 60 20 C70 10 90 6 96 16 C84 18 76 26 70 34 C56 30 40 34 30 44 C26 34 14 26 0 20Z" fill="#14b8a6" stroke="#134e4a" stroke-width="3"/><path d="M30 20 C40 -10 70 -20 84 -10 C66 -8 56 4 50 18Z" fill="#5eead4" stroke="#134e4a" stroke-width="3"/><circle cx="88" cy="14" r="2.5" fill="#134e4a"/></g>`;
    s += pine(420, 220, 1.6) + pine(470, 232, 1.2) + tree(640, 214, 1.4, '#16a34a') + pine(760, 214, 1.5) + tree(900, 204, 1.6, '#15803d') + pine(990, 224, 1.3) + tree(40, 300, 1.2, '#15803d');
  } else {
    s += tree(170, 150, 3.2, '#16a34a') + `<g transform="translate(170 130)"><rect x="-80" y="0" width="160" height="16" fill="#b45309" stroke="#78350f" stroke-width="3"/><path d="M-80 0 v-30 M80 0 v-30 M-80 -30 H80" stroke="#dc2626" stroke-width="5"/><path d="M-70 -6 L0 -60 L70 -6Z" fill="#fbbf24" stroke="#b45309" stroke-width="3"/><path d="M60 16 L70 130 M80 16 L90 130" stroke="#fff" stroke-width="4"/></g>`;
    s += `<g transform="translate(80 150)"><path d="M0 0 v60" stroke="#e5e7eb" stroke-width="2"/><circle cx="0" cy="74" r="16" fill="none" stroke="#1f2937" stroke-width="9"/></g>`;
    s += tree(520, 214, 1.3, '#15803d') + tree(680, 204, 1.6, '#22c55e') + pine(820, 224, 1.5) + tree(960, 214, 1.4, '#15803d') + pine(400, 234, 1.2);
  }
  s += `<path d="M-20 610 C140 610 180 510 290 530 C410 552 430 430 550 430 C670 430 700 510 830 462 C910 430 970 400 1040 410 L1040 320 C960 312 900 340 820 378 C700 430 670 350 550 352 C420 354 400 472 280 452 C170 434 130 510 -20 510Z" fill="#fde68a" stroke="#eab308" stroke-width="3"/>`;
  s += `<path d="M-20 560 C140 560 170 470 285 492 C405 514 425 390 550 390 C670 390 700 470 825 420 C905 388 965 352 1040 360" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round" opacity=".9"/>`;
  return s;
}
function qpTag(t, y){ const w = Math.max(70, t.length * 8 + 24); return `<g transform="translate(0 ${y})"><rect x="${-w/2}" y="-14" width="${w}" height="28" rx="14" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text y="5" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="800" font-size="15" fill="#334155">${String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text></g>`; }
function qpStar(x, y, r){ let d = ''; for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*.45 : r; d += (i ? 'L' : 'M') + (x + Math.cos(a)*rr).toFixed(1) + ' ' + (y + Math.sin(a)*rr).toFixed(1); } return `<path d="${d}Z" fill="#fde047" stroke="#b45309" stroke-width="1.5"/>`; }
function qpNodeArt(n){
  const done = n.state === 'done', now = n.state === 'now', locked = n.state === 'locked', fill = done ? 'url(#qpgold)' : locked ? 'url(#qpgrey)' : 'url(#qpblue)', rim = now ? '#fde047' : '#fff', base = done ? '#b45309' : locked ? '#64748b' : '#1e40af';
  let s = now ? `<ellipse class="qp-pulse" cx="0" cy="2" rx="54" ry="23" fill="#fff" opacity=".45"/>` : '';
  if (n.kind === 'boss' || n.kind === 'gate'){
    s += `<ellipse cx="0" cy="22" rx="58" ry="18" fill="#000" opacity=".18"/>`;
    s += n.B ? `<g transform="translate(-50 -96)" opacity="${locked ? .55 : 1}">${bossArt(n.B, 100).replace('<svg ', '<svg x="0" y="0" ')}</g>` : '';
    s += `<ellipse cx="0" cy="12" rx="40" ry="16" fill="${base}"/><ellipse cx="0" cy="4" rx="40" ry="16" fill="${fill}" stroke="${rim}" stroke-width="${now ? 4 : 3}"/><text y="11" text-anchor="middle" font-size="20">${done ? '👑' : locked ? '🔒' : '⚔️'}</text>`;
    return s + qpTag(n.label, 44);
  }
  if (n.kind === 'spell'){
    s += n.letters.split('').map((c, i) => `<g transform="translate(${(i-1)*24} ${i === 1 ? -6 : 0}) rotate(${(i-1)*8})"><rect x="-12" y="-13" width="24" height="26" rx="4" fill="${done ? 'url(#qpgold)' : '#e0e7ff'}" stroke="#fff" stroke-width="2.5"/><text y="7" text-anchor="middle" font-family="Georgia" font-weight="700" font-size="17" fill="${done ? '#7c2d12' : '#4338ca'}">${c}</text></g>`).join('');
    if (done) s += qpStar(30, -24, 9); else s += `<text x="34" y="-18" font-size="13" font-weight="800" fill="#7c3aed" font-family="Nunito,Arial">+⭐</text>`;
    return s + qpTag(n.label, 38);
  }
  s += `<ellipse cx="0" cy="10" rx="36" ry="15" fill="${base}"/><ellipse cx="0" cy="2" rx="36" ry="15" fill="${fill}" stroke="${rim}" stroke-width="${now ? 4 : 3}"/>`;
  if (done) s += `<path d="M-10 2 l7 6 l13 -12" stroke="#b45309" stroke-width="5" fill="none" stroke-linecap="round"/>` + (n.kind === 'read' ? qpStar(-18, -22, 9) + qpStar(0, -28, 9) + qpStar(18, -22, 9) : qpStar(0, -24, 9));
  else s += `<text y="9" text-anchor="middle" font-size="20">${n.ic}</text>` + (n.state === 'bonus' ? `<text x="34" y="-14" font-size="13" font-weight="800" fill="#7c3aed" font-family="Nunito,Arial">+⭐</text>` : '');
  return s + qpTag(n.label, 38);
}
function screenQuestPath(msg){
  stopAll();
  if (!K.hero) return screenHome(msg);
  const G = TK === 'daughter', L = levelDef(K.level), max = T.levels.length, word = G ? 'Rank' : 'Level';
  const stops = qpStops(), ts = [.08, .22, .37, .51, .66, .87];
  const legend = K.level >= max && (K.bossesBeaten || []).includes(K.level);
  let svg = `<svg viewBox="0 0 1024 640" class="qp-svg" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${qpScene(G)}`;
  let heroAt = null;
  stops.forEach((n, i) => { const [x, y] = qpTrail(ts[i]); svg += `<g class="qp-node qp-${n.state}" data-i="${i}" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">${qpNodeArt(n)}</g>`; if (n.state === 'now' && !heroAt) heroAt = [x, y]; });
  if (!heroAt) heroAt = qpTrail(legend ? ts[5] : ts[0]);
  // the full hero stands on the path, just behind the glowing stop
  const hw = 112, hh = hw * 1.25;
  svg += `<g class="qp-hero">${heroSVG(hw).replace('<svg ', `<svg x="${(heroAt[0] - 70 - hw / 2).toFixed(0)}" y="${(heroAt[1] + 8 - hh).toFixed(0)}" `)}</g>`;
  if (!G && K.avatar && K.avatar.base) svg += `<g>${avatarSVG(K.avatar, 70).replace('<svg ', `<svg x="${(heroAt[0] - 160).toFixed(0)}" y="${(heroAt[1] - 52).toFixed(0)}" `)}</g>`;
  svg += '</svg>';
  const stage = el('div',{class:'qp-stage', html: svg});
  stage.addEventListener('click', e => { const g = e.target.closest('.qp-node'); if (!g) return; const n = stops[+g.dataset.i];
    if (n.state === 'locked'){ beep('tap'); say(n.kind === 'boss' ? `Get ${LEVEL_UP_STREAK} great reads first. Then the boss comes out!` : 'Keep going! This opens after the boss.'); return; }
    if (n.kind === 'read' && n.state === 'next'){ beep('tap'); say('Do the glowing one first!'); return; }
    if (n.kind === 'gate') return;
    if (n.kind === 'read' && n.state === 'done' && !bossReady()) return say('You already got 3 stars here!');
    qpGo(n.go)(); });
  const have = Math.min(K.passStreak || 0, LEVEL_UP_STREAK);
  // mini-map: every level of the track, boss at each, castle at the end
  let mm = `<svg viewBox="0 0 700 90" class="qp-mm-svg" xmlns="http://www.w3.org/2000/svg">`;
  const pts = Array.from({ length: max }, (_, i) => [30 + i * (560 / Math.max(1, max - 1)), 56 + Math.sin(i * .9) * 14]);
  mm += `<path d="M${pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L')} L640 46" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>`;
  pts.forEach(([x, y], i) => { const n = i + 1, st = n < K.level || legend ? 'd' : n === K.level ? 'c' : 'l';
    mm += `<circle cx="${x}" cy="${y}" r="${st === 'c' ? 11 : 8}" fill="${st === 'd' ? '#facc15' : st === 'c' ? '#3b82f6' : '#64748b'}" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="${st === 'd' ? '#7c2d12' : '#fff'}" font-family="Arial">${n}</text>`; });
  mm += `<g transform="translate(650 40)"><rect x="-24" y="-4" width="48" height="32" fill="#fff" stroke="#1e293b" stroke-width="2"/>${[-14,0,14].map(x=>`<path d="M${x-5} 28 v-12 a5 5 0 0 1 10 0 v12" fill="#1e293b"/>`).join('')}<path d="M-24 -4 v-10 h8 v5 h8 v-5 h8 v5 h8 v-5 h8 v5 h8 v-5 h0 v10" fill="#fff" stroke="#1e293b" stroke-width="2"/><path d="M0 -14 v-14 l11 5 l-11 5" fill="#facc15" stroke="#1e293b" stroke-width="1.5"/></g>`;
  const [cx, cy] = pts[Math.min(K.level, max) - 1];
  mm += heroSVG(34).replace('<svg ', `<svg x="${cx - 17}" y="${cy - 54}" `) + '</svg>';
  const s = el('div',{class:'screen qp-screen' + (G ? ' qp-gia' : ' qp-miles')},
    el('div',{class:'qp-top'},
      el('button',{class:'btn small', onclick:()=>{ beep('tap'); qpReturn = false; screenHomeBase(); }},'← Home'),
      el('div',{class:'qp-title'}, el('div',{class:'qp-tag'}, (G ? '🐉 DRAGON ACADEMY' : '🐾 BISCUIT & PALS') + ` · ${word} ${K.level}`), el('div',{class:'qp-name'}, L.title)),
      el('div',{class:'qp-xp'}, el('span',{}, `${word} ${K.level}`),
        el('div',{class:'qp-bar'}, el('i',{style:`width:${bossReady() || legend ? 100 : have / LEVEL_UP_STREAK * 100}%`}), el('em',{}, bossReady() ? '⚔️ Boss time!' : legend ? '👑 Legend' : `⭐⭐⭐ ${have} of ${LEVEL_UP_STREAK}`)),
        el('span',{class:'qp-nx'}, K.level >= max ? '👑' : `${word} ${K.level + 1}`))),
    msg ? el('div',{class:'banner'}, msg) : null,
    stage,
    el('div',{class:'qp-mm'}, el('div',{class:'qp-pill'}, `${word} ${Math.min(K.level, max)} of ${max}`), el('div',{class:'qp-mm-box', html: mm})),
    el('p',{class:'qp-help'}, bossReady() ? `⚔️ The boss is out! Tap it to battle for ${word} ${K.level + 1}.` : `Tap the glowing stop. ⭐⭐⭐ = ${greatRule().short}. Purple +⭐ stops are bonus stars.`));
  show(s);
  if (!G) say(bossReady() ? 'The boss is here! Tap it to battle!' : 'Tap the glowing stop to read!');
}
const screenHomeBase = screenHome;
screenHome = function(msg){
  if (qpReturn){ qpReturn = false; return screenQuestPath(msg); }
  screenHomeBase(msg);
  try { // home: the level circles and the progress box open the Quest Path
    const tt = $('.tier-track'); if (tt){ tt.classList.add('qp-link'); tt.onclick = () => { beep('tap'); screenQuestPath(); }; }
    const lp = $('.lvl-progress'); if (lp && K.hero) lp.prepend(el('button',{class:'btn big qp-open', onclick:()=>{ beep('tap'); screenQuestPath(); }}, '🗺️ My Quest Path'));
  } catch(e){}
};
/* ---------- Story choice: 3 stories to pick from, reshuffled every visit; read counts kept forever ---------- */
let lastChoices = [];
function readCounts(k){
  k = k || K;
  if (k.readCount) return k.readCount;
  const rc = {}; (k.sessions || []).forEach(s => { if (s.kind === 'story' && s.mode === 'normal' && s.title) rc[s.title] = (rc[s.title] || 0) + 1; });
  return rc;
}
function storyPool(){
  const n = K.level, max = T.levels.length, seen = new Set(), out = [];
  const add = (st, lv, idx) => { if (!st || !st.text || seen.has(st.title)) return; seen.add(st.title); out.push({ st, lv, idx }); };
  if (TK === 'daughter'){
    quietPool().forEach(st => add(st, n, 0));
    if (out.length < 6) [n + 1, n - 2, n - 3].forEach(l => { if (l >= 1 && l <= max) (DAUGHTER_EXTRA[l] || []).forEach(st => add(st, l, 0)); });
    return out;
  }
  const series = seriesAt(n); if (!series.length) return out;
  const fit = storyFit();
  [n, n + fit, n - 1, n + 1].filter((v, i, a) => a.indexOf(v) === i && v >= 1 && v <= max).forEach(lv =>
    (levelDef(lv).stories || []).forEach((st, idx) => { if (series.includes(st.series)) add(st, lv, idx); }));
  return out;
}
function storyChoices(){
  const rc = readCounts(), n = K.level, fit = TK === 'daughter' ? 0 : storyFit();
  const pool = storyPool().map(c => Object.assign(c, { reads: rc[c.st.title] || 0 }));
  if (pool.length <= 3) return pool;
  const fresh = pool.filter(c => !lastChoices.includes(c.st.title));
  const use = fresh.length >= 3 ? fresh : pool;          // a new set every visit when the pool is big enough
  const score = c => c.reads * 3 + (c.lv === n || c.lv === n + fit ? 0 : .8) + Math.random() * 1.6;
  const pick = use.map(c => [score(c), c]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => x[1]);
  lastChoices = pick.map(c => c.st.title);
  return pick;
}
function launchChoice(c){
  if (TK === 'daughter') return startQuietRead(c.st, { storyKey:'quiet_short' });
  const a = { kind:'story', level:K.level, title:c.st.title, emoji:c.st.emoji, story:c.st, storyIndex:c.idx, storyKey:K.level + '_' + c.st.series, series:c.st.series, pages: storyPages(c.st.text) };
  startStoryWithSkill(a);
}
function choiceTiles(onPick){
  const ch = storyChoices(), n = K.level;
  return el('div',{class:'choice-grid'}, ...ch.map(c => {
    const info = TK === 'daughter' ? null : (T.series || {})[c.st.series];
    return el('button',{class:'choice-tile' + (c.reads ? '' : ' fresh'), onclick:()=>{ beep('tap'); onPick && onPick(); launchChoice(c); }},
      el('span',{class:'ct-badge' + (c.reads ? ' read' : '')}, c.reads ? `✓ Read ${c.reads}×` : '✨ New!'),
      el('span',{class:'ct-e'}, c.st.emoji || '📖'),
      el('span',{class:'ct-t'}, c.st.title),
      el('span',{class:'ct-s'}, (info ? info.emoji + ' ' + info.name : TK === 'daughter' ? '📖 Short story' : '') + (c.lv > n ? ' · ⬆️ stretch' : c.lv < n ? ' · 🔁 review' : '')));
  }));
}
function choiceCard(){
  if (!storyPool().length) return null;
  const card = el('div',{class:'card next-card choice-card'},
    el('div',{class:'series-tag'}, '📖 Pick a story'), COUNTS_TAG(),
    el('h2',{}, 'Choose 1 of 3'),
    el('p',{}, TK === 'daughter' ? 'Read it to yourself, then answer 5 questions.' : 'Read it out loud, then answer questions!'));
  let tiles = choiceTiles(); card.append(tiles,
    el('button',{class:'btn small ghost choice-new', onclick:()=>{ beep('tap'); const t = choiceTiles(); tiles.replaceWith(t); tiles = t; }}, '🔀 Show me 3 different ones'));
  return card;
}
function storyPickerModal(){
  const ov = el('div',{class:'overlay choice-ov'});
  const close = () => ov.remove();
  const box = el('div',{class:'card choice-card choice-modal'},
    el('div',{class:'row', style:'justify-content:space-between;align-items:center'}, el('h2',{style:'margin:0'}, '📖 Pick your story'), el('button',{class:'btn small gray', onclick:()=>{ beep('tap'); qpReturn = false; close(); }}, '✕')),
    choiceTiles(close));
  ov.append(box); ov.onclick = e => { if (e.target === ov){ qpReturn = false; close(); } };
  document.body.append(ov);
}
// grown-ups: every story each kid has read, and how many times
const _screenParentSR = screenParent;
screenParent = function(which){
  _screenParentSR(which);
  try {
    const scr = document.querySelector('#app .screen'); if (!scr) return;
    const w = CLOUD.editing || which || playerIds(false)[0], k = DB.kids[w]; if (!k) return;
    const rc = readCounts(k), last = {};
    (k.sessions || []).forEach(s => { if (s.kind === 'story' && s.title && !last[s.title]) last[s.title] = s; });
    const rows = Object.entries(rc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const total = rows.reduce((t, r) => t + r[1], 0);
    const tbl = el('table',{}, el('tr',{}, ...['Story','Times read','Last read','Last quiz'].map(h => el('th',{}, h))),
      ...rows.map(([t, c]) => { const s = last[t]; return el('tr',{}, el('td',{}, t), el('td',{}, el('b',{}, c + '×')),
        el('td',{}, s ? new Date(s.date).toLocaleDateString(undefined, { month:'short', day:'numeric' }) : '–'), el('td',{}, s && s.quiz ? s.quiz : '–')); }));
    const card = el('details',{class:'card stories-read'}, el('summary',{}, el('b',{}, `📚 Stories read: ${rows.length} different · ${total} reads total`)),
      rows.length ? tbl : el('p',{class:'muted'}, 'No stories read yet.'));
    const anchor = scr.querySelector('.v2-parent-cta') || scr.querySelector('.tabs');
    anchor ? anchor.after(card) : scr.prepend(card);
  } catch(e){ console.warn('stories read', e); }
};
})();


