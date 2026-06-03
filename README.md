# Tasting Notes · 我的品酒筆記

> 從一杯氣泡開始的味覺旅程——個人的葡萄酒與啤酒品飲紀錄。

一個純前端（vanilla HTML / CSS / JS）的個人品飲日誌網站，走編輯風的精品質感。
所有評分都是自己真實的味覺感受，未經酒評影響；尚未品飲的酒款標記為「待品飲」。

## 結構

```
index.html        頁面進入點
css/style.css     樣式
js/
  data.js         品飲清單（資料來源，新增酒款只要往陣列塞一筆）
  app.js          主程式邏輯
  charts.js       圖表
  animations.js   動效
```

## 新增酒款

編輯 `js/data.js`，往 `drinks` 陣列加一筆即可，所有欄位會自動帶進 UI：

- `id`：必填且唯一
- `image`：留 `null` 用 SVG 酒瓶插畫，填 URL 用照片
- `rating`：1–5；尚未品飲填 `null`（顯示為「待品飲」）
- `style_axis`：風格光譜 0（國際風格）– 100（風土個性）
- `varietal` / `varietal_zh`：葡萄品種

## 本機預覽

直接用瀏覽器開啟 `index.html` 即可；或起一個簡單的本機伺服器：

```bash
python3 -m http.server 8000
# 開 http://localhost:8000
```
