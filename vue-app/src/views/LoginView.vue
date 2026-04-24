<template>
  <div class="login-screen">
    <div class="login-card">
      <h1>宋俊宏婦幼醫院</h1>
      <p class="subtitle">內部管理系統</p>
      <button class="btn-google" :disabled="loading" @click="handleGoogleLogin">
        <span v-if="loading">登入中...</span>
        <span v-else>以 Google 帳號登入</span>
      </button>
      <p v-if="error" class="login-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRtdbStore } from '../stores/rtdb'

const router = useRouter()
const authStore = useAuthStore()
const rtdbStore = useRtdbStore()
const loading = ref(false)
const error = ref('')

async function handleGoogleLogin() {
  loading.value = true
  error.value = ''
  try {
    await authStore.loginWithGoogle(
      rtdbStore.store?.users ?? [],
      (u) => { rtdbStore.store?.users.push(u); rtdbStore.save() },
    )
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
  background: #f0f4f8;
}
.login-card {
  background: white;
  border-radius: 12px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0,0,0,.08);
  min-width: 320px;
}
h1 { font-size: 1.4rem; margin: 0 0 4px; color: #1a3c5e; }
.subtitle { color: #666; margin: 0 0 32px; font-size: .9rem; }
.btn-google {
  background: #2e7d5a;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 28px;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
}
.btn-google:disabled { opacity: .6; cursor: not-allowed; }
.login-error { color: #c0392b; margin-top: 12px; font-size: .85rem; }
</style>
