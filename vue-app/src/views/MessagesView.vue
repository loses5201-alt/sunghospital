<template>
  <AppShell>
    <div class="msg-layout">
      <!-- Sidebar -->
      <aside class="msg-sidebar">
        <div class="sidebar-hdr">
          <span>💬 站內訊息</span>
          <button class="btn-xs" @click="openCreateGroup">＋群組</button>
        </div>

        <!-- Start DM with user -->
        <div class="dm-users">
          <button v-for="u in otherUsers" :key="u.id" class="dm-btn" @click="startDM(u.id)">
            {{ u.name }}
          </button>
        </div>

        <!-- Room list -->
        <div class="room-list">
          <div
            v-for="room in sortedRooms" :key="room.id"
            :class="['room-item', activeRoomId === room.id ? 'active' : '']"
            @click="openRoom(room.id)"
          >
            <div class="room-av">{{ room.isGroup ? '👥' : initials(otherMember(room)?.name ?? '?') }}</div>
            <div class="room-info">
              <div class="room-name">{{ room.isGroup ? (room.groupName ?? '群組') : (otherMember(room)?.name ?? '未知') }}</div>
              <div class="room-last">{{ (room.lastMsg ?? '點擊開始對話').slice(0, 26) }}</div>
            </div>
            <span v-if="unreadCount(room.id)" class="unread-dot">{{ unreadCount(room.id) }}</span>
          </div>
          <div v-if="!sortedRooms.length" class="room-empty">尚無對話<br>點上方人員開始聊天</div>
        </div>
      </aside>

      <!-- Chat thread -->
      <main class="chat-main">
        <template v-if="activeRoom">
          <!-- Header -->
          <div class="chat-header">
            <div class="chat-av">{{ activeRoom.isGroup ? '👥' : initials(otherMember(activeRoom)?.name ?? '?') }}</div>
            <div>
              <div class="chat-name">{{ activeRoom.isGroup ? (activeRoom.groupName ?? '群組') : (otherMember(activeRoom)?.name ?? '') }}</div>
              <div class="chat-sub">{{ activeRoom.members.length }} 位成員</div>
            </div>
          </div>

          <!-- Messages -->
          <div ref="msgContainer" class="chat-messages">
            <template v-for="(msg, idx) in threadMsgs" :key="msg.id">
              <div v-if="showDateSep(msg, idx)" class="date-sep">{{ formatDate(msg.ts) }}</div>
              <div :class="['bubble-row', msg.from === currentUserId ? 'mine' : '']">
                <div v-if="msg.from !== currentUserId" class="bubble-av">{{ initials(senderName(msg.from)) }}</div>
                <div class="bubble-wrap">
                  <div v-if="!isMine(msg) && (activeRoom.isGroup || idx === 0 || threadMsgs[idx-1]?.from !== msg.from)" class="bubble-sender">{{ senderName(msg.from) }}</div>
                  <div :class="['bubble', isMine(msg) ? 'bubble-mine' : 'bubble-other']">
                    <span v-if="msg.deleted" class="deleted-msg">此訊息已刪除</span>
                    <span v-else>{{ msg.text }}</span>
                    <span class="bubble-time">{{ formatTime(msg.ts) }}<span v-if="isMine(msg)" class="receipt">{{ isRead(msg) ? ' ✓✓' : ' ✓' }}</span></span>
                  </div>
                  <div v-if="isMine(msg) && !msg.deleted" class="msg-actions">
                    <button class="action-del" @click="deleteMsg(msg)">×</button>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Input -->
          <div class="chat-input-bar">
            <input
              ref="inputEl" v-model="inputText"
              class="chat-input" placeholder="說點什麼吧 ✨"
              @keydown.enter.exact.prevent="send"
            />
            <button class="send-btn" :disabled="!inputText.trim()" @click="send">
              ▶
            </button>
          </div>
        </template>

        <div v-else class="chat-empty">
          <div class="empty-icon">💬</div>
          <p>選個人開始聊天吧 ✨<br><span>點上方名字或左側對話</span></p>
        </div>
      </main>
    </div>

    <!-- Create group modal -->
    <Teleport to="body">
      <div v-if="groupModal.open" class="modal-backdrop" @click.self="groupModal.open = false">
        <div class="modal">
          <h2>建立群組</h2>
          <div class="form-row"><label>群組名稱</label><input v-model="groupModal.name" placeholder="群組名稱" /></div>
          <div class="form-row">
            <label>選擇成員</label>
            <div class="member-checkboxes">
              <label v-for="u in otherUsers" :key="u.id" class="checkbox-row">
                <input v-model="groupModal.members" type="checkbox" :value="u.id" />
                {{ u.name }}
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="groupModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!groupModal.name.trim() || groupModal.members.length === 0" @click="createGroup">建立</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { ChatRoom, Message } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const otherUsers = computed(() => users.value.filter((u) => u.id !== currentUserId.value))
const rooms = computed(() => rtdb.store?.chatRooms ?? [])
const messages = computed(() => rtdb.store?.messages ?? [])

const activeRoomId = ref('')
const inputText = ref('')
const msgContainer = ref<HTMLElement>()
const inputEl = ref<HTMLInputElement>()

function initials(name: string) { return name?.slice(0, 1) ?? '?' }
function senderName(id: string) { return users.value.find((u) => u.id === id)?.name ?? '?' }
function isMine(msg: Message) { return msg.from === currentUserId.value }

const myRooms = computed(() => rooms.value.filter((r) => r.members.includes(currentUserId.value)))
const sortedRooms = computed(() => [...myRooms.value].sort((a, b) => (b.lastTs ?? '').localeCompare(a.lastTs ?? '')))
const activeRoom = computed(() => rooms.value.find((r) => r.id === activeRoomId.value))
const threadMsgs = computed(() =>
  [...messages.value.filter((m) => m.roomId === activeRoomId.value)].sort((a, b) => a.ts.localeCompare(b.ts))
)

function otherMember(room: ChatRoom) {
  const otherId = room.members.find((id) => id !== currentUserId.value)
  return users.value.find((u) => u.id === otherId)
}
function unreadCount(roomId: string) {
  return messages.value.filter((m) => m.roomId === roomId && m.to === currentUserId.value && !m.deleted && !m.reads?.[currentUserId.value]).length
}
function isRead(msg: Message) {
  if (!activeRoom.value) return false
  return activeRoom.value.members.filter((id) => id !== currentUserId.value).some((id) => msg.reads?.[id])
}

function formatTime(ts: string) { return ts?.slice(11, 16) ?? '' }
function formatDate(ts: string) {
  if (!ts) return ''
  const d = new Date(ts.replace(' ', 'T'))
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function showDateSep(msg: Message, idx: number) {
  if (idx === 0) return true
  return threadMsgs.value[idx - 1]?.ts?.slice(0, 10) !== msg.ts?.slice(0, 10)
}

function now() {
  const d = new Date()
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

function getOrCreateDM(otherId: string): ChatRoom {
  const existing = rooms.value.find((r) => !r.isGroup && r.members.includes(currentUserId.value) && r.members.includes(otherId))
  if (existing) return existing
  if (!rtdb.store) throw new Error('no store')
  if (!rtdb.store.chatRooms) rtdb.store.chatRooms = []
  const room: ChatRoom = { id: rtdb.uid(), members: [currentUserId.value, otherId] }
  rtdb.store.chatRooms.push(room)
  rtdb.save()
  return room
}

function startDM(otherId: string) {
  const room = getOrCreateDM(otherId)
  openRoom(room.id)
}

function openRoom(roomId: string) {
  activeRoomId.value = roomId
  // mark messages as read
  messages.value.forEach((m) => {
    if (m.roomId === roomId && m.to === currentUserId.value && !m.reads?.[currentUserId.value]) {
      if (!m.reads) m.reads = {}
      m.reads[currentUserId.value] = true
    }
  })
  rtdb.save()
  nextTick(() => {
    if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight
    inputEl.value?.focus()
  })
}

function send() {
  if (!inputText.value.trim() || !activeRoom.value || !rtdb.store) return
  if (!rtdb.store.messages) rtdb.store.messages = []
  const isGroup = activeRoom.value.isGroup
  const to = isGroup ? undefined : activeRoom.value.members.find((id) => id !== currentUserId.value)
  const msg: Message = { id: rtdb.uid(), roomId: activeRoomId.value, from: currentUserId.value, to, text: inputText.value.trim(), ts: now() }
  rtdb.store.messages.push(msg)
  // update room lastMsg/lastTs
  const room = rtdb.store.chatRooms.find((r) => r.id === activeRoomId.value)
  if (room) { room.lastMsg = inputText.value.trim(); room.lastTs = msg.ts }
  inputText.value = ''
  rtdb.save()
  nextTick(() => { if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight })
}

function deleteMsg(msg: Message) {
  if (!confirm('確定刪除此訊息？')) return
  msg.deleted = true; msg.text = undefined
  rtdb.save()
}

const groupModal = reactive({ open: false, name: '', members: [] as string[] })
function openCreateGroup() { Object.assign(groupModal, { open: true, name: '', members: [] }) }
function createGroup() {
  if (!groupModal.name.trim() || !rtdb.store) return
  if (!rtdb.store.chatRooms) rtdb.store.chatRooms = []
  const room: ChatRoom = { id: rtdb.uid(), isGroup: true, groupName: groupModal.name.trim(), members: [currentUserId.value, ...groupModal.members] }
  rtdb.store.chatRooms.push(room)
  rtdb.save(); groupModal.open = false
  openRoom(room.id)
}

watch(activeRoomId, () => {
  nextTick(() => { if (msgContainer.value) msgContainer.value.scrollTop = msgContainer.value.scrollHeight })
})
</script>

<style scoped>
.msg-layout { display: flex; height: calc(100vh - 0px); overflow: hidden; }
.msg-sidebar { width: 220px; border-right: 1px solid #eee; display: flex; flex-direction: column; background: white; flex-shrink: 0; }
.sidebar-hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 12px 10px; border-bottom: 1px solid #eee; font-weight: 700; font-size: .9rem; color: #1a3c5e; }
.dm-users { padding: 8px 10px; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; gap: 5px; }
.dm-btn { background: #f0f7f4; border: none; border-radius: 99px; padding: 4px 10px; font-size: .75rem; color: #2e7d5a; cursor: pointer; }
.room-list { flex: 1; overflow-y: auto; padding: 6px; }
.room-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; cursor: pointer; }
.room-item:hover { background: #f5f5f5; }
.room-item.active { background: #e8f5ee; }
.room-av { width: 34px; height: 34px; border-radius: 50%; background: #2e7d5a; color: white; display: flex; align-items: center; justify-content: center; font-size: .85rem; font-weight: 700; flex-shrink: 0; }
.room-info { flex: 1; min-width: 0; }
.room-name { font-size: .85rem; font-weight: 600; color: #1a3c5e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.room-last { font-size: .72rem; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unread-dot { background: #c0392b; color: white; border-radius: 99px; font-size: .7rem; padding: 2px 6px; font-weight: 700; flex-shrink: 0; }
.room-empty { text-align: center; padding: 24px 12px; font-size: .8rem; color: #bbb; line-height: 1.8; }
.chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.chat-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid #eee; background: white; }
.chat-av { width: 36px; height: 36px; border-radius: 50%; background: #2e7d5a; color: white; display: flex; align-items: center; justify-content: center; font-size: .9rem; font-weight: 700; flex-shrink: 0; }
.chat-name { font-weight: 700; color: #1a3c5e; font-size: .95rem; }
.chat-sub { font-size: .72rem; color: #aaa; }
.chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.date-sep { text-align: center; font-size: .72rem; color: #aaa; margin: 8px 0; }
.bubble-row { display: flex; align-items: flex-end; gap: 6px; }
.bubble-row.mine { flex-direction: row-reverse; }
.bubble-av { width: 28px; height: 28px; border-radius: 50%; background: #888; color: white; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; flex-shrink: 0; }
.bubble-wrap { display: flex; flex-direction: column; max-width: 60%; }
.bubble-row.mine .bubble-wrap { align-items: flex-end; }
.bubble-sender { font-size: .7rem; color: #888; margin-bottom: 2px; }
.bubble { padding: 8px 12px; border-radius: 14px; font-size: .88rem; line-height: 1.5; position: relative; word-break: break-word; }
.bubble-mine { background: #2e7d5a; color: white; border-bottom-right-radius: 4px; }
.bubble-other { background: white; border: 1px solid #eee; color: #333; border-bottom-left-radius: 4px; }
.bubble-time { font-size: .65rem; opacity: .7; margin-left: 6px; white-space: nowrap; }
.receipt { font-size: .65rem; }
.deleted-msg { font-style: italic; opacity: .65; }
.msg-actions { display: flex; gap: 4px; margin-top: 2px; opacity: 0; transition: opacity .15s; }
.bubble-wrap:hover .msg-actions { opacity: 1; }
.action-del { background: none; border: none; color: #e74c3c; cursor: pointer; font-size: .8rem; padding: 0 4px; }
.chat-input-bar { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid #eee; background: white; }
.chat-input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 8px 14px; font-size: .88rem; outline: none; }
.send-btn { background: #2e7d5a; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 1rem; cursor: pointer; flex-shrink: 0; }
.send-btn:disabled { opacity: .4; cursor: not-allowed; }
.chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #aaa; text-align: center; }
.empty-icon { font-size: 3rem; margin-bottom: 12px; }
.chat-empty p { font-size: .9rem; line-height: 1.8; }
.chat-empty span { font-size: .8rem; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 99px; padding: 4px 10px; font-size: .75rem; cursor: pointer; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; }
.member-checkboxes { display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; padding: 8px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: .85rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
