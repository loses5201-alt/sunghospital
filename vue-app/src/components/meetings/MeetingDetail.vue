<template>
  <div class="meeting-detail">
    <!-- Header -->
    <div class="detail-header">
      <div>
        <h2>{{ meeting.title }}</h2>
        <div class="detail-meta">{{ meeting.date }} · {{ meeting.attendeeIds?.length ?? 0 }} 位與會者</div>
      </div>
      <div v-if="isAdmin" class="header-actions">
        <button class="btn-sm danger" @click="deleteMeeting">刪除</button>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="stats-bar">
      <div class="stat"><div class="stat-n">{{ meeting.tasks?.length ?? 0 }}</div><div class="stat-l">總任務</div></div>
      <div class="stat"><div class="stat-n green">{{ doneTasks }}</div><div class="stat-l">已完成</div></div>
      <div class="stat"><div class="stat-n amber">{{ ipTasks }}</div><div class="stat-l">進行中</div></div>
      <div class="stat"><div class="stat-n">{{ todoTasks }}</div><div class="stat-l">待辦</div></div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button v-for="t in TABS" :key="t.key" :class="['tab', activeTab === t.key ? 'active' : '']" @click="activeTab = t.key">
        {{ t.label }}<span v-if="t.count" class="tab-cnt">{{ t.count }}</span>
      </button>
    </div>

    <!-- Notes tab -->
    <div v-if="activeTab === 'notes'" class="tab-content">
      <div class="sec-label">與會成員</div>
      <div class="attendees">
        <div v-for="uid in meeting.attendeeIds" :key="uid" class="attendee-chip">
          <strong>{{ userName(uid) }}</strong>
          <span :class="['read-dot', meeting.reads?.[uid]?.read ? 'read' : 'unread']" />
        </div>
      </div>
      <div class="notes-section">
        <div class="sec-label-row">
          <span class="sec-label">會議摘要</span>
          <button v-if="!editingNotes" class="btn-xs" @click="editingNotes = true; notesDraft = meeting.notes ?? ''">✏️ 編輯</button>
          <button v-else class="btn-xs" @click="saveNotes">儲存</button>
        </div>
        <textarea v-if="editingNotes" v-model="notesDraft" rows="6" class="notes-ta" />
        <div v-else class="notes-body">{{ meeting.notes || '（尚無摘要）' }}</div>
      </div>
      <div v-if="!meeting.reads?.[currentUserId]?.read" class="read-action">
        <button class="btn-primary" @click="markRead">✓ 標示已讀</button>
      </div>
      <div v-else class="read-done">✓ 已讀</div>
    </div>

    <!-- Tasks tab -->
    <div v-if="activeTab === 'tasks'" class="tab-content">
      <div class="tasks-header">
        <button class="btn-primary btn-sm" @click="openAddTask">＋ 新增任務</button>
      </div>
      <div v-if="tasks.length" class="task-list">
        <div v-for="task in tasks" :key="task.id" class="task-card">
          <div class="task-info">
            <div class="task-title">{{ task.title }}</div>
            <div class="task-meta">
              <span v-if="task.assigneeId">負責：{{ userName(task.assigneeId) }}</span>
              <span v-if="task.dueDate">截止：{{ task.dueDate }}</span>
            </div>
          </div>
          <div class="task-right">
            <select :value="task.status" class="status-sel" @change="updateTaskStatus(task, ($event.target as HTMLSelectElement).value as MeetingTask['status'])">
              <option value="待辦">待辦</option>
              <option value="進行中">進行中</option>
              <option value="已完成">已完成</option>
            </select>
            <button v-if="isAdmin" class="btn-xs danger" @click="deleteTask(task.id)">×</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">尚無任務</div>
    </div>

    <!-- Chat tab -->
    <div v-if="activeTab === 'chat'" class="tab-content">
      <div ref="chatContainer" class="chat-msgs">
        <div v-for="msg in meeting.chat ?? []" :key="msg.id" :class="['chat-row', msg.userId === currentUserId ? 'mine' : '']">
          <div :class="['bubble', msg.userId === currentUserId ? 'bubble-mine' : 'bubble-other']">
            <div class="bubble-sender">{{ userName(msg.userId) }}</div>
            <div>{{ msg.text }}</div>
            <div class="bubble-time">{{ msg.createdAt?.slice(5, 16).replace('-', '/') }}</div>
          </div>
        </div>
      </div>
      <div class="chat-input">
        <input v-model="chatText" placeholder="發送訊息…" @keydown.enter.exact.prevent="sendChat" />
        <button class="btn-primary btn-sm" :disabled="!chatText.trim()" @click="sendChat">送出</button>
      </div>
    </div>

    <!-- Votes tab -->
    <div v-if="activeTab === 'votes'" class="tab-content">
      <div v-if="isAdmin" class="votes-header">
        <button class="btn-primary btn-sm" @click="openAddVote">＋ 新增投票</button>
      </div>
      <div v-if="(meeting.votes ?? []).length" class="vote-list">
        <div v-for="vote in meeting.votes" :key="vote.id" class="vote-card">
          <div class="vote-q">{{ vote.question }}</div>
          <div class="vote-options">
            <div v-for="opt in vote.options" :key="opt.id" class="vote-opt">
              <div class="opt-bar-wrap">
                <div class="opt-bar" :style="{ width: voteBarWidth(vote, opt) + '%' }" />
              </div>
              <span class="opt-text">{{ opt.text }}</span>
              <span class="opt-count">{{ opt.votes?.length ?? 0 }}</span>
              <button v-if="!vote.closed" :class="['vote-btn', hasVoted(opt) ? 'voted' : '']" @click="castVote(vote, opt)">
                {{ hasVoted(opt) ? '✓' : '投票' }}
              </button>
            </div>
          </div>
          <div v-if="isAdmin && !vote.closed">
            <button class="btn-xs" @click="closeVote(vote)">關閉投票</button>
          </div>
          <div v-if="vote.closed" class="vote-closed">投票已結束</div>
        </div>
      </div>
      <div v-else class="empty-hint">尚無投票</div>
    </div>

    <!-- Progress tab -->
    <div v-if="activeTab === 'progress'" class="tab-content">
      <div class="progress-wrap">
        <div class="progress-label">任務完成率</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" :style="{ width: taskProgress + '%' }" />
        </div>
        <div class="progress-pct">{{ taskProgress }}%</div>
      </div>
      <div class="task-status-breakdown">
        <div v-for="{ label, count, cls } in taskBreakdown" :key="label" class="breakdown-item">
          <span :class="['breakdown-dot', cls]" />
          <span>{{ label }}: {{ count }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Task modal -->
  <Teleport to="body">
    <div v-if="taskModal.open" class="modal-backdrop" @click.self="taskModal.open = false">
      <div class="modal">
        <h2>新增任務</h2>
        <div class="form-row"><label>任務名稱</label><input v-model="taskModal.title" /></div>
        <div class="form-grid">
          <div class="form-row">
            <label>負責人</label>
            <select v-model="taskModal.assigneeId">
              <option value="">（未指定）</option>
              <option v-for="uid in meeting.attendeeIds" :key="uid" :value="uid">{{ userName(uid) }}</option>
            </select>
          </div>
          <div class="form-row"><label>截止日期</label><input v-model="taskModal.dueDate" type="date" /></div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="taskModal.open = false">取消</button>
          <button class="btn-primary" :disabled="!taskModal.title.trim()" @click="saveTask">新增</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Vote modal -->
  <Teleport to="body">
    <div v-if="voteModal.open" class="modal-backdrop" @click.self="voteModal.open = false">
      <div class="modal">
        <h2>新增投票</h2>
        <div class="form-row"><label>投票問題</label><input v-model="voteModal.question" /></div>
        <div class="form-row">
          <label>選項（每行一個）</label>
          <textarea v-model="voteModal.options" rows="4" placeholder="選項 A&#10;選項 B&#10;選項 C" />
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="voteModal.open = false">取消</button>
          <button class="btn-primary" :disabled="!voteModal.question.trim()" @click="saveVote">新增</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import type { Meeting, MeetingTask, MeetingVote, VoteOption, User } from '../../types'

const props = defineProps<{
  meeting: Meeting
  users: User[]
  currentUserId: string
  isAdmin: boolean
}>()
const emit = defineEmits<{ save: []; delete: [string] }>()

const TABS = computed(() => [
  { key: 'notes', label: '紀錄摘要', count: 0 },
  { key: 'tasks', label: '任務', count: props.meeting.tasks?.length || 0 },
  { key: 'progress', label: '進度', count: 0 },
  { key: 'chat', label: '討論', count: props.meeting.chat?.length || 0 },
  { key: 'votes', label: '投票', count: props.meeting.votes?.length || 0 },
])

const activeTab = ref('notes')
const editingNotes = ref(false)
const notesDraft = ref('')
const chatText = ref('')
const chatContainer = ref<HTMLElement>()

function userName(id: string) { return props.users.find((u) => u.id === id)?.name ?? '未知' }

const tasks = computed(() => props.meeting.tasks ?? [])
const doneTasks = computed(() => tasks.value.filter((t) => t.status === '已完成').length)
const ipTasks = computed(() => tasks.value.filter((t) => t.status === '進行中').length)
const todoTasks = computed(() => tasks.value.filter((t) => t.status === '待辦').length)
const taskProgress = computed(() => tasks.value.length ? Math.round(doneTasks.value / tasks.value.length * 100) : 0)
const taskBreakdown = computed(() => [
  { label: '已完成', count: doneTasks.value, cls: 'dot-green' },
  { label: '進行中', count: ipTasks.value, cls: 'dot-amber' },
  { label: '待辦', count: todoTasks.value, cls: 'dot-gray' },
])

function saveNotes() {
  props.meeting.notes = notesDraft.value
  editingNotes.value = false
  emit('save')
}
function markRead() {
  if (!props.meeting.reads) props.meeting.reads = {}
  props.meeting.reads[props.currentUserId] = { read: true, at: new Date().toISOString() }
  emit('save')
}
function deleteMeeting() {
  if (!confirm('確定刪除此會議？')) return
  emit('delete', props.meeting.id)
}

// Tasks
const taskModal = reactive({ open: false, title: '', assigneeId: '', dueDate: '' })
function openAddTask() { Object.assign(taskModal, { open: true, title: '', assigneeId: '', dueDate: '' }) }
function saveTask() {
  if (!taskModal.title.trim()) return
  if (!props.meeting.tasks) props.meeting.tasks = []
  props.meeting.tasks.push({ id: crypto.randomUUID().slice(0, 16), title: taskModal.title.trim(), status: '待辦', assigneeId: taskModal.assigneeId || undefined, dueDate: taskModal.dueDate || undefined })
  emit('save'); taskModal.open = false
}
function updateTaskStatus(task: MeetingTask, status: MeetingTask['status']) { task.status = status; emit('save') }
function deleteTask(id: string) { props.meeting.tasks = props.meeting.tasks.filter((t) => t.id !== id); emit('save') }

// Chat
function sendChat() {
  if (!chatText.value.trim()) return
  if (!props.meeting.chat) props.meeting.chat = []
  props.meeting.chat.push({ id: crypto.randomUUID().slice(0, 16), userId: props.currentUserId, text: chatText.value.trim(), createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ') })
  chatText.value = ''; emit('save')
  nextTick(() => { if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight })
}

// Votes
const voteModal = reactive({ open: false, question: '', options: '' })
function openAddVote() { Object.assign(voteModal, { open: true, question: '', options: '' }) }
function saveVote() {
  if (!voteModal.question.trim()) return
  if (!props.meeting.votes) props.meeting.votes = []
  const opts = voteModal.options.split('\n').map((s) => s.trim()).filter(Boolean)
    .map((text) => ({ id: crypto.randomUUID().slice(0, 8), text, votes: [] }))
  props.meeting.votes.push({ id: crypto.randomUUID().slice(0, 16), question: voteModal.question.trim(), options: opts })
  emit('save'); voteModal.open = false
}
function hasVoted(opt: VoteOption) { return (opt.votes ?? []).includes(props.currentUserId) }
function voteBarWidth(vote: MeetingVote, opt: VoteOption) {
  const total = vote.options.reduce((s, o) => s + (o.votes?.length ?? 0), 0)
  return total ? Math.round((opt.votes?.length ?? 0) / total * 100) : 0
}
function castVote(vote: MeetingVote, opt: VoteOption) {
  if (vote.closed) return
  if (!opt.votes) opt.votes = []
  const i = opt.votes.indexOf(props.currentUserId)
  if (i >= 0) opt.votes.splice(i, 1)
  else {
    vote.options.forEach((o) => { if (o.id !== opt.id) o.votes = (o.votes ?? []).filter((id) => id !== props.currentUserId) })
    opt.votes.push(props.currentUserId)
  }
  emit('save')
}
function closeVote(vote: MeetingVote) { vote.closed = true; emit('save') }
</script>

<style scoped>
.meeting-detail { padding: 0; }
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.detail-header h2 { font-size: 1.2rem; margin: 0 0 4px; color: #1a3c5e; }
.detail-meta { font-size: .8rem; color: #888; }
.header-actions { display: flex; gap: 6px; }
.stats-bar { display: flex; gap: 20px; background: white; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.stat { text-align: center; }
.stat-n { font-size: 1.4rem; font-weight: 800; color: #1a3c5e; }
.stat-n.green { color: #2e7d5a; }
.stat-n.amber { color: #e67e22; }
.stat-l { font-size: .72rem; color: #aaa; }
.tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 14px; gap: 0; }
.tab { background: none; border: none; padding: 9px 14px; font-size: .85rem; cursor: pointer; color: #888; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #1a3c5e; border-bottom-color: #1a3c5e; font-weight: 700; }
.tab-cnt { background: #f0f0f0; border-radius: 99px; font-size: .65rem; padding: 1px 5px; margin-left: 4px; }
.tab-content { min-height: 200px; }
.sec-label { font-size: .72rem; color: #aaa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
.sec-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.attendees { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.attendee-chip { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #eee; border-radius: 20px; padding: 5px 10px; font-size: .82rem; }
.read-dot { width: 7px; height: 7px; border-radius: 50%; }
.read-dot.read { background: #2e7d5a; }
.read-dot.unread { background: #ddd; }
.notes-ta { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 8px; padding: 10px; font-family: inherit; font-size: .88rem; resize: vertical; }
.notes-body { font-size: .88rem; color: #444; line-height: 1.8; white-space: pre-wrap; background: #f8f8f8; border-radius: 8px; padding: 12px 14px; }
.read-action { margin-top: 14px; }
.read-done { font-size: .82rem; color: #2e7d5a; font-weight: 700; margin-top: 10px; }
.tasks-header { margin-bottom: 12px; }
.task-list { display: flex; flex-direction: column; gap: 8px; }
.task-card { background: white; border: 1px solid #eee; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
.task-info { flex: 1; }
.task-title { font-size: .88rem; font-weight: 600; color: #1a3c5e; }
.task-meta { font-size: .75rem; color: #888; display: flex; gap: 10px; margin-top: 2px; }
.task-right { display: flex; align-items: center; gap: 6px; }
.status-sel { border: 1px solid #ddd; border-radius: 5px; padding: 4px 6px; font-size: .78rem; }
.chat-msgs { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.chat-row { display: flex; }
.chat-row.mine { justify-content: flex-end; }
.bubble { max-width: 70%; padding: 8px 12px; border-radius: 12px; font-size: .85rem; }
.bubble-mine { background: #2e7d5a; color: white; }
.bubble-other { background: #f0f0f0; color: #333; }
.bubble-sender { font-size: .7rem; opacity: .7; margin-bottom: 2px; }
.bubble-time { font-size: .65rem; opacity: .6; margin-top: 3px; }
.chat-input { display: flex; gap: 8px; }
.chat-input input { flex: 1; border: 1px solid #ddd; border-radius: 20px; padding: 7px 12px; font-size: .85rem; }
.votes-header { margin-bottom: 12px; }
.vote-list { display: flex; flex-direction: column; gap: 14px; }
.vote-card { background: white; border: 1px solid #eee; border-radius: 10px; padding: 14px 16px; }
.vote-q { font-weight: 700; color: #1a3c5e; margin-bottom: 10px; }
.vote-options { display: flex; flex-direction: column; gap: 6px; }
.vote-opt { display: flex; align-items: center; gap: 8px; }
.opt-bar-wrap { width: 80px; height: 6px; background: #eee; border-radius: 99px; flex-shrink: 0; }
.opt-bar { height: 100%; background: #2e7d5a; border-radius: 99px; transition: width .4s; }
.opt-text { flex: 1; font-size: .85rem; }
.opt-count { font-size: .78rem; color: #888; min-width: 20px; text-align: center; }
.vote-btn { background: #f0f7f4; border: 1px solid #2e7d5a; color: #2e7d5a; border-radius: 5px; padding: 3px 8px; font-size: .75rem; cursor: pointer; }
.vote-btn.voted { background: #2e7d5a; color: white; }
.vote-closed { font-size: .75rem; color: #aaa; margin-top: 8px; }
.progress-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.progress-label { font-size: .82rem; color: #888; min-width: 70px; }
.progress-bar-wrap { flex: 1; height: 8px; background: #eee; border-radius: 99px; }
.progress-bar { height: 100%; background: #2e7d5a; border-radius: 99px; transition: width .4s; }
.progress-pct { font-size: .88rem; font-weight: 700; color: #2e7d5a; min-width: 35px; }
.task-status-breakdown { display: flex; gap: 20px; }
.breakdown-item { display: flex; align-items: center; gap: 6px; font-size: .85rem; }
.breakdown-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-green { background: #2e7d5a; }
.dot-amber { background: #e67e22; }
.dot-gray { background: #aaa; }
.empty-hint { padding: 20px; text-align: center; color: #aaa; font-size: .85rem; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary.btn-sm { padding: 6px 12px; font-size: .8rem; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-sm { padding: 5px 10px; font-size: .8rem; border-radius: 5px; border: 1px solid #ddd; background: transparent; color: #555; cursor: pointer; }
.btn-sm.danger { color: #c0392b; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 3px 7px; font-size: .72rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 360px; max-width: 500px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
