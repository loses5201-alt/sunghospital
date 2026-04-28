# /save-audit — 資料同步安全審查

你正在協助開發宋俊宏婦幼醫院管理系統（純前端 SPA，Firebase Realtime DB）。

背景：系統曾有多人操作資料互相覆蓋的 bug，根本原因是 `saveStore()` 整包覆寫。
已修復方案：改用 `saveCollection(key)` 只更新單一集合、`saveMultiple({k1,k2})` 更新多個集合。

**請執行完整審查：**

1. 用 Grep 搜尋 `modules/` 目錄下所有 `.js` 檔，找：
   - `saveStore(` — 舊的整包覆寫呼叫（應全部遷移完畢）
   - `rtdb.save(` — 另一種整包覆寫寫法（若有）
   - `saveCollection(` — 新的安全呼叫（列出使用次數）
   - `saveMultiple(` — 多集合安全呼叫（列出使用次數）

2. 列出結果表格：
   | 檔案 | saveStore | rtdb.save | saveCollection | saveMultiple |
   |------|-----------|-----------|----------------|--------------|

3. 若發現仍有 `saveStore()` 或 `rtdb.save()`，找出該呼叫的前後脈絡，說明哪個 collection key 需要改

4. 結論：整體同步安全狀態（✅ 全部遷移 / ⚠️ 還有 N 個遺留）

每次新增功能後可重跑此命令確認安全。
