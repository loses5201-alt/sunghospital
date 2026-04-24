<template>
  <div class="post-detail">
    <div class="post-head">
      <div>
        <strong>{{ userName(post.userId) }}</strong>
        <span class="post-time">{{ formatTs(post.createdAt) }}</span>
        <span v-if="post.edited" class="edited-tag">（已編輯）</span>
      </div>
    </div>
    <div v-if="post.title" class="post-title">{{ post.title }}</div>
    <div class="post-body">{{ post.content }}</div>
    <img v-if="post.image" :src="post.image" class="post-img" />
    <div class="post-footer">
      <button :class="['action-btn', isLiked ? 'liked' : '']" @click="emit('like-post', post.id)">
        ♥ {{ post.likes?.length ? `${post.likes.length} 個讚` : '讚' }}
      </button>
    </div>

    <div class="sec-label">留言（{{ (post.comments ?? []).length }}）</div>
    <div v-if="(post.comments ?? []).length" class="comment-list">
      <div v-for="cm in post.comments" :key="cm.id" class="comment">
        <div class="comment-meta">
          <strong>{{ userName(cm.userId) }}</strong>
          <span class="comment-time">{{ formatTs(cm.createdAt) }}</span>
        </div>
        <div class="comment-text">{{ cm.text }}</div>
        <div class="comment-actions">
          <button :class="['action-btn', (cm.likes ?? []).includes(currentUserId) ? 'liked' : '']" @click="emit('like-comment', { postId: post.id, commentId: cm.id })">
            ♥ {{ cm.likes?.length || '' }}
          </button>
          <button v-if="cm.userId === currentUserId || isAdmin" class="action-btn" @click="emit('delete-comment', { postId: post.id, commentId: cm.id })">刪除</button>
        </div>
      </div>
    </div>
    <div v-else class="no-comments">還沒有留言，來說第一句話吧 🌸</div>

    <div class="comment-input">
      <textarea v-model="commentText" rows="2" placeholder="說點什麼吧…" />
      <button class="btn-primary" :disabled="!commentText.trim()" @click="submitComment">送出留言</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Journal, User } from '../../types'

const props = defineProps<{
  post: Journal
  users: User[]
  currentUserId: string
  isAdmin: boolean
}>()
const emit = defineEmits<{
  'like-post': [postId: string]
  'add-comment': [{ postId: string; text: string }]
  'like-comment': [{ postId: string; commentId: string }]
  'delete-comment': [{ postId: string; commentId: string }]
}>()

const commentText = ref('')
const isLiked = ref((props.post.likes ?? []).includes(props.currentUserId))

function userName(id?: string) { return props.users.find((u) => u.id === id)?.name ?? '' }
function formatTs(ts?: string) { return ts ? ts.slice(0, 16).replace('T', ' ') : '' }

function submitComment() {
  if (!commentText.value.trim()) return
  emit('add-comment', { postId: props.post.id, text: commentText.value.trim() })
  commentText.value = ''
}
</script>

<style scoped>
.post-detail { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.post-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.post-head strong { font-size: .9rem; color: #1a3c5e; }
.post-time { font-size: .72rem; color: #bbb; margin-left: 6px; }
.edited-tag { font-size: .7rem; color: #bbb; margin-left: 4px; }
.post-title { font-size: 1.15rem; font-weight: 800; color: #1a3c5e; margin-bottom: 8px; }
.post-body { font-size: .9rem; color: #444; line-height: 1.8; white-space: pre-wrap; margin-bottom: 10px; }
.post-img { max-width: 100%; border-radius: 8px; margin-bottom: 12px; display: block; }
.post-footer { margin-bottom: 18px; }
.sec-label { font-size: .72rem; color: #aaa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 10px; }
.comment-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.comment { padding: 10px 12px; background: #f8f8f8; border-radius: 8px; }
.comment-meta { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
.comment-meta strong { font-size: .82rem; color: #1a3c5e; }
.comment-time { font-size: .7rem; color: #bbb; }
.comment-text { font-size: .85rem; line-height: 1.6; color: #444; white-space: pre-wrap; }
.comment-actions { display: flex; gap: 10px; margin-top: 5px; }
.no-comments { text-align: center; padding: 20px; font-size: .82rem; color: #bbb; margin-bottom: 16px; }
.comment-input { display: flex; flex-direction: column; gap: 6px; }
.comment-input textarea { border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; font-size: .85rem; font-family: inherit; resize: vertical; }
.action-btn { background: none; border: none; font-size: .78rem; color: #888; cursor: pointer; padding: 0; }
.action-btn.liked { color: #c4527a; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 6px; padding: 7px 14px; font-size: .82rem; cursor: pointer; align-self: flex-end; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
</style>
