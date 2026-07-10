/* Terra Chronicle shared surface lifecycle.
 * One modal gameplay surface owns input and body-level transients at a time.
 */
(() => {
  'use strict';

  const registry = new Map();
  let active = null;
  let transitioning = false;

  function safeCall(fn, ...args) {
    if (typeof fn !== 'function') return;
    try { fn(...args); } catch (err) { console.warn('[SurfaceLifecycle]', err); }
  }

  function clearTransientNodes(owner) {
    const selector = owner
      ? `[data-surface-transient="${owner}"], [data-${owner}-transient="1"]`
      : '[data-surface-transient], [data-battle-transient="1"]';
    document.querySelectorAll(selector).forEach(node => node.remove());
  }

  function syncBody() {
    if (active) document.body.dataset.surface = active;
    else delete document.body.dataset.surface;
    document.body.classList.toggle('surface-open', Boolean(active));
    const tutorial = document.getElementById('tutorialOverlay');
    if (tutorial) tutorial.style.visibility = active ? 'hidden' : '';
  }

  function register(name, hooks = {}) {
    registry.set(name, hooks);
    return () => registry.delete(name);
  }

  function beforeOpen(name) {
    if (!name) return;
    if (active && active !== name) {
      const previous = active;
      const hooks = registry.get(previous) || {};
      transitioning = true;
      safeCall(hooks.close, { immediate: true, fromLifecycle: true });
      safeCall(hooks.cleanup);
      clearTransientNodes(previous);
      transitioning = false;
    }
    active = name;
    syncBody();
  }

  function afterClose(name) {
    const hooks = registry.get(name) || {};
    safeCall(hooks.cleanup);
    clearTransientNodes(name);
    if (active === name) active = null;
    syncBody();
    safeCall(window.applyWave1SurfacePhase);
    safeCall(window.renderTutorial);
  }

  function closeActive(options = {}) {
    if (!active) return;
    const name = active;
    const hooks = registry.get(name) || {};
    transitioning = true;
    safeCall(hooks.close, { ...options, fromLifecycle: true });
    if (options.immediate && active === name) afterClose(name);
    transitioning = false;
  }

  function isInputLocked() {
    return Boolean(active || transitioning);
  }

  window.SurfaceLifecycle = {
    register,
    beforeOpen,
    afterClose,
    closeActive,
    clearTransientNodes,
    isInputLocked,
    get active() { return active; },
  };
})();
