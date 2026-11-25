// Keyboard-first controls, five-star mastery gates, and the extended mixed-text library.
(() => {
  const byId = id => document.getElementById(id);
  const savedStars = data.stars || (data.stars = {});
  const variantIndex = data.contentVariantIndex || (data.contentVariantIndex = {});
  const foundationStage = 6;
  const requiredStars = index => Number(lessons[index]?.id || Infinity) <= foundationStage ? 3 : 5;
  const mastered = title => {
    const index = lessons.findIndex(lesson => lesson.title === title);
    return index >= 0 && (savedStars[title] || 0) >= requiredStars(index);
  };
  const foundationLessons = lessons.filter(lesson => Number(lesson.id) <= foundationStage);
  const foundationFullyMastered = () => foundationLessons.every(lesson => (savedStars[lesson.title] || 0) >= 5);
  const isUnlocked = index => {
    if (index <= 0) return true;
    const lesson = lessons[index], previous = lessons[index - 1];
    if (!lesson || !previous || !mastered(previous.title)) return false;
    return Number(lesson.id) <= foundationStage || foundationFullyMastered();
  };
  const lockMessage = index => Number(lessons[index]?.id) > foundationStage && !foundationFullyMastered()
    ? 'Earn 5 stars on every lesson through stage 06 to unlock later stages.'
    : `Earn ${requiredStars(index - 1)} stars to unlock this lesson.`;
  // Rebuild cleared lessons from their saved star counts under the current rules.
  data.done = lessons.filter((lesson, index) => (savedStars[lesson.title] || 0) >= requiredStars(index)).map(lesson => lesson.title);
  completed.clear(); data.done.forEach(title => completed.add(title));
  let selected = 0;

  const wordAlternatives = {
    sun:['moon','star','rain'], map:['note','card','book'], red:['blue','green','gold'], cup:['mug','jar','pan'], box:['bag','case','bin'], joy:['fun','calm','hope'], key:['cap','tab','pin'],
    people:['teams','friends','learners'], make:['build','create','plan'], time:['hours','today','schedule'], work:['tasks','projects','plans'], learn:['practice','improve','grow'], practice:['train','repeat','type'],
    beautiful:['wonderful','colorful','helpful'], keyboard:['typing','accuracy','rhythm'], remember:['continue','improve','practice'], comfortable:['confident','consistent','accurate'],
    monday:['tuesday','wednesday','friday'], september:['october','november','december'], maya:['priya','nina','sara'], omar:['arjun','liam','noah'], boston:['austin','mumbai','seattle'],
    sam:['alex','maya','lee'], jordan:['riley','casey','taylor'], priya:['maya','nina','sara'], alex:['sam','jordan','riley'],
    meeting:['review','session','call'], plan:['schedule','outline','draft'], file:['document','report','note'], total:['amount','balance','cost'],
    quick:['calm','bright','steady'], brown:['small','quiet','kind'], fox:['bird','dog','cat'], jumps:['runs','moves','walks'], lazy:['sleepy','quiet','calm'], dog:['cat','bird','fox']
  };
  function nextLessonText(lesson) {
    const n = (variantIndex[lesson.title] || 0) + 1;
    variantIndex[lesson.title] = n;
    let changed = lesson.text.replace(/\b[\w'-]+\b/g, word => {
      const choices = wordAlternatives[word.toLowerCase()];
      if (!choices) return word;
      const replacement = choices[(n - 1) % choices.length];
      return word[0] === word[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    });
    changed = changed.replace(/\d/g, digit => String((Number(digit) + n) % 10));
    if (changed === lesson.text) {
      const words = lesson.text.match(/\S+/g) || [];
      if (words.length > 1) {
        const shift = n % words.length || 1;
        changed = words.slice(shift).concat(words.slice(0, shift)).join(' ');
      } else {
        changed = [...lesson.text].reverse().join('');
      }
    }
    save();
    return changed;
  }

  // Stages 01–06 advance at three stars; anything beyond stage 06 waits for five-star mastery throughout the foundation.
  window.lessonCard = function (lesson, index) {
    const stars = savedStars[lesson.title] || 0;
    const isLocked = !isUnlocked(index);
    const isDone = mastered(lesson.title);
    return `<div class="lesson ${isLocked ? 'locked' : ''} ${isDone ? 'done' : ''}" role="button" tabindex="${isLocked ? '-1' : '0'}" aria-disabled="${isLocked}" ${isLocked ? '' : `onclick="startLesson(${index})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();startLesson(${index})}"`}>
      <div class="lesson-num">${isDone ? '✓' : String(index + 1).padStart(2, '0')}</div>
      <div class="lesson-info"><b>${lesson.title}</b><small>${lesson.id} · ${lesson.name} &nbsp; ${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</small></div>
      <span class="lesson-arr">${isLocked ? '🔒' : '›'}</span></div>`;
  };

  function openPractice(lesson, index, isDaily = false) {
    selected = index;
    const modal = byId('modal'), box = byId('practice');
    let started = Date.now(), finished = false, mistakeCount = 0, uncorrectedErrors = 0, resetCount = 0, priorValue = '', correctionPending = false;
    let errorMode = data.errorMode || 'off', ctrlRequired = !!data.ctrlRequired;
    modal.classList.add('show');
    box.innerHTML = `<div class="practice-head"><h2>${lesson.title}</h2><button class="close" id="close">×</button></div>
      <div class="practice-desc">${lesson.id || 'DAILY MIXED PRACTICE'} · ${lesson.name || '730 passage library'} · type the full passage for a star rating</div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0 14px;font-size:12px;color:#687267"><label>Error rule <select id="errormode" style="padding:7px;border:1px solid #d9dfd5;border-radius:8px"><option value="off">Practice · count errors</option><option value="three">Reset on 3 errors</option><option value="one">Master · reset on 1 error</option></select></label><label style="display:flex;gap:6px;align-items:center"><input id="ctrlrequired" type="checkbox"> Ctrl+Backspace required to correct any error</label></div>
      <div style="font-size:11px;color:#899386;margin:-7px 0 11px">With Ctrl+Backspace mode on, after a mistake you must use that shortcut next; another key resets the run. Errors stay counted in the meter after correction.</div>
      <div class="live-metrics"><span>Speed <b id="lwpm">0</b> WPM</span><span>Accuracy <b id="lacc">100%</b></span><span>Errors made <b id="lerr">0</b></span><span>Reset count <b id="lresets">0</b></span></div>
      <div class="prompt" id="prompt"></div><input class="input" id="typebox" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Start typing…">
      <div class="practice-foot"><span class="hint">Alt + ← / → changes lesson · Ctrl + Backspace deletes the previous word · Esc closes</span><button class="finish" id="finish">Finish practice</button></div>`;
    const input = byId('typebox');
    let target = lesson.text;
    const paint = () => {
      const v = input.value;
      byId('prompt').innerHTML = [...target].map((c, j) => `<span class="${j < v.length ? (v[j] === c ? 'typed' : 'wrong') : j === v.length ? 'current' : ''}">${c === ' ' ? '&nbsp;' : c === '\n' ? '<br>' : escapeHtml(c)}</span>`).join('');
      let good = 0, errors = 0;
      for (let j = 0; j < v.length; j++) v[j] === target[j] ? good++ : errors++;
      const elapsed = Math.max((Date.now() - started) / 60000, .01);
      byId('lwpm').textContent = Math.round(good / 5 / elapsed);
      byId('lacc').textContent = `${good + mistakeCount ? Math.round(good / (good + mistakeCount) * 100) : 100}%`;
      byId('lerr').textContent = mistakeCount;
      if (v.length >= target.length) finish();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      const v = input.value, seconds = Math.max((Date.now() - started) / 1000, 1);
      let good = 0, errors = 0;
      for (let j = 0; j < v.length; j++) v[j] === target[j] ? good++ : errors++;
      const acc = good + mistakeCount ? Math.round(good / (good + mistakeCount) * 100) : 0;
      const wpm = Math.round(good / 5 / (seconds / 60));
      const stars = v.length >= target.length ? (acc >= 99 ? 5 : acc >= 98 ? 4 : acc >= 95 ? 3 : acc >= 90 ? 2 : acc >= 80 ? 1 : 0) : 0;
      const starTarget = requiredStars(index);
      const passed = !isDaily && stars >= starTarget;
      if (v.length) {
        data.sessions.push({title: lesson.title, wpm, acc, seconds: Math.round(seconds), when: new Date().toISOString()});
        data.days[dayKey()] = true;
        if (!isDaily) {
          savedStars[lesson.title] = Math.max(savedStars[lesson.title] || 0, stars);
          if (passed && !completed.has(lesson.title)) { data.done.push(lesson.title); completed.add(lesson.title); }
        }
        save();
      }
      const next = lessons[index + 1];
      const nextAvailable = passed && next && isUnlocked(index + 1);
      const nextLockedByFoundation = passed && next && !nextAvailable && Number(next.id) > foundationStage;
      box.innerHTML = `<div class="result"><div class="eyebrow">${passed ? 'LESSON CLEARED' : 'PRACTICE RESULT'}</div>
        <div class="score">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div><h2>${passed ? (nextAvailable ? 'Lesson cleared. Next lesson unlocked.' : nextLockedByFoundation ? 'Lesson cleared. Stage 07 stays locked.' : 'Lesson cleared.') : 'Keep practicing for the required stars.'}</h2>
        <p>${starTarget} stars clear this lesson. ${nextLockedByFoundation ? 'Every lesson through stage 06 needs 5 stars before later stages unlock.' : !passed && !isDaily ? 'This lesson stays locked until you reach the required rating. Your next try will use different text.' : ''}</p>
        <div class="result-stats"><div><b>${wpm}</b><span>WPM</span></div><div><b>${acc}%</b><span>ACCURACY</span></div><div><b>${mistakeCount}</b><span>ERRORS MADE</span></div><div><b>${resetCount}</b><span>RESETS</span></div></div>
        <button class="finish" id="resultclose">${nextAvailable ? 'Continue to next lesson →' : 'Back to practice'}</button>
        ${!passed && !isDaily ? '<button class="textlink" id="retry" style="display:block;margin:12px auto 0">Retry with different text</button>' : ''}</div>`;
      byId('resultclose').onclick = () => {
        modal.classList.remove('show'); render();
        if (nextAvailable) { selected = index + 1; setTimeout(() => window.startLesson(index + 1), 0); }
      };
      byId('resultclose').focus();
      if (!passed && !isDaily) byId('retry').onclick = () => openPractice({...lesson, text:nextLessonText(lesson)}, index);
    };
    byId('close').onclick = () => modal.classList.remove('show');
    byId('finish').onclick = finish;
    const modeSelect = byId('errormode'), ctrlToggle = byId('ctrlrequired');
    modeSelect.value = errorMode; ctrlToggle.checked = ctrlRequired;
    modeSelect.onchange = () => { errorMode = modeSelect.value; data.errorMode = errorMode; save(); };
    ctrlToggle.onchange = () => { ctrlRequired = ctrlToggle.checked; data.ctrlRequired = ctrlRequired; save(); };
    input.addEventListener('input', () => { priorValue = input.value; paint(); });
    const resetRun = message => {
      resetCount++; byId('lresets').textContent = resetCount;
      lesson = {...lesson, text:nextLessonText(lesson)}; target = lesson.text;
      input.value = ''; priorValue = ''; correctionPending = false; uncorrectedErrors = 0; started = Date.now(); paint();
      toast(message);
    };
    input.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Backspace') {
        e.preventDefault(); const start = input.selectionStart, value = input.value, wasPending = correctionPending;
        const left = value.slice(0, start).replace(/\s+$/, '').replace(/\S+$/, '');
        input.value = left + value.slice(input.selectionEnd); input.setSelectionRange(left.length, left.length); priorValue = input.value; correctionPending = false; uncorrectedErrors = 0; paint();
        if (wasPending && input.value === value) { resetRun('Ctrl+Backspace could not remove the error, so this run reset.'); }
        return;
      }
      if (correctionPending && e.key !== 'Control' && e.key !== 'Shift') {
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); resetRun('Only Ctrl+Backspace can clear an error in this mode.'); return; }
        if (e.key.length === 1 || e.key === 'Enter') { e.preventDefault(); resetRun('Use Ctrl+Backspace immediately to clear the error.'); return; }
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const pos = input.selectionStart;
        if (e.key !== target[pos]) {
          mistakeCount++; uncorrectedErrors++; byId('lerr').textContent = mistakeCount;
          if (ctrlRequired) correctionPending = true;
          const limit = errorMode === 'one' ? 1 : errorMode === 'three' ? 3 : Infinity;
          if (uncorrectedErrors >= limit && !ctrlRequired) { e.preventDefault(); resetRun(errorMode === 'one' ? 'Master mode: the first error reset this lesson.' : 'Three errors reached. This lesson has reset.'); return; }
        }
      }
    });
    input.addEventListener('blur', () => { if (correctionPending) resetRun('Use Ctrl+Backspace immediately to clear the error.'); });
    input.addEventListener('paste', e => { e.preventDefault(); toast('Paste is disabled during typing practice.'); });
    input.focus(); paint();
  }
  window.startLesson = function (index, benchmark = false) {
    if (!benchmark && !isUnlocked(index)) { toast(lockMessage(index)); return; }
    const lesson = benchmark ? {...lessons.at(-1), title: 'Mixed benchmark', text: texts['100 WPM benchmark']} : lessons[index];
    openPractice(lesson, index, benchmark);
  };

  // 730 distinct, varied real-world passages provide a conservative two-year daily runway.
  const passageOpeners = [
    'Please review the updated plan', 'I confirmed the appointment', 'The project status is ready', 'Your order will arrive',
    'We saved the final version', 'The team will meet', 'Maya sent the report', 'Please reply when convenient',
    'The event begins', 'I added the new details', 'Jordan will bring the documents', 'The next delivery is scheduled'
  ];
  const passageContexts = [
    'for Friday, November 20, 2026', 'at 9:45 AM in Room 204', 'with a total of $148.75',
    'using reference #Q7-29', 'at https://example.org/updates', 'for Priya Shah and Alex Kim',
    'before 5:30 PM; please confirm', 'with 3 items marked “urgent”', 'by email: team@example.com',
    'after a 12% discount ($16.80)', 'through the north entrance, Gate B', 'and the final score was 98.6%'
  ];
  const passageClosers = [
    'I corrected the earlier typo with Ctrl+Backspace and sent the clean copy.',
    'Please check the names, numbers, and punctuation before sharing it.',
    'If anything changes, update the note and notify everyone by 10:15.',
    'The details are final; save a copy as “Plan_2026-11-20.pdf”.',
    'Thanks for checking; let me know if you need another version!',
    'Use code RIVER_26! when prompted, then choose option 4.'
  ];
  const dailyPassages = Array.from({length: 730}, (_, i) => `${passageOpeners[i % passageOpeners.length]} ${passageContexts[Math.floor(i / passageOpeners.length) % passageContexts.length]}. Reference: KW-${String(i + 1).padStart(4, '0')}. ${passageClosers[(i * 7 + Math.floor(i / 12)) % passageClosers.length]}`);
  const dailyIndex = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 86400000) % dailyPassages.length;
  const dailyButton = document.createElement('button');
  dailyButton.className = 'play'; dailyButton.style.cssText = 'position:fixed;right:28px;bottom:24px;z-index:3;box-shadow:0 8px 25px #20362b33';
  dailyButton.textContent = `Daily passage ${dailyIndex + 1}/730`;
  dailyButton.title = 'Open today’s mixed-content passage';
  dailyButton.onclick = () => openPractice({title: `Daily passage ${dailyIndex + 1}`, text: dailyPassages[dailyIndex]}, lessons.length - 1, true);
  document.body.append(dailyButton);

  // Global keyboard navigation is available while typing or browsing.
  document.addEventListener('keydown', e => {
    if (e.altKey && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault(); byId('modal').classList.remove('show');
      document.querySelector(`.nav[data-tab="${['home','learn','stats'][Number(e.key)-1]}"]`).click(); return;
    }
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault(); const modalOpen = byId('modal').classList.contains('show');
      const next = Math.max(0, Math.min(lessons.length - 1, selected + (e.key === 'ArrowRight' ? 1 : -1)));
      if (e.key === 'ArrowRight' && selected < lessons.length - 1 && !isUnlocked(selected + 1)) { toast(lockMessage(selected + 1)); return; }
      if (!isUnlocked(next)) { toast(lockMessage(next)); return; }
      selected = next;
      if (modalOpen && byId('resultclose')) { byId('resultclose').click(); return; }
      if (!modalOpen) window.startLesson(next);
      return;
    }
    if (e.key === 'Escape') { byId('modal').classList.remove('show'); }
  }, true);

  const shortcuts = document.createElement('div');
  shortcuts.className = 'today'; shortcuts.style.cssText = 'position:fixed;left:20px;bottom:14px;background:#fff;padding:8px 11px;border:1px solid var(--line);border-radius:9px;z-index:2';
  shortcuts.textContent = 'Keyboard: Alt+1 Overview · Alt+2 Lessons · Alt+3 Progress · Alt+←/→ Lesson · Enter Start';
  document.body.append(shortcuts);
  const oldRender = window.render;
  window.render = function () { oldRender(); };
  render();
})();
