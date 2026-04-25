import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRtdb, normalizeStore } from '../composables/useRtdb'

export const useRtdbStore = defineStore('rtdb', () => {
  const { store, synced, watchStore, saveStore } = useRtdb()
  const loading = ref(true)

  function init(): Promise<void> {
    return new Promise((resolve) => {
      watchStore(() => {
        loading.value = false
        resolve()
      })
    })
  }

  function save() {
    if (store.value) return saveStore(store.value)
  }

  function uid(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }

  return { store, synced, loading, init, save, uid, normalizeStore }
})
