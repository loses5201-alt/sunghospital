<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>請假管理</h1><div class="page-meta">申請 · 審核 · 餘額</div></div>
        <button class="btn-primary" @click="openNew">＋ 請假申請</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab', activeTab === 'mine' ? 'active' : '']" @click="activeTab = 'mine'">我的假期</button>
        <button v-if="auth.isManager" :class="['tab', activeTab === 'pending' ? 'active' : '']" @click="activeTab = 'pending'">
          待審核<span v-if="pendingCount" class="tab-badge">{{ pendingCount }}</span>
        </button>
        <button v-if="auth.isManager" :class="['tab', activeTab === 'all' ? 'active' : '']" @click="activeTab = 'all'">全部假期</button>
        <button v-if="auth.isAdmin" :class="['tab', activeTab === 'balance' ? 'active' : '']" @click="activeTab = 'balance'">餘額管理</button>
      </div>

      <!-- MINE tab -->
      <div v-if="activeTab === 'mine'" class="tab-content">
        <div class="balance-section">
          <div class="sec-label">假期餘額</div>
          <div class="balance-cards">
            <div v-for="lt in LEAVE_TYPES.filter(x => x.id !== 'maternity')" :key="lt.id" class="bal-card">
              <div class="bal-top-bar" :style="{ background: lt.color }" />
              <div class="bal-type">{{ lt.label }}</div>
              <div class="bal-remain" :style="{ color: balanceColor(lt, currentUserId) }">{{ remaining(lt.id, currentUserId) }}</div>
              <div class="bal-detail">已用 {{ used(lt.id, currentUserId) }} / 共 {{ total(lt.id, currentUserId) }} 天</div>
            </div>
          </div>
        </div>
        <LeaveList :leaves="myLeaves" :users="users" :is-manager="false" :current-user-id="currentUserId" @approve="approveLeave" @reject="rejectLeave" />
      </div>

      <!-- PENDING tab -->
      <div v-if="activeTab === 'pending'" class="tab-content">
        <LeaveList :leaves="pendingLeaves" :users="users" :is-manager="true" :current-user-id="currentUserId" @approve="approveLeave" @reject="rejectLeave" />
      </div>

      <!-- ALL tab -->
      <div v-if="activeTab === 'all'" class="tab-content">
        <LeaveList :leaves="allLeaves" :users="users" :is-manager="true" :current-user-id="currentUserId" @approve="approveLeave" @reject="rejectLeave" />
      </div>

      <!-- BALANCE tab -->
      <div v-if="activeTab === 'balance'" class="tab-content">
        <div class="balance-table-wrap">
          <table class="balance-table">
            <thead>
              <tr>
                <th>人員</th>
                <th v-for="lt in LEAVE_TYPES" :key="lt.id">{{ lt.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.name }}</td>
                <td v-for="lt in LEAVE_TYPES" :key="lt.id">
                  <input class="bal-input" type="number" min="0" :value="total(lt.id, u.id)" @change="updateBalance(u.id, lt.id, Number(($event.target as HTMLInputElement).value))" />
                  <span class="bal-used">(用{{ used(lt.id, u.id) }})</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New leave modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>請假申請</h2>
          <div class="form-row">
            <label>假別</label>
            <select v-model="modal.type">
              <option v-for="lt in LEAVE_TYPES" :key="lt.id" :value="lt.id">{{ lt.label }}</option>
            </select>
          </div>
          <div class="form-grid">
            <div class="form-row"><label>開始日期</label><input v-model="modal.startDate" type="date" /></div>
            <div class="form-row"><label>結束日期</label><input v-model="modal.endDate" type="date" /></div>
          </div>
          <div class="form-row"><label>原因（選填）</label><textarea v-model="modal.reason" rows="2" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.startDate || !modal.endDate" @click="save">送出申請</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import LeaveList from '../components/leave/LeaveList.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { Leave } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const LEAVE_TYPES = [
  { id: 'annual',    label: '年假',   color: '#2e7d5a',  defaultDays: 14 },
  { id: 'sick',      label: '病假',   color: '#1565c0',  defaultDays: 30 },
  { id: 'personal',  label: '事假',   color: '#e67e22',  defaultDays: 14 },
  { id: 'comp',      label: '補休',   color: '#6a1b9a',  defaultDays: 0  },
  { id: 'maternity', label: '產假',   color: '#c4527a',  defaultDays: 56 },
  { id: 'special',   label: '特別假', color: '#e65100',  defaultDays: 3  },
]

const activeTab = ref('mine')
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const leaves = computed(() => rtdb.store?.leaves ?? [])

const myLeaves = computed(() => [...leaves.value.filter((l) => l.userId === currentUserId.value)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const pendingLeaves = computed(() => leaves.value.filter((l) => l.status === 'pending'))
const pendingCount = computed(() => pendingLeaves.value.length)
const allLeaves = computed(() => [...leaves.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

function used(typeId: string, userId: string) {
  return leaves.value.filter((l) => l.userId === userId && l.type === typeId && l.status === 'approved').reduce((s, l) => s + (l.days ?? 0), 0)
}
function total(typeId: string, userId: string) {
  const bal = rtdb.store?.leaveBalance?.[userId]?.[typeId]
  const lt = LEAVE_TYPES.find((l) => l.id === typeId)
  return bal !== undefined ? bal : (lt?.defaultDays ?? 0)
}
function remaining(typeId: string, userId: string) { return total(typeId, userId) - used(typeId, userId) }
function balanceColor(lt: typeof LEAVE_TYPES[0], userId: string) {
  const r = remaining(lt.id, userId)
  if (r <= 0) return '#c0392b'
  if (r < 3) return '#e67e22'
  return lt.color
}

function updateBalance(userId: string, typeId: string, val: number) {
  if (!rtdb.store) return
  if (!rtdb.store.leaveBalance) rtdb.store.leaveBalance = {}
  if (!rtdb.store.leaveBalance[userId]) rtdb.store.leaveBalance[userId] = {}
  rtdb.store.leaveBalance[userId][typeId] = val
  rtdb.save()
}

function approveLeave(leave: Leave) {
  leave.status = 'approved'; leave.approvedBy = currentUserId.value; rtdb.save()
}
function rejectLeave(leave: Leave) {
  leave.status = 'rejected'; rtdb.save()
}

const modal = reactive({ open: false, type: 'annual', startDate: '', endDate: '', reason: '' })
function openNew() { Object.assign(modal, { open: true, type: 'annual', startDate: '', endDate: '', reason: '' }) }
function calcDays(start: string, end: string) {
  return Math.max(1, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1)
}
function save() {
  if (!modal.startDate || !modal.endDate || !rtdb.store) return
  if (!rtdb.store.leaves) rtdb.store.leaves = []
  rtdb.store.leaves.unshift({
    id: rtdb.uid(), userId: currentUserId.value, type: modal.type,
    startDate: modal.startDate, endDate: modal.endDate,
    days: calcDays(modal.startDate, modal.endDate),
    reason: modal.reason.trim(), status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
  })
  rtdb.save(); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 16px; }
.tab { background: none; border: none; padding: 10px 16px; font-size: .88rem; cursor: pointer; color: #888; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #1a3c5e; border-bottom-color: #1a3c5e; font-weight: 700; }
.tab-badge { background: #c0392b; color: white; border-radius: 99px; font-size: .65rem; padding: 1px 5px; margin-left: 4px; }
.tab-content { min-height: 200px; }
.balance-section { margin-bottom: 20px; }
.sec-label { font-size: .72rem; color: #aaa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 10px; }
.balance-cards { display: flex; gap: 10px; flex-wrap: wrap; }
.bal-card { background: white; border: 1.5px solid #eee; border-radius: 12px; padding: 14px 18px; min-width: 100px; text-align: center; position: relative; overflow: hidden; }
.bal-top-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.bal-type { font-size: .72rem; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: .05em; margin: 6px 0; }
.bal-remain { font-size: 2rem; font-weight: 900; line-height: 1; }
.bal-detail { font-size: .65rem; color: #aaa; margin-top: 3px; }
.balance-table-wrap { overflow-x: auto; }
.balance-table { border-collapse: collapse; width: 100%; background: white; }
.balance-table th, .balance-table td { border: 1px solid #eee; padding: 8px 10px; font-size: .82rem; text-align: center; }
.balance-table th { background: #f8f8f8; font-weight: 700; }
.bal-input { width: 48px; border: 1px solid #ddd; border-radius: 4px; padding: 3px 4px; text-align: center; font-size: .82rem; }
.bal-used { font-size: .68rem; color: #aaa; margin-left: 3px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 340px; max-width: 480px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
</style>
