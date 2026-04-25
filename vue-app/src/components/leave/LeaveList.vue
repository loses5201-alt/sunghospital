<template>
  <div>
    <div v-if="leaves.length" class="leave-list">
      <div v-for="l in leaves" :key="l.id" class="leave-card">
        <div class="leave-card-left">
          <span class="leave-type-chip" :style="typeColor(l.type)">{{ typeLabel(l.type) }}</span>
          <div class="leave-info">
            <div v-if="isManager" class="leave-user">{{ userName(l.userId) }}</div>
            <div class="leave-dates">{{ l.startDate }} ～ {{ l.endDate }}<span v-if="l.days" class="leave-days">（{{ l.days }} 天）</span></div>
            <div v-if="l.reason" class="leave-reason">{{ l.reason }}</div>
            <div class="leave-meta">{{ l.createdAt }}</div>
          </div>
        </div>
        <div class="leave-card-right">
          <span :class="['status-chip', `s-${l.status}`]">{{ statusLabel(l.status) }}</span>
          <div v-if="isManager && l.status === 'pending'" class="approve-btns">
            <button class="btn-approve" @click="emit('approve', l)">核准</button>
            <button class="btn-reject" @click="emit('reject', l)">退回</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-hint">
      <div class="empty-icon">📅</div>
      <div>尚無假期記錄</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Leave, User } from '../../types'

const props = defineProps<{
  leaves: Leave[]
  users: User[]
  isManager: boolean
  currentUserId: string
}>()
const emit = defineEmits<{ approve: [Leave]; reject: [Leave] }>()

const LEAVE_TYPES: Record<string, { label: string; color: string }> = {
  annual:    { label: '年假',   color: '#2e7d5a' },
  sick:      { label: '病假',   color: '#1565c0' },
  personal:  { label: '事假',   color: '#e67e22' },
  comp:      { label: '補休',   color: '#6a1b9a' },
  maternity: { label: '產假',   color: '#c4527a' },
  special:   { label: '特別假', color: '#e65100' },
}

function typeLabel(type: string) { return LEAVE_TYPES[type]?.label ?? type }
function typeColor(type: string) { const c = LEAVE_TYPES[type]?.color ?? '#888'; return { background: c + '20', color: c, border: `1px solid ${c}40` } }
function statusLabel(s: string) { return { pending: '⏳ 審核中', approved: '✓ 核准', rejected: '✗ 退回' }[s] ?? s }
function userName(id: string) { return props.users.find((u) => u.id === id)?.name ?? '未知' }
</script>

<style scoped>
.leave-list { display: flex; flex-direction: column; gap: 8px; }
.leave-card { background: white; border: 1.5px solid #eee; border-radius: 10px; padding: 12px 16px; display: flex; align-items: flex-start; gap: 12px; }
.leave-card-left { display: flex; gap: 10px; flex: 1; min-width: 0; }
.leave-type-chip { font-size: .72rem; padding: 3px 8px; border-radius: 99px; font-weight: 700; white-space: nowrap; height: fit-content; }
.leave-info { flex: 1; }
.leave-user { font-weight: 700; color: #1a3c5e; font-size: .88rem; margin-bottom: 2px; }
.leave-dates { font-size: .85rem; color: #333; }
.leave-days { font-size: .75rem; color: #888; margin-left: 5px; }
.leave-reason { font-size: .78rem; color: #666; margin-top: 3px; }
.leave-meta { font-size: .72rem; color: #aaa; margin-top: 3px; }
.leave-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.status-chip { font-size: .72rem; padding: 3px 8px; border-radius: 99px; font-weight: 700; white-space: nowrap; }
.s-pending { background: #fef3c7; color: #92400e; }
.s-approved { background: #d1fae5; color: #065f46; }
.s-rejected { background: #fde8e8; color: #c0392b; }
.approve-btns { display: flex; gap: 5px; }
.btn-approve { background: #2e7d5a; color: white; border: none; border-radius: 5px; padding: 4px 10px; font-size: .75rem; cursor: pointer; }
.btn-reject { background: transparent; border: 1px solid #c0392b; color: #c0392b; border-radius: 5px; padding: 4px 10px; font-size: .75rem; cursor: pointer; }
.empty-hint { text-align: center; padding: 40px; color: #aaa; }
.empty-icon { font-size: 2rem; margin-bottom: 8px; }
</style>
