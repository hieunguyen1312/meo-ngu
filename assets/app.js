(function(){
'use strict';
const $=id=>document.getElementById(id);
const API=(window.MEONGU_API||'').replace(/\/+$/,'');

// ---------------- vocabulary (keep in sync with worker/src/knowledge.js) ----------------
const CONTEXTS={
  doi_an:'Đói / chờ ăn', ra_vao:'Muốn ra hoặc vào cửa', choi:'Muốn chơi, muốn được chú ý', vuot:'Đang được vuốt ve, âu yếm',
  mot_minh:'Bị để một mình, ở chỗ lạ', chao:'Chào khi gặp người', kho_chiu:'Khó chịu, bị làm phiền, đau',
  san_moi:'Thấy con mồi, chim, côn trùng', meo_khac:'Gặp mèo khác', khac:'Khác'
};
const SHORT={doi_an:'Đói',ra_vao:'Ra/vào cửa',choi:'Muốn chơi',vuot:'Được vuốt',mot_minh:'Một mình',chao:'Chào',kho_chiu:'Khó chịu',san_moi:'Thấy mồi',meo_khac:'Gặp mèo khác',khac:'Khác'};
const OUTCOMES={calmed:'Dịu lại, hài lòng',continued:'Vẫn kêu tiếp',ignored:'Mình chưa đáp lại'};
const NOTES={
  doi_an:'Meo kéo dài, giọng cao hoặc đi lên: hay gặp khi đòi ăn. Nếu muốn bé bớt kêu, cho ăn theo giờ cố định và chỉ đáp lại khi bé yên.',
  ra_vao:'Bé muốn qua cửa. Mèo thích được tự quyết lãnh thổ; cân nhắc cửa riêng cho mèo hoặc mở cửa theo giờ để bé đỡ kêu.',
  choi:'Bé muốn được chú ý. Hai, ba phiên chơi kiểu săn mồi mỗi ngày, 10 đến 15 phút, thường giúp bé bớt kêu đòi.',
  vuot:'Âm thư giãn khi được âu yếm. Tiếng rừ rừ thường là dễ chịu, nhưng mèo cũng rừ khi đau, nên để ý dáng vẻ của bé.',
  mot_minh:'Tiếng gọi khi ở một mình hoặc ở chỗ lạ. Cho bé chỗ trốn, đồ có mùi quen và để bé tự khám phá từ từ.',
  chao:'Meo ngắn hoặc tiếng líu lo "mrrp": lời chào thân thiện. Chớp mắt chậm đáp lại là cách chào kiểu mèo.',
  kho_chiu:'Âm rè, gừ hoặc meo trầm đi xuống: bé đang khó chịu hoặc sợ. Cho bé khoảng cách, đừng ép bế. Nếu kéo dài, đưa bé đi khám.',
  san_moi:'Tiếng líu lo, lạch cạch khi nhìn chim hay côn trùng: bé đang phấn khích săn mồi. Một phiên chơi cần câu sẽ giúp bé xả năng lượng.',
  meo_khac:'Phản ứng với mèo khác. Nếu nhà nhiều mèo, chia tài nguyên: nhiều bát, nhiều khay cát, nhiều chỗ nằm cao.',
  khac:'Ngữ cảnh khác. Gắn nhãn thêm để app hiểu bé hơn.'
};
const PHRASES={
  doi_an:{nung:['Sen ơi con đói quá à, cho con pate đi mà.','Chén của con trống trơn rồi sen ơi.'],hoang:['Bát của trẫm đã thấy đáy. Ngươi định để trẫm chết đói sao?','Pate. Loại ngon. Ngay.'],dao:['Đồ ăn đâu? Tao chờ nãy giờ rồi đó.','Đổ thêm hạt vô, chén trống trơn rồi kìa.']},
  ra_vao:{nung:['Mở cửa cho con ra ban công chơi xíu thôi, năn nỉ đó!','Sen ơi cho con vô phòng với!'],hoang:['Mở cửa. Trẫm không nhắc lại.','Cánh cửa này dám cản đường trẫm?'],dao:['Mở cửa lẹ lên, tao có việc bên ngoài.','Cửa đóng chi vậy? Mở ra.']},
  choi:{nung:['Sen ơi nhìn con nè, chơi với con đi mà!','Bỏ điện thoại xuống chơi với con đi.'],hoang:['Ngươi đang bận gì mà quan trọng hơn trẫm?','Trẫm muốn được hầu hạ. Lại đây.'],dao:['Ê, mày nghe tao nói không đó?','Quay qua đây coi, tao kêu ba lần rồi.']},
  vuot:{nung:['Sướng quá sen ơi, gãi thêm chỗ cằm đi.','Cho con nằm trong lòng sen thêm xíu nữa nha.'],hoang:['Được. Ngươi vuốt đúng chỗ. Tiếp tục.','Hôm nay trẫm hài lòng.'],dao:['Ờ, cũng được. Đừng có ngừng.','Hôm nay tao vui, tha cho mày đó.']},
  mot_minh:{nung:['Sen đâu rồi? Con sợ ở một mình lắm.','Chỗ này lạ quá, sen ơi con ở đây nè!'],hoang:['Kẻ hầu cận của trẫm đâu cả rồi?','Nơi này không xứng với trẫm. Đưa trẫm về.'],dao:['Ai đó trả lời coi, ở đây có ai không?','Chỗ quái gì đây?']},
  chao:{nung:['Sen về rồi hả? Con nhớ sen quá trời.','Chào sen buổi sáng, ôm con cái coi.'],hoang:['Trẫm thấy ngươi rồi. Có thể cúi chào.','Ồ, sen đó à.'],dao:['Ê, về rồi đó hả mày.','Ừ, chào. Có gì ăn không?']},
  kho_chiu:{nung:['Đừng mà, con không thích đâu, để con yên đi!','Con khó chịu lắm sen ơi.'],hoang:['Lui ra! Kẻ nào dám mạo phạm long thể?','Trẫm đang rất không vui.'],dao:['Lùi lại. Tao nói lần cuối.','Đụng vô là ăn móng đó.']},
  san_moi:{nung:['Sen ơi có con chim kìa, con muốn bắt nó!','Sen ơi con thấy con thằn lằn trên tường!'],hoang:['Có con chim ngoài cửa sổ. Trẫm muốn nó.','Trẫm đang đi săn. Giữ im lặng.'],dao:['Con thằn lằn kia, đứng yên đó cho tao.','Chim ơi xuống đây nói chuyện coi.']},
  meo_khac:{nung:['Con mèo nhà bên lại qua nữa rồi sen ơi!','Con không thích con mèo kia đâu.'],hoang:['Con mèo kia dám bén mảng tới hoàng cung?','Đây là lãnh thổ của trẫm.'],dao:['Khu này của tao. Đi chỗ khác.','Nhìn gì? Muốn thử không?']},
  khac:{nung:['Con đang muốn nói gì đó với sen á.'],hoang:['Trẫm có điều muốn phán.'],dao:['Tao có chuyện muốn nói.']}
};
const RULE_MAP={chao:'chao',doi:'doi_an',goi:'choi',than:'kho_chiu',vui:'vuot',khe:'kho_chiu',gu:'kho_chiu',phankhich:'san_moi'};
const TREND={len:'Đi lên',xuong:'Đi xuống',vom:'Vòm',ngang:'Ngang'};
const PRESETS=['meo','meooooo?','meo meo meo','meooo...','rừ rừ','khèèè','gừừừ','mrrp mrrp mrrp'];
// Feline Five, 10-item short form built from the adjectives in Litchfield et al. (2017). rev = reverse-scored.
const FF={
  neuroticism:{name:'Nhạy cảm, lo âu',hi:'Bé dễ căng thẳng. Giữ giờ giấc ổn định, cho bé chỗ trốn và chỗ cao, thay đổi gì cũng làm từ từ.',lo:'Bé điềm tĩnh, tự tin với thay đổi và người lạ.'},
  extraversion:{name:'Tò mò, năng động',hi:'Bé thích khám phá. Đồ chơi trí tuệ, giấu thức ăn và đổi đồ chơi luân phiên giúp bé không chán.',lo:'Bé thích nhịp sống chậm, ít cần kích thích mới.'},
  dominance:{name:'Áp đảo',hi:'Bé hay tranh giành. Nhà nhiều mèo nên có nhiều bát, nhiều khay cát (số mèo cộng một) và nhiều chỗ nằm.',lo:'Bé hoà thuận, ít tranh giành với mèo khác.'},
  impulsiveness:{name:'Bốc đồng',hi:'Bé khó đoán. Chơi đều đặn mỗi ngày để bé xả năng lượng, cất đồ dễ vỡ.',lo:'Bé có thói quen đều đặn, dễ đoán.'},
  agreeableness:{name:'Thân thiện',hi:'Bé thích gần người. Duy trì những lúc âu yếm và chơi cùng.',lo:'Bé cần không gian riêng. Để bé chủ động lại gần, đừng ép bế.'}
};
const FF_ITEMS=[
  {id:'n1',t:'neuroticism',q:'Bé hay lo lắng, căng thẳng, dễ giật mình.'},
  {id:'n2',t:'neuroticism',rev:1,q:'Bé tự tin, điềm tĩnh khi có người lạ hoặc thay đổi trong nhà.'},
  {id:'e1',t:'extraversion',q:'Bé tò mò, thích khám phá đồ vật và chỗ mới.'},
  {id:'e2',t:'extraversion',q:'Bé năng động, kiên trì, ví dụ tìm đủ cách mở tủ hay lấy đồ.'},
  {id:'d1',t:'dominance',q:'Bé hay giành đồ ăn, chỗ nằm, hoặc bắt nạt mèo khác.'},
  {id:'d2',t:'dominance',rev:1,q:'Bé hoà thuận, dễ nhường nhịn khi gặp mèo khác.'},
  {id:'i1',t:'impulsiveness',q:'Bé làm gì cũng bất chợt, khó đoán.'},
  {id:'i2',t:'impulsiveness',rev:1,q:'Thói quen hằng ngày của bé đều đặn, dễ đoán.'},
  {id:'a1',t:'agreeableness',q:'Bé âu yếm, thân thiện với người.'},
  {id:'a2',t:'agreeableness',rev:1,q:'Bé dễ cáu, hay cào hoặc cắn khi bị chạm vào.'}
];
const SUGGEST=['Bé hay kêu lúc nào nhất trong ngày?','Tính cách bé thế nào, mình nên chơi với bé ra sao?','Gần đây bé có gì thay đổi không?','Làm sao để bé bớt kêu đòi ăn?'];

// ---------------- storage ----------------
const LS={get(k,d){try{const v=localStorage.getItem('meongu.'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem('meongu.'+k,JSON.stringify(v));}catch(e){}}};
const rid=()=>{const a=new Uint8Array(12);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('');};
function newToken(){const a=new Uint8Array(24);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}

let token=LS.get('token',null);if(!token){token=newToken();LS.set('token',token);}
const D={cats:LS.get('cats',[]),active:LS.get('active',null),sounds:LS.get('sounds',{}),personality:LS.get('personality',{}),
  persona:LS.get('persona','nung'),shareAudio:LS.get('shareAudio',false),consent:LS.get('consent',null)};
function save(){LS.set('cats',D.cats);LS.set('active',D.active);LS.set('sounds',D.sounds);LS.set('personality',D.personality);LS.set('persona',D.persona);LS.set('shareAudio',D.shareAudio);LS.set('consent',D.consent);}
const CONSENT_V='2026-10-14';
const consented=()=>D.consent&&D.consent.v===CONSENT_V;
if(!D.cats.length){const c={id:rid(),name:'Mèo của tôi',sex:null,neutered:null,birth_year:null,breed:null,notes:null,synced:false};D.cats.push(c);D.active=c.id;save();}
if(!D.cats.find(c=>c.id===D.active))D.active=D.cats[0].id;
const cat=()=>D.cats.find(c=>c.id===D.active);
const soundsOf=id=>D.sounds[id]||(D.sounds[id]=[]);

// ---------------- server ----------------
let server={on:false,agent:false,audio:false};
async function api(path,opts){
  if(!API)throw Object.assign(new Error('offline'),{code:'offline'});
  opts=opts||{};
  const headers={'authorization':'Bearer '+token};
  let body=opts.body;
  if(body&&!(body instanceof Blob)){headers['content-type']='application/json';body=JSON.stringify(body);}
  if(body instanceof Blob)headers['content-type']=body.type;
  const r=await fetch(API+path,{method:opts.method||'GET',headers,body});
  let data=null;try{data=await r.json();}catch(e){}
  if(!r.ok)throw Object.assign(new Error((data&&data.message)||('Lỗi '+r.status)),{status:r.status,code:data&&data.error});
  return data;
}
function setSync(s,t){const el=$('sync');el.dataset.s=s;el.querySelector('span').textContent=t;}
async function syncAll(){
  if(!API||!consented()){server={on:false,agent:false,audio:false};setSync('off','Chỉ lưu trên máy');renderSettings();return;}
  setSync('','Đang đồng bộ…');
  try{
    const h=await api('/api/health');server={on:true,agent:!!h.agent,audio:!!h.audio};
    let me=await api('/api/me');
    if(!me.user.consent||me.user.consentVersion!==CONSENT_V){await api('/api/me',{method:'PATCH',body:{consent:true,consentVersion:CONSENT_V,shareModel:!!D.consent.shareModel}});me=await api('/api/me');}
    if(me.user){D.shareAudio=!!me.user.shareAudio;D.consent.shareModel=!!me.user.shareModel;}
    const remote=me.cats||[];
    for(const rc of remote){if(!D.cats.find(c=>c.id===rc.id)){D.cats.push({...rc,synced:true});}}
    for(const c of D.cats){
      if(!remote.find(r=>r.id===c.id)){await api('/api/cats',{method:'POST',body:{id:c.id,name:c.name,sex:c.sex,neutered:c.neutered==null?undefined:!!c.neutered,birthYear:c.birth_year,breed:c.breed,notes:c.notes}});}
      c.synced=true;
      // pull sounds recorded on other devices
      const rs=await api('/api/cats/'+c.id+'/sounds?limit=500');const local=soundsOf(c.id);
      for(const s of rs){if(!local.find(l=>l.id===s.id))local.push({id:s.id,createdAt:s.created_at,source:s.source,duration:s.duration,features:s.features,predicted:s.predicted,confidence:s.confidence,label:s.label,outcome:s.outcome,synced:true});}
      local.sort((a,b)=>a.createdAt-b.createdAt);
      await pushSounds(c.id);
      const p=D.personality[c.id];
      if(p&&!p.synced){await api('/api/cats/'+c.id+'/personality',{method:'PUT',body:{scores:p.scores,answers:p.answers}});p.synced=true;}
      else if(!p){const rp=await api('/api/cats/'+c.id+'/personality');if(rp)D.personality[c.id]={...rp,synced:true};}
    }
    save();renderAll();setSync('ok','Đã đồng bộ');
  }catch(e){setSync('err','Chưa kết nối được máy chủ');}
}
async function pushSounds(catId){
  if(!server.on)return;
  const list=soundsOf(catId).filter(s=>!s.synced);
  for(let i=0;i<list.length;i+=50){
    const chunk=list.slice(i,i+50);
    await api('/api/cats/'+catId+'/sounds',{method:'POST',body:chunk.map(s=>({id:s.id,createdAt:s.createdAt,source:s.source,duration:s.duration,features:s.features,predicted:s.predicted,confidence:s.confidence,label:s.label,outcome:s.outcome}))});
    chunk.forEach(s=>s.synced=true);
  }
  save();
}
async function pushOne(catId){try{await pushSounds(catId);if(server.on)setSync('ok','Đã đồng bộ');}catch(e){setSync('err','Chưa đồng bộ được, sẽ thử lại');}}

// ---------------- models ----------------
let baseModel=null,baseInfo=null;
fetch('base-model.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(j=>{if(j&&Array.isArray(j.samples)){baseModel=buildModel(j.samples);baseInfo=j;}}).catch(()=>{});
const outcomeW={calmed:1,ignored:0.8,continued:0.5};
function personalModel(catId){
  const S=soundsOf(catId).filter(s=>s.label&&s.label!=='khac'&&s.features&&s.features.vec).map(s=>({vec:s.features.vec,label:s.label,w:outcomeW[s.outcome]||0.8}));
  // Balance contexts so a frequent one (e.g. hunger) does not drown out rare ones; measured on CatMeows, see docs/BENCHMARK.md.
  const cnt={};S.forEach(s=>cnt[s.label]=(cnt[s.label]||0)+1);const nk=Object.keys(cnt).length||1;
  S.forEach(s=>{s.w*=S.length/(nk*cnt[s.label]);});
  const m=buildModel(S);
  return m&&m.n>=6&&m.labels.length>=2?m:{notReady:true,n:S.length,labels:m?m.labels:[]};
}
function guess(F,vec){
  const pm=personalModel(D.active);
  if(!pm.notReady){const r=predict(pm,vec);if(r)return {label:r.label,conf:Math.min(95,r.conf),src:`Mô hình riêng của bé ${cat().name} (${pm.n} mẫu)`};}
  if(baseModel){const r=predict(baseModel,vec);if(r)return {label:r.label,conf:Math.min(80,r.conf),src:`Mô hình chung (${baseModel.n} mẫu${baseInfo&&baseInfo.source?', '+baseInfo.source:''})`};}
  const R=classify(F);
  if(R.intent==='im')return {label:null,conf:0,src:'Không nghe rõ tiếng kêu'};
  return {label:RULE_MAP[R.intent]||'khac',conf:Math.min(70,R.conf),src:'Quy tắc âm học cơ bản. Gắn nhãn 6 lần trở lên để app học riêng bé.'};
}

// ---------------- current translation ----------------
const S={F:null,sum:null,audio:null,pred:null,idx:0,soundId:null,labelable:false,ctx:null,out:null,srcLabel:''};
function runAnalysis(samples,sr,srcLabel,opts){
  opts=opts||{};
  const F=analyze(samples,sr);const sum=summarize(F);
  S.F=F;S.sum=sum;S.audio={samples,sampleRate:sr};S.srcLabel=srcLabel;S.pred=guess(F,sum.vec);
  S.idx=Math.floor(Math.random()*4);S.labelable=!!opts.source&&!!S.pred.label;S.soundId=null;S.ctx=S.pred.label;S.out=null;
  if(S.labelable){
    const s={id:rid(),createdAt:Date.now(),source:opts.source,duration:+F.totalDur.toFixed(2),features:sum,predicted:S.pred.label,confidence:S.pred.conf,label:null,outcome:null,synced:false};
    soundsOf(D.active).push(s);S.soundId=s.id;save();pushOne(D.active);
    if(D.shareAudio&&server.audio)uploadAudio(s.id,samples,sr);
  }
  renderTranslation();drawChart();renderLog();
}
async function uploadAudio(id,samples,sr){
  try{await pushSounds(D.active);await api('/api/sounds/'+id+'/audio',{method:'PUT',body:encodeWav(samples,sr,16000)});}catch(e){}
}
function phrase(){if(!S.pred||!S.pred.label)return 'Mình chưa nghe rõ bé nói gì.';const l=PHRASES[S.pred.label][D.persona];return l[S.idx%l.length];}
function renderTranslation(){
  if(!S.F)return;
  $('src').textContent=S.srcLabel;
  $('intent').querySelector('span').textContent=S.pred.label?CONTEXTS[S.pred.label]:'Chưa nghe rõ';
  $('quote').textContent=phrase();
  $('modelSrc').textContent='Nguồn: '+S.pred.src;
  $('note').textContent=S.pred.label?NOTES[S.pred.label]:'Không tìm thấy tiếng kêu đủ to. Đưa máy lại gần bé, giữ yên lặng rồi thu lại.';
  $('confTxt').textContent=S.pred.label?S.pred.conf+'%':'—';
  $('confBar').style.width=(S.pred.label?S.pred.conf:0)+'%';
  document.querySelectorAll('#persona button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.p===D.persona)));
  const F=S.F,fmt=(v,d)=>v.toFixed(d).replace('.',',');
  $('r-dur').textContent=fmt(F.activeDur,2)+' s';$('r-syl').textContent=String(F.syl);
  $('r-pitch').textContent=F.pitch>0?Math.round(F.pitch)+' Hz':'—';$('r-trend').textContent=F.pitch>0?TREND[F.trend]:'—';
  $('r-voiced').textContent=Math.round(F.voicedRatio*100)+'%';$('r-noise').textContent=Math.round(Math.min(1,F.zcr/0.5)*100)+'%';
  $('labeler').hidden=!S.labelable;$('askThis').hidden=!S.labelable;
  if(S.labelable)renderLabeler();
}
function renderLabeler(){
  const mk=(box,dict,cur,onPick,short)=>{box.textContent='';for(const [k,v] of Object.entries(dict)){const b=document.createElement('button');b.type='button';b.className='chip ctx';b.textContent=short?(short[k]||v):v;b.title=v;b.setAttribute('aria-pressed',String(k===cur));b.onclick=()=>onPick(k);box.append(b);}};
  mk($('ctxChips'),CONTEXTS,S.ctx,k=>{S.ctx=k;$('savedNote').hidden=true;renderLabeler();},SHORT);
  mk($('outChips'),OUTCOMES,S.out,k=>{S.out=k;$('savedNote').hidden=true;renderLabeler();});
  $('saveLbl').disabled=!S.ctx;
}
$('saveLbl').onclick=()=>{
  const s=soundsOf(D.active).find(x=>x.id===S.soundId);if(!s)return;
  s.label=S.ctx;s.outcome=S.out;s.synced=false;save();
  $('savedNote').hidden=false;pushOne(D.active);renderBrain();renderLog();
};

// ---------------- chart ----------------
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function drawChart(){
  const cv=$('chart');const F=S.F;if(!F||!cv.clientWidth)return;
  const dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=cv.clientHeight;
  cv.width=W*dpr;cv.height=H*dpr;const g=cv.getContext('2d');g.scale(dpr,dpr);
  const padL=40,padR=52,padT=12,padB=26;const iw=W-padL-padR,ih=H-padT-padB;const T=Math.max(F.totalDur,0.5);
  const muted=css('--muted'),line=css('--line'),ginger=css('--ginger'),teal=css('--teal'),sunken=css('--sunken');
  g.clearRect(0,0,W,H);g.font='11px '+css('--f-mono');
  g.fillStyle=sunken;
  for(const s of F.segs){const x0=padL+(F.frames[s.start].t/T)*iw,x1=padL+((F.frames[s.end].t+0.04)/T)*iw;g.fillRect(x0,padT,Math.max(2,x1-x0),ih);}
  const lo=Math.log(70),hi=Math.log(1600);const py=f=>padT+ih-(Math.log(f)-lo)/(hi-lo)*ih;
  g.strokeStyle=line;g.lineWidth=1;g.fillStyle=muted;g.textAlign='left';g.textBaseline='middle';
  for(const f of [100,200,500,1000]){const y=Math.round(py(f))+.5;g.beginPath();g.moveTo(padL,y);g.lineTo(padL+iw,y);g.stroke();g.fillText(f+' Hz',padL+iw+6,y);}
  g.textAlign='center';g.textBaseline='top';const step=T>12?4:T>6?2:T>2.5?1:0.5;
  for(let t=0;t<=T+1e-6;t+=step){const x=padL+(t/T)*iw;g.fillText(String(+t.toFixed(1)).replace('.',',')+'s',x,padT+ih+8);}
  let pk=0;for(const f of F.frames)pk=Math.max(pk,f.rms);pk=pk||1;
  g.fillStyle=ginger;g.globalAlpha=0.55;const bw=Math.max(1,iw/(T/0.01)*0.9);
  for(const f of F.frames){const h=(f.rms/pk)*ih*0.9;const x=padL+(f.t/T)*iw;g.fillRect(x,padT+ih-h,bw,h);}
  g.globalAlpha=1;g.fillStyle=teal;
  for(const f of F.frames){if(f.f0>0){const x=padL+((f.t+0.02)/T)*iw;g.beginPath();g.arc(x,py(f.f0),2.4,0,Math.PI*2);g.fill();}}
  g.strokeStyle=muted;g.beginPath();g.moveTo(padL,padT+ih+.5);g.lineTo(padL+iw,padT+ih+.5);g.stroke();
  g.save();g.translate(12,padT+ih/2);g.rotate(-Math.PI/2);g.textAlign='center';g.textBaseline='middle';g.fillStyle=muted;g.fillText('Độ lớn',0,0);g.restore();
}

// ---------------- audio playback ----------------
let actx=null,playing=null;
function getCtx(){if(!actx){const C=window.AudioContext||window.webkitAudioContext;actx=new C();}if(actx.state==='suspended')actx.resume();return actx;}
function play(){
  if(!S.audio)return;
  try{const c=getCtx();if(playing){try{playing.stop();}catch(e){}}
    const b=c.createBuffer(1,S.audio.samples.length,S.audio.sampleRate);b.getChannelData(0).set(S.audio.samples);
    const src=c.createBufferSource();src.buffer=b;src.connect(c.destination);src.start();playing=src;}catch(e){}
}

// ---------------- recorder ----------------
const MAX=8;let rec=null,liveLevels=[];const live=$('live');
function liveDraw(){
  const dpr=window.devicePixelRatio||1,W=live.clientWidth,Hh=live.clientHeight;if(!W)return;
  if(live.width!==W*dpr){live.width=W*dpr;live.height=Hh*dpr;}
  const g=live.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,Hh);
  const lv=rec?rec.levels:liveLevels;const n=Math.floor(W/4);const start=Math.max(0,lv.length-n);
  g.fillStyle=rec?css('--rec'):css('--ginger');
  for(let i=start;i<lv.length;i++){const v=Math.min(1,lv[i]*4);const h=Math.max(2,v*(Hh-8));g.fillRect((i-start)*4+1,(Hh-h)/2,2,h);}
  if(!rec&&!liveLevels.length){g.fillStyle=css('--line');g.fillRect(0,Hh/2-0.5,W,1);}
}
function setRecUI(on){
  $('recBtn').classList.toggle('on',on);$('icoMic').hidden=on;$('icoStop').hidden=!on;
  $('recBtn').setAttribute('aria-label',on?'Dừng thu':'Bắt đầu thu âm');
  $('recState').textContent=on?'Đang nghe… bấm để dừng':'Bấm để thu tiếng mèo';
  if(!on)$('ring').style.transform='scale(1)';
}
function micError(err){
  const m=$('micMsg');m.hidden=false;const name=err&&err.name,msg=(err&&err.message)||'';let t,b;
  let framed=false;try{framed=window.self!==window.top;}catch(e){framed=true;}
  if(framed&&(name==='NotAllowedError'||name==='SecurityError'||!name)){b='Khung xem trước này không cho dùng micro.';t='Mở trang trực tiếp bằng Chrome, Edge hoặc Safari rồi thử lại.';}
  else if(name==='NotAllowedError'&&/system/i.test(msg)){b='Hệ điều hành đang chặn micro của trình duyệt.';t='Windows: Settings > Privacy & security > Microphone, bật quyền cho ứng dụng. iPhone: Cài đặt > Safari > Micrô, chọn Cho phép.';}
  else if(name==='NotAllowedError'&&/dismiss/i.test(msg)){b='Bạn chưa bấm Cho phép.';t='Bấm nút thu lần nữa và chọn Cho phép ở ô hiện ra cạnh thanh địa chỉ. Nếu không thấy, bấm biểu tượng micro bên trái địa chỉ trang.';}
  else if(name==='NotAllowedError'||name==='SecurityError'){b='Micro đang bị chặn cho trang này.';t='Bấm biểu tượng bên trái thanh địa chỉ, đổi Micro thành Cho phép, rồi tải lại trang.';}
  else if(name==='NotFoundError'){b='Không tìm thấy micro.';t='Cắm tai nghe có micro hoặc dùng điện thoại, rồi thử lại.';}
  else {b='Trình duyệt này chưa cho dùng micro.';t='Hãy mở trang bằng Chrome, Edge hoặc Safari bản mới.';}
  m.textContent='';const bb=document.createElement('b');bb.textContent=b;m.append(bb,document.createTextNode(' '+t));
}
async function startRec(){
  $('micMsg').hidden=true;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){micError(null);return;}
  try{getCtx();}catch(e){}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});}catch(e){micError(e);return;}
  const c=getCtx();const srcN=c.createMediaStreamSource(stream);const proc=c.createScriptProcessor(2048,1,1);const mute=c.createGain();mute.gain.value=0;
  rec={stream,srcN,proc,mute,chunks:[],levels:[],len:0,sr:c.sampleRate};
  proc.onaudioprocess=e=>{
    if(!rec)return;const d=e.inputBuffer.getChannelData(0);rec.chunks.push(new Float32Array(d));rec.len+=d.length;
    const k=Math.max(1,Math.floor(d.length/4));
    for(let j=0;j<4;j++){let s=0;for(let i=j*k;i<(j+1)*k&&i<d.length;i++)s+=d[i]*d[i];rec.levels.push(Math.sqrt(s/k));}
    if(rec.len/rec.sr>=MAX)stopRec();
  };
  srcN.connect(proc);proc.connect(mute);mute.connect(c.destination);setRecUI(true);tick();
}
function tick(){
  if(!rec)return;const sec=Math.min(MAX,rec.len/rec.sr);
  $('recTime').textContent=sec.toFixed(1).replace('.',',')+' / 8,0 giây';
  const lv=rec.levels.length?rec.levels[rec.levels.length-1]:0;$('ring').style.transform='scale('+(1+Math.min(0.35,lv*2.5))+')';
  liveDraw();requestAnimationFrame(tick);
}
function stopRec(){
  if(!rec)return;const r=rec;rec=null;
  try{r.proc.disconnect();r.srcN.disconnect();r.mute.disconnect();}catch(e){}
  r.stream.getTracks().forEach(t=>t.stop());setRecUI(false);
  const out=new Float32Array(r.len);let o=0;for(const ch of r.chunks){out.set(ch,o);o+=ch.length;}
  $('recState').textContent='Đang phân tích…';
  setTimeout(()=>{
    const d=new Date();
    runAnalysis(out,r.sr,'Thu âm lúc '+d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),{source:'mic'});
    $('recState').textContent='Bấm để thu lần nữa';liveLevels=r.levels;liveDraw();
  },30);
}
$('recBtn').onclick=()=>{rec?stopRec():startRec();};
$('fileIn').onchange=async e=>{
  const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  $('micMsg').hidden=true;$('recState').textContent='Đang đọc file…';
  try{
    const buf=await f.arrayBuffer();const c=getCtx();
    const ab=await new Promise((res,rej)=>{const p=c.decodeAudioData(buf,res,rej);if(p&&p.then)p.then(res,rej);});
    const n=Math.min(ab.length,Math.floor(ab.sampleRate*30));const ch=ab.getChannelData(0).slice(0,n);
    runAnalysis(ch,ab.sampleRate,'File: '+f.name,{source:'upload'});$('recState').textContent='Bấm để thu tiếng mèo';
  }catch(err){$('recState').textContent='Bấm để thu tiếng mèo';const m=$('micMsg');m.hidden=false;m.textContent='';const b=document.createElement('b');b.textContent='Không đọc được file này.';m.append(b,document.createTextNode(' Hãy thử file .wav, .mp3, .m4a hoặc video .mp4.'));}
};

// ---------------- presets ----------------
PRESETS.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=p;b.onclick=()=>fromText(p);$('chips').append(b);});
function fromText(t){const s=synthFromText(t,(Math.random()*1e9)|0);
  if(!s.events.length){runAnalysis(new Float32Array(SR),SR,'Gõ: '+t);return;}
  runAnalysis(s.samples,s.sampleRate,'Ví dụ gõ tay: '+t);play();}
$('typer').addEventListener('submit',e=>{e.preventDefault();const t=$('txt').value.trim();if(t)fromText(t);});
$('again').onclick=()=>{if(!S.pred)return;S.idx++;renderTranslation();};
$('replay').onclick=play;
document.querySelectorAll('#persona button').forEach(b=>b.onclick=()=>{D.persona=b.dataset.p;save();renderTranslation();});
$('askThis').onclick=()=>{selectTab('chat');$('chatIn').value='Bé vừa kêu như vậy là muốn gì? Mình nên đáp lại thế nào?';$('chatIn').focus();};

// ---------------- cats ----------------
function renderCats(){
  const sel=$('catSel');sel.textContent='';
  for(const c of D.cats){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;o.selected=c.id===D.active;sel.append(o);}
  document.querySelectorAll('.catname').forEach(e=>e.textContent=cat().name);
}
$('catSel').onchange=e=>{D.active=e.target.value;save();chatLoaded=null;renderAll();};
let dlgMode=null;
function openDlg(mode){
  dlgMode=mode;const c=cat();$('dlgErr').hidden=true;
  const isTok=mode==='token';
  ['f-name','f-sex','f-neu','f-year','f-breed','f-notes'].forEach(id=>$(id).closest('.field').hidden=isTok);
  document.querySelectorAll('#dlgForm .row2').forEach(r=>r.hidden=isTok);
  $('f-tokenWrap').hidden=!isTok;$('f-name').required=!isTok;
  $('dlgTitle').textContent=mode==='add'?'Thêm mèo':mode==='edit'?'Sửa thông tin bé':'Dùng mã từ máy khác';
  if(mode==='edit'){$('f-name').value=c.name||'';$('f-sex').value=c.sex||'';$('f-neu').value=c.neutered==null?'':String(+c.neutered);$('f-year').value=c.birth_year||'';$('f-breed').value=c.breed||'';$('f-notes').value=c.notes||'';}
  else if(mode==='add'){['f-name','f-year','f-breed','f-notes'].forEach(id=>$(id).value='');$('f-sex').value='';$('f-neu').value='';}
  else {$('f-token').value='';}
  $('dlg').hidden=false;setTimeout(()=>$(isTok?'f-token':'f-name').focus(),30);
}
$('dlgCancel').onclick=()=>{$('dlg').hidden=true;};
$('dlgForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(dlgMode==='token'){
    const t=$('f-token').value.trim();
    if(!/^[A-Za-z0-9_-]{32,128}$/.test(t)){$('dlgErr').hidden=false;$('dlgErr').textContent='Mã không đúng định dạng. Hãy dán đúng mã đã sao chép ở máy kia.';return;}
    token=t;LS.set('token',t);D.cats=[];D.sounds={};D.personality={};D.active=null;
    const c={id:rid(),name:'Mèo của tôi',synced:false};
    $('dlg').hidden=true;
    if(API){try{const me=await api('/api/me');if(me.cats&&me.cats.length){D.cats=me.cats.map(x=>({...x,synced:true}));D.active=D.cats[0].id;}}catch(err){}}
    if(!D.cats.length){D.cats=[c];D.active=c.id;}
    save();renderAll();syncAll();return;
  }
  const yr=parseInt($('f-year').value,10);
  const v={name:$('f-name').value.trim().slice(0,40),sex:$('f-sex').value||null,neutered:$('f-neu').value===''?null:$('f-neu').value==='1',
    birth_year:yr>1990&&yr<=new Date().getFullYear()?yr:null,breed:$('f-breed').value.trim()||null,notes:$('f-notes').value.trim()||null};
  if(!v.name){$('dlgErr').hidden=false;$('dlgErr').textContent='Bé cần có tên.';return;}
  if(dlgMode==='add'){const c={id:rid(),...v,synced:false};D.cats.push(c);D.active=c.id;}
  else Object.assign(cat(),v);
  save();$('dlg').hidden=true;renderAll();
  if(server.on){const c=cat();const body={name:c.name,sex:c.sex,neutered:c.neutered==null?undefined:!!c.neutered,birthYear:c.birth_year,breed:c.breed,notes:c.notes};
    try{if(dlgMode==='add')await api('/api/cats',{method:'POST',body:{id:c.id,...body}});else await api('/api/cats/'+c.id,{method:'PATCH',body});}catch(err){setSync('err','Chưa đồng bộ được hồ sơ');}}
});
$('addCat').onclick=()=>openDlg('add');
$('editCat').onclick=()=>openDlg('edit');

// confirm-in-page helper (the viewer may block confirm())
function armConfirm(btn,label,action){
  let armed=false,timer=null;const orig=btn.textContent;
  btn.onclick=async()=>{
    if(!armed){armed=true;btn.textContent=label;timer=setTimeout(()=>{armed=false;btn.textContent=orig;},4000);return;}
    clearTimeout(timer);armed=false;btn.textContent=orig;await action();
  };
}
armConfirm($('delCat'),'Bấm lần nữa để xoá',async()=>{
  const c=cat();
  if(server.on){try{await api('/api/cats/'+c.id,{method:'DELETE'});}catch(e){}}
  D.cats=D.cats.filter(x=>x.id!==c.id);delete D.sounds[c.id];delete D.personality[c.id];
  if(!D.cats.length)D.cats.push({id:rid(),name:'Mèo của tôi',synced:false});
  D.active=D.cats[0].id;save();chatLoaded=null;renderAll();
});
armConfirm($('wipeBtn'),'Bấm lần nữa: xoá hết, không khôi phục được',async()=>{
  if(server.on){try{await api('/api/me',{method:'DELETE'});}catch(e){}}
  try{Object.keys(localStorage).filter(k=>k.startsWith('meongu.')).forEach(k=>localStorage.removeItem(k));}catch(e){}
  location.reload();
});

// ---------------- brain tab ----------------
function renderBrain(){
  const all=soundsOf(D.active);const lab=all.filter(s=>s.label);
  const counts={};lab.forEach(s=>counts[s.label]=(counts[s.label]||0)+1);
  const pm=personalModel(D.active);
  $('b-n').textContent=String(lab.length);$('b-k').textContent=String(Object.keys(counts).length);
  const acc=pm.notReady?null:(pm.n>=10?looAccuracy(pm):null);
  $('b-acc').textContent=acc==null?'—':acc+'%';
  let hint;
  if(pm.notReady){const need=Math.max(0,6-pm.n);hint=need>0?`Gắn nhãn thêm ${need} tiếng kêu (ít nhất 2 ngữ cảnh khác nhau) để app bắt đầu học riêng bé ${cat().name}. Khoảng 3 mẫu cho mỗi ngữ cảnh là đủ để app đoán sát hơn rõ rệt.`:`Cần ít nhất 2 ngữ cảnh khác nhau. Lần tới khi bé kêu vì lý do khác, hãy gắn nhãn nhé.`;}
  else if(acc==null)hint=`Mô hình riêng đã chạy. Độ chính xác ước tính hiện sau 10 mẫu; hiện có ${pm.n}.`;
  else {const weak=Object.entries(counts).filter(([k,v])=>v<5&&k!=='khac').map(([k])=>SHORT[k]);
    hint=`Độ chính xác ước tính bằng cách thử đoán lại từng mẫu cũ khi giấu nhãn của nó.${weak.length?' Ngữ cảnh còn ít mẫu: '+weak.join(', ')+'.':''}`;}
  $('b-hint').textContent=hint;
  const rows=$('b-rows');rows.textContent='';const max=Math.max(1,...Object.values(counts));
  Object.keys(CONTEXTS).forEach(k=>{
    const n=counts[k]||0;if(!n&&k==='khac')return;
    const r=document.createElement('div');r.className='lblrow';
    const a=document.createElement('span');a.textContent=CONTEXTS[k];
    const bar=document.createElement('div');bar.className='bar';const sp=document.createElement('span');sp.style.width=(100*n/max)+'%';bar.append(sp);
    const b=document.createElement('b');b.textContent=String(n);r.append(a,bar,b);rows.append(r);
  });
}

// ---------------- personality tab ----------------
let quizAns={};
function renderPersona(){
  const p=D.personality[D.active];quizAns=p?{...p.answers}:{};
  const tr=$('traits');tr.textContent='';
  if(p&&p.scores){
    for(const [k,info] of Object.entries(FF)){
      const v=p.scores[k];if(v==null)continue;
      const d=document.createElement('div');d.className='trait';
      const top=document.createElement('div');top.className='trait-top';const n=document.createElement('span');n.textContent=info.name;const b=document.createElement('b');b.textContent=v+'/100';top.append(n,b);
      const bar=document.createElement('div');bar.className='bar';const sp=document.createElement('span');sp.style.width=v+'%';bar.append(sp);
      const t=document.createElement('p');t.textContent=v>=60?info.hi:v<=40?info.lo:'Ở mức trung bình.';
      d.append(top,bar,t);tr.append(d);
    }
  }
  const qz=$('quiz');qz.textContent='';
  FF_ITEMS.forEach(it=>{
    const q=document.createElement('div');q.className='q';const t=document.createElement('p');t.textContent=it.q;
    const sc=document.createElement('div');sc.className='scale';const l=document.createElement('small');l.textContent='Không đúng';sc.append(l);
    for(let i=1;i<=7;i++){const b=document.createElement('button');b.type='button';b.textContent=i;b.setAttribute('aria-label',it.q+' — '+i+' trên 7');b.setAttribute('aria-pressed',String(quizAns[it.id]===i));
      b.onclick=()=>{quizAns[it.id]=i;sc.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(+x.textContent===i)));$('saveQuiz').disabled=FF_ITEMS.some(x=>!quizAns[x.id]);$('quizNote').hidden=true;};sc.append(b);}
    const r=document.createElement('small');r.textContent='Rất đúng';sc.append(r);q.append(t,sc);qz.append(q);
  });
  $('saveQuiz').disabled=FF_ITEMS.some(x=>!quizAns[x.id]);
}
$('saveQuiz').onclick=async()=>{
  const sums={},cnt={};
  FF_ITEMS.forEach(it=>{const v=quizAns[it.id];const s=it.rev?8-v:v;sums[it.t]=(sums[it.t]||0)+s;cnt[it.t]=(cnt[it.t]||0)+1;});
  const scores={};for(const k of Object.keys(FF))scores[k]=Math.round(((sums[k]/cnt[k])-1)/6*100);
  D.personality[D.active]={scores,answers:{...quizAns},synced:false};save();renderPersona();$('quizNote').hidden=false;
  if(server.on){try{await api('/api/cats/'+D.active+'/personality',{method:'PUT',body:{scores,answers:quizAns}});D.personality[D.active].synced=true;save();}catch(e){}}
};

// ---------------- chat tab ----------------
let chatLoaded=null,chatBusy=false;
function addMsg(role,text,pending){const d=document.createElement('div');d.className='msg '+role+(pending?' pending':'');d.textContent=text;$('chatlog').append(d);$('chatlog').scrollTop=$('chatlog').scrollHeight;return d;}
async function renderChat(){
  const off=$('chatOff');const sug=$('suggest');sug.textContent='';
  SUGGEST.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='chip ctx';b.textContent=t;b.onclick=()=>{$('chatIn').value=t;$('chatIn').focus();};sug.append(b);});
  const can=server.on&&server.agent;
  off.hidden=can;$('chatSend').disabled=!can;$('chatIn').disabled=!can;
  if(!can){off.textContent='';const b=document.createElement('b');
    const local=!API||!consented();
    b.textContent=local?'Bạn đang dùng chế độ chỉ lưu trên máy.':!server.on?'Chưa kết nối được máy chủ.':'Máy chủ chưa bật trợ lý.';
    off.append(b,document.createTextNode(local?' Thu âm, gắn nhãn, học riêng từng bé và tính cách vẫn dùng bình thường. Muốn hỏi chuyên gia, vào Cài đặt và bật đồng bộ.':' Thử tải lại trang sau ít phút.'));
    $('chatlog').textContent='';return;}
  if(chatLoaded===D.active)return;
  chatLoaded=D.active;$('chatlog').textContent='';
  try{const ms=await api('/api/cats/'+D.active+'/messages');ms.forEach(m=>addMsg(m.role,m.content));
    if(!ms.length)addMsg('assistant',`Chào bạn, mình là chuyên gia hành vi của Mèo Ngữ. Bạn muốn hỏi gì về bé ${cat().name}? Mình sẽ xem dữ liệu tiếng kêu và tính cách của bé trước khi trả lời.`);}
  catch(e){addMsg('assistant','Chưa tải được lịch sử trò chuyện.');}
}
$('chatform').addEventListener('submit',async e=>{
  e.preventDefault();if(chatBusy)return;const t=$('chatIn').value.trim();if(!t)return;
  chatBusy=true;$('chatSend').disabled=true;$('chatIn').value='';addMsg('user',t);const p=addMsg('assistant','Đang xem dữ liệu của bé…',true);
  try{
    await pushSounds(D.active);
    const body={catId:D.active,message:t};
    if(S.labelable&&S.sum)body.lastSound={...S.sum,vec:undefined,appGuess:S.pred.label,confidence:S.pred.conf,ownerLabel:S.ctx,outcome:S.out};
    const r=await api('/api/agent',{method:'POST',body});
    p.classList.remove('pending');p.textContent=r.reply;
    $('chatQuota').textContent=`Còn ${r.callsLeft} lượt hỏi hôm nay.`+(r.savedObservations&&r.savedObservations.length?' Đã ghi nhớ: '+r.savedObservations.join('; '):'');
  }catch(err){p.classList.remove('pending');p.textContent=err.message||'Không gửi được câu hỏi.';}
  chatBusy=false;$('chatSend').disabled=false;
});
$('chatIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatform').requestSubmit();}});

// ---------------- log tab ----------------
function renderLog(){
  const list=soundsOf(D.active).slice(-60).reverse();const ol=$('hList');ol.textContent='';$('hEmpty').hidden=list.length>0;
  for(const s of list){
    const li=document.createElement('li');const d=new Date(s.createdAt);
    const a=document.createElement('span');a.className='h-src';a.textContent=d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
    const b=document.createElement('span');b.className='h-txt';
    b.textContent=(s.label?CONTEXTS[s.label]:'App đoán: '+(CONTEXTS[s.predicted]||'—'))+(s.outcome?' · '+OUTCOMES[s.outcome]:'')+(s.features&&s.features.pitch?' · '+s.features.pitch+' Hz':'');
    const c=document.createElement('span');c.className='h-int';c.textContent=s.label?(s.label===s.predicted?'Đoán đúng':'Đã gắn nhãn'):'Chưa gắn nhãn';
    li.append(a,b,c);ol.append(li);
  }
}

// ---------------- settings tab ----------------
function renderSettings(){
  $('tokenTxt').textContent=token;$('shareAudio').checked=!!D.shareAudio;
  $('shareAudio').disabled=!server.on;
  const on=consented();
  $('consentState').textContent=!API?'Bản này chưa nối máy chủ.':on?`Đang đồng bộ. Bạn đã đồng ý điều khoản phiên bản ${CONSENT_V}.`:'Đang ở chế độ chỉ lưu trên máy. Dữ liệu không rời khỏi trình duyệt này.';
  $('shareModel').checked=!!(on&&D.consent.shareModel);$('shareModel').disabled=!on||!server.on;
  $('openConsent').hidden=on||!API;
}
function openConsent(){$('c-agree').checked=false;$('c-model').checked=false;$('c-ok').disabled=true;$('consent').hidden=false;setTimeout(()=>$('c-agree').focus(),30);}
$('c-agree').onchange=e=>{$('c-ok').disabled=!e.target.checked;};
$('consentForm').addEventListener('submit',e=>{e.preventDefault();if(!$('c-agree').checked)return;
  D.consent={v:CONSENT_V,at:Date.now(),shareModel:$('c-model').checked};save();$('consent').hidden=true;syncAll();});
$('c-local').onclick=()=>{D.consent={v:'local',at:Date.now()};save();$('consent').hidden=true;syncAll();};
$('openConsent').onclick=openConsent;
$('shareModel').onchange=async e=>{if(!consented())return;D.consent.shareModel=e.target.checked;save();if(server.on){try{await api('/api/me',{method:'PATCH',body:{shareModel:D.consent.shareModel}});}catch(err){}}};
$('copyToken').onclick=async()=>{try{await navigator.clipboard.writeText(token);$('copyToken').textContent='Đã sao chép';}catch(e){const r=document.createRange();r.selectNodeContents($('tokenTxt'));const s=getSelection();s.removeAllRanges();s.addRange(r);$('copyToken').textContent='Đã chọn, bấm Ctrl+C';}setTimeout(()=>$('copyToken').textContent='Sao chép mã',2500);};
$('useToken').onclick=()=>openDlg('token');
$('shareAudio').onchange=async e=>{D.shareAudio=e.target.checked;save();if(server.on){try{await api('/api/me',{method:'PATCH',body:{shareAudio:D.shareAudio}});}catch(err){}}};
$('exportBtn').onclick=()=>{const o=$('exportOut');o.hidden=!o.hidden;o.textContent=JSON.stringify({cats:D.cats,sounds:D.sounds,personality:D.personality},null,1);};

// ---------------- tabs ----------------
const TABS=['analysis','brain','persona','chat','log','settings'];
function selectTab(t){
  TABS.forEach(x=>{$('tab-'+x).setAttribute('aria-selected',String(x===t));$('p-'+x).hidden=x!==t;});
  try{sessionStorage.setItem('meongu.tab',t);}catch(e){}
  if(t==='analysis')drawChart();if(t==='brain')renderBrain();if(t==='persona')renderPersona();if(t==='chat')renderChat();if(t==='log')renderLog();if(t==='settings')renderSettings();
}
TABS.forEach(t=>$('tab-'+t).onclick=()=>selectTab(t));
$('tabs').addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const cur=TABS.findIndex(t=>$('tab-'+t).getAttribute('aria-selected')==='true');const n=(cur+(e.key==='ArrowRight'?1:-1)+TABS.length)%TABS.length;selectTab(TABS[n]);$('tab-'+TABS[n]).focus();});

function renderAll(){
  renderCats();renderBrain();renderLog();renderSettings();
  const cur=TABS.find(t=>$('tab-'+t).getAttribute('aria-selected')==='true');
  if(cur==='persona')renderPersona();if(cur==='chat')renderChat();
  if(S.F){S.pred=guess(S.F,S.sum.vec);renderTranslation();}
}
window.addEventListener('resize',()=>{drawChart();if(!rec)liveDraw();});
const mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');if(mq&&mq.addEventListener)mq.addEventListener('change',()=>{drawChart();liveDraw();});

// ---------------- boot ----------------
renderAll();liveDraw();
let startTab='analysis';try{const h=(location.hash||'').slice(1);const st=sessionStorage.getItem('meongu.tab');if(TABS.includes(h))startTab=h;else if(TABS.includes(st))startTab=st;}catch(e){}
selectTab(startTab);
const ex=synthFromText('meooooo?',4242);runAnalysis(ex.samples,ex.sampleRate,'Ví dụ: meooooo?');
if(API&&(!D.consent||(D.consent.v!=='local'&&D.consent.v!==CONSENT_V)))openConsent();
syncAll();
})();
