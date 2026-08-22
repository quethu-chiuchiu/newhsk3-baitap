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

  /* ---------- Ảnh linh hoạt định dạng file: nếu .jpg không load được,
     tự thử lần lượt các đuôi file khác trước khi ẩn hẳn ảnh (data-base
     giữ đường dẫn KHÔNG có đuôi, ví dụ "images/bai1/A") ---------- */
  const IMG_EXTS = ['jpg','jpeg','JPG','JPEG','png','PNG','webp','WEBP'];
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
    star.textContent = '★ ' + starText;
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
    star.textContent = '★ ' + starText;
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
     Not auto-graded (many valid answers) — gives a textarea + a reveal-on-demand sample answer. */
  function mountSentenceWriting(containerEl, n, picDescHtml, word, sampleAnswer){
    const block = el('<div class="q-row" style="flex-direction:column;align-items:stretch;">'+
      '<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">'+
        '<div class="q-num">'+n+'.</div>'+
        '<div class="pic-desc">'+picDescHtml+'</div>'+
        '<span class="word-tag">'+word+'</span>'+
      '</div>'+
      '<textarea class="writing-textarea" placeholder="Viết câu của bạn ở đây…"></textarea>'+
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

  return { el, initTabs, Quiz, mountSentenceWriting, imgFallback };
})();
