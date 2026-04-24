# Vue 3 Migration Progress

## Strategy
Strangler pattern — legacy `index.html` stays live during transition.
Vue app lives in `vue-app/` (Vite + Vue 3 + TypeScript + Pinia + Vue Router).
Firebase RTDB untouched. Modules migrate smallest → largest.

## Phase 0 — Scaffold
- [x] Branch: `claude/recover-conversation-history-TAfCX`
- [x] `vue-app/` initialized (Vite 9 + vue-ts template)
- [x] `npm install` done
- [x] Pinia + Vue Router 4 installed
- [x] Firebase composable skeleton
- [x] Layout shell component (`AppShell.vue`)
- [x] Legacy index.html co-existence verified ✅ (舊系統保留)

## Phase 1 — Core Infra ✅
- [x] `src/firebase.ts` — RTDB init (modular SDK v9)
- [x] `src/types/index.ts` — 全 AppStore 型別定義
- [x] `src/composables/useRtdb.ts` — RTDB sync + normalizeStore
- [x] `src/stores/auth.ts` — Pinia auth store (Google login)
- [x] `src/stores/rtdb.ts` — Pinia RTDB store
- [x] `src/router/index.ts` — Vue Router 4 + auth guard
- [x] `src/views/LoginView.vue` + `HomeView.vue`
- [x] `src/components/layout/AppShell.vue` — sidebar shell
- [x] `main.ts` — Pinia + Router 掛載完畢

## Module Migration (22/22 ✅ ALL DONE)

| # | Module | Size | Status | Route |
|---|--------|------|--------|-------|
| 1 | departments | XS | ✅ | /departments |
| 2 | skills | XS | ✅ | /skills |
| 3 | sop | S | ✅ | /sop |
| 4 | announcements | S | ✅ | /announcements |
| 5 | journal | S | ✅ | /journal |
| 6 | kiosk | S | ✅ | /kiosk |
| 7 | messages | S | ✅ | /messages |
| 8 | duty | M | ✅ | /duty |
| 9 | meetings | M | ✅ | /meetings |
| 10 | forms | M | ✅ | /forms |
| 11 | edu | M | ✅ | /edu |
| 12 | baby | M | ✅ | /baby |
| 13 | patient | M | ✅ | /patient |
| 14 | delivery | M | ✅ | /delivery |
| 15 | inventory | M | ✅ | /inventory |
| 16 | equipment | L | ✅ | /equipment |
| 17 | incident | L | ✅ | /incident |
| 18 | leave | L | ✅ | /leave |
| 19 | calendar | L | ✅ | /calendar |
| 20 | users | L | ✅ | /users |
| 21 | stats | L | ✅ | /stats |
| 22 | shift | XL | ✅ | /shift |

## Data Notes
- `store.leaves`: `{ id, userId, type, startDate, endDate, status, createdAt }`
- `store.formRequests`: 舊系統，行事曆已改用 `leaves`
- `store.equipment`: `{ id, name, category, priority, location, note, status, comments[] }`
- `store.incidents`: `{ id, title, description, level, status, comments[] }`

## Final Status (2026-04-25)
- ✅ Production build: `npm run build` passes zero errors
- ✅ All 22 routes registered in Vue Router
- ✅ All 22 Views present in src/views/
- ✅ App.vue: RTDB + Auth initialized with loading screen
- ✅ Router guard: waits for auth.ready before redirecting
- ✅ AppShell: 22 nav items grouped into 6 sections
- ✅ HomeView: real dashboard with alerts + quick stats
- ✅ TypeScript strict: zero type errors

## Legend
- ⏳ Not started
- 🔧 In progress
- ✅ Done
- ❌ Blocked
