<template>
  <div class="app-shell">
    <nav class="sidebar">
      <div class="logo">宋俊宏婦幼</div>

      <div class="nav-scroll">
        <div v-for="group in navGroups" :key="group.label" class="nav-group">
          <div class="nav-group-label">{{ group.label }}</div>
          <RouterLink
            v-for="item in group.items" :key="item.path"
            :to="item.path" active-class="active" class="nav-link"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            {{ item.label }}
          </RouterLink>
        </div>
      </div>

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

const navGroups = [
  {
    label: '總覽',
    items: [
      { path: '/',            icon: '🏠', label: '首頁' },
      { path: '/kiosk',       icon: '📊', label: '全院看板' },
      { path: '/calendar',    icon: '📅', label: '行事曆' },
      { path: '/stats',       icon: '📈', label: '統計報表' },
    ],
  },
  {
    label: '臨床',
    items: [
      { path: '/patient',     icon: '🏥', label: '病患動線' },
      { path: '/delivery',    icon: '🚪', label: '產房狀態' },
      { path: '/baby',        icon: '🍼', label: '寶寶牆' },
      { path: '/shift',       icon: '📋', label: '交班紀錄' },
    ],
  },
  {
    label: '排班',
    items: [
      { path: '/duty',        icon: '📅', label: '值班表' },
      { path: '/leave',       icon: '🌿', label: '請假管理' },
    ],
  },
  {
    label: '知識庫',
    items: [
      { path: '/edu',         icon: '📚', label: '衛教資料庫' },
      { path: '/sop',         icon: '📋', label: 'SOP 文件' },
      { path: '/skills',      icon: '🎓', label: '技能矩陣' },
    ],
  },
  {
    label: '溝通',
    items: [
      { path: '/announcements', icon: '📢', label: '公告牆' },
      { path: '/journal',     icon: '💬', label: '留言板' },
      { path: '/messages',    icon: '✉️', label: '站內訊息' },
      { path: '/meetings',    icon: '🤝', label: '會議記錄' },
    ],
  },
  {
    label: '管理',
    items: [
      { path: '/forms',       icon: '✍️', label: '表單簽核' },
      { path: '/incident',    icon: '🚨', label: '事件通報' },
      { path: '/equipment',   icon: '🔧', label: '設備回報' },
      { path: '/inventory',   icon: '📦', label: '庫存管理' },
      { path: '/departments', icon: '🏢', label: '科別管理' },
      { path: '/users',       icon: '⚙️', label: '系統管理' },
    ],
  },
]
</script>

<style scoped>
.app-shell { display: flex; min-height: 100vh; }
.sidebar {
  width: 190px; background: #1a3c5e; color: white;
  display: flex; flex-direction: column; flex-shrink: 0;
  position: sticky; top: 0; height: 100vh;
}
.logo { padding: 16px 14px 12px; font-size: .95rem; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,.12); }
.nav-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
.nav-scroll::-webkit-scrollbar { width: 3px; }
.nav-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 99px; }
.nav-group { margin-bottom: 4px; }
.nav-group-label { font-size: .62rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.4); padding: 8px 14px 3px; }
.nav-link { display: flex; align-items: center; gap: 7px; padding: 7px 14px; color: rgba(255,255,255,.75); text-decoration: none; font-size: .82rem; border-radius: 0; transition: background .12s; }
.nav-link:hover { background: rgba(255,255,255,.08); color: white; }
.nav-link.active { background: rgba(255,255,255,.14); color: white; font-weight: 700; }
.nav-icon { font-size: .85rem; width: 16px; text-align: center; flex-shrink: 0; }
.sidebar-footer {
  padding: 10px 14px; border-top: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; gap: 8px;
}
.user-name { font-size: .75rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,.8); }
.btn-logout {
  background: transparent; border: 1px solid rgba(255,255,255,.3);
  color: rgba(255,255,255,.7); border-radius: 4px; padding: 3px 8px; font-size: .72rem; cursor: pointer;
}
.main-content { flex: 1; overflow-y: auto; background: #f5f7fa; }
</style>
