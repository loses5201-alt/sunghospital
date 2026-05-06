<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>表單簽核</h1><div class="page-meta">請假 · 加班 · 物品申請 · 線上審核</div></div>
        <button class="btn-primary" @click="openNew">＋ 新增申請</button>
      </div>

      <!-- Personal dashboard tiles -->
      <div class="dashboard-tiles">
        <div :class="['tile', filterKey === 'pending-me' ? 'tile-active' : '']" @click="filterKey = 'pending-me'">
          <div class="tile-label">待我審核</div>
          <div class="tile-num tile-amber">{{ pendingMeCount }}</div>
          <div class="tile-sub">{{ pendingMeCount ? '點此篩選' : '目前無待審' }}</div>
        </div>
        <div :class="['tile', filterKey === 'my-pending' ? 'tile-active' : '']" @click="filterKey = 'my-pending'">
          <div class="tile-label">我送出（審核中）</div>
          <div class="tile-num tile-blue">{{ myPendingCount }}</div>
          <div class="tile-sub">&nbsp;</div>
        </div>
        <div class="tile">
          <div class="tile-label">本月已核准</div>
          <div class="tile-num tile-green">{{ myMonthApproved }}</div>
          <div class="tile-sub">{{ myMonthRejected ? `駁回 ${myMonthRejected} 件` : ' ' }}</div>
        </div>
        <div :class="['tile', filterKey === 'overdue' ? 'tile-active' : '']" @click="filterKey = 'overdue'">
          <div class="tile-label">逾期</div>
          <div class="tile-num tile-red">{{ overdueCount }}</div>
          <div class="tile-sub">{{ overdueCount ? `>${FORM_OVERDUE_HOURS}h pending` : ' ' }}</div>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs">
        <button v-for="tab in FILTER_TABS" :key="tab.key" :class="['ftab', filterKey === tab.key ? 'active' : '']" @click="filterKey = tab.key">
          {{ tab.label }}<span v-if="tab.count" class="ftab-badge">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Unread notifications strip -->
      <div v-if="filterKey === 'all' && unreadNotifs.length" class="notif-strip">
        <div v-for="n in unreadNotifs" :key="n.id" class="notif-row">
          <span class="notif-icon">{{ n.title.startsWith('✓') ? '✅' : n.title.startsWith('✗') ? '❌' : '🔔' }}</span>
          <span class="notif-text">{{ n.title }}　{{ n.body }}</span>
          <button class="notif-dismiss" @click="dismissNotif(n.id)">×</button>
        </div>
      </div>

      <div v-if="filtered.length" class="form-list">
        <div v-for="f in filtered" :key="f.id" :class="['form-card', isFormOverdue(f) ? 'form-overdue' : '']" @click="openDetail(f)">
          <div class="form-left">
            <span :class="['ftype', FTYPES[f.type]?.c ?? 'ft-ot2']">{{ FTYPES[f.type]?.l ?? f.type }}</span>
            <div class="form-info">
              <div class="form-title">
                <span v-if="f.urgent" class="urgent-badge">急</span>
                <span v-if="isFormOverdue(f)" class="overdue-badge">🕒 逾期 {{ overdueHours(f) }}h</span>
                {{ f.title }}
              </div>
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
            <span v-if="detail.form.urgent" class="urgent-badge">急</span>
            <span class="detail-title">{{ detail.form.title }}</span>
            <span :class="['status-chip', `s-${detail.form.status}`]">{{ statusLabel(detail.form.status) }}</span>
            <button class="close-btn" @click="detail.open = false">×</button>
          </div>

          <div class="detail-grid">
            <div class="dfield"><label>申請人</label><div>{{ userName(detail.form.applicantId) }}</div></div>
            <div class="dfield"><label>申請日期</label><div>{{ detail.form.createdAt?.slice(0, 10) }}</div></div>
            <div v-if="detail.form.startDate" class="dfield full">
              <label>日期區間</label>
              <div>{{ detail.form.startDate }}{{ detail.form.endDate && detail.form.endDate !== detail.form.startDate ? ` ～ ${detail.form.endDate}` : '' }}</div>
            </div>
            <div v-if="detail.form.leaveType" class="dfield"><label>假別</label><div>{{ LEAVE_TYPE_LABELS[detail.form.leaveType] ?? detail.form.leaveType }}</div></div>
            <div v-if="detail.form.hours" class="dfield"><label>加班時數</label><div>{{ detail.form.hours }} 小時</div></div>
            <div v-if="detail.form.itemName" class="dfield"><label>申請品項</label><div>{{ detail.form.itemName }} × {{ detail.form.itemQty ?? 1 }}</div></div>
          </div>
          <!-- Resubmit history -->
          <div v-if="resubmitParent" class="resubmit-banner">
            <div class="resubmit-title">↩ 此為重新申請</div>
            <div class="resubmit-meta">原申請：「{{ resubmitParent.title }}」 · {{ resubmitParent.createdAt?.slice(0,10) }}</div>
            <div v-if="resubmitParentRejection" class="resubmit-comment">原駁回意見：「{{ resubmitParentRejection }}」</div>
          </div>
          <div v-if="resubmitChildren.length" class="resubmit-children">
            <div class="resubmit-title">📎 後續重申</div>
            <div v-for="ch in resubmitChildren" :key="ch.id" class="resubmit-child">
              <span>{{ ch.title }}</span> · {{ ch.createdAt?.slice(0,10) }} · {{ statusLabel(ch.status) }}
            </div>
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

          <!-- Delegate banner -->
          <div v-if="canApproveViaDelegate" class="delegate-banner">
            🤝 您正在代理 <b>{{ delegateActorName }}</b> 簽核此單，將記錄為代理簽核
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button v-if="canWithdraw" class="btn-ghost" @click="withdrawForm">撤回申請</button>
            <template v-if="canApprove">
              <button class="btn-danger" @click="rejectForm">退回</button>
              <button class="btn-primary" @click="approveForm">核准</button>
            </template>
            <template v-else-if="canApproveViaDelegate">
              <button class="btn-danger" @click="rejectForm">🤝 代理退回</button>
              <button class="btn-primary" @click="approveForm">🤝 代理核准</button>
            </template>
            <button v-if="!canApprove && !canApproveViaDelegate && !canWithdraw" class="btn-ghost" @click="detail.open = false">關閉</button>
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
            <select v-model="newModal.type" @change="onTypeChange">
              <option v-for="(info, key) in FTYPES" :key="key" :value="key">{{ info.l }}</option>
            </select>
          </div>
          <div class="form-row"><label>主旨</label><input v-model="newModal.title" placeholder="申請主旨" /></div>

          <!-- Type-specific fields -->
          <template v-if="newModal.type === 'leave'">
            <div class="form-row">
              <label>假別</label>
              <select v-model="newModal.leaveType">
                <option v-for="(l, k) in LEAVE_TYPE_LABELS" :key="k" :value="k">{{ l }}</option>
              </select>
            </div>
            <div class="form-grid">
              <div class="form-row"><label>開始日期</label><input v-model="newModal.startDate" type="date" /></div>
              <div class="form-row"><label>結束日期</label><input v-model="newModal.endDate" type="date" /></div>
            </div>
          </template>
          <template v-else-if="newModal.type === 'overtime'">
            <div class="form-grid">
              <div class="form-row"><label>加班日期</label><input v-model="newModal.startDate" type="date" /></div>
              <div class="form-row"><label>加班時數</label><input v-model.number="newModal.hours" type="number" min="0.5" max="12" step="0.5" /></div>
            </div>
          </template>
          <template v-else-if="newModal.type === 'supply'">
            <div class="form-grid">
              <div class="form-row"><label>品項名稱</label><input v-model="newModal.itemName" placeholder="例：N95 口罩" /></div>
              <div class="form-row"><label>數量</label><input v-model.number="newModal.itemQty" type="number" min="1" /></div>
            </div>
          </template>

          <div class="form-row"><label>原因說明</label><textarea v-model="newModal.reason" rows="3" /></div>

          <!-- Urgent flag -->
          <div class="form-row urgent-row">
            <label class="checkbox-row">
              <input v-model="newModal.urgent" type="checkbox" />
              <span>標記為緊急（加急審核）</span>
            </label>
          </div>

          <!-- Approvers - auto-filled with managers, can modify -->
          <div class="form-row">
            <label>審核人（依序）<span class="label-hint">主管/管理員已自動帶入</span></label>
            <div class="approver-list">
              <div class="approver-group-label">主管 / 管理員</div>
              <label v-for="u in managerUsers" :key="u.id" class="checkbox-row">
                <input v-model="newModal.approvers" type="checkbox" :value="u.id" />
                <span class="approver-name">{{ u.name }}</span>
                <span :class="['role-tag', u.role === 'admin' ? 'tag-admin' : 'tag-mgr']">{{ u.role === 'admin' ? '管理員' : '主管' }}</span>
              </label>
              <div v-if="memberUsers.length" class="approver-group-label" style="margin-top:8px">其他人員（選填）</div>
              <label v-for="u in memberUsers" :key="u.id" class="checkbox-row">
                <input v-model="newModal.approvers" type="checkbox" :value="u.id" />
                <span class="approver-name">{{ u.name }}</span>
              </label>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-ghost" @click="newModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!canSubmit" @click="submitForm">送出申請</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Approve comment modal -->
    <Teleport to="body">
      <div v-if="commentModal.open" class="modal-backdrop" @click.self="commentModal.open = false">
        <div class="modal">
          <h2>{{ commentModal.isApprove ? '核准' : '退回' }}申請</h2>
          <div class="form-row"><label>附帶意見（選填）</label><textarea v-model="commentModal.text" rows="3" :placeholder="commentModal.isApprove ? '例：同意，請注意補班事宜' : '例：假期餘額不足，請重新申請'" /></div>
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
import type { FormRequest, FormNotif } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const FTYPES: Record<string, { l: string; c: string }> = {
  leave:    { l: '請假',    c: 'ft-lv' },
  overtime: { l: '加班',    c: 'ft-ot' },
  supply:   { l: '物品申請', c: 'ft-sp' },
  other:    { l: '其他',    c: 'ft-ot2' },
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual:    '特休',
  sick:      '病假',
  personal:  '事假',
  official:  '公假',
  maternity: '產假/陪產假',
  funeral:   '喪假',
  marriage:  '婚假',
  other:     '其他',
}

const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])

// Approver candidates
const managerUsers = computed(() =>
  users.value.filter(u => (u.role === 'admin' || u.role === 'manager') && u.id !== currentUserId.value && (u.status ?? 'active') === 'active')
)
const memberUsers = computed(() =>
  users.value.filter(u => u.role === 'member' && u.id !== currentUserId.value && (u.status ?? 'active') === 'active')
)
const defaultApprovers = computed(() => managerUsers.value.map(u => u.id))

const forms = computed(() => [...(rtdb.store?.formRequests ?? [])].sort((a, b) => {
  if (a.urgent && !b.urgent) return -1
  if (!a.urgent && b.urgent) return 1
  return b.createdAt.localeCompare(a.createdAt)
}))

const myNotifs = computed(() => (rtdb.store?.formNotifs ?? []).filter(n => n.toUserId === currentUserId.value))
const unreadNotifs = computed(() => myNotifs.value.filter(n => !n.read))

function userName(id: string) { return users.value.find(u => u.id === id)?.name ?? '未知' }
function statusLabel(s: string) { return { pending: '審核中', approved: '✓ 核准', rejected: '✗ 退回', withdrawn: '↩ 已撤回' }[s] ?? s }
function tlLabel(s: string) { return { pending: '⏳ 待審', approved: '✓ 核准', rejected: '✗ 退回', withdrawn: '↩ 撤回' }[s] ?? s }

function isApprover(f: FormRequest) {
  const i = f.approvers.indexOf(currentUserId.value)
  if (i < 0) return false
  if (i === 0) return f.statuses[0] === 'pending'
  return f.statuses[i - 1] === 'approved' && f.statuses[i] === 'pending'
}

// 找到當前 pending 階索引（之前都 approved）
function getActiveApproverIdx(f: FormRequest): number {
  if (f.status !== 'pending' || !f.approvers) return -1
  for (let i = 0; i < f.approvers.length; i++) {
    if (f.statuses[i] === 'pending') {
      if (i === 0) return 0
      return f.statuses[i - 1] === 'approved' ? i : -1
    }
  }
  return -1
}
function getDelegatorIdx(f: FormRequest, delegateId: string): number {
  const i = getActiveApproverIdx(f)
  if (i < 0) return -1
  if (f.approvers[i] === delegateId) return -1
  const actor = users.value.find(u => u.id === f.approvers[i])
  return actor?.delegateId === delegateId ? i : -1
}
function isApproverViaDelegate(f: FormRequest): boolean {
  return getDelegatorIdx(f, currentUserId.value) >= 0
}

const pendingMeCount = computed(() => forms.value.filter(f => f.status === 'pending' && (isApprover(f) || isApproverViaDelegate(f))).length)

// 逾期判定（pending 超過 24h）
const FORM_OVERDUE_HOURS = 24
function isFormOverdue(f: FormRequest): boolean {
  if (!f || f.status !== 'pending' || !f.createdAt) return false
  const ms = Date.now() - new Date(f.createdAt).getTime()
  return !isNaN(ms) && ms > FORM_OVERDUE_HOURS * 3600 * 1000
}
function overdueHours(f: FormRequest): number {
  if (!f?.createdAt) return 0
  const ms = Date.now() - new Date(f.createdAt).getTime()
  return Math.max(0, Math.floor(ms / 3600000))
}

// 儀表板統計
const myPendingCount = computed(() => forms.value.filter(f => f.applicantId === currentUserId.value && f.status === 'pending').length)
const overdueCount = computed(() => forms.value.filter(isFormOverdue).length)
const myMonthApproved = computed(() => {
  const ym = new Date().toISOString().slice(0, 7)
  return forms.value.filter(f => f.applicantId === currentUserId.value && f.status === 'approved' && (f.createdAt || '').slice(0, 7) === ym).length
})
const myMonthRejected = computed(() => {
  const ym = new Date().toISOString().slice(0, 7)
  return forms.value.filter(f => f.applicantId === currentUserId.value && f.status === 'rejected' && (f.createdAt || '').slice(0, 7) === ym).length
})

const FILTER_TABS = computed(() => [
  { key: 'all',        label: '全部',       count: 0 },
  { key: 'mine',       label: '我的申請',   count: 0 },
  { key: 'my-pending', label: '我送出審核中', count: 0 },
  { key: 'pending-me', label: '待我審核',   count: pendingMeCount.value },
  { key: 'overdue',    label: '逾期',       count: overdueCount.value },
])

const filterKey = ref('all')
const filtered = computed(() => {
  switch (filterKey.value) {
    case 'mine':       return forms.value.filter(f => f.applicantId === currentUserId.value)
    case 'my-pending': return forms.value.filter(f => f.applicantId === currentUserId.value && f.status === 'pending')
    case 'pending-me': return forms.value.filter(f => f.status === 'pending' && (isApprover(f) || isApproverViaDelegate(f)))
    case 'overdue':    return forms.value.filter(isFormOverdue)
    default:           return forms.value
  }
})

// Notification helpers
function makeNotif(toUserId: string, title: string, body: string): FormNotif {
  return { id: rtdb.uid(), toUserId, title, body, createdAt: new Date().toISOString(), read: false }
}

function dismissNotif(id: string) {
  if (!rtdb.store) return
  const n = rtdb.store.formNotifs.find(x => x.id === id)
  if (n) { n.read = true; rtdb.saveCollection('formNotifs', rtdb.store.formNotifs) }
}

// Detail
const detail = reactive({ open: false, form: null as FormRequest | null })
function openDetail(f: FormRequest) {
  detail.form = f
  detail.open = true
  // Mark related notifs as read
  if (!rtdb.store) return
  const updated = rtdb.store.formNotifs.map(n =>
    n.toUserId === currentUserId.value && !n.read ? { ...n, read: true } : n
  )
  if (updated.some((n, i) => n.read !== rtdb.store!.formNotifs[i].read)) {
    rtdb.store.formNotifs = updated
    rtdb.saveCollection('formNotifs', updated)
  }
}

const canWithdraw = computed(() => detail.form?.applicantId === currentUserId.value && detail.form?.status === 'pending')
const canApprove  = computed(() => !!detail.form && isApprover(detail.form))
const canApproveViaDelegate = computed(() => !!detail.form && !canApprove.value && isApproverViaDelegate(detail.form))

// 重申歷程鏈
const resubmitParent = computed(() => {
  if (!detail.form?.resubmittedFrom) return null
  return forms.value.find(f => f.id === detail.form!.resubmittedFrom) ?? null
})
const resubmitParentRejection = computed(() => {
  const p = resubmitParent.value
  if (!p?.statuses) return ''
  const idx = [...p.statuses].lastIndexOf('rejected' as any)
  return idx >= 0 ? (p.comments?.[idx] ?? '') : ''
})
const resubmitChildren = computed(() => {
  if (!detail.form) return []
  return forms.value.filter(f => f.resubmittedFrom === detail.form!.id)
})
const delegateActorName = computed(() => {
  if (!detail.form || !canApproveViaDelegate.value) return ''
  const idx = getDelegatorIdx(detail.form, currentUserId.value)
  return idx >= 0 ? userName(detail.form.approvers[idx]) : ''
})

function withdrawForm() {
  if (!detail.form || !rtdb.store || !confirm('確定撤回此申請？')) return
  detail.form.status = 'withdrawn'
  detail.form.statuses = detail.form.statuses.map(s => s === 'pending' ? 'withdrawn' : s)
  rtdb.saveCollection('formRequests', rtdb.store.formRequests)
  detail.open = false
}

// Approval
const commentModal = reactive({ open: false, isApprove: true, text: '' })
function approveForm() { commentModal.isApprove = true;  commentModal.text = ''; commentModal.open = true }
function rejectForm()  { commentModal.isApprove = false; commentModal.text = ''; commentModal.open = true }

function submitApproval() {
  if (!detail.form || !rtdb.store) return
  const f = detail.form

  // 解析作用階段：先看是不是直屬審核人，否則看是不是代理
  let i = -1
  let viaDelegate = false
  const directIdx = f.approvers.indexOf(currentUserId.value)
  if (directIdx >= 0) {
    const ok = directIdx === 0 ? f.statuses[0] === 'pending' : (f.statuses[directIdx - 1] === 'approved' && f.statuses[directIdx] === 'pending')
    if (ok) i = directIdx
  }
  if (i < 0) {
    const di = getDelegatorIdx(f, currentUserId.value)
    if (di >= 0) { i = di; viaDelegate = true }
  }
  if (i < 0) return

  if (!f.comments) f.comments = []
  const text = commentModal.text.trim()
  const prefix = viaDelegate ? `（代理：${userName(currentUserId.value)}）` : ''
  f.comments[i] = (text + (text && prefix ? ' ' : '') + prefix).trim()

  if (!f.actuallyApprovedBy) f.actuallyApprovedBy = []
  f.actuallyApprovedBy[i] = currentUserId.value

  const newNotifs = [...rtdb.store.formNotifs]
  const actorName = userName(currentUserId.value)
  const formTitle = f.title
  const labelPrefix = viaDelegate ? `代理 ${userName(f.approvers[i])} ` : ''

  if (commentModal.isApprove) {
    f.statuses[i] = 'approved'
    const allApproved = f.statuses.every(s => s === 'approved')
    if (allApproved) {
      f.status = 'approved'
      newNotifs.push(makeNotif(f.applicantId, `✓ 表單已核准`, `「${formTitle}」已由所有審核人核准`))
    } else {
      // 通知下一位審核人 + 其代理人
      const nextIdx = f.approvers.findIndex((_, idx) => idx > i && f.statuses[idx] === 'pending')
      if (nextIdx >= 0) {
        const nextUserId = f.approvers[nextIdx]
        newNotifs.push(makeNotif(nextUserId, `🔔 待您審核`, `${userName(f.applicantId)} 的「${formTitle}」輪到您簽核`))
        const nextUser = users.value.find(u => u.id === nextUserId)
        if (nextUser?.delegateId) {
          newNotifs.push(makeNotif(nextUser.delegateId, `🔔 代理待審`, `代理 ${nextUser.name} 簽核「${formTitle}」`))
        }
      }
    }
  } else {
    f.statuses[i] = 'rejected'
    f.status = 'rejected'
    newNotifs.push(makeNotif(f.applicantId, `✗ 表單已退回`, `「${formTitle}」被 ${labelPrefix}${actorName} 退回${text ? `：${text}` : ''}`))
  }

  rtdb.saveMultiple({ formRequests: rtdb.store.formRequests, formNotifs: newNotifs })
  rtdb.store.formNotifs = newNotifs
  commentModal.open = false
  detail.open = false
}

// New form
const newModal = reactive({
  open: false, type: 'leave', title: '',
  startDate: '', endDate: '', reason: '',
  approvers: [] as string[],
  urgent: false,
  leaveType: 'annual',
  hours: 8,
  itemName: '', itemQty: 1,
})

function onTypeChange() {
  // Reset type-specific fields on type switch
  newModal.leaveType = 'annual'
  newModal.hours = 8
  newModal.itemName = ''
  newModal.itemQty = 1
}

function openNew() {
  Object.assign(newModal, {
    open: true, type: 'leave', title: '',
    startDate: todayStr(), endDate: todayStr(), reason: '',
    approvers: [...defaultApprovers.value],
    urgent: false, leaveType: 'annual', hours: 8,
    itemName: '', itemQty: 1,
  })
}

const canSubmit = computed(() =>
  newModal.title.trim().length > 0 && newModal.approvers.length > 0
)

function submitForm() {
  if (!canSubmit.value || !rtdb.store) return

  const newForm: FormRequest = {
    id: rtdb.uid(),
    type: newModal.type,
    title: newModal.title.trim(),
    applicantId: currentUserId.value,
    startDate: newModal.startDate,
    endDate: newModal.endDate || newModal.startDate,
    reason: newModal.reason.trim(),
    status: 'pending',
    approvers: [...newModal.approvers],
    statuses: newModal.approvers.map(() => 'pending'),
    createdAt: todayStr(),
    urgent: newModal.urgent || undefined,
    leaveType: newModal.type === 'leave' ? newModal.leaveType : undefined,
    hours: newModal.type === 'overtime' ? newModal.hours : undefined,
    itemName: newModal.type === 'supply' ? newModal.itemName.trim() || undefined : undefined,
    itemQty: newModal.type === 'supply' ? newModal.itemQty : undefined,
  }

  const updatedForms = [newForm, ...(rtdb.store.formRequests ?? [])]

  // 通知第一位審核人
  const newNotifs = [...(rtdb.store.formNotifs ?? [])]
  if (newModal.approvers.length > 0) {
    const firstApprover = newModal.approvers[0]
    const applicantName = userName(currentUserId.value)
    newNotifs.push(makeNotif(firstApprover, `🔔 待您審核`, `${applicantName} 送出了「${newForm.title}」，請審核`))
  }

  rtdb.saveMultiple({ formRequests: updatedForms, formNotifs: newNotifs })
  rtdb.store.formRequests = updatedForms
  rtdb.store.formNotifs = newNotifs
  newModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.filter-tabs { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.ftab { background: #f0f0f0; border: none; border-radius: 20px; padding: 6px 14px; font-size: .82rem; cursor: pointer; color: #555; }
.ftab.active { background: #1a3c5e; color: white; }
.ftab-badge { background: #c0392b; color: white; border-radius: 99px; font-size: .65rem; padding: 1px 5px; margin-left: 4px; }

/* Notifications strip */
.notif-strip { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.notif-row { display: flex; align-items: center; gap: 10px; background: #fff8e1; border: 1px solid #f9c946; border-radius: 8px; padding: 8px 12px; font-size: .85rem; }
.notif-icon { flex-shrink: 0; }
.notif-text { flex: 1; color: #555; }
.notif-dismiss { background: none; border: none; color: #aaa; cursor: pointer; font-size: 1.1rem; padding: 0 4px; flex-shrink: 0; }

.form-list { display: flex; flex-direction: column; gap: 8px; }
.form-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: box-shadow .12s; }
.form-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,.08); }
.form-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.form-info { flex: 1; }
.form-title { font-weight: 600; color: #1a3c5e; font-size: .9rem; display: flex; align-items: center; gap: 6px; }
.form-meta { font-size: .75rem; color: #888; margin-top: 2px; }
.form-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.ftype { font-size: .72rem; padding: 2px 8px; border-radius: 99px; font-weight: 700; white-space: nowrap; }
.ft-lv  { background: #e8f5e9; color: #2e7d32; }
.ft-ot  { background: #fff3e0; color: #e65100; }
.ft-sp  { background: #e3f2fd; color: #1565c0; }
.ft-ot2 { background: #f3e5f5; color: #6a1b9a; }
.urgent-badge { background: #c0392b; color: white; font-size: .65rem; font-weight: 700; border-radius: 4px; padding: 1px 5px; flex-shrink: 0; }
.status-chip { font-size: .72rem; padding: 3px 8px; border-radius: 99px; font-weight: 700; }
.s-pending   { background: #fef3c7; color: #92400e; }
.s-approved  { background: #d1fae5; color: #065f46; }
.s-rejected  { background: #fde8e8; color: #c0392b; }
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
.tl-pending  { background: #aaa; }
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
.label-hint { font-size: .72rem; color: #2e7d5a; margin-left: 6px; font-weight: 400; }

.approver-list { border: 1px solid #eee; border-radius: 6px; padding: 10px 12px; max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.approver-group-label { font-size: .7rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: .85rem; cursor: pointer; }
.approver-name { flex: 1; }
.role-tag { font-size: .65rem; padding: 1px 5px; border-radius: 4px; font-weight: 700; flex-shrink: 0; }
.tag-admin { background: #fde8e8; color: #c0392b; }
.tag-mgr   { background: #fff3e0; color: #e65100; }
.urgent-row { margin-bottom: 10px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.delegate-banner { background: #eef5ff; border-left: 3px solid #2e7d5a; border-radius: 6px; padding: 8px 12px; margin: 12px 0 4px; font-size: .82rem; color: #1a3c5e; }

/* Dashboard tiles */
.dashboard-tiles { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.tile { flex: 1; min-width: 130px; background: white; border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: transform .12s; }
.tile:hover { transform: translateY(-1px); }
.tile-active { outline: 2px solid #1a3c5e; outline-offset: -2px; }
.tile-label { font-size: .72rem; color: #888; }
.tile-num { font-size: 1.55rem; font-weight: 700; line-height: 1.1; margin-top: 2px; }
.tile-amber { color: #e67e22; }
.tile-blue  { color: #1a3c5e; }
.tile-green { color: #2e7d5a; }
.tile-red   { color: #c0392b; }
.tile-sub { font-size: .68rem; color: #aaa; margin-top: 2px; min-height: 1em; }

/* Overdue */
.overdue-badge { background: #fde8ec; color: #b8001f; font-size: .65rem; font-weight: 700; padding: 1px 6px; border-radius: 99px; margin-right: 4px; flex-shrink: 0; }
.form-overdue { border-color: #f0c8d0; background: #fff8f9; }

/* Resubmit */
.resubmit-banner { background: #fff8e1; border-left: 3px solid #f5a623; border-radius: 6px; padding: 9px 12px; margin: 4px 0 12px; font-size: .8rem; line-height: 1.6; }
.resubmit-children { background: #f8f8f8; border-radius: 6px; padding: 9px 12px; margin: 4px 0 12px; font-size: .78rem; line-height: 1.6; }
.resubmit-title { font-weight: 700; color: #c87a00; margin-bottom: 3px; }
.resubmit-children .resubmit-title { color: #555; }
.resubmit-meta { color: #777; }
.resubmit-comment { margin-top: 5px; padding: 4px 8px; background: rgba(255,255,255,.7); border-radius: 4px; color: #555; font-style: italic; }
.resubmit-child { margin-top: 2px; color: #555; }

@media (max-width: 768px) {
  .dashboard-tiles { gap: 6px; }
  .tile { min-width: calc(50% - 6px); padding: 8px 10px; }
  .tile-num { font-size: 1.35rem; }
}
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-danger  { background: #c0392b; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-ghost   { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 8px 14px; font-size: .82rem; cursor: pointer; }

/* Mobile */
@media (max-width: 768px) {
  .page { padding: 14px; }
  .page-header { flex-direction: column; align-items: stretch; gap: 10px; }
  .page-header .btn-primary { align-self: flex-end; }
  .filter-tabs { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; margin: 0 -14px 12px; padding-left: 14px; padding-right: 14px; }
  .filter-tabs::-webkit-scrollbar { height: 0; }
  .ftab { white-space: nowrap; flex-shrink: 0; padding: 8px 14px; min-height: 36px; }
  .form-card { flex-direction: column; align-items: stretch; gap: 10px; padding: 14px; min-height: 64px; }
  .form-right { justify-content: space-between; }
  .modal { min-width: 0; width: calc(100vw - 24px); max-width: none; padding: 18px 16px; max-height: 92vh; }
  .modal-wide { max-width: none; }
  .detail-grid { grid-template-columns: 1fr; }
  .dfield.full { grid-column: span 1; }
  .form-grid { grid-template-columns: 1fr; gap: 0; }
  .modal-actions { flex-wrap: wrap; gap: 10px; }
  .modal-actions button { flex: 1; min-height: 44px; font-size: .9rem; }
}
</style>
