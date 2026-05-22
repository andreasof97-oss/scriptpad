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
    searchQuery: '',
    // Branching viewer state
    branchingPath: [],       // array of node IDs visited
    currentNodeId: null,
    // Branching editor state
    branchingEditorNodes: [],
    branchingEditorStartNodeId: null,
    selectedNodeId: null
  };

  // ---- DOM Refs ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const views = {
    main: $('#mainView'),
    script: $('#scriptView'),
    editor: $('#editorView'),
    settings: $('#settingsView'),
    folder: $('#folderView'),
    branching: $('#branchingView'),
    typeChooser: $('#typeChooserView'),
    branchingEditor: $('#branchingEditorView')
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
    // Branching viewer
    branchingBackBtn: $('#branchingBackBtn'),
    branchingViewTitle: $('#branchingViewTitle'),
    branchingCopyBtn: $('#branchingCopyBtn'),
    branchingViewTags: $('#branchingViewTags'),
    branchingBreadcrumb: $('#branchingBreadcrumb'),
    branchingNodeLabel: $('#branchingNodeLabel'),
    branchingNodeBody: $('#branchingNodeBody'),
    branchingChoices: $('#branchingChoices'),
    branchingGoBack: $('#branchingGoBack'),
    branchingStartOver: $('#branchingStartOver'),
    branchingEditBtn: $('#branchingEditBtn'),
    branchingPinBtn: $('#branchingPinBtn'),
    branchingDeleteBtn: $('#branchingDeleteBtn'),
    // Type chooser
    typeChooserBackBtn: $('#typeChooserBackBtn'),
    chooseStandard: $('#chooseStandard'),
    chooseBranching: $('#chooseBranching'),
    // Branching editor
    branchEditorBackBtn: $('#branchEditorBackBtn'),
    branchEditorTitle: $('#branchEditorTitle'),
    saveBranchingBtn: $('#saveBranchingBtn'),
    branchEditorTitleInput: $('#branchEditorTitleInput'),
    branchEditorFolderSelect: $('#branchEditorFolderSelect'),
    branchEditorTagsInput: $('#branchEditorTagsInput'),
    switchTypeBtnStandard: $('#switchTypeBtnStandard'),
    switchTypeBtnBranching: $('#switchTypeBtnBranching'),
    typeSwitchGroup: $('#typeSwitchGroup'),
    typeSwitchGroupBranching: $('#typeSwitchGroupBranching'),
    branchEditorNodeList: $('#branchEditorNodeList'),
    addNodeBtn: $('#addNodeBtn'),
    branchNodeEditorPanel: $('#branchNodeEditorPanel'),
    closeNodeEditor: $('#closeNodeEditor'),
    nodeEditorLabel: $('#nodeEditorLabel'),
    nodeEditorIsStart: $('#nodeEditorIsStart'),
    nodeEditorBody: $('#nodeEditorBody'),
    nodeEditorChoices: $('#nodeEditorChoices'),
    addChoiceBtn: $('#addChoiceBtn'),
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
    const isBranching = script.type === 'branching';
    const icon = isBranching ? '🔀' : '📄';

    div.innerHTML = `
      <span class="script-icon">${icon}</span>
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

    // Route branching scripts to branching viewer
    if (script.type === 'branching') {
      openBranchingScript(scriptId);
      return;
    }

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

    // Show/hide type switch button
    if (els.typeSwitchGroup) {
      els.typeSwitchGroup.style.display = scriptId ? 'block' : 'none';
    }

    if (scriptId) {
      const script = state.scripts.find(s => s.id === scriptId);
      if (!script) return;
      els.editorTitle.textContent = t('edit');
      els.editorTitleInput.value = script.title;
      els.editorFolderSelect.value = script.folderId || '';
      els.editorTagsInput.value = script.tags.join(', ');
      els.editorBodyInput.innerHTML = script.body || '';
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
    let text;
    if (script.type === 'branching' && Array.isArray(script.nodes)) {
      // Concatenate all node text for branching scripts
      text = script.nodes.map(n => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = n.body;
        return `[${n.label}]\n${tempDiv.textContent || tempDiv.innerText || ''}`;
      }).join('\n\n');
    } else {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = script.body;
      text = tempDiv.textContent || tempDiv.innerText || '';
    }
    copyToClipboard(text);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(t('copied'));
    }).catch(() => {
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
    copyToClipboard(text);
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

  // ---- Branching Script Viewer ----
  function openBranchingScript(scriptId) {
    const script = state.scripts.find(s => s.id === scriptId);
    if (!script || script.type !== 'branching') return;

    state.currentScriptId = scriptId;
    state.currentNodeId = script.startNodeId;
    state.branchingPath = [script.startNodeId];

    els.branchingViewTitle.textContent = script.title;
    els.branchingViewTags.innerHTML = script.tags.map(tag =>
      `<span class="tag">#${esc(tag)}</span>`
    ).join('');

    const pinSpan = els.branchingPinBtn.querySelector('span');
    if (pinSpan) pinSpan.textContent = script.pinned ? t('unpin') : t('pin');

    renderBranchingNode();
    showView('branching');
  }

  function renderBranchingNode() {
    const script = state.scripts.find(s => s.id === state.currentScriptId);
    if (!script) return;

    const node = script.nodes.find(n => n.id === state.currentNodeId);
    if (!node) return;

    // Breadcrumb
    els.branchingBreadcrumb.innerHTML = '';
    state.branchingPath.forEach((nodeId, i) => {
      const pathNode = script.nodes.find(n => n.id === nodeId);
      if (!pathNode) return;
      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'breadcrumb-sep';
        arrow.textContent = '→';
        els.branchingBreadcrumb.appendChild(arrow);
      }
      const crumb = document.createElement('span');
      crumb.className = i === state.branchingPath.length - 1 ? 'breadcrumb-item current' : 'breadcrumb-item';
      crumb.textContent = pathNode.label;
      crumb.addEventListener('click', () => {
        if (i < state.branchingPath.length - 1) {
          state.branchingPath = state.branchingPath.slice(0, i + 1);
          state.currentNodeId = nodeId;
          renderBranchingNode();
        }
      });
      els.branchingBreadcrumb.appendChild(crumb);
    });

    // Node content
    els.branchingNodeLabel.textContent = node.label;
    els.branchingNodeBody.innerHTML = node.body;

    // Choices
    els.branchingChoices.innerHTML = '';
    if (node.choices && node.choices.length > 0) {
      node.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'branching-choice-btn';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => {
          if (choice.targetNodeId) {
            state.currentNodeId = choice.targetNodeId;
            state.branchingPath.push(choice.targetNodeId);
            renderBranchingNode();
          }
        });
        els.branchingChoices.appendChild(btn);
      });
    } else {
      els.branchingChoices.innerHTML = `<div class="branching-end-state">
        <div class="empty-icon">✅</div>
        <div class="empty-title">${t('endOfFlow')}</div>
        <div class="empty-hint">${t('endOfFlowHint')}</div>
      </div>`;
    }

    // Nav buttons
    els.branchingGoBack.style.display = state.branchingPath.length > 1 ? 'inline-flex' : 'none';
  }

  function branchingGoBack() {
    if (state.branchingPath.length <= 1) return;
    state.branchingPath.pop();
    state.currentNodeId = state.branchingPath[state.branchingPath.length - 1];
    renderBranchingNode();
  }

  function branchingStartOver() {
    const script = state.scripts.find(s => s.id === state.currentScriptId);
    if (!script) return;
    state.currentNodeId = script.startNodeId;
    state.branchingPath = [script.startNodeId];
    renderBranchingNode();
  }

  function branchingCopyCurrentNode() {
    const script = state.scripts.find(s => s.id === state.currentScriptId);
    if (!script) return;
    const node = script.nodes.find(n => n.id === state.currentNodeId);
    if (!node) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = node.body;
    copyToClipboard(tempDiv.textContent || tempDiv.innerText || '');
  }

  function branchingDeleteCurrent() {
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

  async function branchingTogglePin() {
    if (!state.currentScriptId) return;
    await StorageAPI.togglePin(state.currentScriptId);
    await loadData();
    openBranchingScript(state.currentScriptId);
  }

  // ---- Type Chooser ----
  function showTypeChooser() {
    showView('typeChooser');
  }

  // ---- Branching Script Editor ----
  function generateNodeId() {
    return crypto.randomUUID ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  }

  function openBranchingEditor(scriptId) {
    state.editingScriptId = scriptId || null;
    state.selectedNodeId = null;

    // Populate folder dropdown
    els.branchEditorFolderSelect.innerHTML = `<option value="">${t('noFolder')}</option>`;
    state.folders.forEach(f => {
      els.branchEditorFolderSelect.innerHTML += `<option value="${f.id}">${esc(f.name)}</option>`;
    });

    // Show/hide type switch button
    if (els.typeSwitchGroupBranching) {
      els.typeSwitchGroupBranching.style.display = scriptId ? 'block' : 'none';
    }

    if (scriptId) {
      const script = state.scripts.find(s => s.id === scriptId);
      if (!script) return;
      els.branchEditorTitle.textContent = t('edit');
      els.branchEditorTitleInput.value = script.title;
      els.branchEditorFolderSelect.value = script.folderId || '';
      els.branchEditorTagsInput.value = script.tags.join(', ');
      state.branchingEditorNodes = JSON.parse(JSON.stringify(script.nodes || []));
      state.branchingEditorStartNodeId = script.startNodeId;
    } else {
      els.branchEditorTitle.textContent = t('branchingScript');
      els.branchEditorTitleInput.value = '';
      els.branchEditorFolderSelect.value = '';
      els.branchEditorTagsInput.value = '';
      // Create a default first node
      const firstId = generateNodeId();
      state.branchingEditorNodes = [{
        id: firstId,
        label: 'Opening',
        body: '',
        choices: []
      }];
      state.branchingEditorStartNodeId = firstId;
    }

    els.branchNodeEditorPanel.style.display = 'none';
    renderNodeList();
    showView('branchingEditor');
    els.branchEditorTitleInput.focus();
  }

  function renderNodeList() {
    const list = els.branchEditorNodeList;
    list.innerHTML = '';

    if (state.branchingEditorNodes.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:12px">
        <div class="empty-title">${t('noNodes')}</div>
        <div class="empty-hint">${t('noNodesHint')}</div>
      </div>`;
      return;
    }

    state.branchingEditorNodes.forEach((node, idx) => {
      const div = document.createElement('div');
      div.className = 'branch-node-item' +
        (node.id === state.selectedNodeId ? ' active' : '') +
        (node.id === state.branchingEditorStartNodeId ? ' start-node' : '');

      const isStart = node.id === state.branchingEditorStartNodeId;
      div.innerHTML = `
        <span class="branch-node-icon">${isStart ? '⭐' : '○'}</span>
        <span class="branch-node-label">${esc(node.label)}</span>
        <span class="branch-node-choices-count">${(node.choices || []).length} →</span>
      `;
      div.addEventListener('click', () => selectNode(node.id));
      list.appendChild(div);
    });
  }

  function selectNode(nodeId) {
    // Save current node editor state first
    saveCurrentNodeEditorState();

    state.selectedNodeId = nodeId;
    const node = state.branchingEditorNodes.find(n => n.id === nodeId);
    if (!node) return;

    els.nodeEditorLabel.value = node.label;
    els.nodeEditorIsStart.checked = node.id === state.branchingEditorStartNodeId;
    els.nodeEditorBody.innerHTML = node.body || '';
    renderNodeChoicesEditor(node);

    els.branchNodeEditorPanel.style.display = 'block';
    renderNodeList();
  }

  function saveCurrentNodeEditorState() {
    if (!state.selectedNodeId) return;
    const node = state.branchingEditorNodes.find(n => n.id === state.selectedNodeId);
    if (!node) return;
    node.label = els.nodeEditorLabel.value.trim() || 'Untitled';
    node.body = els.nodeEditorBody.innerHTML;
    if (els.nodeEditorIsStart.checked) {
      state.branchingEditorStartNodeId = node.id;
    }
    // Save choices from DOM
    const choiceRows = els.nodeEditorChoices.querySelectorAll('.branch-choice-item');
    node.choices = Array.from(choiceRows).map(row => ({
      label: row.querySelector('.choice-label-input').value.trim(),
      targetNodeId: row.querySelector('.choice-target-select').value || null
    }));
  }

  function renderNodeChoicesEditor(node) {
    els.nodeEditorChoices.innerHTML = '';
    (node.choices || []).forEach((choice, ci) => {
      const row = document.createElement('div');
      row.className = 'branch-choice-item';

      // Build target options
      let targetOptions = `<option value="">${t('selectTargetNode')}</option>`;
      state.branchingEditorNodes.forEach(n => {
        if (n.id === node.id) return; // can't point to self
        const sel = choice.targetNodeId === n.id ? 'selected' : '';
        targetOptions += `<option value="${n.id}" ${sel}>${esc(n.label)}</option>`;
      });

      row.innerHTML = `
        <input type="text" class="form-input choice-label-input" placeholder="${t('choiceLabelPlaceholder')}" value="${esc(choice.label)}">
        <select class="form-select choice-target-select">${targetOptions}</select>
        <button class="branch-choice-remove" title="${t('removeChoice')}">✕</button>
      `;
      row.querySelector('.branch-choice-remove').addEventListener('click', () => {
        node.choices.splice(ci, 1);
        renderNodeChoicesEditor(node);
      });
      els.nodeEditorChoices.appendChild(row);
    });

    if (!node.choices || node.choices.length === 0) {
      els.nodeEditorChoices.innerHTML = `<div class="empty-hint" style="padding:8px 0;opacity:0.6">${t('noChoices')}</div>`;
    }
  }

  function addNodeToEditor() {
    saveCurrentNodeEditorState();
    const newId = generateNodeId();
    const newNode = {
      id: newId,
      label: 'New Node',
      body: '',
      choices: []
    };
    state.branchingEditorNodes.push(newNode);
    if (state.branchingEditorNodes.length === 1) {
      state.branchingEditorStartNodeId = newId;
    }
    selectNode(newId);
  }

  function addChoiceToNode() {
    if (!state.selectedNodeId) return;
    saveCurrentNodeEditorState();
    const node = state.branchingEditorNodes.find(n => n.id === state.selectedNodeId);
    if (!node) return;
    if (!node.choices) node.choices = [];
    node.choices.push({ label: '', targetNodeId: null });
    renderNodeChoicesEditor(node);
  }

  function removeSelectedNode() {
    if (!state.selectedNodeId) return;
    showConfirm(t('removeNode'), t('removeNodeConfirm'), () => {
      state.branchingEditorNodes = state.branchingEditorNodes.filter(n => n.id !== state.selectedNodeId);
      if (state.branchingEditorStartNodeId === state.selectedNodeId && state.branchingEditorNodes.length > 0) {
        state.branchingEditorStartNodeId = state.branchingEditorNodes[0].id;
      }
      state.selectedNodeId = null;
      els.branchNodeEditorPanel.style.display = 'none';
      renderNodeList();
    });
  }

  async function saveBranchingScript() {
    saveCurrentNodeEditorState();

    const title = els.branchEditorTitleInput.value.trim();
    if (!title) {
      els.branchEditorTitleInput.focus();
      return;
    }

    if (state.branchingEditorNodes.length === 0) {
      showToast(t('noNodes'));
      return;
    }

    const tags = els.branchEditorTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
    const folderId = els.branchEditorFolderSelect.value || null;

    const scriptData = {
      title,
      tags,
      folderId,
      type: 'branching',
      nodes: state.branchingEditorNodes,
      startNodeId: state.branchingEditorStartNodeId
    };

    if (state.editingScriptId) {
      await StorageAPI.updateScript(state.editingScriptId, scriptData);
    } else {
      await StorageAPI.createScript(scriptData);
    }

    await loadData();
    showToast(t('saved'));
    showView('main');
    renderMain();
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
      } else if (state.currentView === 'branching') {
        showView('main');
        renderMain();
      } else if (state.currentView === 'branchingEditor' || state.currentView === 'typeChooser') {
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
    // Focus back to the correct editor
    if (state.currentView === 'branchingEditor') {
      els.nodeEditorBody.focus();
    } else {
      els.editorBodyInput.focus();
    }
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
    els.newScriptBtn.addEventListener('click', () => showTypeChooser());

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

    // Toolbars (both standard and branching editors)
    $$('.editor-toolbar').forEach(toolbar => {
      toolbar.addEventListener('click', handleToolbar);
    });

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

    // ---- Branching viewer ----
    els.branchingBackBtn.addEventListener('click', () => { showView('main'); renderMain(); });
    els.branchingCopyBtn.addEventListener('click', branchingCopyCurrentNode);
    els.branchingGoBack.addEventListener('click', branchingGoBack);
    els.branchingStartOver.addEventListener('click', branchingStartOver);
    els.branchingEditBtn.addEventListener('click', () => openBranchingEditor(state.currentScriptId));
    els.branchingPinBtn.addEventListener('click', branchingTogglePin);
    els.branchingDeleteBtn.addEventListener('click', branchingDeleteCurrent);

    // ---- Type chooser ----
    els.typeChooserBackBtn.addEventListener('click', () => { showView('main'); renderMain(); });
    els.chooseStandard.addEventListener('click', () => openEditor(null));
    els.chooseBranching.addEventListener('click', () => openBranchingEditor(null));

    // ---- Branching editor ----
    els.branchEditorBackBtn.addEventListener('click', () => { showView('main'); renderMain(); });
    els.saveBranchingBtn.addEventListener('click', saveBranchingScript);
    els.addNodeBtn.addEventListener('click', addNodeToEditor);
    els.addChoiceBtn.addEventListener('click', addChoiceToNode);
    els.closeNodeEditor.addEventListener('click', () => {
      saveCurrentNodeEditorState();
      state.selectedNodeId = null;
      els.branchNodeEditorPanel.style.display = 'none';
      renderNodeList();
    });
    els.nodeEditorIsStart.addEventListener('change', () => {
      if (els.nodeEditorIsStart.checked && state.selectedNodeId) {
        state.branchingEditorStartNodeId = state.selectedNodeId;
        renderNodeList();
      }
    });

    // ---- Type switching ----
    if (els.switchTypeBtnStandard) {
      els.switchTypeBtnStandard.addEventListener('click', () => {
        showConfirm(t('switchToBranching'), t('switchTypeWarning'), () => {
          openBranchingEditor(state.editingScriptId);
        });
      });
    }
    if (els.switchTypeBtnBranching) {
      els.switchTypeBtnBranching.addEventListener('click', () => {
        showConfirm(t('switchToStandard'), t('switchTypeWarning'), () => {
          openEditor(state.editingScriptId);
        });
      });
    }

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
