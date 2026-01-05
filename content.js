// Prevent multiple injections - use window object for persistence
if (window.__tabPortal) {
  window.__tabPortal.toggle();
} else {
  (function() {
    let allTabs = [];
    let filteredTabs = [];
    let selectedIndex = 0;
    let modal = null;
    let searchInput = null;
    let tabsList = null;
    let emptyState = null;

    function createModal() {
      modal = document.createElement('div');
      modal.id = 'tab-portal-modal';
      modal.innerHTML = `
        <div class="tab-portal-backdrop"></div>
        <div class="tab-portal-container">
          <div class="tab-portal-search-wrapper">
            <svg class="tab-portal-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" class="tab-portal-search" placeholder="Search tabs..." autofocus>
            <span class="tab-portal-shortcut-hint">esc to close</span>
          </div>
          <div class="tab-portal-tabs-list"></div>
          <div class="tab-portal-empty-state tab-portal-hidden">No matching tabs</div>
        </div>
      `;

      document.body.appendChild(modal);

      searchInput = modal.querySelector('.tab-portal-search');
      tabsList = modal.querySelector('.tab-portal-tabs-list');
      emptyState = modal.querySelector('.tab-portal-empty-state');

      searchInput.addEventListener('input', onSearch);
      modal.querySelector('.tab-portal-backdrop').addEventListener('click', hideModal);

      // Use capture phase to intercept events before other handlers
      document.addEventListener('keydown', onKeyDown, true);

      // Prevent all events from bubbling out of the modal
      modal.addEventListener('keydown', (e) => {
        e.stopPropagation();
      }, true);
      modal.addEventListener('keyup', (e) => {
        e.stopPropagation();
      }, true);
      modal.addEventListener('keypress', (e) => {
        e.stopPropagation();
      }, true);
      modal.addEventListener('input', (e) => {
        e.stopPropagation();
      }, true);
    }

    function toggle() {
      if (!modal) {
        createModal();
        showModal();
      } else if (modal.classList.contains('tab-portal-visible')) {
        hideModal();
      } else {
        showModal();
      }
    }

    function showModal() {
      if (!modal) {
        createModal();
      }
      modal.classList.add('tab-portal-visible');
      searchInput.value = '';
      selectedIndex = 0;
      loadTabs();

      // Aggressively focus the search input
      searchInput.focus();
      setTimeout(() => searchInput.focus(), 10);
      setTimeout(() => searchInput.focus(), 50);
      setTimeout(() => searchInput.focus(), 100);
    }

    function hideModal() {
      if (modal) {
        modal.classList.remove('tab-portal-visible');
      }
    }

    async function loadTabs() {
      const response = await chrome.runtime.sendMessage({ action: 'getTabs' });
      allTabs = response.map(tab => ({
        ...tab,
        searchText: `${tab.title} ${tab.url}`.toLowerCase()
      }));

      // Sort by last accessed (most recent first)
      allTabs.sort((a, b) => b.lastAccessed - a.lastAccessed);

      filteredTabs = [...allTabs];
      renderTabs();
    }

    function fuzzyMatch(text, query) {
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();

      let textIndex = 0;
      let queryIndex = 0;
      let matchPositions = [];
      let score = 0;
      let lastMatchIndex = -1;

      while (textIndex < lowerText.length && queryIndex < lowerQuery.length) {
        if (lowerText[textIndex] === lowerQuery[queryIndex]) {
          matchPositions.push(textIndex);

          if (lastMatchIndex === textIndex - 1) {
            score += 10;
          }

          if (textIndex === 0 || /[\s\-_./]/.test(lowerText[textIndex - 1])) {
            score += 5;
          }

          lastMatchIndex = textIndex;
          queryIndex++;
          score += 1;
        }
        textIndex++;
      }

      const matched = queryIndex === lowerQuery.length;

      if (matched) {
        score -= (lowerText.length - lowerQuery.length) * 0.1;
      }

      return { matched, score, positions: matchPositions };
    }

    function highlightMatches(text, positions) {
      if (!positions || positions.length === 0) return escapeHtml(text);

      let result = '';
      let lastIndex = 0;

      positions.forEach(pos => {
        if (pos > lastIndex) {
          result += escapeHtml(text.slice(lastIndex, pos));
        }
        result += `<mark>${escapeHtml(text[pos])}</mark>`;
        lastIndex = pos + 1;
      });

      if (lastIndex < text.length) {
        result += escapeHtml(text.slice(lastIndex));
      }

      return result;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function onSearch(e) {
      const query = e.target.value.trim();

      if (!query) {
        // No query: show all tabs sorted by last accessed
        filteredTabs = [...allTabs].sort((a, b) => b.lastAccessed - a.lastAccessed);
      } else {
        filteredTabs = allTabs
          .map(tab => {
            const titleMatch = fuzzyMatch(tab.title, query);
            const urlMatch = fuzzyMatch(tab.url, query);

            return {
              ...tab,
              matched: titleMatch.matched || urlMatch.matched,
              score: Math.max(titleMatch.score, urlMatch.score),
              titlePositions: titleMatch.matched ? titleMatch.positions : [],
              urlPositions: urlMatch.matched ? urlMatch.positions : []
            };
          })
          .filter(tab => tab.matched)
          .sort((a, b) => b.score - a.score);
      }

      selectedIndex = 0;
      renderTabs();
      tabsList.scrollTop = 0;
    }

    function onKeyDown(e) {
      if (!modal || !modal.classList.contains('tab-portal-visible')) return;

      // Ctrl+J - move down
      if (e.key === 'j' && e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = Math.min(selectedIndex + 1, filteredTabs.length - 1);
        renderTabs();
        scrollSelectedIntoView();
        return;
      }

      // Ctrl+K - move up
      if (e.key === 'k' && e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        renderTabs();
        scrollSelectedIntoView();
        return;
      }

      // Ctrl+Backspace or Ctrl+Delete - delete selected tab
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        if (filteredTabs[selectedIndex]) {
          deleteTab(filteredTabs[selectedIndex]);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          selectedIndex = Math.min(selectedIndex + 1, filteredTabs.length - 1);
          renderTabs();
          scrollSelectedIntoView();
          break;

        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          selectedIndex = Math.max(selectedIndex - 1, 0);
          renderTabs();
          scrollSelectedIntoView();
          break;

        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          if (filteredTabs[selectedIndex]) {
            switchToTab(filteredTabs[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          hideModal();
          break;
      }
    }

    function scrollSelectedIntoView() {
      const selected = tabsList.querySelector('.tab-portal-tab-item.selected');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    function switchToTab(tab) {
      chrome.runtime.sendMessage({
        action: 'switchToTab',
        tabId: tab.id,
        windowId: tab.windowId
      });
      hideModal();
    }

    async function deleteTab(tab) {
      await chrome.runtime.sendMessage({
        action: 'deleteTab',
        tabId: tab.id
      });

      // Remove from arrays
      allTabs = allTabs.filter(t => t.id !== tab.id);
      filteredTabs = filteredTabs.filter(t => t.id !== tab.id);

      // Adjust selected index if needed
      if (selectedIndex >= filteredTabs.length) {
        selectedIndex = Math.max(0, filteredTabs.length - 1);
      }

      renderTabs();
    }

    function getDisplayUrl(url) {
      try {
        const parsed = new URL(url);
        return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
      } catch {
        return url;
      }
    }

    function renderTabs() {
      if (filteredTabs.length === 0) {
        tabsList.classList.add('tab-portal-hidden');
        emptyState.classList.remove('tab-portal-hidden');
        return;
      }

      tabsList.classList.remove('tab-portal-hidden');
      emptyState.classList.add('tab-portal-hidden');

      tabsList.innerHTML = filteredTabs.map((tab, index) => {
        const isSelected = index === selectedIndex;

        const titleHtml = tab.titlePositions
          ? highlightMatches(tab.title, tab.titlePositions)
          : escapeHtml(tab.title);

        const urlHtml = tab.urlPositions
          ? highlightMatches(getDisplayUrl(tab.url), tab.urlPositions)
          : escapeHtml(getDisplayUrl(tab.url));

        return `
          <div class="tab-portal-tab-item ${isSelected ? 'selected' : ''}" data-index="${index}">
            ${tab.favIconUrl
              ? `<img class="tab-portal-tab-favicon" src="${escapeHtml(tab.favIconUrl)}" alt="" onerror="this.style.display='none'">`
              : `<div class="tab-portal-tab-favicon-placeholder">${escapeHtml(tab.title.charAt(0).toUpperCase())}</div>`
            }
            <div class="tab-portal-tab-info">
              <div class="tab-portal-tab-title">${titleHtml}</div>
              <div class="tab-portal-tab-url">${urlHtml}</div>
            </div>
            <span class="tab-portal-tab-window-badge">${escapeHtml(tab.windowName)}</span>
            ${tab.active ? '<div class="tab-portal-tab-active-indicator"></div>' : ''}
            <button class="tab-portal-tab-delete" data-tab-id="${tab.id}" title="Close tab (Ctrl+Delete)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        `;
      }).join('');

      tabsList.querySelectorAll('.tab-portal-tab-item').forEach(item => {
        item.addEventListener('click', (e) => {
          // Don't switch if clicking delete button
          if (e.target.closest('.tab-portal-tab-delete')) return;
          const index = parseInt(item.dataset.index, 10);
          switchToTab(filteredTabs[index]);
        });

        item.addEventListener('mouseenter', () => {
          selectedIndex = parseInt(item.dataset.index, 10);
          renderTabs();
        });
      });

      // Delete button handlers
      tabsList.querySelectorAll('.tab-portal-tab-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tabId = parseInt(btn.dataset.tabId, 10);
          const tab = filteredTabs.find(t => t.id === tabId);
          if (tab) deleteTab(tab);
        });
      });
    }

    // Expose toggle function globally
    window.__tabPortal = { toggle };

    // Listen for toggle messages from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggle') {
        toggle();
        sendResponse({ success: true });
      }
      return true;
    });

    // Initialize and show
    createModal();
    showModal();
  })();
}
