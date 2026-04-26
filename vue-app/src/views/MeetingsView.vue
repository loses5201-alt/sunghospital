<template>
  <AppShell>
    <div class="page">

      <!-- Detail view -->
      <template v-if="detailId">
        <button class="btn-back" @click="detailId = ''">← 會議列表</button>
        <MeetingDetail v-if="activeMeeting" :meeting="activeMeeting" :users="users" :current-user-id="currentUserId" :is-admin="auth.isAdmin" @save="() => rtdb.saveCollection('meetings', rtdb.store!.meetings)" @delete="deleteMeeting" />
      </template>

      <!-- List view -->
      <template v-else>
        <div class="page-header">
          <div><h1>會議記錄</h1><div class="page-meta">院務會議 · 任務追蹤 · 投票</div></div>
          <button v-if="auth.isManager" class="btn-primary" @click="openNew">＋ 新增會議</button>
        </div>

        <div v-if="meetings.length" class="meeting-list">
          <div v-for="m in meetings" :key="m.id" class="meeting-card" @click="detailId = m.id">
            <div class="meeting-info">
              <div class="meeting-title">{{ m.title }}</div>
              <div class="meeting-meta">{{ m.date }} · {{ m.attendeeIds?.length ?? 0 }} 位與會者</div>
            </div>
            <div class="meeting-right">
              <span :class="['status-chip', `status-${m.status}`]">{{ statusLabel(m.status) }}</span>
              <div class="meeting-counts">
                <span>📋 {{ m.tasks?.length ?? 0 }}</span>
                <span>💬 {{ m.chat?.length ?? 0 }}</span>
                <span>🗳 {{ m.votes?.length ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">📋</div>
          <div>尚無會議記錄</div>
          <button v-if="auth.isManager" class="btn-primary" style="margin-top:12px" @click="openNew">新增第一場會議</button>
        </div>
      </template>
    </div>

    <!-- New meeting modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>新增會議</h2>
          <div class="form-row"><label>會議主題</label><input v-model="modal.title" placeholder="會議名稱" /></div>
          <div class="form-grid">
            <div class="form-row"><label>日期</label><input v-model="modal.date" type="date" /></div>
            <div class="form-row">
              <label>狀態</label>
              <select v-model="modal.status">
                <option value="upcoming">即將舉行</option>
                <option value="ongoing">進行中</option>
                <option value="done">已完成</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label>與會成員</label>
            <div class="member-checkboxes">
              <label v-for="u in users" :key="u.id" class="checkbox-row">
                <input v-model="modal.attendeeIds" type="checkbox" :value="u.id" />
                {{ u.name }}
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.title.trim()" @click="createMeeting">建立</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { todayStr } from '../utils/date'
import AppShell from '../components/layout/AppShell.vue'
import MeetingDetail from '../components/meetings/MeetingDetail.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'

const rtdb = useRtdbStore()
const auth = useAuthStore()
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const meetings = computed(() => [...(rtdb.store?.meetings ?? [])].sort((a, b) => b.date.localeCompare(a.date)))
const detailId = ref('')
const activeMeeting = computed(() => meetings.value.find((m) => m.id === detailId.value))

function statusLabel(s: string) { return { upcoming: '即將舉行', ongoing: '進行中', done: '已完成' }[s] ?? s }

const modal = reactive({ open: false, title: '', date: todayStr(), status: 'upcoming', attendeeIds: [] as string[] })
function openNew() { Object.assign(modal, { open: true, title: '', date: todayStr(), status: 'upcoming', attendeeIds: [] }) }
function createMeeting() {
  if (!modal.title.trim() || !rtdb.store) return
  if (!rtdb.store.meetings) rtdb.store.meetings = []
  rtdb.store.meetings.unshift({
    id: rtdb.uid(), title: modal.title.trim(), date: modal.date, status: modal.status,
    attendeeIds: [...modal.attendeeIds], tasks: [], chat: [], votes: [],
  })
  rtdb.saveCollection('meetings', rtdb.store!.meetings); modal.open = false
}
function deleteMeeting(id: string) {
  if (!rtdb.store) return
  rtdb.store.meetings = rtdb.store.meetings.filter((m) => m.id !== id)
  rtdb.saveCollection('meetings', rtdb.store!.meetings)
  detailId.value = ''
}
</script>

<style scoped>
.page { padding: 24px; }
.btn-back { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 6px; padding: 6px 14px; font-size: .85rem; cursor: pointer; margin-bottom: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.meeting-list { display: flex; flex-direction: column; gap: 10px; }
.meeting-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: box-shadow .15s; }
.meeting-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
.meeting-info { flex: 1; }
.meeting-title { font-weight: 700; color: #1a3c5e; font-size: .95rem; margin-bottom: 3px; }
.meeting-meta { font-size: .78rem; color: #888; }
.meeting-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.status-chip { font-size: .72rem; padding: 3px 8px; border-radius: 99px; font-weight: 700; }
.status-upcoming { background: #dbeafe; color: #1e40af; }
.status-ongoing { background: #d1fae5; color: #065f46; }
.status-done { background: #f5f5f5; color: #888; }
.meeting-counts { display: flex; gap: 10px; font-size: .75rem; color: #aaa; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 360px; max-width: 560px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.member-checkboxes { border: 1px solid #eee; border-radius: 6px; padding: 8px; max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: .85rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
