(() => {
  'use strict';

  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const saved = localStorage.getItem('theme');
    if (['system', 'light', 'dark'].includes(saved)) preference = saved;
  } catch (e) { /* Theme switching still works when storage is unavailable. */ }

  function apply() {
    document.documentElement.dataset.theme = preference === 'system'
      ? (system.matches ? 'dark' : 'light') : preference;
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeOption === preference));
    });
  }

  apply();
  system.addEventListener('change', () => {
    if (preference === 'system') apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.addEventListener('click', () => {
        preference = button.dataset.themeOption;
        try { localStorage.setItem('theme', preference); } catch (e) { /* ignore */ }
        apply();
      });
    });
    apply();
  });
})();
