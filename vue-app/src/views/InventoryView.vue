<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>庫存管理</h1><div class="page-meta">耗材 · 藥品 · 物資追蹤</div></div>
        <button v-if="auth.isAdmin" class="btn-primary" @click="openNew">＋ 新增品項</button>
      </div>

      <!-- Metrics -->
      <div class="metrics">
        <div class="metric"><div class="m-num">{{ items.length }}</div><div class="m-lbl">品項總數</div></div>
        <div class="metric"><div class="m-num green">{{ okCount }}</div><div class="m-lbl">庫存充足</div></div>
        <div class="metric"><div class="m-num amber">{{ lowCount }}</div><div class="m-lbl">庫存偏低</div></div>
        <div class="metric"><div class="m-num red">{{ critCount }}</div><div class="m-lbl">已告磬</div></div>
      </div>

      <!-- Category filter -->
      <div class="cat-filter">
        <button :class="['cat-btn', catFilter === '' ? 'active' : '']" @click="catFilter = ''">全部</button>
        <button v-for="cat in INV_CATS" :key="cat" :class="['cat-btn', catFilter === cat ? 'active' : '']" @click="catFilter = cat">{{ cat }}</button>
      </div>

      <!-- Items grid -->
      <div v-if="filtered.length" class="inv-grid">
        <div v-for="item in filtered" :key="item.id" :class="['inv-card', statusClass(item)]">
          <div class="inv-top-bar" :class="statusClass(item)" />
          <div class="inv-name">{{ item.name }}</div>
          <div class="inv-cat">{{ item.category }}</div>
          <div class="inv-qty-row">
            <span :class="['inv-qty', statusClass(item)]">{{ item.qty }}</span>
            <span class="inv-unit">{{ item.unit ?? '個' }}</span>
            <span :class="['status-badge', statusClass(item)]">{{ statusLabel(item) }}</span>
          </div>
          <div class="inv-bar-wrap">
            <div class="inv-bar" :class="statusClass(item)" :style="{ width: barWidth(item) + '%' }" />
          </div>
          <div class="inv-min">最低安全量：{{ item.minQty }}{{ item.unit ?? '個' }}</div>
          <div v-if="auth.isAdmin" class="inv-actions">
            <button class="btn-xs" @click="openAdjust(item, 'in')">＋ 入庫</button>
            <button class="btn-xs" @click="openAdjust(item, 'out')">－ 出庫</button>
            <button class="btn-xs" @click="openEdit(item)">✏</button>
            <button class="btn-xs danger" @click="deleteItem(item.id)">×</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📦</div>
        <div>尚無品項</div>
        <button v-if="auth.isAdmin" class="btn-primary" style="margin-top:12px" @click="openNew">新增第一個品項</button>
      </div>

      <!-- Recent logs -->
      <div v-if="recentLogs.length" class="logs-section">
        <div class="sec-label">最近異動</div>
        <div class="log-list">
          <div v-for="log in recentLogs" :key="log.id" class="log-row">
            <span :class="['log-type', log.type === 'in' ? 'log-in' : 'log-out']">{{ log.type === 'in' ? '＋入庫' : '－出庫' }}</span>
            <span class="log-item">{{ itemName(log.itemId) }}</span>
            <span class="log-qty">{{ log.qty }}</span>
            <span class="log-user">{{ userName(log.userId) }}</span>
            <span class="log-date">{{ log.date }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Item modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯品項' : '新增品項' }}</h2>
          <div class="form-row"><label>品項名稱</label><input v-model="modal.name" /></div>
          <div class="form-grid">
            <div class="form-row">
              <label>分類</label>
              <select v-model="modal.category">
                <option v-for="cat in INV_CATS" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-row"><label>單位</label><input v-model="modal.unit" placeholder="個/盒/瓶" /></div>
            <div class="form-row"><label>目前庫存</label><input v-model.number="modal.qty" type="number" min="0" /></div>
            <div class="form-row"><label>最低安全量</label><input v-model.number="modal.minQty" type="number" min="0" /></div>
          </div>
          <div class="form-row"><label>存放位置</label><input v-model="modal.location" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.name.trim()" @click="save">儲存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Adjust modal -->
    <Teleport to="body">
      <div v-if="adjustModal.open" class="modal-backdrop" @click.self="adjustModal.open = false">
        <div class="modal">
          <h2>{{ adjustModal.type === 'in' ? '入庫' : '出庫' }}：{{ adjustModal.name }}</h2>
          <div class="form-row">
            <label>數量</label>
            <input v-model.number="adjustModal.qty" type="number" min="1" />
          </div>
          <div class="form-row"><label>備註（選填）</label><input v-model="adjustModal.note" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="adjustModal.open = false">取消</button>
            <button class="btn-primary" :disabled="adjustModal.qty <= 0" @click="saveAdjust">確定</button>
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
import type { InventoryItem } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const INV_CATS = ['耗材', '藥品', '器械', '清潔', '辦公', '其他']
const catFilter = ref('')
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const items = computed(() => rtdb.store?.inventory ?? [])
const logs = computed(() => rtdb.store?.inventoryLogs ?? [])

const okCount = computed(() => items.value.filter((i) => i.qty > i.minQty).length)
const lowCount = computed(() => items.value.filter((i) => i.qty > 0 && i.qty <= i.minQty).length)
const critCount = computed(() => items.value.filter((i) => i.qty === 0).length)
const filtered = computed(() => catFilter.value ? items.value.filter((i) => i.category === catFilter.value) : items.value)
const recentLogs = computed(() => [...logs.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10))

function statusClass(item: InventoryItem) {
  if (item.qty === 0) return 'status-crit'
  if (item.qty <= item.minQty) return 'status-low'
  return 'status-ok'
}
function statusLabel(item: InventoryItem) {
  if (item.qty === 0) return '告磬'
  if (item.qty <= item.minQty) return '偏低'
  return '充足'
}
function barWidth(item: InventoryItem) {
  const max = Math.max(item.minQty * 2 || 10, item.qty || 1)
  return Math.min(Math.round(item.qty / max * 100), 100)
}
function itemName(id: string) { return items.value.find((i) => i.id === id)?.name ?? id }
function userName(id: string) { return users.value.find((u) => u.id === id)?.name ?? '' }
function deleteItem(id: string) {
  if (!rtdb.store || !confirm('確定刪除此品項？')) return
  rtdb.store.inventory = rtdb.store.inventory.filter((i) => i.id !== id)
  rtdb.save()
}

// Item modal
const modal = reactive({ open: false, editId: '', name: '', category: INV_CATS[0], qty: 0, minQty: 5, unit: '個', location: '' })
function openNew() { Object.assign(modal, { open: true, editId: '', name: '', category: INV_CATS[0], qty: 0, minQty: 5, unit: '個', location: '' }) }
function openEdit(item: InventoryItem) { Object.assign(modal, { open: true, editId: item.id, name: item.name, category: item.category, qty: item.qty, minQty: item.minQty, unit: item.unit ?? '個', location: item.location ?? '' }) }
function save() {
  if (!modal.name.trim() || !rtdb.store) return
  if (!rtdb.store.inventory) rtdb.store.inventory = []
  if (modal.editId) {
    const item = rtdb.store.inventory.find((i) => i.id === modal.editId)
    if (item) Object.assign(item, { name: modal.name.trim(), category: modal.category, qty: modal.qty, minQty: modal.minQty, unit: modal.unit, location: modal.location })
  } else {
    rtdb.store.inventory.push({ id: rtdb.uid(), name: modal.name.trim(), category: modal.category, qty: modal.qty, minQty: modal.minQty, unit: modal.unit, location: modal.location })
  }
  rtdb.save(); modal.open = false
}

// Adjust modal
const adjustModal = reactive({ open: false, itemId: '', name: '', type: 'in' as 'in' | 'out', qty: 1, note: '' })
function openAdjust(item: InventoryItem, type: 'in' | 'out') { Object.assign(adjustModal, { open: true, itemId: item.id, name: item.name, type, qty: 1, note: '' }) }
function saveAdjust() {
  if (!rtdb.store || adjustModal.qty <= 0) return
  const item = rtdb.store.inventory.find((i) => i.id === adjustModal.itemId)
  if (!item) return
  if (adjustModal.type === 'in') item.qty += adjustModal.qty
  else item.qty = Math.max(0, item.qty - adjustModal.qty)
  if (!rtdb.store.inventoryLogs) rtdb.store.inventoryLogs = []
  rtdb.store.inventoryLogs.unshift({ id: rtdb.uid(), itemId: adjustModal.itemId, type: adjustModal.type, qty: adjustModal.qty, date: todayStr(), userId: currentUserId.value, note: adjustModal.note })
  rtdb.save(); adjustModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.metrics { display: flex; gap: 14px; margin-bottom: 16px; }
.metric { background: white; border-radius: 10px; padding: 14px 16px; text-align: center; flex: 1; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.m-num { font-size: 1.8rem; font-weight: 800; color: #1a3c5e; }
.m-num.green { color: #2e7d5a; }
.m-num.amber { color: #e67e22; }
.m-num.red { color: #c0392b; }
.m-lbl { font-size: .72rem; color: #aaa; margin-top: 2px; }
.cat-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.cat-btn { background: #f0f0f0; border: none; border-radius: 20px; padding: 5px 12px; font-size: .78rem; cursor: pointer; color: #555; }
.cat-btn.active { background: #1a3c5e; color: white; }
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; margin-bottom: 24px; }
.inv-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 14px; overflow: hidden; position: relative; }
.inv-top-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.inv-top-bar.status-ok { background: #2e7d5a; }
.inv-top-bar.status-low { background: #e67e22; }
.inv-top-bar.status-crit { background: #c0392b; }
.inv-name { font-weight: 700; color: #1a3c5e; font-size: .9rem; margin: 6px 0 2px; }
.inv-cat { font-size: .72rem; color: #aaa; margin-bottom: 8px; }
.inv-qty-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
.inv-qty { font-size: 1.6rem; font-weight: 800; }
.inv-qty.status-ok { color: #2e7d5a; }
.inv-qty.status-low { color: #e67e22; }
.inv-qty.status-crit { color: #c0392b; }
.inv-unit { font-size: .78rem; color: #888; }
.status-badge { font-size: .68rem; padding: 2px 6px; border-radius: 99px; font-weight: 700; margin-left: auto; }
.status-badge.status-ok { background: #d1fae5; color: #065f46; }
.status-badge.status-low { background: #fff3e0; color: #e65100; }
.status-badge.status-crit { background: #fde8e8; color: #c0392b; }
.inv-bar-wrap { height: 5px; background: #eee; border-radius: 99px; margin-bottom: 4px; }
.inv-bar { height: 100%; border-radius: 99px; transition: width .3s; }
.inv-bar.status-ok { background: #2e7d5a; }
.inv-bar.status-low { background: #e67e22; }
.inv-bar.status-crit { background: #c0392b; }
.inv-min { font-size: .68rem; color: #aaa; margin-bottom: 8px; }
.inv-actions { display: flex; gap: 4px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid #eee; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.logs-section { margin-top: 10px; }
.sec-label { font-size: .72rem; color: #aaa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
.log-list { background: white; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.log-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: .8rem; }
.log-row:last-child { border-bottom: none; }
.log-type { font-weight: 700; font-size: .72rem; padding: 1px 5px; border-radius: 4px; white-space: nowrap; }
.log-in { background: #d1fae5; color: #065f46; }
.log-out { background: #fde8e8; color: #c0392b; }
.log-item { flex: 1; color: #333; }
.log-qty { font-weight: 700; color: #1a3c5e; }
.log-user { color: #888; }
.log-date { color: #aaa; font-size: .72rem; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 2px 6px; font-size: .72rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 340px; max-width: 500px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
</style>
