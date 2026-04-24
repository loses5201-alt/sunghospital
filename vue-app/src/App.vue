<template>
  <div v-if="!ready" class="loading-screen">
    <div class="loading-spinner" />
    <div class="loading-text">載入中...</div>
  </div>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRtdbStore } from './stores/rtdb'
import { useAuthStore } from './stores/auth'

const ready = ref(false)

onMounted(async () => {
  const rtdb = useRtdbStore()
  const auth = useAuthStore()

  // 1. Load Firebase data first
  await rtdb.init()

  // 2. Then wire up auth (needs users list from store)
  auth.init(rtdb.store?.users ?? [])

  // 3. Wait for Firebase auth state to settle (onAuthStateChanged fires once)
  await new Promise<void>((resolve) => {
    const stop = setInterval(() => {
      if (auth.ready) { clearInterval(stop); resolve() }
    }, 50)
    // safety timeout — if Firebase is unreachable, proceed anyway
    setTimeout(() => { clearInterval(stop); resolve() }, 3000)
  })

  ready.value = true
})
</script>

<style scoped>
.loading-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; gap: 16px; background: #f5f7fa;
}
.loading-spinner {
  width: 36px; height: 36px; border: 3px solid #eee;
  border-top-color: #2e7d5a; border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { font-size: .88rem; color: #aaa; }
</style>
