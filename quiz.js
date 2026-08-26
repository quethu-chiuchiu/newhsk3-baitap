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
    const answerKey = {};
    this.questions.forEach(function(q){
      answerKey[q.n] = q.ans;
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
    return { total: this.questions.length, graded: this.graded, correct: correct, answers: answers, answerKey: answerKey };
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
          '<textarea class="writing-textarea" data-q="'+n+'" data-sample="'+sampleAnswer+'" placeholder="Viết câu của bạn ở đây…"></textarea>'+
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

  /* ---------- Chọn đáp án cho phần Nghe — tô cam nút đang chọn trong cùng
     1 câu, giống 1 nhóm radio (dùng cho việc đánh dấu lựa chọn, kể cả khi
     không/chưa có đáp án gốc để chấm). Dùng event delegation nên gọi 1 lần
     trên container cha là đủ, không cần gọi lại khi thêm câu hỏi mới vào
     sau. ---------- */
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

  /* ---------- Đọc file đáp án dạng "1C\n2B\n3A\n..." (số câu dính liền
     1 chữ cái, mỗi câu 1 dòng) thành object {1:'C', 2:'B', ...}. Dòng nào
     không đúng định dạng bị bỏ qua thay vì gây lỗi. ---------- */
  function parseAnswerKey(text){
    const dict = {};
    String(text || '').split(/\r?\n/).forEach(function(line){
      const m = line.trim().match(/^(\d+)\s*([A-Za-z])$/);
      if(m) dict[m[1]] = m[2].toUpperCase();
    });
    return dict;
  }

  /* ---------- Gắn chấm điểm cho phần Nghe khi ĐÃ có file đáp án gốc
     (audio/baiN/dap_an_nghe_baiN.txt). Khác với HSK.Quiz (tự dựng DOM câu
     hỏi), hàm này CHẤM ĐIỂM TRÊN DOM CÓ SẴN — các nút .opt-btn của phần
     Nghe đã được trang bai*.html tự dựng sẵn với data-q/data-letter, hàm
     này chỉ cần gắn thêm hành vi chọn (bindSingleSelect) + chấm/làm lại.
     answersDict = null/undefined nghĩa là CHƯA có đáp án gốc — vẫn cho
     chọn đáp án bình thường (để đánh dấu), chỉ ẩn thanh chấm điểm.
     opts: {questionNums:[1..10], scoreBarId, scoreTxtId, gradeBtnId, resetBtnId} */
  function mountListeningQuiz(scopeSelector, answersDict, opts){
    const container = document.querySelector(scopeSelector);
    if(!container) return null;
    bindSingleSelect(container);

    const questionNums = opts.questionNums || [];
    const hasKey = !!(answersDict && Object.keys(answersDict).length);
    let graded = false;

    const scoreBar = opts.scoreBarId ? document.getElementById(opts.scoreBarId) : null;
    const scoreTxt = opts.scoreTxtId ? document.getElementById(opts.scoreTxtId) : null;
    const gradeBtn = opts.gradeBtnId ? document.getElementById(opts.gradeBtnId) : null;
    const resetBtn = opts.resetBtnId ? document.getElementById(opts.resetBtnId) : null;

    if(hasKey && scoreBar) scoreBar.style.display = '';

    function updateLabel(){
      if(graded || !scoreTxt) return;
      const answered = questionNums.filter(function(n){
        return container.querySelector('.opt-btn.selected[data-q="'+n+'"]');
      }).length;
      scoreTxt.textContent = 'Đã làm ' + answered + ' / ' + questionNums.length + ' câu';
    }
    container.addEventListener('click', function(e){
      if(e.target.closest('.opt-btn')) updateLabel();
    });

    function grade(){
      if(!hasKey) return null;
      graded = true;
      let correct = 0;
      questionNums.forEach(function(n){
        const ans = answersDict[n];
        const chosenBtn = container.querySelector('.opt-btn.selected[data-q="'+n+'"]');
        const chosen = chosenBtn ? chosenBtn.dataset.letter : null;
        container.querySelectorAll('.opt-btn[data-q="'+n+'"]').forEach(function(btn){
          btn.classList.add('locked');
          if(btn.dataset.letter === ans) btn.classList.add('correct');
          else if(btn === chosenBtn && chosen !== ans) btn.classList.add('wrong');
        });
        if(chosen === ans) correct++;
      });
      if(scoreTxt) scoreTxt.textContent = 'Kết quả: ' + correct + ' / ' + questionNums.length + ' câu đúng 🎉';
      return correct;
    }

    function reset(){
      graded = false;
      container.querySelectorAll('.opt-btn').forEach(function(b){
        b.classList.remove('selected','correct','wrong','locked');
      });
      updateLabel();
    }

    if(gradeBtn) gradeBtn.addEventListener('click', grade);
    if(resetBtn) resetBtn.addEventListener('click', reset);
    updateLabel();

    function getSummary(){
      const answers = {};
      questionNums.forEach(function(n){
        const chosenBtn = container.querySelector('.opt-btn.selected[data-q="'+n+'"]');
        answers[n] = chosenBtn ? chosenBtn.dataset.letter : '';
      });
      let correct = null;
      if(graded){
        correct = 0;
        questionNums.forEach(function(n){ if(hasKey && answers[n] === answersDict[n]) correct++; });
      }
      return { total: questionNums.length, graded: graded, correct: correct, answers: answers, answerKey: hasKey ? answersDict : {} };
    }

    return { grade: grade, reset: reset, getSummary: getSummary, hasKey: hasKey };
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
      listening: null,
      reading: null,
      writing: { hanzi: null, sentences: [] }
    };

    const page = window.HSK_PAGE || {};
    if(page.listening && typeof page.listening.getSummary === 'function'){
      result.listening = page.listening.getSummary();
    }
    if(page.reading && typeof page.reading.getSummary === 'function'){
      result.reading = page.reading.getSummary();
    }
    if(page.writingHanzi && typeof page.writingHanzi.getSummary === 'function'){
      result.writing.hanzi = page.writingHanzi.getSummary();
    }
    document.querySelectorAll('.tab-section[data-tab="writing"] .writing-textarea').forEach(function(ta){
      result.writing.sentences.push({ q: ta.dataset.q, text: ta.value.trim(), sample: ta.dataset.sample || '' });
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
  function renderResultSummary(sum){
    if(!sum) return '<div class="pr-row">(chưa có dữ liệu)</div>';
    const scoreLine = sum.graded
      ? '<div class="pr-row"><b>Điểm: '+sum.correct+' / '+sum.total+'</b></div>'
      : '<div class="pr-row">(chưa chấm điểm)</div>';
    const rows = Object.keys(sum.answers).map(function(q){
      const chosen = sum.answers[q] || '';
      const correctAns = sum.answerKey ? sum.answerKey[q] : null;
      let line = 'Câu '+escapeHtml(q)+': <b>'+escapeHtml(chosen || '(chưa làm)')+'</b>';
      if(correctAns){
        if(sum.graded){
          line += (chosen === correctAns)
            ? ' <span style="color:#2f9e56;">✓ đúng</span>'
            : ' <span style="color:#d13c2f;">✗ (đáp án đúng: '+escapeHtml(correctAns)+')</span>';
        } else {
          line += ' <span style="color:#5c5148;">(đáp án đúng: '+escapeHtml(correctAns)+')</span>';
        }
      }
      return '<div class="pr-row">'+line+'</div>';
    }).join('');
    return scoreLine + rows;
  }

  function buildPrintableHtml(data){
    const sentenceRows = ((data.writing && data.writing.sentences) || []).map(function(s){
      let line = 'Câu '+escapeHtml(s.q)+': '+escapeHtml(s.text || '(chưa viết)');
      if(s.sample) line += '<br><span style="color:#5c5148;">Câu ví dụ tham khảo: '+escapeHtml(s.sample)+'</span>';
      return '<div class="pr-row">'+line+'</div>';
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
      '<h2>🎧 Nghe</h2>' + renderResultSummary(data.listening) +
      '<h2>📖 Đọc</h2>' + renderResultSummary(data.reading) +
      '<h2>✍️ Viết — Phần I (viết chữ Hán)</h2>' + renderResultSummary(data.writing && data.writing.hanzi) +
      '<h2>✍️ Viết — Phần II (đặt câu)</h2>' + sentenceRows +
      '</body></html>';
  }

  /* ---------- Trò chơi Từ vựng "Đố vui tốc độ" — mỗi câu hiện 1 từ tiếng Trung
     (chữ Hán + pinyin), chọn đúng nghĩa tiếng Việt trong các lựa chọn trước khi
     hết giờ. Đúng liên tiếp được combo điểm thưởng, sai/hết giờ mất chuỗi. Điểm
     cao nhất lưu riêng theo từng bài trong localStorage để tạo động lực chơi lại.
     KHÔNG liên quan tới Nghe/Đọc/Viết — không tính vào "Nộp và in kết quả"/Sheet.
     vocabList: [{hanzi, pinyin, mean}, ...] — mean = nghĩa tiếng Việt. Danh sách
     rỗng hoặc dưới 4 từ → tự hiện thông báo "đang cập nhật", không lỗi.
     opts: {lessonId} dùng làm khoá lưu điểm cao nhất. ---------- */
  function mountVocabGame(containerSelector, vocabList, opts){
    const root = document.querySelector(containerSelector);
    if(!root) return;
    const lessonId = (opts && opts.lessonId) || 'bai';
    const HS_KEY = 'hsk3_vocab_highscore_' + lessonId;
    const TIME_MS = 8000;

    const list = (vocabList || []).filter(function(w){ return w && w.hanzi && w.mean; });

    if(list.length < 4){
      root.innerHTML = '<div class="placeholder-box"><div class="big">📚</div>' +
        'Từ vựng bài này đang được cập nhật, quay lại sau nhé!</div>';
      return;
    }

    let order = [], qi = 0, score = 0, streak = 0, correctCount = 0, timer = null, tStart = 0, answered = false;

    function shuffle(arr){
      const a = arr.slice();
      for(let i=a.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        const t=a[i]; a[i]=a[j]; a[j]=t;
      }
      return a;
    }

    function getHighScore(){ return parseInt(localStorage.getItem(HS_KEY) || '0', 10); }
    function setHighScore(v){ localStorage.setItem(HS_KEY, String(v)); }

    function renderStart(){
      const hs = getHighScore();
      root.innerHTML =
        '<div class="vocab-start">' +
          '<div class="vocab-start-icon">🎮</div>' +
          '<h3>Đố vui từ vựng tốc độ</h3>' +
          '<p>'+list.length+' từ · Trả lời đúng nghĩa trước khi hết giờ, đúng liên tiếp được combo điểm thưởng!</p>' +
          (hs > 0 ? '<div class="vocab-highscore">🏆 Điểm cao nhất: <b>'+hs+'</b></div>' : '') +
          '<button type="button" class="btn btn-primary vocab-start-btn">Bắt đầu chơi</button>' +
        '</div>';
      root.querySelector('.vocab-start-btn').addEventListener('click', startRound);
    }

    function startRound(){
      order = shuffle(list);
      qi = 0; score = 0; streak = 0; correctCount = 0;
      renderQuestion();
    }

    function makeOptions(correctWord){
      const pool = list.filter(function(w){ return w.hanzi !== correctWord.hanzi; });
      const distractors = shuffle(pool).slice(0, Math.min(3, pool.length)).map(function(w){ return w.mean; });
      return shuffle(distractors.concat([correctWord.mean]));
    }

    function renderQuestion(){
      answered = false;
      if(qi >= order.length){ renderEnd(); return; }
      const word = order[qi];
      const options = makeOptions(word);
      root.innerHTML =
        '<div class="vocab-game">' +
          '<div class="vocab-hud">' +
            '<span class="vocab-progress">Câu '+(qi+1)+' / '+order.length+'</span>' +
            '<span class="vocab-score">Điểm: '+score+'</span>' +
            (streak >= 2 ? '<span class="vocab-streak">🔥 Combo x'+streak+'</span>' : '') +
          '</div>' +
          '<div class="vocab-timerbar"><div class="vocab-timerbar-fill"></div></div>' +
          '<div class="vocab-word">' +
            '<div class="vocab-hanzi">'+word.hanzi+'</div>' +
            (word.pinyin ? '<div class="vocab-pinyin">'+word.pinyin+'</div>' : '') +
          '</div>' +
          '<div class="vocab-options">' +
            options.map(function(opt){ return '<button type="button" class="vocab-opt-btn">'+opt+'</button>'; }).join('') +
          '</div>' +
        '</div>';

      const fill = root.querySelector('.vocab-timerbar-fill');
      tStart = Date.now();
      clearInterval(timer);
      timer = setInterval(function(){
        const elapsed = Date.now() - tStart;
        const pct = Math.max(0, 100 - (elapsed / TIME_MS) * 100);
        if(fill) fill.style.width = pct + '%';
        if(elapsed >= TIME_MS){
          clearInterval(timer);
          if(!answered) handleAnswer(null, word);
        }
      }, 50);

      root.querySelectorAll('.vocab-opt-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(answered) return;
          handleAnswer(btn, word);
        });
      });
    }

    function handleAnswer(btnEl, word){
      answered = true;
      clearInterval(timer);
      const isCorrect = !!btnEl && btnEl.textContent === word.mean;
      root.querySelectorAll('.vocab-opt-btn').forEach(function(b){
        b.classList.add('locked');
        if(b.textContent === word.mean) b.classList.add('correct');
        else if(b === btnEl) b.classList.add('wrong');
      });
      if(isCorrect){
        streak++;
        correctCount++;
        const bonus = Math.min(streak, 5) * 2;
        score += 10 + (streak > 1 ? bonus : 0);
      } else {
        streak = 0;
      }
      const scoreEl = root.querySelector('.vocab-score');
      if(scoreEl) scoreEl.textContent = 'Điểm: ' + score;
      setTimeout(function(){ qi++; renderQuestion(); }, 900);
    }

    function renderEnd(){
      const hs = getHighScore();
      const isNewHigh = score > hs;
      if(isNewHigh) setHighScore(score);
      root.innerHTML =
        '<div class="vocab-end">' +
          '<div class="vocab-end-icon">'+(isNewHigh ? '🏆' : '🎉')+'</div>' +
          '<h3>'+(isNewHigh ? 'Kỷ lục mới!' : 'Hoàn thành!')+'</h3>' +
          '<div class="vocab-end-score">'+score+' điểm</div>' +
          '<p>Đúng '+correctCount+' / '+order.length+' câu' + (isNewHigh ? '' : ' · Điểm cao nhất: '+hs) + '</p>' +
          '<button type="button" class="btn btn-primary vocab-again-btn">Chơi lại</button>' +
        '</div>';
      root.querySelector('.vocab-again-btn').addEventListener('click', startRound);
    }

    renderStart();
  }

  return { el, initTabs, Quiz, mountSentenceWriting, imgFallback, bindSingleSelect, parseAnswerKey, mountListeningQuiz, mountVocabGame, collectResult, escapeHtml, buildPrintableHtml };
})();
