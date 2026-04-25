import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRtdb, normalizeStore } from '../composables/useRtdb'

export const useRtdbStore = defineStore('rtdb', () => {
  const { store, synced, loadFailed, cloudWasEmpty, watchStore, saveStore, saveCollection, saveMultiple } = useRtdb()
  const loading = ref(true)

  function init(): Promise<void> {
    loading.value = true
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

  return { store, synced, loadFailed, cloudWasEmpty, loading, init, save, saveCollection, saveMultiple, uid, normalizeStore }
})
