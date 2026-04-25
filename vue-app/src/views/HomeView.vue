<template>
  <AppShell>
    <div class="page">
      <div class="welcome">
        <div class="welcome-text">
          <h1>早安，{{ auth.currentUser?.name ?? '' }}</h1>
          <div class="today-info">{{ todayLabel }}</div>
        </div>
      </div>

      <!-- Alert summary -->
      <div v-if="alerts.length" class="alert-section">
        <div v-for="a in alerts" :key="a.key" :class="['alert-card', `alert-${a.level}`]">
          <span class="alert-icon">{{ a.icon }}</span>
          <div class="alert-content">
            <div class="alert-title">{{ a.title }}</div>
            <div class="alert-sub">{{ a.sub }}</div>
          </div>
          <RouterLink :to="a.path" class="alert-link">查看 →</RouterLink>
        </div>
      </div>

      <!-- Quick stats -->
      <div class="stat-grid">
        <RouterLink to="/shift" class="stat-card">
          <div class="sc-icon">📋</div>
          <div class="sc-val">{{ todayShifts }}</div>
          <div class="sc-label">今日交班</div>
        </RouterLink>
        <RouterLink to="/patient" class="stat-card">
          <div class="sc-icon">🏥</div>
          <div class="sc-val">{{ activePatients }}</div>
          <div class="sc-label">在院病患</div>
        </RouterLink>
        <RouterLink to="/leave" class="stat-card">
          <div class="sc-icon">🌿</div>
          <div class="sc-val">{{ pendingLeaves }}</div>
          <div class="sc-label">待審假單</div>
        </RouterLink>
        <RouterLink to="/duty" class="stat-card">
          <div class="sc-icon">📅</div>
          <div class="sc-val">{{ myShiftToday }}</div>
          <div class="sc-label">今日班別</div>
        </RouterLink>
        <RouterLink to="/forms" class="stat-card">
          <div class="sc-icon">✍️</div>
          <div class="sc-val">{{ pendingForms }}</div>
          <div class="sc-label">待簽表單</div>
        </RouterLink>
        <RouterLink to="/incident" class="stat-card">
          <div class="sc-icon">🚨</div>
          <div class="sc-val">{{ openIncidents }}</div>
          <div class="sc-label">未結案事件</div>
        </RouterLink>
      </div>

      <!-- Latest announcements -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">最新公告</span>
          <RouterLink to="/announcements" class="section-more">全部 →</RouterLink>
        </div>
        <div v-if="latestAnn.length" class="ann-list">
          <div v-for="ann in latestAnn" :key="ann.id" class="ann-row">
            <span v-if="ann.infectionLevel" class="ann-badge-inf">
              {{ ann.infectionLevel === 'red' ? '🔴' : ann.infectionLevel === 'orange' ? '🟠' : '🟡' }}
            </span>
            <div class="ann-info">
              <div class="ann-title">{{ ann.title }}</div>
              <div class="ann-meta">{{ ann.time }}</div>
            </div>
            <span v-if="!ann.reads?.[currentUserId]" class="unread-dot" />
          </div>
        </div>
        <div v-else class="empty-hint">尚無公告</div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const today = new Date().toISOString().split('T')[0]
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const d = new Date()
const todayLabel = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 星期${WEEKDAYS[d.getDay()]}`
const currentUserId = computed(() => auth.currentUser?.id ?? '')

const shifts = computed(() => rtdb.store?.shifts ?? [])
const patients = computed(() => rtdb.store?.patients ?? [])
const leaves = computed(() => rtdb.store?.leaves ?? [])
const forms = computed(() => rtdb.store?.formRequests ?? [])
const incidents = computed(() => rtdb.store?.incidents ?? [])
const equipment = computed(() => rtdb.store?.equipment ?? [])
const announcements = computed(() => rtdb.store?.announcements ?? [])
const dutySchedule = computed(() => rtdb.store?.dutySchedule ?? {})

const SHIFT_LABELS: Record<string, string> = { morning: '早班', afternoon: '午班', night: '夜班', oncall: 'ON CALL', off: '休假' }

const todayShifts = computed(() => shifts.value.filter((s) => s.date === today).length)
const activePatients = computed(() => patients.value.filter((p) => !p.discharged).length)
const pendingLeaves = computed(() => leaves.value.filter((l) => l.status === 'pending').length)
const pendingForms = computed(() => forms.value.filter((f) => f.status === 'pending').length)
const openIncidents = computed(() => incidents.value.filter((i) => i.status !== 'closed').length)
const myShiftToday = computed(() => {
  const s = dutySchedule.value[currentUserId.value]?.[today] ?? 'off'
  return SHIFT_LABELS[s] ?? s
})

const latestAnn = computed(() => announcements.value.slice(0, 5))

const alerts = computed(() => {
  const list: { key: string; level: string; icon: string; title: string; sub: string; path: string }[] = []
  const critShifts = shifts.value.filter((s) => !s.toSigned && s.urgency === 'critical').length
  if (critShifts) list.push({ key: 'crit-shift', level: 'red', icon: '🚨', title: `${critShifts} 筆警示交班待簽收`, sub: '請盡快確認', path: '/shift' })
  const pendingEq = equipment.value.filter((e) => e.status !== 'resolved').length
  if (pendingEq) list.push({ key: 'eq', level: 'amber', icon: '🔧', title: `${pendingEq} 筆設備問題待處理`, sub: '', path: '/equipment' })
  if (pendingLeaves.value) list.push({ key: 'leave', level: 'info', icon: '🌿', title: `${pendingLeaves.value} 筆假單等待審核`, sub: '', path: '/leave' })
  if (pendingForms.value) list.push({ key: 'forms', level: 'info', icon: '✍️', title: `${pendingForms.value} 筆表單等待簽核`, sub: '', path: '/forms' })
  return list
})
</script>

<style scoped>
.page { padding: 24px; }
.welcome { margin-bottom: 20px; }
h1 { font-size: 1.4rem; margin: 0 0 4px; color: #1a3c5e; }
.today-info { font-size: .82rem; color: #888; }
.alert-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.alert-card { background: white; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; border-left: 4px solid #eee; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
.alert-red { border-left-color: #c0392b; background: #fff8f8; }
.alert-amber { border-left-color: #e67e22; background: #fffaf5; }
.alert-info { border-left-color: #1565c0; }
.alert-icon { font-size: 1.2rem; flex-shrink: 0; }
.alert-content { flex: 1; }
.alert-title { font-size: .88rem; font-weight: 600; color: #1a3c5e; }
.alert-sub { font-size: .75rem; color: #888; }
.alert-link { font-size: .78rem; color: #2e7d5a; font-weight: 700; text-decoration: none; white-space: nowrap; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px; }
.stat-card { background: white; border-radius: 10px; padding: 14px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); text-decoration: none; transition: box-shadow .15s; }
.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.sc-icon { font-size: 1.4rem; margin-bottom: 6px; }
.sc-val { font-size: 1.6rem; font-weight: 800; color: #1a3c5e; }
.sc-label { font-size: .72rem; color: #888; margin-top: 2px; }
.section { background: white; border-radius: 10px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title { font-weight: 700; color: #1a3c5e; font-size: .9rem; }
.section-more { font-size: .78rem; color: #2e7d5a; text-decoration: none; font-weight: 600; }
.ann-list { display: flex; flex-direction: column; gap: 8px; }
.ann-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.ann-row:last-child { border-bottom: none; }
.ann-badge-inf { font-size: .9rem; flex-shrink: 0; }
.ann-info { flex: 1; }
.ann-title { font-size: .85rem; color: #333; font-weight: 500; }
.ann-meta { font-size: .72rem; color: #aaa; }
.unread-dot { width: 7px; height: 7px; border-radius: 50%; background: #c0392b; flex-shrink: 0; }
.empty-hint { text-align: center; padding: 20px; color: #aaa; font-size: .85rem; }
</style>
