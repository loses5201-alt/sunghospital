// ════════════════════════════════════════════════════════
// 衛教資料庫
// ════════════════════════════════════════════════════════
const ETAGS={br:{l:'哺乳',c:'et-br'},nb:{l:'新生兒',c:'et-nb'},pp:{l:'產後',c:'et-pp'},nu:{l:'營養',c:'et-nu'}};
var eduKw='';

function renderEduPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>📚 衛教資料庫</h1><div class="main-header-meta">點擊卡片展開詳細內容</div></div>'+(isAdmin()?'<button class="btn-sm primary" onclick="openNewEdu()">+ 新增</button>':'')+'</div><div class="admin-content" id="eduC"></div></div>';
  rnEdu();
}

function rnEdu(kw){
  if(kw!==undefined)eduKw=kw;
  const c=document.getElementById('eduC');if(!c)return;
  if(!store.eduReads)store.eduReads={};
  const allIds=store.users.map(function(u){return u.id;});
  const search=eduKw.trim().toLowerCase();
  var items=store.eduItems||[];
  if(search)items=items.filter(function(e){return e.title.toLowerCase().includes(search)||e.desc.toLowerCase().includes(search)||(e.content||'').toLowerCase().includes(search);});

  const searchBar='<div style="display:flex;gap:8px;margin-bottom:14px;align-items:center">'
    +'<input placeholder="🔍 搜尋標題或內容..." oninput="rnEdu(this.value)" value="'+esc(eduKw)+'" style="flex:1;padding:8px 12px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:13px;font-family:inherit">'
    +'<div style="font-size:12px;color:var(--faint);white-space:nowrap">共 '+items.length+' 筆</div>'
    +'</div>';

  const cards=items.map(function(e,i){
    const tags=e.tags.map(function(t){const tm=ETAGS[t]||{l:t,c:''};return'<span class="etag '+tm.c+'">'+tm.l+'</span>';}).join('');
    const readers=store.eduReads[e.id]||{};
    const readCnt=allIds.filter(function(id){return readers[id];}).length;
    const myRead=readers[currentUser.id];
    const pct=allIds.length?Math.round(readCnt/allIds.length*100):0;
    const progressHtml=isAdmin()
      ?'<div style="margin-top:6px;display:flex;align-items:center;gap:8px"><div style="flex:1;height:4px;background:var(--b1);border-radius:4px"><div style="width:'+pct+'%;height:4px;background:var(--primary);border-radius:4px;transition:width .3s"></div></div><span style="font-size:10px;color:var(--faint);white-space:nowrap">'+readCnt+'/'+allIds.length+' 人已讀</span></div>'
      :(myRead?'<span style="font-size:10px;color:var(--green);margin-top:4px;display:block">✓ 已讀</span>':'');
    const adminBtns=isAdmin()
      ?'<div style="display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--b1)">'
        +'<button class="btn-xs" onclick="event.stopPropagation();openEditEdu(\''+esc(e.id)+'\')">✏ 編輯</button>'
        +'<button class="btn-xs danger" onclick="event.stopPropagation();deleteEdu(\''+esc(e.id)+'\')">✕ 刪除</button>'
        +'</div>'
      :'';
    return'<div class="ecard" onclick="togEdu(\'eex'+i+'\',\''+esc(e.id)+'\')">'
      +'<div class="eico">'+e.icon+'</div>'
      +'<div style="flex:1;min-width:0">'
      +'<div class="etitle">'+esc(e.title)+'</div>'
      +'<div class="edesc">'+esc(e.desc)+'</div>'
      +'<div>'+tags+'</div>'+progressHtml
      +'<div class="eexp" id="eex'+i+'">'+esc(e.content)+'</div>'
      +adminBtns
      +'</div></div>';
  }).join('');

  c.innerHTML=searchBar+(cards||'<div style="text-align:center;padding:30px;color:var(--faint);font-size:13px">找不到符合的衛教資料 🔍</div>');
}

function togEdu(id,eduId){
  const el=document.getElementById(id);if(!el)return;
  el.classList.toggle('open');
  if(el.classList.contains('open')&&eduId){
    if(!store.eduReads)store.eduReads={};
    if(!store.eduReads[eduId])store.eduReads[eduId]={};
    if(!store.eduReads[eduId][currentUser.id]){
      store.eduReads[eduId][currentUser.id]=true;
      saveCollection('eduReads');rnEdu();
    }
  }
}

function _eduFormHtml(e){
  e=e||{};
  return '<div class="form-row"><label>標題</label><input id="eu" placeholder="衛教主題" value="'+esc(e.title||'')+'"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>圖示</label><input id="ei" placeholder="例：🤱" value="'+esc(e.icon||'')+'"></div>'
    +'<div class="form-row"><label>標籤（br/nb/pp/nu）</label><input id="et" placeholder="例：br,nb" value="'+esc((e.tags||[]).join(','))+'"></div></div>'
    +'<div class="form-row"><label>簡介</label><input id="ed" value="'+esc(e.desc||'')+'"></div>'
    +'<div class="form-row"><label>詳細內容</label><textarea id="ec" style="min-height:110px">'+esc(e.content||'')+'</textarea></div>';
}

function openNewEdu(){
  showModal('新增衛教資料',_eduFormHtml(),function(){
    const t=document.getElementById('eu').value.trim();if(!t)return;
    if(!store.eduItems)store.eduItems=[];
    store.eduItems.push({id:uid(),title:t,icon:document.getElementById('ei').value||'📄',
      tags:document.getElementById('et').value.split(',').map(function(x){return x.trim();}).filter(Boolean),
      desc:document.getElementById('ed').value,content:document.getElementById('ec').value});
    saveCollection('eduItems');closeModal();rnEdu();
  });
}

function openEditEdu(id){
  const e=(store.eduItems||[]).find(function(x){return x.id===id;});if(!e)return;
  showModal('編輯衛教資料',_eduFormHtml(e),function(){
    const t=document.getElementById('eu').value.trim();if(!t)return;
    e.title=t;e.icon=document.getElementById('ei').value||'📄';
    e.tags=document.getElementById('et').value.split(',').map(function(x){return x.trim();}).filter(Boolean);
    e.desc=document.getElementById('ed').value;e.content=document.getElementById('ec').value;
    saveCollection('eduItems');closeModal();rnEdu();
  });
}

function deleteEdu(id){
  if(!confirm('確定刪除此衛教資料？'))return;
  store.eduItems=(store.eduItems||[]).filter(function(x){return x.id!==id;});
  saveCollection('eduItems');rnEdu();
  showToast('已刪除','衛教資料已刪除','🗑');
}
