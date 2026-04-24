<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>衛教資料庫</h1><div class="page-meta">點擊卡片展開詳細內容</div></div>
        <button v-if="auth.isAdmin" class="btn-primary" @click="openNew">＋ 新增</button>
      </div>

      <!-- Search bar -->
      <div class="search-row">
        <input v-model="search" class="search-input" placeholder="🔍 搜尋標題或內容..." />
        <span class="result-cnt">共 {{ filtered.length }} 筆</span>
      </div>

      <!-- Tag filter -->
      <div class="tag-filter">
        <button :class="['tag-btn', tagFilter === '' ? 'active' : '']" @click="tagFilter = ''">全部</button>
        <button v-for="(info, key) in ETAGS" :key="key" :class="['tag-btn', tagFilter === key ? 'active' : '', info.c]" @click="tagFilter = tagFilter === key ? '' : key">{{ info.l }}</button>
      </div>

      <!-- Cards -->
      <div v-if="filtered.length" class="edu-grid">
        <div v-for="item in filtered" :key="item.id" class="ecard">
          <div class="ecard-head" @click="toggleExpand(item.id)">
            <span class="eico">{{ item.icon ?? '📄' }}</span>
            <div class="ecard-info">
              <div class="etitle">{{ item.title }}</div>
              <div class="edesc">{{ item.desc }}</div>
              <div class="etags">
                <span v-for="t in item.tags" :key="t" :class="['etag', ETAGS[t]?.c ?? '']">{{ ETAGS[t]?.l ?? t }}</span>
              </div>
              <!-- Read progress -->
              <template v-if="auth.isAdmin">
                <div class="read-progress">
                  <div class="read-bar-wrap"><div class="read-bar" :style="{ width: readPct(item.id) + '%' }" /></div>
                  <span class="read-label">{{ readCount(item.id) }}/{{ totalUsers }} 人已讀</span>
                </div>
              </template>
              <span v-else-if="isRead(item.id)" class="my-read">✓ 已讀</span>
            </div>
            <span class="expand-icon">{{ expanded.has(item.id) ? '▲' : '▼' }}</span>
          </div>

          <!-- Expanded content -->
          <div v-if="expanded.has(item.id)" class="ecard-body">
            <pre class="econtent">{{ item.content }}</pre>
            <div v-if="auth.isAdmin" class="admin-btns">
              <button class="btn-xs" @click.stop="openEdit(item)">✏ 編輯</button>
              <button class="btn-xs danger" @click.stop="deleteEdu(item.id)">✕ 刪除</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <div>找不到符合的衛教資料</div>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯衛教資料' : '新增衛教資料' }}</h2>
          <div class="form-row"><label>標題</label><input v-model="modal.title" placeholder="衛教主題" /></div>
          <div class="form-grid">
            <div class="form-row"><label>圖示</label><input v-model="modal.icon" placeholder="例：🤱" /></div>
            <div class="form-row">
              <label>標籤</label>
              <div class="tag-checks">
                <label v-for="(info, key) in ETAGS" :key="key" class="checkbox-row">
                  <input v-model="modal.tags" type="checkbox" :value="key" />{{ info.l }}
                </label>
              </div>
            </div>
          </div>
          <div class="form-row"><label>簡介</label><input v-model="modal.desc" /></div>
          <div class="form-row"><label>詳細內容</label><textarea v-model="modal.content" rows="6" /></div>
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
import type { EduItem } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const ETAGS: Record<string, { l: string; c: string }> = {
  br: { l: '哺乳',  c: 'et-br' },
  nb: { l: '新生兒', c: 'et-nb' },
  pp: { l: '產後',  c: 'et-pp' },
  nu: { l: '營養',  c: 'et-nu' },
}

const search = ref('')
const tagFilter = ref('')
const expanded = ref(new Set<string>())
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const users = computed(() => rtdb.store?.users ?? [])
const totalUsers = computed(() => users.value.length)

const items = computed(() => rtdb.store?.eduItems ?? [])
const filtered = computed(() => items.value.filter((e) => {
  const q = search.value.trim().toLowerCase()
  const srOk = !q || [e.title, e.desc ?? '', e.content ?? ''].some((s) => s.toLowerCase().includes(q))
  const tagOk = !tagFilter.value || e.tags?.includes(tagFilter.value)
  return srOk && tagOk
}))

function readCount(eduId: string) {
  const reads = rtdb.store?.eduReads?.[eduId] ?? {}
  return users.value.filter((u) => reads[u.id]).length
}
function readPct(eduId: string) { return totalUsers.value ? Math.round(readCount(eduId) / totalUsers.value * 100) : 0 }
function isRead(eduId: string) { return !!(rtdb.store?.eduReads?.[eduId]?.[currentUserId.value]) }

function toggleExpand(id: string) {
  if (expanded.value.has(id)) { expanded.value.delete(id); return }
  expanded.value.add(id)
  // mark as read on expand
  if (!rtdb.store) return
  if (!rtdb.store.eduReads) rtdb.store.eduReads = {}
  if (!rtdb.store.eduReads[id]) rtdb.store.eduReads[id] = {}
  if (!rtdb.store.eduReads[id][currentUserId.value]) {
    rtdb.store.eduReads[id][currentUserId.value] = true
    rtdb.save()
  }
}

function deleteEdu(id: string) {
  if (!rtdb.store || !confirm('確定刪除此衛教資料？')) return
  rtdb.store.eduItems = rtdb.store.eduItems.filter((e) => e.id !== id)
  rtdb.save()
}

const modal = reactive({ open: false, editId: '', title: '', icon: '', tags: [] as string[], desc: '', content: '' })
function openNew() { Object.assign(modal, { open: true, editId: '', title: '', icon: '', tags: [], desc: '', content: '' }) }
function openEdit(item: EduItem) { Object.assign(modal, { open: true, editId: item.id, title: item.title, icon: item.icon ?? '', tags: [...(item.tags ?? [])], desc: item.desc ?? '', content: item.content ?? '' }) }
function save() {
  if (!modal.title.trim() || !rtdb.store) return
  if (!rtdb.store.eduItems) rtdb.store.eduItems = []
  if (modal.editId) {
    const item = rtdb.store.eduItems.find((e) => e.id === modal.editId)
    if (item) { item.title = modal.title.trim(); item.icon = modal.icon || '📄'; item.tags = [...modal.tags]; item.desc = modal.desc; item.content = modal.content }
  } else {
    rtdb.store.eduItems.push({ id: rtdb.uid(), title: modal.title.trim(), icon: modal.icon || '📄', tags: [...modal.tags], desc: modal.desc, content: modal.content })
  }
  rtdb.save(); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.search-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.search-input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: .88rem; }
.result-cnt { font-size: .78rem; color: #aaa; white-space: nowrap; }
.tag-filter { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
.tag-btn { background: #f0f0f0; border: none; border-radius: 20px; padding: 5px 12px; font-size: .78rem; cursor: pointer; color: #555; }
.tag-btn.active { background: #1a3c5e; color: white; }
.edu-grid { display: flex; flex-direction: column; gap: 10px; }
.ecard { background: white; border: 1.5px solid #eee; border-radius: 10px; overflow: hidden; }
.ecard-head { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; cursor: pointer; }
.ecard-head:hover { background: #fafafa; }
.eico { font-size: 1.8rem; flex-shrink: 0; }
.ecard-info { flex: 1; min-width: 0; }
.etitle { font-weight: 700; color: #1a3c5e; font-size: .95rem; margin-bottom: 3px; }
.edesc { font-size: .82rem; color: #666; margin-bottom: 6px; }
.etags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
.etag { font-size: .7rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.et-br { background: #fce7f3; color: #9d174d; }
.et-nb { background: #e0f2fe; color: #075985; }
.et-pp { background: #fef9c3; color: #713f12; }
.et-nu { background: #dcfce7; color: #14532d; }
.read-progress { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.read-bar-wrap { width: 80px; height: 4px; background: #eee; border-radius: 99px; flex-shrink: 0; }
.read-bar { height: 100%; background: #2e7d5a; border-radius: 99px; transition: width .3s; }
.read-label { font-size: .68rem; color: #aaa; }
.my-read { font-size: .72rem; color: #2e7d5a; font-weight: 700; }
.expand-icon { font-size: .72rem; color: #aaa; flex-shrink: 0; margin-top: 4px; }
.ecard-body { border-top: 1px solid #eee; padding: 14px 16px; }
.econtent { font-family: inherit; font-size: .88rem; color: #444; line-height: 1.8; white-space: pre-wrap; margin: 0 0 10px; }
.admin-btns { display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid #eee; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 3px 8px; font-size: .75rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 360px; max-width: 520px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 18px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tag-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.checkbox-row { display: flex; align-items: center; gap: 5px; font-size: .82rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>
