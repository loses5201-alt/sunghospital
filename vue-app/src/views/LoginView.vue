<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="login-bar"></div>
      <div class="login-inner">
        <div class="logo-circle">🏥</div>
        <h1>宋俊宏婦幼醫院</h1>
        <p class="subtitle">內部管理系統</p>

        <div class="input-group">
          <label>帳號</label>
          <input
            v-model="username"
            type="text"
            placeholder="輸入帳號"
            autocomplete="username"
            @keydown.enter="focusPassword"
            ref="userInput"
          />
        </div>
        <div class="input-group">
          <label>密碼</label>
          <input
            v-model="password"
            type="password"
            placeholder="輸入密碼"
            autocomplete="current-password"
            @keydown.enter="handleLogin"
            ref="passInput"
          />
        </div>

        <button class="btn-login" :disabled="loading" @click="handleLogin">
          <span v-if="loading">登入中...</span>
          <span v-else>登入系統</span>
        </button>

        <p v-if="error" class="login-error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRtdbStore } from '../stores/rtdb'

const router = useRouter()
const authStore = useAuthStore()
const rtdbStore = useRtdbStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const userInput = ref<HTMLInputElement | null>(null)
const passInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  userInput.value?.focus()
})

function focusPassword() {
  passInput.value?.focus()
}

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    return
  }
  loading.value = true
  error.value = ''
  try {
    if (!rtdbStore.store) {
      await rtdbStore.init()
    }
    authStore.loginWithPassword({
      username: username.value.trim(),
      password: password.value,
      getUsers: () => rtdbStore.store?.users ?? [],
    })
    router.push('/')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '登入失敗'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff0f2 0%, #f5eeff 50%, #fff0f5 100%);
  padding: 16px;
}
.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(234, 98, 122, 0.18);
  width: 100%;
  max-width: 380px;
  overflow: hidden;
}
.login-bar {
  height: 5px;
  background: linear-gradient(90deg, #ea627a, #9b6fd4, #6aafd4, #f5916a, #ea627a);
}
.login-inner {
  padding: 36px 32px;
  text-align: center;
}
.logo-circle {
  width: 64px;
  height: 64px;
  margin: 0 auto 14px;
  background: linear-gradient(135deg, #ea627a, #9b6fd4);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 6px 20px rgba(234, 98, 122, 0.35);
}
h1 {
  font-size: 1.3rem;
  margin: 0 0 4px;
  color: #2a0c18;
  font-weight: 800;
}
.subtitle {
  color: #888;
  margin: 0 0 24px;
  font-size: 0.85rem;
}
.input-group {
  text-align: left;
  margin-bottom: 14px;
}
.input-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 5px;
}
.input-group input {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid rgba(234, 98, 122, 0.18);
  border-radius: 10px;
  font-size: 14px;
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.input-group input:focus {
  border-color: #ea627a;
  box-shadow: 0 0 0 3px rgba(234, 98, 122, 0.12);
}
.btn-login {
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #ea627a 0%, #c04a62 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  margin-top: 6px;
  box-shadow: 0 4px 14px rgba(234, 98, 122, 0.38);
  transition: transform 0.18s, box-shadow 0.18s;
}
.btn-login:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(234, 98, 122, 0.5);
}
.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login-error {
  color: #c0392b;
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 600;
}
</style>
