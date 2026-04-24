<template>
  <AppShell>
    <div class="kiosk-wrap">
      <div class="kiosk-header">
        <div class="kiosk-logo">宋俊宏婦幼醫院</div>
        <div class="kiosk-time-block">
          <div class="kiosk-time">{{ timeStr }}</div>
          <div class="kiosk-date">{{ dateStr }}</div>
        </div>
        <button class="btn-fs" @click="toggleFullscreen">⛶ 全螢幕</button>
      </div>

      <div class="kiosk-grid">
        <div class="kiosk-card kiosk-big">
          <div class="kiosk-label">目前班別</div>
          <div class="kiosk-value">{{ shiftNow }}</div>
        </div>
        <div class="kiosk-card">
          <div class="kiosk-label">使用中產房</div>
          <div class="kiosk-value amber">{{ activeRooms }}</div>
        </div>
        <div class="kiosk-card">
          <div class="kiosk-label">待審表單</div>
          <div class="kiosk-value" :class="pendingForms > 0 ? 'red' : 'green'">{{ pendingForms }}</div>
        </div>
        <div class="kiosk-card">
          <div class="kiosk-label">未結通報</div>
          <div class="kiosk-value" :class="openIR > 0 ? 'red' : 'green'">{{ openIR }}</div>
        </div>
        <div class="kiosk-card">
          <div class="kiosk-label">設備待處理</div>
          <div class="kiosk-value" :class="pendingEq > 0 ? 'amber' : 'green'">{{ pendingEq }}</div>
        </div>
        <div class="kiosk-card kiosk-wide">
          <div class="kiosk-label">今日當班人員</div>
          <div class="staff-row">
            <div v-for="u in onDutyToday" :key="u.id" class="staff-chip">
              <div class="av">{{ initials(u.name) }}</div>
              <span>{{ u.name }}</span>
            </div>
            <span v-if="!onDutyToday.length" class="faint">今日尚未排班</span>
          </div>
        </div>
        <div class="kiosk-card kiosk-wide">
          <div class="kiosk-label">最新公告</div>
          <div v-for="ann in latestAnn" :key="ann.id" class="ann-item">📢 {{ ann.title }}</div>
          <div v-if="!latestAnn.length" class="faint">無公告</div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'

const rtdb = useRtdbStore()

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 30000) })
onUnmounted(() => clearInterval(timer))

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const timeStr = computed(() => `${String(now.value.getHours()).padStart(2, '0')}:${String(now.value.getMinutes()).padStart(2, '0')}`)
const dateStr = computed(() => `${now.value.getFullYear()}年${now.value.getMonth() + 1}月${now.value.getDate()}日 星期${WEEKDAYS[now.value.getDay()]}`)
const shiftNow = computed(() => {
  const h = now.value.getHours()
  if (h >= 7 && h < 15) return '🌅 早班'
  if (h >= 15 && h < 23) return '☀️ 午班'
  return '🌙 夜班'
})

const today = computed(() => now.value.toISOString().split('T')[0])
const users = computed(() => rtdb.store?.users ?? [])

const onDutyToday = computed(() => {
  const ds = rtdb.store?.dutySchedule as Record<string, Record<string, string>> | undefined
  if (!ds) return []
  return Object.entries(ds)
    .filter(([, sched]) => { const s = sched[today.value]; return s && s !== 'off' })
    .map(([uid]) => users.value.find((u) => u.id === uid))
    .filter(Boolean)
    .slice(0, 8) as typeof users.value
})

const activeRooms = computed(() => (rtdb.store?.rooms ?? []).filter((r) => r.status === 'active' || r.status === 'waiting').length)
const pendingForms = computed(() => (rtdb.store?.formRequests ?? []).filter((f) => f.status === 'pending').length)
const openIR = computed(() => (rtdb.store?.incidents ?? []).filter((i) => i.status === 'new').length)
const pendingEq = computed(() => (rtdb.store?.equipment ?? []).filter((e) => e.status !== 'resolved').length)
const latestAnn = computed(() => (rtdb.store?.announcements ?? []).slice(0, 3))

function initials(name: string) { return name.slice(0, 1) }
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}
</script>

<style scoped>
.kiosk-wrap { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.kiosk-header { display: flex; align-items: center; gap: 16px; background: #1a3c5e; color: white; border-radius: 12px; padding: 16px 20px; }
.kiosk-logo { font-size: 1.2rem; font-weight: 800; }
.kiosk-time-block { margin-left: auto; text-align: right; }
.kiosk-time { font-size: 2rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.kiosk-date { font-size: .85rem; opacity: .8; }
.btn-fs { background: rgba(255,255,255,.15); border: none; color: white; border-radius: 6px; padding: 7px 12px; font-size: .82rem; cursor: pointer; margin-left: 12px; }
.kiosk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.kiosk-card { background: white; border-radius: 10px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.kiosk-big { grid-column: span 2; }
.kiosk-wide { grid-column: span 4; }
.kiosk-label { font-size: .75rem; color: #888; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
.kiosk-value { font-size: 2.4rem; font-weight: 800; color: #1a3c5e; }
.kiosk-value.red { color: #c0392b; }
.kiosk-value.green { color: #2e7d5a; }
.kiosk-value.amber { color: #e67e22; }
.staff-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
.staff-chip { display: flex; align-items: center; gap: 6px; font-size: .85rem; }
.av { width: 28px; height: 28px; border-radius: 50%; background: #2e7d5a; color: white; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; flex-shrink: 0; }
.ann-item { font-size: .88rem; color: #444; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
.ann-item:last-child { border-bottom: none; }
.faint { color: #bbb; font-size: .85rem; }
@media (max-width: 700px) {
  .kiosk-grid { grid-template-columns: 1fr 1fr; }
  .kiosk-big, .kiosk-wide { grid-column: span 2; }
}
</style>
