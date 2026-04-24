<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>行事曆</h1><div class="page-meta">會議 · 班別 · 核准假單</div></div>
      </div>

      <!-- Nav -->
      <div class="cal-header">
        <div class="cal-nav">
          <button class="btn-nav" @click="prevMonth">‹</button>
          <span class="cal-title">{{ year }} 年 {{ month + 1 }} 月</span>
          <button class="btn-nav" @click="nextMonth">›</button>
        </div>
        <button class="btn-sm" @click="goToday">今天</button>
      </div>

      <!-- Calendar grid -->
      <div class="cal-wrap">
        <div class="cal-dow" v-for="d in DOW" :key="d">{{ d }}</div>
        <div
          v-for="cell in cells" :key="cell.key"
          :class="['cal-cell', cell.isToday ? 'today' : '', !cell.isCurrent ? 'other-month' : '']"
        >
          <div class="cal-date-num">{{ cell.date.getDate() }}</div>
          <div v-for="ev in cell.events" :key="ev.key" :class="['cal-event', `cal-ev-${ev.type}`]" :title="ev.title">{{ ev.label }}</div>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="leg-item"><span class="leg-dot ev-meeting" />會議</span>
        <span class="leg-item"><span class="leg-dot ev-duty" />我的班別</span>
        <span class="leg-item"><span class="leg-dot ev-leave" />核准假單</span>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const DOW = ['日', '一', '二', '三', '四', '五', '六']
const SHIFT_LABELS: Record<string, string> = { morning: '早', afternoon: '午', night: '夜', oncall: 'C', training: '訓', off: '' }

const today = new Date().toISOString().split('T')[0]
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth())

const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const leaves = computed(() => rtdb.store?.leaves ?? [])
const meetings = computed(() => rtdb.store?.meetings ?? [])
const dutySchedule = computed(() => (rtdb.store as any)?.dutySchedule as Record<string, Record<string, string>> ?? {})

function userName(id: string) { return users.value.find((u) => u.id === id)?.name ?? '' }
function goToday() { const d = new Date(); year.value = d.getFullYear(); month.value = d.getMonth() }
function prevMonth() { if (month.value === 0) { year.value--; month.value = 11 } else month.value-- }
function nextMonth() { if (month.value === 11) { year.value++; month.value = 0 } else month.value++ }

const cells = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const last = new Date(year.value, month.value + 1, 0)
  const startDow = first.getDay()
  const result: { key: string; date: Date; isCurrent: boolean; isToday: boolean; events: { key: string; type: string; label: string; title: string }[] }[] = []

  // padding days
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year.value, month.value, -(startDow - 1 - i))
    result.push({ key: `pre-${i}`, date: d, isCurrent: false, isToday: false, events: [] })
  }
  // month days
  for (let day = 1; day <= last.getDate(); day++) {
    const date = new Date(year.value, month.value, day)
    const ds = date.toISOString().split('T')[0]
    const isToday = ds === today
    const events: { key: string; type: string; label: string; title: string }[] = []

    // Meetings
    meetings.value.filter((m) => m.date === ds).forEach((m) => {
      events.push({ key: `m-${m.id}`, type: 'meeting', label: m.title.slice(0, 8), title: m.title })
    })
    // My duty
    const myDuty = dutySchedule.value[currentUserId.value]?.[ds]
    if (myDuty && myDuty !== 'off') {
      events.push({ key: `duty-${ds}`, type: 'duty', label: SHIFT_LABELS[myDuty] ?? myDuty, title: '我的班別' })
    }
    // Approved leaves
    leaves.value.filter((l) => l.status === 'approved' && l.startDate <= ds && l.endDate >= ds).forEach((l) => {
      const name = userName(l.userId).slice(0, 2)
      events.push({ key: `lv-${l.id}`, type: 'leave', label: `${name} 休`, title: `${userName(l.userId)} 請假` })
    })

    result.push({ key: ds, date, isCurrent: true, isToday, events })
  }
  // trailing padding
  let trailing = 1
  while (result.length % 7 !== 0) {
    const d = new Date(year.value, month.value + 1, trailing++)
    result.push({ key: `post-${trailing}`, date: d, isCurrent: false, isToday: false, events: [] })
  }
  return result
})
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.cal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.cal-nav { display: flex; align-items: center; gap: 10px; }
.btn-nav { background: #f0f0f0; border: none; border-radius: 5px; padding: 5px 12px; font-size: 1rem; cursor: pointer; color: #555; }
.cal-title { font-size: 1rem; font-weight: 700; color: #1a3c5e; min-width: 120px; text-align: center; }
.btn-sm { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .8rem; cursor: pointer; }
.cal-wrap { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #eee; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.cal-dow { background: #f8f8f8; text-align: center; font-size: .75rem; color: #888; font-weight: 700; padding: 6px; }
.cal-cell { background: white; min-height: 90px; padding: 6px; }
.cal-cell.today { background: #f0faf5; }
.cal-cell.other-month { background: #fafafa; opacity: .6; }
.cal-date-num { font-size: .82rem; font-weight: 700; color: #1a3c5e; margin-bottom: 4px; }
.cal-cell.today .cal-date-num { background: #2e7d5a; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .72rem; }
.cal-event { font-size: .65rem; padding: 1px 4px; border-radius: 3px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: default; }
.cal-ev-meeting { background: #dbeafe; color: #1e40af; }
.cal-ev-duty { background: #fef3c7; color: #92400e; }
.cal-ev-leave { background: #fde8e8; color: #c0392b; }
.legend { display: flex; gap: 14px; margin-top: 12px; flex-wrap: wrap; }
.leg-item { display: flex; align-items: center; gap: 5px; font-size: .78rem; color: #666; }
.leg-dot { width: 10px; height: 10px; border-radius: 2px; }
.ev-meeting { background: #dbeafe; }
.ev-duty { background: #fef3c7; }
.ev-leave { background: #fde8e8; }
</style>
