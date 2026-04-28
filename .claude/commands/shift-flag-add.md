# /shift-flag-add — 新增交班安全旗標

你正在協助開發宋俊宏婦幼醫院管理系統（純前端 SPA）。

使用者想新增交班記錄的安全旗標。目前 `modules/shift.js` 的 SH_FLAGS：
```
npo（禁食）、iso_c（接觸隔離）、iso_d（飛沫隔離）、iso_a（空氣隔離）、
fall（跌倒高風險）、pressure（壓傷照護）、allergy（藥物過敏警示）
```

每個旗標格式：`{ id, label, icon, color }`

**請依序完成：**

1. 讀取 `modules/shift.js`，找到 SH_FLAGS 定義與所有使用旗標的地方（搜尋 `SH_FLAGS`、`flags`）
2. **詢問使用者**：新旗標的 id（英文小寫加底線）、中文標籤、emoji 圖示、顏色（16進位）
3. **修改 shift.js**：
   - 在 SH_FLAGS 陣列加入新旗標
   - 確認新增交班 modal（`openNewShift`）和編輯 modal（`openEditShift`）的旗標 checkbox 清單是從 SH_FLAGS 動態生成的（若是硬編碼則一起補上）
   - 確認交班列表渲染時旗標 icon 的顯示邏輯（搜尋 `f.flags`）
4. 確認儲存呼叫使用 `saveCollection('shifts')`
5. 說明：新旗標在哪些 UI 位置會出現（新增表單 checkbox、列表 icon、詳情彈窗）
