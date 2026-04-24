import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const firebaseUser = ref<import('firebase/auth').User | null>(null)
  const ready = ref(false)

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isManager = computed(() => ['admin', 'manager'].includes(currentUser.value?.role ?? ''))

  function init(users: User[]) {
    onAuthStateChanged(auth, (fbUser) => {
      firebaseUser.value = fbUser
      if (fbUser) {
        const matched = users.find((u) => u.email === fbUser.email || u.googleId === fbUser.uid)
        currentUser.value = matched ?? null
        if (matched) localStorage.setItem('loggedInUserId', matched.id)
      } else {
        // try localStorage fallback (offline)
        const savedId = localStorage.getItem('loggedInUserId')
        currentUser.value = savedId ? (users.find((u) => u.id === savedId) ?? null) : null
      }
      ready.value = true
    })
  }

  async function loginWithGoogle(users: User[], addUser: (u: User) => void): Promise<User | null> {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const gu = result.user
    let matched = users.find((u) => u.email === gu.email || u.googleId === gu.uid)
    if (!matched) {
      matched = {
        id: crypto.randomUUID(),
        username: gu.email?.split('@')[0] ?? '',
        password: '',
        name: gu.displayName ?? gu.email?.split('@')[0] ?? '',
        email: gu.email ?? '',
        googleId: gu.uid,
        role: 'member',
        deptId: '',
        title: '',
        avatar: 'av-a',
      }
      addUser(matched)
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

  return { currentUser, firebaseUser, ready, isLoggedIn, isAdmin, isManager, init, loginWithGoogle, logout }
})
