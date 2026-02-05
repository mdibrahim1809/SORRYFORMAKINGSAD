// Interactive behavior: reveal message, confetti, longer melody, and slideshow
const revealBtn = document.getElementById('revealBtn');
const confettiBtn = document.getElementById('confettiBtn');
const musicBtn = document.getElementById('musicBtn');
const picsBtn = document.getElementById('picsBtn');
const message = document.getElementById('message');
const personalText = document.getElementById('personalText');
const closeBtn = document.getElementById('closeBtn');
const regenBtn = document.getElementById('regenBtn');
const heart = document.getElementById('heart');

const slideshow = document.getElementById('slideshow');
const closePicsBtn = document.getElementById('closePicsBtn');
const slideImg = document.getElementById('slideImg');
const prevPic = document.getElementById('prevPic');
const nextPic = document.getElementById('nextPic');
const slideIndex = document.getElementById('slideIndex');

let pool = null;
let externalPool = null;
function buildPool(n=10000){
  const starts = ["Megha, you are", "Sweet Megha—", "Dear Megha, remember", "When clouds gather, remember", "Little reminder:"];
  const middles = [
    "you are loved",
    "your smile lights rooms",
    "you matter more than you know",
    "this too shall pass",
    "you are stronger than you feel"
  ];
  const endings = [
    "— Sanu",
    "(hug from Sanu)",
    "with all my heart",
    "sending warm hugs",
    "always by your side"
  ];
  const poolArr = new Array(n);
  for(let i=0;i<n;i++){
    // combine deterministically so we produce many unique lines
    const a = starts[i % starts.length];
    const b = middles[(Math.floor(i/starts.length)) % middles.length];
    const c = endings[(Math.floor(i/(starts.length*middles.length))) % endings.length];
    poolArr[i] = `${a} ${b} ${c}`;
  }
  return poolArr;
}

function pickLines(count=6){
  const picked = [];
  const source = (externalPool && externalPool.length>0) ? externalPool : (pool || (pool = buildPool(10000)));
  for(let i=0;i<count;i++){
    const idx = Math.floor(Math.random()*source.length);
    picked.push(source[idx]);
  }
  return picked;
}

async function fetchExternalPool(){
  try{
    const resp = await fetch('messages.txt');
    if(!resp.ok) return;
    const txt = await resp.text();
    const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(lines.length>0){ externalPool = lines; console.debug('Loaded messages.txt with', lines.length, 'lines'); }
  }catch(e){ console.debug('No external messages.txt found or fetch failed'); }
}

window.addEventListener('DOMContentLoaded', ()=>{ fetchExternalPool(); });

function showSingleLineAnimated(ln){
  personalText.innerHTML = '';
  const el = document.createElement('div');
  el.className='message-lines';
  el.style.opacity = 0; el.textContent = ln;
  personalText.appendChild(el);
  setTimeout(()=>el.style.transition='opacity .4s',10);
  setTimeout(()=>el.style.opacity=1,120);
}

revealBtn.addEventListener('click', ()=>{
  const line = pickLines(1)[0];
  showSingleLineAnimated(line);
  message.classList.remove('hidden');
  heart.style.transform = 'scale(1.25)';
  setTimeout(()=>heart.style.transform='scale(1)',400);
  launchConfetti(80);
});

regenBtn.addEventListener('click', ()=>{
  const line = pickLines(1)[0];
  showSingleLineAnimated(line);
});

closeBtn.addEventListener('click', ()=>{
  message.classList.add('hidden');
});

confettiBtn.addEventListener('click', ()=>launchConfetti(120));

// WebAudio: longer melodic piece constructed programmatically
let audioCtx = null, musicPlaying = false;
let presetList = [];
let loopHandles = [];
let activeOscillators = [];

musicBtn.addEventListener('click', ()=>{
  if(musicPlaying) stopMusic(); else playRandomLoopingMelody();
});

// generate a set of procedural melody presets
function makePresets(n=100){
  const waveforms = ['sine','triangle','sawtooth','square'];
  const scaleSets = {
    pentatonic: [0,2,4,7,9,12],
    major: [0,2,4,5,7,9,11,12],
    minor: [0,2,3,5,7,8,10,12],
    dorian: [0,2,3,5,7,9,10,12]
  };
  const presets = [];
  for(let i=0;i<n;i++){
    const base = 200 + Math.floor(Math.random()*500); // base freq
    const wf = waveforms[Math.floor(Math.random()*waveforms.length)];
    const keys = Object.keys(scaleSets);
    const scale = scaleSets[keys[Math.floor(Math.random()*keys.length)]];
    const arpLen = 4 + Math.floor(Math.random()*6);
    const arp = new Array(arpLen).fill(0).map(_=> scale[Math.floor(Math.random()*scale.length)]);
    const bpm = 60 + Math.floor(Math.random()*80);
    const voices = 1 + Math.floor(Math.random()*3);
    const detune = (Math.random()*40)-20;
    presets.push({base,wf,arp,bpm,voices,detune});
  }
  return presets;
}

function playRandomLoopingMelody(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = audioCtx;
  if(!presetList || presetList.length===0) presetList = makePresets(100);
  const preset = presetList[Math.floor(Math.random()*presetList.length)];
  const master = ctx.createGain(); master.gain.value = 0.04; master.connect(ctx.destination);

  // scheduling using setInterval: create short voice notes repeatedly
  const stepMs = (60000 / preset.bpm) / 2; // eighth-note step
  for(let v=0; v<preset.voices; v++){
    let step = 0;
    const handle = setInterval(()=>{
      const interval = preset.arp[step % preset.arp.length];
      const freq = preset.base * Math.pow(2, interval/12) * Math.pow(2, v*0.02);
      const o = ctx.createOscillator(); o.type = preset.wf; o.frequency.value = freq; o.detune.value = preset.detune * v;
      const g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(master);
      const now = ctx.currentTime;
      const dur = Math.max(0.12, (stepMs/1000)*0.9);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(1, now + 0.01);
      g.gain.linearRampToValueAtTime(0.0001, now + dur);
      o.start(now);
      o.stop(now + dur + 0.05);
      activeOscillators.push(o);
      // cleanup old oscillators periodically
      if(activeOscillators.length>500){
        activeOscillators.splice(0, activeOscillators.length-300);
      }
      step++;
    }, stepMs);
    loopHandles.push(handle);
  }
  musicPlaying = true; musicBtn.textContent='Stop Melody';
}

function stopMusic(){
  loopHandles.forEach(h=>clearInterval(h)); loopHandles=[];
  // stop any still-running oscillators
  activeOscillators.forEach(o=>{ try{o.stop();}catch(e){} }); activeOscillators=[];
  musicPlaying=false; musicBtn.textContent='Play Melody';
}

/* Confetti (unchanged) */
function launchConfetti(count=100){
  const canvas = document.getElementById('confettiCanvas');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#ff6b6b','#ffd93d','#6bcB77','#6ec6ff','#c792ea'];
  const pieces = [];
  for(let i=0;i<count;i++) pieces.push({
    x:Math.random()*canvas.width,
    y:Math.random()*-canvas.height,
    w:6+Math.random()*10,h:6+Math.random()*8,
    vx:(Math.random()-0.5)*6,vy:2+Math.random()*6,
    color:colors[Math.floor(Math.random()*colors.length)],rot:Math.random()*360,vr:Math.random()*8
  });
  let t0=null;
  function draw(ts){
    if(!t0) t0=ts;
    const dt = (ts-t0)/16; t0=ts;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const p of pieces){
      p.x += p.vx*dt*0.6; p.y += p.vy*dt*0.6; p.vy += 0.08*dt;
      p.rot += p.vr*dt;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    }
    if(pieces.some(p=>p.y < canvas.height+50)) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  requestAnimationFrame(draw);
}

/* Slideshow: controlled load from a pattern and count */
let slides = [], currentIndex = 0;
picsBtn.addEventListener('click', async ()=>{
  // open slideshow overlay and auto-load images
  slideshow.classList.remove('hidden'); slideshow.setAttribute('aria-hidden','false');
  // auto-trigger load
  await autoLoadPics();
});
closePicsBtn.addEventListener('click', ()=>{ slideshow.classList.add('hidden'); slideshow.setAttribute('aria-hidden','true'); slides=[]; });

async function autoLoadPics(){
  slides = [];
  // try directory listing variants first
  const tried = [];
  async function tryFetchListing(path){
    try{
      const resp = await fetch(path);
      tried.push(path + ' -> ' + resp.status);
      if(!resp.ok) return [];
      const ct = resp.headers.get('content-type')||'';
      if(ct.includes('application/json')){
        const js = await resp.json();
        // expect array of filenames
        if(Array.isArray(js)) return js.map(s=> (s.startsWith('/')? s : ('PICS/' + s)) );
        return [];
      }
      if(ct.includes('text/html')){
        const txt = await resp.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(txt,'text/html');
        const candidates = [];
        doc.querySelectorAll('a').forEach(a=>{ if(a.getAttribute('href')) candidates.push(a.getAttribute('href')); });
        doc.querySelectorAll('img').forEach(i=>{ if(i.getAttribute('src')) candidates.push(i.getAttribute('src')); });
        const exts = ['.jpg','.jpeg','.png','.webp','.gif'];
        const base = new URL(window.location.href);
        const out = [];
        for(const c of candidates){
          if(!c) continue;
          const lower = c.toLowerCase();
          if(exts.some(e=>lower.endsWith(e))){
            try{ const u = new URL(c, base); out.push(u.pathname + (u.search||'')); }catch(e){}
          }
        }
        return out;
      }
    }catch(e){ tried.push(path + ' -> error'); }
    return [];
  }

  // Try common listing endpoints
  const candidatesLists = ['PICS/', 'PICS', 'pics/', 'pics'];
  for(const p of candidatesLists){
    const found = await tryFetchListing(p);
    if(found.length) { slides.push(...found); break; }
  }

  // Try a manifest file next
  if(slides.length===0){
    try{
      const m = await fetch('PICS/pics.json');
      if(m.ok){
        const arr = await m.json(); if(Array.isArray(arr)) slides.push(...arr.map(s=> s.startsWith('/')? s.slice(1) : 'PICS/' + s));
      }
    }catch(e){}
  }

  // fallback to probing multiple filename patterns
  if(slides.length===0){
    const patterns = ['PICS/pic', 'PICS/img', 'PICS/image', 'PICS/photo', 'PICS/'];
    const maxCount = 100;
    const exts = ['.jpg','.jpeg','.png','.webp','.gif'];
    for(const pat of patterns){
      for(let i=1;i<=maxCount;i++){
        // try unpadded and zero-padded variants
        const variants = [ `${pat}${i}`, `${pat}${String(i).padStart(2,'0')}`, `${pat}${String(i).padStart(3,'0')}` ];
        let found=false;
        for(const v of variants){
          for(const e of exts){
            const url = `${v}${e}`;
            try{
              const ok = await new Promise(res=>{
                const img = new Image(); img.onload=()=>res(true); img.onerror=()=>res(false); img.src=url;
              });
              if(ok){ slides.push(url); found=true; break; }
            }catch(er){}
          }
          if(found) break;
        }
        if(found) continue;
      }
      if(slides.length) break;
    }
  }

  // debug info
  console.debug('autoLoadPics tried:', tried.slice(0,10));

  if(slides.length===0){
    // show message inside slideshow overlay
    const inner = slideshow.querySelector('.slideshow-inner');
    if(inner){
      inner.querySelector('.viewer').style.display='none';
      let note = inner.querySelector('.no-images-note');
      if(!note){ note = document.createElement('div'); note.className='no-images-note'; note.style.padding='18px'; note.style.textAlign='center'; note.style.color='#333'; inner.appendChild(note); }
      note.textContent = 'No images found in PICS/. Place images there or add a pics.json manifest. Close this overlay when ready.';
    }
    return;
  }
  slides = Array.from(new Set(slides));
  // restore viewer in case hidden
  const inner = slideshow.querySelector('.slideshow-inner');
  if(inner){ inner.querySelector('.viewer').style.display='flex'; const note = inner.querySelector('.no-images-note'); if(note) note.remove(); }
  currentIndex = 0; showSlide();
}


function showSlide(){
  slideImg.src = slides[currentIndex];
  slideIndex.textContent = `${currentIndex+1} / ${slides.length}`;
}
prevPic.addEventListener('click', ()=>{ if(slides.length===0) return; currentIndex = (currentIndex-1+slides.length)%slides.length; showSlide(); });
nextPic.addEventListener('click', ()=>{ if(slides.length===0) return; currentIndex = (currentIndex+1)%slides.length; showSlide(); });

