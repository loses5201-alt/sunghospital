<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>SOP 文件庫</h1>
          <div class="page-meta">院內作業標準程序 · 點擊確認已讀</div>
        </div>
        <button v-if="auth.isAdmin" class="btn-primary" @click="openNew">＋ 新增 SOP</button>
      </div>

      <!-- Search + Category filter -->
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input v-model="search" placeholder="搜尋 SOP..." />
      </div>
      <div class="filter-row">
        <button :class="['cat-btn', catFilter === '' ? 'active' : '']" @click="catFilter = ''">全部</button>
        <button
          v-for="cat in SOP_CATS" :key="cat"
          :class="['cat-btn', catFilter === cat ? 'active' : '']"
          @click="catFilter = cat"
        >{{ cat }}{{ catCount(cat) ? ` (${catCount(cat)})` : '' }}</button>
      </div>

      <!-- List -->
      <div v-if="filtered.length" class="sop-list">
        <div v-for="sop in filtered" :key="sop.id" class="sop-card">
          <div class="sop-card-top">
            <div class="sop-info">
              <div class="sop-title-row">
                <span class="sop-title">{{ sop.title }}</span>
                <span class="version-chip">v{{ sop.version || '1.0' }}</span>
                <span class="cat-chip" :style="catStyle(sop.category)">{{ sop.category }}</span>
              </div>
              <div class="sop-meta">最後更新：{{ (sop.updatedAt || '').slice(0, 10) }} · {{ userName(sop.updatedBy) }}</div>
            </div>
            <div v-if="auth.isAdmin" class="sop-admin-btns">
              <button class="btn-xs" @click="openEdit(sop)">編輯</button>
              <button class="btn-xs danger" @click="deleteSop(sop.id)">刪除</button>
            </div>
          </div>

          <!-- Ack progress (admin only) -->
          <div v-if="auth.isAdmin" class="ack-progress">
            <div class="ack-label">
              <span>確認閱讀率</span>
              <strong>{{ ackPct(sop) }}%</strong>
              <span class="ack-count">（{{ ackCount(sop) }}/{{ totalUsers }} 人）</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" :style="{ width: ackPct(sop) + '%' }" /></div>
          </div>

          <!-- Content (toggle) -->
          <div v-if="expanded.has(sop.id)" class="sop-body">{{ sop.content || '（無內容）' }}</div>

          <div class="sop-actions">
            <button class="btn-sm" @click="toggleBody(sop.id)">
              {{ expanded.has(sop.id) ? '▲ 收起' : '📖 閱讀內容' }}
            </button>
            <span v-if="isAcked(sop)" class="acked-label">✓ 已確認閱讀 <span class="acked-date">{{ (sop.acks?.[currentUserId] || '').slice(0, 10) }}</span></span>
            <button v-else class="btn-primary btn-sm" @click="ackSop(sop)">✓ 確認已讀</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <div>尚無 SOP 文件</div>
        <button v-if="auth.isAdmin" class="btn-primary" style="margin-top:12px" @click="openNew">新增第一份 SOP</button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯 SOP' : '新增 SOP' }}</h2>
          <div class="form-row">
            <label>標題</label>
            <input v-model="modal.title" placeholder="SOP 標題" />
          </div>
          <div class="form-grid">
            <div class="form-row">
              <label>分類</label>
              <select v-model="modal.category">
                <option v-for="c in SOP_CATS" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>版本號</label>
              <input v-model="modal.version" placeholder="1.0" />
            </div>
          </div>
          <div class="form-row">
            <label>內容（支援換行）</label>
            <textarea v-model="modal.content" rows="8" />
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.title.trim()" @click="save">儲存</button>
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
import type { Sop } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const SOP_CATS = ['護理', '行政', '緊急', '感控', '設備', '其他']
const CAT_COLORS: Record<string, string> = { 護理: '#c4527a', 行政: '#1558a0', 緊急: '#952020', 感控: '#0d6e65', 設備: '#8f5208', 其他: '#7a5862' }

const search = ref('')
const catFilter = ref('')
const expanded = ref(new Set<string>())

const sops = computed(() => rtdb.store?.sops ?? [])
const users = computed(() => rtdb.store?.users ?? [])
const totalUsers = computed(() => users.value.length)
const currentUserId = computed(() => auth.currentUser?.id ?? '')

const filtered = computed(() =>
  sops.value.filter((s) => {
    const catOk = !catFilter.value || s.category === catFilter.value
    const srOk = !search.value || s.title?.includes(search.value) || s.content?.includes(search.value)
    return catOk && srOk
  })
)

function catCount(cat: string) { return sops.value.filter((s) => s.category === cat).length }
function catStyle(cat: string) {
  const c = CAT_COLORS[cat] ?? '#888'
  return { background: c + '22', color: c }
}
function userName(id?: string) { return users.value.find((u) => u.id === id)?.name ?? '' }
function ackCount(sop: Sop) {
  const acks = sop.acks ?? {}
  return users.value.filter((u) => acks[u.id]).length
}
function ackPct(sop: Sop) {
  return totalUsers.value ? Math.round(ackCount(sop) / totalUsers.value * 100) : 0
}
function isAcked(sop: Sop) { return !!(sop.acks?.[currentUserId.value]) }
function toggleBody(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}
function ackSop(sop: Sop) {
  if (!sop.acks) sop.acks = {}
  sop.acks[currentUserId.value] = new Date().toISOString()
  rtdb.saveCollection('sops', rtdb.store!.sops)
}
function deleteSop(id: string) {
  if (!rtdb.store || !confirm('確定刪除此 SOP？')) return
  rtdb.store.sops = rtdb.store.sops.filter((s) => s.id !== id)
  rtdb.saveCollection('sops', rtdb.store!.sops)
}

const modal = reactive({ open: false, editId: '', title: '', category: SOP_CATS[0], version: '1.0', content: '' })

function openNew() { Object.assign(modal, { open: true, editId: '', title: '', category: SOP_CATS[0], version: '1.0', content: '' }) }
function openEdit(sop: Sop) {
  Object.assign(modal, { open: true, editId: sop.id, title: sop.title, category: sop.category, version: sop.version ?? '1.0', content: sop.content ?? '' })
}
function save() {
  if (!modal.title.trim() || !rtdb.store) return
  if (!rtdb.store.sops) rtdb.store.sops = []
  if (modal.editId) {
    const sop = rtdb.store.sops.find((s) => s.id === modal.editId)
    if (sop) {
      const verChanged = modal.version !== (sop.version ?? '1.0')
      sop.title = modal.title.trim(); sop.category = modal.category
      sop.version = modal.version || '1.0'; sop.content = modal.content
      sop.updatedAt = new Date().toISOString(); sop.updatedBy = currentUserId.value
      if (verChanged) sop.acks = {}
    }
  } else {
    rtdb.store.sops.push({
      id: rtdb.uid(), title: modal.title.trim(), category: modal.category,
      version: modal.version || '1.0', content: modal.content,
      updatedAt: new Date().toISOString(), updatedBy: currentUserId.value, acks: {},
    })
  }
  rtdb.saveCollection('sops', rtdb.store!.sops); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.search-bar { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; }
.search-bar input { border: none; outline: none; flex: 1; font-size: .9rem; }
.filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
.cat-btn { background: #f0f0f0; border: none; border-radius: 20px; padding: 5px 12px; font-size: .8rem; cursor: pointer; color: #555; }
.cat-btn.active { background: #1a3c5e; color: white; }
.sop-list { display: flex; flex-direction: column; gap: 14px; }
.sop-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 18px 20px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.sop-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.sop-info { flex: 1; }
.sop-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.sop-title { font-size: .95rem; font-weight: 800; color: #1a3c5e; }
.version-chip { font-size: .7rem; padding: 2px 7px; border-radius: 99px; background: #ede7f6; color: #6a1b9a; font-weight: 800; }
.cat-chip { font-size: .7rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.sop-meta { font-size: .75rem; color: #aaa; }
.sop-admin-btns { display: flex; gap: 5px; flex-shrink: 0; }
.ack-progress { margin: 10px 0; }
.ack-label { display: flex; align-items: center; gap: 8px; font-size: .75rem; color: #888; margin-bottom: 4px; }
.ack-label strong { color: #1a3c5e; }
.ack-count { color: #bbb; }
.progress-bar { height: 5px; background: #eee; border-radius: 99px; }
.progress-fill { height: 100%; background: #2e7d5a; border-radius: 99px; transition: width .4s; }
.sop-body { font-size: .85rem; color: #333; line-height: 1.85; white-space: pre-wrap; background: #f8f8f8; border-radius: 8px; padding: 12px 14px; margin: 12px 0; }
.sop-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.acked-label { font-size: .8rem; color: #2e7d5a; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.acked-date { font-weight: 400; color: #aaa; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-sm { padding: 5px 12px; font-size: .8rem; border-radius: 6px; border: 1px solid #ddd; background: transparent; color: #555; cursor: pointer; }
.btn-primary.btn-sm { border: none; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 3px 8px; font-size: .75rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 360px; max-width: 560px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
