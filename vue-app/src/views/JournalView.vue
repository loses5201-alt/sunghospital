<template>
  <AppShell>
    <div class="page">
      <!-- Detail view -->
      <template v-if="openPostId">
        <button class="btn-back" @click="openPostId = ''">← 返回</button>
        <PostDetail v-if="openPost" :post="openPost" :users="users" :current-user-id="currentUserId" :is-admin="auth.isAdmin" @like-post="likePost" @add-comment="addComment" @like-comment="likeComment" @delete-comment="deleteComment" />
      </template>

      <!-- List view -->
      <template v-else>
        <div class="page-header">
          <div><h1>留言板</h1><div class="page-meta">全員公開 · 分享、問題、閒聊都歡迎</div></div>
          <button class="btn-primary" @click="openNew">✏️ 發文</button>
        </div>

        <div class="toolbar">
          <input v-model="search" class="search-input" placeholder="🔍 搜尋貼文…" />
          <div class="cat-tabs">
            <button :class="['cat-btn', catFilter === 'all' ? 'active' : '']" @click="catFilter = 'all'">全部</button>
            <button v-for="cat in BOARD_CATS" :key="cat.key" :class="['cat-btn', catFilter === cat.key ? 'active' : '']" @click="catFilter = cat.key">{{ cat.e }} {{ cat.l }}</button>
          </div>
          <select v-model="sortBy" class="sort-sel">
            <option value="newest">最新</option>
            <option value="liked">最多讚</option>
            <option value="commented">最多留言</option>
          </select>
        </div>

        <div v-if="sorted.length" class="post-feed">
          <div v-for="post in sorted" :key="post.id" :class="['post-card', post.pinned ? 'pinned' : '']">
            <div v-if="post.pinned" class="pin-badge">📌 置頂</div>
            <div class="post-head">
              <div class="post-meta">
                <strong>{{ userName(post.userId) }}</strong>
                <span :class="['cat-chip', catInfo(post.category).c]">{{ catInfo(post.category).e }} {{ catInfo(post.category).l }}</span>
                <span v-if="post.edited" class="edited-tag">（已編輯）</span>
              </div>
              <span class="post-time">{{ formatTs(post.createdAt) }}</span>
              <div v-if="canEdit(post)" class="post-menu-wrap">
                <button class="menu-btn" @click.stop="toggleMenu(post.id)">⋮</button>
                <div v-if="menuOpenId === post.id" class="post-menu">
                  <div v-if="post.userId === currentUserId" @click="openEdit(post)">✏️ 編輯</div>
                  <div v-if="canEdit(post)" @click="deletePost(post.id)">🗑 刪除</div>
                  <div v-if="auth.isAdmin" @click="togglePin(post)">{{ post.pinned ? '取消置頂' : '📌 置頂' }}</div>
                </div>
              </div>
            </div>
            <div v-if="post.title" class="post-title" @click="openPostId = post.id">{{ post.title }}</div>
            <div class="post-body" @click="openPostId = post.id">{{ preview(post.content) }}</div>
            <img v-if="post.image" :src="post.image" class="post-img" @click="openPostId = post.id" />
            <div class="post-footer">
              <button :class="['action-btn', isLiked(post) ? 'liked' : '']" @click="likePost(post.id)">
                ♥ {{ post.likes?.length || '' }}
              </button>
              <button class="action-btn" @click="openPostId = post.id">
                💬 {{ post.comments?.length || '' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">📭</div>
          <div>還沒有貼文，成為第一個發文的人吧！</div>
        </div>
      </template>
    </div>

    <!-- New/Edit post modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯貼文' : '發布貼文' }}</h2>
          <div class="form-row">
            <label>分類</label>
            <select v-model="modal.category">
              <option v-for="cat in BOARD_CATS" :key="cat.key" :value="cat.key">{{ cat.e }} {{ cat.l }}</option>
            </select>
          </div>
          <div class="form-row"><label>標題（選填）</label><input v-model="modal.title" placeholder="為貼文加個標題" /></div>
          <div class="form-row"><label>內容</label><textarea v-model="modal.content" rows="5" placeholder="分享你的心情、問題或想法…" /></div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="modal.open = false">取消</button>
            <button class="btn-primary" :disabled="!modal.content.trim()" @click="save">發布</button>
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
import PostDetail from '../components/journal/PostDetail.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { Journal, User } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const BOARD_CATS = [
  { key: 'chat',     e: '💬', l: '閒聊',   c: 'cat-chat' },
  { key: 'share',    e: '🌟', l: '分享',   c: 'cat-share' },
  { key: 'question', e: '❓', l: '問題',   c: 'cat-question' },
  { key: 'care',     e: '🌸', l: '關懷',   c: 'cat-care' },
  { key: 'event',    e: '📅', l: '活動',   c: 'cat-event' },
]

const users = computed<User[]>(() => rtdb.store?.users ?? [])
const currentUserId = computed(() => auth.currentUser?.id ?? '')
const openPostId = ref('')
const menuOpenId = ref('')
const search = ref('')
const catFilter = ref('all')
const sortBy = ref('newest')

const openPost = computed(() => (rtdb.store?.journals ?? []).find((j) => j.id === openPostId.value))

function userName(id?: string) { return users.value.find((u) => u.id === id)?.name ?? '' }
function catInfo(key?: string) { return BOARD_CATS.find((c) => c.key === key) ?? BOARD_CATS[0] }
function formatTs(ts?: string) { return ts ? ts.slice(5, 16).replace('-', '/') : '' }
function preview(content?: string) { return content && content.length > 120 ? content.slice(0, 120) + '…' : (content ?? '') }
function isLiked(post: Journal) { return (post.likes ?? []).includes(currentUserId.value) }
function canEdit(post: Journal) { return post.userId === currentUserId.value || auth.isAdmin }

const sorted = computed(() => {
  const list = (rtdb.store?.journals ?? []).filter((j) => {
    const catOk = catFilter.value === 'all' || j.category === catFilter.value
    const srOk = !search.value || `${j.title ?? ''}${j.content ?? ''}`.toLowerCase().includes(search.value.toLowerCase())
    return catOk && srOk
  })
  const pinned = list.filter((j) => j.pinned)
  const normal = list.filter((j) => !j.pinned)
  const sortFn = (a: Journal, b: Journal) => {
    if (sortBy.value === 'liked') return (b.likes?.length ?? 0) - (a.likes?.length ?? 0)
    if (sortBy.value === 'commented') return (b.comments?.length ?? 0) - (a.comments?.length ?? 0)
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  }
  return [...pinned.sort(sortFn), ...normal.sort(sortFn)]
})

function toggleMenu(id: string) {
  menuOpenId.value = menuOpenId.value === id ? '' : id
}
function togglePin(post: Journal) { post.pinned = !post.pinned; rtdb.saveCollection('journals', rtdb.store!.journals); menuOpenId.value = '' }
function likePost(postId: string) {
  const j = (rtdb.store?.journals ?? []).find((x) => x.id === postId)
  if (!j) return
  if (!j.likes) j.likes = []
  const i = j.likes.indexOf(currentUserId.value)
  if (i >= 0) j.likes.splice(i, 1); else j.likes.push(currentUserId.value)
  rtdb.saveCollection('journals', rtdb.store!.journals)
}
function deletePost(id: string) {
  if (!rtdb.store || !confirm('確定刪除此貼文？')) return
  rtdb.store.journals = rtdb.store.journals.filter((j) => j.id !== id)
  rtdb.saveCollection('journals', rtdb.store!.journals); menuOpenId.value = ''
}
function addComment({ postId, text }: { postId: string; text: string }) {
  const j = (rtdb.store?.journals ?? []).find((x) => x.id === postId)
  if (!j) return
  if (!j.comments) j.comments = []
  j.comments.push({ id: rtdb.uid(), userId: currentUserId.value, text, createdAt: now(), likes: [] })
  rtdb.saveCollection('journals', rtdb.store!.journals)
}
function likeComment({ postId, commentId }: { postId: string; commentId: string }) {
  const j = (rtdb.store?.journals ?? []).find((x) => x.id === postId)
  const cm = j?.comments?.find((c) => c.id === commentId)
  if (!cm) return
  if (!cm.likes) cm.likes = []
  const i = cm.likes.indexOf(currentUserId.value)
  if (i >= 0) cm.likes.splice(i, 1); else cm.likes.push(currentUserId.value)
  rtdb.saveCollection('journals', rtdb.store!.journals)
}
function deleteComment({ postId, commentId }: { postId: string; commentId: string }) {
  const j = (rtdb.store?.journals ?? []).find((x) => x.id === postId)
  if (!j) return
  j.comments = (j.comments ?? []).filter((c) => c.id !== commentId)
  rtdb.saveCollection('journals', rtdb.store!.journals)
}

function now() { return new Date().toISOString().slice(0, 16).replace('T', ' ') }
function today() { return todayStr() }

const modal = reactive({ open: false, editId: '', title: '', content: '', category: 'chat' })
function openNew() { Object.assign(modal, { open: true, editId: '', title: '', content: '', category: 'chat' }) }
function openEdit(post: Journal) {
  Object.assign(modal, { open: true, editId: post.id, title: post.title ?? '', content: post.content, category: post.category ?? 'chat' })
  menuOpenId.value = ''
}
function save() {
  if (!modal.content.trim() || !rtdb.store) return
  if (!rtdb.store.journals) rtdb.store.journals = []
  if (modal.editId) {
    const j = rtdb.store.journals.find((x) => x.id === modal.editId)
    if (j) { j.title = modal.title.trim(); j.content = modal.content; j.category = modal.category; j.edited = true }
  } else {
    rtdb.store.journals.unshift({
      id: rtdb.uid(), userId: currentUserId.value, date: today(),
      title: modal.title.trim(), content: modal.content, category: modal.category,
      createdAt: now(), likes: [], comments: [], pinned: false, edited: false,
    })
  }
  rtdb.saveCollection('journals', rtdb.store!.journals); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.btn-back { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 6px; padding: 6px 14px; font-size: .85rem; cursor: pointer; margin-bottom: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.search-input { flex: 1; min-width: 180px; border: 1px solid #ddd; border-radius: 8px; padding: 7px 12px; font-size: .85rem; }
.cat-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
.cat-btn { background: #f0f0f0; border: none; border-radius: 20px; padding: 5px 10px; font-size: .78rem; cursor: pointer; color: #555; }
.cat-btn.active { background: #1a3c5e; color: white; }
.sort-sel { border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; font-size: .8rem; }
.post-feed { display: flex; flex-direction: column; gap: 12px; }
.post-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
.post-card.pinned { border-left: 4px solid #f1c40f; }
.pin-badge { font-size: .72rem; color: #f39c12; font-weight: 700; margin-bottom: 6px; }
.post-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.post-meta { display: flex; align-items: center; gap: 6px; flex: 1; flex-wrap: wrap; }
.post-meta strong { font-size: .88rem; color: #1a3c5e; }
.cat-chip { font-size: .7rem; padding: 2px 7px; border-radius: 99px; background: #e8f0fe; color: #1a3c5e; }
.edited-tag { font-size: .7rem; color: #bbb; }
.post-time { font-size: .72rem; color: #bbb; margin-left: auto; }
.post-menu-wrap { position: relative; }
.menu-btn { background: none; border: none; cursor: pointer; font-size: 1rem; color: #aaa; padding: 0 4px; }
.post-menu { position: absolute; right: 0; top: 100%; background: white; border: 1px solid #eee; border-radius: 8px; padding: 4px; box-shadow: 0 4px 16px rgba(0,0,0,.1); z-index: 10; min-width: 110px; }
.post-menu div { padding: 7px 12px; font-size: .82rem; cursor: pointer; border-radius: 5px; }
.post-menu div:hover { background: #f5f5f5; }
.post-title { font-size: .95rem; font-weight: 800; color: #1a3c5e; margin-bottom: 4px; cursor: pointer; }
.post-body { font-size: .85rem; color: #555; line-height: 1.65; cursor: pointer; margin-bottom: 8px; white-space: pre-wrap; }
.post-img { max-height: 160px; border-radius: 8px; margin-bottom: 8px; display: block; cursor: pointer; }
.post-footer { display: flex; gap: 12px; }
.action-btn { background: none; border: none; font-size: .8rem; color: #888; cursor: pointer; padding: 0; display: flex; align-items: center; gap: 4px; }
.action-btn.liked { color: #c4527a; }
.empty-state { text-align: center; padding: 60px 0; color: #aaa; }
.empty-icon { font-size: 2.5rem; margin-bottom: 8px; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 28px 24px; min-width: 360px; max-width: 560px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 20px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 5px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; font-size: .9rem; font-family: inherit; resize: vertical; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
