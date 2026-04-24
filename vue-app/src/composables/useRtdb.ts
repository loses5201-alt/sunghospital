import { ref as dbRef, onValue, set, get } from 'firebase/database'
import { ref } from 'vue'
import { db } from '../firebase'
import type { AppStore } from '../types'

// RTDB converts arrays to objects — convert back
function normalizeArr<T>(val: unknown): T[] {
  if (!val) return []
  if (Array.isArray(val)) return val as T[]
  return Object.values(val as object) as T[]
}

export function normalizeStore(s: Partial<AppStore>): AppStore {
  const arrFields = [
    'meetings', 'users', 'departments', 'shifts', 'announcements', 'incidents',
    'emergencies', 'babies', 'rooms', 'formRequests', 'swapRequests', 'journals',
    'eduItems', 'titles', 'formNotifs', 'messages', 'chatRooms', 'equipment',
    'patients', 'sops', 'inventory', 'inventoryLogs', 'skillDefs', 'leaves',
  ] as const
  const result = { ...s } as AppStore
  arrFields.forEach((f) => {
    (result as Record<string, unknown>)[f] = normalizeArr((s as Record<string, unknown>)[f])
  })
  result.meetings?.forEach((m) => {
    m.tasks = normalizeArr(m.tasks)
    m.chat = normalizeArr(m.chat)
    m.votes = normalizeArr(m.votes)
    m.votes?.forEach((v) => { v.options = normalizeArr(v.options) })
  })
  return result
}

export function useRtdb() {
  const synced = ref(false)
  const store = ref<AppStore | null>(null)

  function watchStore(onReady: () => void) {
    const storeRef = dbRef(db, 'store')
    get(storeRef).then((snap) => {
      const data = snap.val()
      if (data && normalizeArr(data.users).length > 0) {
        store.value = normalizeStore(data)
      }
      synced.value = true
      onReady()

      onValue(dbRef(db, 'store/_savedAt'), () => {
        get(storeRef).then((s) => {
          const d = s.val()
          if (d?.users) store.value = normalizeStore(d)
        })
      })
    }).catch(() => { synced.value = false; onReady() })
  }

  async function saveStore(data: AppStore) {
    const ts = Date.now()
    data._savedAt = ts
    await set(dbRef(db, 'store'), data)
    store.value = data
  }

  return { store, synced, watchStore, saveStore }
}
