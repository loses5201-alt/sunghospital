<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>交班紀錄</h1><div class="page-meta">早班 06:00 · 午班 14:00 · 夜班 22:00</div></div>
        <button class="btn-primary" @click="openNew">＋ 新增交班</button>
      </div>

      <!-- Metrics -->
      <div class="metrics">
        <div class="metric"><div class="m-num">{{ todayCount }}</div><div class="m-lbl">今日交班</div></div>
        <div class="metric"><div class="m-num" :class="pendingCount > 0 ? 'amber' : 'green'">{{ pendingCount }}</div><div class="m-lbl">待簽收</div></div>
        <div class="metric"><div class="m-num" :class="critCount > 0 ? 'red' : ''">{{ critCount }}</div><div class="m-lbl">🚨 警示未簽</div></div>
        <div class="metric"><div class="m-num">{{ shifts.length }}</div><div class="m-lbl">累計紀錄</div></div>
      </div>

      <!-- Search + filters -->
      <div class="controls">
        <input v-model="search" class="search-input" placeholder="🔍 搜尋病房單位..." />
        <div class="filter-chips">
          <button v-for="f in FILTERS" :key="f.key" :class="['chip', activeFilter === f.key ? 'active' : '']" @click="activeFilter = f.key">{{ f.label }}</button>
        </div>
      </div>

      <!-- Shift list -->
      <div v-if="filtered.length" class="shift-list">
        <div v-for="s in filtered" :key="s.id" :class="['shift-card', `urgency-${s.urgency}`]">
          <!-- Header -->
          <div class="sc-header">
            <span :class="['shift-badge', `shift-${s.shift}`]">{{ shiftLabel(s.shift) }}</span>
            <span class="sc-unit">{{ s.unit }}</span>
            <span class="sc-date">{{ s.date }}</span>
            <span :class="['sign-chip', s.toSigned ? 'signed' : 'pending']">
              {{ s.toSigned ? '✓ 完成交接' : '⏳ 待接班確認' }}
            </span>
            <span v-if="s.urgency !== 'normal'" :class="['urgency-chip', `urg-${s.urgency}`]">
              {{ s.urgency === 'critical' ? '🚨 警示' : '⚠️ 需關注' }}
            </span>
          </div>

          <!-- Safety flags -->
          <div v-if="s.flags?.length" class="sc-flags">
            <span v-for="f in s.flags" :key="f" class="flag-chip" :style="{ color: flagInfo(f)?.color }">
              {{ flagInfo(f)?.icon }} {{ flagInfo(f)?.label }}
            </span>
          </div>

          <!-- Main content grid -->
          <div class="sc-fields">
            <div v-if="s.patients" class="sc-field"><div class="field-lbl">🛏 病患狀況</div><div class="field-val">{{ s.patients }}</div></div>
            <div v-if="s.keyEvents" class="sc-field"><div class="field-lbl">⚠️ 本班重要事件</div><div class="field-val">{{ s.keyEvents }}</div></div>
            <div v-if="s.pending" class="sc-field"><div class="field-lbl">📋 待辦事項</div><div class="field-val">{{ s.pending }}</div></div>
            <div v-if="s.meds" class="sc-field"><div class="field-lbl">💊 用藥/點滴</div><div class="field-val">{{ s.meds }}</div></div>
          </div>
          <div v-if="s.labs" class="sc-labs"><span class="field-lbl">🧪 待追蹤檢驗：</span>{{ s.labs }}</div>

          <!-- Checklist -->
          <div v-if="s.checklist?.length" class="sc-checklist">
            <div v-for="item in s.checklist" :key="item.id" :class="['cl-item', item.done ? 'done' : '']">
              <input type="checkbox" :checked="item.done" @change="toggleChecklist(s, item)" />
              <span>{{ item.text }}</span>
            </div>
          </div>

          <!-- Sign row -->
          <div class="sc-sign-row">
            <span class="sign-info">交班：<strong>{{ userName(s.fromUserId) }}</strong></span>
            <span class="sign-info">接班：<strong>{{ userName(s.toUserId) }}</strong></span>
            <div class="sc-actions">
              <button v-if="canSign(s)" class="btn-primary btn-sm" @click="signShift(s)">✓ 我要簽收</button>
              <button v-if="!s.toSigned && (s.fromUserId === currentUserId || auth.isAdmin)" class="btn-xs" @click="openEdit(s)">✏ 編輯</button>
              <button v-if="auth.isAdmin" class="btn-xs danger" @click="deleteShift(s.id)">✕</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <div>{{ search || activeFilter !== 'all' ? '找不到符合的交班紀錄' : '尚無交班紀錄' }}</div>
        <button v-if="!search && activeFilter === 'all'" class="btn-primary" style="margin-top:12px" @click="openNew">新增第一筆交班</button>
      </div>
    </div>

    <!-- New/Edit modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯交班' : '新增交班紀錄' }}</h2>

          <div class="form-grid">
            <div class="form-row"><label>日期</label><input v-model="modal.date" type="date" /></div>
            <div class="form-row">
              <label>班別</label>
              <select v-model="modal.shift">
                <option value="morning">早班</option>
                <option value="afternoon">午班</option>
                <option value="night">夜班</option>
              </select>
            </div>
            <div class="form-row"><label>病房單位</label><input v-model="modal.unit" placeholder="例：產房A、新生兒室" /></div>
            <div class="form-row">
              <label>緊急等級</label>
              <select v-model="modal.urgency">
                <option value="normal">一般</option>
                <option value="watch">需關注</option>
                <option value="critical">警示</option>
              </select>
            </div>
            <div class="form-row">
              <label>交班護理師</label>
              <select v-model="modal.fromUserId">
                <option v-for="u in activeNurses" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>接班護理師</label>
              <select v-model="modal.toUserId">
                <option v-for="u in activeNurses" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </div>
          </div>

          <!-- Safety flags -->
          <div class="form-row">
            <label>安全旗標</label>
            <div class="flag-checks">
              <label v-for="f in SH_FLAGS" :key="f.id" class="checkbox-row">
                <input v-model="modal.flags" type="checkbox" :value="f.id" />
                <span>{{ f.icon }} {{ f.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-row"><label>🛏 病患狀況</label><textarea v-model="modal.patients" rows="2" /></div>
          <div class="form-row"><label>⚠️ 本班重要事件</label><textarea v-model="modal.keyEvents" rows="2" /></div>
          <div class="form-row"><label>📋 待辦事項</label><textarea v-model="modal.pending" rows="2" /></div>
          <div class="form-row"><label>💊 用藥/點滴</label><textarea v-model="modal.meds" rows="2" /></div>
          <div class="form-row"><label>🧪 待追蹤檢驗</label><input v-model="modal.labs" /></div>

          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.unit.trim() || !modal.fromUserId || !modal.toUserId" @click="save">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { ShiftHandover, ShiftChecklistItem } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const SH_FLAGS = [
  { id: 'npo',      label: '禁食 NPO',     icon: '🚫', color: '#e05a00' },
  { id: 'iso_c',    label: '接觸隔離',     icon: '🧤', color: '#1a7a3c' },
  { id: 'iso_d',    label: '飛沫隔離',     icon: '😷', color: '#1a7a3c' },
  { id: 'iso_a',    label: '空氣隔離',     icon: '💨', color: '#1a7a3c' },
  { id: 'fall',     label: '跌倒高風險',   icon: '⚠',  color: '#b06000' },
  { id: 'pressure', label: '壓傷照護',     icon: '🩹', color: '#904080' },
  { id: 'allergy',  label: '藥物過敏警示', icon: '💊', color: '#c00030' },
]

const FILTERS = [
  { key: 'all',       label: '全部' },
  { key: 'today',     label: '今日' },
  { key: 'pending',   label: '待簽收' },
  { key: 'critical',  label: '警示' },
  { key: 'mine',      label: '我的' },
]

const search = ref('')
const activeFilter = ref('all')
const today = new Date().toISOString().split('T')[0]
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const activeNurses = computed(() => users.value.filter((u) => u.status !== 'disabled' && u.status !== 'resigned'))
const shifts = computed(() => rtdb.store?.shifts ?? [])

const todayCount = computed(() => shifts.value.filter((s) => s.date === today).length)
const pendingCount = computed(() => shifts.value.filter((s) => !s.toSigned).length)
const critCount = computed(() => shifts.value.filter((s) => !s.toSigned && s.urgency === 'critical').length)

const filtered = computed(() => {
  let list = shifts.value
  if (search.value) list = list.filter((s) => s.unit?.toLowerCase().includes(search.value.toLowerCase()))
  switch (activeFilter.value) {
    case 'today': list = list.filter((s) => s.date === today); break
    case 'pending': list = list.filter((s) => !s.toSigned); break
    case 'critical': list = list.filter((s) => s.urgency === 'critical'); break
    case 'mine': list = list.filter((s) => s.fromUserId === currentUserId.value || s.toUserId === currentUserId.value); break
  }
  return [...list].sort((a, b) => b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0)
})

function userName(id?: string) { return users.value.find((u) => u.id === id)?.name ?? '未知' }
function shiftLabel(s: string) { return { morning: '早班', afternoon: '午班', night: '夜班' }[s] ?? s }
function flagInfo(id: string) { return SH_FLAGS.find((f) => f.id === id) }
function canSign(s: ShiftHandover) { return s.toUserId === currentUserId.value && !s.toSigned }

function signShift(s: ShiftHandover) {
  if (!confirm('確認已閱讀本次交班內容並完成接班？')) return
  s.toSigned = true; s.toSignedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
  rtdb.save()
}
function deleteShift(id: string) {
  if (!rtdb.store || !confirm('確定刪除此交班紀錄？')) return
  rtdb.store.shifts = (rtdb.store.shifts ?? []).filter((s) => s.id !== id)
  rtdb.save()
}
function toggleChecklist(_s: ShiftHandover, item: ShiftChecklistItem) {
  item.done = !item.done; rtdb.save()
}

type ModalState = {
  open: boolean; editId: string
  date: string; shift: string; unit: string; urgency: ShiftHandover['urgency']
  fromUserId: string; toUserId: string; flags: string[]
  patients: string; keyEvents: string; pending: string; meds: string; labs: string
}
const modal = reactive<ModalState>({
  open: false, editId: '', date: today, shift: 'morning', unit: '', urgency: 'normal',
  fromUserId: '', toUserId: '', flags: [],
  patients: '', keyEvents: '', pending: '', meds: '', labs: '',
})

function openNew() {
  Object.assign(modal, { open: true, editId: '', date: today, shift: 'morning', unit: '', urgency: 'normal', fromUserId: currentUserId.value, toUserId: '', flags: [], patients: '', keyEvents: '', pending: '', meds: '', labs: '' })
}
function openEdit(s: ShiftHandover) {
  Object.assign(modal, { open: true, editId: s.id, date: s.date, shift: s.shift, unit: s.unit, urgency: s.urgency, fromUserId: s.fromUserId, toUserId: s.toUserId, flags: [...(s.flags ?? [])], patients: s.patients ?? '', keyEvents: s.keyEvents ?? '', pending: s.pending ?? '', meds: s.meds ?? '', labs: s.labs ?? '' })
}
function save() {
  if (!modal.unit.trim() || !rtdb.store) return
  if (!rtdb.store.shifts) rtdb.store.shifts = []
  const data: ShiftHandover = {
    id: modal.editId || rtdb.uid(),
    date: modal.date, shift: modal.shift, unit: modal.unit.trim(),
    urgency: modal.urgency, fromUserId: modal.fromUserId, toUserId: modal.toUserId,
    flags: [...modal.flags],
    patients: modal.patients, keyEvents: modal.keyEvents, pending: modal.pending,
    meds: modal.meds, labs: modal.labs,
    fromSigned: modal.fromUserId === currentUserId.value,
    toSigned: false, createdAt: new Date().toISOString().split('T')[0],
  }
  if (modal.editId) {
    const idx = rtdb.store.shifts.findIndex((x) => x.id === modal.editId)
    if (idx >= 0) rtdb.store.shifts[idx] = data
  } else {
    rtdb.store.shifts.unshift(data)
  }
  rtdb.save(); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.metrics { display: flex; gap: 12px; margin-bottom: 14px; }
.metric { background: white; border-radius: 10px; padding: 12px 16px; flex: 1; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.m-num { font-size: 1.6rem; font-weight: 800; color: #1a3c5e; }
.m-num.red { color: #c0392b; } .m-num.amber { color: #e67e22; } .m-num.green { color: #2e7d5a; }
.m-lbl { font-size: .72rem; color: #aaa; }
.controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
.search-input { border: 1px solid #ddd; border-radius: 8px; padding: 7px 12px; font-size: .85rem; min-width: 180px; flex: 1; }
.filter-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.chip { background: #f0f0f0; border: none; border-radius: 20px; padding: 4px 10px; font-size: .76rem; cursor: pointer; color: #555; }
.chip.active { background: #1a3c5e; color: white; }
.shift-list { display: flex; flex-direction: column; gap: 12px; }
.shift-card { background: white; border: 1.5px solid #eee; border-radius: 12px; padding: 16px; }
.urgency-watch { border-left: 4px solid #e67e22; }
.urgency-critical { border-left: 4px solid #c0392b; background: rgba(220,50,50,.03); }
.sc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.shift-badge { font-size: .7rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.shift-morning { background: #fef3c7; color: #92400e; }
.shift-afternoon { background: #dbeafe; color: #1e40af; }
.shift-night { background: #ede9fe; color: #6d28d9; }
.sc-unit { font-weight: 700; color: #1a3c5e; font-size: .95rem; flex: 1; }
.sc-date { font-size: .75rem; color: #aaa; }
.sign-chip { font-size: .72rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.sign-chip.signed { background: #d1fae5; color: #065f46; }
.sign-chip.pending { background: #fef3c7; color: #92400e; }
.urgency-chip { font-size: .72rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.urg-watch { background: #fff3e0; color: #e67e22; }
.urg-critical { background: #fde8e8; color: #c0392b; }
.sc-flags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.flag-chip { font-size: .72rem; padding: 2px 7px; background: #f5f5f5; border-radius: 99px; font-weight: 700; }
.sc-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.sc-field { background: #f8f8f8; border-radius: 6px; padding: 8px 10px; }
.field-lbl { font-size: .68rem; font-weight: 700; color: #aaa; margin-bottom: 3px; }
.field-val { font-size: .82rem; color: #444; white-space: pre-wrap; }
.sc-labs { font-size: .8rem; color: #555; margin-bottom: 8px; }
.sc-checklist { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.cl-item { display: flex; align-items: center; gap: 6px; font-size: .82rem; }
.cl-item.done { text-decoration: line-through; color: #aaa; }
.sc-sign-row { display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid #eee; flex-wrap: wrap; }
.sign-info { font-size: .78rem; color: #888; }
.sc-actions { display: flex; gap: 5px; margin-left: auto; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary.btn-sm { padding: 5px 10px; font-size: .8rem; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 3px 7px; font-size: .75rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 380px; max-width: 640px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); max-height: 90vh; overflow-y: auto; }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.flag-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.checkbox-row { display: flex; align-items: center; gap: 5px; font-size: .82rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
</style>
