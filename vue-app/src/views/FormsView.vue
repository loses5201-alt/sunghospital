<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>表單簽核</h1><div class="page-meta">請假 · 加班 · 物品申請 · 線上審核</div></div>
        <button class="btn-primary" @click="openNew">＋ 新增申請</button>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs">
        <button v-for="tab in FILTER_TABS" :key="tab.key" :class="['ftab', filterKey === tab.key ? 'active' : '']" @click="filterKey = tab.key">
          {{ tab.label }}<span v-if="tab.count" class="ftab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <div v-if="filtered.length" class="form-list">
        <div v-for="f in filtered" :key="f.id" class="form-card" @click="openDetail(f)">
          <div class="form-left">
            <span :class="['ftype', FTYPES[f.type]?.c ?? 'ft-ot2']">{{ FTYPES[f.type]?.l ?? f.type }}</span>
            <div class="form-info">
              <div class="form-title">{{ f.title }}</div>
              <div class="form-meta">{{ userName(f.applicantId) }} · {{ f.createdAt?.slice(0, 10) }}</div>
            </div>
          </div>
          <div class="form-right">
            <span :class="['status-chip', `s-${f.status}`]">{{ statusLabel(f.status) }}</span>
            <span class="approval-flow">{{ f.statuses?.filter((s) => s === 'approved').length ?? 0 }}/{{ f.approvers?.length ?? 0 }} 核</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <div>{{ filterKey === 'pending-me' ? '目前沒有待您審核的表單' : '尚無表單' }}</div>
      </div>
    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <div v-if="detail.open && detail.form" class="modal-backdrop" @click.self="detail.open = false">
        <div class="modal modal-wide">
          <div class="modal-head">
            <span :class="['ftype', FTYPES[detail.form.type]?.c ?? 'ft-ot2']">{{ FTYPES[detail.form.type]?.l }}</span>
            <span class="detail-title">{{ detail.form.title }}</span>
            <span :class="['status-chip', `s-${detail.form.status}`]">{{ statusLabel(detail.form.status) }}</span>
            <button class="close-btn" @click="detail.open = false">×</button>
          </div>

          <div class="detail-grid">
            <div class="dfield"><label>申請人</label><div>{{ userName(detail.form.applicantId) }}</div></div>
            <div class="dfield"><label>申請日期</label><div>{{ detail.form.createdAt?.slice(0, 10) }}</div></div>
            <div v-if="detail.form.startDate" class="dfield full"><label>日期區間</label><div>{{ detail.form.startDate }} {{ detail.form.endDate && detail.form.endDate !== detail.form.startDate ? `～ ${detail.form.endDate}` : '' }}</div></div>
          </div>
          <div v-if="detail.form.reason" class="dfield"><label>原因說明</label><div class="reason-box">{{ detail.form.reason }}</div></div>

          <!-- Approval timeline -->
          <div class="dfield">
            <label>審核流程</label>
            <div class="timeline">
              <div v-for="(uid, i) in detail.form.approvers" :key="uid" class="tl-step">
                <div :class="['tl-dot', `tl-${detail.form.statuses?.[i] ?? 'pending'}`]">{{ i + 1 }}</div>
                <div class="tl-info">
                  <div class="tl-name">{{ userName(uid) }}</div>
                  <div :class="['tl-status', `tl-${detail.form.statuses?.[i] ?? 'pending'}`]">{{ tlLabel(detail.form.statuses?.[i] ?? 'pending') }}</div>
                  <div v-if="detail.form.comments?.[i]" class="tl-comment">「{{ detail.form.comments[i] }}」</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button v-if="canWithdraw" class="btn-ghost" @click="withdrawForm">撤回申請</button>
            <template v-if="canApprove">
              <button class="btn-ghost" @click="rejectForm">退回</button>
              <button class="btn-primary" @click="approveForm">核准</button>
            </template>
            <button v-if="!canApprove && !canWithdraw" class="btn-ghost" @click="detail.open = false">關閉</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- New form modal -->
    <Teleport to="body">
      <div v-if="newModal.open" class="modal-backdrop" @click.self="newModal.open = false">
        <div class="modal">
          <h2>新增申請</h2>
          <div class="form-row">
            <label>類別</label>
            <select v-model="newModal.type">
              <option v-for="(info, key) in FTYPES" :key="key" :value="key">{{ info.l }}</option>
            </select>
          </div>
          <div class="form-row"><label>主旨</label><input v-model="newModal.title" placeholder="申請主旨" /></div>
          <div class="form-grid">
            <div class="form-row"><label>開始日期</label><input v-model="newModal.startDate" type="date" /></div>
            <div class="form-row"><label>結束日期</label><input v-model="newModal.endDate" type="date" /></div>
          </div>
          <div class="form-row"><label>原因說明</label><textarea v-model="newModal.reason" rows="3" /></div>
          <div class="form-row">
            <label>審核人（依序）</label>
            <div class="approver-list">
              <label v-for="u in otherUsers" :key="u.id" class="checkbox-row">
                <input v-model="newModal.approvers" type="checkbox" :value="u.id" />
                {{ u.name }}
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="newModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!newModal.title.trim() || newModal.approvers.length === 0" @click="submitForm">送出申請</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Approve comment modal -->
    <Teleport to="body">
      <div v-if="commentModal.open" class="modal-backdrop" @click.self="commentModal.open = false">
        <div class="modal">
          <h2>{{ commentModal.isApprove ? '核准' : '退回' }}申請</h2>
          <div class="form-row"><label>附帶意見（選填）</label><textarea v-model="commentModal.text" rows="3" placeholder="例：同意，請注意補班事宜" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="commentModal.open = false">取消</button>
            <button :class="commentModal.isApprove ? 'btn-primary' : 'btn-danger'" @click="submitApproval">確定{{ commentModal.isApprove ? '核准' : '退回' }}</button>
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
import type { FormRequest } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const FTYPES: Record<string, { l: string; c: string }> = {
  leave:    { l: '請假',   c: 'ft-lv' },
  overtime: { l: '加班',   c: 'ft-ot' },
  supply:   { l: '物品申請', c: 'ft-sp' },
  other:    { l: '其他',   c: 'ft-ot2' },
}

const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const otherUsers = computed(() => users.value.filter((u) => u.id !== currentUserId.value))
const forms = computed(() => [...(rtdb.store?.formRequests ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

function userName(id: string) { return users.value.find((u) => u.id === id)?.name ?? '未知' }
function statusLabel(s: string) { return { pending: '審核中', approved: '✓ 核准', rejected: '✗ 退回', withdrawn: '↩ 已撤回' }[s] ?? s }
function tlLabel(s: string) { return { pending: '⏳ 待審', approved: '✓ 核准', rejected: '✗ 退回', withdrawn: '↩ 撤回' }[s] ?? s }

function isApprover(f: FormRequest) {
  const i = f.approvers.indexOf(currentUserId.value)
  if (i < 0) return false
  if (i === 0) return f.statuses[0] === 'pending'
  return f.statuses[i - 1] === 'approved' && f.statuses[i] === 'pending'
}

const pendingMeCount = computed(() => forms.value.filter((f) => f.status === 'pending' && isApprover(f)).length)

const FILTER_TABS = computed(() => [
  { key: 'all', label: '全部', count: 0 },
  { key: 'mine', label: '我的申請', count: 0 },
  { key: 'pending-me', label: '待我審核', count: pendingMeCount.value },
  { key: 'pending', label: '待審中', count: 0 },
])

const filterKey = ref('all')
const filtered = computed(() => {
  switch (filterKey.value) {
    case 'mine': return forms.value.filter((f) => f.applicantId === currentUserId.value)
    case 'pending-me': return forms.value.filter((f) => f.status === 'pending' && isApprover(f))
    case 'pending': return forms.value.filter((f) => f.status === 'pending')
    default: return forms.value
  }
})

// Detail
const detail = reactive({ open: false, form: null as FormRequest | null })
function openDetail(f: FormRequest) { detail.form = f; detail.open = true }
const canWithdraw = computed(() => detail.form?.applicantId === currentUserId.value && detail.form?.status === 'pending')
const canApprove = computed(() => !!detail.form && isApprover(detail.form))

function withdrawForm() {
  if (!detail.form || !confirm('確定撤回此申請？')) return
  detail.form.status = 'withdrawn'
  detail.form.statuses = detail.form.statuses.map((s) => s === 'pending' ? 'withdrawn' : s)
  rtdb.save(); detail.open = false
}

// Approval
const commentModal = reactive({ open: false, isApprove: true, text: '' })
function approveForm() { commentModal.isApprove = true; commentModal.text = ''; commentModal.open = true }
function rejectForm() { commentModal.isApprove = false; commentModal.text = ''; commentModal.open = true }
function submitApproval() {
  if (!detail.form) return
  const i = detail.form.approvers.indexOf(currentUserId.value)
  if (i < 0) return
  if (!detail.form.comments) detail.form.comments = []
  detail.form.comments[i] = commentModal.text.trim()
  if (commentModal.isApprove) {
    detail.form.statuses[i] = 'approved'
    if (detail.form.statuses.every((s) => s === 'approved')) detail.form.status = 'approved'
  } else {
    detail.form.statuses[i] = 'rejected'
    detail.form.status = 'rejected'
  }
  rtdb.save(); commentModal.open = false; detail.open = false
}

// New form
const newModal = reactive({ open: false, type: 'leave', title: '', startDate: '', endDate: '', reason: '', approvers: [] as string[] })
function openNew() { Object.assign(newModal, { open: true, type: 'leave', title: '', startDate: '', endDate: '', reason: '', approvers: [] }) }
function submitForm() {
  if (!newModal.title.trim() || !rtdb.store) return
  if (!rtdb.store.formRequests) rtdb.store.formRequests = []
  rtdb.store.formRequests.unshift({
    id: rtdb.uid(), type: newModal.type, title: newModal.title.trim(),
    applicantId: currentUserId.value,
    startDate: newModal.startDate, endDate: newModal.endDate, reason: newModal.reason.trim(),
    status: 'pending', approvers: [...newModal.approvers],
    statuses: newModal.approvers.map(() => 'pending'),
    createdAt: todayStr(),
  })
  rtdb.save(); newModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.filter-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.ftab { background: #f0f0f0; border: none; border-radius: 20px; padding: 6px 14px; font-size: .82rem; cursor: pointer; color: #555; }
.ftab.active { background: #1a3c5e; color: white; }
.ftab-badge { background: #c0392b; color: white; border-radius: 99px; font-size: .65rem; padding: 1px 5px; margin-left: 4px; }
.form-list { display: flex; flex-direction: column; gap: 8px; }
.form-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
.form-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,.08); }
.form-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.form-info { flex: 1; }
.form-title { font-weight: 600; color: #1a3c5e; font-size: .9rem; }
.form-meta { font-size: .75rem; color: #888; margin-top: 2px; }
.form-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ftype { font-size: .72rem; padding: 2px 8px; border-radius: 99px; font-weight: 700; white-space: nowrap; }
.ft-lv { background: #e8f5e9; color: #2e7d32; }
.ft-ot { background: #fff3e0; color: #e65100; }
.ft-sp { background: #e3f2fd; color: #1565c0; }
.ft-ot2 { background: #f3e5f5; color: #6a1b9a; }
.status-chip { font-size: .72rem; padding: 3px 8px; border-radius: 99px; font-weight: 700; }
.s-pending { background: #fef3c7; color: #92400e; }
.s-approved { background: #d1fae5; color: #065f46; }
.s-rejected { background: #fde8e8; color: #c0392b; }
.s-withdrawn { background: #f5f5f5; color: #888; }
.approval-flow { font-size: .75rem; color: #aaa; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 360px; max-width: 520px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); max-height: 90vh; overflow-y: auto; }
.modal-wide { max-width: 600px; }
.modal h2 { margin: 0 0 18px; font-size: 1.1rem; color: #1a3c5e; }
.modal-head { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.detail-title { font-weight: 700; color: #1a3c5e; font-size: .95rem; flex: 1; }
.close-btn { background: none; border: none; font-size: 1.2rem; color: #aaa; cursor: pointer; margin-left: auto; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.dfield { margin-bottom: 10px; }
.dfield.full { grid-column: span 2; }
.dfield label { font-size: .75rem; color: #888; display: block; margin-bottom: 4px; }
.dfield div { font-size: .9rem; color: #333; }
.reason-box { background: #f8f8f8; border-radius: 6px; padding: 8px 10px; font-size: .85rem; line-height: 1.7; white-space: pre-wrap; }
.timeline { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.tl-step { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 6px; }
.tl-dot { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; color: white; flex-shrink: 0; }
.tl-pending { background: #aaa; }
.tl-approved { background: #2e7d5a; }
.tl-rejected { background: #c0392b; }
.tl-withdrawn { background: #bbb; }
.tl-info { flex: 1; padding-top: 2px; }
.tl-name { font-size: .85rem; font-weight: 600; }
.tl-status { font-size: .75rem; margin-top: 1px; }
.tl-comment { font-size: .78rem; color: #888; font-style: italic; margin-top: 4px; background: #f8f8f8; border-radius: 5px; padding: 4px 8px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.approver-list { border: 1px solid #eee; border-radius: 6px; padding: 8px; max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: .85rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-danger { background: #c0392b; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 8px 14px; font-size: .82rem; cursor: pointer; }

/* ---------- Mobile (≤768px) ---------- */
@media (max-width: 768px) {
  .page { padding: 14px; }
  .page-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .page-header .btn-primary { align-self: flex-end; }

  .filter-tabs { gap: 6px; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; margin: 0 -14px 14px; padding-left: 14px; padding-right: 14px; }
  .filter-tabs::-webkit-scrollbar { height: 0; }
  .ftab { white-space: nowrap; flex-shrink: 0; padding: 8px 14px; font-size: .85rem; min-height: 36px; }

  /* Form list cards stack vertically */
  .form-card { flex-direction: column; align-items: stretch; gap: 10px; padding: 14px; }
  .form-left { gap: 10px; }
  .form-right { justify-content: space-between; }

  /* Modal almost full-screen */
  .modal { min-width: 0; width: calc(100vw - 24px); max-width: none; padding: 18px 16px; max-height: 92vh; }
  .modal-wide { max-width: none; }

  /* Detail layout 1-col */
  .detail-grid { grid-template-columns: 1fr; }
  .dfield.full { grid-column: span 1; }
  .form-grid { grid-template-columns: 1fr; gap: 0; }

  /* Approval action buttons full-width */
  .modal-actions { flex-wrap: wrap; gap: 10px; }
  .modal-actions button { flex: 1; min-height: 44px; font-size: .9rem; }

  /* Bigger touch on form list */
  .form-card { min-height: 64px; }
}
</style>
