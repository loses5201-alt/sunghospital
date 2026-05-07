// ════ 站內訊息/聊天室 ════
function renderMessagesPage(c){
  var activeUsers=store.users.filter(function(u){return u.status==='active'&&u.id!==currentUser.id&&u.username!=='admin';});
  var rooms=(store.chatRooms||[]).filter(function(r){return r.members.indexOf(currentUser.id)>=0;});
  rooms.sort(function(a,b){return (b.lastTs||'').localeCompare(a.lastTs||'');});
  var roomList=rooms.map(function(r){
    var unread=(store.messages||[]).filter(function(m){return m.roomId===r.id&&m.to===currentUser.id&&!m.deleted&&!(m.reads||{})[currentUser.id];}).length;
    var active=_activeChatRoom===r.id?'active':'';
    var avHtml,nameHtml,lastHtml;
    if(r.isGroup){
      avHtml='<div class="chat-room-av av-e" style="font-size:15px">👥</div>';
      nameHtml=esc(r.groupName||'群組');
    } else {
      var otherId=r.members.filter(function(id){return id!==currentUser.id;})[0];
      var other=store.users.find(function(u){return u.id===otherId;})||{name:'未知',avatar:'av1'};
      var onlineDot=isOnline(otherId)?'<span class="presence-online"></span>':'';
      avHtml='<div style="position:relative;flex-shrink:0"><div class="chat-room-av '+other.avatar+'">'+initials(other.name)+'</div>'+onlineDot+'</div>';
      nameHtml=esc(other.name);
    }
    lastHtml=esc((r.lastMsg||'').slice(0,26)||'點擊開始對話');
    return '<div class="chat-room-item '+active+'" onclick="openChatRoom(\''+r.id+'\')">'
      +avHtml
      +'<div class="chat-room-info"><div class="chat-room-name">'+nameHtml+'</div>'
      +'<div class="chat-room-last">'+lastHtml+'</div></div>'
      +(unread?'<span class="chat-unread-dot">'+unread+'</span>':'')+'</div>';
  }).join('')||'<div style="padding:24px;text-align:center;color:var(--faint);font-size:13px">尚無對話<br>點擊下方人員開始聊天</div>';
  var userBtns=activeUsers.map(function(u){
    var dot=isOnline(u.id)?'<span class="presence-online" style="position:static;display:inline-block;margin-right:3px"></span>':'';
    return '<button class="dm-start-btn" onclick="startDM(\''+u.id+'\')" title="傳訊給 '+esc(u.name)+'">'+dot+esc(u.name)+'</button>';
  }).join('');
  c.innerHTML='<div class="admin-layout" style="flex-direction:row;height:100%;overflow:hidden">'
    +'<div class="msg-sidebar">'
    +'<div class="msg-sidebar-hdr" style="display:flex;align-items:center;justify-content:space-between"><h2>💬 站內訊息</h2>'
    +'<button class="btn-xs" onclick="openCreateGroup()" title="建立群組" style="border-radius:99px;padding:4px 10px;font-size:12px">＋群組</button></div>'
    +'<div style="padding:10px 10px 8px;border-bottom:1px solid rgba(196,82,122,.1);display:flex;flex-wrap:wrap;gap:6px">'+userBtns+'</div>'
    +'<div id="roomList" style="flex:1;overflow-y:auto;padding:6px">'+roomList+'</div>'
    +'</div>'
    +'<div id="chatMain" class="msg-main">'
    +(_activeChatRoom?''
      :'<div class="chat-empty-ph">'
      +'<svg viewBox="0 0 48 48" fill="none" width="64" height="64"><circle cx="24" cy="24" r="22" fill="rgba(196,82,122,.1)"/><path d="M14 20h20M14 27h13" stroke="#c4527a" stroke-width="2.2" stroke-linecap="round"/><path d="M34 14H14a3 3 0 00-3 3v14a3 3 0 003 3h3l3 4 3-4h11a3 3 0 003-3V17a3 3 0 00-3-3z" stroke="#c4527a" stroke-width="2" fill="rgba(196,82,122,.05)"/></svg>'
      +'<p>選個人開始聊天吧 ✨<br><span style="font-size:12px">點上方名字或左側對話　或建立群組</span></p>'
      +'</div>')
    +'</div></div>';
  if(_activeChatRoom)renderChatThread(_activeChatRoom);
}

function startDM(userId){var room=getOrCreateDM(userId);_activeChatRoom=room.id;setPage('messages');}

function openChatRoom(roomId){
  _activeChatRoom=roomId;
  (store.messages||[]).forEach(function(m){if(m.roomId===roomId&&m.to===currentUser.id){if(!m.reads)m.reads={};m.reads[currentUser.id]=true;}});
  saveCollection('messages');renderChatThread(roomId);updateMsgBadge();
  document.querySelectorAll('.chat-room-item').forEach(function(el){el.classList.remove('active');});
  document.querySelectorAll('.chat-room-item').forEach(function(el){if(el.getAttribute('onclick')&&el.getAttribute('onclick').indexOf(roomId)>=0)el.classList.add('active');});
}

function renderChatThread(roomId){
  var main=document.getElementById('chatMain');if(!main)return;
  var room=(store.chatRooms||[]).find(function(r){return r.id===roomId;});if(!room)return;
  var isGroup=room.isGroup;
  var otherId=!isGroup?room.members.filter(function(id){return id!==currentUser.id;})[0]:null;
  var other=otherId?(store.users.find(function(u){return u.id===otherId;})||{name:'未知',avatar:'av1'}):null;
  var msgs=(store.messages||[]).filter(function(m){return m.roomId===roomId;});
  msgs.sort(function(a,b){return a.ts.localeCompare(b.ts);});

  var REACTIONS=['❤️','👍','😂','😮','😢','🙏'];
  var lastDate='';
  var bubbles=msgs.map(function(m,idx){
    var isMine=m.from===currentUser.id;
    var sender=store.users.find(function(u){return u.id===m.from;})||{name:'?',avatar:'av1'};
    var time=m.ts?m.ts.slice(11,16):'';
    var dateStr=m.ts?m.ts.slice(0,10):'';
    var dateSep='';
    if(dateStr&&dateStr!==lastDate){lastDate=dateStr;dateSep='<div class="chat-date-sep">'+fmtDate(dateStr)+'</div>';}

    // deleted
    if(m.deleted){
      return dateSep+'<div class="chat-bubble-row '+(isMine?'mine':'')+'" style="opacity:.55">'
        +(!isMine?'<div class="'+sender.avatar+'" style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0">'+initials(sender.name)+'</div>':'')
        +'<div class="chat-bubble '+(isMine?'bubble-mine':'bubble-other')+'" style="font-style:italic;opacity:.7"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11" style="opacity:.6;margin-right:3px"><path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9z"/></svg>此訊息已刪除'
        +'<span class="bubble-time">'+time+'</span></div></div>';
    }

    // reply-to block
    var replyHtml='';
    if(m.replyTo){
      replyHtml='<div class="bubble-reply-quote" onclick="scrollToMsg(\''+m.replyTo.msgId+'\')">↩ <strong>'+esc(m.replyTo.fromName)+'</strong>: '+esc((m.replyTo.text||'📎 附件').slice(0,40))+'</div>';
    }

    // attachment
    var att='';
    if(m.attachment&&!m.deleted){
      var a=m.attachment;
      if(a.mime&&a.mime.startsWith('image/')){
        att='<img src="'+a.data+'" style="max-width:200px;max-height:180px;border-radius:8px;display:block;margin-top:'+(m.text?'6px':'0')+';cursor:zoom-in" onclick="chatImgZoom(\''+m.id+'\')">';
      } else {
        att='<a href="'+a.data+'" download="'+esc(a.name)+'" style="display:flex;align-items:center;gap:6px;margin-top:'+(m.text?'6px':'0')+';padding:6px 10px;background:rgba(0,0,0,.1);border-radius:8px;font-size:12px;color:inherit;text-decoration:none;max-width:200px">'
          +'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M13 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7z"/><path d="M13 2v5h5"/></svg>'
          +esc(a.name)+'</a>';
      }
    }

    // reactions display
    var reactionMap=m.reactions||{};
    var reactionDisplay=Object.keys(reactionMap).filter(function(e){return reactionMap[e]&&reactionMap[e].length>0;}).map(function(e){
      var users=reactionMap[e];
      var iReacted=users.indexOf(currentUser.id)>=0;
      var names=users.map(function(uid2){return userName(uid2);}).join('、');
      return '<button class="chat-reaction-chip'+(iReacted?' reacted':'')+'" onclick="reactToMsg(\''+roomId+'\',\''+m.id+'\',\''+e+'\')" title="'+esc(names)+'">'+e+'<span>'+users.length+'</span></button>';
    }).join('');

    // reaction picker (always shown on hover via CSS)
    var reactionPicker='<div class="msg-reaction-picker">'+REACTIONS.map(function(e){
      return '<button onclick="reactToMsg(\''+roomId+'\',\''+m.id+'\',\''+e+'\')">'+e+'</button>';
    }).join('')+'</div>';

    // action bar (reply + delete)
    var actions='<div class="msg-actions">'
      +'<button class="msg-action-btn" onclick="setReply(\''+m.id+'\',\''+esc(m.text||'📎').replace(/'/g,'')+'\',\''+esc(sender.name)+'\')" title="回覆">↩</button>'
      +(isMine?'<button class="msg-action-btn danger" onclick="deleteMsg(\''+roomId+'\',\''+m.id+'\')" title="刪除">×</button>':'')
      +'</div>';

    // seen receipt
    var receipt='';
    if(isMine){
      var seenByOthers=room.members.filter(function(id){return id!==currentUser.id&&(m.reads||{})[id];});
      receipt='<span class="bubble-receipt">'+(seenByOthers.length>0?'✓✓':'✓')+'</span>';
    }

    // sender name for group chats or first in sequence
    var senderName='';
    if(!isMine&&(isGroup||idx===0||(msgs[idx-1]&&msgs[idx-1].from!==m.from))){
      senderName='<div class="bubble-sender-name">'+esc(sender.name)+'</div>';
    }

    return dateSep
      +'<div class="chat-bubble-row '+(isMine?'mine':'')+'" id="msg-'+m.id+'">'
      +(!isMine?'<div style="position:relative;flex-shrink:0"><div class="'+sender.avatar+'" style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">'+initials(sender.name)+'</div>'+(isOnline(m.from)&&!isMine?'<span class="presence-online presence-sm"></span>':'')+'</div>':'')
      +'<div class="bubble-wrap">'
      +senderName
      +(isMine?'':'')+reactionPicker
      +'<div class="chat-bubble '+(isMine?'bubble-mine':'bubble-other')+'">'
      +replyHtml
      +(m.text?'<span>'+esc(m.text)+'</span>':'')
      +att
      +'<span class="bubble-time">'+time+receipt+'</span></div>'
      +(reactionDisplay?'<div class="chat-reactions">'+reactionDisplay+'</div>':'')
      +actions
      +'</div></div>';
  }).join('');

  // header
  var headerAvHtml,headerName,headerSub;
  if(isGroup){
    headerAvHtml='<div style="width:36px;height:36px;border-radius:50%;background:var(--lavender-bg);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 2px 8px rgba(155,143,212,.3)">👥</div>';
    headerName=esc(room.groupName||'群組');
    headerSub=room.members.length+'位成員';
  } else {
    var onlineSub=isOnline(otherId)?'<span style="color:var(--green);font-weight:600">● 最近活躍</span>':'<span>'+esc(userDept(otherId))+'</span>';
    headerAvHtml='<div style="position:relative;flex-shrink:0"><div class="'+other.avatar+'" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(196,82,122,.25)">'+initials(other.name)+'</div>'+(isOnline(otherId)?'<span class="presence-online"></span>':'')+'</div>';
    headerName=esc(other.name);
    headerSub=onlineSub;
  }

  main.innerHTML='<div class="chat-header">'
    +headerAvHtml
    +'<div style="flex:1;min-width:0"><div class="chat-header-name">'+headerName+'</div>'
    +'<div class="chat-header-dept">'+headerSub+'</div></div>'
    +(isGroup?'<button class="btn-xs" onclick="manageChatGroup(\''+roomId+'\')" style="flex-shrink:0">成員</button>':'')
    +'</div>'
    +'<div id="chatMessages" class="chat-messages">'+bubbles+'</div>'
    +'<div id="chatReplyPreview" style="display:none"></div>'
    +'<div id="chatFilePreview" class="chat-file-preview" style="display:none"></div>'
    +'<div class="chat-input-bar">'
    +'<label class="chat-clip-btn" title="附加檔案（最大800KB）">'
    +'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M15.172 7l-6.586 6.586a2 2 0 11-2.828-2.828l6.414-6.586a4 4 0 015.656 5.656l-6.415 6.585a6 6 0 11-8.486-8.486L9.5 3.5"/></svg>'
    +'<input type="file" style="display:none" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onchange="handleChatFile(this)">'
    +'</label>'
    +'<input id="chatInput" class="chat-input" placeholder="說點什麼吧 ✨" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();submitMsg(\''+roomId+'\');}">'
    +'<button class="chat-send-btn" onclick="submitMsg(\''+roomId+'\')" title="送出">'
    +'<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>'
    +'</button></div>';
  var cm=document.getElementById('chatMessages');if(cm)cm.scrollTop=cm.scrollHeight;
  var ci=document.getElementById('chatInput');if(ci)ci.focus();
}

function submitMsg(roomId){
  var input=document.getElementById('chatInput');if(!input)return;
  var text=input.value.trim();
  if(!text&&!_pendingChatFile)return;
  input.value='';
  var att=_pendingChatFile;
  var reply=_replyToMsg;
  _clearChatFilePreview();
  clearReply();
  sendMsg(roomId,text,att,reply);
}

function chatImgZoom(msgId){
  var msg=null;
  (store.chatRooms||[]).forEach(function(r){(r.messages||[]).forEach(function(m){if(m.id===msgId)msg=m;});});
  if(!msg||!msg.attachment)return;
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  overlay.onclick=function(){document.body.removeChild(overlay);};
  var img=document.createElement('img');
  img.src=msg.attachment.data;
  img.style.cssText='max-width:92vw;max-height:90vh;border-radius:10px;box-shadow:0 4px 32px #000a';
  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

