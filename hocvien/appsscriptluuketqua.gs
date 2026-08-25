/**
 * HSK3 Luyện Tập — nhận kết quả làm bài từ trang web, ghi vào Google Sheet.
 *
 * CÁCH DÙNG (làm 1 lần):
 * 1. Tạo 1 Google Sheet mới (sheets.google.com) — đặt tên tuỳ ý, ví dụ "HSK3 - Kết quả".
 * 2. Menu Tiện ích mở rộng (Extensions) → Apps Script.
 * 3. Xoá hết code mẫu trong file Code.gs, dán toàn bộ nội dung file này vào.
 * 4. Bấm biểu tượng Lưu (💾).
 * 5. Bấm nút Triển khai (Deploy) → Triển khai mới (New deployment).
 *    - Loại (Type): chọn "Ứng dụng web" (Web app).
 *    - Execute as: Me (tài khoản của anh).
 *    - Who has access: Anyone (bắt buộc, để trang web gọi được mà không cần đăng nhập).
 *    - Bấm Deploy → lần đầu Google sẽ hỏi cấp quyền (Authorize access), làm theo hướng dẫn.
 * 6. Sau khi deploy xong, Google đưa ra 1 link dạng:
 *      https://script.google.com/macros/s/AKfycb.../exec
 *    Copy link này.
 * 7. Mở file index.html của trang web, tìm dòng:
 *      const SHEET_WEBAPP_URL = "";
 *    Dán link vào giữa 2 dấu ngoặc kép, rồi commit + push lên GitHub.
 *
 * Từ lúc đó, mỗi lần học viên bấm "Nộp và in kết quả", 1 dòng sẽ tự thêm/cập nhật
 * trong Sheet (tab "KetQua"), ghi đè theo cặp (Tên học viên + Bài).
 *
 * LƯU Ý: nếu sau này sửa lại code này trong Apps Script, phải bấm Deploy →
 * Manage deployments → biểu tượng bút chì → Version: New version → Deploy lại,
 * thì thay đổi mới có hiệu lực (không tự áp dụng chỉ bằng cách Lưu).
 */

const SHEET_NAME = "KetQua";
const HEADERS = [
  "Thời gian nộp", "Tên học viên", "Bài",
  "Nghe - đáp án đã chọn (JSON)",
  "Đọc - đã chấm?", "Đọc - điểm", "Đọc - đáp án (JSON)",
  "Viết P1 - đã chấm?", "Viết P1 - điểm", "Viết P1 - đáp án (JSON)",
  "Viết P2 - câu văn (JSON)"
];

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet_();

    const hocvien = (data.hocvien || "").toString().trim();
    const lessonId = (data.lessonId || "").toString().trim();
    const lessonName = (data.lessonName || lessonId || "").toString();
    const timestamp = data.timestamp || new Date().toISOString();

    const row = [
      timestamp,
      hocvien,
      lessonName,
      JSON.stringify(data.listening || []),
      data.reading ? (data.reading.graded ? "Có" : "Chưa") : "",
      data.reading && data.reading.graded ? (data.reading.correct + "/" + data.reading.total) : "",
      data.reading ? JSON.stringify(data.reading.answers || {}) : "",
      data.writing && data.writing.hanzi ? (data.writing.hanzi.graded ? "Có" : "Chưa") : "",
      data.writing && data.writing.hanzi && data.writing.hanzi.graded ? (data.writing.hanzi.correct + "/" + data.writing.hanzi.total) : "",
      data.writing && data.writing.hanzi ? JSON.stringify(data.writing.hanzi.answers || {}) : "",
      data.writing ? JSON.stringify(data.writing.sentences || []) : ""
    ];

    // Tìm dòng đã có sẵn của đúng (Tên học viên + Bài) để GHI ĐÈ thay vì thêm dòng mới.
    const values = sheet.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === hocvien && values[i][2] === lessonName) {
        foundRow = i + 1; // 1-indexed, +1 vì header ở dòng 1
        break;
      }
    }

    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Mở link Web App trực tiếp trên trình duyệt (GET) để kiểm tra đã deploy đúng chưa.
function doGet(e) {
  return ContentService.createTextOutput("HSK3 kết quả — Apps Script đang chạy OK.");
}
