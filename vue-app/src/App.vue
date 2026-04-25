<template>
  <!-- LOADING -->
  <div v-if="!ready" class="loading-screen">
    <div class="loading-spinner" />
    <div class="loading-text">載入中...</div>
  </div>

  <!-- LOAD FAILED — show error, do NOT show app (would risk wiping cloud) -->
  <div v-else-if="rtdb.loadFailed" class="error-screen">
    <div class="error-icon">⚠</div>
    <div class="error-title">無法連線雲端資料庫</div>
    <div class="error-msg">
      系統需要先連線 Firebase 才能使用，<br>
      若直接操作可能覆蓋既有資料。
    </div>
    <button class="btn-retry" @click="retry">重新嘗試</button>
    <a class="legacy-link" href="https://loses5201-alt.github.io/sunghospital/">使用舊版系統 →</a>
  </div>

  <!-- READY -->
  <RouterView v-else />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRtdbStore } from './stores/rtdb'
import { useAuthStore } from './stores/auth'

const ready = ref(false)
const rtdb = useRtdbStore()
const auth = useAuthStore()

async function bootstrap() {
  // 1. Setup auth listener (passive — observes Firebase auth state)
  auth.init()

  // 2. Load RTDB. useRtdb internally waits for Firebase Auth session
  // restoration first, so authenticated reads succeed even on refresh.
  await rtdb.init()

  // 3. Match the auth user with internal users list
  auth.matchUser(rtdb.store?.users ?? [])

  ready.value = true
}

async function retry() {
  ready.value = false
  await bootstrap()
}

onMounted(bootstrap)
</script>

<style scoped>
.loading-screen, .error-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; gap: 16px; background: #f5f7fa; padding: 24px;
}
.loading-spinner {
  width: 36px; height: 36px; border: 3px solid #eee;
  border-top-color: #2e7d5a; border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: .88rem; color: #aaa; }

.error-icon { font-size: 3rem; color: #e67e22; }
.error-title { font-size: 1.2rem; font-weight: 700; color: #1a3c5e; }
.error-msg { font-size: .9rem; color: #666; text-align: center; line-height: 1.7; }
.btn-retry {
  background: #2e7d5a; color: white; border: none; border-radius: 8px;
  padding: 10px 24px; font-size: .9rem; cursor: pointer; margin-top: 8px;
}
.legacy-link { color: #888; font-size: .82rem; text-decoration: none; margin-top: 6px; }
.legacy-link:hover { color: #2e7d5a; }
</style>
