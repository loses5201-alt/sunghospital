// ════ 寶寶牆 ════
function renderBabyPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>🍼 寶寶牆</h1><div class="main-header-meta">新生兒出生公告</div></div><button class="btn-sm primary" onclick="openNewBaby()">+ 新增寶寶</button></div><div class="admin-content" id="babyC"></div></div>';
  rnBaby();
}
var babyShowAll=false;
function babyDays(b){
  if(!b||!b.born) return 0;
  const start=new Date(b.born.split(' ')[0]);
  const end=b.discharged&&b.dischargeDate?new Date(b.dischargeDate):new Date(today());
  const diff=Math.floor((end-start)/(1000*60*60*24));
  return diff>=0?diff:0;
}
function dischargeBaby(id){
  const b=store.babies.find(function(x){return x.id===id;});if(!b)return;
  if(!confirm('確定標記出院？出院後住院天數將停止計算。'))return;
  b.discharged=true;b.dischargeDate=today();
  logAudit('寶寶出院',b.name);saveCollection('babies');
  const q=document.getElementById('babySearch');rnBaby(q?q.value:'');
  showToast('已標記出院',b.name,'🏠');
}
function rnBaby(q){
  const c=document.getElementById('babyC');if(!c)return;
  const cnt=store.babies.filter(b=>b.born.startsWith(today().slice(0,7))).length;
  const activeCnt=store.babies.filter(b=>!b.discharged).length;
  const kw=(q||'').trim().toLowerCase();
  let list=babyShowAll?store.babies:store.babies.filter(b=>!b.discharged);
  if(kw)list=list.filter(b=>b.name.toLowerCase().includes(kw)||(b.mom||'').toLowerCase().includes(kw));
  const cards=list.map(b=>{
    const days=babyDays(b);
    let daysLabel;
    if(b.discharged){
      daysLabel='<span class="badge-discharged">🏠 已出院'+(b.dischargeDate?' · '+fmtDate(b.dischargeDate):'')+'</span>';
    } else if(days===0){
      daysLabel='<span style="font-size:11px;background:#fce8e8;color:#b03050;padding:2px 7px;border-radius:99px;font-weight:600">今日出生</span>';
    } else {
      daysLabel='<span style="font-size:11px;background:#fdf0dc;color:#8f5208;padding:2px 7px;border-radius:99px;font-weight:600">第 '+days+' 天</span>';
    }
    const dischargeBtn=!b.discharged&&isAdmin()?'<button class="btn-sm" style="font-size:11px;padding:2px 8px;margin-top:5px" onclick="dischargeBaby(\''+b.id+'\')">🏠 出院</button>':'';
    const editBtn=isAdmin()?'<button class="btn-sm" style="font-size:11px;padding:2px 8px;margin-top:5px" onclick="openEditBaby(\''+b.id+'\')">✏ 編輯</button>':'';
    const apgar=b.apgar1||b.apgar5?'<span>APGAR '+(b.apgar1||'?')+' / '+(b.apgar5||'?')+'</span>':'';
    const ga=b.ga?'<span>胎齡 '+esc(b.ga)+'週</span>':'';
    const bMethod=b.birthMethod?'<span>'+(b.birthMethod==='normal'?'自然產':b.birthMethod==='csection'?'剖腹產':esc(b.birthMethod))+'</span>':'';
    const feed=b.feeding?'<span>'+(b.feeding==='breast'?'🤱 親餵':b.feeding==='formula'?'🍼 配方奶':'🤱🍼 混合')+'</span>':'';
    const clinicRow=(apgar||ga||bMethod||feed)?'<div class="baby-meta" style="margin-top:3px">'+[apgar,ga,bMethod,feed].filter(Boolean).join('')+'</div>':'';
    const photoBlock=b.photo
      ? '<div class="baby-ph baby-ph-photo" onclick="openBabyDetail(\''+b.id+'\')" title="點擊看大圖與留言"><img src="'+b.photo+'" alt="'+esc(b.name)+'"></div>'
      : '<div class="baby-ph" onclick="openBabyDetail(\''+b.id+'\')" title="點擊看詳情">'+b.emoji+'</div>';
    const msgCount=(b.parentMessages||[]).length;
    const msgBadge=msgCount?'<span style="font-size:11px;background:#fff8e1;color:#7a4a00;padding:2px 7px;border-radius:99px;font-weight:600">💌 '+msgCount+' 則家長留言</span>':'';
    const detailBtn='<button class="btn-sm" style="font-size:11px;padding:2px 8px;margin-top:5px" onclick="openBabyDetail(\''+b.id+'\')">📖 詳情 / 留言</button>';
    return'<div class="baby-card'+(b.discharged?' discharged':'')+'">'+photoBlock+'<div class="baby-info"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap"><div class="baby-name">'+esc(b.name)+'</div><span class="'+(b.gender==='boy'?'bb-b':'bb-g')+'">'+(b.gender==='boy'?'男寶':'女寶')+'</span>'+daysLabel+msgBadge+'</div><div class="baby-meta"><span>⚖ '+esc(b.weight)+'</span><span>📏 '+esc(b.height)+'</span><span>🕐 '+esc(b.born)+'</span></div><div class="baby-meta" style="margin-top:3px"><span>🏥 '+esc(b.mom)+'</span></div>'+clinicRow+(b.note?'<div style="font-size:12px;color:var(--muted);margin-top:5px">'+esc(b.note)+'</div>':'')+'<div style="display:flex;gap:6px;flex-wrap:wrap">'+detailBtn+dischargeBtn+editBtn+'</div></div></div>';
  }).join('');
  const filterBtn='<button class="btn-sm'+(babyShowAll?' primary':'')+'" onclick="babyShowAll=!babyShowAll;rnBaby(document.getElementById(\'babySearch\')?document.getElementById(\'babySearch\').value:\'\')">'+(babyShowAll?'全部 ('+store.babies.length+')':'住院中 ('+activeCnt+')')+'</button>';
  const searchBar='<div style="display:flex;gap:8px;margin-bottom:14px;align-items:center"><input id="babySearch" placeholder="🔍 搜尋寶寶名稱或床位..." oninput="rnBaby(this.value)" value="'+esc(kw)+'" style="flex:1;padding:8px 12px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:13px;font-family:inherit">'+filterBtn+'</div>';
  c.innerHTML='<div style="text-align:center;margin-bottom:18px;padding:14px;background:linear-gradient(135deg,#fde8f0,#fff0f5);border-radius:var(--radius);border:1px solid rgba(196,82,122,0.15)"><div style="font-size:20px;margin-bottom:3px">本月共迎接 '+cnt+' 位新生命</div><div style="font-size:12px;color:var(--muted)">每個寶寶都是最珍貴的禮物 · 住院中 '+activeCnt+' 位</div></div>'+searchBar+'<div class="baby-grid">'+(cards||'<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--faint);font-size:13px">找不到符合的寶寶 🔍</div>')+'</div>';
}
// 暫存寶寶照片（modal 開啟期間）
var _babyPhotoPending=null;
function handleBabyPhoto(input){
  const file=input.files[0];
  if(!file){_babyPhotoPending=null;return;}
  if(file.size>819200){alert('照片請勿超過 800 KB（壓縮一下再上傳）');input.value='';return;}
  const r=new FileReader();
  r.onload=function(e){
    _babyPhotoPending=e.target.result;
    const prev=document.getElementById('babyPhotoPrev');
    if(prev)prev.innerHTML='<img src="'+e.target.result+'" style="max-height:120px;max-width:100%;border-radius:10px;border:2px solid #fde8f0;margin-top:6px">';
  };
  r.readAsDataURL(file);
}

function _babyFormHtml(b){
  b=b||{};
  _babyPhotoPending=b.photo||null;
  const nOpts=store.users.filter(function(u){return u.username!=='admin';}).map(function(u){return'<option value="'+u.id+'"'+(b.nurse===u.id?' selected':'')+'>'+esc(u.name)+'</option>';}).join('');
  const photoPrev=b.photo?'<img src="'+b.photo+'" style="max-height:120px;max-width:100%;border-radius:10px;border:2px solid #fde8f0;margin-top:6px">':'';
  return '<div class="form-row"><label>寶寶照片 <span style="font-size:11px;color:var(--faint);font-weight:400">（家長同意後再拍，800 KB 內）</span></label>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
      +'<button type="button" class="btn-sm primary" style="font-size:12px;padding:7px 12px" onclick="document.getElementById(\'babyPhotoCam\').click()">📷 拍照</button>'
      +'<button type="button" class="btn-sm" style="font-size:12px;padding:7px 12px" onclick="document.getElementById(\'babyPhotoFile\').click()">📁 選檔案</button>'
      +'<input type="file" id="babyPhotoCam" accept="image/*" capture="environment" onchange="handleBabyPhoto(this)" style="display:none">'
      +'<input type="file" id="babyPhotoFile" accept="image/*" onchange="handleBabyPhoto(this)" style="display:none">'
      +(b.photo?'<button type="button" class="btn-sm danger" style="font-size:12px;padding:7px 12px" onclick="_babyPhotoPending=null;document.getElementById(\'babyPhotoPrev\').innerHTML=\'\';this.style.display=\'none\'">✕ 移除</button>':'')
    +'</div>'
    +'<div id="babyPhotoPrev">'+photoPrev+'</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div class="form-row"><label>寶寶暱稱</label><input id="bn" placeholder="例：小睿寶" value="'+esc(b.name||'')+'"></div>'
    +'<div class="form-row"><label>性別</label><select id="bg"><option value="boy"'+(b.gender==='boy'?' selected':'')+'>男寶</option><option value="girl"'+(b.gender==='girl'?' selected':'')+'>女寶</option></select></div>'
    +'<div class="form-row"><label>體重</label><input id="bw" placeholder="例：3.2kg" value="'+esc(b.weight||'')+'"></div>'
    +'<div class="form-row"><label>身高</label><input id="bh" placeholder="例：50cm" value="'+esc(b.height||'')+'"></div>'
    +'<div class="form-row"><label>出生時間</label><input id="bb" placeholder="'+today()+' 08:00" value="'+esc(b.born||'')+'"></div>'
    +'<div class="form-row"><label>媽媽床位</label><input id="bm" placeholder="例：床位 301" value="'+esc(b.mom||'')+'"></div>'
    +'<div class="form-row"><label>胎齡（週）</label><input id="bga" placeholder="例：38" value="'+esc(b.ga||'')+'"></div>'
    +'<div class="form-row"><label>生產方式</label><select id="bbm"><option value="">--</option><option value="normal"'+(b.birthMethod==='normal'?' selected':'')+'>自然產</option><option value="csection"'+(b.birthMethod==='csection'?' selected':'')+'>剖腹產</option><option value="other"'+(b.birthMethod==='other'?' selected':'')+'>其他</option></select></div>'
    +'<div class="form-row"><label>APGAR 1分鐘</label><input id="bap1" type="number" min="0" max="10" placeholder="0-10" value="'+esc(b.apgar1||'')+'"></div>'
    +'<div class="form-row"><label>APGAR 5分鐘</label><input id="bap5" type="number" min="0" max="10" placeholder="0-10" value="'+esc(b.apgar5||'')+'"></div>'
    +'<div class="form-row"><label>哺餵方式</label><select id="bfd"><option value="">--</option><option value="breast"'+(b.feeding==='breast'?' selected':'')+'>親餵</option><option value="formula"'+(b.feeding==='formula'?' selected':'')+'>配方奶</option><option value="mixed"'+(b.feeding==='mixed'?' selected':'')+'>混合</option></select></div>'
    +'<div class="form-row"><label>負責護理師</label><select id="bnr">'+nOpts+'</select></div>'
    +'</div>'
    +'<div class="form-row"><label>祝福留言</label><input id="bnt" placeholder="例：母嬰均安！" value="'+esc(b.note||'')+'"></div>';
}

function _babyReadForm(b){
  b.name=document.getElementById('bn').value.trim();
  b.gender=document.getElementById('bg').value;
  b.weight=document.getElementById('bw').value;
  b.height=document.getElementById('bh').value;
  b.born=document.getElementById('bb').value||today()+' '+nowTime();
  b.mom=document.getElementById('bm').value;
  b.ga=document.getElementById('bga').value;
  b.birthMethod=document.getElementById('bbm').value;
  b.apgar1=document.getElementById('bap1').value;
  b.apgar5=document.getElementById('bap5').value;
  b.feeding=document.getElementById('bfd').value;
  b.nurse=document.getElementById('bnr').value;
  b.note=document.getElementById('bnt').value;
  b.emoji=b.gender==='boy'?'👶':'🌸';
  b.photo=_babyPhotoPending||null;
  if(!b.parentMessages)b.parentMessages=[];
  return b;
}

function openNewBaby(){
  showModal('新增寶寶公告',_babyFormHtml(),function(){
    const n=document.getElementById('bn').value.trim();if(!n)return;
    const b=_babyReadForm({id:uid()});
    store.babies.unshift(b);
    logAudit('新增寶寶',b.name);saveCollection('babies');closeModal();rnBaby();
    showToast('寶寶公告已新增',b.name,'🍼');
  });
}

function openEditBaby(id){
  const b=store.babies.find(function(x){return x.id===id;});if(!b)return;
  showModal('編輯寶寶資料',_babyFormHtml(b),function(){
    const n=document.getElementById('bn').value.trim();if(!n)return;
    _babyReadForm(b);
    logAudit('編輯寶寶',b.name);saveCollection('babies');closeModal();rnBaby();
    showToast('資料已更新',b.name,'✏');
  });
}

// ── 寶寶詳情：照片放大、家長留言、護理師主責標記 ──
function openBabyDetail(id){
  const b=store.babies.find(x=>x.id===id);if(!b)return;
  if(!b.parentMessages)b.parentMessages=[];
  if(!b.responsibleNurses)b.responsibleNurses=[];
  const photoBig=b.photo
    ? '<div style="text-align:center;margin-bottom:14px"><img src="'+b.photo+'" style="max-width:100%;max-height:280px;border-radius:14px;border:3px solid #fde8f0;cursor:zoom-in" onclick="window.open(this.src,\'_blank\')"></div>'
    : '<div style="text-align:center;font-size:80px;margin-bottom:14px">'+b.emoji+'</div>';
  const info='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:13px;background:var(--s2);border-radius:10px;padding:12px 14px;margin-bottom:14px">'
    +'<div><span style="color:var(--faint)">性別：</span>'+(b.gender==='boy'?'👶 男寶':'🌸 女寶')+'</div>'
    +'<div><span style="color:var(--faint)">體重：</span>'+esc(b.weight||'—')+'</div>'
    +'<div><span style="color:var(--faint)">身高：</span>'+esc(b.height||'—')+'</div>'
    +'<div><span style="color:var(--faint)">出生：</span>'+esc(b.born||'—')+'</div>'
    +(b.ga?'<div><span style="color:var(--faint)">胎齡：</span>'+esc(b.ga)+' 週</div>':'')
    +(b.birthMethod?'<div><span style="color:var(--faint)">生產：</span>'+(b.birthMethod==='normal'?'自然產':b.birthMethod==='csection'?'剖腹產':esc(b.birthMethod))+'</div>':'')
    +'<div style="grid-column:1/-1"><span style="color:var(--faint)">媽媽床位：</span>'+esc(b.mom||'—')+'</div>'
    +'</div>';

  // 主責護理師區
  const isResp=b.responsibleNurses.indexOf(currentUser.id)>=0;
  const respNames=b.responsibleNurses.map(uid2=>userName(uid2)).filter(Boolean).join('、')||'—';
  const respBtn='<button class="btn-sm '+(isResp?'':'primary')+'" style="font-size:12px;padding:5px 12px" onclick="toggleBabyResponsible(\''+b.id+'\')">'+(isResp?'✓ 已是主責（取消）':'＋ 我主責這寶寶')+'</button>';
  const respBlock='<div style="background:#f0f7ff;border:1px solid #c8d8ec;border-radius:10px;padding:10px 14px;margin-bottom:14px">'
    +'<div style="font-size:12px;color:var(--faint);margin-bottom:4px">主責護理師</div>'
    +'<div style="font-size:13px;margin-bottom:6px">'+esc(respNames)+'</div>'
    +respBtn+'</div>';

  // 家長留言區
  const msgs=b.parentMessages.map(m=>'<div style="background:#fff8e1;border-left:3px solid #f5a623;border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:13px;line-height:1.6">'
    +'<div>'+esc(m.text)+'</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-top:4px">'+esc(m.author||'家長')+' · '+esc(m.postedAt||'')+(isAdmin()||hasPerm('editPatients')?' <a onclick="deleteBabyMessage(\''+b.id+'\',\''+m.id+'\')" style="margin-left:8px;color:var(--red);cursor:pointer">刪除</a>':'')+'</div>'
    +'</div>').join('')||'<div style="font-size:12px;color:var(--faint);text-align:center;padding:14px">尚無家長留言</div>';
  const msgInput=(isAdmin()||hasPerm('editPatients'))
    ? '<div style="display:flex;gap:6px;margin-top:8px">'
      +'<input id="babyMsgAuthor" placeholder="家長身分（例：媽媽 / 爸爸）" style="width:140px;padding:8px 10px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px;font-family:inherit">'
      +'<input id="babyMsgText" placeholder="幫家長代 post 一句話…" style="flex:1;padding:8px 10px;border:1.5px solid var(--b2);border-radius:8px;font-size:13px;font-family:inherit" onkeydown="if(event.key===\'Enter\')postBabyMessage(\''+b.id+'\')">'
      +'<button class="btn-sm primary" style="font-size:12px;padding:7px 12px" onclick="postBabyMessage(\''+b.id+'\')">發送</button>'
      +'</div>'
    : '';
  const msgBlock='<div style="background:var(--surface);border:1px solid var(--b1);border-radius:10px;padding:12px 14px">'
    +'<div style="font-weight:700;margin-bottom:8px;color:var(--text)">💌 家長留言（'+b.parentMessages.length+'）</div>'
    +msgs+msgInput+'</div>';

  showModal(esc(b.name)+' 寶寶資料',photoBig+info+respBlock+msgBlock,null);
  setTimeout(function(){var f=document.querySelector('.modal-footer');if(f)f.style.display='none';},0);
}

function toggleBabyResponsible(id){
  const b=store.babies.find(x=>x.id===id);if(!b)return;
  if(!b.responsibleNurses)b.responsibleNurses=[];
  const idx=b.responsibleNurses.indexOf(currentUser.id);
  if(idx>=0){b.responsibleNurses.splice(idx,1);}else{b.responsibleNurses.push(currentUser.id);}
  saveCollection('babies');closeModal();openBabyDetail(id);
  showToast(idx>=0?'已取消主責':'已標記為主責',b.name,'🤱');
}

function postBabyMessage(id){
  const b=store.babies.find(x=>x.id===id);if(!b)return;
  const ta=document.getElementById('babyMsgText');
  const aa=document.getElementById('babyMsgAuthor');
  if(!ta)return;
  const text=ta.value.trim();
  if(!text)return;
  if(!b.parentMessages)b.parentMessages=[];
  b.parentMessages.push({
    id:uid(),
    text:text,
    author:(aa&&aa.value.trim())||'家長',
    postedAt:today()+' '+nowTime(),
    postedBy:currentUser.id
  });
  saveCollection('babies');
  closeModal();openBabyDetail(id);
  showToast('留言已新增',b.name,'💌');
}

function deleteBabyMessage(babyId,msgId){
  if(!confirm('確定刪除此留言？'))return;
  const b=store.babies.find(x=>x.id===babyId);if(!b||!b.parentMessages)return;
  b.parentMessages=b.parentMessages.filter(m=>m.id!==msgId);
  saveCollection('babies');closeModal();openBabyDetail(babyId);
  showToast('已刪除留言','','🗑');
}

// 產房狀態
