<template>
  <div class="app-shell">
    <nav class="sidebar">
      <div class="logo">宋俊宏婦幼</div>
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink :to="item.path" active-class="active">{{ item.label }}</RouterLink>
        </li>
      </ul>
      <div class="sidebar-footer">
        <span class="user-name">{{ auth.currentUser?.name }}</span>
        <button class="btn-logout" @click="auth.logout()">登出</button>
      </div>
    </nav>
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const navItems = [
  { path: '/', label: '首頁' },
  { path: '/departments', label: '科別管理' },
  { path: '/skills', label: '技能矩陣' },
  { path: '/sop', label: 'SOP 文件' },
  { path: '/announcements', label: '公告牆' },
  { path: '/journal', label: '留言板' },
  { path: '/kiosk', label: '全院看板' },
  { path: '/messages', label: '站內訊息' },
  { path: '/duty', label: '值班表' },
  { path: '/meetings', label: '會議記錄' },
  { path: '/forms', label: '表單簽核' },
  { path: '/edu', label: '衛教資料庫' },
  { path: '/baby', label: '寶寶牆' },
  { path: '/patient', label: '病患動線' },
  { path: '/delivery', label: '產房狀態' },
  { path: '/inventory', label: '庫存管理' },
  // routes added here as modules migrate
]
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 200px;
  background: #1a3c5e;
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.logo {
  padding: 20px 16px;
  font-size: 1rem;
  font-weight: 700;
  border-bottom: 1px solid rgba(255,255,255,.15);
}
.nav-list {
  list-style: none;
  padding: 8px 0;
  margin: 0;
  flex: 1;
}
.nav-list a {
  display: block;
  padding: 10px 16px;
  color: rgba(255,255,255,.8);
  text-decoration: none;
  font-size: .9rem;
}
.nav-list a.active,
.nav-list a:hover { background: rgba(255,255,255,.1); color: white; }
.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,.15);
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-name { font-size: .8rem; flex: 1; truncate: true; }
.btn-logout {
  background: transparent;
  border: 1px solid rgba(255,255,255,.4);
  color: white;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: .75rem;
  cursor: pointer;
}
.main-content {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}
</style>
