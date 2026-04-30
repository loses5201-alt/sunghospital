import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const ready = ref(false)

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isManager = computed(() => ['admin', 'manager'].includes(currentUser.value?.role ?? ''))

  function init() {
    ready.value = true
  }

  function matchUser(users: User[]) {
    const savedId = localStorage.getItem('loggedInUserId')
    currentUser.value = savedId ? (users.find((u) => u.id === savedId) ?? null) : null
  }

  function loginWithPassword(opts: {
    username: string
    password: string
    getUsers: () => User[]
  }): User {
    const users = opts.getUsers()
    const matched = users.find(
      (u) => u.username === opts.username && u.password === opts.password,
    )
    if (!matched) {
      throw new Error('帳號或密碼錯誤')
    }
    currentUser.value = matched
    localStorage.setItem('loggedInUserId', matched.id)
    return matched
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('loggedInUserId')
  }

  return {
    currentUser,
    ready,
    isLoggedIn,
    isAdmin,
    isManager,
    init,
    matchUser,
    loginWithPassword,
    logout,
  }
})
