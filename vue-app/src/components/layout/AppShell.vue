<template>
  <div class="app-shell">
    <!-- DESKTOP SIDEBAR -->
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
            <span v-if="item.badge?.value" class="nav-badge">{{ item.badge.value }}</span>
          </RouterLink>
        </div>
      </div>

      <div class="sidebar-footer">
        <span class="user-name">{{ auth.currentUser?.name }}</span>
        <button class="btn-logout" @click="auth.logout()">登出</button>
      </div>
    </nav>

    <!-- MOBILE HEADER (sticky top) -->
    <header class="mobile-header">
      <div class="mh-title">{{ pageTitle }}</div>
      <div class="mh-user">
        <span class="mh-name">{{ auth.currentUser?.name }}</span>
        <button class="mh-logout" @click="auth.logout()">登出</button>
      </div>
    </header>

    <!-- MAIN -->
    <main class="main-content">
      <slot />
    </main>

    <!-- MOBILE BOTTOM TAB BAR -->
    <nav class="mobile-tabbar">
      <RouterLink
        v-for="tab in routableTabs" :key="tab.key"
        :to="tab.path"
        custom
        v-slot="{ isActive, navigate }"
      >
        <button
          :class="['tab-btn', isActive ? 'active' : '']"
          @click="navigate"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </RouterLink>
      <button
        :class="['tab-btn', moreOpen ? 'active' : '']"
        @click="moreOpen = !moreOpen"
      >
        <span class="tab-icon">☰</span>
        <span class="tab-label">更多</span>
      </button>
    </nav>

    <!-- "MORE" FULLSCREEN OVERLAY -->
    <Teleport to="body">
      <div v-if="moreOpen" class="more-overlay" @click.self="moreOpen = false">
        <div class="more-panel">
          <div class="more-head">
            <span class="more-title">全部功能</span>
            <button class="more-close" @click="moreOpen = false">×</button>
          </div>
          <div class="more-scroll">
            <div v-for="group in navGroups" :key="group.label" class="more-group">
              <div class="more-group-label">{{ group.label }}</div>
              <div class="more-items">
                <RouterLink
                  v-for="item in group.items" :key="item.path"
                  :to="item.path" class="more-item"
                  active-class="active"
                  @click="moreOpen = false"
                >
                  <span class="mi-icon">
                    {{ item.icon }}
                    <span v-if="item.badge?.value" class="mi-badge">{{ item.badge.value }}</span>
                  </span>
                  <span class="mi-label">{{ item.label }}</span>
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useRtdbStore } from '../../stores/rtdb'

const auth = useAuthStore()
const rtdb = useRtdbStore()
const route = useRoute()
const moreOpen = ref(false)

// 待審核表單數（輪到我審的）
const pendingFormsCount = computed(() => {
  const uid = auth.currentUser?.id
  if (!uid) return 0
  return (rtdb.store?.formRequests ?? []).filter(f => {
    if (f.status !== 'pending') return false
    const i = f.approvers.indexOf(uid)
    if (i < 0) return false
    if (i === 0) return f.statuses[0] === 'pending'
    return f.statuses[i - 1] === 'approved' && f.statuses[i] === 'pending'
  }).length
})

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
      { path: '/forms', icon: '✍️', label: '表單簽核', badge: pendingFormsCount },
      { path: '/incident',    icon: '🚨', label: '事件通報' },
      { path: '/equipment',   icon: '🔧', label: '設備回報' },
      { path: '/inventory',   icon: '📦', label: '庫存管理' },
      { path: '/departments', icon: '🏢', label: '科別管理' },
      { path: '/users',       icon: '⚙️', label: '系統管理' },
    ],
  },
]

// Flatten path → label for header title lookup
const pathLabelMap = navGroups
  .flatMap((g) => g.items)
  .reduce((acc, it) => { acc[it.path] = it.label; return acc }, {} as Record<string, string>)

const pageTitle = computed(() => pathLabelMap[route.path] ?? '宋俊宏婦幼')

// Role-aware mobile tab bar (3 routable tabs + 「更多」 trigger)
// Manager/admin: 首頁 / 班表 / 簽核 / 更多
// Member:        首頁 / 班表 / 交班 / 更多
const routableTabs = computed(() => {
  const isMgr = auth.isManager
  return [
    { key: 'home',  path: '/',     icon: '🏠', label: '首頁' },
    { key: 'duty',  path: '/duty', icon: '📅', label: '班表' },
    isMgr
      ? { key: 'forms', path: '/forms', icon: '✍️', label: '簽核' }
      : { key: 'shift', path: '/shift', icon: '📋', label: '交班' },
  ]
})
</script>

<style scoped>
.app-shell { display: flex; min-height: 100vh; }

/* ---------- DESKTOP SIDEBAR ---------- */
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
.nav-badge { background: #c0392b; color: white; border-radius: 99px; font-size: .6rem; font-weight: 700; padding: 1px 5px; margin-left: auto; }
.sidebar-footer {
  padding: 10px 14px; border-top: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; gap: 8px;
}
.user-name { font-size: .75rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgba(255,255,255,.8); }
.btn-logout {
  background: transparent; border: 1px solid rgba(255,255,255,.3);
  color: rgba(255,255,255,.7); border-radius: 4px; padding: 3px 8px; font-size: .72rem; cursor: pointer;
}

/* ---------- MAIN CONTENT ---------- */
.main-content { flex: 1; overflow-y: auto; background: #f5f7fa; }

/* ---------- MOBILE HEADER ---------- */
.mobile-header { display: none; }

/* ---------- MOBILE TAB BAR ---------- */
.mobile-tabbar { display: none; }

/* ---------- MOBILE: ≤768px ---------- */
@media (max-width: 768px) {
  .app-shell { flex-direction: column; }

  .sidebar { display: none; }

  .mobile-header {
    display: flex; align-items: center; justify-content: space-between;
    background: #1a3c5e; color: white;
    padding: 10px 14px; gap: 12px;
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
  }
  .mh-title { font-size: 1rem; font-weight: 700; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mh-user { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .mh-name { font-size: .8rem; color: rgba(255,255,255,.85); max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mh-logout { background: transparent; border: 1px solid rgba(255,255,255,.3); color: rgba(255,255,255,.85); border-radius: 4px; padding: 3px 8px; font-size: .72rem; cursor: pointer; }

  .main-content {
    padding-bottom: 64px;
    min-height: calc(100vh - 44px);
  }

  .mobile-tabbar {
    display: flex; align-items: stretch;
    position: fixed; bottom: 0; left: 0; right: 0;
    background: white; border-top: 1px solid #e5e4e7;
    z-index: 60; height: 56px;
    padding-bottom: env(safe-area-inset-bottom, 0);
    box-shadow: 0 -2px 8px rgba(0,0,0,.04);
  }
  .tab-btn {
    flex: 1; background: transparent; border: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; padding: 6px 4px;
    color: #888; font-size: .7rem;
    transition: color .12s;
  }
  .tab-btn .tab-icon { font-size: 1.3rem; line-height: 1; }
  .tab-btn .tab-label { font-size: .68rem; }
  .tab-btn.active { color: #1a3c5e; font-weight: 700; }
  .tab-btn.active .tab-icon { transform: scale(1.05); }
  .tab-btn:active { background: rgba(0,0,0,.04); }
}

/* ---------- "MORE" OVERLAY ---------- */
.more-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  z-index: 200; display: flex; align-items: flex-end;
}
.more-panel {
  background: #f5f7fa; width: 100%; height: 88vh;
  border-radius: 16px 16px 0 0;
  display: flex; flex-direction: column;
  animation: slideUp .22s ease;
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.more-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #e5e4e7;
  background: white; border-radius: 16px 16px 0 0;
}
.more-title { font-size: 1rem; font-weight: 700; color: #1a3c5e; }
.more-close { background: none; border: none; font-size: 1.6rem; color: #888; cursor: pointer; line-height: 1; padding: 0 4px; }
.more-scroll { flex: 1; overflow-y: auto; padding: 12px 14px 24px; }
.more-group { margin-bottom: 18px; }
.more-group-label { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #888; margin-bottom: 8px; padding: 0 4px; }
.more-items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.more-item {
  background: white; border-radius: 10px; padding: 14px 8px;
  text-align: center; text-decoration: none; color: #333;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  border: 1.5px solid transparent;
  transition: border-color .12s, background .12s;
}
.more-item:active { background: #eef2f6; }
.more-item.active { border-color: #1a3c5e; }
.mi-icon { font-size: 1.5rem; line-height: 1; position: relative; display: inline-block; }
.mi-badge { position: absolute; top: -4px; right: -6px; background: #c0392b; color: white; border-radius: 99px; font-size: .55rem; font-weight: 700; padding: 1px 4px; }
.mi-label { font-size: .76rem; font-weight: 600; color: #1a3c5e; }
</style>
