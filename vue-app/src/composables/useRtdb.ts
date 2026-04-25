import { ref as dbRef, onValue, set, get } from 'firebase/database'
import { ref } from 'vue'
import { db, auth as firebaseAuth } from '../firebase'
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

// CRITICAL: wait for Firebase Auth to restore its persisted session
// before reading RTDB. Otherwise Firebase rules may deny the read,
// we'd silently fall back to empty store, and the next save would
// WIPE all cloud data.
function waitForAuthRestore(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false
    const finish = () => { if (!resolved) { resolved = true; resolve() } }
    // Subscribe to auth state. The first event fires once Firebase has
    // determined whether a persisted session exists (user OR null).
    const unsub = firebaseAuth.onAuthStateChanged(() => {
      unsub()
      finish()
    })
    // Safety net: don't hang forever if Firebase Auth is unreachable
    setTimeout(finish, 5000)
  })
}

export function useRtdb() {
  const synced = ref(false)         // true = cloud listener active
  const loadFailed = ref(false)     // true = we couldn't read cloud (BLOCK saves)
  const cloudWasEmpty = ref(false)  // true = cloud genuinely had no data
  const store = ref<AppStore | null>(null)

  async function watchStore(onReady: () => void): Promise<void> {
    // STEP 1: wait for Firebase Auth to restore persisted session
    // (otherwise RTDB rules might deny our read and we'd think cloud is empty)
    await waitForAuthRestore()

    // STEP 2: try to read store from cloud
    const storeRef = dbRef(db, 'store')
    try {
      const snap = await get(storeRef)
      const data = snap.val()

      if (data) {
        // Cloud has data — use it
        store.value = normalizeStore(data)
        cloudWasEmpty.value = false
      } else {
        // Cloud is genuinely empty (first install) — start with empty,
        // saves are allowed because we successfully reached cloud
        store.value = emptyStore()
        cloudWasEmpty.value = true
      }
      synced.value = true
      loadFailed.value = false
    } catch (err) {
      // Cloud read FAILED (network/auth/rules). DO NOT fall back to emptyStore!
      // If we did, the next save would wipe all cloud data.
      // Leave store as null and block saves until user retries.
      console.error('[useRtdb] Cloud read failed:', err)
      loadFailed.value = true
      synced.value = false
      onReady()
      return
    }

    onReady()

    // STEP 3: subscribe to live updates
    onValue(dbRef(db, 'store/_savedAt'), (tSnap) => {
      const cloudTime = tSnap.val() ?? 0
      // Skip echoes of our own saves
      if (cloudTime === lastSelfSave) return
      get(storeRef).then((s) => {
        const d = s.val()
        if (d) store.value = normalizeStore(d)
      }).catch((err) => console.warn('[useRtdb] Live update fetch failed:', err))
    })
  }

  let lastSelfSave = 0
  async function saveStore(data: AppStore): Promise<void> {
    // SAFETY GUARDS — refuse to save if it would wipe cloud data
    if (loadFailed.value) {
      const msg = '⚠ 雲端讀取失敗，無法儲存 (避免覆蓋既有資料)。請重新整理頁面。'
      console.error(msg)
      alert(msg)
      throw new Error('Save blocked: cloud load failed')
    }
    if (!data || typeof data !== 'object') {
      console.error('[useRtdb] Refusing to save invalid data')
      return
    }

    const ts = Date.now()
    data._savedAt = ts
    lastSelfSave = ts
    try {
      await set(dbRef(db, 'store'), data)
    } catch (err) {
      console.error('[useRtdb] Save failed:', err)
      alert('儲存失敗：' + (err instanceof Error ? err.message : '未知錯誤'))
    }
  }

  return { store, synced, loadFailed, cloudWasEmpty, watchStore, saveStore }
}
