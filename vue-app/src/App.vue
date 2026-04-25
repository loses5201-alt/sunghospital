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

  // 1. Load Firebase data first (store is never null after this)
  await rtdb.init()

  // 2. Wire up auth with live users getter + adder
  auth.init(
    () => rtdb.store?.users ?? [],
    (u) => {
      if (!rtdb.store) return
      if (!rtdb.store.users) rtdb.store.users = []
      rtdb.store.users.push(u)
      rtdb.save()
    },
  )

  // 3. Wait for Firebase auth state to settle
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (auth.ready) { clearInterval(timer); resolve() }
    }, 50)
    setTimeout(() => { clearInterval(timer); resolve() }, 3000)
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
