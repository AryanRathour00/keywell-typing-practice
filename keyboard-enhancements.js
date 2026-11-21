// Keyboard-first controls, five-star mastery gates, and the extended mixed-text library.
(() => {
  const byId = id => document.getElementById(id);
  const savedStars = data.stars || (data.stars = {});
  const mastered = title => (savedStars[title] || 0) === 5;
  // Legacy completions without five-star proof do not satisfy the new gate.
  data.done = data.done.filter(mastered);
  completed.clear(); data.done.forEach(title => completed.add(title));
  const previousStart = window.startLesson;
  let selected = 0;

  // Five-star ratings persist per lesson. Only five stars count as completion.
  window.lessonCard = function (lesson, index) {
    const stars = savedStars[lesson.title] || 0;
    const isLocked = index > 0 && !mastered(lessons[index - 1].title);
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
    const input = byId('typebox'), target = lesson.text;
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
      if (v.length) {
        data.sessions.push({title: lesson.title, wpm, acc, seconds: Math.round(seconds), when: new Date().toISOString()});
        data.days[dayKey()] = true;
        if (!isDaily) {
          savedStars[lesson.title] = Math.max(savedStars[lesson.title] || 0, stars);
          if (stars === 5 && !completed.has(lesson.title)) { data.done.push(lesson.title); completed.add(lesson.title); }
        }
        save();
      }
      const next = lessons[index + 1];
      const nextAvailable = !isDaily && stars === 5 && next;
      box.innerHTML = `<div class="result"><div class="eyebrow">${stars === 5 ? 'FIVE-STAR MASTERY' : 'PRACTICE RESULT'}</div>
        <div class="score">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div><h2>${stars === 5 ? 'Lesson mastered. Next lesson unlocked.' : 'Keep practicing for five stars.'}</h2>
        <p>Five stars require the full passage and at least 99% accuracy. ${stars < 5 && !isDaily ? 'This lesson stays locked until you earn all five.' : ''}</p>
        <div class="result-stats"><div><b>${wpm}</b><span>WPM</span></div><div><b>${acc}%</b><span>ACCURACY</span></div><div><b>${mistakeCount}</b><span>ERRORS MADE</span></div><div><b>${resetCount}</b><span>RESETS</span></div></div>
        <button class="finish" id="resultclose">${nextAvailable ? 'Continue to next lesson →' : 'Back to practice'}</button>
        ${stars < 5 && !isDaily ? '<button class="textlink" id="retry" style="display:block;margin:12px auto 0">Retry this lesson</button>' : ''}</div>`;
      byId('resultclose').onclick = () => {
        modal.classList.remove('show'); render();
        if (nextAvailable) { selected = index + 1; setTimeout(() => window.startLesson(index + 1), 0); }
      };
      byId('resultclose').focus();
      if (stars < 5 && !isDaily) byId('retry').onclick = () => openPractice(lesson, index);
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
    'Thanks for checking—let me know if you need another version!',
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
      if (e.key === 'ArrowRight' && selected < lessons.length - 1 && !mastered(lessons[selected].title)) { toast('Earn five stars to unlock the next lesson.'); return; }
      if (next > 0 && !mastered(lessons[next - 1].title)) { toast('That lesson is still locked. Earn five stars in the current lesson first.'); return; }
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
