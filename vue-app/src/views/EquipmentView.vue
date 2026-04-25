<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>設備回報</h1><div class="page-meta">設備故障 · 耗材不足 · 環境維修</div></div>
        <button class="btn-primary" @click="openNew">＋ 新增回報</button>
      </div>

      <!-- Metrics -->
      <div class="metrics">
        <div class="metric"><div class="m-num red">{{ openCount }}</div><div class="m-lbl">待處理</div></div>
        <div class="metric"><div class="m-num amber">{{ inprogressCount }}</div><div class="m-lbl">處理中</div></div>
        <div class="metric"><div class="m-num green">{{ resolvedCount }}</div><div class="m-lbl">已解決</div></div>
      </div>

      <!-- Filter -->
      <div class="filter-row">
        <button v-for="opt in STATUS_FILTERS" :key="opt.key" :class="['cat-btn', statusFilter === opt.key ? 'active' : '']" @click="statusFilter = opt.key">{{ opt.label }}</button>
      </div>

      <!-- Cards -->
      <div v-if="filtered.length" class="eq-list">
        <div v-for="e in filtered" :key="e.id" :class="['eq-card', `eq-s-${e.status}`]">
          <div class="eq-card-top">
            <span class="eq-cat-badge">{{ EQ_CATS[e.category] ?? e.category }}</span>
            <span class="eq-pri">{{ EQ_PRI[e.priority ?? 'medium'] }}</span>
            <span :class="['eq-status', `eq-sl-${e.status}`]">{{ EQ_STATUS[e.status] ?? e.status }}</span>
          </div>
          <div class="eq-name">{{ e.name }}</div>
          <div class="eq-meta">
            <span v-if="e.location">📍 {{ e.location }}</span>
            <span>回報者：{{ userName(e.reportedBy) }}</span>
            <span>{{ e.reportedAt?.slice(0, 10) }}</span>
          </div>
          <div v-if="e.note" class="eq-note">{{ e.note }}</div>

          <!-- Comments -->
          <div v-if="e.comments?.length" class="eq-comments">
            <div v-for="cm in e.comments" :key="cm.id" class="eq-comment">
              <strong>{{ userName(cm.userId) }}</strong>
              <span class="cm-date">{{ (cm.at ?? cm.createdAt ?? '').slice(0, 10) }}</span>
              <div class="cm-text">{{ cm.text }}</div>
            </div>
          </div>

          <div class="eq-actions">
            <template v-if="e.status !== 'resolved'">
              <button v-if="e.status === 'open'" class="btn-xs" @click="setStatus(e, 'inprogress')">開始處理</button>
              <button v-if="auth.isManager" class="btn-xs success" @click="setStatus(e, 'resolved')">標記解決</button>
              <button class="btn-xs" @click="openComment(e)">💬 跟進</button>
              <button v-if="auth.isAdmin" class="btn-xs danger" @click="deleteEq(e.id)">刪除</button>
            </template>
            <template v-else>
              <span class="resolved-info">解決日期：{{ e.resolvedAt }}</span>
              <button class="btn-xs" @click="openComment(e)">💬 跟進</button>
            </template>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🔧</div>
        <div>{{ statusFilter === 'open,inprogress' ? '目前沒有待處理項目' : '尚無記錄' }}</div>
      </div>
    </div>

    <!-- New report modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>新增回報</h2>
          <div class="form-row"><label>名稱/主旨</label><input v-model="modal.name" placeholder="例：產房3 心電監視器異常" /></div>
          <div class="form-grid">
            <div class="form-row">
              <label>類別</label>
              <select v-model="modal.category">
                <option v-for="(label, key) in EQ_CATS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>優先等級</label>
              <select v-model="modal.priority">
                <option v-for="(label, key) in EQ_PRI" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div class="form-row"><label>位置</label><input v-model="modal.location" placeholder="例：產房 3" /></div>
          <div class="form-row"><label>詳細說明</label><textarea v-model="modal.note" rows="3" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.name.trim()" @click="save">送出</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Comment modal -->
    <Teleport to="body">
      <div v-if="commentModal.open" class="modal-backdrop" @click.self="commentModal.open = false">
        <div class="modal">
          <h2>跟進留言</h2>
          <div class="form-row"><textarea v-model="commentModal.text" rows="3" placeholder="輸入跟進說明..." /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="commentModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!commentModal.text.trim()" @click="saveComment">送出</button>
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
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { Equipment } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const EQ_CATS: Record<string, string> = { device: '設備故障', supply: '耗材不足', facility: '環境維修', other: '其他' }
const EQ_STATUS: Record<string, string> = { open: '待處理', inprogress: '處理中', resolved: '已解決' }
const EQ_PRI: Record<string, string> = { high: '🔴 緊急', medium: '🟡 一般', low: '🟢 低優先' }
const STATUS_FILTERS = [
  { key: 'open,inprogress', label: '待處理' },
  { key: 'all', label: '全部' },
  { key: 'resolved', label: '已解決' },
]

const statusFilter = ref('open,inprogress')
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const items = computed(() => rtdb.store?.equipment ?? [])
const openCount = computed(() => items.value.filter((e) => e.status === 'open').length)
const inprogressCount = computed(() => items.value.filter((e) => e.status === 'inprogress').length)
const resolvedCount = computed(() => items.value.filter((e) => e.status === 'resolved').length)

const filtered = computed(() => {
  if (statusFilter.value === 'all') return items.value
  const statuses = statusFilter.value.split(',')
  return items.value.filter((e) => statuses.includes(e.status))
})

function userName(id?: string) { return users.value.find((u) => u.id === id)?.name ?? '未知' }
function now() { return todayStr() }

function setStatus(e: Equipment, status: string) {
  e.status = status
  if (status === 'resolved') e.resolvedAt = now()
  rtdb.save()
}
function deleteEq(id: string) {
  if (!rtdb.store || !confirm('確定刪除此回報？')) return
  rtdb.store.equipment = rtdb.store.equipment.filter((e) => e.id !== id)
  rtdb.save()
}

const modal = reactive({ open: false, name: '', category: 'device', priority: 'medium', location: '', note: '' })
function openNew() { Object.assign(modal, { open: true, name: '', category: 'device', priority: 'medium', location: '', note: '' }) }
function save() {
  if (!modal.name.trim() || !rtdb.store) return
  if (!rtdb.store.equipment) rtdb.store.equipment = []
  rtdb.store.equipment.unshift({
    id: rtdb.uid(), name: modal.name.trim(), category: modal.category, priority: modal.priority,
    location: modal.location, note: modal.note, status: 'open', comments: [],
    reportedBy: currentUserId.value, reportedAt: now(),
  })
  rtdb.save(); modal.open = false
}

const commentModal = reactive({ open: false, eqId: '', text: '' })
function openComment(e: Equipment) { commentModal.eqId = e.id; commentModal.text = ''; commentModal.open = true }
function saveComment() {
  if (!commentModal.text.trim() || !rtdb.store) return
  const e = rtdb.store.equipment.find((x) => x.id === commentModal.eqId)
  if (!e) return
  if (!e.comments) e.comments = []
  e.comments.push({ id: rtdb.uid(), userId: currentUserId.value, text: commentModal.text.trim(), at: now() })
  rtdb.save(); commentModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.metrics { display: flex; gap: 12px; margin-bottom: 14px; }
.metric { background: white; border-radius: 10px; padding: 12px 16px; flex: 1; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.m-num { font-size: 1.6rem; font-weight: 800; }
.m-num.red { color: #c0392b; } .m-num.amber { color: #e67e22; } .m-num.green { color: #2e7d5a; }
.m-lbl { font-size: .72rem; color: #aaa; }
.filter-row { display: flex; gap: 6px; margin-bottom: 16px; }
.cat-btn { background: #f0f0f0; border: none; border-radius: 20px; padding: 5px 12px; font-size: .78rem; cursor: pointer; color: #555; }
.cat-btn.active { background: #1a3c5e; color: white; }
.eq-list { display: flex; flex-direction: column; gap: 10px; }
.eq-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 14px 16px; }
.eq-s-open { border-left: 4px solid #c0392b; }
.eq-s-inprogress { border-left: 4px solid #e67e22; }
.eq-s-resolved { border-left: 4px solid #2e7d5a; opacity: .8; }
.eq-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.eq-cat-badge { font-size: .72rem; padding: 2px 8px; background: #eee; border-radius: 99px; color: #555; font-weight: 600; }
.eq-pri { font-size: .75rem; }
.eq-status { font-size: .72rem; padding: 2px 8px; border-radius: 99px; font-weight: 700; margin-left: auto; }
.eq-sl-open { background: #fde8e8; color: #c0392b; }
.eq-sl-inprogress { background: #fff3e0; color: #e67e22; }
.eq-sl-resolved { background: #d1fae5; color: #065f46; }
.eq-name { font-weight: 700; color: #1a3c5e; font-size: .95rem; margin-bottom: 4px; }
.eq-meta { display: flex; gap: 10px; font-size: .75rem; color: #888; flex-wrap: wrap; margin-bottom: 4px; }
.eq-note { font-size: .82rem; color: #555; margin-bottom: 6px; }
.eq-comments { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.eq-comment { font-size: .78rem; padding: 5px 8px; background: #f8f8f8; border-radius: 5px; border-left: 2px solid #2e7d5a; }
.eq-comment strong { color: #2e7d5a; }
.cm-date { color: #aaa; margin-left: 6px; }
.cm-text { color: #444; margin-top: 2px; }
.eq-actions { display: flex; gap: 6px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
.resolved-info { font-size: .75rem; color: #aaa; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 3px 8px; font-size: .75rem; cursor: pointer; }
.btn-xs.success { border-color: #2e7d5a; color: #2e7d5a; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 340px; max-width: 500px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }

@media (max-width: 768px) {
  .page { padding: 14px; }
  .page-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .page-header .btn-primary { align-self: flex-end; }
  .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .metric { padding: 10px 12px; }
  .m-num { font-size: 1.35rem; }
  .filter-row { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
  .cat-btn { white-space: nowrap; flex-shrink: 0; padding: 6px 12px; font-size: .8rem; min-height: 32px; }
  .eq-card { padding: 12px; }
  .modal { min-width: 0; width: calc(100vw - 24px); max-width: none; padding: 18px 16px; }
  .form-grid { grid-template-columns: 1fr; gap: 0; }
  .modal-actions { flex-wrap: wrap; }
  .modal-actions button { flex: 1; min-height: 44px; }
}
</style>
