# /bpm-debug — 診斷表單簽核狀態

你正在協助開發宋俊宏婦幼醫院管理系統（純前端 SPA，Firebase Realtime DB）。

使用者遇到 BPM 簽核問題，請協助診斷。

**資料結構（store.formRequests 每筆）：**
```
{ id, type, title, applicantId, approvers:[], statuses:[], comments:[], status, createdAt, ... }
```
核准邏輯在 `isApp(f)`：index i 的審核者，需要 statuses[i-1]==='approved' 且 statuses[i]==='pending' 才輪到他。

**請執行以下診斷：**

1. 讀取 `modules/forms.js`，定位 `isApp()`、`approveForm()`、`rejectForm()`、`notifyFormResult()` 函式
2. 如果使用者提供了 formRequest id 或標題，請他描述目前看到的症狀（誰應該能審但看不到？狀態顯示錯誤？）
3. 根據症狀，逐步 trace isApp() 的邏輯，找出哪個條件不符
4. 檢查 `saveCollection('formRequests')` 和 `saveCollection('formNotifs')` 是否在正確的位置被呼叫
5. 如果是通知問題，確認 `notifyFormResult()` 的 `toUserId` 是否對應到正確的 applicantId

列出診斷結論與修正建議，說明根本原因。
