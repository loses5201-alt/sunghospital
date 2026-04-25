<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div>
          <h1>公告牆</h1>
          <div class="page-meta">全院公告 · 感染管控警示</div>
        </div>
        <div class="header-actions" v-if="auth.isManager">
          <button class="btn-danger" @click="openEmergency">⚡ 緊急廣播</button>
          <button class="btn-primary" @click="openNew">＋ 發布公告</button>
        </div>
      </div>

      <!-- Announcements -->
      <div v-if="sorted.length" class="ann-list">
        <div
          v-for="ann in sorted" :key="ann.id"
          :class="['ann-card', infClass(ann)]"
          :data-ann-id="ann.id"
        >
          <span v-if="badgeOf(ann)" :class="['badge', badgeOf(ann)!.cls]">{{ badgeOf(ann)!.text }}</span>
          <div class="ann-header">
            <span class="ann-author-dot" />
            <span class="ann-title">{{ ann.title }}</span>
          </div>
          <div class="ann-body">{{ ann.body }}</div>
          <div class="ann-meta">{{ userName(ann.authorId) }} · {{ ann.time }}</div>

          <!-- Read progress -->
          <div class="read-progress">
            <span class="read-pct">{{ readCount(ann) }}/{{ totalUsers }} 人已讀（{{ readPct(ann) }}%）</span>
            <div class="read-bar-wrap"><div class="read-bar" :style="{ width: readPct(ann) + '%' }" /></div>
          </div>

          <div class="read-chips">
            <span
              v-for="u in users" :key="u.id"
              :class="['read-chip', ann.reads[u.id] ? 'read' : 'unread']"
            >{{ ann.reads[u.id] ? '✓' : '' }} {{ u.name }}</span>
          </div>

          <div class="ann-actions">
            <template v-if="!ann.reads[currentUserId]">
              <button class="btn-sm" @click="markRead(ann)">✓ 標示已讀</button>
            </template>
            <span v-else class="read-label">✓ 已讀</span>
            <template v-if="auth.isManager">
              <button class="btn-sm" @click="togglePin(ann)">{{ ann.pinned ? '取消置頂' : '📌 置頂' }}</button>
              <button class="btn-sm danger" @click="deleteAnn(ann.id)">刪除</button>
            </template>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📢</div>
        <div>尚無公告</div>
      </div>
    </div>

    <!-- Add modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>發布公告</h2>
          <div class="form-row"><label>標題</label><input v-model="modal.title" placeholder="公告主旨" /></div>
          <div class="form-row"><label>內容</label><textarea v-model="modal.body" rows="4" placeholder="詳細說明..." /></div>
          <div class="form-grid">
            <div class="form-row">
              <label>類別</label>
              <select v-model="modal.category">
                <option value="general">一般公告</option>
                <option value="infection">感染管控</option>
                <option value="admin">行政通知</option>
                <option value="training">教育訓練</option>
              </select>
            </div>
            <div class="form-row">
              <label>感染警示等級</label>
              <select v-model="modal.infectionLevel">
                <option value="">（無）</option>
                <option value="yellow">🟡 黃色</option>
                <option value="orange">🟠 橙色</option>
                <option value="red">🔴 紅色</option>
              </select>
            </div>
          </div>
          <div class="form-row checkbox-row">
            <input id="ann-pin" v-model="modal.pinned" type="checkbox" />
            <label for="ann-pin">置頂公告</label>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.title.trim() || !modal.body.trim()" @click="save">發布</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Emergency modal -->
    <Teleport to="body">
      <div v-if="emModal.open" class="modal-backdrop" @click.self="emModal.open = false">
        <div class="modal">
          <h2>⚡ 發送緊急廣播</h2>
          <div class="warning-box">⚠ 緊急廣播將強制所有在線用戶收到彈出通知，需本人確認已讀。</div>
          <div class="form-row">
            <label>緊急等級</label>
            <select v-model="emModal.level">
              <option value="green">🟢 一般通知</option>
              <option value="yellow">🟡 黃色警示</option>
              <option value="orange">🟠 橙色警示</option>
              <option value="red">🔴 紅色緊急</option>
            </select>
          </div>
          <div class="form-row"><label>標題</label><input v-model="emModal.title" placeholder="緊急事件標題..." /></div>
          <div class="form-row"><label>詳細說明</label><textarea v-model="emModal.body" rows="4" placeholder="請說明緊急事件詳情、應對措施..." /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="emModal.open = false">取消</button>
            <button class="btn-danger" :disabled="!emModal.title.trim()" @click="sendEmergency">發送廣播</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { todayStr } from '../utils/date'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { Announcement } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const users = computed(() => rtdb.store?.users ?? [])
const totalUsers = computed(() => users.value.length)
const currentUserId = computed(() => auth.currentUser?.id ?? '')

function userName(id?: string) { return users.value.find((u) => u.id === id)?.name ?? '' }

function weight(a: Announcement) {
  if (a.infectionLevel === 'red') return 0
  if (a.infectionLevel === 'orange') return 1
  if (a.pinned) return 2
  return 3
}

const sorted = computed(() =>
  [...(rtdb.store?.announcements ?? [])].sort((a, b) => weight(a) - weight(b) || b.time.localeCompare(a.time))
)

function infClass(ann: Announcement) {
  if (ann.infectionLevel === 'red') return 'inf-red'
  if (ann.infectionLevel === 'orange') return 'inf-orange'
  if (ann.infectionLevel === 'yellow') return 'inf-yellow'
  if (ann.pinned) return 'pinned'
  return ''
}
function badgeOf(ann: Announcement): { text: string; cls: string } | null {
  if (ann.infectionLevel === 'red') return { text: '🔴 感染紅色警示', cls: 'badge-red' }
  if (ann.infectionLevel === 'orange') return { text: '🟠 感染橙色警示', cls: 'badge-orange' }
  if (ann.infectionLevel === 'yellow') return { text: '🟡 感染黃色警示', cls: 'badge-yellow' }
  if (ann.pinned) return { text: '📌 置頂', cls: 'badge-pin' }
  return null
}
function readCount(ann: Announcement) { return users.value.filter((u) => ann.reads[u.id]).length }
function readPct(ann: Announcement) { return totalUsers.value ? Math.round(readCount(ann) / totalUsers.value * 100) : 0 }

function markRead(ann: Announcement) {
  ann.reads[currentUserId.value] = true
  rtdb.save()
}
function togglePin(ann: Announcement) { ann.pinned = !ann.pinned; rtdb.save() }
function deleteAnn(id: string) {
  if (!rtdb.store || !confirm('確定刪除？')) return
  rtdb.store.announcements = rtdb.store.announcements.filter((a) => a.id !== id)
  rtdb.save()
}

const modal = reactive({ open: false, title: '', body: '', category: 'general', infectionLevel: '' as Announcement['infectionLevel'], pinned: false })
function openNew() { Object.assign(modal, { open: true, title: '', body: '', category: 'general', infectionLevel: '', pinned: false }) }

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function today() { return todayStr() }

function save() {
  if (!modal.title.trim() || !modal.body.trim() || !rtdb.store) return
  const reads: Record<string, boolean> = {}
  users.value.forEach((u) => { reads[u.id] = u.id === currentUserId.value })
  rtdb.store.announcements.unshift({
    id: rtdb.uid(), title: modal.title.trim(), body: modal.body.trim(),
    authorId: currentUserId.value, time: `${today()} ${nowTime()}`,
    pinned: modal.pinned, category: modal.category,
    infectionLevel: modal.infectionLevel, reads,
  })
  rtdb.save(); modal.open = false
}

const emModal = reactive({ open: false, level: 'red', title: '', body: '' })
function openEmergency() { Object.assign(emModal, { open: true, level: 'red', title: '', body: '' }) }
function sendEmergency() {
  if (!emModal.title.trim() || !rtdb.store) return
  const reads: Record<string, boolean> = {}
  users.value.forEach((u) => { reads[u.id] = u.id === currentUserId.value })
  const infLv = emModal.level === 'red' ? 'red' : emModal.level === 'orange' ? 'orange' : emModal.level === 'yellow' ? 'yellow' : ''
  rtdb.store.announcements.unshift({
    id: rtdb.uid(), title: `⚡ ${emModal.title}`, body: emModal.body,
    authorId: currentUserId.value, time: `${today()} ${nowTime()}`,
    pinned: true, category: 'emergency', infectionLevel: infLv as Announcement['infectionLevel'], reads,
  })
  if (!rtdb.store.emergencies) rtdb.store.emergencies = []
  rtdb.store.emergencies.push({
    id: rtdb.uid(), title: emModal.title, body: emModal.body, level: emModal.level,
    authorId: currentUserId.value, time: `${today()} ${nowTime()}`,
    confirms: { [currentUserId.value]: true },
  })
  rtdb.save(); emModal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.header-actions { display: flex; gap: 8px; }
.ann-list { display: flex; flex-direction: column; gap: 14px; }
.ann-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 18px 20px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.ann-card.inf-red { border-left: 4px solid #c0392b; background: #fff8f8; }
.ann-card.inf-orange { border-left: 4px solid #e67e22; background: #fff9f0; }
.ann-card.inf-yellow { border-left: 4px solid #f1c40f; background: #fffde7; }
.ann-card.pinned { border-left: 4px solid #f1c40f; }
.ann-badge { margin-bottom: 8px; }
.badge { font-size: .72rem; padding: 2px 8px; border-radius: 99px; font-weight: 700; display: inline-block; margin-bottom: 6px; }
.badge-red { background: #fde8e8; color: #c0392b; }
.badge-orange { background: #fef0e0; color: #e67e22; }
.badge-yellow { background: #fffde7; color: #f39c12; }
.badge-pin { background: #fffde7; color: #f39c12; }
.ann-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.ann-title { font-size: .95rem; font-weight: 800; color: #1a3c5e; }
.ann-body { font-size: .88rem; color: #444; line-height: 1.7; margin-bottom: 6px; white-space: pre-wrap; }
.ann-meta { font-size: .75rem; color: #aaa; margin-bottom: 10px; }
.read-progress { margin-bottom: 8px; }
.read-pct { font-size: .75rem; color: #888; }
.read-bar-wrap { height: 4px; background: #eee; border-radius: 99px; margin-top: 4px; }
.read-bar { height: 100%; background: #2e7d5a; border-radius: 99px; transition: width .4s; }
.read-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.read-chip { font-size: .7rem; padding: 2px 7px; border-radius: 99px; }
.read-chip.read { background: #e8f5e9; color: #2e7d32; }
.read-chip.unread { background: #f5f5f5; color: #aaa; }
.ann-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.read-label { font-size: .8rem; color: #2e7d5a; font-weight: 700; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-danger { background: #c0392b; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-sm { padding: 5px 10px; font-size: .78rem; border-radius: 5px; border: 1px solid #ddd; background: transparent; color: #555; cursor: pointer; }
.btn-sm.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 360px; max-width: 560px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; }
.checkbox-row input { width: auto; }
.checkbox-row label { margin: 0; }
.warning-box { background: #fde8e8; border: 1px solid #f0c0c0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: .82rem; color: #c0392b; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
