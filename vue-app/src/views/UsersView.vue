<template>
  <AppShell>
    <div class="page">
      <template v-if="!auth.isAdmin">
        <div class="no-access">
          <div class="lock-icon">🔒</div>
          <div class="lock-title">系統管理</div>
          <div class="lock-sub">此頁面僅限系統管理員存取</div>
        </div>
      </template>
      <template v-else>
        <div class="page-header">
          <div><h1>系統管理</h1><div class="page-meta">人員 · 稽核日誌</div></div>
          <button class="btn-primary" @click="openAdd">＋ 新增人員</button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', activeTab === 'users' ? 'active' : '']" @click="activeTab = 'users'">👥 人員管理</button>
          <button :class="['tab', activeTab === 'audit' ? 'active' : '']" @click="activeTab = 'audit'">📋 稽核日誌</button>
        </div>

        <!-- USERS tab -->
        <div v-if="activeTab === 'users'" class="tab-content">
          <!-- Filters -->
          <div class="filter-bar">
            <input v-model="filterQ" class="search-input" placeholder="🔍 搜尋姓名或帳號..." />
            <select v-model="filterDept" class="filter-sel">
              <option value="">全部科別</option>
              <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
            <select v-model="filterStatus" class="filter-sel">
              <option value="">全部狀態</option>
              <option value="active">在職</option>
              <option value="disabled">停用</option>
              <option value="resigned">離職</option>
            </select>
          </div>

          <!-- User table -->
          <div class="user-table-wrap">
            <table class="user-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>帳號</th>
                  <th>科別</th>
                  <th>職稱</th>
                  <th>角色</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in filteredUsers" :key="u.id">
                  <td class="td-name">
                    <span class="user-avatar">{{ u.name?.slice(0, 1) }}</span>
                    {{ u.name }}
                  </td>
                  <td class="td-muted">{{ u.username }}</td>
                  <td class="td-muted">{{ deptName(u.deptId) }}</td>
                  <td class="td-muted">{{ u.title }}</td>
                  <td><span :class="['role-chip', `role-${u.role}`]">{{ ROLE_LABELS[u.role] ?? u.role }}</span></td>
                  <td>
                    <select class="status-sel" :value="u.status ?? 'active'" @change="setStatus(u, ($event.target as HTMLSelectElement).value)">
                      <option value="active">在職</option>
                      <option value="disabled">停用</option>
                      <option value="resigned">離職</option>
                    </select>
                  </td>
                  <td class="td-actions">
                    <button class="btn-xs" @click="openEdit(u)">編輯</button>
                    <button class="btn-xs danger" @click="deleteUser(u.id)">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- AUDIT tab -->
        <div v-if="activeTab === 'audit'" class="tab-content">
          <div v-if="auditLog.length" class="audit-list">
            <div v-for="(log, i) in auditLog.slice(0, 100)" :key="i" class="audit-row">
              <span class="audit-time">{{ log.at?.slice(0, 16) }}</span>
              <span class="audit-user">{{ log.user }}</span>
              <span class="audit-action">{{ log.action }}</span>
              <span class="audit-detail">{{ log.detail }}</span>
            </div>
          </div>
          <div v-else class="empty-hint">尚無稽核記錄</div>
        </div>
      </template>
    </div>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯人員' : '新增人員' }}</h2>
          <div class="form-grid">
            <div class="form-row"><label>姓名</label><input v-model="modal.name" /></div>
            <div class="form-row"><label>帳號</label><input v-model="modal.username" /></div>
            <div class="form-row"><label>Email</label><input v-model="modal.email" type="email" /></div>
            <div class="form-row">
              <label>科別</label>
              <select v-model="modal.deptId">
                <option value="">（未指定）</option>
                <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
            <div class="form-row"><label>職稱</label><input v-model="modal.title" /></div>
            <div class="form-row">
              <label>角色</label>
              <select v-model="modal.role">
                <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div v-if="!modal.editId" class="form-row"><label>密碼</label><input v-model="modal.password" type="password" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.name.trim() || !modal.username.trim()" @click="save">儲存</button>
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
import type { User } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const ROLE_LABELS: Record<string, string> = { admin: '管理員', manager: '主管', member: '一般' }

const activeTab = ref('users')
const filterQ = ref('')
const filterDept = ref('')
const filterStatus = ref('')

const users = computed(() => rtdb.store?.users ?? [])
const departments = computed(() => rtdb.store?.departments ?? [])
const auditLog = computed(() => (rtdb.store as any)?.auditLog ?? [])

const filteredUsers = computed(() =>
  users.value.filter((u) => {
    const qOk = !filterQ.value || u.name?.toLowerCase().includes(filterQ.value.toLowerCase()) || u.username?.toLowerCase().includes(filterQ.value.toLowerCase())
    const dOk = !filterDept.value || u.deptId === filterDept.value
    const sOk = !filterStatus.value || (u.status ?? 'active') === filterStatus.value
    return qOk && dOk && sOk
  })
)

function deptName(id?: string) { return departments.value.find((d) => d.id === id)?.name ?? '' }

function setStatus(u: User, status: string) {
  (u as any).status = status; rtdb.save()
}
function deleteUser(id: string) {
  if (!rtdb.store || !confirm('確定刪除此人員？')) return
  rtdb.store.users = rtdb.store.users.filter((u) => u.id !== id)
  rtdb.save()
}

const modal = reactive({ open: false, editId: '', name: '', username: '', email: '', deptId: '', title: '', role: 'member', password: '' })
function openAdd() { Object.assign(modal, { open: true, editId: '', name: '', username: '', email: '', deptId: '', title: '', role: 'member', password: '' }) }
function openEdit(u: User) { Object.assign(modal, { open: true, editId: u.id, name: u.name, username: u.username, email: u.email ?? '', deptId: u.deptId ?? '', title: u.title ?? '', role: u.role, password: '' }) }
function save() {
  if (!modal.name.trim() || !modal.username.trim() || !rtdb.store) return
  if (modal.editId) {
    const u = rtdb.store.users.find((x) => x.id === modal.editId)
    if (u) { u.name = modal.name.trim(); u.username = modal.username.trim(); u.email = modal.email; u.deptId = modal.deptId; u.title = modal.title; u.role = modal.role as User['role'] }
  } else {
    rtdb.store.users.push({
      id: rtdb.uid(), name: modal.name.trim(), username: modal.username.trim(),
      email: modal.email, deptId: modal.deptId, title: modal.title,
      role: modal.role as User['role'], password: modal.password, avatar: 'av-a',
    })
  }
  rtdb.save(); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.no-access { text-align: center; padding: 80px 24px; }
.lock-icon { font-size: 3rem; margin-bottom: 16px; }
.lock-title { font-size: 1.1rem; font-weight: 600; color: #1a3c5e; margin-bottom: 6px; }
.lock-sub { font-size: .85rem; color: #aaa; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.tabs { display: flex; border-bottom: 2px solid #eee; margin-bottom: 16px; }
.tab { background: none; border: none; padding: 10px 16px; font-size: .88rem; cursor: pointer; color: #888; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #1a3c5e; border-bottom-color: #1a3c5e; font-weight: 700; }
.filter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.search-input { flex: 1; min-width: 180px; border: 1px solid #ddd; border-radius: 8px; padding: 7px 12px; font-size: .85rem; }
.filter-sel { border: 1px solid #ddd; border-radius: 6px; padding: 7px 8px; font-size: .82rem; }
.user-table-wrap { overflow-x: auto; }
.user-table { width: 100%; border-collapse: collapse; background: white; }
.user-table th, .user-table td { border: 1px solid #eee; padding: 9px 12px; font-size: .85rem; text-align: left; }
.user-table th { background: #f8f8f8; font-weight: 700; color: #555; }
.td-name { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #1a3c5e; }
.user-avatar { width: 24px; height: 24px; border-radius: 50%; background: #2e7d5a; color: white; display: flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 700; flex-shrink: 0; }
.td-muted { color: #666; }
.role-chip { font-size: .7rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.role-admin { background: #fde8e8; color: #c0392b; }
.role-manager { background: #fff3e0; color: #e67e22; }
.role-member { background: #f0f0f0; color: #888; }
.status-sel { border: 1px solid #ddd; border-radius: 4px; padding: 3px 5px; font-size: .78rem; }
.td-actions { white-space: nowrap; }
.audit-list { display: flex; flex-direction: column; gap: 3px; max-height: 500px; overflow-y: auto; }
.audit-row { display: flex; gap: 12px; font-size: .8rem; padding: 6px 10px; background: white; border: 1px solid #f0f0f0; border-radius: 5px; }
.audit-time { color: #aaa; white-space: nowrap; min-width: 120px; }
.audit-user { color: #1a3c5e; font-weight: 600; min-width: 60px; }
.audit-action { color: #555; min-width: 80px; }
.audit-detail { color: #888; }
.empty-hint { text-align: center; padding: 30px; color: #aaa; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 3px 7px; font-size: .75rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 380px; max-width: 560px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
</style>
