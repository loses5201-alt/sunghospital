<template>
  <AppShell>
    <div class="page">
      <div class="page-header">
        <div><h1>病患動線看板</h1><div class="page-meta">即時追蹤產程進度</div></div>
        <button v-if="auth.isAdmin" class="btn-primary" @click="openNew">＋ 新增病患</button>
      </div>

      <div class="summary-row">
        <span>在院病患：<strong>{{ activePatients.length }}</strong> 人</span>
        <label class="show-all-toggle">
          <input v-model="showDischarged" type="checkbox" /> 顯示已出院
        </label>
      </div>

      <!-- Kanban board -->
      <div class="board-scroll">
        <div class="board">
          <div v-for="(stage, si) in STAGES" :key="stage" class="stage-col">
            <div class="stage-header" :style="{ borderColor: STAGE_COLORS[si] }">
              <span class="stage-dot" :style="{ background: STAGE_COLORS[si] }" />
              <span class="stage-name">{{ stage }}</span>
              <span class="stage-cnt" :style="{ background: STAGE_COLORS[si] + '22', color: STAGE_COLORS[si] }">{{ stagePatients(stage).length }}</span>
            </div>
            <div v-if="!stagePatients(stage).length" class="stage-empty">無病患</div>
            <div v-for="p in stagePatients(stage)" :key="p.id" class="patient-card">
              <div class="pc-name">{{ p.name }}</div>
              <div v-if="p.bed" class="pc-bed">🛏 {{ p.bed }}</div>
              <div v-if="p.flags?.length" class="pc-flags">
                <span v-for="f in p.flags" :key="f" class="flag-chip">{{ PATIENT_FLAGS[f] ?? f }}</span>
              </div>
              <div v-if="p.note" class="pc-note">{{ p.note }}</div>
              <div v-if="p.since" class="pc-since">⏱ {{ p.since }}</div>
              <div v-if="auth.isAdmin" class="pc-actions">
                <select class="stage-sel" :value="p.stage" @change="moveStage(p, ($event.target as HTMLSelectElement).value)">
                  <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
                </select>
                <button class="btn-xs" @click="openEdit(p)">✏</button>
                <button v-if="!p.discharged" class="btn-xs danger" @click="discharge(p)">出院</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Discharged section -->
      <div v-if="showDischarged && discharged.length" class="discharged-section">
        <div class="sec-label">已出院（{{ discharged.length }}）</div>
        <div class="discharged-list">
          <div v-for="p in discharged" :key="p.id" class="discharged-row">
            <span>{{ p.name }}</span>
            <span class="dc-date">{{ p.dischargeDate }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="modal.open = false">
        <div class="modal">
          <h2>{{ modal.editId ? '編輯病患' : '新增病患' }}</h2>
          <div class="form-row"><label>姓名</label><input v-model="modal.name" /></div>
          <div class="form-grid">
            <div class="form-row"><label>床號</label><input v-model="modal.bed" placeholder="例：A3" /></div>
            <div class="form-row">
              <label>產程階段</label>
              <select v-model="modal.stage">
                <option v-for="s in STAGES" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label>警示標記</label>
            <div class="flag-checks">
              <label v-for="(label, key) in PATIENT_FLAGS" :key="key" class="checkbox-row">
                <input v-model="modal.flags" type="checkbox" :value="key" />{{ label }}
              </label>
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
import AppShell from '../components/layout/AppShell.vue'
import { useRtdbStore } from '../stores/rtdb'
import { useAuthStore } from '../stores/auth'
import type { Patient } from '../types'

const rtdb = useRtdbStore()
const auth = useAuthStore()

const STAGES = ['入院登記', '待產', '生產中', '產後恢復', '母嬰同室', '準備出院']
const STAGE_COLORS = ['#9b8fd4', '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#c4527a']
const PATIENT_FLAGS: Record<string, string> = { urgent: '🔴 緊急', oxygen: '💨 氧氣', iv: '💉 點滴', pain: '⚠️ 疼痛', obs: '👁️ 觀察中' }

const showDischarged = ref(false)
const patients = computed(() => rtdb.store?.patients ?? [])
const activePatients = computed(() => patients.value.filter((p) => !p.discharged))
const discharged = computed(() => patients.value.filter((p) => p.discharged))

function stagePatients(stage: string) { return activePatients.value.filter((p) => (p.stage ?? STAGES[0]) === stage) }
function moveStage(p: Patient, stage: string) { p.stage = stage; rtdb.save() }
function discharge(p: Patient) {
  if (!confirm('確定出院？')) return
  p.discharged = true; p.dischargeDate = new Date().toISOString().split('T')[0]; rtdb.save()
}

const modal = reactive({ open: false, editId: '', name: '', bed: '', stage: STAGES[0], flags: [] as string[], note: '' })
function openNew() { Object.assign(modal, { open: true, editId: '', name: '', bed: '', stage: STAGES[0], flags: [], note: '' }) }
function openEdit(p: Patient) { Object.assign(modal, { open: true, editId: p.id, name: p.name, bed: p.bed ?? '', stage: p.stage ?? STAGES[0], flags: [...(p.flags ?? [])], note: p.note ?? '' }) }
function save() {
  if (!modal.name.trim() || !rtdb.store) return
  if (!rtdb.store.patients) rtdb.store.patients = []
  if (modal.editId) {
    const p = rtdb.store.patients.find((x) => x.id === modal.editId)
    if (p) { p.name = modal.name.trim(); p.bed = modal.bed; p.stage = modal.stage; p.flags = [...modal.flags]; p.note = modal.note }
  } else {
    rtdb.store.patients.push({ id: rtdb.uid(), name: modal.name.trim(), bed: modal.bed, stage: modal.stage, flags: [...modal.flags], note: modal.note, admitDate: new Date().toISOString().split('T')[0] })
  }
  rtdb.save(); modal.open = false
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
h1 { font-size: 1.3rem; margin: 0 0 4px; color: #1a3c5e; }
.page-meta { font-size: .8rem; color: #888; }
.summary-row { display: flex; align-items: center; gap: 16px; font-size: .88rem; color: #555; margin-bottom: 14px; }
.show-all-toggle { display: flex; align-items: center; gap: 5px; cursor: pointer; }
.board-scroll { overflow-x: auto; }
.board { display: flex; gap: 14px; padding-bottom: 16px; min-width: max-content; }
.stage-col { width: 210px; flex-shrink: 0; }
.stage-header { display: flex; align-items: center; gap: 6px; padding: 7px 10px; background: white; border-radius: 8px; border: 1.5px solid #eee; margin-bottom: 8px; border-left-width: 4px; }
.stage-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stage-name { font-size: .82rem; font-weight: 800; color: #1a3c5e; flex: 1; }
.stage-cnt { font-size: .7rem; padding: 2px 7px; border-radius: 99px; font-weight: 700; }
.stage-empty { border: 1.5px dashed #ddd; border-radius: 8px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: .75rem; color: #bbb; }
.patient-card { background: white; border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.pc-name { font-weight: 700; color: #1a3c5e; font-size: .88rem; margin-bottom: 3px; }
.pc-bed { font-size: .75rem; color: #888; }
.pc-flags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
.flag-chip { font-size: .68rem; padding: 1px 5px; background: #fde8e8; color: #c0392b; border-radius: 4px; }
.pc-note { font-size: .72rem; color: #888; margin-top: 3px; }
.pc-since { font-size: .68rem; color: #aaa; margin-top: 2px; }
.pc-actions { display: flex; gap: 4px; margin-top: 6px; align-items: center; flex-wrap: wrap; }
.stage-sel { border: 1px solid #ddd; border-radius: 4px; padding: 2px 4px; font-size: .72rem; flex: 1; min-width: 0; }
.discharged-section { margin-top: 20px; }
.sec-label { font-size: .72rem; color: #aaa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
.discharged-list { display: flex; flex-direction: column; gap: 4px; }
.discharged-row { display: flex; align-items: center; gap: 10px; font-size: .85rem; color: #888; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
.dc-date { font-size: .75rem; color: #bbb; margin-left: auto; }
.btn-primary { background: #2e7d5a; color: white; border: none; border-radius: 7px; padding: 8px 16px; font-size: .85rem; cursor: pointer; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-xs { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 4px; padding: 2px 6px; font-size: .72rem; cursor: pointer; }
.btn-xs.danger { color: #c0392b; }
.btn-ghost { background: transparent; border: 1px solid #ddd; color: #555; border-radius: 5px; padding: 5px 10px; font-size: .78rem; cursor: pointer; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 360px; max-width: 520px; width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal h2 { margin: 0 0 16px; font-size: 1.1rem; color: #1a3c5e; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: .82rem; color: #555; margin-bottom: 4px; }
.form-row input, .form-row select, .form-row textarea { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 7px 10px; font-size: .88rem; font-family: inherit; resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.flag-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.checkbox-row { display: flex; align-items: center; gap: 5px; font-size: .82rem; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
</style>
