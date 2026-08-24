// ponytail: IIFE keeps state local. Single storage key, single render path. No frameworks.

(function(){
'use strict';
var KEY='patchnotes.games.v1';
var STATUS_LIST=[
  {id:'Not Started', c:'#7aa2ff', sym:'◇'},
  {id:'In Progress', c:'#ffb648', sym:'▶'},
  {id:'Completed',   c:'#53e08c', sym:'★'},
  {id:'Dropped',     c:'#ff5d73', sym:'✕'}
];
var SLUG={'Not Started':'ns','In Progress':'ip','Completed':'cp','Dropped':'dr'};
var STATUS_MAP={}; STATUS_LIST.forEach(function(s){STATUS_MAP[s.id]=s;});
var PLATFORMS=['Nintendo Switch 2','Nintendo Switch','PlayStation 5','PlayStation 4','Xbox Series X|S','Xbox One','PC (Windows)','Steam Deck','Mobile','Retro / Emulation','Other'];
var ICON_CART='<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M3 1h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Zm2 3h6v4H5V4Zm1 7h4v2H6v-2Z"/></svg>';
var ICON_DL='<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 2v8m0 0 3-3M8 10 5 7M3 13h10"/></svg>';

function loadGames(){try{var v=JSON.parse(localStorage.getItem(KEY));return Array.isArray(v)?v:[];}catch(e){return [];}}
var games=loadGames();
var ui={status:'',platform:'All platforms',q:'',sort:'newest',editingId:null};
var toastTimer=null,saveTimer=null,lastRemoved=null;

function $(id){return document.getElementById(id);}
var chipsEl=$('chips'),listEl=$('list'),toolbar=$('toolbar'),emptyAll=$('emptyAll'),emptyFiltered=$('emptyFiltered'),
shownTxt=$('shownTxt'),pctEl=$('pct'),fillEl=$('fill'),dayBadge=$('dayBadge'),saveBadge=$('saveBadge'),saveTxt=$('saveTxt'),
formPanel=$('formPanel'),form=$('gameForm'),fTitle=$('fTitle'),titleErr=$('titleErr'),fPlatform=$('fPlatform'),
fNote=$('fNote'),noteCnt=$('noteCnt'),formTitle=$('formTitle'),formSub=$('formSub'),submitBtn=$('submitBtn'),cancelBtn=$('cancelBtn'),
searchIn=$('searchIn'),platFilter=$('platFilter'),sortSel=$('sortSel'),toastEl=$('toast'),toastMsg=$('toastMsg'),toastAct=$('toastAct'),
fab=$('fab'),scrim=$('scrim'),formClose=$('formClose');

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function fmtDate(t){var d=new Date(t),n=new Date(),o={month:'short',day:'numeric'};if(d.getFullYear()!==n.getFullYear())o.year='numeric';return d.toLocaleDateString(undefined,o);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(games));}catch(e){} pulseSave();}
function pulseSave(){saveTxt.textContent='SAVED ✓';saveBadge.classList.add('glow');clearTimeout(saveTimer);saveTimer=setTimeout(function(){saveTxt.textContent='LOCAL SAVE';saveBadge.classList.remove('glow');},900);}
function burst(x,y){var cols=['#ffd23f','#53e08c','#53c8ff','#ff5d73','#ffb648'];for(var k=0;k<16;k++){var p=document.createElement('i');p.className='px';var a=Math.random()*Math.PI*2,d=42+Math.random()*62;p.style.left=x+'px';p.style.top=y+'px';p.style.background=cols[k%cols.length];p.style.setProperty('--dx',Math.cos(a)*d+'px');p.style.setProperty('--dy',(Math.sin(a)*d-34)+'px');p.style.setProperty('--r',(Math.random()*360-180)+'deg');document.body.appendChild(p);(function(el){setTimeout(function(){el.remove();},800);})(p);}}

// ponytail: build once at init, no per-render DOM cost for static controls
(function buildChips(){
  var html='<button class="chip" data-status="" style="--c:var(--gold)" title="Show all"><span class="dot">●</span><b class="cnt" id="cntAll">0</b><span class="lbl">ALL</span></button>';
  STATUS_LIST.forEach(function(s){html+='<button class="chip" data-status="'+s.id+'" style="--c:'+s.c+'" title="Filter: '+s.id+'"><span class="dot">'+s.sym+'</span><b class="cnt" id="cnt-'+SLUG[s.id]+'">0</b><span class="lbl">'+s.id.toUpperCase()+'</span></button>';});
  chipsEl.innerHTML=html;
})();
(function buildSegStat(){
  var html='';STATUS_LIST.forEach(function(s,i){html+='<label style="--c:'+s.c+'"><input type="radio" name="stat" value="'+s.id+'"'+(i===0?' checked':'')+'><span>'+s.sym+' '+s.id.toUpperCase()+'</span></label>';});
  $('segStat').innerHTML=html;
})();
(function buildPlatforms(){
  fPlatform.innerHTML=PLATFORMS.map(function(p){return '<option>'+esc(p)+'</option>';}).join('');
  platFilter.innerHTML='<option>All platforms</option>'+PLATFORMS.map(function(p){return '<option>'+esc(p)+'</option>';}).join('');
})();

function renderHUD(){
  var counts={};STATUS_LIST.forEach(function(s){counts[s.id]=0;});
  games.forEach(function(g){if(counts[g.status]!=null)counts[g.status]++;});
  $('cntAll').textContent=games.length;
  STATUS_LIST.forEach(function(s){$('cnt-'+SLUG[s.id]).textContent=counts[s.id];});
  var chipBtns=chipsEl.querySelectorAll('.chip');
  chipBtns.forEach(function(ch){var st=ch.getAttribute('data-status');ch.classList.toggle('active',st===ui.status||(st===''&&ui.status===''));});
  var pct=games.length?Math.round(counts['Completed']/games.length*100):0;
  pctEl.textContent=pct+'%';fillEl.style.width=pct+'%';
  if(games.length){var first=Math.min.apply(null,games.map(function(g){return g.createdAt;}));dayBadge.textContent='DAY '+(Math.floor((Date.now()-first)/864e5)+1);}
  else dayBadge.textContent='DAY 1';
}
function applyFilters(arr){
  var q=ui.q.trim().toLowerCase();
  var out=arr.filter(function(g){
    if(ui.status&&g.status!==ui.status)return false;
    if(ui.platform!=='All platforms'&&g.platform!==ui.platform)return false;
    if(q&&(g.title.toLowerCase().indexOf(q)<0&&(g.note||'').toLowerCase().indexOf(q)<0))return false;
    return true;
  });
  if(ui.sort==='newest')out.sort(function(a,b){return b.createdAt-a.createdAt;});
  else if(ui.sort==='oldest')out.sort(function(a,b){return a.createdAt-b.createdAt;});
  else out.sort(function(a,b){return a.title.localeCompare(b.title);});
  return out;
}
function cardHTML(g,i,anim){
  var icon=g.format==='physical'?ICON_CART:ICON_DL;
  var note=g.note?'<p class="note"><span class="q">»</span>'+esc(g.note)+'</p>':'';
  var opts=STATUS_LIST.map(function(s){return '<option value="'+s.id+'"'+(s.id===g.status?' selected':'')+'>'+s.id+'</option>';}).join('');
  return '<article class="card'+(anim?' pop':'')+(ui.editingId===g.id?' editing':'')+'" data-id="'+g.id+'" style="--sc:'+STATUS_MAP[g.status].c+';'+(anim?('animation-delay:'+Math.min(i*45,360)+'ms'):'')+'">'
    +'<div class="c-top"><h3 class="c-title">'+esc(g.title)+'</h3><span class="fmt '+g.format+'">'+icon+'<span>'+g.format.toUpperCase()+'</span></span></div>'
    +'<div class="c-meta"><span class="plat">'+esc(g.platform)+'</span><span class="dotsep">·</span><span class="logged">LOGGED '+fmtDate(g.createdAt).toUpperCase()+'</span></div>'
    +note
    +'<div class="c-actions"><span class="stwrap"><select class="stsel" aria-label="Status for '+esc(g.title)+'">'+opts+'</select></span><span class="sp"></span>'
    +'<button type="button" class="mini edit" title="Edit entry">EDIT</button><button type="button" class="mini del" title="Delete entry">DEL</button></div></article>';
}
function renderList(anim){
  var total=games.length;
  if(total===0){toolbar.hidden=true;listEl.hidden=true;emptyFiltered.hidden=true;emptyAll.hidden=false;shownTxt.textContent='';return;}
  toolbar.hidden=false;emptyAll.hidden=true;
  var arr=applyFilters(games);
  if(arr.length===0){listEl.hidden=true;emptyFiltered.hidden=false;shownTxt.textContent='0 OF '+total+' TITLES';return;}
  listEl.hidden=false;emptyFiltered.hidden=true;
  shownTxt.textContent=(arr.length===total?total+' TITLE'+(total!==1?'S':''):arr.length+' OF '+total+' TITLES');
  listEl.innerHTML=arr.map(function(g,i){return cardHTML(g,i,anim);}).join('');
}
function renderAll(anim){renderHUD();renderList(anim);}
function doFlash(id){
  if(!id)return;
  var el=listEl.querySelector('[data-id="'+id+'"]');
  if(el){el.classList.add('flash');el.scrollIntoView({block:'nearest',behavior:'smooth'});setTimeout(function(){el.classList.remove('flash');},1400);}
}

function setRadio(name,val){var r=document.querySelector('input[name="'+name+'"][value="'+val+'"]');if(r)r.checked=true;}
function fmtVal(){var r=document.querySelector('input[name="fmt"]:checked');return r?r.value:'physical';}
function statVal(){var r=document.querySelector('input[name="stat"]:checked');return r?r.value:'Not Started';}
function updateNoteCnt(){noteCnt.textContent=fNote.value.length+'/140';}
function resetForm(){
  form.reset();setRadio('fmt','physical');setRadio('stat','Not Started');
  fTitle.value='';fNote.value='';updateNoteCnt();
  fTitle.classList.remove('err');titleErr.style.display='none';
  ui.editingId=null;
  formTitle.textContent='NEW ENTRY';formSub.textContent='Log a new title on your shelf';
  submitBtn.textContent='+ ADD TO SHELF';cancelBtn.hidden=true;
  formPanel.classList.remove('editing');
}
function openPanel(){formPanel.classList.add('open');scrim.classList.add('on');}
function closePanel(){formPanel.classList.remove('open');scrim.classList.remove('on');}
function startEdit(id){
  var g=null;for(var i=0;i<games.length;i++){if(games[i].id===id){g=games[i];break;}}
  if(!g)return;
  ui.editingId=id;
  fTitle.value=g.title;fPlatform.value=g.platform;fNote.value=g.note||'';updateNoteCnt();
  setRadio('fmt',g.format);setRadio('stat',g.status);
  fTitle.classList.remove('err');titleErr.style.display='none';
  formTitle.textContent='EDIT ENTRY';formSub.textContent='updating "'+g.title+'"';
  submitBtn.textContent='SAVE CHANGES';cancelBtn.hidden=false;
  formPanel.classList.add('editing');
  renderList(false);
  if(window.innerWidth<980){openPanel();setTimeout(function(){formPanel.scrollIntoView({behavior:'smooth',block:'end'});},80);}
  fTitle.focus();
}

form.addEventListener('submit',function(e){
  e.preventDefault();
  var title=fTitle.value.trim();
  if(!title){fTitle.classList.add('err');titleErr.style.display='block';fTitle.focus();return;}
  var data={title:title,platform:fPlatform.value,format:fmtVal(),status:statVal(),note:fNote.value.trim()};
  var flashId=null,became=false;
  if(ui.editingId){
    var g=null;for(var i=0;i<games.length;i++){if(games[i].id===ui.editingId){g=games[i];break;}}
    if(g){became=data.status==='Completed'&&g.status!=='Completed';
      g.title=data.title;g.platform=data.platform;g.format=data.format;g.status=data.status;g.note=data.note;g.updatedAt=Date.now();
      flashId=g.id;}
  }else{
    var ng={id:uid(),title:data.title,platform:data.platform,format:data.format,status:data.status,note:data.note,createdAt:Date.now(),updatedAt:Date.now()};
    games.unshift(ng);flashId=ng.id;became=data.status==='Completed';
  }
  persist();
  var r=submitBtn.getBoundingClientRect();
  resetForm();renderHUD();renderList(false);doFlash(flashId);
  if(became)burst(r.left+r.width/2,r.top);
  if(window.innerWidth<980)closePanel();
});
fTitle.addEventListener('input',function(){fTitle.classList.remove('err');titleErr.style.display='none';});
fNote.addEventListener('input',updateNoteCnt);
cancelBtn.addEventListener('click',function(){resetForm();renderList(false);});

listEl.addEventListener('click',function(e){
  var card=e.target.closest('.card');if(!card)return;
  var id=card.getAttribute('data-id');
  if(e.target.closest('.edit'))startEdit(id);
  else if(e.target.closest('.del'))removeGame(id);
});
listEl.addEventListener('change',function(e){
  var sel=e.target.closest('.stsel');if(!sel)return;
  var card=sel.closest('.card');var id=card.getAttribute('data-id');
  var g=null;for(var i=0;i<games.length;i++){if(games[i].id===id){g=games[i];break;}}
  if(!g)return;
  var nv=sel.value;if(nv===g.status)return;
  var old=g.status;g.status=nv;g.updatedAt=Date.now();persist();
  var cx=0,cy=0;
  if(nv==='Completed'&&old!=='Completed'){var r=sel.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;}
  renderHUD();renderList(false);
  if(cx)burst(cx,cy);
});
function removeGame(id){
  var idx=-1;for(var i=0;i<games.length;i++){if(games[i].id===id){idx=i;break;}}
  if(idx<0)return;
  if(ui.editingId===id)resetForm();
  var g=games.splice(idx,1)[0];
  persist();renderHUD();renderList(false);
  lastRemoved={g:g,idx:idx};
  showToast('Removed "'+g.title+'"',function(){
    games.splice(Math.min(lastRemoved.idx,games.length),0,lastRemoved.g);
    persist();renderHUD();renderList(false);doFlash(lastRemoved.g.id);
  });
}

function showToast(msg,fn){
  toastMsg.textContent=msg;
  toastAct.onclick=function(){fn();hideToast();};
  toastEl.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(hideToast,6000);
}
function hideToast(){toastEl.classList.remove('show');}

chipsEl.addEventListener('click',function(e){
  var chip=e.target.closest('.chip');if(!chip)return;
  var s=chip.getAttribute('data-status')||'';
  ui.status=(ui.status===s)?'':s;
  renderHUD();renderList(true);
});
searchIn.addEventListener('input',function(){ui.q=searchIn.value;renderList(false);});
platFilter.addEventListener('change',function(){ui.platform=platFilter.value;renderList(false);});
sortSel.addEventListener('change',function(){ui.sort=sortSel.value;renderList(false);});
$('clearBtn').addEventListener('click',function(){
  ui.status='';ui.platform='All platforms';ui.q='';
  searchIn.value='';platFilter.value='All platforms';
  renderHUD();renderList(true);
});

$('firstAddBtn').addEventListener('click',function(){
  if(window.innerWidth<980)openPanel();
  fTitle.focus();formPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('samplesBtn').addEventListener('click',function(){
  games=makeSamples();persist();renderAll(true);
});
$('wipeBtn').addEventListener('click',function(){
  if(confirm('Wipe your entire save file? This clears all '+games.length+' game(s) from this browser.')){
    games=[];try{localStorage.removeItem(KEY);}catch(e){}
    resetForm();ui.status='';ui.platform='All platforms';ui.q='';searchIn.value='';platFilter.value='All platforms';
    renderAll(false);
  }
});
fab.addEventListener('click',openPanel);
formClose.addEventListener('click',closePanel);
scrim.addEventListener('click',closePanel);
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    if(window.innerWidth<980&&formPanel.classList.contains('open')){closePanel();return;}
    if(ui.editingId){resetForm();renderList(false);}
  }
});

function makeSamples(){
  function d(n){return Date.now()-n*86400000;}
  return [
    {id:uid(),title:'Elden Ring',platform:'PlayStation 5',format:'physical',status:'In Progress',note:'Stuck on the final boss. Attempt 14.',createdAt:d(3),updatedAt:d(1)},
    {id:uid(),title:'Final Fantasy VII Rebirth',platform:'PlayStation 5',format:'physical',status:'Not Started',note:'Waiting for a free weekend.',createdAt:d(2),updatedAt:d(2)},
    {id:uid(),title:'Mario Kart 8 Deluxe',platform:'Nintendo Switch',format:'physical',status:'Not Started',note:'Shrink-wrap still intact. Birthday gift.',createdAt:d(6),updatedAt:d(6)},
    {id:uid(),title:'Hollow Knight',platform:'PC (Windows)',format:'digital',status:'In Progress',note:'Lost my map in Deepnest. Send help.',createdAt:d(9),updatedAt:d(2)},
    {id:uid(),title:"Baldur's Gate 3",platform:'PC (Windows)',format:'digital',status:'Dropped',note:'Act 2 broke me. Might return someday.',createdAt:d(25),updatedAt:d(8)},
    {id:uid(),title:'Celeste',platform:'Nintendo Switch',format:'digital',status:'Completed',note:'Cried a little. 10/10.',createdAt:d(40),updatedAt:d(12)},
    {id:uid(),title:'Hades',platform:'Steam Deck',format:'digital',status:'Completed',note:'32 clears and counting.',createdAt:d(55),updatedAt:d(20)},
    {id:uid(),title:'Pokemon Emerald',platform:'Retro / Emulation',format:'physical',status:'Completed',note:'The cartridge that started it all.',createdAt:d(120),updatedAt:d(60)}
  ];
}

updateNoteCnt();
renderAll(true);
})();
