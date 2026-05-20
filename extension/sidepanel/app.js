// ScriptPad — Main App Logic

(async function () {
  'use strict';

  // ---- State ----
  let state = {
    scripts: [],
    folders: [],
    settings: { language: 'en', theme: 'dark', hotkey: 'Ctrl+Shift+S' },
    currentView: 'main',
    currentScriptId: null,
    editingScriptId: null, // null = new, string = editing existing
    selectedIndex: -1,
    searchQuery: ''
  };

  // ---- DOM Refs ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const views = {
    main: $('#mainView'),
    script: $('#scriptView'),
    editor: $('#editorView'),
    settings: $('#settingsView'),
    folder: $('#folderView')
  };

  const els = {
    searchInput: $('#searchInput'),
    panelContent: $('#panelContent'),
    langBtn: $('#langBtn'),
    themeBtn: $('#themeBtn'),
    settingsBtn: $('#settingsBtn'),
    newScriptBtn: $('#newScriptBtn'),
    // Script view
    backBtn: $('#backBtn'),
    scriptViewTitle: $('#scriptViewTitle'),
    scriptViewTags: $('#scriptViewTags'),
    scriptViewBody: $('#scriptViewBody'),
    copyAllBtn: $('#copyAllBtn'),
    editScriptBtn: $('#editScriptBtn'),
    pinScriptBtn: $('#pinScriptBtn'),
    deleteScriptBtn: $('#deleteScriptBtn'),
    // Editor
    editorBackBtn: $('#editorBackBtn'),
    editorTitle: $('#editorTitle'),
    saveScriptBtn: $('#saveScriptBtn'),
    editorTitleInput: $('#editorTitleInput'),
    editorFolderSelect: $('#editorFolderSelect'),
    editorTagsInput: $('#editorTagsInput'),
    editorBodyInput: $('#editorBodyInput'),
    // Settings
    settingsBackBtn: $('#settingsBackBtn'),
    darkThemeBtn: $('#darkThemeBtn'),
    lightThemeBtn: $('#lightThemeBtn'),
    importBtn: $('#importBtn'),
    exportBtn: $('#exportBtn'),
    importFileInput: $('#importFileInput'),
    newFolderBtn: $('#newFolderBtn'),
    folderManager: $('#folderManager'),
    // Folder view
    folderBackBtn: $('#folderBackBtn'),
    folderViewTitle: $('#folderViewTitle'),
    folderViewCount: $('#folderViewCount'),
    folderContent: $('#folderContent'),
    // Toast & confirm
    toast: $('#toast'),
    overlay: $('#overlay'),
    confirmTitle: $('#confirmTitle'),
    confirmText: $('#confirmText'),
    confirmCancel: $('#confirmCancel'),
    confirmOk: $('#confirmOk')
  };

  // ---- Onboarding ----
  function initOnboarding() {
    const overlay = $('#onboardingOverlay');
    if (!overlay) return;

    // Check if onboarding was already completed
    chrome.storage.local.get(['onboardingComplete'], (data) => {
      if (data.onboardingComplete) {
        overlay.remove();
        return;
      }
      showOnboarding();
    });
  }

  function showOnboarding() {
    const overlay = $('#onboardingOverlay');
    const slides = $$('.onboarding-slide');
    const dots = $$('.onboarding-dot');
    const nextBtn = $('#onboardingNext');
    const backBtn = $('#onboardingBack');
    const skipBtn = $('#onboardingSkip');
    let current = 0;
    const total = slides.length;

    function updateOnboardingI18n() {
      // Welcome slide
      const titleEl = $('#onboardingTitle');
      const subEl = $('#onboardingSubtitle');
      if (titleEl) titleEl.textContent = t('onboardingWelcome');
      if (subEl) subEl.textContent = t('onboardingSubtitle');

      // Feature slides 1-4
      for (let i = 1; i <= 4; i++) {
        const iconEl = $(`#onbIcon${i}`);
        const tEl = $(`#onbTitle${i}`);
        const dEl = $(`#onbDesc${i}`);
        if (iconEl) iconEl.textContent = t(`onboardingStep${i}Icon`);
        if (tEl) tEl.textContent = t(`onboardingStep${i}Title`);
        if (dEl) dEl.textContent = t(`onboardingStep${i}Desc`);
      }

      // Buttons
      if (skipBtn) skipBtn.textContent = t('onboardingSkip');
      if (backBtn) backBtn.textContent = t('onboardingBack');
      updateNavButtons();
    }

    function goTo(index) {
      slides[current].classList.remove('active');
      slides[current].classList.add('exit-left');
      dots[current].classList.remove('active');

      // Brief timeout to reset exit class
      setTimeout(() => slides[current].classList.remove('exit-left'), 350);

      current = index;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
      updateNavButtons();
    }

    function updateNavButtons() {
      backBtn.style.display = current === 0 ? 'none' : 'block';
      if (current === total - 1) {
        nextBtn.textContent = t('onboardingGetStarted');
      } else {
        nextBtn.textContent = t('onboardingNext');
      }
    }

    function completeOnboarding() {
      chrome.storage.local.set({ onboardingComplete: true });
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 400);
    }

    nextBtn.addEventListener('click', () => {
      if (current < total - 1) {
        goTo(current + 1);
      } else {
        completeOnboarding();
      }
    });

    backBtn.addEventListener('click', () => {
      if (current > 0) goTo(current - 1);
    });

    skipBtn.addEventListener('click', completeOnboarding);

    // Click dots to navigate
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
    });

    updateOnboardingI18n();
    updateNavButtons();
  }

  // ---- Init ----
  async function init() {
    await StorageAPI.seedIfEmpty();
    await loadData();
    applyTheme(state.settings.theme);
    setLanguage(state.settings.language);
    updateLangBtn();
    updateI18n();
    bindEvents();
    renderMain();
    initOnboarding();
  }

  async function loadData() {
    const data = await StorageAPI.getAll();
    state.scripts = data.scripts;
    state.folders = data.folders;
    state.settings = data.settings;
    SearchEngine.setScripts(state.scripts);
  }

  // ---- Views ----
  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    state.currentView = name;
  }

  // ---- Render: Main List ----
  function renderMain() {
    const content = els.panelContent;
    content.innerHTML = '';

    let displayScripts;

    if (state.searchQuery) {
      displayScripts = SearchEngine.search(state.searchQuery);
      content.innerHTML = `<div class="section-label">🔍 ${t('searchResults')} (${displayScripts.length})</div>`;
      if (displayScripts.length === 0) {
        content.innerHTML += renderEmptyState('🔍', t('noResults'), t('noResultsHint'));
        return;
      }
      displayScripts.forEach(s => content.appendChild(createScriptItem(s)));
      return;
    }

    // Pinned
    const pinned = state.scripts.filter(s => s.pinned);
    if (pinned.length > 0) {
      content.insertAdjacentHTML('beforeend', `<div class="section-label">📌 ${t('pinned')}</div>`);
      pinned.forEach(s => content.appendChild(createScriptItem(s)));
    }

    // Folders
    if (state.folders.length > 0) {
      content.insertAdjacentHTML('beforeend', `<div class="section-label" style="margin-top:6px">📁 ${t('folders')}</div>`);
      state.folders.forEach(f => {
        const count = state.scripts.filter(s => s.folderId === f.id).length;
        content.appendChild(createFolderItem(f, count));
      });
    }

    // Uncategorized
    const uncategorized = state.scripts.filter(s => !s.folderId);
    if (uncategorized.length > 0) {
      content.insertAdjacentHTML('beforeend', `<div class="section-label" style="margin-top:6px">📄 ${t('uncategorized')}</div>`);
      uncategorized.forEach(s => content.appendChild(createScriptItem(s)));
    }

    if (state.scripts.length === 0) {
      content.innerHTML = renderEmptyState('📝', t('noScripts'), t('noScriptsHint'));
    }
  }

  function createScriptItem(script) {
    const div = document.createElement('div');
    div.className = 'script-item';
    div.dataset.id = script.id;

    const folder = state.folders.find(f => f.id === script.folderId);
    const folderName = folder ? folder.name : t('uncategorized');
    const timeStr = timeAgo(script.updatedAt);

    div.innerHTML = `
      <span class="script-icon">📄</span>
      <div class="script-info">
        <div class="script-title">${esc(script.title)}${script.pinned ? ' <span class="pin-icon">📌</span>' : ''}</div>
        <div class="script-meta">${esc(folderName)} · ${t('updatedAgo')} ${timeStr}</div>
      </div>
      <button class="copy-btn" title="${t('copy')}">📋</button>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.closest('.copy-btn')) return;
      openScript(script.id);
    });
    div.querySelector('.copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      copyScriptText(script);
    });

    return div;
  }

  function createFolderItem(folder, count) {
    const div = document.createElement('div');
    div.className = 'folder-item';
    div.innerHTML = `
      <span class="folder-icon">📂</span>
      <span class="folder-name">${esc(folder.name)}</span>
      <span class="folder-count">${count}</span>
      <span class="folder-arrow">›</span>
    `;
    div.addEventListener('click', () => openFolder(folder.id));
    return div;
  }

  function renderEmptyState(icon, title, hint) {
    return `<div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${title}</div>
      <div class="empty-hint">${hint}</div>
    </div>`;
  }

  // ---- Render: Folder View ----
  function openFolder(folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;

    const scripts = state.scripts.filter(s => s.folderId === folderId);
    els.folderViewTitle.textContent = folder.name;
    els.folderViewCount.textContent = `${scripts.length} ${scripts.length === 1 ? t('script') : t('scripts')}`;

    els.folderContent.innerHTML = '';
    if (scripts.length === 0) {
      els.folderContent.innerHTML = renderEmptyState('📂', t('noScripts'), t('noScriptsHint'));
    } else {
      scripts.forEach(s => els.folderContent.appendChild(createScriptItem(s)));
    }

    showView('folder');
  }

  // ---- Render: Script Detail ----
  function openScript(scriptId) {
    const script = state.scripts.find(s => s.id === scriptId);
    if (!script) return;

    state.currentScriptId = scriptId;
    els.scriptViewTitle.textContent = script.title;

    // Tags
    els.scriptViewTags.innerHTML = script.tags.map(tag =>
      `<span class="tag">#${esc(tag)}</span>`
    ).join('');

    // Body
    els.scriptViewBody.innerHTML = script.body;

    // Pin button text
    const pinSpan = els.pinScriptBtn.querySelector('span');
    if (pinSpan) pinSpan.textContent = script.pinned ? t('unpin') : t('pin');

    showView('script');
  }

  // ---- Editor ----
  function openEditor(scriptId) {
    state.editingScriptId = scriptId || null;

    // Populate folder dropdown
    els.editorFolderSelect.innerHTML = `<option value="">${t('noFolder')}</option>`;
    state.folders.forEach(f => {
      els.editorFolderSelect.innerHTML += `<option value="${f.id}">${esc(f.name)}</option>`;
    });

    if (scriptId) {
      const script = state.scripts.find(s => s.id === scriptId);
      if (!script) return;
      els.editorTitle.textContent = t('edit');
      els.editorTitleInput.value = script.title;
      els.editorFolderSelect.value = script.folderId || '';
      els.editorTagsInput.value = script.tags.join(', ');
      els.editorBodyInput.innerHTML = script.body;
    } else {
      els.editorTitle.textContent = t('newScript');
      els.editorTitleInput.value = '';
      els.editorFolderSelect.value = '';
      els.editorTagsInput.value = '';
      els.editorBodyInput.innerHTML = '';
    }

    showView('editor');
    els.editorTitleInput.focus();
  }

  async function saveScript() {
    const title = els.editorTitleInput.value.trim();
    if (!title) {
      els.editorTitleInput.focus();
      return;
    }

    const body = els.editorBodyInput.innerHTML;
    const tags = els.editorTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const folderId = els.editorFolderSelect.value || null;

    if (state.editingScriptId) {
      await StorageAPI.updateScript(state.editingScriptId, { title, body, tags, folderId });
    } else {
      await StorageAPI.createScript({ title, body, tags, folderId });
    }

    await loadData();
    showToast(t('saved'));
    showView('main');
    renderMain();
  }

  // ---- Settings ----
  function openSettings() {
    renderFolderManager();
    updateThemeButtons();
    updateLangButtons();
    showView('settings');
  }

  function renderFolderManager() {
    els.folderManager.innerHTML = '';
    state.folders.forEach(f => {
      const div = document.createElement('div');
      div.className = 'folder-manage-item';
      div.innerHTML = `
        <span>📂</span>
        <span class="folder-name-text">${esc(f.name)}</span>
        <button class="rename-folder-btn" title="${t('renameFolder')}">✏️</button>
        <button class="delete-folder-btn danger-icon" title="${t('deleteFolder')}">🗑️</button>
      `;
      div.querySelector('.rename-folder-btn').addEventListener('click', () => renameFolder(f.id, f.name));
      div.querySelector('.delete-folder-btn').addEventListener('click', () => deleteFolderConfirm(f.id));
      els.folderManager.appendChild(div);
    });
  }

  async function renameFolder(id, currentName) {
    const newName = prompt(t('renameFolder'), currentName);
    if (!newName || newName.trim() === '') return;
    await StorageAPI.renameFolder(id, newName.trim());
    await loadData();
    renderFolderManager();
    showToast(t('folderRenamed'));
  }

  function deleteFolderConfirm(folderId) {
    showConfirm(t('deleteFolder'), t('deleteFolderConfirm'), async () => {
      await StorageAPI.deleteFolder(folderId);
      await loadData();
      renderFolderManager();
      renderMain();
      showToast(t('folderDeleted'));
    });
  }

  async function createNewFolder() {
    const name = prompt(t('folderNamePlaceholder'));
    if (!name || name.trim() === '') return;
    await StorageAPI.createFolder(name.trim());
    await loadData();
    renderFolderManager();
    renderMain();
    showToast(t('folderCreated'));
  }

  // ---- Theme ----
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    els.themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  function updateThemeButtons() {
    $$('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === state.settings.theme);
    });
  }

  async function setTheme(theme) {
    state.settings.theme = theme;
    applyTheme(theme);
    await StorageAPI.updateSettings({ theme });
    updateThemeButtons();
  }

  // ---- Language ----
  function updateLangBtn() {
    els.langBtn.textContent = state.settings.language.toUpperCase();
  }

  function updateLangButtons() {
    $$('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === state.settings.language);
    });
  }

  async function switchLanguage(lang) {
    state.settings.language = lang;
    setLanguage(lang);
    await StorageAPI.updateSettings({ language: lang });
    updateLangBtn();
    updateLangButtons();
    updateI18n();
    renderMain();
  }

  function updateI18n() {
    $$('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    els.searchInput.placeholder = t('searchPlaceholder');
    els.newScriptBtn.textContent = t('newScript');
    els.editorTitleInput.placeholder = t('scriptTitlePlaceholder');
    els.editorTagsInput.placeholder = t('tagsPlaceholder');
    els.editorBodyInput.dataset.placeholder = t('scriptBodyPlaceholder');
  }

  // ---- Copy ----
  function copyScriptText(script) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = script.body;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      showToast(t('copied'));
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(t('copied'));
    });
  }

  function copyAllFromView() {
    const text = els.scriptViewBody.textContent || els.scriptViewBody.innerText || '';
    navigator.clipboard.writeText(text).then(() => {
      showToast(t('copied'));
    }).catch(() => showToast(t('copied')));
  }

  // ---- Import / Export ----
  async function exportScripts() {
    const json = await StorageAPI.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scriptpad-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('exported'));
  }

  async function importScripts(file) {
    const text = await file.text();
    const success = await StorageAPI.importData(text);
    if (success) {
      await loadData();
      renderMain();
      showToast(t('imported'));
    } else {
      showToast(t('importError'));
    }
  }

  // ---- Delete Script ----
  function deleteCurrentScript() {
    const script = state.scripts.find(s => s.id === state.currentScriptId);
    if (!script) return;
    showConfirm(t('deleteConfirm'), t('deleteConfirmText'), async () => {
      await StorageAPI.deleteScript(state.currentScriptId);
      await loadData();
      showView('main');
      renderMain();
      showToast(t('deleted'));
    });
  }

  // ---- Pin Toggle ----
  async function togglePinCurrent() {
    if (!state.currentScriptId) return;
    await StorageAPI.togglePin(state.currentScriptId);
    await loadData();
    // Refresh detail view
    openScript(state.currentScriptId);
  }

  // ---- Toast ----
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), 2000);
  }

  // ---- Confirm Dialog ----
  let confirmCallback = null;
  function showConfirm(title, text, onConfirm) {
    els.confirmTitle.textContent = title;
    els.confirmText.textContent = text;
    confirmCallback = onConfirm;
    els.overlay.classList.add('active');
  }

  // ---- Helpers ----
  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return t('justNow');
    if (mins < 60) return `${mins} ${t('minutesAgo')}`;
    if (hours < 24) return `${hours} ${t('hoursAgo')}`;
    return `${days} ${t('daysAgo')}`;
  }

  // ---- Keyboard Navigation ----
  function handleKeyboard(e) {
    // "/" to focus search
    if (e.key === '/' && state.currentView === 'main' && document.activeElement !== els.searchInput) {
      e.preventDefault();
      els.searchInput.focus();
      return;
    }

    // Escape: go back
    if (e.key === 'Escape') {
      if (state.currentView === 'script') {
        showView('main');
        renderMain();
      } else if (state.currentView === 'editor') {
        if (state.editingScriptId) {
          openScript(state.editingScriptId);
        } else {
          showView('main');
          renderMain();
        }
      } else if (state.currentView === 'settings' || state.currentView === 'folder') {
        showView('main');
        renderMain();
      } else if (document.activeElement === els.searchInput) {
        els.searchInput.blur();
        els.searchInput.value = '';
        state.searchQuery = '';
        renderMain();
      }
      return;
    }

    // Arrow nav in main view
    if (state.currentView === 'main' && document.activeElement !== els.searchInput) {
      const items = els.panelContent.querySelectorAll('.script-item');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.selectedIndex = Math.min(state.selectedIndex + 1, items.length - 1);
        updateSelection(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
        updateSelection(items);
      } else if (e.key === 'Enter' && state.selectedIndex >= 0) {
        e.preventDefault();
        const id = items[state.selectedIndex]?.dataset.id;
        if (id) openScript(id);
      }
    }
  }

  function updateSelection(items) {
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === state.selectedIndex);
      if (i === state.selectedIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // ---- Rich Text Toolbar ----
  function handleToolbar(e) {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;
    const cmd = btn.dataset.cmd;
    if (cmd === 'highlight') {
      // Wrap selection in highlight span
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.style.color = '#fbbf24';
        span.style.backgroundColor = 'rgba(251,191,36,0.2)';
        span.style.padding = '1px 4px';
        span.style.borderRadius = '3px';
        span.style.fontWeight = '500';
        range.surroundContents(span);
      }
    } else {
      document.execCommand(cmd, false, null);
    }
    els.editorBodyInput.focus();
  }

  // ---- Bind Events ----
  function bindEvents() {
    // Search
    els.searchInput.addEventListener('input', () => {
      state.searchQuery = els.searchInput.value;
      state.selectedIndex = -1;
      renderMain();
    });

    // Header buttons
    els.langBtn.addEventListener('click', () => {
      const next = state.settings.language === 'en' ? 'es' : 'en';
      switchLanguage(next);
    });
    els.themeBtn.addEventListener('click', () => {
      setTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
    });
    els.settingsBtn.addEventListener('click', openSettings);
    els.newScriptBtn.addEventListener('click', () => openEditor(null));

    // Script view
    els.backBtn.addEventListener('click', () => { showView('main'); renderMain(); });
    els.copyAllBtn.addEventListener('click', copyAllFromView);
    els.editScriptBtn.addEventListener('click', () => openEditor(state.currentScriptId));
    els.pinScriptBtn.addEventListener('click', togglePinCurrent);
    els.deleteScriptBtn.addEventListener('click', deleteCurrentScript);

    // Editor
    els.editorBackBtn.addEventListener('click', () => {
      if (state.editingScriptId) {
        openScript(state.editingScriptId);
      } else {
        showView('main');
        renderMain();
      }
    });
    els.saveScriptBtn.addEventListener('click', saveScript);

    // Toolbar
    document.querySelector('.editor-toolbar')?.addEventListener('click', handleToolbar);

    // Settings
    els.settingsBackBtn.addEventListener('click', () => { showView('main'); renderMain(); });
    $$('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    $$('.lang-option').forEach(btn => {
      btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
    });
    els.importBtn.addEventListener('click', () => els.importFileInput.click());
    els.importFileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) importScripts(e.target.files[0]);
      e.target.value = '';
    });
    els.exportBtn.addEventListener('click', exportScripts);
    els.newFolderBtn.addEventListener('click', createNewFolder);

    // Folder view
    els.folderBackBtn.addEventListener('click', () => { showView('main'); renderMain(); });

    // Confirm dialog
    els.confirmCancel.addEventListener('click', () => {
      els.overlay.classList.remove('active');
      confirmCallback = null;
    });
    els.confirmOk.addEventListener('click', () => {
      els.overlay.classList.remove('active');
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
    });

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);
  }

  // ---- Start ----
  init();
})();
