Write-Host "========================================================" -ForegroundColor Green
Write-Host "   SPORTGO - CHIA SE PROJECT QUA NGROK (PUBLIC URL)     " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Đang khởi động tunnel Ngrok cho Frontend (Port 5173)..." -ForegroundColor Cyan
Write-Host "[INFO] Lưu ý: Đảm bảo bạn đã bật Frontend (npm run dev) và Backend (uvicorn) trước!" -ForegroundColor Yellow
Write-Host ""
ngrok http 5173
