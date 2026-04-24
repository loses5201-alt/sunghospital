<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>統計報表</h1><div class="page-meta">即時數據總覽</div></div>
      </div>

      <!-- Key metrics -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="mc-val">{{ taskRate }}%</div>
          <div class="mc-label">任務完成率</div>
          <div class="mc-sub">{{ doneTasks }}/{{ allTasks.length }} 件</div>
        </div>
        <div class="metric-card">
          <div class="mc-val" :class="irOpen > 0 ? 'red' : 'green'">{{ irOpen }}</div>
          <div class="mc-label">未結案事件</div>
        </div>
        <div class="metric-card">
          <div class="mc-val amber">{{ invLow }}</div>
          <div class="mc-label">庫存偏低品項</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">{{ activeUsers }}</div>
          <div class="mc-label">在職人員</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">{{ babies.length }}</div>
          <div class="mc-label">本月新生兒</div>
          <div class="mc-sub">♂{{ boys }} ♀{{ girls }}</div>
        </div>
        <div class="metric-card">
          <div class="mc-val">{{ pendingLeaves }}</div>
          <div class="mc-label">待審假單</div>
        </div>
      </div>

      <div class="stats-grid">
        <!-- Department staffing -->
        <div class="stat-card">
          <div class="stat-title">科別人數</div>
          <div class="bar-chart">
            <div v-for="d in deptStats" :key="d.name" class="bar-row">
              <span class="bar-label">{{ d.name }}</span>
              <div class="bar-wrap">
                <div class="bar-fill" :style="{ width: barPct(d.count, deptStats[0]?.count ?? 1) + '%' }" />
              </div>
              <span class="bar-val">{{ d.count }}</span>
            </div>
          </div>
        </div>

        <!-- Leave type usage -->
        <div class="stat-card">
          <div class="stat-title">請假類型分布（已核准）</div>
          <div class="bar-chart">
            <div v-for="lt in leaveStats" :key="lt.label" class="bar-row">
              <span class="bar-label">{{ lt.label }}</span>
              <div class="bar-wrap">
                <div class="bar-fill blue" :style="{ width: barPct(lt.count, Math.max(...leaveStats.map(x=>x.count), 1)) + '%' }" />
              </div>
              <span class="bar-val">{{ lt.count }}</span>
            </div>
          </div>
        </div>

        <!-- Shift distribution -->
        <div class="stat-card">
          <div class="stat-title">班別統計（全部）</div>
          <div class="shift-stats">
            <div v-for="s in shiftStats" :key="s.label" class="shift-item">
              <div class="shift-name">{{ s.label }}</div>
              <div class="shift-count" :style="{ color: s.color }">{{ s.count }}</div>
            </div>
          </div>
        </div>

        <!-- Incident by level -->
        <div class="stat-card">
          <div class="stat-title">事件通報等級</div>
          <div class="bar-chart">
            <div v-for="lv in irLevelStats" :key="lv.level" class="bar-row">
              <span class="bar-label">{{ lv.label }}</span>
              <div class="bar-wrap">
                <div class="bar-fill red" :style="{ width: barPct(lv.count, Math.max(...irLevelStats.map(x=>x.count), 1)) + '%' }" />
              </div>
              <span class="bar-val">{{ lv.count }}</span>
            </div>
          </div>
        </div>

        <!-- Recent 7 days incidents -->
        <div class="stat-card">
          <div class="stat-title">近 7 天事件通報趨勢</div>
          <div class="bar-chart">
            <div v-for="d in days7" :key="d.label" class="bar-row">
              <span class="bar-label">{{ d.label }}</span>
              <div class="bar-wrap">
                <div class="bar-fill amber" :style="{ width: barPct(d.count, Math.max(...days7.map(x=>x.count), 1)) + '%' }" />
              </div>
              <span class="bar-val">{{ d.count }}</span>
            </div>
          </div>
        </div>

        <!-- User task stats -->
        <div class="stat-card">
          <div class="stat-title">人員任務完成率</div>
          <div class="bar-chart">
            <div v-for="u in userTaskStats" :key="u.name" class="bar-row">
              <span class="bar-label">{{ u.name }}</span>
              <div class="bar-wrap">
                <div class="bar-fill green" :style="{ width: u.pct + '%' }" />
              </div>
              <span class="bar-val">{{ u.pct }}%</span>
            </div>
          </div>
        </div>

        <!-- Announcement read rates -->
        <div class="stat-card">
          <div class="stat-title">公告閱讀率（最新 6 則）</div>
          <div class="bar-chart">
            <div v-for="a in annReadRates" :key="a.title" class="bar-row">
              <span class="bar-label">{{ a.title.slice(0, 10) }}</span>
              <div class="bar-wrap">
                <div class="bar-fill" :style="{ width: a.pct + '%' }" />
              </div>
              <span class="bar-val">{{ a.pct }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'

const rtdb = useRtdbStore()

const today = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

const users = computed(() => rtdb.store?.users ?? [])
const meetings = computed(() => rtdb.store?.meetings ?? [])
const incidents = computed(() => rtdb.store?.incidents ?? [])
const leaves = computed(() => rtdb.store?.leaves ?? [])
const inventory = computed(() => rtdb.store?.inventory ?? [])
const departments = computed(() => rtdb.store?.departments ?? [])
const announcements = computed(() => rtdb.store?.announcements ?? [])
const babies = computed(() => (rtdb.store?.babies ?? []).filter((b) => b.born?.startsWith(thisMonth)))
const dutySchedule = computed(() => (rtdb.store as any)?.dutySchedule as Record<string, Record<string, string>> ?? {})

const allTasks = computed(() => meetings.value.flatMap((m) => m.tasks ?? []))
const doneTasks = computed(() => allTasks.value.filter((t) => t.status === '已完成').length)
const taskRate = computed(() => allTasks.value.length ? Math.round(doneTasks.value / allTasks.value.length * 100) : 0)
const irOpen = computed(() => incidents.value.filter((i) => i.status !== 'closed').length)
const invLow = computed(() => inventory.value.filter((i) => i.qty <= i.minQty).length)
const activeUsers = computed(() => users.value.filter((u) => (u as any).status !== 'disabled' && (u as any).status !== 'resigned').length)
const boys = computed(() => babies.value.filter((b) => b.gender === 'boy').length)
const girls = computed(() => babies.value.filter((b) => b.gender === 'girl').length)
const pendingLeaves = computed(() => leaves.value.filter((l) => l.status === 'pending').length)

const deptStats = computed(() =>
  departments.value.map((d) => ({ name: d.name, count: users.value.filter((u) => u.deptId === d.id).length }))
    .filter((d) => d.count > 0).sort((a, b) => b.count - a.count)
)

const LEAVE_TYPE_LABELS: Record<string, string> = { annual: '年假', sick: '病假', personal: '事假', comp: '補休', maternity: '產假', special: '特別假' }
const leaveStats = computed(() =>
  Object.entries(LEAVE_TYPE_LABELS).map(([id, label]) => ({
    label, count: leaves.value.filter((l) => l.type === id && l.status === 'approved').length,
  })).filter((d) => d.count > 0)
)

const shiftStats = computed(() => {
  const counts: Record<string, number> = { morning: 0, afternoon: 0, night: 0, oncall: 0 }
  Object.values(dutySchedule.value).forEach((ud) => Object.values(ud).forEach((sh) => { if (sh in counts) counts[sh]++ }))
  return [
    { label: '早班', count: counts.morning, color: '#e67e22' },
    { label: '午班', count: counts.afternoon, color: '#1565c0' },
    { label: '夜班', count: counts.night, color: '#6a1b9a' },
    { label: 'ON CALL', count: counts.oncall, color: '#c4527a' },
  ]
})

const irLevelStats = computed(() =>
  [1, 2, 3, 4].map((lv) => ({
    level: lv, label: `Level ${lv}`,
    count: incidents.value.filter((i) => String(i.level) === String(lv)).length,
  }))
)

const days7 = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, count: incidents.value.filter((ir) => ir.date === ds).length }
  })
})

const userTaskStats = computed(() =>
  users.value.map((u) => {
    const assigned = allTasks.value.filter((t) => t.assigneeId === u.id)
    const done = assigned.filter((t) => t.status === '已完成').length
    return { name: u.name, total: assigned.length, done, pct: assigned.length ? Math.round(done / assigned.length * 100) : 0 }
  }).filter((u) => u.total > 0).sort((a, b) => b.pct - a.pct).slice(0, 8)
)

const annReadRates = computed(() =>
  announcements.value.slice(0, 6).map((a) => {
    const total = users.value.length
    const read = Object.values(a.reads ?? {}).filter(Boolean).length
    return { title: a.title, pct: total ? Math.round(read / total * 100) : 0 }
  })
)

function barPct(val: number, max: number) { return max > 0 ? Math.min(Math.round(val / max * 100), 100) : 0 }
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.metric-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px; }
.metric-card { background: white; border-radius: 10px; padding: 14px 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.mc-val { font-size: 2rem; font-weight: 800; color: #1a3c5e; }
.mc-val.red { color: #c0392b; }
.mc-val.green { color: #2e7d5a; }
.mc-val.amber { color: #e67e22; }
.mc-label { font-size: .72rem; color: #888; margin-top: 3px; }
.mc-sub { font-size: .68rem; color: #aaa; margin-top: 2px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.stat-card { background: white; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.stat-title { font-size: .82rem; font-weight: 700; color: #1a3c5e; margin-bottom: 12px; }
.bar-chart { display: flex; flex-direction: column; gap: 7px; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.bar-label { font-size: .75rem; color: #555; min-width: 70px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-wrap { flex: 1; height: 8px; background: #eee; border-radius: 99px; overflow: hidden; }
.bar-fill { height: 100%; background: #2e7d5a; border-radius: 99px; transition: width .4s; }
.bar-fill.blue { background: #1565c0; }
.bar-fill.red { background: #c0392b; }
.bar-fill.amber { background: #e67e22; }
.bar-fill.green { background: #2e7d5a; }
.bar-val { font-size: .72rem; color: #888; min-width: 28px; text-align: right; }
.shift-stats { display: flex; gap: 16px; flex-wrap: wrap; }
.shift-item { text-align: center; }
.shift-name { font-size: .72rem; color: #888; }
.shift-count { font-size: 1.4rem; font-weight: 800; }
</style>
