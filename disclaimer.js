(() => {
  'use strict';
  const modal = document.getElementById('rules-modal');
  const continueButton = document.getElementById('continue-rules');
  const countdown = document.getElementById('rules-countdown');
  const chat = document.getElementById('chat-section');
  if (!modal || !continueButton || !chat) return;

  let timer = null;
  let hasShown = false;

  function showRules() {
    if (hasShown) return;
    hasShown = true;
    modal.classList.remove('hidden');
    continueButton.disabled = true;
    continueButton.classList.remove('ready');
    let remaining = 5;
    countdown.textContent = `(${remaining})`;
    timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        countdown.textContent = '';
        continueButton.disabled = false;
        continueButton.classList.add('ready');
        continueButton.textContent = 'Continue';
      } else {
        countdown.textContent = `(${remaining})`;
      }
    }, 1000);
  }

  continueButton.addEventListener('click', () => {
    if (continueButton.disabled) return;
    modal.classList.add('hidden');
  });

  const observer = new MutationObserver(() => {
    if (chat.classList.contains('active')) showRules();
  });
  observer.observe(chat, { attributes: true, attributeFilter: ['class'] });
  if (chat.classList.contains('active')) showRules();
})();
