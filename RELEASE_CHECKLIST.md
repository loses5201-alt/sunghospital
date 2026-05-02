# Sunghospital Release Checklist

每次準備部署前，請完整勾選。建議由 2 人交叉覆核（開發 + 管理員）。

## 0) Build And Repo Health

- [ ] `vue-app` 可成功執行 `npm run build`
- [ ] Build 後 `app/` 產物已更新（含 `sw.js`、`manifest.webmanifest`）
- [ ] Git 工作區沒有誤提交檔案（尤其 `.env`、測試暫存）
- [ ] 版本資訊/更新說明已準備完成（若有對外公告）

## 1) Environment And Secrets

- [ ] `.env` 為正式值，不是範例占位字串
- [ ] 無任何金鑰被硬寫到前端程式碼（必要公開設定除外）
- [ ] Firebase 專案 ID 與目標環境一致（dev/staging/prod）
- [ ] 若使用外部 AI API（Google/Claude），金鑰與模型名稱可正確載入

## 2) Google OAuth Login

- [ ] Google 登入可正常開啟授權流程並登入成功
- [ ] 新使用者首次登入會自動建立帳號資料
- [ ] 乾淨資料庫情境下，第一位登入者會成為 `admin`
- [ ] 後續登入者預設為 `member`
- [ ] 新登入者會標記 `needsReview=true`
- [ ] 管理員可在系統管理頁看到待審核提示並調整身分
- [ ] Firebase Auth 白名單網域包含部署網址

## 3) RTDB Multi-User Consistency

- [ ] 專案內無殘留舊式整包覆寫呼叫（`rtdb.save()`）
- [ ] 多人同時操作不同模組，不會互相覆蓋資料
- [ ] 送單 + 通知等跨集合更新使用原子多集合更新流程
- [ ] 雲端讀取失敗時，系統會阻擋儲存以避免資料被清空

## 4) BPM Form Approval

- [ ] 新增表單可正確建立（請假/加班/物品/其他）
- [ ] 審核人預設會自動帶入主管/管理員
- [ ] 送出後第一位審核人可收到通知
- [ ] 核准後可推進下一位審核，最終狀態可變為 `approved`
- [ ] 退回後申請人可收到通知，狀態為 `rejected`
- [ ] 導覽列「表單簽核」待審 badge 會隨狀態即時更新
- [ ] 緊急標記可顯示並在列表中優先排序

## 5) PWA Installability

- [ ] Android Chrome 可顯示安裝提示並成功安裝
- [ ] iPhone Safari 可「加入主畫面」並以獨立 App 開啟
- [ ] 首次載入後離線可開啟 app shell（核心頁面不白屏）
- [ ] Service Worker 更新後可正常切換新版本（`autoUpdate`）
- [ ] 需要即時資料的 API（如 Firebase）不會被錯誤快取

## 6) Permission And Security

- [ ] Firebase RTDB Rules 已檢查：未授權者不可讀寫敏感資料
- [ ] 管理功能僅限對應角色可操作（admin/manager/member）
- [ ] 高風險操作有確認流程（刪除、退回、撤回等）
- [ ] Console 無持續錯誤（Auth/RTDB/Service Worker）

## 7) Cross-Device Smoke Test (Recommended)

- [ ] 裝置 A（桌機）登入並新增/修改資料
- [ ] 裝置 B（手機）可即時看到同步結果
- [ ] B 送出簽核，A 可看到待審 badge 與通知
- [ ] A 完成核准/退回，B 可看到最終狀態與通知

## 8) Deployment Sign-Off

- [ ] 已備份關鍵資料或確認可回復方案
- [ ] 已確認部署目標路徑與 base URL 正確
- [ ] 已完成部署後線上冒煙測試（登入、簽核、同步、PWA）
- [ ] 已通知使用者更新重點與注意事項

---

## Quick Go/No-Go Rule

若以下任一項未通過，建議 **No-Go**（暫緩上線）：

- Google OAuth 無法登入
- 多人同步會覆蓋資料
- BPM 通知或簽核狀態錯誤
- PWA 無法安裝或離線白屏
- 存在未授權讀寫風險
