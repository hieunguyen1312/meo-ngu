// ===== Mèo Ngữ core: synth + analyzer + translator =====
const SR = 22050;
function makeRng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

function synthMeow(out,start,dur,f0s,f0p,f0e,amp,rng){
  const n=Math.floor(dur*SR);let ph=0;
  for(let i=0;i<n&&start+i<out.length;i++){
    const t=i/n;
    const f=(1-t)*(1-t)*f0s+2*(1-t)*t*f0p+t*t*f0e;
    const vib=1+0.012*Math.sin(2*Math.PI*6*i/SR);
    ph+=2*Math.PI*f*vib/SR;
    const fc=t<0.15?400+(t/0.15)*700:1100-(t-0.15)/0.85*400;
    let s=0;
    for(let h=1;h<=8;h++){const fh=f*h;if(fh>SR/2)break;const w=(1/h)*(0.35+Math.exp(-Math.pow((fh-fc)/450,2)));s+=w*Math.sin(h*ph);}
    const env=Math.min(1,i/(0.04*SR))*Math.min(1,(n-i)/(0.08*SR));
    out[start+i]+=amp*env*(s*0.45+0.01*(rng()*2-1));
  }
  return n;
}
function synthPurr(out,start,dur,amp,rng){
  const n=Math.floor(dur*SR);let lp=0;
  for(let i=0;i<n&&start+i<out.length;i++){
    lp+=0.06*((rng()*2-1)-lp);
    const am=Math.pow(0.5+0.5*Math.sin(2*Math.PI*26*i/SR),3);
    const br=0.65+0.35*Math.sin(Math.PI*i/n);
    const env=Math.min(1,i/(0.06*SR))*Math.min(1,(n-i)/(0.1*SR));
    out[start+i]+=amp*env*br*am*lp*4;
  }
  return n;
}
function synthHiss(out,start,dur,amp,rng){
  const n=Math.floor(dur*SR);let prev=0;
  for(let i=0;i<n&&start+i<out.length;i++){
    const x=rng()*2-1;const y=x-prev;prev=x;
    const env=Math.min(1,i/(0.03*SR))*Math.pow(1-i/n,0.6);
    out[start+i]+=amp*env*y*0.45;
  }
  return n;
}
function synthGrowl(out,start,dur,amp,rng){
  const n=Math.floor(dur*SR);let ph=0;
  for(let i=0;i<n&&start+i<out.length;i++){
    const f=105*(1+0.03*Math.sin(2*Math.PI*3*i/SR));ph+=2*Math.PI*f/SR;
    let s=0;for(let h=1;h<=10;h++)s+=Math.sin(h*ph)/Math.sqrt(h);
    const am=0.6+0.4*Math.sin(2*Math.PI*28*i/SR);
    const env=Math.min(1,i/(0.08*SR))*Math.min(1,(n-i)/(0.1*SR));
    out[start+i]+=amp*env*am*(s*0.18+0.03*(rng()*2-1));
  }
  return n;
}

function deaccent(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');}

// Text -> list of sound events
function parseMeoText(text){
  const raw=(text||'').trim();
  const tokens=raw.split(/[\s,;]+/).filter(Boolean);
  const ev=[];
  for(const tok of tokens){
    const d=deaccent(tok).toLowerCase();
    const loud=tok.length>2&&tok===tok.toUpperCase()&&/[A-ZÀ-Ỹ]/.test(tok);
    const q=/\?/.test(tok),ex=/!/.test(tok),dots=/(\.\.\.|…)/.test(tok);
    const w=d.replace(/[^a-z]/g,'');
    if(!w)continue;
    if(/^(kh|h)e+|^hi+s+|^phi+/.test(w)){ev.push({k:'hiss',dur:0.6+0.12*Math.min(6,(w.match(/e|s/g)||[]).length)});continue;}
    if(/^gr*u+r*$|^gr+$|^grr+r*$|^gru+/.test(w)){ev.push({k:'growl',dur:0.8+0.1*Math.min(6,(w.match(/u|r/g)||[]).length)});continue;}
    if(/^(m|b)?r+[ru]*p+$|^prr+/.test(w)){ev.push({k:'chirp'});continue;}
    if(/^r+u*r*$|^ru+|^pur+/.test(w)){ev.push({k:'purr',dur:0.9});continue;}
    if(/me+o+w*|meow|mi+a+o+|mao|nya+|ngao/.test(w)){
      const os=(w.match(/o+w*$|a+o*$/)||[''])[0].length;
      const extra=Math.max(0,os-1);
      ev.push({k:'meow',dur:Math.min(2.2,0.32+0.16*extra),q,ex:ex||loud,dots});continue;
    }
  }
  return ev;
}

function synthFromText(text,seed){
  const ev=parseMeoText(text);
  const rng=makeRng(seed||12345);
  let total=0.1;
  for(const e of ev){total+=(e.k==='chirp'?0.13:e.dur)+0.18;}
  const out=new Float32Array(Math.ceil((total+0.1)*SR));
  let pos=Math.floor(0.08*SR);
  for(const e of ev){
    let n=0;
    if(e.k==='meow'){
      let fs=600,fp=720,fe=650,amp=0.8;
      if(e.dur>=0.6){fs=560;fp=830;fe=640;}
      if(e.q){fs=520;fp=700;fe=980;}
      if(e.ex){fs=700;fp=980;fe=820;amp=1;}
      if(e.dots){fs=470;fp=430;fe=320;amp=0.7;}
      fs*=1+(rng()-0.5)*0.06;fp*=1+(rng()-0.5)*0.06;fe*=1+(rng()-0.5)*0.06;
      n=synthMeow(out,pos,e.dur,fs,fp,fe,amp,rng);
    }else if(e.k==='chirp'){n=synthMeow(out,pos,0.13,450,950,1020,0.8,rng);}
    else if(e.k==='purr'){n=synthPurr(out,pos,e.dur,0.9,rng);pos+=n;continue;}
    else if(e.k==='hiss'){n=synthHiss(out,pos,e.dur,0.9,rng);}
    else if(e.k==='growl'){n=synthGrowl(out,pos,e.dur,0.9,rng);}
    pos+=n+Math.floor((e.k==='chirp'?0.12:0.18)*SR);
  }
  let pk=0;for(let i=0;i<out.length;i++)pk=Math.max(pk,Math.abs(out[i]));
  if(pk>0)for(let i=0;i<out.length;i++)out[i]*=0.85/pk;
  return {samples:out,sampleRate:SR,events:ev};
}

// ---------- Analyzer ----------
function toAnalysisRate(samples,sr){
  const factor=Math.max(1,Math.round(sr/11025));
  const n=Math.floor(samples.length/factor);
  const y=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;for(let j=0;j<factor;j++)s+=samples[i*factor+j];y[i]=s/factor;}
  // remove DC
  let m=0;for(let i=0;i<n;i++)m+=y[i];m/=n||1;for(let i=0;i<n;i++)y[i]-=m;
  return {x:y,sr:sr/factor};
}
function median(a){if(!a.length)return 0;const b=[...a].sort((p,q)=>p-q);const h=b.length>>1;return b.length%2?b[h]:(b[h-1]+b[h])/2;}

function analyze(samples,srIn){
  const {x,sr}=toAnalysisRate(samples,srIn);
  const N=Math.round(0.04*sr),hop=Math.round(0.01*sr);
  const frames=[];
  let peak=0;
  for(let s=0;s+N<=x.length;s+=hop){
    let e=0,z=0;
    for(let i=0;i<N;i++){e+=x[s+i]*x[s+i];if(i&&((x[s+i]>=0)!==(x[s+i-1]>=0)))z++;}
    const rms=Math.sqrt(e/N);peak=Math.max(peak,rms);
    frames.push({t:s/sr,rms,zcr:z/N,f0:0,clar:0,active:false});
  }
  // noise floor: 20th percentile
  const sorted=frames.map(f=>f.rms).sort((a,b)=>a-b);
  const floor=sorted[Math.floor(sorted.length*0.2)]||0;
  const thr=Math.max(0.008,floor*2.5,peak*0.12);
  for(const f of frames)f.active=f.rms>thr;
  // pitch on active frames
  const minL=Math.floor(sr/1600),maxL=Math.ceil(sr/70);
  const r=new Float32Array(maxL+2);
  for(const f of frames){
    if(!f.active)continue;
    const s=Math.round(f.t*sr);
    for(let L=minL;L<=maxL;L++){
      let a=0,b=0,c=0;const M=N-L;
      for(let i=0;i<M;i++){const u=x[s+i],v=x[s+i+L];a+=u*v;b+=u*u;c+=v*v;}
      r[L]=a/(Math.sqrt(b*c)+1e-12);
    }
    let L0=-1;for(let L=minL;L<=maxL;L++){if(r[L]<0){L0=L;break;}}
    if(L0<0)continue;
    let gmax=0;const peaks=[];
    for(let L=L0+1;L<maxL;L++){if(r[L]>r[L-1]&&r[L]>=r[L+1]){peaks.push(L);gmax=Math.max(gmax,r[L]);}}
    if(!peaks.length)continue;
    const pL=peaks.find(L=>r[L]>=0.9*gmax);
    const a=r[pL-1],b=r[pL],c=r[pL+1];const den=a-2*b+c;
    const off=den?0.5*(a-c)/den:0;
    f.clar=b;if(b>0.55)f.f0=sr/(pL+off);
  }
  // spectral centroid / rolloff on active frames (512-pt FFT, Hann window)
  const cents=[],rolls=[];
  {
    const NF=512,re=new Float64Array(NF),im=new Float64Array(NF);
    const win=new Float64Array(N);for(let i=0;i<N;i++)win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1));
    let k=0;
    for(const f of frames){
      if(!f.active)continue; if((k++)%2)continue; // every other active frame is enough
      const s=Math.round(f.t*sr);re.fill(0);im.fill(0);
      for(let i=0;i<N&&i<NF;i++)re[i]=x[s+i]*win[i];
      fft(re,im);
      let tot=0,wsum=0;const mag=new Float64Array(NF/2);
      for(let b=1;b<NF/2;b++){const m=Math.hypot(re[b],im[b]);mag[b]=m;tot+=m;wsum+=m*b*sr/NF;}
      if(tot<=0)continue;
      cents.push(wsum/tot);
      let acc=0;for(let b=1;b<NF/2;b++){acc+=mag[b];if(acc>=0.85*tot){rolls.push(b*sr/NF);break;}}
    }
  }
  // segments (merge gaps <80ms, drop <50ms)
  const segs=[];let cur=null,gap=0;
  frames.forEach((f,i)=>{
    if(f.active){if(cur&&gap*0.01<0.08){cur.end=i;}else{cur={start:i,end:i};segs.push(cur);}gap=0;}
    else if(cur){gap++;}
  });
  const S=segs.map(g=>({start:g.start,end:g.end,dur:(g.end-g.start+1)*0.01})).filter(g=>g.dur>=0.05);
  const actFrames=frames.filter(f=>f.active);
  const voiced=actFrames.filter(f=>f.f0>0);
  const activeDur=S.reduce((a,g)=>a+g.dur,0);
  const voicedRatio=actFrames.length?voiced.length/actFrames.length:0;
  const zcr=actFrames.length?median(actFrames.map(f=>f.zcr)):0;
  const pitch=median(voiced.map(f=>f.f0));
  let longest=S.reduce((a,g)=>(!a||g.dur>a.dur)?g:a,null);
  let trend='ngang',trendRatio=1;
  const vf=voiced.map(f=>f.f0).sort((a,b)=>a-b);
  const p10=vf.length?vf[Math.floor(vf.length*0.1)]:0,p90=vf.length?vf[Math.floor(vf.length*0.9)]:0;
  const rmsA=actFrames.map(f=>f.rms);const rmsMean=rmsA.reduce((a,b)=>a+b,0)/(rmsA.length||1);
  const rmsCV=rmsA.length?Math.sqrt(rmsA.reduce((a,b)=>a+(b-rmsMean)*(b-rmsMean),0)/rmsA.length)/(rmsMean||1):0;
  if(longest){
    const fs=frames.slice(longest.start,longest.end+1).filter(f=>f.f0>0).map(f=>f.f0);
    if(fs.length>=6){
      const k=Math.floor(fs.length/3);
      const a=median(fs.slice(0,k)),m=median(fs.slice(k,2*k)),c=median(fs.slice(2*k));
      trendRatio=a>0?c/a:1;
      if(c>a*1.12)trend='len';else if(c<a*0.88)trend='xuong';else if(m>Math.max(a,c)*1.1)trend='vom';
    }
  }
  const syl=S.length;
  const meanSeg=syl?activeDur/syl:0;
  return {frames,segs:S,activeDur,voicedRatio,zcr,pitch,trend,trendRatio,syl,meanSeg,longest:longest?longest.dur:0,
    totalDur:x.length/sr,thr,pitchLo:p10,pitchHi:p90,centroid:median(cents),rolloff:median(rolls),rmsCV};
}

function classify(F){
  if(F.activeDur<0.08)return {intent:'im',conf:0};
  const clamp=v=>Math.max(52,Math.min(94,Math.round(v)));
  if(F.zcr>0.18&&F.voicedRatio<0.45)return {intent:'khe',conf:clamp(60+(F.zcr-0.18)*120+(0.45-F.voicedRatio)*40)};
  if(F.voicedRatio<0.4&&F.activeDur>0.5)return {intent:'vui',conf:clamp(62+(0.4-F.voicedRatio)*60+Math.min(2,F.activeDur)*6)};
  if(F.pitch>0&&F.pitch<230)return {intent:'gu',conf:clamp(65+(230-F.pitch)*0.25)};
  if(F.syl>=2&&F.meanSeg<0.2)return {intent:'phankhich',conf:clamp(60+F.syl*5)};
  if(F.syl>=3)return {intent:'goi',conf:clamp(58+F.syl*6)};
  if(F.longest>=0.6){
    if((F.trend==='xuong'&&F.pitch<560)||F.pitch<470)return {intent:'than',conf:clamp(60+(560-F.pitch)*0.15)};
    return {intent:'doi',conf:clamp(62+F.longest*10+(F.trend==='len'?8:0))};
  }
  return {intent:'chao',conf:clamp(70-F.longest*20+(F.syl===1?8:0))};
}

function fft(re,im){
  const n=re.length;
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for(let len=2;len<=n;len<<=1){
    const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);
    for(let i=0;i<n;i+=len){let cr=1,ci=0;
      for(let j=0;j<len/2;j++){
        const ar=re[i+j],ai=im[i+j],br=re[i+j+len/2]*cr-im[i+j+len/2]*ci,bi=re[i+j+len/2]*ci+im[i+j+len/2]*cr;
        re[i+j]=ar+br;im[i+j]=ai+bi;re[i+j+len/2]=ar-br;im[i+j+len/2]=ai-bi;
        const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t;}}
  }
}

// 12-dimension description of one vocalisation, used by the k-NN models.
const FEATURE_NAMES=['logLongest','logActive','syllables','meanSeg','voicedRatio','noisiness','logPitch','pitchSpread','pitchTrend','centroidK','rolloffK','loudnessVar'];
function featureVector(F){
  const lg=v=>Math.log(Math.max(v,1e-3));
  return [
    lg(F.longest+0.01), lg(F.activeDur+0.01), Math.min(F.syl,12), Math.min(F.meanSeg,3), F.voicedRatio, F.zcr,
    lg(F.pitch>0?F.pitch:60), (F.pitchHi>0&&F.pitchLo>0)?Math.log(F.pitchHi/F.pitchLo):0, Math.log(Math.max(0.2,Math.min(5,F.trendRatio||1))),
    (F.centroid||0)/1000, (F.rolloff||0)/1000, Math.min(F.rmsCV||0,3)
  ].map(v=>Number.isFinite(v)?+v.toFixed(4):0);
}
// Compact, storable summary (what goes to the server; no raw audio).
function summarize(F){
  const r=(v,d)=>+(v||0).toFixed(d);
  return {pitch:Math.round(F.pitch||0),pitchLo:Math.round(F.pitchLo||0),pitchHi:Math.round(F.pitchHi||0),trend:F.trend,syl:F.syl,
    longest:r(F.longest,2),activeDur:r(F.activeDur,2),voicedRatio:r(F.voicedRatio,2),zcr:r(F.zcr,3),centroid:Math.round(F.centroid||0),
    rolloff:Math.round(F.rolloff||0),rmsCV:r(F.rmsCV,2),vec:featureVector(F)};
}

// Distance-weighted k-NN over standardised vectors.
// samples: [{vec:[], label:'doi_an', w:1}]
function buildModel(samples){
  const S=samples.filter(s=>s.vec&&s.vec.length===FEATURE_NAMES.length&&s.label);
  const d=FEATURE_NAMES.length,mean=new Array(d).fill(0),std=new Array(d).fill(0);
  if(!S.length)return null;
  for(const s of S)for(let i=0;i<d;i++)mean[i]+=s.vec[i]/S.length;
  for(const s of S)for(let i=0;i<d;i++)std[i]+=(s.vec[i]-mean[i])**2/S.length;
  for(let i=0;i<d;i++)std[i]=Math.sqrt(std[i])||1;
  const pts=S.map(s=>({z:s.vec.map((v,i)=>(v-mean[i])/std[i]),label:s.label,w:s.w==null?1:s.w}));
  const labels=[...new Set(pts.map(p=>p.label))];
  return {mean,std,pts,labels,n:pts.length};
}
function predict(model,vec,opts){
  if(!model||!model.pts.length)return null;
  const skip=opts&&opts.skip;
  const z=vec.map((v,i)=>(v-model.mean[i])/model.std[i]);
  const ds=[];
  model.pts.forEach((p,idx)=>{if(idx===skip)return;let s=0;for(let i=0;i<z.length;i++)s+=(z[i]-p.z[i])**2;ds.push({d:Math.sqrt(s),p});});
  ds.sort((a,b)=>a.d-b.d);
  const k=Math.min(ds.length,Math.max(3,Math.round(Math.sqrt(ds.length))));
  const votes={};let tot=0;
  for(const {d,p} of ds.slice(0,k)){const w=p.w/(d+0.25);votes[p.label]=(votes[p.label]||0)+w;tot+=w;}
  const ranked=Object.entries(votes).sort((a,b)=>b[1]-a[1]);
  if(!ranked.length)return null;
  return {label:ranked[0][0],conf:Math.round(100*ranked[0][1]/tot),ranked:ranked.map(([l,v])=>({label:l,p:Math.round(100*v/tot)})),nearest:ds[0].d};
}
// Leave-one-out accuracy: honest estimate of how often the personal model is right.
function looAccuracy(model){
  if(!model||model.n<4)return null;
  let ok=0;
  model.pts.forEach((p,i)=>{const r=predict(model,p.z.map((v,j)=>v*model.std[j]+model.mean[j]),{skip:i});if(r&&r.label===p.label)ok++;});
  return Math.round(100*ok/model.n);
}

function encodeWav(samples,srIn,srOut){
  srOut=srOut||16000;const ratio=srIn/srOut;const n=Math.floor(samples.length/ratio);
  const buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
  const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,srOut,true);v.setUint32(28,srOut*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const x=Math.max(-1,Math.min(1,samples[Math.floor(i*ratio)]||0));v.setInt16(44+i*2,x<0?x*0x8000:x*0x7fff,true);}
  return new Blob([buf],{type:'audio/wav'});
}

// Find separate vocal "bouts" in a long recording (e.g. a video soundtrack) using energy only,
// so it stays fast on minutes of audio. Returns [{start,end}] in seconds plus a noisy flag
// for very long stretches (often music or people talking).
function findBouts(samples,sr,opts){
  opts=opts||{};
  const {x,sr:r}=toAnalysisRate(samples,sr);
  const N=Math.round(0.04*r),hop=Math.round(0.01*r),rms=[];
  for(let s=0;s+N<=x.length;s+=hop){let e=0;for(let i=0;i<N;i++)e+=x[s+i]*x[s+i];rms.push(Math.sqrt(e/N));}
  if(!rms.length)return [];
  const sorted=[...rms].sort((a,b)=>a-b);
  const floor=sorted[Math.floor(sorted.length*0.2)]||0,p99=sorted[Math.floor(sorted.length*0.99)]||0;
  const thr=Math.max(0.004,floor*4,p99*0.03);
  const maxGap=opts.maxGap||0.35,minDur=opts.minDur||0.12,pad=0.1,longDur=opts.longDur||8;
  const out=[];let cur=null;
  rms.forEach((v,i)=>{const t=i*0.01;if(v>thr){if(cur&&t-cur.end<=maxGap)cur.end=t+0.04;else{cur={start:t,end:t+0.04};out.push(cur);}}});
  const dur=x.length/r;
  return out.filter(b=>b.end-b.start>=minDur).map(b=>({start:Math.max(0,b.start-pad),end:Math.min(dur,b.end+pad),noisy:b.end-b.start>longDur}));
}

if(typeof module!=='undefined')module.exports={findBouts,synthFromText,analyze,classify,parseMeoText,SR,featureVector,summarize,buildModel,predict,looAccuracy,FEATURE_NAMES};
