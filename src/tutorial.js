/* =========================================================
   Terra Chronicle — Tutorial System
   Elegant game-style hints that teach mechanics naturally
   ========================================================= */
'use strict';

const Tutorial = (function() {
  const STORAGE_KEY = 'terra_tutorial_progress';

  // Tutorial state
  let state = {
    completed: false,
    currentStep: 0,
    stepsShown: new Set(),
    dismissed: false
  };

  // Tutorial steps configuration
  const STEPS = {
    WELCOME: {
      id: 'welcome',
      trigger: 'immediate',
      duration: 8000,
      position: 'center',
      content: {
        title: '欢迎来到大地编年史',
        body: '远古灵脉苏醒，四季轮转不息。<br>作为拓荒者，在此耕种、锻造、探索。',
        hint: '点击或等待自动消失'
      }
    },
    MOVEMENT: {
      id: 'movement',
      trigger: 'afterWelcome',
      duration: 8000,
      position: 'bottom',
      content: {
        title: '行走大地',
        body: '使用 <b>WASD</b> 或 <b>方向键</b> 移动<br>点击地面可自动寻路前往',
        hint: '试着移动一下'
      }
    },
    HARVEST: {
      id: 'harvest',
      trigger: 'nearCrop',
      duration: 8000,
      position: 'top',
      content: {
        title: '收获作物',
        body: '走近成熟的作物，按 <b>空格</b> 收获<br>星麦品质继承土地肥力',
        hint: '右键点击耕地查看地籍档案'
      },
      glow: true
    },
    ALCHEMY: {
      id: 'alchemy',
      trigger: 'canCraft',
      duration: 10000,
      position: 'bottom',
      content: {
        title: '炼金工坊解锁',
        body: '集齐 <b>星麦×3</b> + <b>木材×1</b><br>可在工坊锻造第一张卡牌',
        hint: '点击底部的「炼金·炼制卡牌」按钮'
      },
      glow: true
    },
    PORTAL: {
      id: 'portal',
      trigger: 'hasCard',
      duration: 10000,
      position: 'top',
      content: {
        title: '深渊之门',
        body: '东北角的传送门已开启<br>携卡牌进入，挑战深渊守护者',
        hint: '点击地图前往传送门'
      }
    }
  };

  // Load progress from localStorage
  function loadProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        state.completed = data.completed || false;
        state.dismissed = data.dismissed || false;
        state.stepsShown = new Set(data.stepsShown || []);
      }
    } catch (e) {
      console.warn('[Tutorial] Failed to load progress:', e);
    }
  }

  // Save progress to localStorage
  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completed: state.completed,
        dismissed: state.dismissed,
        stepsShown: Array.from(state.stepsShown)
      }));
    } catch (e) {
      console.warn('[Tutorial] Failed to save progress:', e);
    }
  }

  // Create hint box element
  function createHintBox(step) {
    const box = document.createElement('div');
    box.className = 'tutorial-hint';
    box.dataset.position = step.position || 'center';

    const inner = document.createElement('div');
    inner.className = 'tutorial-inner';

    // Decorative corners
    inner.innerHTML = `
      <div class="tutorial-corner tl"></div>
      <div class="tutorial-corner tr"></div>
      <div class="tutorial-corner bl"></div>
      <div class="tutorial-corner br"></div>
      <div class="tutorial-content">
        <div class="tutorial-title">${step.content.title}</div>
        <div class="tutorial-body">${step.content.body}</div>
        <div class="tutorial-hint">${step.content.hint}</div>
      </div>
    `;

    // Add skip button on first hint
    if (step.id === 'welcome' && !state.dismissed) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'tutorial-skip';
      skipBtn.textContent = '跳过教学';
      skipBtn.onclick = (e) => {
        e.stopPropagation();
        skipTutorial();
      };
      inner.appendChild(skipBtn);
    }

    box.appendChild(inner);
    return box;
  }

  // Show hint with animation
  function showHint(stepKey) {
    if (state.dismissed || state.completed) return;
    if (state.stepsShown.has(stepKey)) return;

    const step = STEPS[stepKey];
    if (!step) return;

    // Mark as shown
    state.stepsShown.add(stepKey);
    saveProgress();

    // Create and add hint box
    const box = createHintBox(step);
    document.body.appendChild(box);

    // Add glow effect to target element
    if (step.glow && stepKey === 'ALCHEMY') {
      const craftBtn = document.getElementById('craftBtn');
      if (craftBtn) craftBtn.classList.add('tutorial-glow');
    }

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      box.classList.add('show');
    });

    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      dismissHint(box);
    }, step.duration);

    // Manual dismiss on click
    box.onclick = () => {
      clearTimeout(dismissTimer);
      dismissHint(box);
    };

    // Play notification sound
    if (window.TerraSound) {
      TerraSound.play('whoosh', 0.5);
    }
  }

  // Dismiss hint with animation
  function dismissHint(box) {
    box.classList.remove('show');
    box.classList.add('hide');

    // Remove glow effect
    const craftBtn = document.getElementById('craftBtn');
    if (craftBtn) craftBtn.classList.remove('tutorial-glow');

    setTimeout(() => {
      if (box.parentNode) box.parentNode.removeChild(box);
    }, 600);
  }

  // Skip entire tutorial
  function skipTutorial() {
    state.dismissed = true;
    state.completed = true;
    saveProgress();

    // Remove all active hints
    document.querySelectorAll('.tutorial-hint').forEach(box => {
      dismissHint(box);
    });

    // Remove glow effects
    const craftBtn = document.getElementById('craftBtn');
    if (craftBtn) craftBtn.classList.remove('tutorial-glow');

    if (window.TerraSound) {
      TerraSound.play('click');
    }
  }

  // Check and trigger tutorials based on game state
  function checkTriggers(context) {
    if (state.dismissed || state.completed) return;

    const { hasEntered, hasMoved, nearCrop, canCraft, hasCard } = context;

    // Welcome message - show immediately after entering world
    if (hasEntered && !state.stepsShown.has('welcome')) {
      setTimeout(() => showHint('WELCOME'), 1000);
    }

    // Movement hint - show after welcome
    if (state.stepsShown.has('welcome') && !state.stepsShown.has('movement')) {
      setTimeout(() => showHint('MOVEMENT'), 2000);
    }

    // Harvest hint - when near harvestable crop
    if (hasMoved && nearCrop && !state.stepsShown.has('harvest')) {
      showHint('HARVEST');
    }

    // Alchemy hint - when can craft first card
    if (canCraft && !state.stepsShown.has('alchemy')) {
      showHint('ALCHEMY');
    }

    // Portal hint - when has first card
    if (hasCard && !state.stepsShown.has('portal')) {
      showHint('PORTAL');
      // Mark tutorial as completed
      state.completed = true;
      saveProgress();
    }
  }

  // Initialize tutorial system
  function init() {
    loadProgress();
    injectStyles();
  }

  // Inject CSS styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .tutorial-hint {
        position: fixed;
        z-index: 100;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transition: opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1),
                    transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
      }

      .tutorial-hint.show {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .tutorial-hint.hide {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
        transition: opacity 0.4s, transform 0.4s;
      }

      .tutorial-hint[data-position="center"] {
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) translateY(20px) scale(0.95);
      }

      .tutorial-hint[data-position="center"].show {
        transform: translate(-50%, -50%) translateY(0) scale(1);
      }

      .tutorial-hint[data-position="top"] {
        left: 50%;
        top: 140px;
        transform: translate(-50%, 0) translateY(20px) scale(0.95);
      }

      .tutorial-hint[data-position="top"].show {
        transform: translate(-50%, 0) translateY(0) scale(1);
      }

      .tutorial-hint[data-position="bottom"] {
        left: 50%;
        bottom: 180px;
        transform: translate(-50%, 0) translateY(20px) scale(0.95);
      }

      .tutorial-hint[data-position="bottom"].show {
        transform: translate(-50%, 0) translateY(0) scale(1);
      }

      .tutorial-inner {
        position: relative;
        background: linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);
        border: 3px double #8b7355;
        border-radius: 12px;
        padding: 32px 40px;
        min-width: 420px;
        max-width: min(520px, 90vw);
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5),
                    inset 0 0 40px rgba(139, 115, 85, 0.08);
        cursor: pointer;
      }

      .tutorial-corner {
        position: absolute;
        width: 28px;
        height: 28px;
        pointer-events: none;
      }

      .tutorial-corner.tl {
        top: 10px;
        left: 10px;
        border-left: 2px solid #d4af37;
        border-top: 2px solid #d4af37;
      }

      .tutorial-corner.tr {
        top: 10px;
        right: 10px;
        border-right: 2px solid #d4af37;
        border-top: 2px solid #d4af37;
      }

      .tutorial-corner.bl {
        bottom: 10px;
        left: 10px;
        border-left: 2px solid #d4af37;
        border-bottom: 2px solid #d4af37;
      }

      .tutorial-corner.br {
        bottom: 10px;
        right: 10px;
        border-right: 2px solid #d4af37;
        border-bottom: 2px solid #d4af37;
      }

      .tutorial-content {
        font-family: 'Cormorant Garamond', serif;
        color: #2a2520;
        text-align: center;
      }

      .tutorial-title {
        font-size: 28px;
        font-weight: 600;
        letter-spacing: 0.18em;
        margin-bottom: 16px;
        color: #d4af37;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .tutorial-body {
        font-family: 'Noto Serif SC', serif;
        font-size: 16px;
        line-height: 1.8;
        letter-spacing: 0.08em;
        margin-bottom: 16px;
        opacity: 0.9;
      }

      .tutorial-body b {
        color: #c9a24b;
        font-weight: 600;
      }

      .tutorial-hint {
        font-size: 13px;
        letter-spacing: 0.12em;
        opacity: 0.6;
        font-style: italic;
      }

      .tutorial-skip {
        position: absolute;
        top: 16px;
        right: 18px;
        background: rgba(139, 115, 85, 0.15);
        border: 1.5px solid rgba(139, 115, 85, 0.35);
        border-radius: 6px;
        padding: 6px 14px;
        font-family: 'Noto Serif SC', serif;
        font-size: 12px;
        letter-spacing: 0.12em;
        color: #2a2520;
        cursor: pointer;
        transition: all 0.3s;
        opacity: 0.7;
      }

      .tutorial-skip:hover {
        background: rgba(139, 115, 85, 0.25);
        border-color: #8b7355;
        opacity: 1;
        transform: translateY(-1px);
      }

      /* Pulsing glow effect for highlighted elements */
      @keyframes tutorialGlow {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(201, 162, 75, 0.25),
                      inset 0 1px 0 rgba(255, 255, 255, 0.4),
                      0 0 0 0 rgba(212, 175, 55, 0.4);
        }
        50% {
          box-shadow: 0 6px 20px rgba(201, 162, 75, 0.45),
                      inset 0 1px 0 rgba(255, 255, 255, 0.6),
                      0 0 0 8px rgba(212, 175, 55, 0);
        }
      }

      .tutorial-glow {
        animation: tutorialGlow 2s ease-in-out infinite !important;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .tutorial-inner {
          min-width: auto;
          padding: 28px 32px;
        }

        .tutorial-title {
          font-size: 24px;
        }

        .tutorial-body {
          font-size: 14px;
        }

        .tutorial-hint[data-position="bottom"] {
          bottom: 220px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Public API
  return {
    init,
    checkTriggers,
    skipTutorial,
    reset: function() {
      state = {
        completed: false,
        currentStep: 0,
        stepsShown: new Set(),
        dismissed: false
      };
      saveProgress();
    }
  };
})();

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Tutorial.init());
} else {
  Tutorial.init();
}

// Export for global access
window.Tutorial = Tutorial;
