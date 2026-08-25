# Danh sách học viên

File `danhsachhocvien.txt` là danh sách tên hiện trong ô **"Tên học viên"** (dropdown)
ở trang chủ (`index.html`) — mỗi tên **1 dòng**, không đánh số, không dấu gạch đầu dòng.

```
Nguyễn Văn A
Trần Thị B
Lê Văn C
```

Muốn thêm/xóa/sửa tên: sửa trực tiếp file này (thêm dòng mới = thêm học viên), rồi
commit + push lên GitHub như bình thường. Trang web tự đọc lại file này mỗi lần tải
trang — không cần sửa code ở đâu khác.

⚠️ Dòng trống sẽ bị bỏ qua tự động, nhưng để dễ quản lý thì không nên để dòng trống ở giữa.

Tên trong danh sách này **chỉ dùng để hiện trong dropdown** — không liên quan gì đến
việc lưu kết quả vào Google Sheet (nếu anh dùng Phương án 2 ở `HUONG-DAN-GOOGLE-SHEET.md`),
hai thứ độc lập với nhau.

## Kết quả làm bài được lưu ở đâu?

Khi học viên chọn tên rồi bấm **"Nộp và in kết quả"** ở trang chủ, kết quả được lưu
theo **2 cách cùng lúc**:

1. **Lưu trong trình duyệt (localStorage)** của máy đang làm bài, theo cặp
   (tên học viên + bài học) — làm lại và nộp lại cùng bài sẽ **tự động ghi đè** lên
   kết quả cũ. Xem lại các kết quả đã lưu trên máy này tại trang `ketqua.html`
   (menu "📋 Kết quả đã lưu" ở cuối sidebar). Vì lưu trong trình duyệt nên **chỉ máy/trình
   duyệt đó thấy được** — không tự động đồng bộ giữa các máy.
2. **Google Sheet** (nếu anh đã làm theo hướng dẫn deploy trong
   `HUONG-DAN-GOOGLE-SHEET.md` và dán link Web App vào `index.html`) — mọi lượt nộp
   bài từ bất kỳ máy nào đều chảy về cùng 1 Google Sheet, ghi đè theo cặp
   (tên học viên + bài học), anh mở Sheet là thấy hết.

Nút "Nộp và in kết quả" cũng luôn mở một cửa sổ in kết quả (có thể "Lưu thành PDF"
thay vì in ra giấy nếu muốn) — dùng để có 1 bản ghi độc lập, không phụ thuộc
localStorage hay Google Sheet.
