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
- [ ] Legacy index.html co-existence verified (次優先)

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

## Module Migration (22 total — smallest → largest)

| # | Module | Size | Status | Notes |
|---|--------|------|--------|-------|
| 1 | departments | XS | 🔧 | 靜態清單，下一個 |
| 2 | skills | XS | ⏳ | |
| 3 | sop | S | ⏳ | |
| 4 | announcements | S | ⏳ | |
| 5 | journal | S | ⏳ | |
| 6 | kiosk | S | ⏳ | |
| 7 | messages | S | ⏳ | |
| 8 | duty | M | ⏳ | |
| 9 | meetings | M | ⏳ | |
| 10 | forms | M | ⏳ | |
| 11 | edu | M | ⏳ | 搜尋 + 編輯/刪除 |
| 12 | baby | M | ⏳ | APGAR、臨床資料 |
| 13 | patient | M | ⏳ | |
| 14 | delivery | M | ⏳ | |
| 15 | inventory | M | ⏳ | |
| 16 | equipment | L | ⏳ | priority + 跟進留言 |
| 17 | incident | L | ⏳ | 留言串 |
| 18 | leave | L | ⏳ | store.leaves 欄位 |
| 19 | calendar | L | ⏳ | 依賴 leave |
| 20 | users | L | ⏳ | |
| 21 | stats | L | ⏳ | 圖表 |
| 22 | shift | XL | ⏳ | 最大，最後遷 |

## Data Notes
- `store.leaves`: `{ id, userId, type, startDate, endDate, status, createdAt }`
- `store.formRequests`: 舊系統，行事曆已改用 `leaves`
- `store.equipment`: `{ id, name, category, priority, location, note, status, comments[] }`
- `store.incidents`: `{ id, title, description, level, status, comments[] }`

## Legend
- ⏳ Not started
- 🔧 In progress
- ✅ Done
- ❌ Blocked
