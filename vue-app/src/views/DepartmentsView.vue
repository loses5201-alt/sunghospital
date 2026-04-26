<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>科別管理</h1>
          <div class="page-meta">醫院科別 · 病房架構</div>
        </div>
        <button class="btn-primary" @click="openAdd">＋ 新增科別</button>
      </div>

      <div class="sec-label">科別列表（{{ departments.length }}）</div>
      <div class="card-grid">
        <div v-for="dept in departments" :key="dept.id" class="dept-card">
          <div class="dept-name">{{ dept.name }}</div>
          <div class="dept-meta">{{ memberCount(dept.id) }} 位成員</div>
          <div class="member-list">
            <div v-for="u in membersOf(dept.id)" :key="u.id" class="member-row">
              <span class="member-name">{{ u.name }}</span>
              <span class="title-chip">{{ u.title }}</span>
            </div>
            <span v-if="membersOf(dept.id).length === 0" class="empty-hint">尚無成員</span>
          </div>
          <div class="card-actions">
            <button class="btn-ghost" @click="openEdit(dept)">編輯</button>
            <button class="btn-danger-ghost" @click="confirmDelete(dept)">刪除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯科別' : '新增科別' }}</h2>
          <div class="form-row">
            <label>科別名稱</label>
            <input v-model="modal.name" placeholder="例：內科部" @keyup.enter="save" />
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.name.trim()" @click="save">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import type { Department } from '../types'

const rtdb = useRtdbStore()

const departments = computed(() => rtdb.store?.departments ?? [])
const users = computed(() => rtdb.store?.users ?? [])

function membersOf(deptId: string) {
  return users.value.filter((u) => u.deptId === deptId)
}
function memberCount(deptId: string) {
  return membersOf(deptId).length
}

const modal = reactive({ open: false, editId: '', name: '' })

function openAdd() {
  modal.editId = ''
  modal.name = ''
  modal.open = true
}
function openEdit(dept: Department) {
  modal.editId = dept.id
  modal.name = dept.name
  modal.open = true
}

function save() {
  if (!modal.name.trim() || !rtdb.store) return
  if (modal.editId) {
    const dept = rtdb.store.departments.find((d) => d.id === modal.editId)
    if (dept) dept.name = modal.name.trim()
  } else {
    rtdb.store.departments.push({ id: rtdb.uid(), name: modal.name.trim() })
  }
  rtdb.saveCollection('departments', rtdb.store!.departments)
  modal.open = false
}

function confirmDelete(dept: Department) {
  if (!rtdb.store) return
  const count = memberCount(dept.id)
  if (count > 0 && !confirm(`此科別有 ${count} 位成員，確定刪除？`)) return
  rtdb.store.departments = rtdb.store.departments.filter((d) => d.id !== dept.id)
  rtdb.store.users.forEach((u) => { if (u.deptId === dept.id) u.deptId = '' })
  rtdb.saveCollection('departments', rtdb.store!.departments)
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 20px;
}
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.sec-label { font-size: .75rem; color: #888; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 12px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.dept-card {
  background: white; border-radius: 10px; padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.dept-name { font-weight: 600; font-size: 1rem; color: #1a3c5e; margin-bottom: 4px; }
.dept-meta { font-size: .8rem; color: #888; margin-bottom: 10px; }
.member-list { border-top: 1px solid #eee; padding-top: 8px; margin-bottom: 12px; }
.member-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: .85rem; }
.member-name { color: #333; }
.title-chip { font-size: .75rem; color: #888; background: #f0f0f0; padding: 1px 6px; border-radius: 10px; }
.empty-hint { font-size: .78rem; color: #bbb; }
.card-actions { display: flex; gap: 8px; }
.btn-primary {
  background: #2e7d5a; color: white; border: none; border-radius: 7px;
  padding: 8px 16px; font-size: .85rem; cursor: pointer;
}
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost {
  background: transparent; border: 1px solid #ddd; color: #555;
  border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer;
}
.btn-danger-ghost {
  background: transparent; border: 1px solid #ddd; color: #c0392b;
  border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer;
}
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: white; border-radius: 12px; padding: 28px 24px;
  min-width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,.15);
}
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 16px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 6px; }
.form-row input {
  width: 100%; box-sizing: border-box; border: 1px solid #ddd;
  border-radius: 6px; padding: 8px 10px; font-size: .9rem;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
