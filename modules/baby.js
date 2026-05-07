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
    return'<div class="baby-card'+(b.discharged?' discharged':'')+'"><div class="baby-ph">'+b.emoji+'</div><div class="baby-info"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap"><div class="baby-name">'+esc(b.name)+'</div><span class="'+(b.gender==='boy'?'bb-b':'bb-g')+'">'+(b.gender==='boy'?'男寶':'女寶')+'</span>'+daysLabel+'</div><div class="baby-meta"><span>⚖ '+esc(b.weight)+'</span><span>📏 '+esc(b.height)+'</span><span>🕐 '+esc(b.born)+'</span></div><div class="baby-meta" style="margin-top:3px"><span>🏥 '+esc(b.mom)+'</span></div>'+clinicRow+(b.note?'<div style="font-size:12px;color:var(--muted);margin-top:5px">'+esc(b.note)+'</div>':'')+'<div style="display:flex;gap:6px;flex-wrap:wrap">'+dischargeBtn+editBtn+'</div></div></div>';
  }).join('');
  const filterBtn='<button class="btn-sm'+(babyShowAll?' primary':'')+'" onclick="babyShowAll=!babyShowAll;rnBaby(document.getElementById(\'babySearch\')?document.getElementById(\'babySearch\').value:\'\')">'+(babyShowAll?'全部 ('+store.babies.length+')':'住院中 ('+activeCnt+')')+'</button>';
  const searchBar='<div style="display:flex;gap:8px;margin-bottom:14px;align-items:center"><input id="babySearch" placeholder="🔍 搜尋寶寶名稱或床位..." oninput="rnBaby(this.value)" value="'+esc(kw)+'" style="flex:1;padding:8px 12px;border:1px solid var(--b1);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:13px;font-family:inherit">'+filterBtn+'</div>';
  c.innerHTML='<div style="text-align:center;margin-bottom:18px;padding:14px;background:linear-gradient(135deg,#fde8f0,#fff0f5);border-radius:var(--radius);border:1px solid rgba(196,82,122,0.15)"><div style="font-size:20px;margin-bottom:3px">本月共迎接 '+cnt+' 位新生命</div><div style="font-size:12px;color:var(--muted)">每個寶寶都是最珍貴的禮物 · 住院中 '+activeCnt+' 位</div></div>'+searchBar+'<div class="baby-grid">'+(cards||'<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--faint);font-size:13px">找不到符合的寶寶 🔍</div>')+'</div>';
}
function _babyFormHtml(b){
  b=b||{};
  const nOpts=store.users.map(function(u){return'<option value="'+u.id+'"'+(b.nurse===u.id?' selected':'')+'>'+esc(u.name)+'</option>';}).join('');
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
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

// 產房狀態
