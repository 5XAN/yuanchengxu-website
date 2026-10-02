# 源程序 Core Program Studio 官網

純靜態網站（HTML / CSS / JS），沒有建置步驟。

- `index.html`：頁面內容
- `style.css`：樣式與動畫
- `main.js`：互動（首頁操作演示、流程曲線、捲動特效）
- `assets/`：Logo

本機預覽：在此資料夾執行 `python -m http.server 5600`，開 http://localhost:5600

目前為臨時網址階段，頁面帶有 `noindex`；換正式網域時刪除 `index.html` 內的該行。

## 2026-10-02 更新
- 首屏改成深色品牌首屏（標誌置中、頂端 SOURCE CODE </> STUDIO），圖檔 `assets/brand-dark.jpg`、`assets/logo-mark-dark.jpg` 取自設計稿。
- 新增 `demo.html`（含 `demo.css`、`demo.js`）：給業務展示用的「線上體驗」。民眾端（美學風格的手機畫面）與店家後台共用同一份**假資料**，
  在左邊預約、領點、兌換優惠券、領號碼牌，右邊後台即時變化。純前端、不連伺服器、不存任何資料，重新整理就回到初始狀態。
