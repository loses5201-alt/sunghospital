<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>產房即時狀態</h1><div class="page-meta">點擊更新狀態</div></div>
        <button v-if="auth.isAdmin" class="btn-sm" @click="openAddRoom">＋ 新增產房</button>
      </div>

      <!-- Summary bar -->
      <div class="summary-bar">
        <span v-for="(info, key) in RSTS" :key="key">
          <template v-if="countByStatus(key)">{{ info.i }} {{ info.l }} <strong>{{ countByStatus(key) }}</strong></template>
        </span>
      </div>

      <!-- Room grid -->
      <div class="room-grid">
        <div
          v-for="(room, i) in rooms" :key="room.id || i"
          :class="['rcard', RSTS[room.status ?? 'empty']?.rc ?? '']"
          @click="editRoom(i)"
        >
          <span class="room-icon">{{ RSTS[room.status ?? 'empty']?.i ?? '🚪' }}</span>
          <div class="room-name">{{ room.name }}</div>
          <span class="room-status-chip" :style="statusStyle(room.status)">{{ RSTS[room.status ?? 'empty']?.l ?? room.status }}</span>
          <div v-if="room.patient" class="room-patient">{{ room.patient }}</div>
          <div v-if="room.since" class="room-since">⏱ {{ room.since }}</div>
          <div v-if="room.note" class="room-note">{{ room.note }}</div>
        </div>
      </div>
    </div>

    <!-- Edit room modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>更新：{{ modal.name }}</h2>
          <div class="form-row">
            <label>狀態</label>
            <select v-model="modal.status">
              <option v-for="(info, key) in RSTS" :key="key" :value="key">{{ info.i }} {{ info.l }}</option>
            </select>
          </div>
          <div class="form-row"><label>病患（可匿名）</label><input v-model="modal.patient" /></div>
          <div class="form-row"><label>開始時間</label><input v-model="modal.since" /></div>
          <div class="form-row"><label>備註</label><input v-model="modal.note" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" @click="saveRoom">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add room modal -->
    <Teleport to="body">
      <div v-if="addModal.open" class="modal-backdrop" @click.self="addModal.open = false">
        <div class="modal">
          <h2>新增產房</h2>
          <div class="form-row"><label>產房名稱</label><input v-model="addModal.name" placeholder="例：產房 A1" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="addModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!addModal.name.trim()" @click="saveAddRoom">新增</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const RSTS: Record<string, { l: string; i: string; rc: string }> = {
  empty:    { l: '空房',   i: '🟢', rc: 'rs-empty'    },
  waiting:  { l: '待產中', i: '🟡', rc: 'rs-waiting'  },
  active:   { l: '生產中', i: '🔴', rc: 'rs-active'   },
  recovery: { l: '恢復中', i: '🔵', rc: 'rs-recovery' },
  cleaning: { l: '清潔中', i: '⚪', rc: 'rs-cleaning' },
}

const rooms = computed(() => rtdb.store?.rooms ?? [])
function countByStatus(status: string) { return rooms.value.filter((r) => (r.status ?? 'empty') === status).length }
function statusStyle(status?: string) {
  const s = status ?? 'empty'
  const colors: Record<string, { bg: string; color: string }> = {
    empty:    { bg: '#e8f7f0', color: '#2e7d5a' },
    waiting:  { bg: '#fdf0dc', color: '#8f5208' },
    active:   { bg: '#fce8e8', color: '#b03050' },
    recovery: { bg: '#e8f0fb', color: '#1558a0' },
    cleaning: { bg: '#f0f0f0', color: '#888'    },
  }
  const c = colors[s] ?? colors.empty
  return { background: c.bg, color: c.color }
}

const modal = reactive({ open: false, idx: -1, name: '', status: 'empty', patient: '', since: '', note: '' })
function editRoom(i: number) {
  const r = rooms.value[i]
  Object.assign(modal, { open: true, idx: i, name: r.name, status: r.status ?? 'empty', patient: r.patient ?? '', since: r.since ?? '', note: r.note ?? '' })
}
function saveRoom() {
  if (!rtdb.store || modal.idx < 0) return
  const r = rtdb.store.rooms[modal.idx]
  r.status = modal.status; r.patient = modal.patient; r.since = modal.since; r.note = modal.note
  rtdb.save(); modal.open = false
}

const addModal = reactive({ open: false, name: '' })
function openAddRoom() { addModal.name = ''; addModal.open = true }
function saveAddRoom() {
  if (!addModal.name.trim() || !rtdb.store) return
  if (!rtdb.store.rooms) rtdb.store.rooms = []
  rtdb.store.rooms.push({ id: rtdb.uid(), name: addModal.name.trim(), status: 'empty' })
  rtdb.save(); addModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.summary-bar { display: flex; flex-wrap: wrap; gap: 14px; background: white; border: 1px solid #eee; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; font-size: .85rem; color: #555; }
.room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.rcard { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 16px 12px; text-align: center; cursor: pointer; transition: box-shadow .15s; }
.rcard:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.rs-empty    { border-color: #d1fae5; }
.rs-waiting  { border-color: #fde68a; }
.rs-active   { border-color: #fca5a5; }
.rs-recovery { border-color: #bfdbfe; }
.rs-cleaning { border-color: #e5e7eb; }
.room-icon { font-size: 1.8rem; display: block; margin-bottom: 6px; }
.room-name { font-weight: 700; color: #1a3c5e; font-size: .9rem; margin-bottom: 5px; }
.room-status-chip { font-size: .72rem; padding: 2px 8px; border-radius: 99px; font-weight: 700; display: inline-block; margin-bottom: 5px; }
.room-patient { font-size: .75rem; color: #555; }
.room-since { font-size: .7rem; color: #aaa; margin-top: 3px; }
.room-note { font-size: .7rem; color: #aaa; }
.btn-sm { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .8rem; cursor: pointer; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 320px; max-width: 460px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
</style>
