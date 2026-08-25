/* ============================================================
   HSK3 Luyện Tập — shared JS helpers
   Dùng trong các file lessons/*.html
   - HSK.initTabs()   : hiện đúng section (Nghe/Đọc/Viết) theo #hash
   - HSK.Quiz(...)     : engine dựng câu hỏi trắc nghiệm + tự chấm điểm
   ============================================================ */
window.HSK = (function(){

  function el(html){
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  /* ---------- Ảnh linh hoạt định dạng file: nếu đuôi mặc định (đuôi đầu
     tiên trong src của thẻ <img>) không load được, tự thử lần lượt các
     đuôi file khác trước khi ẩn hẳn ảnh (data-base giữ đường dẫn KHÔNG có
     đuôi, ví dụ "images/bai1/A"). Đặt .webp lên đầu vì đó là đuôi thật
     đang dùng (ảnh nhẹ) — tránh tốn request thừa làm ảnh hiện chậm. Mỗi
     trang HTML nên để đúng đuôi thật ở thẻ <img> gốc, đuôi còn lại trong
     danh sách chỉ là lưới an toàn khi đổi định dạng sau này. ---------- */
  const IMG_EXTS = ['webp','png','jpg','jpeg','WEBP','PNG','JPG','JPEG'];
  function imgFallback(img){
    const base = img.dataset.base;
    if(!base){ img.style.display = 'none'; return; }
    const idx = parseInt(img.dataset.extIdx || '0', 10) + 1;
    if(idx >= IMG_EXTS.length){ img.style.display = 'none'; return; }
    img.dataset.extIdx = idx;
    img.src = base + '.' + IMG_EXTS[idx];
  }

  /* ---------- Tab switching (Nghe / Đọc / Viết) driven by location.hash ---------- */
  function initTabs(defaultTab){
    const sections = Array.from(document.querySelectorAll('.tab-section'));
    function show(){
      const tab = (location.hash || '#' + defaultTab).replace('#','');
      let found = false;
      sections.forEach(sec=>{
        const match = sec.dataset.tab === tab;
        sec.classList.toggle('active', match);
        if(match) found = true;
      });
      if(!found && sections.length){
        sections.forEach((sec,i)=>sec.classList.toggle('active', i===0));
      }
    }
    window.addEventListener('hashchange', show);
    show();
  }

  /* ---------- Quiz engine ---------- */
  function Quiz(opts){
    this.scoreTxtId  = opts.scoreTxtId;
    this.gradeBtnId  = opts.gradeBtnId;
    this.resetBtnId  = opts.resetBtnId;
    this.answers = {};
    this.questions = []; // {n, ans}
    this.graded = false;
  }

  Quiz.prototype.makeOptBtn = function(qn, letter, label){
    const self = this;
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.type = 'button';
    btn.dataset.q = qn;
    btn.dataset.letter = letter;
    btn.textContent = label ? (letter + ' ' + label) : letter;
    btn.addEventListener('click', function(){
      if(self.graded) return;
      self.answers[qn] = letter;
      document.querySelectorAll('.opt-btn[data-q="'+qn+'"]').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      self.updateLabel();
    });
    return btn;
  };

  Quiz.prototype.registerQuestion = function(n, ans, type){
    this.questions.push({n:n, ans:ans, type: type || 'choice'});
  };

  Quiz.prototype.updateLabel = function(){
    if(this.graded || !this.scoreTxtId) return;
    const answered = this.questions.filter(q=>{
      if(q.type === 'text'){
        const input = document.querySelector('.text-input[data-q="'+q.n+'"]');
        return input && input.value.trim().length > 0;
      }
      return !!this.answers[q.n];
    }).length;
    const elx = document.getElementById(this.scoreTxtId);
    if(elx) elx.textContent = 'Đã làm ' + answered + ' / ' + this.questions.length + ' câu';
  };

  /* Render a "write the character for this pinyin" fill-in row (single correct answer). */
  Quiz.prototype.mountHanzi = function(containerEl, n, questionHtml, pinyin, answerChar){
    const self = this;
    this.registerQuestion(n, answerChar, 'text');
    const row = el('<div class="q-row" style="flex-direction:column;align-items:stretch;">'+
      '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;">'+
        '<div class="q-num">'+n+'.</div>'+
        '<div class="q-text">'+questionHtml+'</div>'+
        '<span class="pinyin-tag">'+pinyin+'</span>'+
        '<input type="text" class="text-input" data-q="'+n+'" maxlength="4" placeholder="汉字">'+
      '</div></div>');
    const input = row.querySelector('.text-input');
    input.addEventListener('input', ()=>{ if(!self.graded) self.updateLabel(); });
    const exp = document.createElement('div');
    exp.className = 'explain';
    exp.id = 'exp-' + n;
    exp.innerHTML = 'Đáp án: <b>'+answerChar+'</b>';
    row.appendChild(exp);
    containerEl.appendChild(row);
  };

  /* Render a "match the sentence" style question row.
     optionsDict: {A:'...', B:'...', ...}  answerLetter: correct key */
  Quiz.prototype.mountMatch = function(containerEl, n, questionText, optionsDict, answerLetter){
    this.registerQuestion(n, answerLetter);
    const row = el('<div class="q-row" style="flex-direction:column;align-items:stretch;">'+
      '<div style="display:flex;gap:10px;"><div class="q-num">'+n+'.</div><div class="q-text">'+questionText+'</div></div>'+
      '</div>');
    const grp = document.createElement('div');
    grp.className = 'opt-group';
    grp.style.marginLeft = '36px';
    Object.keys(optionsDict).forEach(letter=>grp.appendChild(this.makeOptBtn(n, letter)));
    row.appendChild(grp);
    const exp = document.createElement('div');
    exp.className = 'explain';
    exp.id = 'exp-' + n;
    exp.innerHTML = 'Đáp án: <b>'+answerLetter+'</b> — “'+optionsDict[answerLetter]+'”';
    row.appendChild(exp);
    containerEl.appendChild(row);
  };

  /* Render a "fill in the blank / word bank" style question row.
     optionsDict: {A:'像', B:'以为', ...} */
  Quiz.prototype.mountFillBlank = function(containerEl, n, questionText, optionsDict, answerLetter){
    this.registerQuestion(n, answerLetter);
    const row = el('<div class="q-row" style="flex-direction:column;align-items:stretch;">'+
      '<div style="display:flex;gap:10px;"><div class="q-num">'+n+'.</div><div class="q-text">'+questionText+'</div></div>'+
      '</div>');
    const grp = document.createElement('div');
    grp.className = 'opt-group';
    grp.style.marginLeft = '36px';
    Object.keys(optionsDict).forEach(letter=>grp.appendChild(this.makeOptBtn(n, letter, optionsDict[letter])));
    row.appendChild(grp);
    const exp = document.createElement('div');
    exp.className = 'explain';
    exp.id = 'exp-' + n;
    exp.innerHTML = 'Đáp án: <b>'+answerLetter+' '+optionsDict[answerLetter]+'</b>';
    row.appendChild(exp);
    containerEl.appendChild(row);
  };

  /* Render a passage + multiple choice block.
     passageHtml can be null to omit (e.g. shares passage with previous block) */
  Quiz.prototype.mountMCQBlock = function(containerEl, n, passageHtml, starText, optionsDict, answerLetter){
    this.registerQuestion(n, answerLetter);
    const block = document.createElement('div');
    block.className = 'q-row';
    block.style.flexDirection = 'column';
    block.style.alignItems = 'stretch';
    if(passageHtml){
      const p = document.createElement('div');
      p.className = 'passage';
      p.innerHTML = passageHtml;
      block.appendChild(p);
    }
    const star = document.createElement('div');
    star.className = 'star-q';
    star.innerHTML = '<span class="star-q-num">'+n+'.</span>' + starText;
    block.appendChild(star);
    const grp = document.createElement('div');
    grp.className = 'opt-group';
    Object.keys(optionsDict).forEach(letter=>grp.appendChild(this.makeOptBtn(n, letter, optionsDict[letter])));
    block.appendChild(grp);
    const exp = document.createElement('div');
    exp.className = 'explain';
    exp.id = 'exp-' + n;
    exp.style.paddingLeft = '0';
    exp.innerHTML = 'Đáp án: <b>'+answerLetter+' '+optionsDict[answerLetter]+'</b>';
    block.appendChild(exp);
    containerEl.appendChild(block);
    return block; // caller can append more star-q/opt-group into it for shared-passage items
  };

  /* For questions that literally share one passage block already on the page
     (e.g. 23~24), use this to add just the star+options+explain into an existing wrapper. */
  Quiz.prototype.appendMCQToBlock = function(blockEl, n, starText, optionsDict, answerLetter){
    this.registerQuestion(n, answerLetter);
    const star = document.createElement('div');
    star.className = 'star-q';
    star.innerHTML = '<span class="star-q-num">'+n+'.</span>' + starText;
    blockEl.appendChild(star);
    const grp = document.createElement('div');
    grp.className = 'opt-group';
    Object.keys(optionsDict).forEach(letter=>grp.appendChild(this.makeOptBtn(n, letter, optionsDict[letter])));
    blockEl.appendChild(grp);
    const exp = document.createElement('div');
    exp.className = 'explain';
    exp.id = 'exp-' + n;
    exp.style.paddingLeft = '0';
    exp.innerHTML = 'Đáp án: <b>'+answerLetter+' '+optionsDict[answerLetter]+'</b>';
    blockEl.appendChild(exp);
  };

  Quiz.prototype.grade = function(){
    this.graded = true;
    let correct = 0;
    const self = this;
    this.questions.forEach(function(q){
      if(q.type === 'text'){
        const input = document.querySelector('.text-input[data-q="'+q.n+'"]');
        const val = input ? input.value.trim() : '';
        if(input){
          input.disabled = true;
          input.classList.remove('correct','wrong');
          input.classList.add(val === q.ans ? 'correct' : 'wrong');
        }
        if(val === q.ans) correct++;
      } else {
        const chosen = self.answers[q.n];
        document.querySelectorAll('.opt-btn[data-q="'+q.n+'"]').forEach(function(btn){
          btn.classList.add('locked');
          const letter = btn.dataset.letter;
          if(letter === q.ans){
            btn.classList.add('correct');
          } else if(letter === chosen && chosen !== q.ans){
            btn.classList.add('wrong');
          }
        });
        if(chosen === q.ans) correct++;
      }
      const exp = document.getElementById('exp-'+q.n);
      if(exp) exp.classList.add('show');
    });
    if(this.scoreTxtId){
      const elx = document.getElementById(this.scoreTxtId);
      if(elx) elx.textContent = 'Kết quả: ' + correct + ' / ' + this.questions.length + ' câu đúng 🎉';
    }
    return correct;
  };

  Quiz.prototype.reset = function(){
    this.graded = false;
    this.answers = {};
    document.querySelectorAll('.opt-btn').forEach(function(btn){
      if(!btn.classList.contains('disabled')){
        btn.classList.remove('selected','correct','wrong','locked');
      }
    });
    document.querySelectorAll('.text-input').forEach(function(input){
      input.disabled = false;
      input.value = '';
      input.classList.remove('correct','wrong');
    });
    document.querySelectorAll('.explain').forEach(e=>e.classList.remove('show'));
    if(this.scoreTxtId){
      const elx = document.getElementById(this.scoreTxtId);
      if(elx) elx.textContent = '0 / ' + this.questions.length + ' câu';
    }
  };

  /* Snapshot of current state for saving/printing results — does NOT force
     grading. If already graded (this.graded), also includes per-question
     correct/wrong + total correct count. */
  Quiz.prototype.getSummary = function(){
    const self = this;
    const answers = {};
    this.questions.forEach(function(q){
      if(q.type === 'text'){
        const input = document.querySelector('.text-input[data-q="'+q.n+'"]');
        answers[q.n] = input ? input.value.trim() : '';
      } else {
        answers[q.n] = self.answers[q.n] || '';
      }
    });
    let correct = null;
    if(this.graded){
      correct = 0;
      this.questions.forEach(function(q){
        if(answers[q.n] === q.ans) correct++;
      });
    }
    return { total: this.questions.length, graded: this.graded, correct: correct, answers: answers };
  };

  Quiz.prototype.bindButtons = function(){
    const self = this;
    if(this.gradeBtnId){
      const g = document.getElementById(this.gradeBtnId);
      if(g) g.addEventListener('click', ()=>self.grade());
    }
    if(this.resetBtnId){
      const r = document.getElementById(this.resetBtnId);
      if(r) r.addEventListener('click', ()=>self.reset());
    }
    this.updateLabel();
  };

  /* Render an open-ended "look at the picture, write a sentence with this word" block.
     Not auto-graded (many valid answers) — gives a textarea + a reveal-on-demand sample
     answer. imgBase = đường dẫn ảnh KHÔNG có đuôi (vd "images/bai1/28") — ảnh thật thay
     cho mô tả chữ, dùng chung cơ chế tự thử đuôi file với HSK.imgFallback. */
  function mountSentenceWriting(containerEl, n, imgBase, word, sampleAnswer){
    const block = el('<div class="q-row" style="flex-direction:column;align-items:stretch;">'+
      '<div class="q-num">'+n+'.</div>'+
      '<div class="writing-row">'+
        '<img class="writing-pic" src="'+imgBase+'.webp" data-base="'+imgBase+'" alt="Câu '+n+'" onerror="HSK.imgFallback(this)">'+
        '<div class="writing-right">'+
          '<span class="word-tag">'+word+'</span>'+
          '<textarea class="writing-textarea" data-q="'+n+'" placeholder="Viết câu của bạn ở đây…"></textarea>'+
        '</div>'+
      '</div>'+
      '<div><button type="button" class="reveal-btn">Xem câu ví dụ</button></div>'+
      '<div class="sample-answer">Câu ví dụ tham khảo: <b>'+sampleAnswer+'</b></div>'+
      '</div>');
    const btn = block.querySelector('.reveal-btn');
    const sample = block.querySelector('.sample-answer');
    btn.addEventListener('click', ()=>{
      sample.classList.toggle('show');
      btn.textContent = sample.classList.contains('show') ? 'Ẩn câu ví dụ' : 'Xem câu ví dụ';
    });
    containerEl.appendChild(block);
  }

  /* ---------- Chọn đáp án tham khảo cho phần Nghe (chưa có đáp án gốc nên
     KHÔNG chấm điểm đúng/sai) — chỉ tô cam nút đang chọn trong cùng 1 câu,
     giống 1 nhóm radio, để học viên đánh dấu lựa chọn của mình khi luyện
     tập. Dùng event delegation nên gọi 1 lần trên container cha là đủ,
     không cần gọi lại khi thêm câu hỏi mới vào sau. ---------- */
  function bindSingleSelect(container){
    if(!container) return;
    container.addEventListener('click', function(e){
      const btn = e.target.closest('.opt-btn');
      if(!btn || !container.contains(btn)) return;
      const group = btn.closest('.opt-group');
      if(!group) return;
      group.querySelectorAll('.opt-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  }

  /* ---------- Gom toàn bộ đáp án hiện tại của trang bài học (cả 3 tab
     Nghe/Đọc/Viết, kể cả tab đang ẩn — display:none không xóa giá trị DOM)
     thành 1 object để lưu/in kết quả. Gọi từ trang index.html (frame cha)
     qua frame.contentWindow.HSK.collectResult(meta).
     meta: {lessonId, lessonName} — do trang index.html truyền vào.
     Cần window.HSK_PAGE = {reading: <Quiz>, writingHanzi: <Quiz>} được set
     sẵn ở cuối <script> của mỗi trang bai*.html. ---------- */
  function collectResult(meta){
    const result = {
      lessonId: meta && meta.lessonId,
      lessonName: meta && meta.lessonName,
      listening: [],
      reading: null,
      writing: { hanzi: null, sentences: [] }
    };

    document.querySelectorAll('.tab-section[data-tab="listening"] .opt-btn.selected').forEach(function(btn){
      if(btn.dataset.q) result.listening.push({ q: btn.dataset.q, answer: btn.dataset.letter || btn.textContent.trim().charAt(0) });
    });
    result.listening.sort(function(a,b){ return (+a.q) - (+b.q); });

    const page = window.HSK_PAGE || {};
    if(page.reading && typeof page.reading.getSummary === 'function'){
      result.reading = page.reading.getSummary();
    }
    if(page.writingHanzi && typeof page.writingHanzi.getSummary === 'function'){
      result.writing.hanzi = page.writingHanzi.getSummary();
    }
    document.querySelectorAll('.tab-section[data-tab="writing"] .writing-textarea').forEach(function(ta){
      result.writing.sentences.push({ q: ta.dataset.q, text: ta.value.trim() });
    });
    result.writing.sentences.sort(function(a,b){ return (+a.q) - (+b.q); });

    return result;
  }

  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* Dựng trang HTML kết quả (dùng để mở cửa sổ mới rồi in / lưu PDF) từ 1
     object kết quả (dạng trả về bởi collectResult, cộng thêm .hocvien và
     .timestamp do trang gọi tự gắn vào trước khi lưu/in). Dùng chung cho cả
     index.html (vừa làm xong bài) lẫn ketqua.html (xem lại kết quả đã lưu). */
  function buildPrintableHtml(data){
    const listeningRows = (data.listening && data.listening.length)
      ? data.listening.map(function(x){ return '<div class="pr-row">Câu '+escapeHtml(x.q)+': <b>'+escapeHtml(x.answer)+'</b></div>'; }).join('')
      : '<div class="pr-row">(chưa chọn câu nào)</div>';

    function renderSummary(sum){
      if(!sum) return '<div class="pr-row">(chưa có dữ liệu)</div>';
      const scoreLine = sum.graded
        ? '<div class="pr-row"><b>Điểm: '+sum.correct+' / '+sum.total+'</b></div>'
        : '<div class="pr-row">(chưa chấm điểm)</div>';
      const rows = Object.keys(sum.answers).map(function(q){
        return '<div class="pr-row">Câu '+escapeHtml(q)+': <b>'+escapeHtml(sum.answers[q] || '(chưa làm)')+'</b></div>';
      }).join('');
      return scoreLine + rows;
    }

    const sentenceRows = ((data.writing && data.writing.sentences) || []).map(function(s){
      return '<div class="pr-row">Câu '+escapeHtml(s.q)+': '+escapeHtml(s.text || '(chưa viết)')+'</div>';
    }).join('') || '<div class="pr-row">(chưa viết câu nào)</div>';

    const timeStr = data.timestamp ? new Date(data.timestamp).toLocaleString('vi-VN') : '';

    return '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Kết quả — '+escapeHtml(data.hocvien)+'</title>' +
      '<style>' +
      'body{font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:30px auto;color:#2a2118;}' +
      'h1{font-size:20px;margin-bottom:2px;}' +
      '.meta{color:#5c5148;font-size:13.5px;margin-bottom:20px;}' +
      'h2{font-size:16px;background:#fff6ef;padding:8px 12px;border-radius:8px;margin-top:26px;}' +
      '.pr-row{padding:4px;border-bottom:1px solid #f0ddd0;font-size:14px;}' +
      '.pr-row:last-child{border-bottom:none;}' +
      '@media print{ body{margin:10px;} }' +
      '</style></head><body>' +
      '<h1>Kết quả luyện tập HSK3</h1>' +
      '<div class="meta">Học viên: <b>'+escapeHtml(data.hocvien)+'</b> &nbsp;·&nbsp; Bài: <b>'+escapeHtml(data.lessonName)+'</b> &nbsp;·&nbsp; Thời gian: '+timeStr+'</div>' +
      '<h2>🎧 Nghe — đáp án đã chọn</h2>' + listeningRows +
      '<h2>📖 Đọc</h2>' + renderSummary(data.reading) +
      '<h2>✍️ Viết — Phần I (viết chữ Hán)</h2>' + renderSummary(data.writing && data.writing.hanzi) +
      '<h2>✍️ Viết — Phần II (đặt câu)</h2>' + sentenceRows +
      '</body></html>';
  }

  return { el, initTabs, Quiz, mountSentenceWriting, imgFallback, bindSingleSelect, collectResult, escapeHtml, buildPrintableHtml };
})();
