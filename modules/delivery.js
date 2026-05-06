// ════ 產房狀態 ════
function renderDeliveryPage(c){
  c.innerHTML='<div class="admin-layout"><div class="main-header"><div><h1>🚪 產房即時狀態</h1><div class="main-header-meta">點擊更新狀態</div></div><button class="btn-sm primary" onclick="setPage(\'delivery\')">🔄 刷新</button></div><div class="admin-content" id="roomC"></div></div>';
  rnRooms();
}
function rnRooms(){
  const c=document.getElementById('roomC');if(!c)return;
  const stats=Object.entries(RSTS).map(([k,v])=>{const cnt=store.rooms.filter(r=>r.status===k).length;return cnt>0?'<span style="font-size:12px;margin-right:14px">'+v.i+' '+v.l+' <strong>'+cnt+'</strong></span>':''}).join('');
  const cards=store.rooms.map((r,i)=>{const s=RSTS[r.status]||RSTS.empty;return'<div class="rcard '+s.rc+'" onclick="editRoom('+i+')"><span style="font-size:26px;margin-bottom:7px;display:block">'+s.i+'</span><div style="font-size:13px;font-weight:700">'+esc(r.name)+'</div><span style="font-size:11px;padding:2px 8px;border-radius:99px;font-weight:600;margin-top:5px;display:inline-block;background:'+(r.status==='empty'?'#e8f7f0':r.status==='waiting'?'#fdf0dc':r.status==='active'?'#fce8e8':r.status==='recovery'?'#e8f0fb':'#f0f0f0')+';color:'+(r.status==='empty'?'#2e7d5a':r.status==='waiting'?'#8f5208':r.status==='active'?'#b03050':r.status==='recovery'?'#1558a0':'#888')+'">'+s.l+'</span>'+(r.patient?'<div style="font-size:11px;color:var(--muted);margin-top:3px">'+esc(r.patient)+'</div>':'')+(r.since?'<div style="font-size:10px;color:var(--faint);margin-top:2px">⏱ '+esc(r.since)+'</div>':'')+(r.note?'<div style="font-size:10px;color:var(--faint);margin-top:2px">'+esc(r.note)+'</div>':'')+'</div>';}).join('');
  c.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;padding:11px;background:var(--surface);border-radius:var(--radius);border:1px solid var(--b1)">'+stats+'</div><div class="room-grid">'+cards+'</div>';
}
function editRoom(i){
  const r=store.rooms[i];
  const opts=Object.entries(RSTS).map(([k,v])=>'<option value="'+k+'" '+(r.status===k?'selected':'')+'>'+v.i+' '+v.l+'</option>').join('');
  showModal('更新：'+r.name,'<div class="form-row"><label>狀態</label><select id="rs">'+opts+'</select></div><div class="form-row"><label>病患（可匿名）</label><input id="rp" value="'+esc(r.patient)+'"></div><div class="form-row"><label>開始時間</label><input id="rt" value="'+esc(r.since)+'"></div><div class="form-row"><label>備註</label><input id="rn" value="'+esc(r.note)+'"></div>',
  ()=>{store.rooms[i].status=document.getElementById('rs').value;store.rooms[i].patient=document.getElementById('rp').value;store.rooms[i].since=document.getElementById('rt').value;store.rooms[i].note=document.getElementById('rn').value;saveCollection('rooms');closeModal();rnRooms();});
}

