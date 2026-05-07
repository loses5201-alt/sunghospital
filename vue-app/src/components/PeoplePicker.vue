<template>
  <div class="pp">
    <div class="pp-controls">
      <input v-model="query" class="pp-search" :placeholder="placeholder || '🔍 搜尋姓名 / 職稱 / 科別...'" />
      <template v-if="multi && (showSelectAll ?? true)">
        <button type="button" class="pp-mini-btn" @click="selectAllVisible">全選</button>
        <button type="button" class="pp-mini-btn" @click="clearAll">清除</button>
      </template>
      <span class="pp-count">{{ countLabel }}</span>
    </div>
    <div class="pp-list" :style="{ maxHeight: (maxHeight ?? 240) + 'px' }">
      <label v-for="u in filtered" :key="u.id" class="pp-row">
        <input :type="multi ? 'checkbox' : 'radio'" :value="u.id"
               :checked="isSelected(u.id)"
               @change="onChange(u.id, ($event.target as HTMLInputElement).checked)" />
        <div class="pp-avatar" :style="{ background: avatarColor(u.id) }">{{ u.name?.slice(0, 1) }}</div>
        <div class="pp-info">
          <div class="pp-name">{{ u.name }}</div>
          <div class="pp-meta">{{ u.title || '' }}{{ u.title && deptName(u) ? ' · ' : '' }}{{ deptName(u) }}</div>
        </div>
      </label>
      <div v-if="!filtered.length" class="pp-empty">沒有符合條件的人員</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRtdbStore } from '../stores/rtdb'
import type { User } from '../types'

const props = defineProps<{
  modelValue: string | string[]
  multi?: boolean
  excludeIds?: string[]
  filterFn?: (u: User) => boolean
  maxHeight?: number
  placeholder?: string
  showSelectAll?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | string[]): void
}>()

const rtdb = useRtdbStore()
const query = ref('')

const pool = computed(() => {
  const users = rtdb.store?.users ?? []
  return users.filter((u) => {
    if (u.username === 'admin') return false  // 隱藏系統管理員
    if ((u.status ?? 'active') !== 'active') return false
    if (props.excludeIds?.includes(u.id)) return false
    if (props.filterFn && !props.filterFn(u)) return false
    return true
  })
})

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return pool.value
  return pool.value.filter((u) => {
    const hay = ((u.name ?? '') + ' ' + (u.title ?? '') + ' ' + deptName(u)).toLowerCase()
    return hay.includes(q)
  })
})

function deptName(u: User): string {
  const depts = rtdb.store?.departments ?? []
  return depts.find((d) => d.id === u.deptId)?.name ?? ''
}

const PALETTE = ['#1a3c5e', '#2e7d5a', '#c0392b', '#7a35a0', '#1565c0', '#e67e22', '#00897b', '#5e35b1']
function avatarColor(id: string): string {
  const hash = (id ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return PALETTE[hash % PALETTE.length]
}

function isSelected(id: string): boolean {
  if (props.multi) return ((props.modelValue as string[]) ?? []).includes(id)
  return props.modelValue === id
}

const countLabel = computed(() => {
  if (!props.multi) {
    const id = props.modelValue as string
    const u = pool.value.find((x) => x.id === id)
    return u ? `已選 ${u.name}` : ''
  }
  const ids = (props.modelValue as string[]) ?? []
  return ids.length ? `已選 ${ids.length} 人` : ''
})

function onChange(id: string, checked: boolean) {
  if (props.multi) {
    const ids = [...(((props.modelValue as string[]) ?? []))]
    const i = ids.indexOf(id)
    if (checked && i < 0) ids.push(id)
    if (!checked && i >= 0) ids.splice(i, 1)
    emit('update:modelValue', ids)
  } else {
    emit('update:modelValue', id)
  }
}

function selectAllVisible() {
  if (!props.multi) return
  const current = new Set(((props.modelValue as string[]) ?? []))
  filtered.value.forEach((u) => current.add(u.id))
  emit('update:modelValue', Array.from(current))
}

function clearAll() {
  if (!props.multi) return
  emit('update:modelValue', [])
}
</script>

<style scoped>
.pp { background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
.pp-controls { display: flex; gap: 6px; align-items: center; padding: 8px 10px; background: #f8f8f8; border-bottom: 1px solid #eee; flex-wrap: wrap; }
.pp-search { flex: 1; min-width: 160px; border: 1px solid #ddd; border-radius: 6px; padding: 6px 10px; font-size: .82rem; font-family: inherit; }
.pp-search:focus { outline: none; border-color: #2e7d5a; }
.pp-mini-btn { background: white; border: 1px solid #ddd; color: #666; border-radius: 5px; padding: 5px 9px; font-size: .72rem; cursor: pointer; font-family: inherit; }
.pp-mini-btn:hover { background: #f0f0f0; color: #333; }
.pp-count { font-size: .72rem; color: #2e7d5a; font-weight: 700; margin-left: auto; }
.pp-list { overflow-y: auto; padding: 4px 0; }
.pp-row { display: flex; align-items: center; gap: 9px; padding: 7px 12px; cursor: pointer; transition: background .1s; }
.pp-row:hover { background: #f8f8f8; }
.pp-row input { width: 15px; height: 15px; accent-color: #2e7d5a; cursor: pointer; flex-shrink: 0; }
.pp-avatar { width: 26px; height: 26px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 700; flex-shrink: 0; }
.pp-info { flex: 1; min-width: 0; line-height: 1.3; }
.pp-name { font-size: .85rem; color: #1a3c5e; font-weight: 500; }
.pp-meta { font-size: .72rem; color: #888; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-empty { padding: 20px; text-align: center; font-size: .8rem; color: #aaa; }

@media (max-width: 768px) {
  .pp-row { padding: 9px 12px; min-height: 44px; }
  .pp-name { font-size: .9rem; }
  .pp-mini-btn { min-height: 32px; padding: 6px 12px; font-size: .8rem; }
}
</style>
