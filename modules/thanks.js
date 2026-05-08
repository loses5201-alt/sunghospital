// ════ 感謝牆（員工互相感謝、看見彼此努力） ════

var THANKS_EMOJIS = ['💝','🌸','🤝','✨','🙏','🌟','💐','☕','🎯','🏆'];
var _thanksFilter = 'all'; // all / received / sent

function renderThanksPage(c){
  var allThanks = (store.thanks || []).slice().sort(function(a,b){
    return (b.createdAt||'').localeCompare(a.createdAt||'');
  });
  var me = currentUser.id;
  var receivedCnt = allThanks.filter(function(t){return t.toUserId===me;}).length;
  var sentCnt = allThanks.filter(function(t){return t.fromUserId===me;}).length;

  // 本月被感謝排行
  var ym = today().slice(0,7);
  var monthMap = {};
  allThanks.forEach(function(t){
    if((t.createdAt||'').slice(0,7) !== ym) return;
    monthMap[t.toUserId] = (monthMap[t.toUserId]||0) + 1;
  });
  var rank = Object.keys(monthMap).map(function(uid2){return {uid:uid2, cnt:monthMap[uid2]};})
    .sort(function(a,b){return b.cnt-a.cnt;}).slice(0,5);

  c.innerHTML = '<div class="admin-layout">'
    + '<div class="main-header">'
    + '<div><h1>💝 感謝牆</h1><div class="main-header-meta">看見同事的努力 · 一句感謝有時候比加薪更暖</div></div>'
    + '<button class="btn-sm primary" onclick="openThanksForm()">＋ 寫感謝卡</button>'
    + '</div>'
    + '<div class="admin-content" id="thanksC"></div>'
    + '</div>';

  var statsHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
    + tile('我收到的感謝', receivedCnt, '#c4527a', 'received')
    + tile('我送出的感謝', sentCnt, '#2e7d5a', 'sent')
    + tile('本月感謝總數', allThanks.filter(function(t){return (t.createdAt||'').slice(0,7)===ym;}).length, '#7a35a0', null)
    + '</div>';

  var rankHtml = rank.length
    ? '<div style="background:linear-gradient(135deg,#fff8e1,#fde8f0);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:14px 18px;margin-bottom:18px">'
      + '<div style="font-weight:800;color:#7a4a00;margin-bottom:10px">🏆 本月最常被感謝的同事（前 5 名）</div>'
      + rank.map(function(r,i){
          var icons=['🥇','🥈','🥉','4.','5.'];
          return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:'+(i<rank.length-1?'1px dashed rgba(0,0,0,0.06)':'none')+'">'
            +'<span style="font-size:18px;width:28px">'+icons[i]+'</span>'
            +'<span style="flex:1;font-weight:600">'+esc(userName(r.uid))+'</span>'
            +'<span style="background:#fff;border:1px solid rgba(212,175,55,0.4);color:#7a4a00;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700">'+r.cnt+' 個感謝</span>'
            +'</div>';
        }).join('')
      + '</div>'
    : '';

  var filterHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'
    + ['all:全部 ('+allThanks.length+')','received:我收到 ('+receivedCnt+')','sent:我送出 ('+sentCnt+')'].map(function(s){
        var p=s.split(':'),k=p[0],l=p[1];
        var on=_thanksFilter===k;
        return '<button class="btn-sm'+(on?' primary':'')+'" style="font-size:12px;padding:5px 12px" onclick="setThanksFilter(\''+k+'\')">'+l+'</button>';
      }).join('')
    + '</div>';

  var listSrc;
  if(_thanksFilter==='received') listSrc = allThanks.filter(function(t){return t.toUserId===me;});
  else if(_thanksFilter==='sent') listSrc = allThanks.filter(function(t){return t.fromUserId===me;});
  else listSrc = allThanks;

  var cards = listSrc.length
    ? listSrc.map(thanksCard).join('')
    : '<div style="text-align:center;padding:50px 20px;color:var(--faint);font-size:14px;background:linear-gradient(180deg,transparent,rgba(196,82,122,0.03));border:1px dashed var(--b2);border-radius:14px">'
      + '尚無感謝卡 — 何不寫一張給今天幫過你的同事？'
      + '</div>';

  document.getElementById('thanksC').innerHTML = statsHtml + rankHtml + filterHtml + cards;

  function tile(label,val,clr,key){
    var active=_thanksFilter===key?' style="outline:2px solid '+clr+';outline-offset:-2px"':'';
    return '<div'+(key?' onclick="setThanksFilter(\''+key+'\')"':'')
      +' style="flex:1;min-width:130px;background:var(--surface);border:1px solid var(--b1);border-radius:var(--radius-sm);padding:12px 14px;cursor:'+(key?'pointer':'default')+'"'
      +(active?' data-active="1"':'')+'>'
      +'<div style="font-size:12px;color:var(--muted)">'+label+'</div>'
      +'<div style="font-size:24px;font-weight:800;color:'+clr+';line-height:1.1;margin-top:4px">'+val+'</div>'
      +'</div>';
  }
}

function thanksCard(t){
  var canDelete = t.fromUserId===currentUser.id || isAdmin();
  var emoji = t.emoji || '💝';
  return '<div style="background:linear-gradient(135deg,#fff,#fff8e1);border:1px solid rgba(212,175,55,0.3);border-radius:14px;padding:16px 20px;margin-bottom:12px;box-shadow:0 2px 8px rgba(196,82,122,0.06);transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 20px rgba(196,82,122,0.12)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 2px 8px rgba(196,82,122,0.06)\'">'
    + '<div style="display:flex;align-items:flex-start;gap:14px">'
    + '<div style="font-size:32px;line-height:1">'+emoji+'</div>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:3px">'
    + '<b style="color:var(--primary-dark)">'+esc(userName(t.fromUserId))+'</b>'
    + ' 感謝 '
    + '<b style="color:var(--text)">'+esc(userName(t.toUserId))+'</b>'
    + '</div>'
    + (t.title?'<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">'+esc(t.title)+'</div>':'')
    + '<div style="font-size:14px;line-height:1.7;color:var(--text);white-space:pre-wrap">'+esc(t.body)+'</div>'
    + '<div style="font-size:11px;color:var(--faint);margin-top:8px">'+esc(t.createdAt||'')+'</div>'
    + '</div>'
    + (canDelete?'<button class="btn-sm" style="font-size:11px;padding:3px 10px" onclick="deleteThanks(\''+t.id+'\')">刪除</button>':'')
    + '</div></div>';
}

function setThanksFilter(v){_thanksFilter=v;renderPageInMain(renderThanksPage);}

function openThanksForm(){
  var picker = renderPeoplePicker('thanksTargetPicker',{
    mode:'single',
    excludeIds:[currentUser.id],
    maxHeight:200,
    placeholder:'🔍 搜尋你想感謝的同事…'
  });
  var emojiBtns = THANKS_EMOJIS.map(function(e,i){
    return '<button type="button" class="thanks-emoji-btn'+(i===0?' selected':'')+'" data-emoji="'+e+'" onclick="selectThanksEmoji(this)">'+e+'</button>';
  }).join('');

  showModal('💝 寫一張感謝卡',
    '<div class="form-row"><label>感謝對象</label>'+picker+'</div>'
    + '<div class="form-row"><label>選個 emoji 表達心情</label>'
      + '<div id="thanksEmojiRow" style="display:flex;gap:6px;flex-wrap:wrap">'+emojiBtns+'</div></div>'
    + '<div class="form-row"><label>標題（選填）</label><input id="thanksTitle" placeholder="例：謝謝你昨晚幫我接班"></div>'
    + '<div class="form-row"><label>內容</label><textarea id="thanksBody" rows="4" placeholder="把感謝的細節寫下來，讓對方知道哪件事讓你覺得很暖…" style="min-height:100px"></textarea></div>',
    function(){
      var toUserId = pickerSelectedId('thanksTargetPicker');
      if(!toUserId){alert('請選擇感謝對象');return;}
      var body = document.getElementById('thanksBody').value.trim();
      if(!body){alert('請寫下你想說的話');return;}
      var title = document.getElementById('thanksTitle').value.trim();
      var emojiBtn = document.querySelector('#thanksEmojiRow .thanks-emoji-btn.selected');
      var emoji = emojiBtn ? emojiBtn.dataset.emoji : '💝';

      if(!store.thanks)store.thanks=[];
      var rec = {
        id: uid(),
        fromUserId: currentUser.id,
        toUserId: toUserId,
        title: title,
        body: body,
        emoji: emoji,
        createdAt: today()+' '+nowTime()
      };
      store.thanks.unshift(rec);

      // 通知對方
      if(!store.formNotifs)store.formNotifs=[];
      store.formNotifs.unshift({
        id: uid(),
        toUserId: toUserId,
        title: emoji+' '+currentUser.name+' 感謝你',
        body: title || body.slice(0,50)+(body.length>50?'…':''),
        time: today()+' '+nowTime(),
        read: false,
        thanksId: rec.id
      });

      logAudit('送出感謝',userName(toUserId)+(title?' · '+title:''));
      saveMultiple(['thanks','formNotifs']);
      closeModal();
      renderPageInMain(renderThanksPage);
      showToast('感謝卡已送出',userName(toUserId)+' 會收到通知',emoji);
    }
  );
}

function selectThanksEmoji(btn){
  document.querySelectorAll('#thanksEmojiRow .thanks-emoji-btn').forEach(function(b){b.classList.remove('selected');});
  btn.classList.add('selected');
}

function deleteThanks(id){
  var t = (store.thanks||[]).find(function(x){return x.id===id;});
  if(!t) return;
  if(t.fromUserId!==currentUser.id && !isAdmin()){
    showToast('無權限','只有送出者或管理員能刪除','🔒');
    return;
  }
  if(!confirm('確定刪除這張感謝卡？'))return;
  store.thanks = store.thanks.filter(function(x){return x.id!==id;});
  saveCollection('thanks');
  renderPageInMain(renderThanksPage);
  showToast('已刪除','','🗑');
}
