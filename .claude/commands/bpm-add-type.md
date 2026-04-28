# /bpm-add-type — 新增 BPM 表單類型

你正在協助開發宋俊宏婦幼醫院管理系統（純前端 SPA，modules/*.js）。

使用者想新增一個 BPM 表單類型。目前 `modules/forms.js` 的 FTYPES：
```
leave, overtime, supply, other
```

請依序完成以下所有步驟，不要遺漏：

1. **讀取 `modules/forms.js`** 完整內容，確認 FTYPES 的格式（{l:'標籤', c:'CSS class'}）
2. **詢問使用者**：新類型的 key、中文標籤、所需欄位（日期範圍？數量？文字說明？）
3. **修改 forms.js**：
   - 在 FTYPES 加入新類型
   - 在 `openNewFrm()` 的 modal HTML 加入對應的分類型欄位（參考現有 leave/overtime/supply 的條件式欄位渲染）
   - 在 `rnForms()` 的列表顯示加入對應標籤
   - 在 `exportFormsCSV()` 加入新欄位的匯出欄（若有）
4. **確認 `saveCollection('formRequests')`** — 修改操作後確認儲存呼叫正確
5. 最後說明：哪些地方已更新、測試時應確認哪些 UI 流程（新增申請 → 填欄位 → 送出 → 通知 → 審核）
