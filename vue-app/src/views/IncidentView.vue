<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>異常事件通報</h1><div class="page-meta">Incident Report · 追蹤處理進度</div></div>
        <button class="btn-primary" @click="openNew">＋ 新增通報</button>
      </div>

      <!-- Metrics -->
      <div class="metrics">
        <div class="metric"><div class="m-num red">{{ newCount }}</div><div class="m-lbl">新通報</div></div>
        <div class="metric"><div class="m-num amber">{{ processingCount }}</div><div class="m-lbl">處理中</div></div>
        <div class="metric"><div class="m-num green">{{ closedCount }}</div><div class="m-lbl">已結案</div></div>
      </div>

      <!-- Filter -->
      <div class="filter-row">
        <button v-for="f in STATUS_FILTERS" :key="f.key" :class="['cat-btn', statusFilter === f.key ? 'active' : '']" @click="statusFilter = f.key">{{ f.label }}</button>
      </div>

      <div v-if="filtered.length" class="ir-list">
        <div v-for="ir in filtered" :key="ir.id" :class="['ir-card', `ir-l${ir.level}`]">
          <div class="ir-card-top">
            <span :class="['ir-level', `ir-l${ir.level}`]">{{ IR_LEVELS[Number(ir.level)]?.label ?? `Level ${ir.level}` }}</span>
            <span :class="['ir-status-chip', `ir-s-${ir.status}`]">{{ statusLabel(ir.status) }}</span>
            <span class="ir-date">{{ ir.date }}</span>
            <select v-if="auth.isManager" class="status-sel" :value="ir.status" @change="updateStatus(ir, ($event.target as HTMLSelectElement).value)">
              <option value="new">新通報</option>
              <option value="processing">處理中</option>
              <option value="closed">已結案</option>
            </select>
          </div>
          <div class="ir-title">{{ ir.title }}</div>
          <div class="ir-desc">{{ ir.description }}</div>
          <div class="ir-fields">
            <div class="ir-field">
              <div class="field-label">已採取行動</div>
              <div class="field-val">{{ ir.actions || '—' }}</div>
            </div>
            <div class="ir-field">
              <div class="field-label">後續追蹤</div>
              <div class="field-val">{{ ir.followUp || '—' }}</div>
            </div>
          </div>

          <!-- Comments -->
          <div v-if="ir.comments?.length" class="ir-comments">
            <div v-for="cm in ir.comments" :key="cm.id" class="ir-comment">
              <strong>{{ userName(cm.userId) }}</strong>
              <span class="cm-date">{{ (cm.at ?? cm.createdAt ?? '').slice(0, 10) }}</span>
              <div>{{ cm.text }}</div>
            </div>
          </div>

          <div class="ir-footer">
            <span class="reporter">通報人：{{ userName(ir.reporterId) }}</span>
            <div class="ir-actions">
              <button class="btn-xs" @click="openComment(ir)">💬 跟進</button>
              <button v-if="auth.isAdmin" class="btn-xs danger" @click="deleteIR(ir.id)">刪除</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🚨</div>
        <div>{{ statusFilter === 'active' ? '目前沒有未結案通報' : '尚無通報記錄' }}</div>
      </div>
    </div>

    <!-- New IR modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>新增事件通報</h2>
          <div class="form-row"><label>事件標題</label><input v-model="modal.title" /></div>
          <div class="form-row">
            <label>嚴重等級</label>
            <select v-model="modal.level">
              <option v-for="(info, key) in IR_LEVELS" :key="key" :value="Number(key)">{{ info.label }}</option>
            </select>
          </div>
          <div class="form-row"><label>事件描述</label><textarea v-model="modal.description" rows="3" /></div>
          <div class="form-row"><label>已採取行動</label><textarea v-model="modal.actions" rows="2" /></div>
          <div class="form-row"><label>後續追蹤</label><textarea v-model="modal.followUp" rows="2" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.title.trim()" @click="save">送出</button>
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
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { Incident } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const IR_LEVELS: Record<number, { label: string }> = {
  1: { label: 'Level 1 輕微' },
  2: { label: 'Level 2 中度' },
  3: { label: 'Level 3 重大' },
  4: { label: 'Level 4 嚴重' },
}
const STATUS_FILTERS = [
  { key: 'active', label: '未結案' },
  { key: 'all', label: '全部' },
  { key: 'closed', label: '已結案' },
]

const statusFilter = ref('active')
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const incidents = computed(() => [...(rtdb.store?.incidents ?? [])].sort((a, b) => {
  const w: Record<string, number> = { new: 0, processing: 1, closed: 2 }
  return (w[a.status] ?? 0) - (w[b.status] ?? 0) || (b.date ?? '').localeCompare(a.date ?? '')
}))

const newCount = computed(() => incidents.value.filter((i) => i.status === 'new').length)
const processingCount = computed(() => incidents.value.filter((i) => i.status === 'processing').length)
const closedCount = computed(() => incidents.value.filter((i) => i.status === 'closed').length)

const filtered = computed(() => {
  if (statusFilter.value === 'all') return incidents.value
  if (statusFilter.value === 'active') return incidents.value.filter((i) => i.status !== 'closed')
  return incidents.value.filter((i) => i.status === statusFilter.value)
})

function userName(id?: string) { return users.value.find((u) => u.id === id)?.name ?? '未知' }
function statusLabel(s: string) { return { new: '新通報', processing: '處理中', closed: '已結案' }[s] ?? s }
function updateStatus(ir: Incident, status: string) { ir.status = status; rtdb.save() }
function deleteIR(id: string) {
  if (!rtdb.store || !confirm('確定刪除此通報？')) return
  rtdb.store.incidents = rtdb.store.incidents.filter((i) => i.id !== id)
  rtdb.save()
}

const modal = reactive({ open: false, title: '', level: 1, description: '', actions: '', followUp: '' })
function openNew() { Object.assign(modal, { open: true, title: '', level: 1, description: '', actions: '', followUp: '' }) }
function save() {
  if (!modal.title.trim() || !rtdb.store) return
  if (!rtdb.store.incidents) rtdb.store.incidents = []
  rtdb.store.incidents.unshift({
    id: rtdb.uid(), title: modal.title.trim(), level: modal.level,
    description: modal.description, actions: modal.actions, followUp: modal.followUp,
    status: 'new', comments: [],
    reporterId: currentUserId.value, date: new Date().toISOString().split('T')[0],
  })
  rtdb.save(); modal.open = false
}

const commentModal = reactive({ open: false, irId: '', text: '' })
function openComment(ir: Incident) { commentModal.irId = ir.id; commentModal.text = ''; commentModal.open = true }
function saveComment() {
  if (!commentModal.text.trim() || !rtdb.store) return
  const ir = rtdb.store.incidents.find((x) => x.id === commentModal.irId)
  if (!ir) return
  if (!ir.comments) ir.comments = []
  ir.comments.push({ id: rtdb.uid(), userId: currentUserId.value, text: commentModal.text.trim(), at: new Date().toISOString().split('T')[0] })
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
.ir-list { display: flex; flex-direction: column; gap: 10px; }
.ir-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 14px 16px; }
.ir-l1 { border-left: 4px solid #3b82f6; }
.ir-l2 { border-left: 4px solid #f59e0b; }
.ir-l3 { border-left: 4px solid #ef4444; }
.ir-l4 { border-left: 4px solid #7c3aed; }
.ir-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.ir-level { font-size: .72rem; padding: 2px 8px; border-radius: 99px; font-weight: 700; }
.ir-l1.ir-level { background: #dbeafe; color: #1e40af; }
.ir-l2.ir-level { background: #fef3c7; color: #92400e; }
.ir-l3.ir-level { background: #fde8e8; color: #c0392b; }
.ir-l4.ir-level { background: #ede9fe; color: #6d28d9; }
.ir-status-chip { font-size: .72rem; padding: 2px 8px; border-radius: 99px; font-weight: 700; }
.ir-s-new { background: #fde8e8; color: #c0392b; }
.ir-s-processing { background: #fff3e0; color: #e67e22; }
.ir-s-closed { background: #d1fae5; color: #065f46; }
.ir-date { font-size: .72rem; color: #aaa; }
.status-sel { border: 1px solid #ddd; border-radius: 5px; padding: 3px 6px; font-size: .78rem; margin-left: auto; }
.ir-title { font-weight: 700; color: #1a3c5e; font-size: .95rem; margin-bottom: 5px; }
.ir-desc { font-size: .85rem; color: #555; line-height: 1.65; margin-bottom: 10px; }
.ir-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.ir-field { background: #f8f8f8; border-radius: 6px; padding: 8px 10px; }
.field-label { font-size: .68rem; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
.field-val { font-size: .82rem; color: #555; }
.ir-comments { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.ir-comment { font-size: .78rem; padding: 5px 8px; background: #f0f7f4; border-radius: 5px; border-left: 2px solid #2e7d5a; }
.ir-comment strong { color: #2e7d5a; }
.cm-date { color: #aaa; margin-left: 6px; }
.ir-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid #eee; flex-wrap: wrap; gap: 8px; }
.reporter { font-size: .78rem; color: #888; }
.ir-actions { display: flex; gap: 6px; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 3px 8px; font-size: .75rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 340px; max-width: 520px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); max-height: 90vh; overflow-y: auto; }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; font-family: inherit; resize: vertical; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
</style>
