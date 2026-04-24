import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/departments',
      component: () => import('../views/DepartmentsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/skills',
      component: () => import('../views/SkillsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/sop',
      component: () => import('../views/SopView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/announcements',
      component: () => import('../views/AnnouncementsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/journal',
      component: () => import('../views/JournalView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/kiosk',
      component: () => import('../views/KioskView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/messages',
      component: () => import('../views/MessagesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/duty',
      component: () => import('../views/DutyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/meetings',
      component: () => import('../views/MeetingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/forms',
      component: () => import('../views/FormsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/edu',
      component: () => import('../views/EduView.vue'),
      meta: { requiresAuth: true },
    },
    // modules will be added here as they migrate
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login'
})

export default router
