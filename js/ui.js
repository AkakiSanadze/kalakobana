/**
 * ქალაქობანა — UI Controller & Interaction Engine
 * Pure Vanilla JavaScript (ES2020+)
 */

(function() {
  'use strict';

  // Dependencies from window
  const config = window.KALAKOBANA_CONFIG;
  const storage = window.KALAKOBANA_STORAGE;
  const validator = window.KALAKOBANA_VALIDATOR;
  const game = window.KALAKOBANA_GAME;
  const audio = window.KALAKOBANA_AUDIO;
  const letters = window.KALAKOBANA_LETTERS;
  const datasets = window.KALAKOBANA_DATA || {};

  // Engine instance
  let gameEngine = null;
  let activeInputs = {};
  let debounceTimers = {};

  // DOM Elements
  const screens = {
    home: document.getElementById('screen-home'),
    countdown: document.getElementById('screen-countdown'),
    round: document.getElementById('screen-round'),
    review: document.getElementById('screen-review'),
    results: document.getElementById('screen-results'),
    gameover: document.getElementById('screen-gameover')
  };

  const dialogs = {
    settings: document.getElementById('dialog-settings'),
    stats: document.getElementById('dialog-stats'),
    dict: document.getElementById('dialog-dict'),
    rules: document.getElementById('dialog-rules')
  };

  // --- Initialization ---
  function initApp() {
    // 1. Initialize Validator Index with datasets & custom dictionary
    const customWords = storage.getCustomDictionary();
    validator.initIndex(datasets, customWords);
    console.log(`Validator indexed ${validator.getWordIndexSize()} words and aliases.`);

    // 2. Setup audio & theme
    const settings = storage.getSettings();
    audio.setMuted(!settings.soundEnabled);
    updateSoundIcon(!settings.soundEnabled);
    applyTheme(settings.theme);

    // 3. Instantiate Game Engine
    gameEngine = new game.GameEngine();
    gameEngine.onStateChange = handleGameStateChange;
    gameEngine.onTimerTick = handleTimerTick;

    // 4. Setup Event Listeners
    setupNavEvents();
    setupHomeEvents();
    setupRoundEvents();
    setupReviewEvents();
    setupResultsEvents();
    setupGameOverEvents();
    setupDialogEvents();
    setupVirtualKeyboardSafety();

    // 5. Check Session Recovery
    checkSessionRecovery();
  }

  // --- Screen Navigation ---
  function showScreen(screenKey) {
    for (const [key, el] of Object.entries(screens)) {
      if (key === screenKey) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
    window.scrollTo(0, 0);
  }

  function openDialog(dialogId) {
    const d = dialogs[dialogId] || document.getElementById(dialogId);
    if (d && typeof d.showModal === 'function') {
      d.showModal();
      if (audio) audio.playClick();
    }
  }

  function closeDialog(dialogId) {
    const d = dialogs[dialogId] || document.getElementById(dialogId);
    if (d && typeof d.close === 'function') {
      d.close();
    }
  }

  // --- Theme & Sound ---
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const settings = storage.getSettings();
    let next = 'dark';
    if (cur === 'dark') next = 'light';
    else if (cur === 'light') next = 'auto';
    else next = 'dark';

    settings.theme = next;
    storage.saveSettings(settings);
    applyTheme(next);
  }

  function toggleSound() {
    const isMuted = !audio.getMuted();
    audio.setMuted(isMuted);
    const settings = storage.getSettings();
    settings.soundEnabled = !isMuted;
    storage.saveSettings(settings);
    updateSoundIcon(isMuted);
    if (!isMuted) audio.playClick();
  }

  function updateSoundIcon(isMuted) {
    const icon = document.getElementById('sound-icon');
    if (icon) {
      icon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  // --- Navigation & Header Events ---
  function setupNavEvents() {
    document.getElementById('brand-home-btn').addEventListener('click', () => {
      if (gameEngine && (gameEngine.state === 'ROUND_ACTIVE' || gameEngine.state === 'COUNTDOWN')) {
        if (!confirm('რაუნდი მიმდინარეობს. ნამდვილად გსურთ მთავარ მენიუში დაბრუნება?')) {
          return;
        }
        gameEngine.stopTimer();
      }
      showScreen('home');
    });

    document.getElementById('btn-sound-toggle').addEventListener('click', toggleSound);
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      populateSettingsDialog();
      openDialog('settings');
    });
  }

  // --- Home Menu Events ---
  function setupHomeEvents() {
    document.getElementById('btn-play-game').addEventListener('click', () => {
      if (audio) audio.playClick();
      gameEngine.startNewGame();
    });

    const soloBtn = document.getElementById('btn-play-solo');
    if (soloBtn) {
      soloBtn.addEventListener('click', () => {
        if (audio) audio.playClick();
        gameEngine.startNewGame({ botCount: 0 });
      });
    }

    document.getElementById('btn-menu-dict').addEventListener('click', () => {
      openDictionaryDialog();
    });

    document.getElementById('btn-menu-stats').addEventListener('click', () => {
      renderStatsDialog();
      openDialog('stats');
    });

    document.getElementById('btn-menu-rules').addEventListener('click', () => {
      openDialog('rules');
    });

    document.getElementById('btn-menu-settings').addEventListener('click', () => {
      populateSettingsDialog();
      openDialog('settings');
    });
  }

  // --- Game State Handling ---
  function handleGameStateChange(state, engine) {
    switch (state) {
      case 'COUNTDOWN':
        runCountdown(engine);
        break;
      case 'ROUND_ACTIVE':
        setupActiveRoundScreen(engine);
        showScreen('round');
        break;
      case 'ROUND_REVIEW':
        setupReviewScreen(engine);
        showScreen('review');
        break;
      case 'ROUND_RESULTS':
        setupResultsScreen(engine);
        showScreen('results');
        break;
      case 'GAME_OVER':
        setupGameOverScreen(engine);
        showScreen('gameover');
        break;
      case 'IDLE':
      default:
        showScreen('home');
        break;
    }
  }

  // --- Countdown Screen ---
  function runCountdown(engine) {
    showScreen('countdown');
    const letterEl = document.getElementById('countdown-letter');
    const timerEl = document.getElementById('countdown-timer');

    letterEl.textContent = engine.currentLetter;
    let count = 3;
    timerEl.textContent = count;

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        timerEl.textContent = count;
        if (audio) audio.playTone(440, 'triangle', 0.1, 0.08);
      } else if (count === 0) {
        timerEl.textContent = 'დაიწყე!';
        if (audio) audio.playTone(880, 'triangle', 0.2, 0.12);
      } else {
        clearInterval(interval);
        engine.beginActiveRound();
      }
    }, 900);
  }

  // --- Active Round Screen ---
  function setupActiveRoundScreen(engine) {
    const letterBadge = document.getElementById('round-current-letter');
    const roundNumberText = document.getElementById('round-number-text');
    const roundScoreText = document.getElementById('round-current-score');
    const container = document.getElementById('round-categories-container');
    const finishBtn = document.getElementById('btn-finish-round-early');

    letterBadge.textContent = engine.currentLetter;
    const maxRounds = engine.settings.totalRounds;
    roundNumberText.textContent = maxRounds > 0
      ? `რაუნდი ${engine.currentRound}/${maxRounds}`
      : `რაუნდი ${engine.currentRound}`;

    const human = engine.participants.find(p => p.isHuman);
    const curScore = human ? (engine.cumulativeScores[human.id] || 0) : 0;
    roundScoreText.textContent = `სულ: ${curScore} ქულა`;

    // Timer display setup
    const digitsEl = document.getElementById('timer-digits');
    const circleEl = document.getElementById('timer-prog-circle');
    const widgetEl = document.getElementById('timer-widget');

    if (widgetEl) {
      widgetEl.classList.remove('timer-urgent');
    }

    if (engine.totalRoundDurationSec === 0) {
      if (digitsEl) {
        digitsEl.textContent = '∞';
        digitsEl.style.fontSize = '1.3rem';
      }
      if (circleEl) {
        circleEl.style.strokeDashoffset = '0';
      }
      if (widgetEl) {
        widgetEl.setAttribute('title', 'უსასრულო დრო (ულიმიტო)');
      }
    } else {
      if (digitsEl) {
        digitsEl.textContent = engine.totalRoundDurationSec;
        digitsEl.style.fontSize = '';
      }
      if (circleEl) {
        circleEl.style.strokeDashoffset = '0';
      }
      if (widgetEl) {
        widgetEl.setAttribute('title', `დარჩენილი დრო: ${engine.totalRoundDurationSec} წმ`);
      }
    }

    finishBtn.classList.remove('all-filled');
    activeInputs = {};

    // Clear and build category inputs
    container.innerHTML = '';
    const activeCats = engine.settings.activeCategories;

    activeCats.forEach((catId, index) => {
      const catMeta = config.ALL_CATEGORIES.find(c => c.id === catId) || {
        id: catId,
        label: catId,
        icon: '📝',
        description: ''
      };

      const card = document.createElement('div');
      card.className = 'category-card';
      card.dataset.categoryId = catId;

      card.innerHTML = `
        <div class="category-header">
          <div class="category-title-wrap">
            <span class="category-icon">${catMeta.icon}</span>
            <span class="category-name">${catMeta.label}</span>
          </div>
          <div class="category-indicator" id="indicator-${catId}">⚪</div>
        </div>
        <div class="input-wrap">
          <input type="text"
                 class="word-input"
                 id="input-${catId}"
                 data-category="${catId}"
                 placeholder="${catMeta.label} („${engine.currentLetter}“-ზე)"
                 autocomplete="off"
                 autocapitalize="none"
                 spellcheck="false"
                 enterkeyhint="${index === activeCats.length - 1 ? 'done' : 'next'}">
        </div>
        <div class="category-hint" id="hint-${catId}">
          <span>${catMeta.description || ''}</span>
        </div>
      `;

      container.appendChild(card);
      activeInputs[catId] = card.querySelector('input');
    });

    // Attach input listeners
    activeCats.forEach((catId, idx) => {
      const input = activeInputs[catId];
      input.addEventListener('input', (e) => {
        handleLiveFieldInput(catId, e.target.value, engine);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const nextCatId = activeCats[idx + 1];
          if (nextCatId && activeInputs[nextCatId]) {
            activeInputs[nextCatId].focus();
          } else {
            input.blur();
          }
        }
      });
    });

    updateProgressCount(engine);

    // Auto-focus first input after small delay
    setTimeout(() => {
      const firstInput = activeInputs[activeCats[0]];
      if (firstInput) firstInput.focus();
    }, 150);
  }

  function handleLiveFieldInput(catId, val, engine) {
    engine.setPlayerInput(catId, val);

    // Debounce live validation indicator
    clearTimeout(debounceTimers[catId]);
    debounceTimers[catId] = setTimeout(() => {
      validateSingleFieldUI(catId, val, engine);
      updateProgressCount(engine);
    }, 180);
  }

  function validateSingleFieldUI(catId, val, engine) {
    const otherWords = engine.settings.activeCategories
      .filter(cid => cid !== catId)
      .map(cid => engine.playerAnswers[cid] || '')
      .filter(Boolean);

    const res = validator.validateInput({
      category: catId,
      word: val,
      letter: engine.currentLetter,
      otherInputs: otherWords,
      mode: engine.settings.validationMode
    });

    const indicator = document.getElementById(`indicator-${catId}`);
    const input = document.getElementById(`input-${catId}`);
    const hint = document.getElementById(`hint-${catId}`);

    if (!indicator || !input || !hint) return;

    // Reset indicator classes
    indicator.className = 'category-indicator';
    input.classList.remove('input-valid', 'input-invalid', 'input-warning');
    hint.className = 'category-hint';

    if (res.status === 'empty') {
      indicator.textContent = '⚪';
      const catMeta = config.ALL_CATEGORIES.find(c => c.id === catId);
      hint.innerHTML = `<span>${catMeta ? catMeta.description : ''}</span>`;
    } else if (res.status === 'valid') {
      indicator.textContent = '✓';
      indicator.classList.add('indicator-valid');
      input.classList.add('input-valid');
      hint.classList.add('hint-success');
      hint.innerHTML = `<span>✓ ${res.message}</span>`;
    } else if (res.status === 'unknown') {
      indicator.textContent = '❓';
      indicator.classList.add('indicator-unknown');
      input.classList.add('input-warning');
      hint.innerHTML = `<span>❓ ${res.message}</span>`;
    } else if (res.status === 'duplicate') {
      indicator.textContent = '⚠️';
      indicator.classList.add('indicator-duplicate');
      input.classList.add('input-warning');
      hint.classList.add('hint-error');
      hint.innerHTML = `<span>⚠️ ${res.message}</span>`;
    } else {
      indicator.textContent = '✗';
      indicator.classList.add('indicator-invalid');
      input.classList.add('input-invalid');
      hint.classList.add('hint-error');
      hint.innerHTML = `<span>✗ ${res.message}</span>`;
    }
  }

  function updateProgressCount(engine) {
    const cats = engine.settings.activeCategories;
    let filled = 0;
    for (const c of cats) {
      if ((engine.playerAnswers[c] || '').trim().length >= 2) {
        filled++;
      }
    }

    const progressEl = document.getElementById('round-progress-count');
    const finishBtn = document.getElementById('btn-finish-round-early');

    if (progressEl) {
      progressEl.textContent = `${filled}/${cats.length}`;
    }

    const headerFinishBtn = document.getElementById('btn-finish-round-header');

    if (finishBtn) {
      if (filled === cats.length) {
        finishBtn.classList.add('all-filled');
      } else {
        finishBtn.classList.remove('all-filled');
      }
    }

    if (headerFinishBtn) {
      if (filled === cats.length) {
        headerFinishBtn.classList.add('all-filled');
      } else {
        headerFinishBtn.classList.remove('all-filled');
      }
    }
  }

  // --- Timer Tick Handler ---
  function handleTimerTick(timeRemainingSec, totalDurationSec) {
    const digitsEl = document.getElementById('timer-digits');
    const circleEl = document.getElementById('timer-prog-circle');
    const widgetEl = document.getElementById('timer-widget');

    if (totalDurationSec === 0) {
      if (digitsEl) {
        digitsEl.textContent = '∞';
        digitsEl.style.fontSize = '1.3rem';
      }
      if (circleEl) circleEl.style.strokeDashoffset = '0';
      if (widgetEl) widgetEl.classList.remove('timer-urgent');
      return;
    }

    if (digitsEl) digitsEl.textContent = timeRemainingSec;

    if (totalDurationSec > 0 && circleEl) {
      const totalDash = 119.38; // 2 * PI * 19
      const fraction = Math.max(0, timeRemainingSec / totalDurationSec);
      const offset = totalDash - (fraction * totalDash);
      circleEl.style.strokeDashoffset = offset;
    }

    if (widgetEl) {
      if (timeRemainingSec <= 10 && timeRemainingSec > 0) {
        widgetEl.classList.add('timer-urgent');
      } else {
        widgetEl.classList.remove('timer-urgent');
      }
    }
  }

  function setupRoundEvents() {
    const finishAction = () => {
      gameEngine.playerFinishEarly();
    };
    document.getElementById('btn-finish-round-early').addEventListener('click', finishAction);
    const headerFinishBtn = document.getElementById('btn-finish-round-header');
    if (headerFinishBtn) {
      headerFinishBtn.addEventListener('click', finishAction);
    }
  }

  // --- Review Screen (Self-Confirmation) ---
  function setupReviewScreen(engine) {
    const container = document.getElementById('review-items-container');
    container.innerHTML = '';

    const items = engine.pendingReviewItems;

    items.forEach((item, index) => {
      const catMeta = config.ALL_CATEGORIES.find(c => c.id === item.categoryId) || { label: item.categoryId };
      const row = document.createElement('div');
      row.className = 'review-item';
      row.innerHTML = `
        <div class="review-word-title">„${item.word}“</div>
        <div class="review-cat-badge">კატეგორია: ${catMeta.label} (ასო: ${item.letter})</div>
        <div class="review-decision-btns">
          <button class="btn btn-sm btn-success review-btn-approve" data-index="${index}">
            ✓ სწორია (+10/20)
          </button>
          <button class="btn btn-sm btn-secondary review-btn-reject" data-index="${index}">
            ✗ შეცდომაა (0)
          </button>
        </div>
        <label class="review-opt-label">
          <input type="checkbox" class="review-cb-add" data-index="${index}" checked>
          სიტყვის დამატება ჩემს ლექსიკონში
        </label>
      `;

      container.appendChild(row);
    });

    // Attach click toggles
    container.querySelectorAll('.review-btn-approve').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.review-item');
        itemEl.dataset.decision = 'approve';
        itemEl.querySelector('.review-btn-approve').className = 'btn btn-sm btn-success';
        itemEl.querySelector('.review-btn-reject').className = 'btn btn-sm btn-secondary';
      });
    });

    container.querySelectorAll('.review-btn-reject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.review-item');
        itemEl.dataset.decision = 'reject';
        itemEl.querySelector('.review-btn-approve').className = 'btn btn-sm btn-secondary';
        itemEl.querySelector('.review-btn-reject').className = 'btn btn-sm btn-danger';
      });
    });
  }

  function setupReviewEvents() {
    document.getElementById('btn-confirm-review').addEventListener('click', () => {
      const container = document.getElementById('review-items-container');
      const itemEls = container.querySelectorAll('.review-item');
      const decisions = [];

      itemEls.forEach((el, idx) => {
        const orig = gameEngine.pendingReviewItems[idx];
        const isApproved = el.dataset.decision !== 'reject'; // default approve
        const cb = el.querySelector('.review-cb-add');
        const addToDict = cb ? cb.checked : false;

        decisions.push({
          categoryId: orig.categoryId,
          word: orig.word,
          approved: isApproved,
          addToDict: isApproved && addToDict
        });
      });

      if (audio) audio.playClick();
      gameEngine.resolveReviewDecisions(decisions);
    });
  }

  // --- Results Screen ---
  function setupResultsScreen(engine) {
    const roundIdx = engine.roundHistory.length - 1;
    const roundData = engine.roundHistory[roundIdx];
    if (!roundData) return;

    const winnerBanner = document.getElementById('results-round-winner-text');
    const scoresGrid = document.getElementById('results-participants-scores');
    const tableContainer = document.getElementById('results-table-container');
    const nextRoundBtn = document.getElementById('btn-next-round');

    // Winner text
    if (engine.participants.length === 1) {
      const human = engine.participants[0];
      const pts = roundData.roundScores[human.id] ? roundData.roundScores[human.id].totalPoints : 0;
      winnerBanner.textContent = `რაუნდი დასრულდა! (+${pts} ქულა) ✨`;
    } else if (roundData.winnerId) {
      const winner = engine.participants.find(p => p.id === roundData.winnerId);
      winnerBanner.textContent = winner
        ? `${winner.name}-მ მოიგო ეს რაუნდი! 🏆`
        : 'რაუნდი დასრულდა!';
    } else {
      winnerBanner.textContent = 'რაუნდი ფრედ დასრულდა! 🤝';
    }

    // Participant Score Cards
    scoresGrid.innerHTML = '';
    for (const p of engine.participants) {
      const isWinner = p.id === roundData.winnerId;
      const roundPts = roundData.roundScores[p.id] ? roundData.roundScores[p.id].totalPoints : 0;
      const totalPts = engine.cumulativeScores[p.id] || 0;

      const card = document.createElement('div');
      card.className = `player-score-card ${isWinner ? 'is-winner' : ''}`;
      card.innerHTML = `
        <div class="player-score-name">${p.avatar} ${p.name}</div>
        <div class="player-score-pts ${isWinner ? 'winner-pts' : ''}">+${roundPts}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">სულ: ${totalPts}</div>
      `;
      scoresGrid.appendChild(card);
    }

    // Category Results Table
    let tableHtml = `
      <table class="results-table">
        <thead>
          <tr>
            <th>კატეგორია</th>
            ${engine.participants.map(p => `<th>${p.avatar} ${p.name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    for (const catId of engine.settings.activeCategories) {
      const catMeta = config.ALL_CATEGORIES.find(c => c.id === catId) || { label: catId, icon: '' };
      tableHtml += `<tr><td><strong>${catMeta.icon} ${catMeta.label}</strong></td>`;

      for (const p of engine.participants) {
        const catRes = (roundData.categoryResults[catId] && roundData.categoryResults[catId][p.id]) || {
          word: '',
          isValid: false,
          points: 0
        };

        const ptClass = `pt-${catRes.points}`;
        const wordText = catRes.word || '<span style="color:var(--text-muted);">-</span>';

        tableHtml += `
          <td>
            ${wordText}
            <span class="res-pt-pill ${ptClass}">+${catRes.points}</span>
          </td>
        `;
      }
      tableHtml += `</tr>`;
    }

    tableHtml += `</tbody></table>`;
    tableContainer.innerHTML = tableHtml;

    // Next round or Game Over
    const maxRounds = engine.settings.totalRounds || 0;
    if (maxRounds > 0 && engine.currentRound >= maxRounds) {
      nextRoundBtn.textContent = 'საბოლოო შედეგები 🏆';
    } else {
      nextRoundBtn.textContent = 'შემდეგი რაუნდი ▶️';
    }
  }

  function setupResultsEvents() {
    document.getElementById('btn-next-round').addEventListener('click', () => {
      if (audio) audio.playClick();
      gameEngine.proceedFromResults();
    });
  }

  // --- Game Over Screen & Confetti ---
  function setupGameOverScreen(engine) {
    const trophy = document.getElementById('gameover-trophy');
    const title = document.getElementById('gameover-title');
    const subtitle = document.getElementById('gameover-subtitle');
    const leaderboard = document.getElementById('gameover-leaderboard');

    // Sort participants by score descending
    const sorted = [...engine.participants].sort((a, b) => {
      return (engine.cumulativeScores[b.id] || 0) - (engine.cumulativeScores[a.id] || 0);
    });

    const human = engine.participants.find(p => p.isHuman);
    const humanWon = sorted[0] && sorted[0].isHuman;

    const isSolo = engine.participants.length === 1;
    if (isSolo) {
      trophy.textContent = '🏆';
      title.textContent = 'თამაში დასრულდა!';
      subtitle.textContent = `თქვენ დააგროვეთ სულ ${engine.cumulativeScores[human.id] || 0} ქულა!`;
      startConfetti();
    } else if (humanWon) {
      trophy.textContent = '🥇';
      title.textContent = 'გილოცავ! შენ გაიმარჯვე!';
      subtitle.textContent = `საუკეთესო შედეგი: ${engine.cumulativeScores[human.id]} ქულა`;
      startConfetti();
    } else {
      trophy.textContent = '🥈';
      title.textContent = 'თამაში დასრულდა!';
      subtitle.textContent = `გამარჯვებულია ${sorted[0].name} (${engine.cumulativeScores[sorted[0].id]} ქულა)`;
    }

    const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

    leaderboard.innerHTML = '';
    sorted.forEach((p, idx) => {
      const score = engine.cumulativeScores[p.id] || 0;
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `
        <div class="leaderboard-rank">${rankEmojis[idx] || (idx + 1)}</div>
        <div class="leaderboard-user">
          <span>${p.avatar}</span>
          <span>${p.name} ${p.isHuman ? '(შენ)' : ''}</span>
        </div>
        <div class="leaderboard-score">${score} ქულა</div>
      `;
      leaderboard.appendChild(row);
    });
  }

  function setupGameOverEvents() {
    document.getElementById('btn-gameover-play-again').addEventListener('click', () => {
      if (audio) audio.playClick();
      stopConfetti();
      gameEngine.startNewGame({ botCount: gameEngine.settings.botCount });
    });

    document.getElementById('btn-gameover-to-home').addEventListener('click', () => {
      if (audio) audio.playClick();
      stopConfetti();
      showScreen('home');
    });
  }

  // --- Confetti Particle System ---
  let confettiInterval = null;
  function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];
    const particles = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngle: 0,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05
      });
    }

    let angle = 0;
    stopConfetti();

    confettiInterval = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(angle + p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(angle);
        p.tilt = Math.sin(p.tiltAngle) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();

        if (p.y > canvas.height) {
          particles[i] = {
            ...p,
            x: Math.random() * canvas.width,
            y: -10
          };
        }
      }
    }, 25);
  }

  function stopConfetti() {
    if (confettiInterval) {
      clearInterval(confettiInterval);
      confettiInterval = null;
    }
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // --- Settings Dialog ---
  function populateSettingsDialog() {
    const settings = storage.getSettings();

    // Duration pills
    setupPillGroup('setting-duration-options', settings.roundDuration, (val) => {
      settings.roundDuration = parseInt(val, 10);
    });

    // Rounds count pills
    setupPillGroup('setting-rounds-options', settings.totalRounds, (val) => {
      settings.totalRounds = parseInt(val, 10);
    });

    // Validation mode pills
    setupPillGroup('setting-validation-options', settings.validationMode, (val) => {
      settings.validationMode = val;
    });

    // Bot count pills
    const diffGroup = document.getElementById('setting-group-bot-difficulty');
    const updateDiffVisibility = (count) => {
      if (diffGroup) {
        diffGroup.style.display = count === 0 ? 'none' : 'block';
      }
    };
    updateDiffVisibility(settings.botCount);

    setupPillGroup('setting-bot-count-options', settings.botCount, (val) => {
      settings.botCount = parseInt(val, 10);
      updateDiffVisibility(settings.botCount);
    });

    // Bot difficulty pills
    setupPillGroup('setting-bot-diff-options', settings.botDifficulty, (val) => {
      settings.botDifficulty = val;
    });

    // Categories checkboxes
    const catGrid = document.getElementById('setting-categories-grid');
    catGrid.innerHTML = '';

    config.ALL_CATEGORIES.forEach(cat => {
      const isChecked = settings.activeCategories.includes(cat.id);
      const label = document.createElement('label');
      label.className = 'category-checkbox-item';
      label.innerHTML = `
        <input type="checkbox" value="${cat.id}" ${isChecked ? 'checked' : ''}>
        <span>${cat.icon} ${cat.label}</span>
      `;

      label.querySelector('input').addEventListener('change', () => {
        const checkedBoxes = Array.from(catGrid.querySelectorAll('input:checked'));
        if (checkedBoxes.length < 3) {
          alert('მინიმუმ 3 კატეგორია უნდა იყოს არჩეული!');
          label.querySelector('input').checked = true;
          return;
        }
        settings.activeCategories = checkedBoxes.map(cb => cb.value);
      });

      catGrid.appendChild(label);
    });

    document.getElementById('btn-save-settings').onclick = () => {
      storage.saveSettings(settings);
      if (gameEngine) {
        gameEngine.settings = { ...gameEngine.settings, ...settings };
      }
      closeDialog('settings');
    };
  }

  function setupPillGroup(groupId, currentVal, onSelect) {
    const group = document.getElementById(groupId);
    if (!group) return;
    const pills = group.querySelectorAll('.option-pill');
    pills.forEach(pill => {
      const val = pill.dataset.val;
      if (String(val) === String(currentVal)) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }

      pill.onclick = () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        onSelect(val);
      };
    });
  }

  // --- Stats Dialog ---
  function renderStatsDialog() {
    const stats = storage.getStats();
    const area = document.getElementById('stats-content-area');

    const winRate = stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

    area.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
        <div class="player-score-card">
          <div class="player-score-name">ჩატარებული თამაში</div>
          <div class="player-score-pts">${stats.gamesPlayed}</div>
        </div>
        <div class="player-score-card">
          <div class="player-score-name">მოგებული თამაში</div>
          <div class="player-score-pts" style="color: var(--success);">${stats.gamesWon} (${winRate}%)</div>
        </div>
        <div class="player-score-card">
          <div class="player-score-name">საუკეთესო თამაში</div>
          <div class="player-score-pts" style="color: var(--warning);">${stats.highestGameScore} ქულა</div>
        </div>
        <div class="player-score-card">
          <div class="player-score-name">საუკეთესო რაუნდი</div>
          <div class="player-score-pts" style="color: var(--primary);">${stats.highestRoundScore} ქულა</div>
        </div>
      </div>
      <div style="font-size: 0.9rem; color: var(--text-muted); text-align: center;">
        სულ დაგროვილი ქულები: <strong>${stats.totalPoints}</strong> | დაწერილი სიტყვები: <strong>${stats.wordsCount}</strong>
      </div>
    `;

    document.getElementById('btn-reset-stats').onclick = () => {
      if (confirm('ნამდვილად გსურთ სტატისტიკის განულება?')) {
        storage.resetStats();
        renderStatsDialog();
      }
    };
  }

  // --- Dictionary Dialog ---
  function openDictionaryDialog() {
    const catSelect = document.getElementById('dict-add-category');
    catSelect.innerHTML = config.ALL_CATEGORIES.map(c => `
      <option value="${c.id}">${c.icon} ${c.label}</option>
    `).join('');

    renderDictionaryList();
    openDialog('dict');

    document.getElementById('dict-search-input').oninput = (e) => {
      renderDictionaryList(e.target.value);
    };

    const form = document.getElementById('dict-add-form');
    document.getElementById('btn-dict-add-word-toggle').onclick = () => {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };

    document.getElementById('btn-dict-save-new-word').onclick = () => {
      const wordInput = document.getElementById('dict-add-word');
      const cat = catSelect.value;
      const word = wordInput.value.trim();
      if (!word) return;

      const added = storage.addCustomWord(cat, word);
      if (added) {
        validator.addEntryToIndex(cat, { w: word, popularity: 5, aliases: [], note: 'მომხმარებლის სიტყვა' }, true);
        wordInput.value = '';
        form.style.display = 'none';
        renderDictionaryList();
        alert('სიტყვა წარმატებით დაემატა!');
      } else {
        alert('ეს სიტყვა უკვე არსებობს თქვენს ლექსიკონში!');
      }
    };

    document.getElementById('btn-dict-export').onclick = () => {
      const json = storage.exportCustomDictionary();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kalakobana_dict_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById('btn-dict-import').onclick = () => {
      document.getElementById('dict-import-file').click();
    };

    document.getElementById('dict-import-file').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const res = storage.importCustomDictionary(ev.target.result);
        if (res.success) {
          // re-init validator index
          validator.initIndex(datasets, storage.getCustomDictionary());
          renderDictionaryList();
          alert(`წარმატებით დაემატა ${res.count} ახალი სიტყვა!`);
        } else {
          alert('ფაილის იმპორტი ვერ მოხერხდა: ' + res.error);
        }
      };
      reader.readAsText(file);
    };
  }

  function renderDictionaryList(filterQuery = '') {
    const listEl = document.getElementById('dict-words-list');
    listEl.innerHTML = '';
    const customWords = storage.getCustomDictionary();

    const cleanQuery = validator.normalizeGeorgian(filterQuery);

    if (customWords.length === 0 && !cleanQuery) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px;">
          თქვენი პირადი ლექსიკონი ცარიელია.<br>
          დაამატეთ ახალი სიტყვები ზემოთ მოცემული ღილაკით!
        </div>
      `;
      return;
    }

    // Filter custom words
    const filtered = customWords.filter(item => {
      if (!cleanQuery) return true;
      return validator.normalizeGeorgian(item.word).includes(cleanQuery);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 20px;">
          სიტყვა ვერ მოიძებნა
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const catMeta = config.ALL_CATEGORIES.find(c => c.id === item.category) || { label: item.category };
      const card = document.createElement('div');
      card.className = 'dict-word-card';
      card.innerHTML = `
        <div>
          <strong style="font-size: 1.05rem;">${item.word}</strong>
          <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">(${catMeta.label})</span>
        </div>
        <button class="icon-btn btn-del-word" data-id="${item.id}" style="color: var(--danger); font-size: 1rem;">
          🗑️
        </button>
      `;

      card.querySelector('.btn-del-word').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        storage.removeCustomWord(id);
        renderDictionaryList(filterQuery);
      });

      listEl.appendChild(card);
    });
  }

  // --- Dialog Events Helper ---
  function setupDialogEvents() {
    document.querySelectorAll('[data-close-dialog]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dialogId = btn.dataset.closeDialog;
        closeDialog(dialogId);
      });
    });

    // Close on backdrop click
    document.querySelectorAll('dialog').forEach(d => {
      d.addEventListener('click', (e) => {
        const rect = d.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          d.close();
        }
      });
    });
  }

  // --- Virtual Keyboard Safety ---
  function setupVirtualKeyboardSafety() {
    let scrollTimeout = null;

    document.addEventListener('focusin', (e) => {
      if (e.target && e.target.classList.contains('word-input')) {
        document.body.classList.add('keyboard-open');
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    });

    document.addEventListener('focusout', (e) => {
      if (e.target && e.target.classList.contains('word-input')) {
        setTimeout(() => {
          if (!document.activeElement || !document.activeElement.classList.contains('word-input')) {
            document.body.classList.remove('keyboard-open');
          }
        }, 120);
      }
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        if (!document.activeElement || !document.activeElement.classList.contains('word-input')) {
          document.body.classList.remove('keyboard-open');
        }
      });
    }
  }

  // --- Session Recovery Check ---
  function checkSessionRecovery() {
    const saved = storage.getActiveRound();
    if (saved && saved.history && saved.history.length > 0) {
      // If user had a game in progress and refreshed
      const restore = confirm('ნაპოვნია შეწყვეტილი თამაში. გსურთ გაგრძელება?');
      if (restore) {
        if (saved.settings) gameEngine.settings = { ...gameEngine.settings, ...saved.settings };
        if (saved.participants) gameEngine.participants = saved.participants;
        gameEngine.roundHistory = saved.history;
        gameEngine.cumulativeScores = saved.cumulativeScores || {};
        gameEngine.currentRound = saved.round || 1;
        gameEngine.transitionState('ROUND_RESULTS');
      } else {
        storage.clearActiveRound();
      }
    }
  }

  // Boot app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
