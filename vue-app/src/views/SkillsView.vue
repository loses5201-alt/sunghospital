<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>技能矩陣</h1>
          <div class="page-meta">員工技能 · 證照 · 到期提醒</div>
        </div>
        <button v-if="auth.isAdmin" class="btn-primary" @click="openNewDef">＋ 新增技能欄位</button>
      </div>

      <!-- Dept filter -->
      <div class="filter-row">
        <button :class="['cat-btn', deptFilter === '' ? 'active' : '']" @click="deptFilter = ''">全部科別</button>
        <button
          v-for="dept in departments" :key="dept.id"
          :class="['cat-btn', deptFilter === dept.id ? 'active' : '']"
          @click="deptFilter = dept.id"
        >{{ dept.name }}</button>
      </div>

      <!-- Expiry alerts -->
      <div v-if="expiryAlerts.length" class="alerts">
        <div v-for="a in expiryAlerts" :key="a.key" :class="['alert', a.expired ? 'alert-red' : 'alert-amber']">
          <span>{{ a.expired ? '🔴' : '⚠️' }}</span>
          <strong>{{ a.userName }}</strong>
          <span>的「{{ a.skillName }}」{{ a.expired ? '已過期' : '即將到期' }}（{{ a.date }}）</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span v-for="lv in levelList" :key="lv.key" class="legend-chip" :style="{ background: lv.bg, color: lv.color }">{{ lv.label }}</span>
        <span class="legend-chip" style="background:#fde8e8;color:#c0392b">✗ 過期</span>
        <span class="legend-chip" style="background:#fff3e0;color:#e67e22">⚠ 即將到期</span>
      </div>

      <!-- Matrix table -->
      <div v-if="skillDefs.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sticky-col">人員</th>
              <th v-for="s in skillDefs" :key="s.id" class="skill-th">
                <div class="skill-name">{{ s.name }}</div>
                <div class="skill-cat">{{ s.category }}</div>
                <div v-if="auth.isAdmin" class="skill-actions">
                  <button @click="openEditDef(s)">✏️</button>
                  <button @click="deleteDef(s.id)">🗑️</button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filteredUsers" :key="u.id">
              <td class="sticky-col user-cell">
                <div class="user-info">
                  <strong>{{ u.name }}</strong>
                  <span class="user-title">{{ u.title }}</span>
                </div>
              </td>
              <td v-for="s in skillDefs" :key="s.id" class="matrix-cell">
                <button v-if="auth.isAdmin" :style="cellStyle(u.id, s.id)" @click="openCell(u, s)">
                  {{ cellLabel(u.id, s.id) }}
                </button>
                <span v-else :style="cellStyle(u.id, s.id)">{{ cellLabel(u.id, s.id) }}</span>
                <div v-if="getCell(u.id, s.id).expireDate" class="cell-date" :style="{ color: cellDateColor(u.id, s.id) }">
                  {{ getCell(u.id, s.id).expireDate }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🎓</div>
        <div>尚未建立技能欄位</div>
        <button v-if="auth.isAdmin" class="btn-primary" style="margin-top:12px" @click="openNewDef">建立第一個技能</button>
      </div>
    </div>

    <!-- Def modal -->
    <Teleport to="body">
      <div v-if="defModal.open" class="modal-backdrop" @click.self="defModal.open = false">
        <div class="modal">
          <h2>{{ defModal.editId ? '編輯技能欄位' : '新增技能欄位' }}</h2>
          <div class="form-row">
            <label>技能名稱</label>
            <input v-model="defModal.name" placeholder="例：CPR" />
          </div>
          <div class="form-row">
            <label>分類</label>
            <select v-model="defModal.category">
              <option v-for="c in SKILL_CATS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-row checkbox-row">
            <input id="req-exp" v-model="defModal.requiresExpiry" type="checkbox" />
            <label for="req-exp">需要填寫到期日</label>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="defModal.open = false">取消</button>
            <button class="btn-primary" :disabled="!defModal.name.trim()" @click="saveDef">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Cell modal -->
    <Teleport to="body">
      <div v-if="cellModal.open" class="modal-backdrop" @click.self="cellModal.open = false">
        <div class="modal">
          <h2>{{ cellModal.userName }} — {{ cellModal.skillName }}</h2>
          <div class="form-row">
            <label>程度</label>
            <select v-model="cellModal.level">
              <option value="">—</option>
              <option v-for="lv in levelList" :key="lv.key" :value="lv.key">{{ lv.label }}</option>
            </select>
          </div>
          <div v-if="cellModal.requiresExpiry" class="form-row">
            <label>到期日</label>
            <input v-model="cellModal.expireDate" type="date" />
          </div>
          <div class="form-row">
            <label>備註（選填）</label>
            <input v-model="cellModal.note" />
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="cellModal.open = false">取消</button>
            <button class="btn-primary" @click="saveCell">儲存</button>
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
import type { SkillDef, SkillCell, User } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const SKILL_CATS = ['臨床技能', '急救', '特殊操作', '證照/認證']
const SOON_MS = 60 * 24 * 60 * 60 * 1000
const TODAY = todayStr()

const levelList = [
  { key: 'certified', label: '✓ 認證', bg: '#e8f5e9', color: '#2e7d32' },
  { key: 'trained',   label: '◎ 受訓', bg: '#e3f2fd', color: '#1565c0' },
  { key: 'learning',  label: '△ 學習', bg: '#ede7f6', color: '#6a1b9a' },
]

const departments = computed(() => rtdb.store?.departments ?? [])
const skillDefs = computed(() => rtdb.store?.skillDefs ?? [])
const deptFilter = ref('')

const filteredUsers = computed(() =>
  (rtdb.store?.users ?? []).filter((u) => {
    const active = u.status !== 'disabled' && u.status !== 'resigned'
    const deptOk = !deptFilter.value || u.deptId === deptFilter.value
    return active && deptOk
  })
)

function getCell(userId: string, skillId: string): Partial<SkillCell> {
  return rtdb.store?.skillMatrix?.[userId]?.[skillId] ?? {}
}

function isExpired(date: string) { return !!date && date < TODAY }
function isExpiringSoon(date: string) {
  if (!date || isExpired(date)) return false
  return (new Date(date).getTime() - new Date(TODAY).getTime()) < SOON_MS
}

function cellStyle(userId: string, skillId: string) {
  const cell = getCell(userId, skillId)
  const exp = cell.expireDate ?? ''
  const lv = levelList.find((l) => l.key === cell.level)
  if (isExpired(exp)) return { background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '.75rem', fontWeight: '700', minWidth: '70px', cursor: 'pointer' }
  if (isExpiringSoon(exp)) return { background: '#fff3e0', color: '#e67e22', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '.75rem', fontWeight: '700', minWidth: '70px', cursor: 'pointer' }
  if (lv) return { background: lv.bg, color: lv.color, border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '.75rem', fontWeight: '700', minWidth: '70px', cursor: 'pointer' }
  return { background: 'transparent', color: '#bbb', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '.75rem', fontWeight: '700', minWidth: '70px', cursor: 'pointer' }
}
function cellLabel(userId: string, skillId: string) {
  const cell = getCell(userId, skillId)
  const exp = cell.expireDate ?? ''
  if (isExpired(exp)) return '✗ 過期'
  if (isExpiringSoon(exp)) return '⚠ 即將'
  return levelList.find((l) => l.key === cell.level)?.label ?? '—'
}
function cellDateColor(userId: string, skillId: string) {
  const cell = getCell(userId, skillId)
  const exp = cell.expireDate ?? ''
  if (isExpired(exp)) return '#c0392b'
  if (isExpiringSoon(exp)) return '#e67e22'
  return '#aaa'
}

const expiryAlerts = computed(() => {
  const alerts: { key: string; userName: string; skillName: string; date: string; expired: boolean }[] = []
  filteredUsers.value.forEach((u) => {
    skillDefs.value.forEach((s) => {
      const cell = getCell(u.id, s.id)
      const exp = cell.expireDate ?? ''
      if (exp && cell.level === 'certified') {
        const expired = isExpired(exp)
        const soon = isExpiringSoon(exp)
        if (expired || soon) alerts.push({ key: u.id + s.id, userName: u.name, skillName: s.name, date: exp, expired })
      }
    })
  })
  return alerts
})

// Def modal
const defModal = reactive({ open: false, editId: '', name: '', category: SKILL_CATS[0], requiresExpiry: false })
function openNewDef() { Object.assign(defModal, { open: true, editId: '', name: '', category: SKILL_CATS[0], requiresExpiry: false }) }
function openEditDef(s: SkillDef) { Object.assign(defModal, { open: true, editId: s.id, name: s.name, category: s.category, requiresExpiry: !!s.requiresExpiry }) }
function saveDef() {
  if (!defModal.name.trim() || !rtdb.store) return
  if (!rtdb.store.skillDefs) rtdb.store.skillDefs = []
  if (defModal.editId) {
    const s = rtdb.store.skillDefs.find((x) => x.id === defModal.editId)
    if (s) { s.name = defModal.name.trim(); s.category = defModal.category; s.requiresExpiry = defModal.requiresExpiry }
  } else {
    rtdb.store.skillDefs.push({ id: rtdb.uid(), name: defModal.name.trim(), category: defModal.category, requiresExpiry: defModal.requiresExpiry })
  }
  rtdb.save(); defModal.open = false
}
function deleteDef(id: string) {
  if (!rtdb.store || !confirm('確定刪除此技能欄位？（相關資料也將刪除）')) return
  rtdb.store.skillDefs = rtdb.store.skillDefs.filter((s) => s.id !== id)
  if (rtdb.store.skillMatrix) Object.values(rtdb.store.skillMatrix).forEach((um) => { delete um[id] })
  rtdb.save()
}

// Cell modal
const cellModal = reactive({ open: false, userId: '', skillId: '', userName: '', skillName: '', requiresExpiry: false, level: '' as SkillCell['level'], expireDate: '', note: '' })
function openCell(u: User, s: SkillDef) {
  const cell = getCell(u.id, s.id)
  Object.assign(cellModal, {
    open: true, userId: u.id, skillId: s.id,
    userName: u.name, skillName: s.name, requiresExpiry: !!s.requiresExpiry,
    level: cell.level ?? '', expireDate: cell.expireDate ?? '', note: cell.note ?? '',
  })
}
function saveCell() {
  if (!rtdb.store) return
  if (!rtdb.store.skillMatrix) rtdb.store.skillMatrix = {}
  if (!rtdb.store.skillMatrix[cellModal.userId]) rtdb.store.skillMatrix[cellModal.userId] = {}
  rtdb.store.skillMatrix[cellModal.userId][cellModal.skillId] = {
    level: cellModal.level,
    expireDate: cellModal.requiresExpiry ? cellModal.expireDate : '',
    note: cellModal.note.trim(),
    updatedAt: new Date().toISOString(),
  }
  rtdb.save(); cellModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.cat-btn { background: #f0f0f0; border: none; border-radius: 20px; padding: 5px 12px; font-size: .8rem; cursor: pointer; color: #555; }
.cat-btn.active { background: #1a3c5e; color: white; }
.alerts { margin-bottom: 16px; }
.alert { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; font-size: .85rem; }
.alert-red { background: #fde8e8; border-left: 3px solid #c0392b; }
.alert-amber { background: #fff3e0; border-left: 3px solid #e67e22; }
.legend { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.legend-chip { padding: 3px 10px; border-radius: 99px; font-size: .75rem; font-weight: 700; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; white-space: nowrap; }
th, td { border: 1px solid #eee; padding: 8px; }
.sticky-col { position: sticky; left: 0; background: white; z-index: 2; }
.skill-th { text-align: center; vertical-align: bottom; min-width: 90px; }
.skill-name { font-size: .75rem; font-weight: 800; }
.skill-cat { font-size: .65rem; color: #aaa; }
.skill-actions button { background: none; border: none; cursor: pointer; font-size: .75rem; padding: 0 2px; }
.user-cell { min-width: 130px; }
.user-info { display: flex; flex-direction: column; }
.user-info strong { font-size: .85rem; }
.user-title { font-size: .72rem; color: #888; }
.matrix-cell { text-align: center; padding: 6px; }
.cell-date { font-size: .65rem; margin-top: 2px; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; }
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.checkbox-row input { width: auto; }
.checkbox-row label { margin: 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
