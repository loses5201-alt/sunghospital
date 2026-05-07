// ════ 留言板 ════
function renderJournalPage(c){
  c.innerHTML='<div class="admin-layout" style="height:100%;display:flex;flex-direction:column">'
    +'<div class="main-header">'
    +'<div><h1>📋 留言板</h1><div class="main-header-meta">全員公開 · 分享、問題、閒聊都歡迎</div></div>'
    +'<button class="btn-sm primary" onclick="openNewPost()">✏️ 發文</button>'
    +'</div>'
    +'<div class="board-toolbar">'
    +'<div class="board-toolbar-row">'
      +'<div class="board-search" style="flex:1"><input id="boardSearch" placeholder="🔍 搜尋貼文…" oninput="_boardSearch=this.value;rnBoard()" value="'+esc(_boardSearch)+'"></div>'
      +'<select class="board-sort-sel" onchange="_boardSort=this.value;rnBoard()">'
        +'<option value="newest"'+(  _boardSort==='newest'?' selected':'')+'>最新</option>'
        +'<option value="liked"'+(  _boardSort==='liked'?' selected':'')+'>最多讚</option>'
        +'<option value="commented"'+(  _boardSort==='commented'?' selected':'')+'>最多留言</option>'
      +'</select>'
    +'</div>'
    +'<div class="board-cats">'
    +'<button class="board-cat-btn'+(  _boardFilter==='all'?' active':'')+'" onclick="_boardFilter=\'all\';rnBoard()">全部</button>'
    +Object.entries(BOARD_CATS).map(function(kv){var k=kv[0],v=kv[1];return'<button class="board-cat-btn'+(  _boardFilter===k?' active':'')+'" onclick="_boardFilter=\''+k+'\';rnBoard()">'+v.e+' '+v.l+'</button>';}).join('')
    +'</div>'
    +'</div>'
    +'<div class="admin-content" id="boardFeed"></div>'
    +'</div>';
  rnBoard();
}

function rnBoard(){
  var c=document.getElementById('boardFeed');if(!c)return;
  if(_boardOpenId){renderPostDetail(c,_boardOpenId);return;}
  var list=(store.journals||[]).filter(function(j){
    if(_boardFilter!=='all'&&j.category!==_boardFilter)return false;
    if(_boardSearch){var q=_boardSearch.toLowerCase();if((j.title+j.content).toLowerCase().indexOf(q)<0)return false;}
    return true;
  });
  var pinned=list.filter(function(j){return j.pinned;});
  var normal=list.filter(function(j){return !j.pinned;});
  function sortFn(a,b){
    if(_boardSort==='liked')return (b.likes||[]).length-(a.likes||[]).length;
    if(_boardSort==='commented')return (b.comments||[]).length-(a.comments||[]).length;
    return (b.createdAt||'').localeCompare(a.createdAt||'');
  }
  pinned.sort(sortFn);normal.sort(sortFn);
  var sorted=pinned.concat(normal);
  c.innerHTML=sorted.map(function(j){return renderPostCard(j);}).join('')
    ||'<div class="board-empty"><div style="font-size:40px;margin-bottom:10px">📭</div><div>還沒有貼文</div><div style="font-size:12px;margin-top:4px">成為第一個發文的人吧！</div></div>';
}

function renderPostCard(j){
  var cat=BOARD_CATS[j.category]||BOARD_CATS.chat;
  var liked=(j.likes||[]).indexOf(currentUser.id)>=0;
  var canEdit=j.userId===currentUser.id||isAdmin();
  var ts=j.createdAt?(j.createdAt.slice(5,10).replace('-','/')+' '+j.createdAt.slice(11,16)):'';
  var imgHtml=j.image?'<img src="'+j.image+'" class="board-card-img" onclick="openPostById(\''+j.id+'\')">':'';
  var preview=j.content?(j.content.length>120?esc(j.content.slice(0,120))+'…':esc(j.content)):'';
  return '<div class="board-card'+(j.pinned?' board-pinned':'')+'">'
    +(j.pinned?'<div class="board-pin-badge">📌 置頂</div>':'')
    +'<div class="board-card-head">'
    +avatarEl(j.userId,34)
    +'<div style="flex:1;min-width:0">'
    +'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
    +'<span style="font-size:13px;font-weight:700">'+esc(userName(j.userId))+'</span>'
    +'<span class="board-cat '+cat.c+'">'+cat.e+' '+cat.l+'</span>'
    +(j.edited?'<span style="font-size:11px;color:var(--faint)">(已編輯)</span>':'')
    +'</div>'
    +'<div style="font-size:12px;color:var(--faint)">'+ts+'</div>'
    +'</div>'
    +(canEdit?'<div class="board-card-menu" onclick="togglePostMenu(\''+j.id+'\')">'
      +'<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>'
      +'<div class="board-post-menu" id="pmenu-'+j.id+'" style="display:none">'
      +(j.userId===currentUser.id?'<div onclick="editPost(\''+j.id+'\')">✏️ 編輯</div>':'')
      +(canEdit?'<div onclick="deletePost(\''+j.id+'\')">🗑 刪除</div>':'')
      +(isAdmin()?'<div onclick="pinPost(\''+j.id+'\')">'+(j.pinned?'📌 取消置頂':'📌 置頂')+'</div>':'')
      +'</div></div>':'')
    +'</div>'
    +(j.title?'<div class="board-card-title" onclick="openPostById(\''+j.id+'\')">'+esc(j.title)+'</div>':'')
    +'<div class="board-card-body" onclick="openPostById(\''+j.id+'\')">'+preview+'</div>'
    +imgHtml
    +'<div class="board-card-footer">'
    +'<button class="board-action-btn'+(liked?' liked':'')+'" onclick="likePost(\''+j.id+'\')">'
    +'<svg viewBox="0 0 20 20" fill="'+(liked?'#c4527a':'none')+'" stroke="#c4527a" stroke-width="1.5" width="15" height="15"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>'
    +(j.likes&&j.likes.length?'<span>'+j.likes.length+'</span>':'')
    +'</button>'
    +'<button class="board-action-btn" onclick="openPostById(\''+j.id+'\')">'
    +'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="15" height="15"><path d="M2 5a2 2 0 012-2h11a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 3V14H4a2 2 0 01-2-2V5z"/></svg>'
    +(j.comments&&j.comments.length?'<span>'+j.comments.length+'</span>':'')
    +'</button>'
    +'<span style="margin-left:auto;font-size:12px;color:var(--faint)">'+(j.comments&&j.comments.length?j.comments.length+'則留言':'')+'</span>'
    +'</div></div>';
}

function renderPostDetail(c,postId){
  var j=(store.journals||[]).find(function(x){return x.id===postId;});
  if(!j){_boardOpenId=null;rnBoard();return;}
  var cat=BOARD_CATS[j.category]||BOARD_CATS.chat;
  var liked=(j.likes||[]).indexOf(currentUser.id)>=0;
  var ts=j.createdAt?(j.createdAt.slice(0,10)+' '+j.createdAt.slice(11,16)):'';
  var comments=(j.comments||[]).map(function(cm){
    var cmLiked=(cm.likes||[]).indexOf(currentUser.id)>=0;
    var canDel=cm.userId===currentUser.id||isAdmin();
    return '<div class="board-comment">'
      +avatarEl(cm.userId,26)
      +'<div style="flex:1;min-width:0">'
      +'<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:3px">'
      +'<span style="font-size:12px;font-weight:700">'+esc(userName(cm.userId))+'</span>'
      +'<span style="font-size:11px;color:var(--faint)">'+((cm.createdAt||'').slice(5,16).replace('-','/'))+'</span>'
      +'</div>'
      +'<div style="font-size:13px;line-height:1.6;white-space:pre-wrap">'+esc(cm.text)+'</div>'
      +'<div style="display:flex;gap:10px;margin-top:5px">'
      +'<button class="board-action-btn'+(cmLiked?' liked':'')+'" style="font-size:12px" onclick="likeComment(\''+postId+'\',\''+cm.id+'\')">'
      +'<svg viewBox="0 0 20 20" fill="'+(cmLiked?'#c4527a':'none')+'" stroke="#c4527a" stroke-width="1.5" width="12" height="12"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>'
      +(cm.likes&&cm.likes.length?'<span>'+cm.likes.length+'</span>':'')+'</button>'
      +(canDel?'<button class="board-action-btn" style="font-size:12px;color:var(--faint)" onclick="deleteComment(\''+postId+'\',\''+cm.id+'\')">刪除</button>':'')
      +'</div></div></div>';
  }).join('')||'<div style="text-align:center;padding:24px;color:var(--faint);font-size:13px">還沒有留言，來說第一句話吧 🌸</div>';

  c.innerHTML='<button class="btn-sm" onclick="_boardOpenId=null;rnBoard()" style="margin-bottom:16px">← 返回</button>'
    +'<div class="board-detail">'
    +'<div class="board-card-head" style="margin-bottom:10px">'
    +avatarEl(j.userId,38)
    +'<div style="flex:1"><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">'
    +'<span style="font-size:14px;font-weight:800">'+esc(userName(j.userId))+'</span>'
    +'<span class="board-cat '+cat.c+'">'+cat.e+' '+cat.l+'</span>'
    +(j.edited?'<span style="font-size:11px;color:var(--faint)">(已編輯)</span>':'')
    +'</div><div style="font-size:12px;color:var(--faint)">'+ts+'</div></div></div>'
    +(j.title?'<div style="font-size:18px;font-weight:800;margin-bottom:10px;line-height:1.4">'+esc(j.title)+'</div>':'')
    +'<div style="font-size:14px;line-height:1.8;white-space:pre-wrap;margin-bottom:12px">'+esc(j.content)+'</div>'
    +(j.image?'<img src="'+j.image+'" style="max-width:100%;border-radius:var(--radius);margin-bottom:14px;display:block">':'')
    +'<div class="board-card-footer" style="margin-bottom:18px">'
    +'<button class="board-action-btn'+(liked?' liked':'')+'" onclick="likePost(\''+j.id+'\')">'
    +'<svg viewBox="0 0 20 20" fill="'+(liked?'#c4527a':'none')+'" stroke="#c4527a" stroke-width="1.5" width="15" height="15"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>'
    +(j.likes&&j.likes.length?'<span style="font-weight:700">'+j.likes.length+' 個讚</span>':'讚')+'</button>'
    +'</div>'
    +'<div class="sec-label">留言（'+(j.comments||[]).length+'）</div>'
    +'<div id="commentList">'+comments+'</div>'
    +'<div class="board-comment-input">'
    +avatarEl(currentUser.id,32)
    +'<div style="flex:1;display:flex;flex-direction:column;gap:6px">'
    +'<textarea id="cmText" class="board-comment-ta" rows="2" placeholder="說點什麼吧…"></textarea>'
    +'<button class="btn-sm primary" style="align-self:flex-end" onclick="addComment(\''+postId+'\')">送出留言</button>'
    +'</div></div>'
    +'</div>';
}

function openPostById(id){_boardOpenId=id;rnBoard();}
function openNewPost(){
  _boardImg=null;
  var catOpts=Object.entries(BOARD_CATS).map(function(kv){return'<option value="'+kv[0]+'">'+kv[1].e+' '+kv[1].l+'</option>';}).join('');
  showModal('發布貼文',
    '<div class="form-row"><label>分類</label><select id="bcat">'+catOpts+'</select></div>'
    +'<div class="form-row"><label>標題（選填）</label><input id="btitle" placeholder="為貼文加個標題"></div>'
    +'<div class="form-row"><label>內容</label><textarea id="bcont" rows="5" style="resize:vertical" placeholder="分享你的心情、問題或想法…"></textarea></div>'
    +'<div class="form-row"><label>圖片（選填，最大 800KB）</label><input type="file" id="bimg" accept="image/*" onchange="handleBoardImg(this)" style="font-size:12px;width:100%"><div id="bimgPreview"></div></div>',
    function(){
      var cont=document.getElementById('bcont').value.trim();if(!cont)return;
      if(!store.journals)store.journals=[];
      store.journals.unshift({id:uid(),userId:currentUser.id,date:today(),
        title:document.getElementById('btitle').value.trim(),
        content:cont,
        category:document.getElementById('bcat').value,
        createdAt:today()+' '+nowTime(),
        likes:[],comments:[],pinned:false,image:_boardImg,edited:false});
      _boardImg=null;_boardOpenId=null;
      saveCollection('journals');closeModal();rnBoard();
      showToast('已發布','','📋');
    });
}

function handleBoardImg(input){
  var file=input.files&&input.files[0];if(!file)return;
  if(file.size>819200){alert('圖片請勿超過 800KB');input.value='';return;}
  var r=new FileReader();
  r.onload=function(e){
    _boardImg=e.target.result;
    var p=document.getElementById('bimgPreview');
    if(p)p.innerHTML='<img src="'+e.target.result+'" style="max-height:80px;border-radius:6px;margin-top:6px">';
  };
  r.readAsDataURL(file);
  input.value='';
}

function likePost(id){
  var j=(store.journals||[]).find(function(x){return x.id===id;});if(!j)return;
  if(!j.likes)j.likes=[];
  var i=j.likes.indexOf(currentUser.id);
  if(i>=0)j.likes.splice(i,1);else j.likes.push(currentUser.id);
  saveCollection('journals');rnBoard();
}

function deletePost(id){
  if(!confirm('確定刪除此貼文？'))return;
  store.journals=store.journals.filter(function(j){return j.id!==id;});
  if(_boardOpenId===id)_boardOpenId=null;
  saveCollection('journals');rnBoard();showToast('已刪除','','🗑');
}

function pinPost(id){
  var j=(store.journals||[]).find(function(x){return x.id===id;});if(!j)return;
  j.pinned=!j.pinned;
  saveCollection('journals');rnBoard();
  showToast(j.pinned?'已置頂':'已取消置頂','','📌');
  togglePostMenu(id);
}

function editPost(id){
  var j=(store.journals||[]).find(function(x){return x.id===id;});if(!j)return;
  _boardImg=j.image||null;
  var catOpts=Object.entries(BOARD_CATS).map(function(kv){return'<option value="'+kv[0]+'"'+(j.category===kv[0]?' selected':'')+'>'+kv[1].e+' '+kv[1].l+'</option>';}).join('');
  showModal('編輯貼文',
    '<div class="form-row"><label>分類</label><select id="ebcat">'+catOpts+'</select></div>'
    +'<div class="form-row"><label>標題</label><input id="ebtitle" value="'+esc(j.title||'')+'"></div>'
    +'<div class="form-row"><label>內容</label><textarea id="ebcont" rows="5" style="resize:vertical">'+esc(j.content||'')+'</textarea></div>'
    +(j.image?'<div style="margin-bottom:10px"><img src="'+j.image+'" style="max-height:60px;border-radius:6px"><button class="btn-xs" onclick="_boardImg=null;document.getElementById(\'ebimgPreview\').innerHTML=\'\'" style="margin-left:8px">移除圖片</button></div>':'')
    +'<div class="form-row"><label>更換圖片（選填）</label><input type="file" accept="image/*" onchange="handleBoardImg(this)" style="font-size:12px;width:100%"><div id="bimgPreview"></div></div>',
    function(){
      var cont=document.getElementById('ebcont').value.trim();if(!cont)return;
      j.title=document.getElementById('ebtitle').value.trim();
      j.content=cont;
      j.category=document.getElementById('ebcat').value;
      j.image=_boardImg;
      j.edited=true;
      _boardImg=null;
      saveCollection('journals');closeModal();rnBoard();
    });
  togglePostMenu(id);
}

function togglePostMenu(id){
  var m=document.getElementById('pmenu-'+id);if(!m)return;
  var isOpen=m.style.display!=='none';
  document.querySelectorAll('.board-post-menu').forEach(function(x){x.style.display='none';});
  if(!isOpen)m.style.display='block';
  if(!isOpen){setTimeout(function(){document.addEventListener('click',function hide(){document.querySelectorAll('.board-post-menu').forEach(function(x){x.style.display='none';});document.removeEventListener('click',hide);},{once:true});},0);}
}

function addComment(postId){
  var ta=document.getElementById('cmText');if(!ta)return;
  var text=ta.value.trim();if(!text)return;
  var j=(store.journals||[]).find(function(x){return x.id===postId;});if(!j)return;
  if(!j.comments)j.comments=[];
  j.comments.push({id:uid(),userId:currentUser.id,text:text,createdAt:today()+' '+nowTime(),likes:[]});
  ta.value='';
  saveCollection('journals');renderPostDetail(document.getElementById('boardFeed'),postId);
}

function likeComment(postId,commentId){
  var j=(store.journals||[]).find(function(x){return x.id===postId;});if(!j)return;
  var cm=(j.comments||[]).find(function(x){return x.id===commentId;});if(!cm)return;
  if(!cm.likes)cm.likes=[];
  var i=cm.likes.indexOf(currentUser.id);
  if(i>=0)cm.likes.splice(i,1);else cm.likes.push(currentUser.id);
  saveCollection('journals');renderPostDetail(document.getElementById('boardFeed'),postId);
}

function deleteComment(postId,commentId){
  var j=(store.journals||[]).find(function(x){return x.id===postId;});if(!j)return;
  j.comments=(j.comments||[]).filter(function(x){return x.id!==commentId;});
  saveCollection('journals');renderPostDetail(document.getElementById('boardFeed'),postId);
  showToast('已刪除留言','','🗑');
}

// keep openNewJ as alias for quick action
function openNewJ(){openNewPost();}
