// ════════════════════════════════════════════════════════
// 衛教資料庫
// ════════════════════════════════════════════════════════
const ETAGS={br:{l:'哺乳',c:'et-br'},nb:{l:'新生兒',c:'et-nb'},pp:{l:'產後',c:'et-pp'},nu:{l:'營養',c:'et-nu'}};

function renderEduPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📚 衛教資料庫</h1><div class="main-header-meta">點擊卡片展開詳細內容</div></div>'+(isAdmin()?'<button class="btn-sm primary" onclick="openNewEdu()">+ 新增</button>':'')+'</div><div class="admin-content" id="eduC"></div></div>';
  rnEdu();
}

function rnEdu(){
  const c=document.getElementById('eduC');if(!c)return;
  if(!store.eduReads)store.eduReads={};
  const allIds=store.users.map(u=>u.id);
  c.innerHTML=store.eduItems.map((e,i)=>{
    const tags=e.tags.map(t=>{const tm=ETAGS[t]||{l:t,c:''};return'<span class="etag '+tm.c+'">'+tm.l+'</span>';}).join('');
    const readers=store.eduReads[e.id]||{};
    const readCnt=allIds.filter(id=>readers[id]).length;
    const myRead=readers[currentUser.id];
    const pct=allIds.length?Math.round(readCnt/allIds.length*100):0;
    const progressHtml=isAdmin()
      ?'<div style="margin-top:6px;display:flex;align-items:center;gap:8px"><div style="flex:1;height:4px;background:var(--b1);border-radius:4px"><div style="width:'+pct+'%;height:4px;background:var(--primary);border-radius:4px;transition:width .3s"></div></div><span style="font-size:10px;color:var(--faint);white-space:nowrap">'+readCnt+'/'+allIds.length+' 人已讀</span></div>'
      :(myRead?'<span style="font-size:10px;color:var(--green);margin-top:4px;display:block">✓ 已讀</span>':'');
    return'<div class="ecard" onclick="togEdu(\'eex'+i+'\',\''+esc(e.id)+'\')"><div class="eico">'+e.icon+'</div><div style="flex:1;min-width:0"><div class="etitle">'+esc(e.title)+'</div><div class="edesc">'+esc(e.desc)+'</div><div>'+tags+'</div>'+progressHtml+'<div class="eexp" id="eex'+i+'">'+esc(e.content)+'</div></div></div>';
  }).join('');
}

function togEdu(id,eduId){
  const el=document.getElementById(id);if(!el)return;
  el.classList.toggle('open');
  if(el.classList.contains('open')&&eduId){
    if(!store.eduReads)store.eduReads={};
    if(!store.eduReads[eduId])store.eduReads[eduId]={};
    if(!store.eduReads[eduId][currentUser.id]){
      store.eduReads[eduId][currentUser.id]=true;
      saveStore();rnEdu();
    }
  }
}

function openNewEdu(){
  showModal('新增衛教資料',
    '<div class="form-row"><label>標題</label><input id="eu" placeholder="衛教主題"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>圖示</label><input id="ei" placeholder="例：🤱"></div>'
    +'<div class="form-row"><label>標籤（br/nb/pp/nu）</label><input id="et" placeholder="例：br,nb"></div></div>'
    +'<div class="form-row"><label>簡介</label><input id="ed"></div>'
    +'<div class="form-row"><label>詳細內容</label><textarea id="ec" style="min-height:110px"></textarea></div>',
  ()=>{
    const t=document.getElementById('eu').value.trim();if(!t)return;
    if(!store.eduItems)store.eduItems=[];
    store.eduItems.push({id:uid(),title:t,icon:document.getElementById('ei').value||'📄',
      tags:document.getElementById('et').value.split(',').map(x=>x.trim()).filter(Boolean),
      desc:document.getElementById('ed').value,content:document.getElementById('ec').value});
    saveStore();closeModal();rnEdu();
  });
}
