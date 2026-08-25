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
 *
 * CẤU TRÚC CỘT (tab "KetQua"):
 *   A Thời gian nộp
 *   B Tên học viên
 *   C Bài
 *   D Nghe - đáp án đã chọn        (vd: 1A,2B,3C,4D,5A,6B,7B,8A,9C,10C)
 *   E Nghe - Điểm                  (số câu đúng, để trống nếu chưa có đáp án gốc)
 *   F Đọc - đáp án đã chọn
 *   G Đọc - Điểm
 *   H Viết - đáp án đã chọn        (gộp cả P1 điền hán tự + P2 đặt câu, vd:
 *                                   25急,26照号,27这,28他开心得跳起,29看,30用词造句 —
 *                                   câu nào chưa làm chỉ hiện số câu, không có nội dung)
 *   I Viết - Điểm                  (chỉ tính phần P1 điền hán tự, tự chấm được)
 *   J Viết - Giáo viên chấm        (CỘT NÀY GIÁO VIÊN TỰ NHẬP TAY cho phần P2 đặt câu —
 *                                   script KHÔNG BAO GIỜ ghi đè cột này khi học viên nộp
 *                                   lại bài, chỉ để trống lúc tạo dòng mới)
 *   K Tổng điểm                    (công thức =E+G+I+J, tự cộng lại mỗi khi J được sửa)
 */

const SHEET_NAME = "KetQua";
const HEADERS = [
  "Thời gian nộp", "Tên học viên", "Bài",
  "Nghe - đáp án đã chọn", "Nghe - Điểm",
  "Đọc - đáp án đã chọn", "Đọc - Điểm",
  "Viết - đáp án đã chọn", "Viết - Điểm",
  "Viết - Giáo viên chấm", "Tổng điểm"
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

// {11:'D', 12:'C', ...} -> "11D,12C,..." — câu chưa có nội dung chỉ hiện số câu.
function formatAnswers_(answersObj) {
  const keys = Object.keys(answersObj || {}).map(Number).sort(function (a, b) { return a - b; });
  return keys.map(function (n) {
    const v = (answersObj[n] === undefined || answersObj[n] === null) ? "" : String(answersObj[n]).trim();
    return v ? (n + v) : String(n);
  }).join(",");
}

// Gộp đáp án Viết Phần I (điền hán tự, có chấm đúng/sai) + Phần II (đặt câu, chỉ có
// text tự viết) thành 1 danh sách chung theo đúng thứ tự số câu.
function buildWritingAnswers_(data) {
  const combined = {};
  const hanzi = (data.writing && data.writing.hanzi && data.writing.hanzi.answers) || {};
  Object.keys(hanzi).forEach(function (k) { combined[k] = hanzi[k]; });
  const sentences = (data.writing && data.writing.sentences) || [];
  sentences.forEach(function (s) { combined[s.q] = s.text; });
  return formatAnswers_(combined);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet_();

    const hocvien = (data.hocvien || "").toString().trim();
    const lessonName = (data.lessonName || data.lessonId || "").toString();
    const timestamp = data.timestamp || new Date().toISOString();

    const listeningAns = formatAnswers_(data.listening && data.listening.answers);
    const listeningScore = (data.listening && data.listening.graded) ? data.listening.correct : "";
    const readingAns = formatAnswers_(data.reading && data.reading.answers);
    const readingScore = (data.reading && data.reading.graded) ? data.reading.correct : "";
    const writingAns = buildWritingAnswers_(data);
    const writingScore = (data.writing && data.writing.hanzi && data.writing.hanzi.graded) ? data.writing.hanzi.correct : "";

    // Cột A-I — ghi đủ mỗi lần nộp bài.
    const rowAtoI = [timestamp, hocvien, lessonName, listeningAns, listeningScore, readingAns, readingScore, writingAns, writingScore];

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
      // Ghi đè cột A-I. CỘT J (Viết - Giáo viên chấm) GIỮ NGUYÊN — không đụng vào,
      // để điểm giáo viên đã chấm tay không bị mất khi học viên nộp lại bài.
      sheet.getRange(foundRow, 1, 1, 9).setValues([rowAtoI]);
      sheet.getRange(foundRow, 11).setFormula("=E" + foundRow + "+G" + foundRow + "+I" + foundRow + "+J" + foundRow);
    } else {
      const newRow = sheet.getLastRow() + 1;
      sheet.getRange(newRow, 1, 1, 9).setValues([rowAtoI]);
      sheet.getRange(newRow, 10).setValue(""); // J để trống — chờ giáo viên tự chấm
      sheet.getRange(newRow, 11).setFormula("=E" + newRow + "+G" + newRow + "+I" + newRow + "+J" + newRow);
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
