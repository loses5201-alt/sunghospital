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

function emptyStore(): AppStore {
  return {
    users: [], departments: [], shifts: [], leaves: [],
    announcements: [], incidents: [], babies: [], patients: [],
    equipment: [], inventory: [], inventoryLogs: [],
    meetings: [], messages: [], chatRooms: [],
    journals: [], eduItems: [], sops: [],
    formRequests: [], swapRequests: [], formNotifs: [],
    skillDefs: [], skillMatrix: {}, titles: [], rooms: [], emergencies: [],
  }
}

export function normalizeStore(s: Partial<AppStore>): AppStore {
  const arrFields = [
    'meetings', 'users', 'departments', 'shifts', 'announcements', 'incidents',
    'emergencies', 'babies', 'rooms', 'formRequests', 'swapRequests', 'journals',
    'eduItems', 'titles', 'formNotifs', 'messages', 'chatRooms', 'equipment',
    'patients', 'sops', 'inventory', 'inventoryLogs', 'skillDefs', 'leaves',
  ] as const
  const result = { ...emptyStore(), ...s } as AppStore
  arrFields.forEach((f) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(result as any)[f] = normalizeArr((s as any)?.[f])
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
      // Always initialize store (empty if no cloud data)
      store.value = data ? normalizeStore(data) : emptyStore()
      synced.value = true
      onReady()

      onValue(dbRef(db, 'store/_savedAt'), (tSnap) => {
        const cloudTime = tSnap.val() ?? 0
        // skip our own saves (avoid infinite loop)
        if (cloudTime === lastSelfSave) return
        get(storeRef).then((s) => {
          const d = s.val()
          if (d) store.value = normalizeStore(d)
        })
      })
    }).catch((err) => {
      console.warn('Firebase load failed, using empty store:', err)
      store.value = emptyStore()
      synced.value = false
      onReady()
    })
  }

  let lastSelfSave = 0
  async function saveStore(data: AppStore) {
    const ts = Date.now()
    data._savedAt = ts
    lastSelfSave = ts
    try {
      await set(dbRef(db, 'store'), data)
    } catch (err) {
      console.error('Firebase save failed:', err)
    }
    // Vue's ref already tracks nested mutations; no manual reassignment needed
  }

  return { store, synced, watchStore, saveStore }
}
