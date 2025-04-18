# Đặc tả Chrome Extension Tóm tắt Nội dung Web và YouTube

## 1. Tổng quan

Extension Chrome cung cấp tính năng tóm tắt nhanh cho nội dung trang web và video YouTube thông qua Side Panel, sử dụng Gemini API để xử lý nội dung và sinh tóm tắt. Người dùng cần cung cấp API key của riêng mình để sử dụng dịch vụ.

## 2. Tech Stack

- **Frontend Framework**: Svelte
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Language**: JavaScript (không sử dụng TypeScript)
- **API**: Gemini API
- **Extension API**: Chrome Extension API

## 3. Các chức năng chính

- Hiển thị giao diện trong Side Panel của Chrome
- Tóm tắt nội dung của trang web đang mở
- Tóm tắt video YouTube dựa trên transcript
- Cấu hình API key và tùy chọn tóm tắt qua component Settings

## 4. Chi tiết kỹ thuật

### 4.1. Cấu trúc dự án (Vite + Svelte)

```
project-root/
├── public/            # Static assets
├── src/
│   ├── components/    # Svelte components
│   │   ├── SummarizeWeb.svelte
│   │   ├── SummarizeYouTube.svelte
│   │   ├── Settings.svelte      # Settings component (không phải trang riêng)
│   │   ├── Result.svelte        # Hiển thị kết quả tóm tắt
│   │   └── LoadingIndicator.svelte
│   ├── lib/           # Utility functions and services
│   │   ├── api.js     # Gemini API integration
│   │   ├── extractor.js # Content extraction logic
│   │   └── storage.js # Chrome storage handling
│   ├── stores/        # Svelte stores for state management
│   │   ├── settings.js
│   │   └── content.js
│   ├── App.svelte     # Main app component (duy nhất)
│   ├── main.js        # Entry point
│   ├── background.js  # Background script
│   └── content.js     # Content script
├── index.html         # Entry HTML
├── vite.config.js     # Vite configuration
├── manifest.json  # Extension manifest
├── tailwind.config.js # Tailwind configuration
└── package.json       # Project dependencies
```

### 4.2. UI/UX (Svelte + Tailwind CSS)

- **Side Panel (App.svelte)**: Mở khi nhấp vào icon extension
  - Nút tóm tắt nội dung trang web với Tailwind styling
  - Nút tóm tắt video YouTube với Tailwind styling
  - Nút chuyển đổi hiển thị component Settings
  - Khu vực hiển thị kết quả tóm tắt với loading states
- **Component Settings**:
  - Được hiển thị/ẩn trong cùng Side Panel (không phải trang riêng)
  - Svelte form với Tailwind styling
  - Trường nhập API key Gemini
  - Tùy chọn độ dài tóm tắt
  - Tùy chọn ngôn ngữ kết quả
  - Tùy chọn định dạng kết quả

### 4.3. Quản lý trạng thái

- Sử dụng Svelte stores để lưu trữ và quản lý:
  - Trạng thái hiển thị (đang tóm tắt/hiển thị settings/hiển thị kết quả)
  - Cài đặt người dùng (API key, tùy chọn tóm tắt)
  - Nội dung trang web và kết quả tóm tắt

### 4.4. Quy trình hoạt động

1. Người dùng nhấp vào icon extension để mở Side Panel
2. Khi người dùng nhấp vào nút "Tóm tắt nội dung":
   - Extension trích xuất nội dung chính từ trang web hiện tại
   - Gửi nội dung đến Gemini API kèm yêu cầu tóm tắt
   - Hiển thị kết quả tóm tắt trong Side Panel
3. Khi người dùng nhấp vào nút "Tóm tắt YouTube":
   - Extension kiểm tra xem có phải trang YouTube không
   - Trích xuất transcript từ video
   - Gửi transcript đến Gemini API kèm yêu cầu tóm tắt
   - Hiển thị kết quả tóm tắt trong Side Panel
4. Khi người dùng nhấp vào nút "Settings":
   - Hiển thị component Settings thay vì kết quả tóm tắt
   - Lưu cài đặt vào chrome.storage khi người dùng lưu thay đổi

### 4.5. Xử lý dữ liệu

- **Trích xuất nội dung web**: Phân tích DOM để tách nội dung chính
- **Trích xuất transcript YouTube**: Tương tác với DOM hoặc YouTube API
- **Tối ưu hóa API**: Xử lý giới hạn độ dài đầu vào, phân đoạn nội dung dài

### 4.6. Bảo mật

- Lưu trữ API key trong Chrome Storage (chrome.storage.sync)
- Không hiển thị API key đầy đủ trong giao diện sau khi lưu
- Kiểm tra tính hợp lệ của API key trước khi gọi API

## 5. Các task cần triển khai

### 5.1. Cấu hình dự án

- Khởi tạo dự án Vite với template Svelte (JavaScript)
- Cài đặt và cấu hình Tailwind CSS
- Cấu hình manifest.json với các permission cần thiết

### 5.2. Phát triển UI với Svelte & Tailwind

- Thiết kế và xây dựng App.svelte chính
- Thiết kế các components con (SummarizeWeb, SummarizeYouTube, Settings, Result)
- Tạo Svelte stores để quản lý trạng thái của ứng dụng
- Áp dụng Tailwind để styling responsive và hiệu quả

### 5.3. Phát triển chức năng

- Tạo các utility functions cho trích xuất nội dung
- Xây dựng service cho tương tác với Gemini API
- Tạo wrapper cho Chrome Storage API
- Xử lý message passing giữa background script và UI

### 5.4. Testing và triển khai

- Kiểm thử trên nhiều loại trang web khác nhau
- Kiểm thử với các video YouTube có transcript
- Build extension với Vite
- Đóng gói và chuẩn bị cho việc phát hành

## 76. Các API và Libraries cần sử dụng

- Svelte cho UI components và reactivity
- Vite cho development và build workflow
- Tailwind CSS cho styling
- Chrome Extension APIs (chrome.sidePanel, chrome.storage, chrome.tabs, chrome.scripting)
- Gemini API cho xử lý tóm tắt
- Fetch API cho HTTP requests

## 7. Lưu ý triển khai với JS, Svelte, Vite

- Sử dụng JavaScript ES modules syntax thay vì TypeScript
- Tận dụng tính năng HMR của Vite cho quá trình phát triển nhanh
- Sử dụng Svelte conditional rendering để chuyển đổi giữa các views trong cùng một trang
- Áp dụng Svelte stores và reactive statements để quản lý trạng thái
- Sử dụng chrome.scripting API để chèn content scripts động khi cần
- Xử lý tốt các transitions giữa các component để tạo trải nghiệm người dùng mượt mà
