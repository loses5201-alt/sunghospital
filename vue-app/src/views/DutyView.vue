<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>值班表</h1><div class="page-meta">產房護理排班 · 換班管理</div></div>
        <div class="header-actions">
          <button v-if="auth.isManager" class="btn-sm" @click="openBatch">✏️ 批次排班</button>
        </div>
      </div>

      <!-- Tabs (desktop) -->
      <div class="tabs hide-mobile">
        <button v-for="tab in TABS" :key="tab.key" :class="['tab', activeTab === tab.key ? 'active' : '']" @click="activeTab = tab.key">
          {{ tab.label }}<span v-if="tab.key === 'swap' && swapBadge" class="tab-badge">{{ swapBadge }}</span>
        </button>
      </div>

      <!-- Tab selector (mobile) -->
      <div class="tab-mobile-select">
        <select v-model="activeTab" class="tab-select">
          <option v-for="tab in TABS" :key="tab.key" :value="tab.key">
            {{ tab.label }}{{ tab.key === 'swap' && swapBadge ? ` (${swapBadge})` : '' }}
          </option>
        </select>
      </div>

      <!-- WEEK TAB -->
      <div v-if="activeTab === 'week'" class="tab-content">
        <div class="week-nav">
          <button class="btn-sm" @click="weekOffset--">‹ 上週</button>
          <span class="week-label">{{ weekLabel }}</span>
          <button class="btn-sm" @click="weekOffset++">下週 ›</button>
          <button v-if="weekOffset !== 0" class="btn-sm" @click="weekOffset = 0">回本週</button>
        </div>
        <div class="duty-wrap">
          <table class="duty-table">
            <thead>
              <tr>
                <th class="sticky-col name-col">姓名</th>
                <th v-for="(d, i) in weekDates" :key="d" :class="['day-col', d === today ? 'today' : '', weekCoverage[d]?.warn ? 'warn' : '']">
                  <div class="day-label">{{ DLBLS[i] }}</div>
                  <div class="day-date">{{ d.slice(5) }}</div>
                  <div class="cov-row">
                    <span class="cov cov-m">{{ weekCoverage[d]?.morning ?? 0 }}</span>
                    <span class="cov cov-a">{{ weekCoverage[d]?.afternoon ?? 0 }}</span>
                    <span class="cov cov-n">{{ weekCoverage[d]?.night ?? 0 }}</span>
                  </div>
                  <div v-if="weekCoverage[d]?.warn" class="warn-tag">⚠ 人力不足</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in activeNurses" :key="u.id" :class="u.id === currentUserId ? 'my-row' : ''">
                <td class="sticky-col name-cell">
                  <strong>{{ u.name }}</strong>
                  <span class="work-cnt">{{ weekWorkCount(u.id) }} 班</span>
                </td>
                <td v-for="d in weekDates" :key="d" :class="['shift-cell', d === today ? 'today-cell' : '']" @click="auth.isManager ? editShift(u.id, d) : null" :style="auth.isManager ? 'cursor:pointer' : ''">
                  <span v-if="onLeave(u.id, d)" class="sh-chip sh-leave">請假</span>
                  <span v-else :class="['sh-chip', shInfo(getShift(u.id, d)).c]">{{ shInfo(getShift(u.id, d)).l }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MONTH TAB -->
      <div v-if="activeTab === 'month'" class="tab-content">
        <div class="month-nav">
          <button class="btn-sm" @click="prevMonth">‹</button>
          <span class="month-label">{{ monthYear }}年{{ monthMonth + 1 }}月</span>
          <button class="btn-sm" @click="nextMonth">›</button>
        </div>
        <div class="cal-grid">
          <div v-for="dw in ['一','二','三','四','五','六','日']" :key="dw" class="cal-dow">{{ dw }}</div>
          <div v-for="cell in calCells" :key="cell.key" :class="['cal-cell', cell.isToday ? 'cal-today' : '', !cell.date ? 'cal-empty' : '']">
            <template v-if="cell.date">
              <div class="cal-day">{{ cell.date.slice(8) }}</div>
              <div class="cal-shifts">
                <div v-for="u in calShiftsForDay(cell.date)" :key="u.id" class="cal-shift-chip">
                  <span :class="['cal-sh', shInfo(u.shift).c]">{{ shInfo(u.shift).l.slice(0,1) }}</span>
                  <span class="cal-name">{{ u.name }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- MY SCHEDULE TAB -->
      <div v-if="activeTab === 'mine'" class="tab-content">
        <div class="my-schedule">
          <div v-for="{ date, shift, leaveInfo } in myUpcomingShifts" :key="date" class="my-shift-row">
            <div class="my-shift-date">{{ formatDateCN(date) }}</div>
            <span v-if="leaveInfo" class="sh-chip sh-leave">請假</span>
            <span v-else :class="['sh-chip', shInfo(shift).c]">{{ shInfo(shift).l }}</span>
            <span class="my-shift-time">{{ shInfo(shift).time }}</span>
          </div>
          <div v-if="!myUpcomingShifts.length" class="empty-hint">近 30 天無排班</div>
        </div>
      </div>

      <!-- SWAP TAB -->
      <div v-if="activeTab === 'swap'" class="tab-content">
        <div class="swap-header">
          <button class="btn-primary" @click="openNewSwap">＋ 申請換班</button>
        </div>
        <div v-if="swapRequests.length" class="swap-list">
          <div v-for="sw in swapRequests" :key="sw.id" class="swap-card">
            <div class="swap-info">
              <strong>{{ userName(sw.fromId) }}</strong> 申請與 <strong>{{ userName(sw.toId) }}</strong> 換班
              <div class="swap-dates">{{ sw.fromDate }} ({{ shInfo(sw.fromShift).l }}) ↔ {{ sw.toDate }} ({{ shInfo(sw.toShift).l }})</div>
              <div v-if="sw.reason" class="swap-reason">原因：{{ sw.reason }}</div>
            </div>
            <div class="swap-status">
              <span :class="['status-chip', `status-${sw.status}`]">{{ statusLabel(sw.status) }}</span>
              <template v-if="sw.status === 'pending'">
                <template v-if="sw.toId === currentUserId">
                  <button class="btn-sm" @click="approveSwap(sw)">同意</button>
                  <button class="btn-sm danger" @click="rejectSwap(sw)">拒絕</button>
                </template>
                <button v-if="sw.fromId === currentUserId" class="btn-sm danger" @click="cancelSwap(sw)">取消</button>
                <template v-if="auth.isManager && sw.fromId !== currentUserId && sw.toId !== currentUserId">
                  <button class="btn-sm" @click="approveSwap(sw)">核准</button>
                  <button class="btn-sm danger" @click="rejectSwap(sw)">拒絕</button>
                </template>
              </template>
            </div>
          </div>
        </div>
        <div v-else class="empty-hint">目前沒有換班申請</div>
      </div>

      <!-- STATS TAB -->
      <div v-if="activeTab === 'stats'" class="tab-content">
        <table class="stats-table">
          <thead>
            <tr>
              <th>人員</th>
              <th v-for="sh in ['morning','afternoon','night','oncall']" :key="sh">{{ shInfo(sh).l }}</th>
              <th>總班數</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in activeNurses" :key="u.id">
              <td>{{ u.name }}</td>
              <td v-for="sh in ['morning','afternoon','night','oncall']" :key="sh">{{ monthShiftCount(u.id, sh) }}</td>
              <td><strong>{{ monthTotalShifts(u.id) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit shift modal -->
    <Teleport to="body">
      <div v-if="shiftModal.open" class="modal-backdrop" @click.self="shiftModal.open = false">
        <div class="modal">
          <h2>排班 — {{ shiftModal.userName }} · {{ shiftModal.date }}</h2>
          <div class="shift-options">
            <button v-for="(info, key) in SHINFO" :key="key" :class="['shift-opt', shiftModal.shift === key ? 'selected' : '']" :style="{ borderColor: info.color, background: shiftModal.shift === key ? info.color : '', color: shiftModal.shift === key ? 'white' : '' }" @click="shiftModal.shift = key">
              {{ info.l }}
            </button>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="shiftModal.open = false">取消</button>
            <button class="btn-primary" @click="saveShift">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- New swap modal -->
    <Teleport to="body">
      <div v-if="swapModal.open" class="modal-backdrop" @click.self="swapModal.open = false">
        <div class="modal">
          <h2>申請換班</h2>
          <div class="form-grid">
            <div class="form-row"><label>我的日期</label><input v-model="swapModal.fromDate" type="date" /></div>
            <div class="form-row">
              <label>我的班別</label>
              <select v-model="swapModal.fromShift">
                <option v-for="(info, key) in SHINFO" :key="key" :value="key">{{ info.l }}</option>
              </select>
            </div>
            <div class="form-row"><label>對方日期</label><input v-model="swapModal.toDate" type="date" /></div>
            <div class="form-row">
              <label>對方班別</label>
              <select v-model="swapModal.toShift">
                <option v-for="(info, key) in SHINFO" :key="key" :value="key">{{ info.l }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label>換班對象</label>
            <select v-model="swapModal.toId">
              <option v-for="u in otherNurses" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </div>
          <div class="form-row"><label>原因（選填）</label><input v-model="swapModal.reason" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="swapModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!swapModal.fromDate || !swapModal.toDate || !swapModal.toId" @click="submitSwap">送出申請</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Batch edit modal -->
    <Teleport to="body">
      <div v-if="batchModal.open" class="modal-backdrop" @click.self="batchModal.open = false">
        <div class="modal">
          <h2>批次排班</h2>
          <div class="form-row"><label>人員</label>
            <select v-model="batchModal.userId">
              <option v-for="u in activeNurses" :key="u.id" :value="u.id">{{ u.name }}</option>
            </select>
          </div>
          <div class="form-grid">
            <div class="form-row"><label>開始日</label><input v-model="batchModal.startDate" type="date" /></div>
            <div class="form-row"><label>結束日</label><input v-model="batchModal.endDate" type="date" /></div>
          </div>
          <div class="form-row">
            <label>班別</label>
            <div class="shift-options">
              <button v-for="(info, key) in SHINFO" :key="key" :class="['shift-opt', batchModal.shift === key ? 'selected' : '']" :style="{ borderColor: info.color, background: batchModal.shift === key ? info.color : '', color: batchModal.shift === key ? 'white' : '' }" @click="batchModal.shift = key">
                {{ info.l }}
              </button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="batchModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!batchModal.userId || !batchModal.startDate || !batchModal.endDate" @click="saveBatch">套用</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { todayStr, formatDate } from '../utils/date'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { SwapRequest } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

type ShiftKey = 'morning' | 'afternoon' | 'night' | 'oncall' | 'training' | 'off'
const SHINFO: Record<ShiftKey, { l: string; c: string; time: string; color: string }> = {
  morning:   { l: '早班',    c: 'sh-m',   time: '07:00–15:00', color: '#f59e0b' },
  afternoon: { l: '午班',    c: 'sh-a',   time: '15:00–23:00', color: '#3b82f6' },
  night:     { l: '夜班',    c: 'sh-n',   time: '23:00–07:00', color: '#6366f1' },
  oncall:    { l: 'ON CALL', c: 'sh-oc',  time: '備勤',         color: '#c4527a' },
  training:  { l: '教育訓練', c: 'sh-tr',  time: '',             color: '#0d6e65' },
  off:       { l: '休假',    c: 'sh-off', time: '',             color: '#c0909a' },
}
const DLBLS = ['一', '二', '三', '四', '五', '六', '日']
const TABS = [
  { key: 'week', label: '週排班' }, { key: 'month', label: '月曆' },
  { key: 'mine', label: '我的班表' }, { key: 'swap', label: '換班申請' },
  { key: 'stats', label: '排班統計' },
]

// Mobile users land on "我的班表" (most useful single-screen view).
// Desktop defaults to "週排班" (overview).
const initialTab = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 'mine' : 'week'
const activeTab = ref(initialTab)
const weekOffset = ref(0)
const monthYear = ref(new Date().getFullYear())
const monthMonth = ref(new Date().getMonth())
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const today = computed(() => todayStr())

const users = computed(() => rtdb.store?.users ?? [])
const activeNurses = computed(() => users.value.filter((u) => u.status !== 'disabled' && u.status !== 'resigned'))
const otherNurses = computed(() => activeNurses.value.filter((u) => u.id !== currentUserId.value))
const dutySchedule = computed(() => rtdb.store?.dutySchedule ?? {})
const leaves = computed(() => rtdb.store?.leaves ?? [])
const swapRequests = computed(() => rtdb.store?.swapRequests ?? [])
const minStaff = computed(() => rtdb.store?.dutyMinStaff ?? { morning: 2, afternoon: 2, night: 1 })

function shInfo(key?: string) { return SHINFO[(key ?? 'off') as ShiftKey] ?? SHINFO.off }
function getShift(userId: string, date: string): string { return dutySchedule.value[userId]?.[date] ?? 'off' }
function userName(id: string) { return users.value.find((u) => u.id === id)?.name ?? '未知' }
function onLeave(userId: string, date: string) {
  return leaves.value.some((l) => l.userId === userId && l.status === 'approved' && l.startDate <= date && l.endDate >= date)
}

// Week view
const weekDates = computed(() => {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + weekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => { const dd = new Date(d); dd.setDate(d.getDate() + i); return formatDate(dd) })
})
const weekLabel = computed(() => `${weekDates.value[0].slice(0, 7).replace('-', '年')}月 ${weekDates.value[0].slice(8)}日 ~ ${weekDates.value[6].slice(8)}日`)
const weekCoverage = computed(() => {
  const cov: Record<string, { morning: number; afternoon: number; night: number; oncall: number; warn: boolean }> = {}
  weekDates.value.forEach((d) => {
    const c = { morning: 0, afternoon: 0, night: 0, oncall: 0, warn: false }
    activeNurses.value.forEach((u) => { const sh = getShift(u.id, d); if (sh in c) (c as any)[sh]++ })
    c.warn = Object.entries(minStaff.value).some(([k, v]) => (c as any)[k] < Number(v))
    cov[d] = c
  })
  return cov
})
function weekWorkCount(userId: string) { return weekDates.value.filter((d) => getShift(userId, d) !== 'off').length }

// Month view
function prevMonth() { if (monthMonth.value === 0) { monthYear.value--; monthMonth.value = 11 } else monthMonth.value-- }
function nextMonth() { if (monthMonth.value === 11) { monthYear.value++; monthMonth.value = 0 } else monthMonth.value++ }
const calCells = computed(() => {
  const first = new Date(monthYear.value, monthMonth.value, 1)
  const startDow = (first.getDay() + 6) % 7
  const daysInMonth = new Date(monthYear.value, monthMonth.value + 1, 0).getDate()
  const cells: { key: string; date?: string; isToday: boolean }[] = []
  for (let i = 0; i < startDow; i++) cells.push({ key: `empty-${i}`, isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${monthYear.value}-${String(monthMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ key: date, date, isToday: date === today.value })
  }
  return cells
})
function calShiftsForDay(date: string) {
  return activeNurses.value.flatMap((u) => {
    if (onLeave(u.id, date)) return [{ id: u.id, name: u.name, shift: 'leave' }]
    const sh = getShift(u.id, date)
    if (sh === 'off') return []
    return [{ id: u.id, name: u.name, shift: sh }]
  })
}

// My schedule
const myUpcomingShifts = computed(() => {
  const result: { date: string; shift: string; leaveInfo: boolean }[] = []
  const start = today.value
  const end = new Date(); end.setDate(end.getDate() + 30); const endStr = formatDate(end)
  const sched = dutySchedule.value[currentUserId.value] ?? {}
  Object.entries(sched).filter(([d]) => d >= start && d <= endStr).sort(([a], [b]) => a.localeCompare(b))
    .forEach(([d, sh]) => result.push({ date: d, shift: sh, leaveInfo: onLeave(currentUserId.value, d) }))
  return result
})
function formatDateCN(date: string) {
  const d = new Date(date); return `${d.getMonth() + 1}/${d.getDate()} ${DLBLS[(d.getDay() + 6) % 7]}`
}

// Swap
const swapBadge = computed(() => {
  const mine = swapRequests.value.filter((s) => s.status === 'pending' && (s.toId === currentUserId.value))
  return mine.length || undefined
})
function statusLabel(s: string) { return { pending: '待確認', approved: '已通過', rejected: '已拒絕', cancelled: '已取消' }[s] ?? s }
function approveSwap(sw: SwapRequest) {
  sw.status = 'approved'
  if (!rtdb.store) return
  if (!rtdb.store.dutySchedule) rtdb.store.dutySchedule = {}
  const ds = rtdb.store.dutySchedule
  if (!ds[sw.fromId]) ds[sw.fromId] = {}
  if (!ds[sw.toId]) ds[sw.toId] = {}
  if (sw.fromDate && sw.toDate) {
    const tmp = ds[sw.fromId][sw.fromDate]
    ds[sw.fromId][sw.fromDate] = ds[sw.toId][sw.toDate] ?? 'off'
    ds[sw.toId][sw.toDate] = tmp ?? 'off'
  }
  rtdb.save()
}
function rejectSwap(sw: SwapRequest) { sw.status = 'rejected'; rtdb.save() }
function cancelSwap(sw: SwapRequest) { sw.status = 'cancelled'; rtdb.save() }

// Stats (current month)
function monthShiftCount(userId: string, shift: string) {
  const prefix = `${monthYear.value}-${String(monthMonth.value + 1).padStart(2, '0')}-`
  const sched = dutySchedule.value[userId] ?? {}
  return Object.entries(sched).filter(([d, sh]) => d.startsWith(prefix) && sh === shift).length
}
function monthTotalShifts(userId: string) {
  const prefix = `${monthYear.value}-${String(monthMonth.value + 1).padStart(2, '0')}-`
  const sched = dutySchedule.value[userId] ?? {}
  return Object.entries(sched).filter(([d, sh]) => d.startsWith(prefix) && sh !== 'off').length
}

// Shift modal
const shiftModal = reactive({ open: false, userId: '', date: '', shift: 'off', userName: '' })
function editShift(userId: string, date: string) {
  const u = users.value.find((x) => x.id === userId)
  Object.assign(shiftModal, { open: true, userId, date, shift: getShift(userId, date), userName: u?.name ?? '' })
}
function saveShift() {
  if (!rtdb.store) return
  if (!rtdb.store.dutySchedule) rtdb.store.dutySchedule = {}
  const ds = rtdb.store.dutySchedule
  if (!ds[shiftModal.userId]) ds[shiftModal.userId] = {}
  ds[shiftModal.userId][shiftModal.date] = shiftModal.shift
  rtdb.save(); shiftModal.open = false
}

// Batch modal
const batchModal = reactive({ open: false, userId: '', startDate: '', endDate: '', shift: 'morning' as ShiftKey })
function openBatch() { Object.assign(batchModal, { open: true, userId: activeNurses.value[0]?.id ?? '', startDate: '', endDate: '', shift: 'morning' }) }
function saveBatch() {
  if (!rtdb.store || !batchModal.startDate || !batchModal.endDate) return
  if (!rtdb.store.dutySchedule) rtdb.store.dutySchedule = {}
  const ds = rtdb.store.dutySchedule
  if (!ds[batchModal.userId]) ds[batchModal.userId] = {}
  const cur = new Date(batchModal.startDate)
  const end = new Date(batchModal.endDate)
  while (cur <= end) {
    ds[batchModal.userId][formatDate(cur)] = batchModal.shift
    cur.setDate(cur.getDate() + 1)
  }
  rtdb.save(); batchModal.open = false
}

// Swap modal
const swapModal = reactive({ open: false, fromDate: '', fromShift: 'morning', toDate: '', toShift: 'morning', toId: '', reason: '' })
function openNewSwap() { Object.assign(swapModal, { open: true, fromDate: today.value, fromShift: 'morning', toDate: today.value, toShift: 'morning', toId: otherNurses.value[0]?.id ?? '', reason: '' }) }
function submitSwap() {
  if (!rtdb.store || !swapModal.fromDate || !swapModal.toDate || !swapModal.toId) return
  if (!rtdb.store.swapRequests) rtdb.store.swapRequests = []
  rtdb.store.swapRequests.unshift({
    id: rtdb.uid(), fromId: currentUserId.value, toId: swapModal.toId,
    fromDate: swapModal.fromDate, fromShift: swapModal.fromShift,
    toDate: swapModal.toDate, toShift: swapModal.toShift,
    reason: swapModal.reason.trim(), status: 'pending', createdAt: new Date().toISOString(),
  })
  rtdb.save(); swapModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.header-actions { display: flex; gap: 8px; }
.tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 16px; }
.tab { background: none; border: none; padding: 10px 16px; font-size: .88rem; cursor: pointer; color: #888; border-bottom: 2px solid transparent; margin-bottom: -2px; position: relative; }
.tab.active { color: #1a3c5e; border-bottom-color: #1a3c5e; font-weight: 700; }
.tab-badge { background: #c0392b; color: white; border-radius: 99px; font-size: .65rem; padding: 1px 5px; margin-left: 4px; }
.tab-content { min-height: 300px; }
.week-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.week-label { font-size: .9rem; font-weight: 700; min-width: 200px; text-align: center; }
.duty-wrap { overflow-x: auto; }
.duty-table { border-collapse: collapse; white-space: nowrap; width: 100%; }
.duty-table th, .duty-table td { border: 1px solid #eee; padding: 6px 8px; }
.sticky-col { position: sticky; left: 0; background: white; z-index: 2; }
.name-col { min-width: 90px; }
.day-col { text-align: center; min-width: 80px; background: #fafafa; }
.day-col.today { background: #e8f5ee; }
.day-col.warn { background: #fff3f3; }
.day-label { font-size: .8rem; font-weight: 800; }
.day-date { font-size: .72rem; color: #aaa; }
.cov-row { display: flex; justify-content: center; gap: 3px; margin-top: 3px; }
.cov { font-size: .7rem; padding: 1px 4px; border-radius: 3px; font-weight: 700; }
.cov-m { background: #fef3c7; color: #92400e; }
.cov-a { background: #dbeafe; color: #1e40af; }
.cov-n { background: #ede9fe; color: #4c1d95; }
.warn-tag { font-size: .65rem; color: #c0392b; font-weight: 700; }
.name-cell { font-size: .85rem; }
.name-cell strong { display: block; color: #1a3c5e; }
.work-cnt { font-size: .72rem; color: #aaa; }
.shift-cell { text-align: center; padding: 6px; }
.today-cell { background: #f0faf5; }
.my-row td { background: #fffde7 !important; }
.sh-chip { font-size: .72rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; display: inline-block; }
.sh-m { background: #fef3c7; color: #92400e; }
.sh-a { background: #dbeafe; color: #1e40af; }
.sh-n { background: #ede9fe; color: #4c1d95; }
.sh-oc { background: #fce7f3; color: #9d174d; }
.sh-tr { background: #d1fae5; color: #065f46; }
.sh-off { background: #f5f5f5; color: #aaa; }
.sh-leave { background: #fde8e8; color: #c0392b; }
.month-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.month-label { font-size: .95rem; font-weight: 700; min-width: 120px; text-align: center; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #eee; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.cal-dow { background: #f8f8f8; text-align: center; font-size: .75rem; color: #888; font-weight: 700; padding: 6px; }
.cal-cell { background: white; min-height: 80px; padding: 6px; }
.cal-cell.cal-today { background: #f0faf5; }
.cal-cell.cal-empty { background: #fafafa; }
.cal-day { font-size: .8rem; font-weight: 700; color: #1a3c5e; margin-bottom: 4px; }
.cal-shifts { display: flex; flex-direction: column; gap: 2px; }
.cal-shift-chip { display: flex; align-items: center; gap: 3px; font-size: .68rem; }
.cal-sh { font-size: .65rem; padding: 1px 3px; border-radius: 3px; font-weight: 700; }
.cal-name { color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px; }
.my-schedule { display: flex; flex-direction: column; gap: 8px; }
.my-shift-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: white; border-radius: 8px; border: 1px solid #eee; }
.my-shift-date { font-size: .85rem; font-weight: 600; min-width: 80px; color: #1a3c5e; }
.my-shift-time { font-size: .78rem; color: #888; }
.swap-header { margin-bottom: 14px; }
.swap-list { display: flex; flex-direction: column; gap: 10px; }
.swap-card { background: white; border: 1px solid #eee; border-radius: 10px; padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; }
.swap-info { flex: 1; font-size: .88rem; }
.swap-dates { font-size: .8rem; color: #666; margin-top: 4px; }
.swap-reason { font-size: .78rem; color: #888; margin-top: 3px; }
.swap-status { display: flex; align-items: center; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
.status-chip { font-size: .72rem; padding: 3px 8px; border-radius: 99px; font-weight: 700; }
.status-pending { background: #fef3c7; color: #92400e; }
.status-approved { background: #d1fae5; color: #065f46; }
.status-rejected { background: #fde8e8; color: #c0392b; }
.status-cancelled { background: #f5f5f5; color: #aaa; }
.stats-table { width: 100%; border-collapse: collapse; background: white; }
.stats-table th, .stats-table td { border: 1px solid #eee; padding: 8px 12px; font-size: .85rem; }
.stats-table th { background: #f8f8f8; font-weight: 700; }
.empty-hint { padding: 30px; text-align: center; color: #aaa; font-size: .88rem; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-sm { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .8rem; cursor: pointer; }
.btn-sm.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 360px; max-width: 560px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); max-height: 90vh; overflow-y: auto; }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.shift-options { display: flex; flex-wrap: wrap; gap: 8px; }
.shift-opt { border: 2px solid #ddd; background: transparent; border-radius: 8px; padding: 6px 12px; font-size: .82rem; cursor: pointer; transition: all .15s; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }

/* ---------- Mobile tab selector ---------- */
.tab-mobile-select { display: none; margin-bottom: 14px; }
.tab-select {
  width: 100%; border: 1.5px solid #1a3c5e; border-radius: 8px;
  padding: 8px 12px; font-size: .9rem; background: white;
  color: #1a3c5e; font-weight: 700;
}

/* ---------- Mobile (≤768px) ---------- */
@media (max-width: 768px) {
  .page { padding: 14px; }
  .tab-mobile-select { display: block; }

  .week-nav { gap: 6px; flex-wrap: wrap; }
  .week-nav .week-label { min-width: 100px; font-size: .82rem; flex: 1; }
  .week-nav .btn-sm { padding: 6px 10px; font-size: .78rem; }

  /* Make week table scroll horizontally with shorter columns */
  .duty-wrap { margin: 0 -14px; padding: 0 14px; }
  .day-col { min-width: 60px; }
  .day-col .day-label { font-size: .72rem; }
  .day-col .day-date { font-size: .65rem; }
  .name-col { min-width: 70px; }
  .name-cell { font-size: .76rem; }
  .work-cnt { font-size: .65rem; }
  .sh-chip { font-size: .65rem; padding: 2px 4px; }
  .cov { font-size: .6rem; padding: 1px 3px; }

  /* My schedule list: enlarge touch targets */
  .my-shift-row { padding: 14px; gap: 12px; min-height: 56px; }
  .my-shift-date { font-size: .9rem; min-width: 70px; }
  .my-shift-time { font-size: .75rem; }

  /* Calendar month view: drop cell height & font size */
  .cal-cell { min-height: 48px; padding: 3px; }
  .cal-day { font-size: .68rem; margin-bottom: 1px; }
  .cal-shift-chip { font-size: .58rem; }
  .cal-name { display: none; }
  .cal-sh { font-size: .58rem; padding: 0 2px; }

  /* Stats: convert to scrollable */
  .stats-table { font-size: .76rem; }
  .stats-table th, .stats-table td { padding: 6px 8px; }

  /* Shift modal: stack 2x2 (or 3x2) for 6 shift options */
  .shift-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .shift-opt { padding: 10px 6px; font-size: .85rem; }

  /* Modal becomes near-full-screen */
  .modal { padding: 18px 16px; min-width: 0; width: calc(100vw - 24px); max-width: none; max-height: 92vh; }
  .form-grid { grid-template-columns: 1fr; gap: 0; }

  /* Swap card stacking */
  .swap-card { flex-direction: column; align-items: stretch; gap: 10px; }
  .swap-status { justify-content: flex-start; }

  /* Header */
  .page-header { flex-direction: column; align-items: stretch; gap: 8px; }
  .header-actions { justify-content: flex-end; }
}
</style>
