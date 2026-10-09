// ==========================================================================
// UI Feedback System: Non-blocking Toast Notifications & Accessible Modal Dialog
// ==========================================================================

(function () {
  function ensureFeedbackDOM() {
    if (!document.getElementById('custom-modal-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'custom-modal-overlay';
      overlay.className = 'modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'custom-modal-title');

      overlay.innerHTML = `
        <div class="modal-box" onclick="event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title" id="custom-modal-title">Notice</div>
            <button type="button" class="modal-close" id="custom-modal-close-x" aria-label="Close dialog" title="Close (Esc)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body" id="custom-modal-body"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary btn-sm" id="custom-modal-close-btn">Dismiss</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const closeX = document.getElementById('custom-modal-close-x');
      const closeBtn = document.getElementById('custom-modal-close-btn');

      function hideModal() {
        overlay.classList.remove('active');
      }

      closeX.addEventListener('click', hideModal);
      closeBtn.addEventListener('click', hideModal);
      overlay.addEventListener('click', hideModal);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
          hideModal();
        }
      });
    }

    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastContainer);
    }
  }

  window.showToast = function (message, type) {
    ensureFeedbackDOM();
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const variant = type || 'success';
    toast.className = `toast-item toast-${variant}`;

    const iconSvg = variant === 'error'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 250);
    }, 2600);
  };

  window.showModal = function (title, message) {
    ensureFeedbackDOM();
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = document.getElementById('custom-modal-title');
    const bodyEl = document.getElementById('custom-modal-body');

    if (arguments.length === 1) {
      message = title;
      title = 'Notice';
    }

    titleEl.innerHTML = `<span>${title}</span>`;
    bodyEl.innerHTML = message;
    overlay.classList.add('active');
  };

  window.alert = function (message) {
    if (typeof message === 'string') {
      const lower = message.toLowerCase();
      if (lower.includes('copied') || lower.includes('clipboard')) {
        window.showToast(message, 'success');
        return;
      }
      if (lower.includes('error') || lower.includes('failed') || lower.includes('invalid') || lower.includes('please')) {
        window.showModal('Validation Notice', message);
        return;
      }
    }
    window.showModal('Notice', message);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureFeedbackDOM);
  } else {
    ensureFeedbackDOM();
  }
})();
