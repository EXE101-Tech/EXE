# Sử dụng Python image chính thức (bản slim nhẹ)
FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy file requirements.txt trước để tối ưu hóa cache lớp của Docker
COPY requirements.txt .

# Cài đặt các thư viện phụ thuộc của Python
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn trong thư mục server/ vào container
COPY . .

# Cloud Run yêu cầu ứng dụng lắng nghe ở cổng này (mặc định là 8080)
EXPOSE 8080

# Lệnh khởi động Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
