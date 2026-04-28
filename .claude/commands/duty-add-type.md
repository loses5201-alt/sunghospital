# /duty-add-type — 新增排班班別

你正在協助開發宋俊宏婦幼醫院管理系統（純前端 SPA）。

使用者想新增值班表的班別類型。目前 `modules/duty.js` 的 SHINFO：
```
morning（早班 07:00–15:00）、afternoon（午班 15:00–23:00）、
night（夜班 23:00–07:00）、oncall（ON CALL 備勤）、
training（教育訓練）、off（休假）
```

每個班別格式：`{ l:'標籤', c:'CSS class', time:'時間說明', color:'#hex' }`

**請依序完成：**

1. 讀取 `modules/duty.js`，搜尋所有使用 SHINFO 的地方（月曆顯示、週排班格、批次排班下拉、統計分頁、CSV 匯出）
2. **詢問使用者**：新班別的 key（英文）、中文標籤、時間說明、代表顏色
3. **修改 duty.js**：
   - 在 SHINFO 加入新班別
   - 確認月曆（renderDutyMonth）、週排班（renderDutyWeek）、排班統計（renderDutyStats）都能正確顯示
   - 如果有班別下拉選單是硬編碼的 option，一起加入
4. 確認儲存呼叫使用 `saveCollection('dutySchedule')`
5. 說明：新班別在哪些 UI 元件會出現，以及統計分頁應如何計算這個新班別的人時數
