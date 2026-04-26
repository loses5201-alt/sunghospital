<template>
  <AppShell>
    <div class="page">
      <!-- Header banner -->
      <div class="banner">
        <div class="banner-main">本月共迎接 {{ monthCount }} 位新生命</div>
        <div class="banner-sub">每個寶寶都是最珍貴的禮物 · 住院中 {{ activeCount }} 位</div>
      </div>

      <div class="page-header">
        <div class="controls">
          <div class="search-wrap">
            <input v-model="search" class="search-input" placeholder="🔍 搜尋寶寶名稱或床位..." />
          </div>
          <button :class="['btn-toggle', showAll ? 'active' : '']" @click="showAll = !showAll">
            {{ showAll ? `全部 (${babies.length})` : `住院中 (${activeCount})` }}
          </button>
        </div>
        <button class="btn-primary" @click="openNew">＋ 新增寶寶</button>
      </div>

      <!-- Grid -->
      <div v-if="filtered.length" class="baby-grid">
        <div v-for="b in filtered" :key="b.id" :class="['baby-card', b.discharged ? 'discharged' : '']">
          <div class="baby-emoji">{{ b.emoji ?? '🍼' }}</div>
          <div class="baby-info">
            <div class="baby-title">
              <span class="baby-name">{{ b.name }}</span>
              <span :class="['gender-chip', b.gender === 'boy' ? 'boy' : 'girl']">{{ b.gender === 'boy' ? '男寶' : '女寶' }}</span>
              <span :class="['days-chip', b.discharged ? 'discharged-chip' : 'days-active']">{{ daysLabel(b) }}</span>
            </div>
            <div class="baby-stats">
              <span v-if="b.weight">⚖ {{ b.weight }}</span>
              <span v-if="b.height">📏 {{ b.height }}</span>
              <span v-if="b.born">🕐 {{ b.born }}</span>
            </div>
            <div v-if="b.mom" class="baby-stats"><span>🏥 {{ b.mom }}</span></div>
            <div v-if="hasClinical(b)" class="baby-stats clinical">
              <span v-if="b.apgar1 || b.apgar5">APGAR {{ b.apgar1 ?? '?' }}/{{ b.apgar5 ?? '?' }}</span>
              <span v-if="b.ga">胎齡 {{ b.ga }}週</span>
              <span v-if="b.birthMethod">{{ birthMethodLabel(b.birthMethod) }}</span>
              <span v-if="b.feeding">{{ feedingLabel(b.feeding) }}</span>
            </div>
            <div v-if="b.note" class="baby-note">{{ b.note }}</div>
            <div class="baby-actions">
              <button v-if="!b.discharged && auth.isAdmin" class="btn-xs" @click="dischargeBaby(b)">🏠 出院</button>
              <button v-if="auth.isAdmin" class="btn-xs" @click="openEdit(b)">✏ 編輯</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div>找不到符合的寶寶 🔍</div>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯寶寶資料' : '新增寶寶' }}</h2>
          <div class="form-grid">
            <div class="form-row"><label>寶寶暱稱</label><input v-model="modal.name" placeholder="例：小睿寶" /></div>
            <div class="form-row">
              <label>性別</label>
              <select v-model="modal.gender"><option value="boy">男寶</option><option value="girl">女寶</option></select>
            </div>
            <div class="form-row"><label>體重</label><input v-model="modal.weight" placeholder="例：3.2kg" /></div>
            <div class="form-row"><label>身高</label><input v-model="modal.height" placeholder="例：50cm" /></div>
            <div class="form-row"><label>出生時間</label><input v-model="modal.born" :placeholder="`${today} 08:00`" /></div>
            <div class="form-row"><label>圖示</label><input v-model="modal.emoji" placeholder="🍼" /></div>
          </div>
          <div class="form-row"><label>母親床號/姓名</label><input v-model="modal.mom" /></div>
          <div class="form-grid">
            <div class="form-row"><label>APGAR 1分鐘</label><input v-model="modal.apgar1" type="number" min="0" max="10" /></div>
            <div class="form-row"><label>APGAR 5分鐘</label><input v-model="modal.apgar5" type="number" min="0" max="10" /></div>
            <div class="form-row"><label>胎齡（週）</label><input v-model="modal.ga" placeholder="例：39" /></div>
            <div class="form-row">
              <label>生產方式</label>
              <select v-model="modal.birthMethod">
                <option value="">（未填）</option><option value="normal">自然產</option><option value="csection">剖腹產</option>
              </select>
            </div>
            <div class="form-row">
              <label>哺餵方式</label>
              <select v-model="modal.feeding">
                <option value="">（未填）</option><option value="breast">🤱 親餵</option><option value="formula">🍼 配方奶</option><option value="mixed">🤱🍼 混合</option>
              </select>
            </div>
          </div>
          <div class="form-row"><label>備註</label><textarea v-model="modal.note" rows="2" /></div>
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
import { computed, reactive, ref } from 'vue'
import { todayStr } from '../utils/date'
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { Baby } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const today = todayStr()
const search = ref('')
const showAll = ref(false)

const babies = computed(() => rtdb.store?.babies ?? [])
const monthCount = computed(() => babies.value.filter((b) => b.born?.startsWith(today.slice(0, 7))).length)
const activeCount = computed(() => babies.value.filter((b) => !b.discharged).length)

const filtered = computed(() => {
  let list = showAll.value ? babies.value : babies.value.filter((b) => !b.discharged)
  const kw = search.value.trim().toLowerCase()
  if (kw) list = list.filter((b) => b.name.toLowerCase().includes(kw) || (b.mom ?? '').toLowerCase().includes(kw))
  return list
})

function babyDays(b: Baby): number {
  if (!b.born) return 0
  const start = new Date(b.born.split(' ')[0])
  const end = b.discharged && b.dischargeDate ? new Date(b.dischargeDate) : new Date(today)
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000))
}
function daysLabel(b: Baby) {
  if (b.discharged) return `🏠 已出院${b.dischargeDate ? ` · ${b.dischargeDate}` : ''}`
  const d = babyDays(b)
  return d === 0 ? '今日出生' : `第 ${d} 天`
}
function hasClinical(b: Baby) { return !!(b.apgar1 || b.apgar5 || b.ga || b.birthMethod || b.feeding) }
function birthMethodLabel(m?: string) { return m === 'normal' ? '自然產' : m === 'csection' ? '剖腹產' : m ?? '' }
function feedingLabel(f?: string) { return { breast: '🤱 親餵', formula: '🍼 配方奶', mixed: '🤱🍼 混合' }[f ?? ''] ?? f ?? '' }

function dischargeBaby(b: Baby) {
  if (!confirm('確定標記出院？出院後住院天數將停止計算。')) return
  b.discharged = true; b.dischargeDate = today
  rtdb.saveCollection('babies', rtdb.store!.babies)
}

type BabyModal = { open: boolean; editId: string; name: string; gender: 'boy' | 'girl'; weight: string; height: string; born: string; emoji: string; mom: string; note: string; apgar1: string; apgar5: string; ga: string; birthMethod: string; feeding: string }
const modal = reactive<BabyModal>({ open: false, editId: '', name: '', gender: 'girl', weight: '', height: '', born: '', emoji: '🍼', mom: '', note: '', apgar1: '', apgar5: '', ga: '', birthMethod: '', feeding: '' })

function openNew() { Object.assign(modal, { open: true, editId: '', name: '', gender: 'girl', weight: '', height: '', born: '', emoji: '🍼', mom: '', note: '', apgar1: '', apgar5: '', ga: '', birthMethod: '', feeding: '' }) }
function openEdit(b: Baby) {
  Object.assign(modal, { open: true, editId: b.id, name: b.name, gender: b.gender, weight: b.weight ?? '', height: b.height ?? '', born: b.born ?? '', emoji: b.emoji ?? '🍼', mom: b.mom ?? '', note: b.note ?? '', apgar1: String(b.apgar1 ?? ''), apgar5: String(b.apgar5 ?? ''), ga: b.ga ?? '', birthMethod: b.birthMethod ?? '', feeding: b.feeding ?? '' })
}
function save() {
  if (!modal.name.trim() || !rtdb.store) return
  const data: Partial<Baby> = {
    name: modal.name.trim(), gender: modal.gender, weight: modal.weight, height: modal.height,
    born: modal.born, emoji: modal.emoji || '🍼', mom: modal.mom, note: modal.note,
    apgar1: modal.apgar1, apgar5: modal.apgar5, ga: modal.ga,
    birthMethod: modal.birthMethod || undefined, feeding: modal.feeding || undefined,
  }
  if (!rtdb.store.babies) rtdb.store.babies = []
  if (modal.editId) {
    const b = rtdb.store.babies.find((x) => x.id === modal.editId)
    if (b) Object.assign(b, data)
  } else {
    rtdb.store.babies.unshift({ id: rtdb.uid(), ...data } as Baby)
  }
  rtdb.saveCollection('babies', rtdb.store!.babies); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.banner { text-align: center; background: linear-gradient(135deg, #fde8f0, #fff0f5); border: 1px solid rgba(196,82,122,.15); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.banner-main { font-size: 1.1rem; font-weight: 700; color: #1a3c5e; margin-bottom: 3px; }
.banner-sub { font-size: .8rem; color: #888; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 10px; }
.controls { display: flex; gap: 8px; flex: 1; align-items: center; }
.search-wrap { flex: 1; }
.search-input { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: .85rem; }
.btn-toggle { background: #f0f0f0; border: none; border-radius: 20px; padding: 6px 14px; font-size: .8rem; cursor: pointer; color: #555; white-space: nowrap; }
.btn-toggle.active { background: #2e7d5a; color: white; }
.baby-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.baby-card { background: white; border: 1.5px solid #eee; border-radius: 12px; padding: 16px; display: flex; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.baby-card.discharged { opacity: .65; }
.baby-emoji { font-size: 2.2rem; flex-shrink: 0; }
.baby-info { flex: 1; min-width: 0; }
.baby-title { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 5px; }
.baby-name { font-weight: 800; font-size: .95rem; color: #1a3c5e; }
.gender-chip { font-size: .7rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.gender-chip.boy { background: #e3f2fd; color: #1565c0; }
.gender-chip.girl { background: #fce7f3; color: #9d174d; }
.days-chip { font-size: .7rem; padding: 2px 7px; border-radius: 99px; font-weight: 600; }
.days-active { background: #fdf0dc; color: #8f5208; }
.discharged-chip { background: #eee; color: #888; }
.baby-stats { display: flex; gap: 8px; flex-wrap: wrap; font-size: .78rem; color: #666; margin-top: 3px; }
.baby-stats.clinical { color: #888; }
.baby-note { font-size: .75rem; color: #999; margin-top: 4px; }
.baby-actions { display: flex; gap: 6px; margin-top: 7px; flex-wrap: wrap; }
.empty-state { text-align: center; padding: 40px; color: #aaa; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; white-space: nowrap; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 3px 8px; font-size: .72rem; cursor: pointer; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 360px; max-width: 560px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); max-height: 90vh; overflow-y: auto; }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .8rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

@media (max-width: 768px) {
  .page { padding: 14px; }
  .page-header { flex-wrap: wrap; gap: 8px; }
  .controls { flex-wrap: wrap; }
  .baby-grid { grid-template-columns: 1fr; gap: 10px; }
  .baby-card { padding: 12px; }
  .modal { min-width: 0; width: calc(100vw - 24px); max-width: none; padding: 18px 16px; }
  .form-grid { grid-template-columns: 1fr; gap: 0; }
  .modal-actions { flex-wrap: wrap; }
  .modal-actions button { flex: 1; min-height: 44px; }
}
</style>
