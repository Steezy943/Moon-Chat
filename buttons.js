(() => {
  'use strict';

  const $ = id => document.getElementById(id);

  // Setup click layers securely using a direct event mapping architecture
  window.addEventListener('DOMContentLoaded', () => {
    const loginTab = $('toggle-login');
    const signupTab = $('toggle-signup');
    
    if (loginTab && signupTab) {
      loginTab.onclick = (e) => {
        e.preventDefault();
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        if (typeof window.setMode === 'function') window.setMode('login');
      };

      signupTab.onclick = (e) => {
        e.preventDefault();
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        if (typeof window.setMode === 'function') window.setMode('signup');
      };
    }

    const settingsOpenBtn = $('settings-btn');
    if (settingsOpenBtn) {
      settingsOpenBtn.onclick = (e) => {
        e.preventDefault();
        if (typeof window.openSettings === 'function') window.openSettings();
      };
    }

    document.querySelectorAll('.scroll-nav-arrow-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const parentId = btn.getAttribute('data-target');
        const container = $(parentId);
        if (container) {
          const distance = btn.classList.contains('down') ? 180 : -180;
          container.scrollBy({ top: distance, behavior: 'smooth' });
        }
      };
    });

    const comingSoonOpen = $('global-coming-soon-trigger');
    const comingSoonClose = $('close-coming-soon');
    const comingSoonPanel = $('coming-soon-panel');

    if (comingSoonOpen && comingSoonPanel) {
      comingSoonOpen.onclick = (e) => {
        e.preventDefault();
        comingSoonPanel.classList.remove('hidden');
      };
    }
    if (comingSoonClose && comingSoonPanel) {
      comingSoonClose.onclick = (e) => {
        e.preventDefault();
        comingSoonPanel.classList.add('hidden');
      });
    }

    const closeSettings = $('close-settings');
    const settingsPanel = $('settings-panel');
    if (closeSettings && settingsPanel) {
      closeSettings.onclick = (e) => {
        e.preventDefault();
        settingsPanel.classList.add('hidden');
      });
    }

    const closeProfile = $('close-profile');
    const profilePopup = $('profile-popup');
    if (closeProfile && profilePopup) {
      closeProfile.onclick = (e) => {
        e.preventDefault();
        profilePopup.classList.add('hidden');
      });
    }
  });
})();
