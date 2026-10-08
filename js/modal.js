// ==========================================================================
// Custom Modal Dialog Component
// Replaces browser alert() with an accessible modal box with an 'X' close button
// ==========================================================================

(function () {
  function ensureModalDOM() {
    if (document.getElementById('custom-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'custom-modal-title');

    overlay.innerHTML = `
      <div class="modal-box" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div class="modal-title" id="custom-modal-title">
            <span>ℹ️ Notification</span>
          </div>
          <button type="button" class="modal-close" id="custom-modal-close-x" aria-label="Close dialog" title="Close (Esc)">&times;</button>
        </div>
        <div class="modal-body" id="custom-modal-body">
          Notification message
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary btn-sm" id="custom-modal-close-btn">OK</button>
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
    
    // Close on backdrop click
    overlay.addEventListener('click', hideModal);

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        hideModal();
      }
    });
  }

  // Global showModal function
  window.showModal = function (title, message) {
    ensureModalDOM();
    const overlay = document.getElementById('custom-modal-overlay');
    const titleEl = document.getElementById('custom-modal-title');
    const bodyEl = document.getElementById('custom-modal-body');

    if (arguments.length === 1) {
      message = title;
      title = 'ℹ️ Notice';
    }

    titleEl.innerHTML = `<span>${title}</span>`;
    bodyEl.innerHTML = message;
    overlay.classList.add('active');
  };

  // Override window.alert to automatically use the custom modal
  window.alert = function (message) {
    let iconTitle = 'ℹ️ Notice';
    if (typeof message === 'string') {
      const lower = message.toLowerCase();
      if (lower.includes('copied') || lower.includes('success')) {
        iconTitle = '✅ Success';
      } else if (lower.includes('error') || lower.includes('failed') || lower.includes('invalid') || lower.includes('please')) {
        iconTitle = '⚠️ Alert';
      }
    }
    window.showModal(iconTitle, message);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureModalDOM);
  } else {
    ensureModalDOM();
  }
})();

