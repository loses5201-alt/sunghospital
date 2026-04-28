# /shift-pending-alert — 交班待簽收警示審查

你正在協助開發宋俊宏婦幼醫院管理系統（純前端 SPA）。

使用者想確認交班待簽收的警示邏輯是否完整。

**store.shifts 每筆結構：**
```
{ id, date, fromId, toId, patients:[], urgency:'normal|watch|critical', flags:[], toSigned:bool, ... }
```

**請執行完整審查：**

1. 讀取 `modules/shift.js` 完整內容
2. 找出並列出以下邏輯目前在哪幾行：
   - 統計列（今日/待簽/🚨 警示未簽）的計算公式
   - 警示未簽（urgency=critical AND toSigned=false）的顯示樣式
   - 簽收動作（`signShift` 或類似函式）— 確認它更新 toSigned=true 並呼叫 saveCollection
3. **檢查首頁儀表板**（`app.js` 或 home 相關模組）是否有待簽警示的聚合顯示
4. 回報任何潛在問題：
   - 警示計數是否可能算錯？
   - 簽收後是否即時更新畫面？
   - critical 交班但沒有 toId 的孤兒資料是否有處理？
5. 提出改進建議（若有）
