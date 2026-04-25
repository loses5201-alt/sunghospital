import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const firebaseUser = ref<import('firebase/auth').User | null>(null)
  const ready = ref(false)
  let listenerAttached = false

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isManager = computed(() => ['admin', 'manager'].includes(currentUser.value?.role ?? ''))

  // Setup Firebase Auth listener (passive — just observe state)
  function init() {
    if (listenerAttached) return
    listenerAttached = true
    onAuthStateChanged(auth, (fbUser) => {
      firebaseUser.value = fbUser
      ready.value = true
    })
  }

  // Match Firebase Auth user with internal user list. Call after RTDB loads.
  function matchUser(users: User[]) {
    const fbUser = firebaseUser.value
    if (fbUser) {
      const matched = users.find((u) => u.email === fbUser.email || u.googleId === fbUser.uid)
      currentUser.value = matched ?? null
      if (matched) localStorage.setItem('loggedInUserId', matched.id)
    } else {
      const savedId = localStorage.getItem('loggedInUserId')
      currentUser.value = savedId ? (users.find((u) => u.id === savedId) ?? null) : null
    }
  }

  // Login with Google. Caller provides reload + getters so we can:
  // 1) sign in with Google
  // 2) reload RTDB (auth now permits the read)
  // 3) look up matching user in fresh list, or create one if missing
  async function loginWithGoogle(opts: {
    reloadRtdb: () => Promise<void>
    getUsers: () => User[]
    addUser: (u: User) => Promise<void> | void
  }): Promise<User> {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const gu = result.user

    // Reload RTDB now that Firebase Auth is set
    await opts.reloadRtdb()

    const users = opts.getUsers()
    let matched = users.find((u) => u.email === gu.email || u.googleId === gu.uid)
    if (!matched) {
      const isFirst = users.length === 0
      matched = {
        id: crypto.randomUUID(),
        username: gu.email?.split('@')[0] ?? '',
        password: '',
        name: gu.displayName ?? gu.email?.split('@')[0] ?? '',
        email: gu.email ?? '',
        googleId: gu.uid,
        role: isFirst ? 'admin' : 'member',
        deptId: '',
        title: '',
        avatar: 'av-a',
        status: 'active',
        needsReview: !isFirst,   // 管理員本人不需審核；其他人需要
        firstLoginAt: new Date().toISOString(),
      }
      await opts.addUser(matched)
    }
    currentUser.value = matched
    localStorage.setItem('loggedInUserId', matched.id)
    return matched
  }

  async function logout() {
    await signOut(auth)
    currentUser.value = null
    localStorage.removeItem('loggedInUserId')
  }

  return { currentUser, firebaseUser, ready, isLoggedIn, isAdmin, isManager, init, matchUser, loginWithGoogle, logout }
})
