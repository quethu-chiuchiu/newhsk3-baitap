# Hướng dẫn nối trang web với Google Sheet (Phương án 2)

Việc này chỉ cần làm **1 lần**. Sau khi làm xong, mọi lượt "Nộp và in kết quả" từ
bất kỳ học viên nào, trên bất kỳ máy nào, đều tự động chảy về cùng 1 Google Sheet.

Nếu anh chưa muốn làm bước này ngay, không sao — trang web vẫn hoạt động bình
thường, kết quả vẫn được lưu trong trình duyệt (xem `README.md`) và vẫn in được,
chỉ là chưa có bản tổng hợp tập trung trên Google Sheet thôi.

## Các bước

1. Vào [sheets.google.com](https://sheets.google.com), tạo 1 Sheet mới. Đặt tên
   tuỳ ý, ví dụ **"HSK3 - Kết quả"**.
2. Menu **Tiện ích mở rộng (Extensions) → Apps Script**.
3. Xoá hết nội dung mẫu trong ô code, mở file `apps-script-luuketqua.gs` (cùng
   thư mục với file hướng dẫn này), copy toàn bộ, dán vào.
4. Bấm biểu tượng **💾 Lưu**.
5. Bấm **Triển khai (Deploy) → Triển khai mới (New deployment)**.
   - Ở mục "Select type", bấm biểu tượng bánh răng, chọn **Web app**.
   - **Execute as**: Me (tài khoản Google của anh).
   - **Who has access**: **Anyone** (bắt buộc — nếu để "Only myself" thì trang
     web sẽ không gọi được, học viên sẽ không đăng nhập Google).
   - Bấm **Deploy**.
   - Lần đầu Google sẽ hỏi cấp quyền — bấm **Authorize access**, chọn tài khoản
     Google của anh, bấm **Advanced/Nâng cao → Go to (tên project) (unsafe)** rồi
     **Allow/Cho phép**. Bước này bình thường, vì đây là script do chính anh viết
     (dán vào) chứ không phải app lạ.
6. Sau khi deploy xong, Google hiện ra 1 link dạng:
   ```
   https://script.google.com/macros/s/AKfycb.......AbCdEf/exec
   ```
   Copy link này.
7. Mở file `index.html` (ở thư mục gốc repo), tìm dòng:
   ```js
   const SHEET_WEBAPP_URL = "";
   ```
   Dán link vào giữa 2 dấu ngoặc kép:
   ```js
   const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycb.......AbCdEf/exec";
   ```
   Lưu file, commit + push lên GitHub.

Xong — từ giờ mỗi lần bấm "Nộp và in kết quả", dữ liệu sẽ được gửi thêm vào Sheet
"HSK3 - Kết quả", tab **KetQua**. Nộp lại cùng 1 học viên + cùng 1 bài sẽ **ghi đè**
lên dòng cũ (không tạo dòng mới).

## Lưu ý

- Nếu sau này anh sửa lại nội dung file `.gs` trong Apps Script, phải bấm lại
  **Deploy → Manage deployments → biểu tượng bút chì (Edit) → Version: New version
  → Deploy** thì thay đổi mới thật sự có hiệu lực. Chỉ bấm Lưu (💾) thôi thì chưa đủ.
- Trình duyệt gửi dữ liệu lên theo kiểu "gửi và không đợi phản hồi" (để tránh lỗi
  CORS khá phổ biến với Apps Script), nên trang web sẽ **không báo lỗi/thành công**
  riêng cho bước Google Sheet — nếu nghi ngờ chưa hoạt động, anh cứ mở thẳng Sheet
  lên kiểm tra sau khi có ai đó nộp bài thử.
- Vì "Who has access" để **Anyone**, về lý thuyết ai có đúng link Web App (rất dài,
  khó đoán, không hiển thị công khai ở đâu) cũng gọi được — với quy mô lớp học nội
  bộ thì rủi ro này không đáng lo, nhưng đừng đăng link đó công khai.
