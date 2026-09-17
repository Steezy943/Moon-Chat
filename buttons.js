(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  window.addEventListener('DOMContentLoaded', () => {
    const loginTab = $('toggle-login');
    const signupTab = $('toggle-signup');
    
    if (loginTab && signupTab) {
      loginTab.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.setMode === 'function') window.setMode('login');
      });
      signupTab.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.setMode === 'function') window.setMode('signup');
      });
    }

    document.querySelectorAll('.scroll-nav-arrow-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const parentId = btn.getAttribute('data-target');
        const container = $(parentId);
        if (container) {
          const distance = btn.classList.contains('down') ? 180 : -180;
          container.scrollBy({ top: distance, behavior: 'smooth' });
        }
      });
    });

    const comingSoonOpen = $('global-coming-soon-trigger');
    const comingSoonClose = $('close-coming-soon');
    const comingSoonPanel = $('coming-soon-panel');

    if (comingSoonOpen && comingSoonPanel) {
      comingSoonOpen.addEventListener('click', (e) => {
        e.preventDefault();
        comingSoonPanel.classList.remove('hidden');
      });
    }
    if (comingSoonClose && comingSoonPanel) {
      comingSoonClose.addEventListener('click', (e) => {
        e.preventDefault();
        comingSoonPanel.classList.add('hidden');
      });
    }

    const closeSettings = $('close-settings');
    const settingsPanel = $('settings-panel');
    if (closeSettings && settingsPanel) {
      closeSettings.addEventListener('click', (e) => {
        e.preventDefault();
        settingsPanel.classList.add('hidden');
      });
    }

    const closeProfile = $('close-profile');
    const profilePopup = $('profile-popup');
    if (closeProfile && profilePopup) {
      closeProfile.addEventListener('click', (e) => {
        e.preventDefault();
        profilePopup.classList.add('hidden');
      });
    }
  });
})();
