/* ========== Interactive Learning App ========== */
(function () {
  'use strict';

  let META, CHAR, THEME, STAGES;
  let state = {
    currentStage: 0, // 0 = home
    step: 'home',    // home | scene | deconstruct | deepen | growth | complete | report | review
    dialogueIdx: 0,
    answers: [],     // per-stage correct/wrong
    reviewStage: null
  };

  const app = document.getElementById('app');

  // ========== Data Loading ==========
  async function loadData() {
    const [meta, char, theme, stages] = await Promise.all([
      fetch('data/meta.json').then(r => r.json()),
      fetch('data/character.json').then(r => r.json()),
      fetch('data/theme.json').then(r => r.json()),
      fetch('data/stages.json').then(r => r.json())
    ]);
    META = meta;
    CHAR = char;
    THEME = theme;
    STAGES = stages.stages;
    loadProgress();
    render();
  }

  // ========== Progress Persistence ==========
  function saveProgress() {
    localStorage.setItem('xfx_progress', JSON.stringify(state));
  }
  function loadProgress() {
    try {
      const saved = localStorage.getItem('xfx_progress');
      if (saved) {
        const s = JSON.parse(saved);
        if (s && typeof s.currentStage === 'number') {
          Object.assign(state, s);
        }
      }
    } catch (e) { /* ignore */ }
  }

  // ========== Render Router ==========
  function render() {
    saveProgress();
    app.innerHTML = '';
    switch (state.step) {
      case 'home': renderHome(); break;
      case 'scene': renderScene(); break;
      case 'deconstruct': renderDeconstruct(); break;
      case 'deepen': renderDeepen(); break;
      case 'growth': renderGrowth(); break;
      case 'complete': renderComplete(); break;
      case 'report': renderReport(); break;
      case 'review': renderReview(); break;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ========== Progress Bar ==========
  function progressBar() {
    if (state.step === 'home' || state.step === 'complete' || state.step === 'report' || state.step === 'review') return '';
    const stage = state.currentStage;
    const stepMap = { scene: 0, deconstruct: 1, deepen: 2, growth: 3 };
    const stepIdx = stepMap[state.step] || 0;
    const totalUnits = STAGES.length * 4;
    const doneUnits = (stage - 1) * 4 + stepIdx;
    const pct = Math.round((doneUnits / totalUnits) * 100);
    return `<div class="progress-bar-wrap">
      <div class="progress-info"><span>第 ${stage}/${STAGES.length} 关</span><span>${pct}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  // ========== Home Page ==========
  function renderHome() {
    app.innerHTML = `<div class="page home-page">
      <div class="home-emoji">${META.emoji}</div>
      <h1 class="home-title">${META.title}</h1>
      <p class="home-subtitle">${META.subtitle}</p>
      <p class="home-desc">${META.description}</p>
      <div class="char-card">
        <div class="char-header">
          <span class="char-emoji">${CHAR.emoji}</span>
          <div>
            <div class="char-name">${CHAR.name}</div>
            <div class="char-identity">${CHAR.identity}</div>
          </div>
        </div>
        <p class="char-intro">${CHAR.intro}</p>
        <div class="char-arc">
          <span>${CHAR.starting_state}</span>
          <span class="char-arc-arrow">→</span>
          <span>${CHAR.final_state}</span>
        </div>
      </div>
      <button class="btn btn-primary btn-block" onclick="window.__start()">开始学习</button>
    </div>`;
  }
  window.__start = function () {
    state.currentStage = 1;
    state.step = 'scene';
    state.dialogueIdx = 0;
    state.answers = [];
    render();
  };

  // ========== Scene Page ==========
  function renderScene() {
    const s = STAGES[state.currentStage - 1];
    const scene = s.scene;
    const dialogues = scene.dialogue;

    let html = `<div class="page">${progressBar()}
      <h2 class="section-title">${s.title}</h2>
      <div class="scene-narration">${scene.narration}</div>
      <div class="dialogue-area" id="dialogue-area">`;

    // Show dialogues up to current index
    for (let i = 0; i <= Math.min(state.dialogueIdx, dialogues.length - 1); i++) {
      const d = dialogues[i];
      const isChar = d.speaker === CHAR.name;
      const cls = isChar ? 'dialogue-right' : 'dialogue-left';
      html += `<div class="dialogue-bubble ${cls}">
        <div class="dialogue-speaker">${d.speaker}</div>
        <div>${escHtml(d.text)}</div>
      </div>`;
    }
    html += '</div>';

    if (state.dialogueIdx < dialogues.length - 1) {
      html += `<p class="tap-hint">点击继续对话 ▼</p>`;
    } else {
      if (scene.dilemma) {
        html += `<div class="dilemma-box">${escHtml(scene.dilemma)}</div>`;
      }
      html += `<button class="btn btn-primary btn-block" onclick="window.__toDeconstruct()">开始拆解</button>`;
    }
    html += '</div>';
    app.innerHTML = html;

    if (state.dialogueIdx < dialogues.length - 1) {
      app.addEventListener('click', handleDialogueClick);
    }
  }

  function handleDialogueClick(e) {
    if (e.target.closest('.btn')) return;
    const s = STAGES[state.currentStage - 1];
    if (state.dialogueIdx < s.scene.dialogue.length - 1) {
      state.dialogueIdx++;
      renderScene();
    }
  }

  window.__toDeconstruct = function () {
    state.step = 'deconstruct';
    render();
  };

  // ========== Deconstruct Page ==========
  function renderDeconstruct() {
    const s = STAGES[state.currentStage - 1];
    const d = s.deconstruct;
    let html = `<div class="page">${progressBar()}<h2 class="section-title">${s.title} · 拆解</h2>`;
    html += `<div class="decon-instruction">${escHtml(d.instruction)}</div>`;

    switch (d.type) {
      case 'layers': html += renderLayers(d); break;
      case 'perspective': html += renderPerspective(d); break;
      case 'logic': html += renderLogic(d); break;
      case 'causal': html += renderCausal(d); break;
    }
    html += '</div>';
    app.innerHTML = html;

    switch (d.type) {
      case 'layers': initLayers(d); break;
      case 'perspective': initPerspective(d); break;
      case 'logic': initLogic(d); break;
      case 'causal': initCausal(d); break;
    }
  }

  // ----- Layers -----
  function renderLayers(d) {
    let html = '<div class="layers-stack" id="layers-stack">';
    d.layers.forEach((layer, i) => {
      html += `<div class="layer-card locked${i === 0 ? ' next' : ''}" data-idx="${i}" style="margin-left:${i * 16}px">
        🔒 点击揭开 · ${layer.label}
      </div>`;
    });
    html += '</div>';
    return html;
  }
  function initLayers(d) {
    let revealed = 0;
    document.querySelectorAll('.layer-card').forEach(card => {
      card.addEventListener('click', function () {
        const idx = parseInt(this.dataset.idx);
        if (idx !== revealed) return;
        const layer = d.layers[idx];
        this.className = 'layer-card revealed';
        this.innerHTML = `<div class="layer-emoji">${layer.emoji}</div>
          <div class="layer-label">${layer.label}</div>
          <div class="layer-content">${escHtml(layer.content)}</div>`;
        this.style.background = idx === d.layers.length - 1 ? '#fef0ed' : '';
        revealed++;
        const next = document.querySelector(`.layer-card[data-idx="${revealed}"]`);
        if (next) next.classList.add('next');
        if (revealed === d.layers.length) {
          const stack = document.getElementById('layers-stack');
          stack.insertAdjacentHTML('afterend',
            `<div class="complete-msg">🧅 所有层都揭开了！</div>
             <button class="btn btn-primary btn-block" onclick="window.__toDeepen()">继续</button>`);
        }
      });
    });
  }

  // ----- Perspective -----
  function renderPerspective(d) {
    let html = '<div class="persp-tabs" id="persp-tabs">';
    d.perspectives.forEach((p, i) => {
      html += `<div class="persp-tab${i === 0 ? ' active' : ''}" data-idx="${i}">${p.emoji} ${p.role}</div>`;
    });
    html += '</div><div id="persp-body"></div>';
    return html;
  }
  function initPerspective(d) {
    const visited = new Set([0]);
    let activeIdx = 0;

    function showPersp(idx) {
      const p = d.perspectives[idx];
      const body = document.getElementById('persp-body');
      let html = `<div class="persp-content">
        <div class="persp-view">${escHtml(p.view)}</div>
        <div class="persp-blindspot">${escHtml(p.blind_spot)}</div>
      </div>`;
      if (visited.size === d.perspectives.length) {
        html += `<div class="persp-synthesis">${escHtml(d.synthesis)}</div>
          <div class="complete-msg">👁️ 所有视角都看过了！</div>
          <button class="btn btn-primary btn-block" onclick="window.__toDeepen()">继续</button>`;
      }
      body.innerHTML = html;
    }

    showPersp(0);

    document.querySelectorAll('.persp-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        const idx = parseInt(this.dataset.idx);
        visited.add(idx);
        activeIdx = idx;
        document.querySelectorAll('.persp-tab').forEach((t, i) => {
          t.classList.toggle('active', i === idx);
          if (visited.has(i)) t.classList.add('visited');
        });
        showPersp(idx);
      });
    });
  }

  // ----- Logic -----
  function renderLogic(d) {
    const pool = d.scrambled_order.map(i => ({ text: d.answers[i], origIdx: i }));
    let html = '<div class="logic-labels" id="logic-labels">';
    d.labels.forEach((label, i) => {
      html += `<div class="logic-label-row">
        <div class="logic-label">${escHtml(label)}</div>
        <div class="logic-drop" data-target="${i}">拖拽或点选内容到这里</div>
      </div>`;
    });
    html += '</div><div class="logic-pool" id="logic-pool">';
    pool.forEach((item, i) => {
      html += `<div class="logic-item" data-orig="${item.origIdx}" draggable="true">${escHtml(item.text)}</div>`;
    });
    html += '</div>';
    return html;
  }
  function initLogic(d) {
    let selectedItem = null;
    let filledCount = 0;
    const totalPairs = d.labels.length;

    // Touch/click mode
    document.querySelectorAll('.logic-item').forEach(item => {
      item.addEventListener('click', function () {
        if (this.classList.contains('used')) return;
        document.querySelectorAll('.logic-item').forEach(x => x.classList.remove('selected'));
        this.classList.add('selected');
        selectedItem = this;
        document.querySelectorAll('.logic-drop').forEach(x => x.classList.add('highlight'));
      });
    });

    document.querySelectorAll('.logic-drop').forEach(drop => {
      drop.addEventListener('click', function () {
        if (this.classList.contains('filled') || !selectedItem) return;
        const targetIdx = parseInt(this.dataset.target);
        const origIdx = parseInt(selectedItem.dataset.orig);
        if (origIdx === targetIdx) {
          this.textContent = selectedItem.textContent;
          this.classList.remove('highlight');
          this.classList.add('filled');
          selectedItem.classList.remove('selected');
          selectedItem.classList.add('used');
          selectedItem = null;
          filledCount++;
          document.querySelectorAll('.logic-drop:not(.filled)').forEach(x => x.classList.remove('highlight'));
          if (filledCount === totalPairs) {
            document.getElementById('logic-pool').insertAdjacentHTML('afterend',
              `<div class="complete-msg">🎯 全部配对正确！</div>
               <button class="btn btn-primary btn-block" onclick="window.__toDeepen()">继续</button>`);
          }
        } else {
          this.classList.add('error');
          setTimeout(() => this.classList.remove('error'), 400);
        }
      });

      // Drag & drop
      drop.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('highlight'); });
      drop.addEventListener('dragleave', function () { if (!selectedItem) this.classList.remove('highlight'); });
      drop.addEventListener('drop', function (e) {
        e.preventDefault();
        if (this.classList.contains('filled')) return;
        const origIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIdx = parseInt(this.dataset.target);
        const draggedEl = document.querySelector(`.logic-item[data-orig="${origIdx}"]`);
        if (origIdx === targetIdx) {
          this.textContent = draggedEl.textContent;
          this.classList.remove('highlight');
          this.classList.add('filled');
          draggedEl.classList.remove('dragging');
          draggedEl.classList.add('used');
          filledCount++;
          if (filledCount === totalPairs) {
            document.getElementById('logic-pool').insertAdjacentHTML('afterend',
              `<div class="complete-msg">🎯 全部配对正确！</div>
               <button class="btn btn-primary btn-block" onclick="window.__toDeepen()">继续</button>`);
          }
        } else {
          this.classList.add('error');
          draggedEl.classList.remove('dragging');
          setTimeout(() => this.classList.remove('error'), 400);
        }
      });
    });

    document.querySelectorAll('.logic-item').forEach(item => {
      item.addEventListener('dragstart', function (e) {
        e.dataTransfer.setData('text/plain', this.dataset.orig);
        this.classList.add('dragging');
      });
      item.addEventListener('dragend', function () {
        this.classList.remove('dragging');
      });
    });
  }

  // ----- Causal -----
  function renderCausal(d) {
    const order = d.scrambled_order.slice();
    let html = '<div class="causal-steps" id="causal-steps">';
    order.forEach((origIdx, i) => {
      const step = d.steps[origIdx];
      html += `<div class="causal-step" data-pos="${i}" data-orig="${origIdx}">
        <div class="causal-num">${i + 1}</div>
        <div>${escHtml(step.text)}</div>
      </div>`;
    });
    html += '</div>';
    html += `<button class="btn btn-secondary btn-block" id="check-order-btn" onclick="window.__checkCausal()">检查顺序</button>`;
    return html;
  }
  function initCausal(d) {
    let selectedStep = null;

    function rebindClicks() {
      document.querySelectorAll('.causal-step').forEach(step => {
        step.onclick = function () {
          if (selectedStep === this) {
            this.classList.remove('selected');
            selectedStep = null;
            return;
          }
          if (selectedStep) {
            // Swap
            const parent = this.parentNode;
            const steps = Array.from(parent.children);
            const idx1 = steps.indexOf(selectedStep);
            const idx2 = steps.indexOf(this);
            if (idx1 < idx2) {
              parent.insertBefore(this, selectedStep);
              parent.insertBefore(selectedStep, steps[idx2 + 1] || null);
            } else {
              parent.insertBefore(selectedStep, this);
              parent.insertBefore(this, steps[idx1 + 1] || null);
            }
            selectedStep.classList.remove('selected');
            selectedStep = null;
            // Update numbers
            Array.from(parent.children).forEach((s, i) => {
              s.querySelector('.causal-num').textContent = i + 1;
              s.dataset.pos = i;
              s.classList.remove('correct', 'wrong');
            });
            // Show check button again
            const btn = document.getElementById('check-order-btn');
            if (btn) btn.style.display = '';
          } else {
            document.querySelectorAll('.causal-step').forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
            selectedStep = this;
          }
        };
      });
    }
    rebindClicks();

    window.__checkCausal = function () {
      const stepsEl = Array.from(document.querySelectorAll('.causal-step'));
      let allCorrect = true;
      stepsEl.forEach((el, i) => {
        const origIdx = parseInt(el.dataset.orig);
        const expectedOrder = d.steps[origIdx].order;
        if (expectedOrder === i + 1) {
          el.classList.add('correct');
          el.classList.remove('wrong');
        } else {
          el.classList.add('wrong');
          el.classList.remove('correct');
          allCorrect = false;
        }
      });
      if (allCorrect) {
        const btn = document.getElementById('check-order-btn');
        if (btn) btn.style.display = 'none';
        document.getElementById('causal-steps').insertAdjacentHTML('afterend',
          `<div class="complete-msg">🎯 排序正确！</div>
           <button class="btn btn-primary btn-block" onclick="window.__toDeepen()">继续</button>`);
      }
    };
  }

  window.__toDeepen = function () {
    state.step = 'deepen';
    render();
  };

  // ========== Deepen Page ==========
  function renderDeepen() {
    const s = STAGES[state.currentStage - 1];
    const d = s.deepen;
    let html = `<div class="page">${progressBar()}<h2 class="section-title">${s.title} · 深化</h2>`;
    html += `<p class="deepen-question">${escHtml(d.question)}</p>`;
    d.options.forEach((opt, i) => {
      html += `<button class="option-btn" data-idx="${i}" onclick="window.__selectOption(${i})">${escHtml(opt.text)}</button>`;
    });
    html += '</div>';
    app.innerHTML = html;
  }

  window.__selectOption = function (idx) {
    const s = STAGES[state.currentStage - 1];
    const d = s.deepen;
    const chosen = d.options[idx];
    const isCorrect = chosen.correct;

    // Record answer
    state.answers[state.currentStage - 1] = isCorrect;

    document.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.classList.add('answered');
      const opt = d.options[i];
      if (i === idx) {
        btn.classList.add(isCorrect ? 'selected-correct' : 'selected-wrong');
      } else {
        btn.classList.add(opt.correct ? 'show-correct' : 'show-wrong');
      }
      btn.insertAdjacentHTML('beforeend',
        `<div class="option-explanation">${opt.correct ? '✅ ' : ''}${escHtml(opt.explanation)}</div>`);
    });

    const feedbackClass = isCorrect ? 'feedback-correct' : 'feedback-wrong';
    const feedbackText = isCorrect ? '🎉 回答正确！' : '🤔 不太对，看看解释吧';
    const btns = document.querySelector('.page');
    btns.insertAdjacentHTML('beforeend',
      `<div class="feedback-banner ${feedbackClass}">${feedbackText}</div>
       <button class="btn btn-primary btn-block" onclick="window.__toGrowth()">继续</button>`);
  };

  window.__toGrowth = function () {
    state.step = 'growth';
    render();
  };

  // ========== Growth Page ==========
  function renderGrowth() {
    const s = STAGES[state.currentStage - 1];
    const g = s.growth;
    const isLast = state.currentStage === STAGES.length;

    // Typewriter effect: wrap each character in span with delay
    const chars = g.narration.split('');
    let narrationHtml = '';
    chars.forEach((ch, i) => {
      if (ch === '\n') {
        narrationHtml += '<br>';
      } else {
        narrationHtml += `<span class="growth-word" style="animation-delay:${i * 30}ms">${escHtml(ch)}</span>`;
      }
    });

    let html = `<div class="page growth-page">${progressBar()}
      <div class="growth-emoji">${g.emoji}</div>
      <div class="growth-narration">${narrationHtml}</div>`;

    if (g.reflection_prompt) {
      html += `<div class="reflection-box">
        <p class="reflection-prompt">💭 ${escHtml(g.reflection_prompt)}</p>
        <textarea class="reflection-input" id="reflection-input" placeholder="写下你的想法……"></textarea>
      </div>`;
    }

    const btnLabel = isLast ? '查看总结' : '下一关';
    const btnAction = isLast ? 'window.__toComplete()' : 'window.__nextStage()';

    if (g.reflection_prompt) {
      html += `<button class="btn btn-primary btn-block" id="continue-btn" style="display:none" onclick="${btnAction}">${btnLabel}</button>`;
    } else {
      html += `<button class="btn btn-primary btn-block" onclick="${btnAction}">${btnLabel}</button>`;
    }

    html += '</div>';
    app.innerHTML = html;

    // Show continue button after typing or when reflection has input
    if (g.reflection_prompt) {
      const input = document.getElementById('reflection-input');
      const btn = document.getElementById('continue-btn');
      input.addEventListener('input', function () {
        btn.style.display = this.value.trim().length > 0 ? '' : 'none';
      });
    }
  }

  window.__nextStage = function () {
    state.currentStage++;
    state.step = 'scene';
    state.dialogueIdx = 0;
    render();
  };

  window.__toComplete = function () {
    state.step = 'complete';
    render();
  };

  // ========== Complete Page ==========
  function renderComplete() {
    let html = `<div class="page complete-page">
      <div class="complete-emoji">🎓</div>
      <h1 class="complete-title">学习完成！</h1>
      <p class="complete-subtitle">${CHAR.name}的故事告一段落，但思考不会停止</p>
      <div class="arc-summary">
        <div class="char-header" style="margin-bottom:0.8rem">
          <span class="char-emoji">${CHAR.emoji}</span>
          <div><div class="char-name">${CHAR.name}</div></div>
        </div>
        <div class="arc-label">成长轨迹</div>
        <div class="arc-row">
          <span>${CHAR.starting_state}</span>
          <span class="char-arc-arrow">→</span>
          <span>${CHAR.final_state}</span>
        </div>
      </div>
      <h3 style="text-align:left;margin-bottom:0.8rem;font-family:var(--heading-font)">关卡回顾</h3>
      <div class="stage-review-list">`;

    STAGES.forEach((s, i) => {
      const growthPreview = s.growth.narration.substring(0, 40) + '……';
      html += `<div class="stage-review-item" onclick="window.__reviewStage(${i})">
        <div class="stage-review-num">${i + 1}</div>
        <div class="stage-review-info">
          <div class="stage-review-title">${escHtml(s.title)}</div>
          <div class="stage-review-growth">${escHtml(growthPreview)}</div>
        </div>
      </div>`;
    });

    html += `</div>
      <button class="btn btn-primary btn-block" onclick="window.__toReport()">查看知识报告</button>
      <button class="btn btn-secondary btn-block" onclick="window.__restart()">重新开始</button>
    </div>`;
    app.innerHTML = html;
  }

  window.__toReport = function () {
    state.step = 'report';
    render();
  };

  window.__restart = function () {
    state = { currentStage: 0, step: 'home', dialogueIdx: 0, answers: [], reviewStage: null };
    localStorage.removeItem('xfx_progress');
    render();
  };

  // ========== Report Page ==========
  function renderReport() {
    const correct = state.answers.filter(a => a === true).length;
    const total = STAGES.length;
    const badgeMap = { logic: 'badge-logic', causal: 'badge-causal', layers: 'badge-layers', perspective: 'badge-perspective' };
    const typeNames = { logic: '逻辑拆解', causal: '因果链', layers: '层级剥洋葱', perspective: '视角转换' };

    let html = `<div class="page">
      <div class="report-header">
        <div class="report-label">答题正确率</div>
        <div class="report-score">${correct}/${total}</div>
      </div>`;

    STAGES.forEach((s, i) => {
      const d = s.deepen;
      const correctOpt = d.options.find(o => o.correct);
      const answered = state.answers[i];
      const resultIcon = answered === true ? '✅' : answered === false ? '❌' : '⏭️';
      const badgeCls = badgeMap[s.deconstruct.type] || '';
      const typeName = typeNames[s.deconstruct.type] || s.deconstruct.type;

      html += `<div class="report-card">
        <div class="report-card-header">
          <span class="report-card-title">第${i + 1}关 · ${escHtml(s.title)}</span>
          <span class="report-card-badge ${badgeCls}">${typeName}</span>
        </div>
        <div class="report-card-q">${escHtml(d.question)}</div>
        <div class="report-card-insight">${correctOpt ? escHtml(correctOpt.explanation) : ''}</div>
        <div class="report-card-result">${resultIcon} ${answered === true ? '回答正确' : answered === false ? '回答错误' : '未作答'}</div>
        <button class="report-review-btn" onclick="window.__reviewStage(${i})">回看本关</button>
      </div>`;
    });

    html += `<button class="btn btn-secondary btn-block" onclick="window.__toComplete()" style="margin-top:1rem">返回总结</button></div>`;
    app.innerHTML = html;
  }

  // ========== Review Page ==========
  window.__reviewStage = function (idx) {
    state.reviewStage = idx;
    state.step = 'review';
    render();
  };

  function renderReview() {
    const s = STAGES[state.reviewStage];
    const d = s.deepen;
    const correctOpt = d.options.find(o => o.correct);

    let html = `<div class="page">
      <h2 class="section-title">第${state.reviewStage + 1}关 · ${escHtml(s.title)}</h2>

      <div class="review-section">
        <div class="review-section-title">📖 场景</div>
        <div class="review-text">${escHtml(s.scene.narration)}</div>
        <div class="review-dialogue">`;

    s.scene.dialogue.forEach(dl => {
      html += `<div class="review-dialogue-line"><span class="review-dialogue-speaker">${escHtml(dl.speaker)}：</span>${escHtml(dl.text)}</div>`;
    });

    html += `</div></div>

      <div class="review-section">
        <div class="review-section-title">🔍 拆解</div>
        <div class="review-text">${escHtml(s.deconstruct.instruction)}</div>
      </div>

      <div class="review-section">
        <div class="review-section-title">🧠 深化</div>
        <div class="review-text" style="font-weight:700;margin-bottom:0.5rem">${escHtml(d.question)}</div>
        <div class="review-text" style="color:var(--success)">✅ ${correctOpt ? escHtml(correctOpt.text) : ''}</div>
        <div class="review-text" style="font-size:0.85rem;color:#666;margin-top:0.3rem">${correctOpt ? escHtml(correctOpt.explanation) : ''}</div>
      </div>

      <div class="review-section">
        <div class="review-section-title">${s.growth.emoji} 成长</div>
        <div class="review-text">${escHtml(s.growth.narration)}</div>
      </div>

      <button class="btn btn-secondary btn-block" onclick="window.__backFromReview()">返回</button>
    </div>`;
    app.innerHTML = html;
  }

  window.__backFromReview = function () {
    state.step = state.answers.length >= STAGES.length ? 'report' : 'complete';
    render();
  };

  // ========== Utils ==========
  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ========== Init ==========
  loadData();
})();
