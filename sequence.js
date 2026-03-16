window.toast = function(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2400);
}
window.switchTab = function(id,btn){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('p-'+id).classList.add('on');
}
const BARS=32;
const barEls=[];
let barDecay=null;
(()=>{
  const w=document.getElementById('wave-wrap');
  for(let i=0;i<BARS;i++){const b=document.createElement('div');b.className='wbar';w.appendChild(b);barEls.push(b);}
})();
function flashBars(color){
  clearTimeout(barDecay);
  const mid=BARS/2;
  barEls.forEach((b,i)=>{
    const d=Math.abs(i-mid)/mid;
    b.style.height=Math.max(4,(1-d*.55)*(16+Math.random()*18))+'px';
    b.style.background=color;
  });
  barDecay=setTimeout(()=>{barEls.forEach(b=>{b.style.height='3px';b.style.background='var(--border2)';});},200);
}
let AC=null,masterG=null,reverbConv=null,reverbG=null,dryG=null;
function getAC(){
  if(AC)return AC;
  AC=new(window.AudioContext||window.webkitAudioContext)();
  masterG=AC.createGain();masterG.gain.value=0.65;masterG.connect(AC.destination);
  dryG=AC.createGain();dryG.connect(masterG);
  reverbG=AC.createGain();reverbG.connect(masterG);
  buildReverb();return AC;
}
function buildReverb(){
  if(!AC)return;
  const lvl=+document.getElementById('sl-reverb').value;
  const secs=[0,.6,1.4,2.6,4.0][lvl];
  if(reverbConv){try{reverbConv.disconnect();}catch(e){}}
  reverbConv=AC.createConvolver();
  if(secs>0){
    const len=AC.sampleRate*secs,buf=AC.createBuffer(2,len,AC.sampleRate);
    for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.8);}
    reverbConv.buffer=buf;
  }
  reverbConv.connect(reverbG);
  const mx=[0,.18,.35,.55,.72][lvl];
  reverbG.gain.value=mx;dryG.gain.value=1-mx*.5;
}
document.getElementById('sl-reverb').addEventListener('change',()=>{buildReverb();window.syncLabels();});
document.getElementById('sl-vol').addEventListener('input',()=>{if(masterG)masterG.gain.value=+document.getElementById('sl-vol').value/10*.85;window.syncLabels();});
let curMode='pad';
function playNote(freq,when,dur,mutAmt=0){
  if(!AC)return;
  const mutLvl=mutAmt||+document.getElementById('sl-mut').value;
  if(mutLvl>0){
    const chance=mutLvl/5;
    if(Math.random()<chance*.3)return;
    freq*=(1+(Math.random()-.5)*chance*.12);
  }
  const out=dryG,rv=reverbConv;
  if(curMode==='pad'){
    [[freq,.26],[freq*2,.09],[freq*1.5,.06]].forEach(([f,a])=>{
      const o=AC.createOscillator(),g=AC.createGain();
      o.type='sine';o.frequency.value=f;
      g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(a,when+.06);
      g.gain.setValueAtTime(a*.8,when+dur*.55);g.gain.linearRampToValueAtTime(0,when+dur*1.1);
      o.connect(g);g.connect(out);if(rv)g.connect(rv);o.start(when);o.stop(when+dur*1.15);
    });
  }else if(curMode==='bowl'){
    const mod=AC.createOscillator(),mg=AC.createGain();
    mod.type='sine';mod.frequency.value=freq*.5;mg.gain.value=2.2;mod.connect(mg);
    [[freq,.24],[freq*2.756,.08],[freq*5.4,.022]].forEach(([f,a])=>{
      const o=AC.createOscillator(),g=AC.createGain();
      o.type='sine';o.frequency.value=f;mg.connect(o.frequency);
      g.gain.setValueAtTime(a,when);g.gain.exponentialRampToValueAtTime(.0001,when+dur*1.55);
      o.connect(g);g.connect(out);if(rv)g.connect(rv);o.start(when);o.stop(when+dur*1.6);
    });
    mod.start(when);mod.stop(when+dur*1.6);
  }else if(curMode==='flute'){
    const o=AC.createOscillator(),g=AC.createGain(),filt=AC.createBiquadFilter();
    filt.type='lowpass';filt.frequency.value=freq*4.5;filt.Q.value=.7;
    o.type='triangle';o.frequency.value=freq;
    const vib=AC.createOscillator(),vg=AC.createGain();
    vib.frequency.value=5.2;vg.gain.value=freq*.011;vib.connect(vg);vg.connect(o.frequency);
    g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(.2,when+.08);
    g.gain.setValueAtTime(.16,when+dur*.6);g.gain.linearRampToValueAtTime(0,when+dur);
    o.connect(filt);filt.connect(g);g.connect(out);if(rv)g.connect(rv);
    o.start(when);o.stop(when+dur+.05);vib.start(when);vib.stop(when+dur+.05);
  }else{
    [[1,.22],[2,.11],[3,.055],[4,.022]].forEach(([m,a],i)=>{
      const o=AC.createOscillator(),g=AC.createGain();
      o.type='triangle';o.frequency.value=freq*m;
      const dt=dur*(1-i*.17);
      g.gain.setValueAtTime(a,when);g.gain.exponentialRampToValueAtTime(.0001,when+dt);
      o.connect(g);g.connect(out);if(rv)g.connect(rv);o.start(when);o.stop(when+dt+.04);
    });
  }
}
const BASE={
  A:{freq:261.63,name:'C4',desc:'Sky · root',    color:'#6ecff6',midi:60},
  U:{freq:293.66,name:'D4',desc:'Stream · 2nd',  color:'#8ec5f8',midi:62},
  T:{freq:329.63,name:'E4',desc:'Meadow · 3rd',  color:'#90dba0',midi:64},
  G:{freq:392.00,name:'G4',desc:'Mist · 5th',    color:'#c4aee8',midi:67},
  C:{freq:440.00,name:'A4',desc:'Dawn · 6th',    color:'#f5d080',midi:69},
};
const AA_FREQ={M:523.25,K:587.33,L:659.25,I:523.25,V:783.99,F:880,W:523.25,Y:659.25,H:783.99,R:587.33,D:523.25,E:880,N:659.25,Q:783.99,S:440,P:523.25,X:659.25,Z:587.33,B:880};
const AA_MIDI={M:72,K:74,L:76,I:72,V:79,F:81,W:72,Y:76,H:79,R:74,D:72,E:81,N:76,Q:79,S:69,P:72,X:76,Z:74,B:81};
function noteOf(ch){
  if(BASE[ch])return{...BASE[ch],type:'base'};
  if(AA_FREQ[ch])return{freq:AA_FREQ[ch],name:'aa',desc:`Amino · ${ch}`,color:'#d0b8e4',type:'aa',midi:AA_MIDI[ch]||72};
  return null;
}
let playing=false,playTimer=null,breathTimer=null,seqArr=[],idx=0;
const TDUR=[1.5,1.0,.65,.38,.22];
const TLBL=['Very Slow','Gentle','Calm','Flowing','Lively'];
window.startPlay = function(arr,targetTileContainer){
  if(playing)return;
  const raw=arr||(document.getElementById('seq-input').value.replace(/\s+/g,'')||'');
  if(!raw){window.setStatus('Please enter a sequence first ✦');return;}
  getAC();if(AC.state==='suspended')AC.resume();
  seqArr=[...raw.toUpperCase()];
  if(!arr)buildTiles(seqArr);
  idx=0;playing=true;
  document.getElementById('btn-play').disabled=true;
  document.getElementById('btn-stop').disabled=false;
  window.setPill(true);window.setStatus('♩ Playing your sequence…');
  let bp=0;
  breathTimer=setInterval(()=>{bp++;document.getElementById('br').classList.toggle('exp',bp%2===0);},4000);
  tick();
}
function tick(){
  if(!playing)return;
  if(idx>=seqArr.length){finish();return;}
  const ch=seqArr[idx];
  const note=noteOf(ch);
  const dur=TDUR[+document.getElementById('sl-tempo').value-1];
  const prev=document.getElementById('t'+(idx-1));
  if(prev){prev.classList.remove('playing');prev.classList.add('done');}
  const cur=document.getElementById('t'+idx);
  if(cur){cur.classList.add('playing');cur.scrollIntoView({block:'nearest',behavior:'smooth'});}
  document.getElementById('note-char').textContent=ch;
  if(note){
    document.getElementById('note-char').style.color=note.color;
    document.getElementById('note-char').style.opacity='1';
    document.getElementById('note-name').textContent=note.name;
    document.getElementById('note-desc').textContent=note.desc;
    flashBars(note.color);
    playNote(note.freq,AC.currentTime,dur*1.3);
  }else{
    document.getElementById('note-char').style.color='rgba(184,207,224,.3)';
    document.getElementById('note-char').style.opacity='.3';
    document.getElementById('note-name').textContent='—';
    document.getElementById('note-desc').textContent='No note for this character';
  }
  document.getElementById('note-pos').textContent=`Position ${idx+1} of ${seqArr.length}`;
  document.getElementById('prog-fill').style.width=((idx+1)/seqArr.length*100)+'%';
  idx++;
  playTimer=setTimeout(tick,dur*1000);
}
window.stopPlay = function(){
  playing=false;clearTimeout(playTimer);clearInterval(breathTimer);
  clearTimeout(barDecay);barEls.forEach(b=>{b.style.height='3px';b.style.background='var(--border2)';});
  const p=document.querySelector('.base.playing');if(p){p.classList.remove('playing');p.classList.add('done');}
  document.getElementById('btn-play').disabled=false;
  document.getElementById('btn-stop').disabled=true;
  document.getElementById('br').classList.remove('exp');
  document.getElementById('prog-fill').style.width='0%';
  window.setPill(false);window.setStatus('Stopped · Press Begin to restart');
}
function finish(){
  playing=false;clearInterval(breathTimer);
  clearTimeout(barDecay);barEls.forEach(b=>{b.style.height='3px';b.style.background='var(--border2)';});
  const last=document.getElementById('t'+(seqArr.length-1));
  if(last){last.classList.remove('playing');last.classList.add('done');}
  document.getElementById('btn-play').disabled=false;
  document.getElementById('btn-stop').disabled=true;
  document.getElementById('br').classList.remove('exp');
  window.setPill(false);window.setStatus('∼ Complete · May peace remain with you ∼');
}
function buildTiles(arr){
  const h=arr.map((ch,i)=>{
    let c='base ';
    if('ATGCU'.includes(ch))c+=ch;else if(noteOf(ch))c+='AA';else c+='XX';
    return `<span id="t${i}" class="${c}">${ch}</span>`;
  }).join('');
  document.getElementById('seq-tiles').innerHTML=h;
  document.getElementById('seq-block').scrollTop=0;
}
window.setStatus = function(t){document.getElementById('status').textContent=t;}
window.setPill = function(on){document.getElementById('pill').classList.toggle('on',on);document.getElementById('pill-txt').textContent=on?'Playing':'Idle';}
window.setMode = function(btn){document.querySelectorAll('.mbtn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');curMode=btn.dataset.mode;}
window.syncLabels = function(){
  const t=+document.getElementById('sl-tempo').value-1,r=+document.getElementById('sl-reverb').value,v=+document.getElementById('sl-vol').value,m=+document.getElementById('sl-mut').value;
  document.getElementById('v-tempo').textContent=TLBL[t];
  document.getElementById('v-reverb').textContent=['None','Subtle','Medium','Deep','Vast'][r];
  document.getElementById('v-vol').textContent=['Off','Whisper','Soft','Low','Gentle','Medium','Warm','Rich','Full','Loud','Max'][v];
  document.getElementById('v-mut').textContent=['Off','Slight','Mild','Heavy','Chaotic','Max Noise'][m];
  if(masterG)masterG.gain.value=v/10*.85;
}
const SAMPLES={dna:'ATGCATGCATGCGATCGATCGATCGGCTAGCATCGATGCATGCATGC',rna:'AUGCAUGCAUGCGAUCGAUCGAUCGGCUAGCAUGCAUGCAUGCAUGC',protein:'MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGD',calm:'ATAGCTAGCATGCATGC'};
window.fillSample = function(k){window.stopPlay();document.getElementById('seq-input').value=SAMPLES[k];document.getElementById('seq-tiles').innerHTML='';window.setStatus('Ready · Press Begin when you are calm');}
const SR=44100;
function noteOffsine(freq,dur,mode='pad'){
  const len=Math.ceil(SR*dur*1.3);
  const buf=new Float32Array(len);
  const att=Math.min(0.06*SR,len/3)|0;
  const rel=Math.min(dur*0.6*SR,len)|0;
  if(mode==='pad'||mode==='bowl'||mode==='flute'){
    const pairs=mode==='bowl'?[[freq,.24],[freq*2.756,.07],[freq*5.4,.02]]:[[freq,.26],[freq*2,.08],[freq*1.5,.06]];
    pairs.forEach(([f,a])=>{
      for(let i=0;i<len;i++){
        let env=i<att?i/att:i<len-rel?1:(len-i)/Math.max(rel,1);
        env=Math.max(0,env);
        buf[i]+=Math.sin(2*Math.PI*f*i/SR)*a*env;
      }
    });
  }else{
    [[1,.22],[2,.11],[3,.055]].forEach(([m,a])=>{
      for(let i=0;i<len;i++){
        const env=Math.exp(-i/(SR*dur*.6));
        buf[i]+=Math.sin(2*Math.PI*freq*m*i/SR)*a*env;
      }
    });
  }
  return buf;
}
function mixBuffers(chunks,gapSamples){
  let total=0;chunks.forEach(c=>total+=c.length+gapSamples);
  const out=new Float32Array(total);let pos=0;
  chunks.forEach(c=>{out.set(c,pos);pos+=c.length+gapSamples;});
  return out;
}
function bufToWav(buf){
  const len=buf.length,ab=new ArrayBuffer(44+len*2),dv=new DataView(ab);
  const wr=(o,s)=>{for(let i=0;i<s.length;i++)dv.setUint8(o+i,s.charCodeAt(i));};
  wr(0,'RIFF');dv.setUint32(4,36+len*2,true);wr(8,'WAVE');wr(12,'fmt ');
  dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
  dv.setUint32(24,SR,true);dv.setUint32(28,SR*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);
  wr(36,'data');dv.setUint32(40,len*2,true);
  for(let i=0;i<len;i++){const s=Math.max(-1,Math.min(1,buf[i]));dv.setInt16(44+i*2,s<0?s*32768:s*32767,true);}
  return ab;
}
function downloadWav(buf,name){
  const ab=bufToWav(buf),blob=new Blob([ab],{type:'audio/wav'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=name; a.style.display='none';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},3000);
  window.toast('⬇ Downloading '+name+' to your Downloads folder…');
}
function getRawSeq(){
  const v=document.getElementById('seq-input').value.replace(/\s+/g,'').toUpperCase();
  if(!v){window.toast('⚠ Enter a sequence first');return null;}return v;
}
const MAX_WAV_SEC = 30;
function calcNoteDur(seqLen){return Math.min(2.0, Math.max(0.04, MAX_WAV_SEC / seqLen));}
window.dlFullMelody = function(){
  const seq=getRawSeq();if(!seq)return;
  const btn=document.querySelector('.btn-dl');
  if(btn){btn.textContent='⏳ Rendering…';btn.disabled=true;}
  window.toast('Rendering 30s WAV… please wait');
  setTimeout(()=>{
    try{
      const dur=calcNoteDur(seq.length);
      const gap=Math.ceil(SR*dur*.05);
      const chunks=[...seq].map(ch=>{
        const n=noteOf(ch);
        return n?noteOffsine(n.freq,dur,curMode):new Float32Array(Math.ceil(SR*dur*.4));
      });
      downloadWav(mixBuffers(chunks,gap),'sequence_melody_30s.wav');
    }finally{
      if(btn){btn.textContent='⬇ WAV';btn.disabled=false;}
    }
  },60);
}
window.dlNucleotideMelody = function(){
  const seq=getRawSeq();if(!seq)return;
  const nucs=[...seq].filter(ch=>'ATGCU'.includes(ch));
  if(!nucs.length){window.toast('No nucleotides found');return;}
  const dur=calcNoteDur(nucs.length);
  const gap=Math.ceil(SR*dur*.05);
  const chunks=nucs.map(ch=>{const n=noteOf(ch);return n?noteOffsine(n.freq,dur,curMode):new Float32Array(0);});
  downloadWav(mixBuffers(chunks,gap),'nucleotide_melody_30s.wav');
}
window.dlCodonHarmony = function(){
  const seq=getRawSeq();if(!seq)return;
  const codonCount=Math.ceil(seq.length/3);
  const dur=calcNoteDur(codonCount);
  const gap=Math.ceil(SR*dur*.05);
  const chunks=[];
  for(let i=0;i<seq.length;i+=3){
    const codon=seq.slice(i,i+3);
    const notes=[...codon].map(ch=>noteOf(ch)).filter(Boolean);
    if(!notes.length){chunks.push(new Float32Array(Math.ceil(SR*dur*.4)));continue;}
    const len=Math.ceil(SR*dur*1.3);
    const mix=new Float32Array(len);
    notes.forEach(n=>{const b=noteOffsine(n.freq,dur,curMode);for(let j=0;j<Math.min(b.length,len);j++)mix[j]+=b[j]/notes.length;});
    chunks.push(mix);
  }
  downloadWav(mixBuffers(chunks,gap),'codon_harmony_30s.wav');
}
window.dlGCRhythm = function(){
  const seq=getRawSeq();if(!seq)return;
  const dur=calcNoteDur(seq.length);
  const gcDur=dur*.65, atDur=dur*.35;
  const gap=Math.ceil(SR*dur*.04);
  const chunks=[...seq].map(ch=>{
    const isGC='GC'.includes(ch);
    const n=noteOf(ch);
    if(!n)return new Float32Array(Math.ceil(SR*atDur));
    return noteOffsine(n.freq,isGC?gcDur:atDur,'harp');
  });
  downloadWav(mixBuffers(chunks,gap),'gc_rhythm_30s.wav');
}
function buildMIDIBytes(seq,ticksPerBeat=480,tempo=600000){
  const dur=TDUR[+document.getElementById('sl-tempo').value-1];
  const ticks=Math.round(ticksPerBeat*(dur*1e6/tempo));
  const events=[];
  [...seq].forEach(ch=>{
    const n=noteOf(ch);const midi=n?n.midi:null;
    if(midi){
      events.push([0,0x90,midi,80]);
      events.push([ticks,0x80,midi,0]);
    }else{events.push([ticks,0,0,0]);}
  });
  function vl(n){const b=[];do{b.unshift(n&0x7f);n>>=7;}while(n>0);for(let i=0;i<b.length-1;i++)b[i]|=0x80;return b;}
  const track=[];
  track.push(...[0,0xFF,0x51,0x03,(tempo>>16)&0xFF,(tempo>>8)&0xFF,tempo&0xFF]);
  events.forEach(([dt,st,d1,d2])=>{
    track.push(...vl(dt));
    if(st)track.push(st,d1,d2);
  });
  track.push(0,0xFF,0x2F,0);
  const hdr=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(ticksPerBeat>>8)&0xFF,ticksPerBeat&0xFF];
  const trkH=[0x4D,0x54,0x72,0x6B,(track.length>>24)&0xFF,(track.length>>16)&0xFF,(track.length>>8)&0xFF,track.length&0xFF];
  return new Uint8Array([...hdr,...trkH,...track]);
}
window.dlMIDI = function(){
  const seq=getRawSeq();if(!seq)return;
  const bytes=buildMIDIBytes(seq);
  const blob=new Blob([bytes],{type:'audio/midi'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='sequence_melody.mid';a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},3000);
  window.toast('⬇ Downloading MIDI to your Downloads folder…');
}
window.dlCSV = function(){
  const seq=getRawSeq();if(!seq)return;
  const dur=TDUR[+document.getElementById('sl-tempo').value-1];
  let csv='Position,Base,Note,Frequency(Hz),MIDI,Codon,CodonPos,IsGC,Time(s)\n';
  [...seq].forEach((ch,i)=>{
    const n=noteOf(ch);
    const codon=Math.floor(i/3)+1,cpos=(i%3)+1,isGC='GC'.includes(ch)?1:0;
    const freq=n?n.freq.toFixed(2):'—',note=n?n.name:'—',midi=n?n.midi:'—';
    csv+=`${i+1},${ch},${note},${freq},${midi},${codon},${cpos},${isGC},${(i*dur).toFixed(3)}\n`;
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='sequence_data.csv';a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},3000);
  window.toast('⬇ Downloading CSV to your Downloads folder…');
}
function renderSpectrogramToCanvas(canvasId,seq){
  const canvas=document.getElementById(canvasId);
  if(!canvas)return;
  const W=canvas.width=canvas.offsetWidth||600;
  const H=canvas.height=canvas.offsetHeight||160;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.9)';ctx.fillRect(0,0,W,H);
  const notes=[...seq].map(ch=>noteOf(ch)).filter(Boolean);
  if(!notes.length)return;
  const minF=200,maxF=1000;
  const blockW=Math.max(2,Math.floor(W/notes.length));
  notes.forEach((n,i)=>{
    const x=i*blockW;
    [[n.freq,1],[n.freq*2,.45],[n.freq*3,.2]].forEach(([f,intensity])=>{
      if(f>maxF*1.5)return;
      const normF=(Math.log2(f)-Math.log2(minF))/(Math.log2(maxF)-Math.log2(minF));
      const y=H-(normF*H*.82+H*.08);
      const spread=Math.max(2,(H*.04)*intensity);
      const grad=ctx.createLinearGradient(x,y-spread,x,y+spread);
      grad.addColorStop(0,'transparent');grad.addColorStop(.5,n.color+(Math.round(intensity*180)).toString(16).padStart(2,'0'));grad.addColorStop(1,'transparent');
      ctx.fillStyle=grad;ctx.fillRect(x,y-spread,blockW,spread*2);
    });
  });
  ctx.fillStyle='rgba(184,207,224,.3)';ctx.font='10px DM Sans,sans-serif';
  ctx.fillText('Hz ↑',2,10);ctx.fillText('Time →',W-44,H-3);
}
window.dlSpectrogram = function(){
  const seq=getRawSeq();if(!seq)return;
  const tmpC=document.createElement('canvas');tmpC.width=900;tmpC.height=200;tmpC.id='_tmp_spec';
  document.body.appendChild(tmpC);
  renderSpectrogramToCanvas('_tmp_spec',seq);
  tmpC.toBlob(blob=>{
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='spectrogram.png';a.click();
    tmpC.remove();window.toast('⬇ Downloaded Spectrogram PNG');
  });
}
window.playCompareA = function(){window.switchTab('play',document.querySelectorAll('.tab')[0]);const v=document.getElementById('cmp-a').value.replace(/\s+/g,'');if(v)document.getElementById('seq-input').value=v;window.startPlay();}
window.playCompareB = function(){window.switchTab('play',document.querySelectorAll('.tab')[0]);const v=document.getElementById('cmp-b').value.replace(/\s+/g,'');if(v)document.getElementById('seq-input').value=v;window.startPlay();}
window.runCompare = function(){
  const a=document.getElementById('cmp-a').value.replace(/\s+/g,'').toUpperCase();
  const b=document.getElementById('cmp-b').value.replace(/\s+/g,'').toUpperCase();
  if(!a||!b){window.toast('⚠ Enter both sequences');return;}
  const minLen=Math.min(a.length,b.length);
  let pitchSum=0,pitchCount=0;
  for(let i=0;i<minLen;i++){
    const na=noteOf(a[i]),nb=noteOf(b[i]);
    if(na&&nb){pitchSum+=Math.abs(12*Math.log2(na.freq/nb.freq));pitchCount++;}
  }
  const pitchDist=pitchCount?pitchSum/pitchCount:0;
  const gcA=[...a].filter(c=>'GC'.includes(c)).length/a.length;
  const gcB=[...b].filter(c=>'GC'.includes(c)).length/b.length;
  const rhythmDiff=Math.abs(gcA-gcB);
  let matches=0;
  for(let i=0;i<minLen;i++){
    const na=noteOf(a[i]),nb=noteOf(b[i]);
    if(na&&nb&&na.midi===nb.midi)matches++;
    else if(!na&&!nb)matches++;
  }
  const melSim=minLen?(matches/minLen*100):0;
  document.getElementById('sc-pitch').textContent=pitchDist.toFixed(2);
  document.getElementById('sc-pitch-sub').textContent='avg semitones apart';
  document.getElementById('sc-rhythm').textContent=(rhythmDiff*100).toFixed(1)+'%';
  document.getElementById('sc-rhythm-sub').textContent=`GC: ${(gcA*100).toFixed(0)}% vs ${(gcB*100).toFixed(0)}%`;
  document.getElementById('sc-melody').textContent=melSim.toFixed(1)+'%';
  document.getElementById('sc-melody-sub').textContent='note match similarity';
  drawContour(a,b);
  drawMutProfile(a,b,minLen);
  window.toast('✦ Comparison complete');
}
function drawContour(a,b){
  const canvas=document.getElementById('cmp-canvas');
  const W=canvas.width=canvas.offsetWidth||600,H=canvas.height=140;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,0,W,H);
  const minLen=Math.min(a.length,b.length);
  if(!minLen)return;
  const minF=200,maxF=1200;
  function freqToY(f){return H-(Math.log2(f/minF)/Math.log2(maxF/minF))*(H*.82)-H*.08;}
  [a,b].forEach((seq,si)=>{
    const color=si===0?'#6ecff6':'#90dba0';
    ctx.beginPath();let started=false;
    [...seq].slice(0,minLen).forEach((ch,i)=>{
      const n=noteOf(ch);if(!n)return;
      const x=i/minLen*W,y=freqToY(n.freq);
      if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);
    });
    ctx.strokeStyle=color+'bb';ctx.lineWidth=1.8;ctx.stroke();
  });
  ctx.beginPath();let started=false;
  const pts=[];
  for(let i=0;i<minLen;i++){
    const na=noteOf(a[i]),nb=noteOf(b[i]);
    if(na&&nb)pts.push([i/minLen*W,freqToY(na.freq),freqToY(nb.freq)]);
  }
  pts.forEach(([x,ya,yb])=>{
    if(!started){ctx.moveTo(x,ya);started=true;}else ctx.lineTo(x,ya);
  });
  pts.slice().reverse().forEach(([x,,yb])=>ctx.lineTo(x,yb));
  ctx.closePath();
  ctx.fillStyle='rgba(110,207,246,.08)';ctx.fill();
}
function drawMutProfile(a,b,len){
  const types={match:0,transition:0,transversion:0,insertion:0,deletion:0};
  const purines=new Set(['A','G']);
  for(let i=0;i<len;i++){
    const ca=a[i],cb=b[i];
    if(ca===cb){types.match++;}
    else if(purines.has(ca)===purines.has(cb)){types.transition++;}
    else{types.transversion++;}
  }
  types.insertion=Math.max(0,b.length-a.length);
  types.deletion=Math.max(0,a.length-b.length);
  const colors={match:'#90dba0',transition:'#6ecff6',transversion:'#f5d080',insertion:'#c4aee8',deletion:'#f6906e'};
  const mp=document.getElementById('mut-profile');
  mp.innerHTML='';
  Object.entries(types).forEach(([k,v])=>{
    const pct=len?(v/len*100).toFixed(1):0;
    const row=document.createElement('div');row.className='mut-bar-row';
    row.innerHTML=`<span style="width:110px;text-transform:uppercase;letter-spacing:1.5px;font-size:.7rem">${k}</span>
    <div class="mut-bar-bg"><div class="mut-bar-fill" style="width:${pct}%;background:${colors[k]}"></div></div>
    <span style="width:60px;text-align:right">${v} (${pct}%)</span>`;
    mp.appendChild(row);
  });
}
let genSeq='';
const DNA_BASES='ATGC',RNA_BASES='AUGC',AA='MKLVFWYHRDNEQSPITGB';
const GC_BASES='GGGGCCCC',AT_BASES='AAAATTT';
window.autoSeq = function(type){
  const len=+document.getElementById('sl-autolen').value;
  const pool={dna:DNA_BASES,rna:RNA_BASES,protein:AA,gc_rich:GC_BASES,at_rich:AT_BASES}[type];
  genSeq=Array.from({length:len},()=>pool[Math.floor(Math.random()*pool.length)]).join('');
  document.getElementById('ag-seq').textContent=genSeq;
  const notes=[...genSeq].map(ch=>{const n=noteOf(ch);return n?n.name:'—';});
  document.getElementById('ag-melody').textContent=notes.join(' ');
  const midi=[...genSeq].map(ch=>{const n=noteOf(ch);return n?n.midi:'—';});
  document.getElementById('ag-midi').textContent=midi.join(' ');
  const gc=[...genSeq].filter(c=>'GC'.includes(c)).length;
  const at=[...genSeq].filter(c=>'AT'.includes(c)).length;
  const totalNuc=gc+at||1;
  document.getElementById('ag-stats').innerHTML=
    `GC: ${gc} (${(gc/genSeq.length*100).toFixed(1)}%)<br>AT/AU: ${at} (${(at/genSeq.length*100).toFixed(1)}%)<br>GC ratio: ${(gc/totalNuc).toFixed(3)}<br>Length: ${genSeq.length}`;
  window.toast('✦ Sequence generated');
}
window.useGenSeq = function(){
  if(!genSeq){window.toast('Generate a sequence first');return;}
  document.getElementById('seq-input').value=genSeq;
  window.switchTab('play',document.querySelectorAll('.tab')[0]);
  document.getElementById('seq-tiles').innerHTML='';
  window.setStatus('Ready · Generated sequence loaded');
  window.toast('→ Loaded into player');
}
window.playGenSeq = function(){
  if(!genSeq){window.toast('Generate a sequence first');return;}
  window.useGenSeq();
  setTimeout(()=>window.startPlay(),100);
}
window.dlGenMIDI = function(){
  if(!genSeq){window.toast('Generate a sequence first');return;}
  const bytes=buildMIDIBytes(genSeq);
  const blob=new Blob([bytes],{type:'audio/midi'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='generated_melody.mid';a.click();
  window.toast('⬇ Downloaded Generated MIDI');
}
window.renderSpecGen = function(){
  if(!genSeq){window.toast('Generate a sequence first');return;}
  renderSpectrogramToCanvas('spec-canvas',genSeq);
  window.toast('✦ Spectrogram rendered');
}
window.dlSpecGen = function(){
  if(!genSeq){window.toast('Generate a sequence first');return;}
  renderSpectrogramToCanvas('spec-canvas',genSeq);
  document.getElementById('spec-canvas').toBlob(blob=>{
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='generated_spectrogram.png';a.click();
    window.toast('⬇ Downloaded PNG');
  });
}
window.syncLabels();