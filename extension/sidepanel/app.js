// ScriptPad — Main App Logic

(async function () {
  'use strict';

  // ---- State ----
  let state = {
    scripts: [],
    folders: [],
    notes: [],
    knowledgeBase: [],
    settings: { language: 'en', theme: 'dark', hotkey: 'Ctrl+Shift+S' },
    currentView: 'main',
    activeTab: 'scripts', // 'scripts', 'notes', or 'kb'
    kbCategoryFilter: 'all',
    currentScriptId: null,
    currentNoteId: null,
    currentKBEntryId: null,
    editingKBEntryId: null, // null = new, string = editing existing
    editingScriptId: null, // null = new, string = editing existing
    selectedIndex: -1,
    searchQuery: '',
    // AI Assistant state
    aiPanelOpen: false,
    aiMessages: [],      // { role: 'user'|'assistant', content: string }
    aiLoading: false,
    aiError: null,
    // Branching viewer state
    branchingPath: [],       // array of node IDs visited
    currentNodeId: null,
    // Branching editor state
    branchingEditorNodes: [],
    branchingEditorStartNodeId: null,
    selectedNodeId: null,
    // Teams state
    myTeams: [],          // teams the user belongs to (with role)
    sharedScripts: [],    // shared team scripts (read-only), normalized
    // Account state
    user: null,       // { email, id } or null
    plan: 'free',     // 'free' or 'pro'
    authMode: 'signin' // 'signin' or 'signup'
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
    branchingEditor: $('#branchingEditorView'),
    note: $('#noteView'),
    kbDetail: $('#kbDetailView'),
    kbEditor: $('#kbEditorView'),
    signIn: $('#signInView'),
    upgrade: $('#upgradeView')
  };

  const els = {
    searchInput: $('#searchInput'),
    panelContent: $('#panelContent'),
    langBtn: $('#langBtn'),
    themeBtn: $('#themeBtn'),
    settingsBtn: $('#settingsBtn'),
    newScriptBtn: $('#newScriptBtn'),
    newFolderBtnMain: $('#newFolderBtnMain'),
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
    // Tabs
    tabBar: $('#tabBar'),
    scriptsTab: $('#scriptsTab'),
    notesTab: $('#notesTab'),
    notesContent: $('#notesContent'),
    notesCountBar: $('#notesCountBar'),
    notesLimitBanner: $('#notesLimitBanner'),
    notesLimitTitle: $('#notesLimitTitle'),
    notesLimitHint: $('#notesLimitHint'),
    quickNoteInput: $('#quickNoteInput'),
    quickNoteSave: $('#quickNoteSave'),
    quickNoteArea: $('#quickNoteArea'),
    notesList: $('#notesList'),
    scriptsFooter: $('#scriptsFooter'),
    notesFooter: $('#notesFooter'),
    newNoteBtnFooter: $('#newNoteBtnFooter'),
    // KB tab & content
    kbTab: $('#kbTab'),
    kbContent: $('#kbContent'),
    kbCountBar: $('#kbCountBar'),
    kbLimitBanner: $('#kbLimitBanner'),
    kbLimitTitle: $('#kbLimitTitle'),
    kbLimitHint: $('#kbLimitHint'),
    kbFilterChips: $('#kbFilterChips'),
    kbList: $('#kbList'),
    kbFooter: $('#kbFooter'),
    newKBEntryBtn: $('#newKBEntryBtn'),
    // KB detail
    kbDetailBackBtn: $('#kbDetailBackBtn'),
    kbDetailTitle: $('#kbDetailTitle'),
    copyKBEntryBtn: $('#copyKBEntryBtn'),
    kbDetailCategory: $('#kbDetailCategory'),
    kbDetailTags: $('#kbDetailTags'),
    kbDetailBody: $('#kbDetailBody'),
    editKBEntryBtn: $('#editKBEntryBtn'),
    pinKBEntryBtn: $('#pinKBEntryBtn'),
    deleteKBEntryBtn: $('#deleteKBEntryBtn'),
    // KB editor
    kbEditorBackBtn: $('#kbEditorBackBtn'),
    kbEditorTitle: $('#kbEditorTitle'),
    saveKBEntryBtn: $('#saveKBEntryBtn'),
    kbEditorTitleInput: $('#kbEditorTitleInput'),
    kbEditorCategorySelect: $('#kbEditorCategorySelect'),
    kbEditorTagsInput: $('#kbEditorTagsInput'),
    kbEditorBodyInput: $('#kbEditorBodyInput'),
    // Note detail
    noteBackBtn: $('#noteBackBtn'),
    noteViewTitle: $('#noteViewTitle'),
    copyNoteBtn: $('#copyNoteBtn'),
    noteEditTextarea: $('#noteEditTextarea'),
    deleteNoteBtn: $('#deleteNoteBtn'),
    // Account & Auth
    accountSection: $('#accountSection'),
    accountSignedOut: $('#accountSignedOut'),
    accountSignedIn: $('#accountSignedIn'),
    accountEmail: $('#accountEmail'),
    accountPlan: $('#accountPlan'),
    signInBtn: $('#signInBtn'),
    signOutBtn: $('#signOutBtn'),
    upgradeCtaSettings: $('#upgradeCtaSettings'),
    upgradeFromSettings: $('#upgradeFromSettings'),
    // Sign In view
    signInBackBtn: $('#signInBackBtn'),
    authEmailInput: $('#authEmailInput'),
    authPasswordInput: $('#authPasswordInput'),
    authError: $('#authError'),
    authSubmitBtn: $('#authSubmitBtn'),
    authToggleLink: $('#authToggleLink'),
    authForgotLink: $('#authForgotLink'),
    authForgotWrapper: $('#authForgotWrapper'),
    authSuccess: $('#authSuccess'),
    // Upgrade view
    upgradeBackBtn: $('#upgradeBackBtn'),
    subscribeMonthlyBtn: $('#subscribeMonthlyBtn'),
    subscribeAnnualBtn: $('#subscribeAnnualBtn'),
    // AI Assistant
    aiFab: $('#aiFab'),
    aiPanel: $('#aiPanel'),
    aiMessages: $('#aiMessages'),
    aiTyping: $('#aiTyping'),
    aiInput: $('#aiInput'),
    aiSendBtn: $('#aiSendBtn'),
    aiCloseBtn: $('#aiCloseBtn'),
    aiClearBtn: $('#aiClearBtn'),
    aiQueriesBadge: $('#aiQueriesBadge'),
    aiLimitOverlay: $('#aiLimitOverlay'),
    aiUpgradeBtn: $('#aiUpgradeBtn'),
    aiInputArea: $('#aiInputArea'),
    aiBackdrop: $('#aiBackdrop'),
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

    // Language toggle in onboarding
    const onbLangBtn = $('#onboardingLangBtn');
    if (onbLangBtn) {
      onbLangBtn.textContent = currentLanguage === 'en' ? 'ES' : 'EN';
      onbLangBtn.addEventListener('click', () => {
        const newLang = currentLanguage === 'en' ? 'es' : 'en';
        setLanguage(newLang);
        state.settings.language = newLang;
        StorageAPI.updateSettings({ language: newLang });
        onbLangBtn.textContent = newLang === 'en' ? 'ES' : 'EN';
        updateOnboardingI18n();
        updateLangBtn();
        updateI18n();
      });
    }

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
    // Restore last active tab
    restoreActiveTab();
    loadAccountState();
    renderMain();
    initOnboarding();
  }

  function restoreActiveTab() {
    chrome.storage.local.get(['activeTab'], (data) => {
      if (data.activeTab === 'notes') {
        state.activeTab = 'notes';
        switchTab('notes');
      } else if (data.activeTab === 'kb') {
        state.activeTab = 'kb';
        switchTab('kb');
      }
    });
  }

  async function loadData() {
    const data = await StorageAPI.getAll();
    state.scripts = data.scripts;
    state.folders = data.folders;
    state.notes = data.notes;
    state.knowledgeBase = data.knowledgeBase;
    state.settings = data.settings;
    SearchEngine.setScripts(state.scripts);
    SearchEngine.setNotes(state.notes);
    SearchEngine.setKB(state.knowledgeBase);
  }

  // ---- Views ----
  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    state.currentView = name;
  }

  // ---- Tab Switching ----
  function switchTab(tab) {
    state.activeTab = tab;
    state.searchQuery = '';
    els.searchInput.value = '';

    // Update tab buttons
    els.scriptsTab.classList.toggle('active', tab === 'scripts');
    els.notesTab.classList.toggle('active', tab === 'notes');
    els.kbTab.classList.toggle('active', tab === 'kb');

    // Toggle content visibility
    els.panelContent.style.display = tab === 'scripts' ? '' : 'none';
    els.notesContent.style.display = tab === 'notes' ? '' : 'none';
    els.kbContent.style.display = tab === 'kb' ? '' : 'none';
    els.scriptsFooter.style.display = tab === 'scripts' ? '' : 'none';
    els.notesFooter.style.display = tab === 'notes' ? '' : 'none';
    els.kbFooter.style.display = tab === 'kb' ? '' : 'none';

    // Update search placeholder
    if (tab === 'kb') {
      els.searchInput.placeholder = t('searchKBPlaceholder');
    } else if (tab === 'notes') {
      els.searchInput.placeholder = t('searchNotesPlaceholder');
    } else {
      els.searchInput.placeholder = t('searchPlaceholder');
    }

    // Persist tab choice
    chrome.storage.local.set({ activeTab: tab });

    if (tab === 'notes') {
      renderNotes();
    } else if (tab === 'kb') {
      renderKB();
    } else {
      renderMain();
    }
  }

  // ---- Render: Main List ----
  function renderMain() {
    const content = els.panelContent;
    content.innerHTML = '';

    // Scripts & folders count bar
    const scriptCount = state.scripts.length;
    const folderCount = state.folders.length;
    const scriptLimit = getEffectiveScriptLimit();
    const folderLimit = getEffectiveFolderLimit();
    const atScriptLimit = !isPro() && scriptCount >= scriptLimit;
    const atFolderLimit = !isPro() && folderCount >= folderLimit;

    // Show limit bar (only for free tier)
    if (!isPro()) {
      const limitsBar = document.createElement('div');
      limitsBar.className = 'limits-bar';
      limitsBar.innerHTML = `<span>${scriptCount}/${StorageAPI.FREE_SCRIPT_LIMIT} ${t('scriptsCount')}</span><span>${folderCount}/${StorageAPI.FREE_FOLDER_LIMIT} ${t('foldersCount')}</span>`;
      content.appendChild(limitsBar);
    }

    // Show limit warning banner if either is at limit
    if (atScriptLimit || atFolderLimit) {
      const banner = document.createElement('div');
      banner.className = 'notes-limit-banner clickable-banner';
      const msg = atScriptLimit ? t('scriptLimitReached') : t('folderLimitReached');
      const hint = t('upgradeToPro');
      banner.innerHTML = `<span class="notes-limit-icon">🔒</span><div class="notes-limit-text"><strong>${msg}</strong><span>${hint}</span></div>`;
      banner.addEventListener('click', openUpgrade);
      content.appendChild(banner);
    }

    // Update footer button states
    els.newScriptBtn.disabled = atScriptLimit;
    els.newFolderBtnMain.disabled = atFolderLimit;
    if (atScriptLimit) {
      els.newScriptBtn.title = t('scriptLimitWarning');
    } else {
      els.newScriptBtn.title = '';
    }
    if (atFolderLimit) {
      els.newFolderBtnMain.title = t('folderLimitWarning');
    } else {
      els.newFolderBtnMain.title = '';
    }

    let displayScripts;

    if (state.searchQuery) {
      if (state.activeTab === 'notes') {
        renderNotes();
        return;
      }
      displayScripts = SearchEngine.search(state.searchQuery);
      content.innerHTML = `<div class="section-label">🔍 ${t('searchResults')} (${displayScripts.length})</div>`;
      if (displayScripts.length === 0) {
        content.innerHTML += renderEmptyState('🔍', t('noResults'), t('noResultsHint'));
      } else {
        displayScripts.forEach(s => content.appendChild(createScriptItem(s)));
      }
      // "Ask AI" suggestion after search results
      const askAIDiv = document.createElement('div');
      askAIDiv.className = 'ask-ai-suggestion';
      askAIDiv.innerHTML = `<button class="ask-ai-search-btn">🤖 ${t('aiAskAbout')} "${esc(state.searchQuery)}"</button>`;
      askAIDiv.querySelector('button').addEventListener('click', () => {
        toggleAIPanel(true);
        els.aiInput.value = state.searchQuery;
        sendAIMessage();
      });
      content.appendChild(askAIDiv);
      return;
    }

    // Most Used (analytics-powered)
    renderMostUsedSection(content);

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

    // Team Library (shared, read-only, pushed by managers)
    const shared = state.sharedScripts || [];
    if (shared.length > 0) {
      content.insertAdjacentHTML('beforeend', `<div class="section-label" style="margin-top:6px">👥 ${t('teamLibrary')}</div>`);
      shared.forEach(s => content.appendChild(createScriptItem(s)));
    }

    if (state.scripts.length === 0 && shared.length === 0) {
      content.innerHTML = renderEmptyState('📝', t('noScripts'), t('noScriptsHint'));
    }
  }

  // ---- Analytics: Most Used Section ----
  async function renderMostUsedSection(container) {
    const topScripts = await StorageAPI.getTopScripts(3);
    if (topScripts.length === 0) return;

    // Only show if there's meaningful data (at least 2 total events)
    const hasData = topScripts.some(s => s.total >= 2);
    if (!hasData) return;

    const section = document.createElement('div');
    section.className = 'most-used-section';
    section.innerHTML = `<div class="section-label">📈 ${t('mostUsed')}</div>`;

    topScripts.forEach((entry, i) => {
      const script = state.scripts.find(s => s.id === entry.id);
      if (!script) return;

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const div = document.createElement('div');
      div.className = 'most-used-item';
      div.innerHTML = `
        <span class="most-used-rank">${medal}</span>
        <div class="most-used-info">
          <div class="most-used-title">${esc(script.title)}</div>
          <div class="most-used-stats">
            <span>👁 ${entry.views}</span>
            <span>📋 ${entry.copies}</span>
          </div>
        </div>
      `;
      div.addEventListener('click', () => openScript(script.id));
      section.appendChild(div);
    });

    container.appendChild(section);
  }

  // Highlight matching text in search results
  function highlightMatch(text, query) {
    if (!query || !text) return esc(text);
    const escaped = esc(text);
    const pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${pattern})`, 'gi');
    return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
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
    const query = state.searchQuery;
    const titleHtml = query ? highlightMatch(script.title, query) : esc(script.title);

    // Shared team scripts: read-only badge
    if (script.shared) {
      div.classList.add('shared-script');
      div.innerHTML = `
        <span class="script-icon">${icon}</span>
        <div class="script-info">
          <div class="script-title">${titleHtml} <span class="shared-badge" title="${esc(script.teamName || '')}">👥 ${t('sharedTag')}</span></div>
          <div class="script-meta">${esc(script.teamName || t('teamLibrary'))} · ${t('updatedAgo')} ${timeStr}</div>
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

    const isManager = (state.myTeams || []).some(tm => tm.role === 'manager');

    div.innerHTML = `
      <span class="script-icon">${icon}</span>
      <div class="script-info">
        <div class="script-title">${titleHtml}${script.pinned ? ' <span class="pin-icon">📌</span>' : ''}</div>
        <div class="script-meta">${esc(folderName)} · ${t('updatedAgo')} ${timeStr}</div>
      </div>
      ${isManager ? `<button class="push-btn" title="${t('pushToTeam')}">📤</button>` : ''}
      <button class="copy-btn" title="${t('copy')}">📋</button>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.closest('.copy-btn') || e.target.closest('.push-btn')) return;
      openScript(script.id);
    });
    div.querySelector('.copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      copyScriptText(script);
    });
    const pushBtn = div.querySelector('.push-btn');
    if (pushBtn) {
      pushBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pushScriptToTeam(script.id);
      });
    }

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

  // ---- Render: Notes List ----
  function renderNotes() {
    const list = els.notesList;
    list.innerHTML = '';

    const noteCount = state.notes.length;
    const noteLimit = getEffectiveNoteLimit();
    const atLimit = !isPro() && noteCount >= noteLimit;

    // Count bar (only for free tier)
    if (!isPro()) {
      els.notesCountBar.textContent = `${noteCount}/${StorageAPI.FREE_NOTE_LIMIT} ${t('notesCount')}`;
      els.notesCountBar.style.display = '';
    } else {
      els.notesCountBar.style.display = 'none';
    }

    // Limit banner
    if (atLimit) {
      els.notesLimitBanner.style.display = 'flex';
      els.notesLimitTitle.textContent = t('notesLimitReached');
      els.notesLimitHint.textContent = t('upgradeToProNotes');
    } else {
      els.notesLimitBanner.style.display = 'none';
    }

    // Quick-add area: disable if at limit
    els.quickNoteInput.disabled = atLimit;
    els.quickNoteSave.disabled = atLimit;
    if (atLimit) {
      els.quickNoteInput.placeholder = t('noteLimitWarning');
    } else {
      els.quickNoteInput.placeholder = t('quickNotePlaceholder');
    }

    // Sort by most recent
    let displayNotes = [...state.notes].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Filter by search if active
    if (state.searchQuery) {
      displayNotes = SearchEngine.searchNotes(state.searchQuery);
      if (displayNotes.length === 0) {
        list.innerHTML = renderEmptyState('🔍', t('noResults'), t('noResultsHint'));
        return;
      }
    }

    if (displayNotes.length === 0) {
      list.innerHTML = renderEmptyState('📝', t('noNotes'), t('noNotesHint'));
      return;
    }

    displayNotes.forEach(note => list.appendChild(createNoteItem(note)));
  }

  function createNoteItem(note) {
    const div = document.createElement('div');
    div.className = 'note-item';
    div.dataset.id = note.id;

    const lines = (note.body || '').split('\n').filter(l => l.trim());
    const title = note.title || t('noteTitle');
    const preview = lines.length > 1 ? lines[1].trim() : '';
    const timeStr = timeAgo(note.updatedAt);
    const query = state.searchQuery;
    const titleHtml = query ? highlightMatch(title, query) : esc(title);
    const previewHtml = query && preview ? highlightMatch(preview, query) : esc(preview);

    div.innerHTML = `
      <div class="note-info">
        <div class="note-title">${titleHtml}</div>
        ${preview ? `<div class="note-preview">${previewHtml}</div>` : ''}
        <div class="note-meta">${t('updatedAgo')} ${timeStr}</div>
      </div>
      <button class="note-copy-btn" title="${t('copy')}">📋</button>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.closest('.note-copy-btn')) return;
      openNote(note.id);
    });
    div.querySelector('.note-copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(note.body || '');
    });

    return div;
  }

  // ---- Note Detail ----
  function openNote(noteId) {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;

    state.currentNoteId = noteId;
    els.noteViewTitle.textContent = note.title || t('noteTitle');
    els.noteEditTextarea.value = note.body || '';

    showView('note');
    els.noteEditTextarea.focus();
  }

  let noteAutoSaveTimer = null;
  function handleNoteAutoSave() {
    if (noteAutoSaveTimer) clearTimeout(noteAutoSaveTimer);
    noteAutoSaveTimer = setTimeout(async () => {
      if (!state.currentNoteId) return;
      const body = els.noteEditTextarea.value;
      const updated = await StorageAPI.updateNote(state.currentNoteId, { body });
      if (updated) {
        els.noteViewTitle.textContent = updated.title;
        await loadData();
      }
    }, 800);
  }

  async function quickAddNote() {
    const body = els.quickNoteInput.value.trim();
    if (!body) return;
    if (!isPro() && state.notes.length >= StorageAPI.FREE_NOTE_LIMIT) {
      showToast(t('noteLimitWarning'));
      return;
    }
    await StorageAPI.createNote({ body });
    els.quickNoteInput.value = '';
    await loadData();
    renderNotes();
    showToast(t('notesSaved'));
  }

  function deleteCurrentNote() {
    if (!state.currentNoteId) return;
    showConfirm(t('deleteNoteConfirm'), t('deleteConfirmText'), async () => {
      await StorageAPI.deleteNote(state.currentNoteId);
      state.currentNoteId = null;
      await loadData();
      showView('main');
      switchTab('notes');
      showToast(t('noteDeleted'));
    });
  }

  function copyCurrentNote() {
    const body = els.noteEditTextarea.value || '';
    copyToClipboard(body);
  }

  // ---- Knowledge Base ----
  const KB_CATEGORIES = ['products', 'bundles', 'retention', 'objections', 'custom'];
  const KB_CATEGORY_COLORS = {
    products: '#3b82f6',
    bundles: '#8b5cf6',
    retention: '#f59e0b',
    objections: '#ef4444',
    custom: '#6b7280'
  };

  function getKBCategoryLabel(cat) {
    const map = {
      products: 'kbCategoryProducts',
      bundles: 'kbCategoryBundles',
      retention: 'kbCategoryRetention',
      objections: 'kbCategoryObjections',
      custom: 'kbCategoryCustom'
    };
    return t(map[cat] || 'kbCategoryCustom');
  }

  function renderKB() {
    const list = els.kbList;
    list.innerHTML = '';

    const kbCount = (state.knowledgeBase || []).length;
    const kbLimit = getEffectiveKBLimit();
    const atLimit = !isPro() && kbCount >= kbLimit;

    // Count bar (only for free tier)
    if (!isPro()) {
      els.kbCountBar.textContent = `${kbCount}/${StorageAPI.FREE_KB_LIMIT} ${t('kbEntriesCount')}`;
      els.kbCountBar.style.display = '';
    } else {
      els.kbCountBar.style.display = 'none';
    }

    // Limit banner
    if (atLimit) {
      els.kbLimitBanner.style.display = 'flex';
      els.kbLimitTitle.textContent = t('kbLimitReached');
      els.kbLimitHint.textContent = t('upgradeToProKB');
    } else {
      els.kbLimitBanner.style.display = 'none';
    }

    // Disable new entry button if at limit
    els.newKBEntryBtn.disabled = atLimit;
    els.newKBEntryBtn.title = atLimit ? t('kbLimitWarning') : '';

    // Update filter chip labels
    updateKBFilterChips();

    // Filter entries
    let displayEntries = [...(state.knowledgeBase || [])];

    // Apply search
    if (state.searchQuery) {
      displayEntries = SearchEngine.searchKB(state.searchQuery);
    }

    // Apply category filter
    if (state.kbCategoryFilter !== 'all') {
      displayEntries = displayEntries.filter(e => e.category === state.kbCategoryFilter);
    }

    // Sort: pinned first, then by updatedAt
    displayEntries.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    if (displayEntries.length === 0) {
      if (state.searchQuery || state.kbCategoryFilter !== 'all') {
        list.innerHTML = renderEmptyState('\uD83D\uDD0D', t('noResults'), t('noResultsHint'));
      } else {
        list.innerHTML = renderEmptyState('\uD83D\uDCDA', t('noKBEntries'), t('noKBEntriesHint'));
      }
      return;
    }

    displayEntries.forEach(entry => list.appendChild(createKBItem(entry)));
  }

  function updateKBFilterChips() {
    const chips = els.kbFilterChips.querySelectorAll('.kb-chip');
    chips.forEach(chip => {
      const cat = chip.dataset.category;
      chip.classList.toggle('active', cat === state.kbCategoryFilter);
      // Update label text
      if (cat === 'all') {
        chip.textContent = t('kbCategoryAll');
      } else {
        chip.textContent = getKBCategoryLabel(cat);
      }
      // Set active color
      if (cat === state.kbCategoryFilter && cat !== 'all') {
        chip.style.background = KB_CATEGORY_COLORS[cat] || '';
        chip.style.color = '#fff';
        chip.style.borderColor = KB_CATEGORY_COLORS[cat] || '';
      } else if (cat === state.kbCategoryFilter && cat === 'all') {
        chip.style.background = 'var(--accent)';
        chip.style.color = '#fff';
        chip.style.borderColor = 'var(--accent)';
      } else {
        chip.style.background = '';
        chip.style.color = '';
        chip.style.borderColor = '';
      }
    });
  }

  function createKBItem(entry) {
    const div = document.createElement('div');
    div.className = 'kb-entry-item';
    div.dataset.id = entry.id;

    const color = KB_CATEGORY_COLORS[entry.category] || KB_CATEGORY_COLORS.custom;
    const categoryLabel = getKBCategoryLabel(entry.category);
    const timeStr = timeAgo(entry.updatedAt);
    const tagsHtml = (entry.tags || []).slice(0, 3).map(tag =>
      `<span class="kb-tag">#${esc(tag)}</span>`
    ).join('');

    div.innerHTML = `
      <span class="kb-entry-dot" style="background:${color}"></span>
      <div class="kb-entry-info">
        <div class="kb-entry-title">${esc(entry.title)}${entry.pinned ? ' <span class="pin-icon">\uD83D\uDCCC</span>' : ''}</div>
        <div class="kb-entry-meta">
          <span class="kb-category-badge" style="background:${color}20;color:${color};border-color:${color}40">${categoryLabel}</span>
          ${tagsHtml}
          <span class="kb-entry-time">${t('updatedAgo')} ${timeStr}</span>
        </div>
      </div>
      <button class="copy-btn" title="${t('copy')}">\uD83D\uDCCB</button>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.closest('.copy-btn')) return;
      openKBEntry(entry.id);
    });
    div.querySelector('.copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      copyKBEntryText(entry);
    });

    return div;
  }

  function copyKBEntryText(entry) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = entry.body || '';
    copyToClipboard(tempDiv.textContent || tempDiv.innerText || '');
  }

  function openKBEntry(entryId) {
    const entry = (state.knowledgeBase || []).find(e => e.id === entryId);
    if (!entry) return;

    state.currentKBEntryId = entryId;
    els.kbDetailTitle.textContent = entry.title;

    // Category badge
    const color = KB_CATEGORY_COLORS[entry.category] || KB_CATEGORY_COLORS.custom;
    const categoryLabel = getKBCategoryLabel(entry.category);
    els.kbDetailCategory.textContent = categoryLabel;
    els.kbDetailCategory.style.background = `${color}20`;
    els.kbDetailCategory.style.color = color;
    els.kbDetailCategory.style.borderColor = `${color}40`;

    // Tags
    els.kbDetailTags.innerHTML = (entry.tags || []).map(tag =>
      `<span class="tag">#${esc(tag)}</span>`
    ).join('');

    // Body
    els.kbDetailBody.innerHTML = entry.body || '';

    // Pin button text
    const pinSpan = els.pinKBEntryBtn.querySelector('span');
    if (pinSpan) pinSpan.textContent = entry.pinned ? t('unpin') : t('pin');

    showView('kbDetail');
  }

  function openKBEditor(entryId) {
    state.editingKBEntryId = entryId || null;

    // Update category dropdown labels
    const catSelect = els.kbEditorCategorySelect;
    catSelect.querySelectorAll('option').forEach(opt => {
      opt.textContent = getKBCategoryLabel(opt.value);
    });

    if (entryId) {
      const entry = (state.knowledgeBase || []).find(e => e.id === entryId);
      if (!entry) return;
      els.kbEditorTitle.textContent = t('edit');
      els.kbEditorTitleInput.value = entry.title;
      els.kbEditorCategorySelect.value = entry.category || 'custom';
      els.kbEditorTagsInput.value = (entry.tags || []).join(', ');
      els.kbEditorBodyInput.innerHTML = entry.body || '';
    } else {
      els.kbEditorTitle.textContent = t('newKBEntry');
      els.kbEditorTitleInput.value = '';
      els.kbEditorCategorySelect.value = 'products';
      els.kbEditorTagsInput.value = '';
      els.kbEditorBodyInput.innerHTML = '';
    }

    showView('kbEditor');
    els.kbEditorTitleInput.focus();
  }

  async function saveKBEntry() {
    const title = els.kbEditorTitleInput.value.trim();
    if (!title) {
      els.kbEditorTitleInput.focus();
      return;
    }

    const category = els.kbEditorCategorySelect.value;
    const body = els.kbEditorBodyInput.innerHTML;
    const tags = els.kbEditorTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);

    if (state.editingKBEntryId) {
      await StorageAPI.updateKBEntry(state.editingKBEntryId, { title, category, body, tags });
    } else {
      if (!isPro() && (state.knowledgeBase || []).length >= StorageAPI.FREE_KB_LIMIT) {
        showToast(t('kbLimitWarning'));
        return;
      }
      await StorageAPI.createKBEntry({ title, category, body, tags });
    }

    await loadData();
    showToast(t('kbEntrySaved'));
    showView('main');
    switchTab('kb');
  }

  function deleteCurrentKBEntry() {
    if (!state.currentKBEntryId) return;
    showConfirm(t('deleteKBConfirm'), t('deleteConfirmText'), async () => {
      await StorageAPI.deleteKBEntry(state.currentKBEntryId);
      state.currentKBEntryId = null;
      await loadData();
      showView('main');
      switchTab('kb');
      showToast(t('kbEntryDeleted'));
    });
  }

  async function toggleKBPinCurrent() {
    if (!state.currentKBEntryId) return;
    await StorageAPI.toggleKBPin(state.currentKBEntryId);
    await loadData();
    openKBEntry(state.currentKBEntryId);
  }

  function copyCurrentKBEntry() {
    const entry = (state.knowledgeBase || []).find(e => e.id === state.currentKBEntryId);
    if (!entry) return;
    copyKBEntryText(entry);
  }

  function getEffectiveKBLimit() {
    return isPro() ? Infinity : StorageAPI.FREE_KB_LIMIT;
  }

  // ---- Account & Auth ----
  function isPro() {
    return state.plan === 'pro';
  }

  function getEffectiveScriptLimit() {
    return isPro() ? Infinity : StorageAPI.FREE_SCRIPT_LIMIT;
  }

  function getEffectiveFolderLimit() {
    return isPro() ? Infinity : StorageAPI.FREE_FOLDER_LIMIT;
  }

  function getEffectiveNoteLimit() {
    return isPro() ? Infinity : StorageAPI.FREE_NOTE_LIMIT;
  }

  function loadAccountState() {
    // Initialize Auth module with callback for state changes
    Auth.init(({ user, plan }) => {
      state.user = user;
      state.plan = plan;
      if (typeof Teams !== 'undefined' && Auth.getClient) {
        Teams.init(Auth.getClient());
      }
      // Refresh shared team scripts whenever auth changes
      refreshSharedScripts();
      updateAccountUI();
      // Re-render current view to reflect plan changes
      if (state.currentView === 'main') {
        if (state.activeTab === 'notes') renderNotes();
        else if (state.activeTab === 'kb') renderKB();
        else renderMain();
      }
    });
  }

  function updateAccountUI() {
    if (state.user) {
      els.accountSignedOut.style.display = 'none';
      els.accountSignedIn.style.display = 'flex';
      els.accountEmail.textContent = state.user.email;
      els.accountPlan.textContent = isPro() ? t('proPlan') : t('freePlan');
      els.upgradeCtaSettings.style.display = isPro() ? 'none' : 'block';
    } else {
      els.accountSignedOut.style.display = 'flex';
      els.accountSignedIn.style.display = 'none';
      els.upgradeCtaSettings.style.display = 'none';
    }
  }

  function openSignIn() {
    state.authMode = 'signin';
    els.authEmailInput.value = '';
    els.authPasswordInput.value = '';
    els.authError.style.display = 'none';
    els.authSuccess.style.display = 'none';
    updateAuthUI();
    showView('signIn');
    els.authEmailInput.focus();
  }

  function updateAuthUI() {
    const isSignup = state.authMode === 'signup';
    const titleEl = els.signInBackBtn.parentElement.querySelector('.editor-title');
    if (titleEl) titleEl.textContent = isSignup ? t('createAccountTitle') : t('signInTitle');
    const submitSpan = els.authSubmitBtn.querySelector('span');
    if (submitSpan) submitSpan.textContent = isSignup ? t('createAccount') : t('signIn');
    const toggleLink = els.authToggleLink;
    const toggleText = toggleLink.previousElementSibling;
    if (toggleText) toggleText.textContent = isSignup ? t('haveAccount') : t('noAccount');
    toggleLink.textContent = isSignup ? t('signInLink') : t('createAccount');
    // Show forgot password only on sign-in mode
    els.authForgotWrapper.style.display = isSignup ? 'none' : 'block';
  }

  function showAuthError(msg) {
    els.authError.textContent = msg;
    els.authError.style.display = 'block';
  }

  async function handleAuth() {
    const email = els.authEmailInput.value.trim();
    const password = els.authPasswordInput.value;

    // Validate
    if (!email || !email.includes('@')) {
      showAuthError(t('authErrorEmail'));
      return;
    }
    if (!password || password.length < 6) {
      showAuthError(t('authErrorPassword'));
      return;
    }

    els.authError.style.display = 'none';
    const submitSpan = els.authSubmitBtn.querySelector('span');
    const originalText = submitSpan.textContent;
    submitSpan.textContent = state.authMode === 'signup' ? t('creatingAccount') : t('signingIn');
    els.authSubmitBtn.disabled = true;

    try {
      if (state.authMode === 'signup') {
        await Auth.signUp(email, password);
      } else {
        await Auth.signIn(email, password);
      }

      showView('settings');
      showToast(t('signIn') + ' ✓');
    } catch (err) {
      console.error('[ScriptPad] Auth error:', err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid email or password')) {
        showAuthError(t('authErrorInvalid'));
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        showAuthError(t('authErrorAlreadyRegistered'));
      } else if (msg.includes('email not confirmed')) {
        showAuthError(t('authErrorNotConfirmed'));
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        showAuthError(t('authErrorRateLimit'));
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed')) {
        showAuthError(t('authErrorNetwork'));
      } else {
        showAuthError(err.message || t('authErrorNetwork'));
      }
    } finally {
      submitSpan.textContent = originalText;
      els.authSubmitBtn.disabled = false;
    }
  }

  async function handleSignOut() {
    try {
      await Auth.signOut();
      showToast(t('signOut') + ' ✓');
    } catch (err) {
      console.error('[ScriptPad] Sign out error:', err);
    }
  }

  function openUpgrade() {
    if (!state.user) {
      openSignIn();
      return;
    }
    showView('upgrade');
  }

  async function handleSubscribe(period) {
    const planId = period === 'annual'
      ? CONFIG.PAYPAL_ANNUAL_PLAN_ID
      : CONFIG.PAYPAL_MONTHLY_PLAN_ID;

    if (!planId) {
      showToast('Coming soon! 🚀');
      return;
    }

    if (!state.user) {
      openSignIn();
      return;
    }

    // Show loading state
    showToast(t('redirectingToPayPal'));

    // Call our Supabase Edge Function to create a PayPal subscription with a proper approval URL
    try {
      const createUrl = CONFIG.PAYPAL_CREATE_SUBSCRIPTION_URL || CONFIG.PAYPAL_WEBHOOK_URL.replace('paypal-webhook', 'paypal-create-subscription');
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          plan_id: planId,
          user_id: state.user.id,
          user_email: state.user.email
        })
      });

      const data = await response.json();

      if (data.approve_url) {
        chrome.tabs.create({ url: data.approve_url });
        startSubscriptionPoll();
      } else {
        console.error('PayPal create subscription error:', data);
        showToast(t('authErrorNetwork'));
      }
    } catch (err) {
      console.error('PayPal subscription error:', err);
      showToast(t('authErrorNetwork'));
    }
  }

  let subscriptionPollTimer = null;
  let subscriptionPollCount = 0;

  function startSubscriptionPoll() {
    // Clear any existing poll
    if (subscriptionPollTimer) clearInterval(subscriptionPollTimer);
    subscriptionPollCount = 0;

    subscriptionPollTimer = setInterval(async () => {
      subscriptionPollCount++;
      if (subscriptionPollCount > 30) { // Stop after 5 min (30 * 10s)
        clearInterval(subscriptionPollTimer);
        subscriptionPollTimer = null;
        return;
      }

      // Check if plan was upgraded
      await Auth.refreshPlan();
      if (Auth.isPro()) {
        clearInterval(subscriptionPollTimer);
        subscriptionPollTimer = null;
        showToast(t('proActivated'));
      }
    }, 10000);
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
    let script = state.scripts.find(s => s.id === scriptId);
    const isShared = !script && (state.sharedScripts || []).find(s => s.id === scriptId);
    if (isShared) script = isShared;
    if (!script) return;

    // Track view (only for the user's own scripts)
    if (!script.shared) StorageAPI.trackEvent(scriptId, 'view');

    // Route branching scripts to branching viewer
    if (script.type === 'branching') {
      openBranchingScript(scriptId);
      return;
    }

    state.currentScriptId = scriptId;
    els.scriptViewTitle.textContent = script.title;

    // Tags
    els.scriptViewTags.innerHTML = (script.tags || []).map(tag =>
      `<span class="tag">#${esc(tag)}</span>`
    ).join('');

    // Body
    els.scriptViewBody.innerHTML = script.body;

    // Shared scripts are read-only: hide edit/pin, show a shared note
    const oldBadge = document.getElementById('scriptStatsBadge');
    if (oldBadge) oldBadge.remove();
    if (script.shared) {
      if (els.editScriptBtn) els.editScriptBtn.style.display = 'none';
      if (els.pinScriptBtn) els.pinScriptBtn.style.display = 'none';
      const badge = document.createElement('div');
      badge.id = 'scriptStatsBadge';
      badge.className = 'script-stats-badge';
      badge.innerHTML = `<span class="stat-item">👥 ${esc(script.teamName || t('teamLibrary'))} · ${t('sharedReadOnly')}</span>`;
      els.scriptViewTags.after(badge);
    } else {
      if (els.editScriptBtn) els.editScriptBtn.style.display = '';
      if (els.pinScriptBtn) els.pinScriptBtn.style.display = '';
      // Script stats badge
      renderScriptStats(scriptId);
      // Related Scripts
      renderRelatedScripts(script);
      // Pin button text
      const pinSpan = els.pinScriptBtn.querySelector('span');
      if (pinSpan) pinSpan.textContent = script.pinned ? t('unpin') : t('pin');
    }

    showView('script');
  }

  // ---- Script Stats Badge ----
  async function renderScriptStats(scriptId) {
    const existing = document.getElementById('scriptStatsBadge');
    if (existing) existing.remove();

    const stats = await StorageAPI.getScriptStats(scriptId);
    if (stats.views === 0 && stats.copies === 0) return;

    const badge = document.createElement('div');
    badge.id = 'scriptStatsBadge';
    badge.className = 'script-stats-badge';
    badge.innerHTML = `
      <span class="stat-item">👁 ${stats.views} ${t('views')}</span>
      <span class="stat-item">📋 ${stats.copies} ${t('copies')}</span>
      ${stats.lastUsed ? `<span class="stat-item">🕒 ${t('lastUsed')} ${timeAgo(stats.lastUsed)}</span>` : ''}
    `;
    els.scriptViewTags.after(badge);
  }

  // ---- Related Scripts ----
  function renderRelatedScripts(script) {
    // Remove old related section if present
    const existing = document.getElementById('relatedScripts');
    if (existing) existing.remove();

    // Find related scripts by shared tags or same folder
    const related = state.scripts.filter(s => {
      if (s.id === script.id) return false;
      // Same folder?
      if (s.folderId && s.folderId === script.folderId) return true;
      // Overlapping tags?
      if (script.tags && s.tags) {
        const overlap = s.tags.filter(tag => script.tags.includes(tag));
        if (overlap.length > 0) return true;
      }
      return false;
    }).slice(0, 3); // Max 3 suggestions

    if (related.length === 0) return;

    const container = document.createElement('div');
    container.id = 'relatedScripts';
    container.className = 'related-scripts';
    container.innerHTML = `<div class="related-label">${t('relatedScripts')}</div>`;

    related.forEach(s => {
      const icon = s.type === 'branching' ? '\u{1F500}' : '\u{1F4C4}';
      const item = document.createElement('div');
      item.className = 'related-item';
      item.innerHTML = `<span class="script-icon">${icon}</span> ${esc(s.title)}`;
      item.addEventListener('click', () => openScript(s.id));
      container.appendChild(item);
    });

    els.scriptViewBody.after(container);
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
    renderTemplatePacks();
    renderTeams();
    updateThemeButtons();
    updateLangButtons();
    showView('settings');
  }

  // ---- Teams ----
  async function refreshSharedScripts() {
    try {
      if (typeof Teams === 'undefined' || !Teams.ready()) {
        state.sharedScripts = [];
        state.myTeams = [];
        return;
      }
      const teams = await Teams.getMyTeams();
      state.myTeams = teams;
      let all = [];
      for (const team of teams) {
        const s = await Teams.getSharedScripts(team.id);
        s.forEach(x => { x.teamName = team.name; });
        all = all.concat(s);
      }
      state.sharedScripts = all;
      if (state.currentView === 'main') renderMain();
    } catch (err) {
      console.warn('[ScriptPad] refreshSharedScripts', err);
    }
  }

  function renderTeams() {
    const signedOut = document.getElementById('teamsSignedOut');
    const panel = document.getElementById('teamsPanel');
    const list = document.getElementById('teamsList');
    if (!panel || !list) return;

    if (!state.user) {
      if (signedOut) signedOut.style.display = 'block';
      panel.style.display = 'none';
      return;
    }
    if (signedOut) signedOut.style.display = 'none';
    panel.style.display = 'block';

    const teams = state.myTeams || [];
    if (!teams.length) {
      list.innerHTML = `<p class="text-muted">${t('noTeamsYet')}</p>`;
    } else {
      list.innerHTML = '';
      teams.forEach(team => {
        const isManager = team.role === 'manager';
        const div = document.createElement('div');
        div.className = 'team-item';
        div.innerHTML = `
          <div class="team-item-head">
            <span class="team-name">👥 ${esc(team.name)}</span>
            <span class="team-role ${isManager ? 'manager' : ''}">${isManager ? t('roleManager') : t('roleAgent')}</span>
          </div>
          ${isManager ? `<div class="team-code-row"><span class="text-muted">${t('inviteCode')}:</span> <code class="team-code">${esc(team.invite_code)}</code></div>` : ''}
          <div class="team-actions">
            ${isManager ? `<button class="team-members-btn">👥 ${t('manageMembers')}</button>` : ''}
            <button class="team-leave-btn danger-icon" title="${t('leaveTeam')}">${t('leaveTeam')}</button>
          </div>
          <div class="team-members-panel" style="display:none;"></div>
        `;
        div.querySelector('.team-leave-btn').addEventListener('click', () => leaveTeamConfirm(team));
        const membersBtn = div.querySelector('.team-members-btn');
        if (membersBtn) {
          const panelEl = div.querySelector('.team-members-panel');
          membersBtn.addEventListener('click', () => toggleMembersPanel(team, panelEl));
        }
        list.appendChild(div);
      });
    }
  }

  function toggleMembersPanel(team, panelEl) {
    if (!panelEl) return;
    if (panelEl.style.display !== 'none') { panelEl.style.display = 'none'; return; }
    panelEl.style.display = 'block';
    loadMembersPanel(team, panelEl);
  }

  async function loadMembersPanel(team, panelEl) {
    panelEl.innerHTML = `<p class="text-muted">${t('loading')}…</p>`;
    let members = [];
    try { members = await Teams.getMembers(team.id); }
    catch (err) { panelEl.innerHTML = `<p class="text-muted">${t('teamError')}</p>`; return; }

    const me = state.user;
    panelEl.innerHTML = '';
    members.forEach(m => {
      const isMe = me && m.user_id === me.id;
      const isOwner = m.user_id === team.owner_id;
      const row = document.createElement('div');
      row.className = 'member-row';
      row.innerHTML = `
        <span class="member-email">${esc(m.email || t('roleAgent'))}${isMe ? ' (you)' : ''}</span>
        <span class="member-role ${m.role === 'manager' ? 'manager' : ''}">${m.role === 'manager' ? t('roleManager') : t('roleAgent')}</span>
        <span class="member-actions"></span>
      `;
      const actions = row.querySelector('.member-actions');
      if (!isMe && !isOwner) {
        if (m.role !== 'manager') {
          const promote = document.createElement('button');
          promote.className = 'member-btn';
          promote.textContent = t('makeManager');
          promote.addEventListener('click', async () => {
            try { await Teams.setMemberRole(team.id, m.user_id, 'manager'); loadMembersPanel(team, panelEl); showToast(t('roleUpdated')); }
            catch (e) { showToast(t('teamError')); }
          });
          actions.appendChild(promote);
        } else {
          const demote = document.createElement('button');
          demote.className = 'member-btn';
          demote.textContent = t('makeAgent');
          demote.addEventListener('click', async () => {
            try { await Teams.setMemberRole(team.id, m.user_id, 'agent'); loadMembersPanel(team, panelEl); showToast(t('roleUpdated')); }
            catch (e) { showToast(t('teamError')); }
          });
          actions.appendChild(demote);
        }
        const remove = document.createElement('button');
        remove.className = 'member-btn danger-icon';
        remove.textContent = t('removeMember');
        remove.addEventListener('click', () => {
          showConfirm(t('removeMember'), t('removeMemberConfirm'), async () => {
            try { await Teams.removeMember(team.id, m.user_id); loadMembersPanel(team, panelEl); showToast(t('memberRemoved')); }
            catch (e) { showToast(t('teamError')); }
          });
        });
        actions.appendChild(remove);
      }
      panelEl.appendChild(row);
    });
  }

  async function createTeamFlow() {
    if (!state.user) { showToast(t('teamsSignInFirst')); return; }
    const name = prompt(t('createTeamPrompt'));
    if (!name || !name.trim()) return;
    try {
      await Teams.createTeam(name.trim());
      await refreshSharedScripts();
      renderTeams();
      showToast(t('teamCreated'));
    } catch (err) {
      showToast(t('teamError'));
    }
  }

  async function joinTeamFlow() {
    if (!state.user) { showToast(t('teamsSignInFirst')); return; }
    const input = document.getElementById('joinCodeInput');
    const code = input ? input.value.trim() : '';
    if (!code) return;
    try {
      await Teams.joinTeam(code);
      if (input) input.value = '';
      await refreshSharedScripts();
      renderTeams();
      showToast(t('teamJoined'));
    } catch (err) {
      const msg = String(err && err.message);
      showToast(msg === 'bad_code' ? t('teamBadCode') : t('teamError'));
    }
  }

  function leaveTeamConfirm(team) {
    showConfirm(t('leaveTeam'), t('leaveTeamConfirm'), async () => {
      try {
        await Teams.leaveTeam(team.id);
        await refreshSharedScripts();
        renderTeams();
        renderMain();
        showToast(t('teamLeft'));
      } catch (err) {
        showToast(t('teamError'));
      }
    });
  }

  async function pushScriptToTeam(scriptId) {
    const script = await StorageAPI.getScript(scriptId);
    if (!script) return;
    const teams = (state.myTeams || []).filter(tm => tm.role === 'manager');
    if (!teams.length) { showToast(t('needManagerTeam')); return; }

    let team = teams[0];
    // If the manager runs multiple teams, let them pick which one
    if (teams.length > 1) {
      const names = teams.map((tm, i) => `${i + 1}. ${tm.name}`).join('\n');
      const pick = prompt(`${t('pickTeam')}\n${names}`, '1');
      if (!pick) return;
      const idx = parseInt(pick, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= teams.length) { showToast(t('teamError')); return; }
      team = teams[idx];
    }

    try {
      const res = await Teams.pushScript(team.id, script);
      await refreshSharedScripts();
      if (state.currentView === 'main') renderMain();
      showToast(res && res._updated ? t('scriptUpdatedTeam') : t('scriptPushed'));
    } catch (err) {
      showToast(t('teamError'));
    }
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
    if (!isPro() && state.folders.length >= StorageAPI.FREE_FOLDER_LIMIT) {
      showToast(t('folderLimitWarning'));
      return;
    }
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
    if (state.activeTab === 'kb') {
      els.searchInput.placeholder = t('searchKBPlaceholder');
    } else if (state.activeTab === 'notes') {
      els.searchInput.placeholder = t('searchNotesPlaceholder');
    } else {
      els.searchInput.placeholder = t('searchPlaceholder');
    }
    els.newScriptBtn.textContent = t('newScript');
    els.editorTitleInput.placeholder = t('scriptTitlePlaceholder');
    els.editorTagsInput.placeholder = t('tagsPlaceholder');
    els.editorBodyInput.dataset.placeholder = t('scriptBodyPlaceholder');
    els.kbEditorTitleInput.placeholder = t('kbEntryTitlePlaceholder');
    els.kbEditorTagsInput.placeholder = t('tagsPlaceholder');
    els.kbEditorBodyInput.dataset.placeholder = t('kbBodyPlaceholder');
    // AI Assistant
    els.aiInput.placeholder = t('aiPlaceholder');
    els.aiFab.title = t('aiAskBtn');
  }

  // ---- Copy ----
  function copyScriptText(script) {
    // Track copy
    StorageAPI.trackEvent(script.id, 'copy');
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
    if (!isPro() && state.scripts.length >= StorageAPI.FREE_SCRIPT_LIMIT) {
      showToast(t('scriptLimitWarning'));
      return;
    }
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

  // ---- AI Assistant ----

  // Strip HTML tags from a string
  function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // Generate smart AI suggestions based on user's actual content
  function generateAISuggestions() {
    const suggestions = [];
    const scripts = state.scripts || [];
    const folders = state.folders || [];
    const kb = state.knowledgeBase || [];
    const notes = state.notes || [];

    // Suggestion based on folders ("What's my best [folder name]?")
    const folderNames = folders.map(f => f.name).filter(Boolean);
    if (folderNames.length > 0) {
      const topFolder = folderNames[0];
      suggestions.push({
        icon: '📂',
        label: t('aiSuggestBestIn').replace('{folder}', topFolder),
        prompt: t('aiSuggestBestInPrompt').replace('{folder}', topFolder)
      });
    }

    // Suggestion based on pinned scripts ("Summarize my pinned scripts")
    const pinned = scripts.filter(s => s.pinned);
    if (pinned.length > 0) {
      suggestions.push({
        icon: '📌',
        label: t('aiSuggestPinned'),
        prompt: t('aiSuggestPinnedPrompt')
      });
    }

    // Suggestion based on KB categories
    const categories = [...new Set(kb.map(e => e.category).filter(Boolean))];
    if (categories.length > 0) {
      const topCat = categories[0];
      suggestions.push({
        icon: '📖',
        label: t('aiSuggestKB').replace('{category}', topCat),
        prompt: t('aiSuggestKBPrompt').replace('{category}', topCat)
      });
    }

    // Generic suggestion if they have scripts
    if (scripts.length > 0) {
      suggestions.push({
        icon: '💡',
        label: t('aiSuggestImprove'),
        prompt: t('aiSuggestImprovePrompt')
      });
    }

    // Generic suggestion if they have notes
    if (notes.length > 0 && suggestions.length < 4) {
      suggestions.push({
        icon: '📝',
        label: t('aiSuggestNotes'),
        prompt: t('aiSuggestNotesPrompt')
      });
    }

    // Fallback generic suggestions if nothing else
    if (suggestions.length === 0) {
      suggestions.push(
        { icon: '🚀', label: t('aiSuggestGetStarted'), prompt: t('aiSuggestGetStartedPrompt') }
      );
    }

    return suggestions.slice(0, 4); // Max 4 chips
  }

  // Build full context string for AI prompt (KB + scripts + notes)
  function buildKBContext() {
    let context = '';

    // Knowledge Base entries
    const entries = state.knowledgeBase || [];
    if (entries.length > 0) {
      const groups = {};
      entries.forEach(entry => {
        const cat = (entry.category || 'custom').toUpperCase();
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(entry);
      });
      context += '=== KNOWLEDGE BASE ===\n';
      for (const [category, items] of Object.entries(groups)) {
        context += `\n[${category}]\n\n`;
        items.forEach(item => {
          context += `**${item.title}**\n`;
          context += stripHtml(item.body) + '\n\n';
        });
      }
      context += '=== END KNOWLEDGE BASE ===\n\n';
    }

    // Scripts (include titles, tags, and body text so AI can reference them)
    const scripts = state.scripts || [];
    if (scripts.length > 0) {
      context += '=== SCRIPTS ===\n';
      scripts.forEach(s => {
        const folder = state.folders.find(f => f.id === s.folderId);
        const folderName = folder ? folder.name : 'Uncategorized';
        context += `\n[${folderName}] **${s.title}**`;
        if (s.tags && s.tags.length) context += ` (tags: ${s.tags.join(', ')})`;
        context += '\n';
        if (s.type === 'branching' && Array.isArray(s.nodes)) {
          s.nodes.forEach(node => {
            context += `  - ${node.label}: ${stripHtml(node.body).substring(0, 200)}\n`;
          });
        } else {
          context += stripHtml(s.body).substring(0, 300) + '\n';
        }
      });
      context += '=== END SCRIPTS ===\n\n';
    }

    // Notes (include so AI can reference them too)
    const notes = state.notes || [];
    if (notes.length > 0) {
      context += '=== NOTES ===\n';
      notes.forEach(n => {
        context += `\n**${n.title || 'Note'}**\n`;
        context += (n.body || '').substring(0, 200) + '\n';
      });
      context += '=== END NOTES ===';
    }

    return context || '';
  }

  // Markdown-lite parser for AI responses
  function parseAIResponse(text) {
    if (!text) return '';
    // Escape HTML
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bullet points: lines starting with - or •
    const lines = html.split('\n');
    let result = '';
    let inList = false;
    for (const line of lines) {
      const trimmed = line.trim();
      const bulletMatch = trimmed.match(/^[-•]\s+(.*)/);
      if (bulletMatch) {
        if (!inList) {
          result += '<ul>';
          inList = true;
        }
        result += `<li>${bulletMatch[1]}</li>`;
      } else {
        if (inList) {
          result += '</ul>';
          inList = false;
        }
        if (trimmed === '') {
          result += '<br>';
        } else {
          result += trimmed + '<br>';
        }
      }
    }
    if (inList) result += '</ul>';

    // Clean up trailing <br>
    result = result.replace(/(<br>)+$/, '');
    return result;
  }

  // Toggle AI panel
  function toggleAIPanel(forceOpen) {
    const open = forceOpen !== undefined ? forceOpen : !state.aiPanelOpen;
    state.aiPanelOpen = open;

    if (open) {
      els.aiPanel.classList.add('open');
      els.aiBackdrop.classList.add('active');
      els.aiFab.classList.add('hidden');
      updateAIQueriesBadge();
      renderAIMessages();
      // Focus input after animation
      setTimeout(() => els.aiInput.focus(), 350);
    } else {
      els.aiPanel.classList.remove('open');
      els.aiBackdrop.classList.remove('active');
      els.aiFab.classList.remove('hidden');
    }
  }

  async function updateAIQueriesBadge() {
    if (isPro()) {
      els.aiQueriesBadge.textContent = '';
      els.aiLimitOverlay.style.display = 'none';
      els.aiInputArea.style.display = '';
      return;
    }

    const usage = await StorageAPI.getAIUsage();
    const remaining = Math.max(0, StorageAPI.FREE_AI_QUERIES_PER_DAY - usage.used);
    els.aiQueriesBadge.textContent = `${remaining} ${t('aiQueriesRemaining')}`;

    if (remaining <= 0) {
      els.aiLimitOverlay.style.display = 'flex';
      els.aiInputArea.style.display = 'none';
    } else {
      els.aiLimitOverlay.style.display = 'none';
      els.aiInputArea.style.display = '';
    }
  }

  function renderAIMessages() {
    const container = els.aiMessages;
    container.innerHTML = '';

    if (state.aiMessages.length === 0) {
      const suggestions = generateAISuggestions();
      const chipsHtml = suggestions.length > 0
        ? `<div class="ai-suggestions">${suggestions.map(s =>
            `<button class="ai-suggestion-chip" data-prompt="${esc(s.prompt)}">${s.icon} ${esc(s.label)}</button>`
          ).join('')}</div>`
        : '';
      container.innerHTML = `<div class="ai-welcome">
        <div class="ai-welcome-icon">\ud83e\udd16</div>
        <div class="ai-welcome-title">${t('aiAssistant')}</div>
        <div class="ai-welcome-hint">${t('aiSmartHint')}</div>
        ${chipsHtml}
      </div>`;
      // Bind chip clicks
      container.querySelectorAll('.ai-suggestion-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          els.aiInput.value = btn.dataset.prompt;
          sendAIMessage();
        });
      });
      return;
    }

    state.aiMessages.forEach(msg => {
      const div = document.createElement('div');
      if (msg.role === 'user') {
        div.className = 'ai-msg user';
        div.textContent = msg.content;
      } else if (msg.role === 'error') {
        div.className = 'ai-msg error';
        div.textContent = msg.content;
      } else {
        div.className = 'ai-msg assistant';
        div.innerHTML = parseAIResponse(msg.content);
      }
      container.appendChild(div);
    });

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function clearAIChat() {
    state.aiMessages = [];
    state.aiError = null;
    renderAIMessages();
  }

  async function sendAIMessage() {
    const message = els.aiInput.value.trim();
    if (!message || state.aiLoading) return;

    // Check usage limit
    const canUse = await StorageAPI.canUseAI(isPro());
    if (!canUse) {
      await updateAIQueriesBadge();
      return;
    }

    // Check if there's any content at all
    const kbEntries = state.knowledgeBase || [];
    const hasScripts = (state.scripts || []).length > 0;
    const hasNotes = (state.notes || []).length > 0;
    if (kbEntries.length === 0 && !hasScripts && !hasNotes) {
      state.aiMessages.push({ role: 'error', content: t('aiErrorEmptyKB') });
      renderAIMessages();
      return;
    }

    // Add user message
    state.aiMessages.push({ role: 'user', content: message });
    els.aiInput.value = '';
    els.aiInput.style.height = 'auto';
    renderAIMessages();

    // Show loading
    state.aiLoading = true;
    els.aiSendBtn.disabled = true;
    els.aiTyping.style.display = 'flex';

    // Build context & history
    const context = buildKBContext();
    const history = state.aiMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .slice(0, -1); // exclude current message from history

    // Stream the response
    let abortController = new AbortController();
    let timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      const response = await fetch(CONFIG.AI_ASSISTANT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, history }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API ${response.status}`);
      }

      // Increment usage
      await StorageAPI.incrementAIUsage();
      await updateAIQueriesBadge();

      // Create placeholder for assistant message
      const assistantMsg = { role: 'assistant', content: '' };
      state.aiMessages.push(assistantMsg);
      renderAIMessages();

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantMsg.content += parsed.content;
              // Update the last message in DOM directly for streaming
              const lastBubble = els.aiMessages.querySelector('.ai-msg.assistant:last-child');
              if (lastBubble) {
                lastBubble.innerHTML = parseAIResponse(assistantMsg.content);
              }
              els.aiMessages.scrollTop = els.aiMessages.scrollHeight;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      // Final render to ensure consistency
      renderAIMessages();

    } catch (err) {
      console.error('[ScriptPad] AI error:', err);
      let errorMsg;
      if (err.name === 'AbortError') {
        errorMsg = t('aiErrorTimeout');
      } else if (err.message && err.message.includes('Failed to fetch')) {
        errorMsg = t('aiErrorNetwork');
      } else {
        errorMsg = t('aiErrorAPI');
      }
      state.aiMessages.push({ role: 'error', content: errorMsg });
      renderAIMessages();
    } finally {
      state.aiLoading = false;
      els.aiSendBtn.disabled = !els.aiInput.value.trim();
      els.aiTyping.style.display = 'none';
    }
  }

  // Auto-resize AI textarea
  function autoResizeAIInput() {
    const el = els.aiInput;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 72) + 'px';
    els.aiSendBtn.disabled = !el.value.trim() || state.aiLoading;
  }

  // ---- Keyboard Navigation ----
  function handleKeyboard(e) {
    // "/" to focus search
    if (e.key === '/' && state.currentView === 'main' && document.activeElement !== els.searchInput) {
      e.preventDefault();
      els.searchInput.focus();
      return;
    }

    // Escape: close AI panel first, then go back
    if (e.key === 'Escape') {
      if (state.aiPanelOpen) {
        toggleAIPanel(false);
        return;
      }
      if (state.currentView === 'kbDetail') {
        showView('main');
        switchTab('kb');
      } else if (state.currentView === 'kbEditor') {
        if (state.editingKBEntryId) {
          openKBEntry(state.editingKBEntryId);
        } else {
          showView('main');
          switchTab('kb');
        }
      } else if (state.currentView === 'note') {
        showView('main');
        switchTab('notes');
      } else if (state.currentView === 'script') {
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
        if (state.activeTab === 'notes') {
          renderNotes();
        } else if (state.activeTab === 'kb') {
          renderKB();
        } else {
          renderMain();
        }
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
    } else if (state.currentView === 'kbEditor') {
      els.kbEditorBodyInput.focus();
    } else {
      els.editorBodyInput.focus();
    }
  }

  // ---- Bind Events ----
  // ---- Template Packs ----
  const TEMPLATE_PACKS = [
    {
      id: 'sales-starter',
      icon: '💼',
      nameKey: 'tplSalesName',
      descKey: 'tplSalesDesc',
      folders: ['Openers', 'Objection Handlers', 'Closers'],
      scripts: [
        { folder: 'Openers', title: 'Cold Call Opener', tags: ['cold-call', 'opener'], body: '<p><strong>"Hi [Name], this is [You] from [Company].</strong></p><p>The reason for my call — we help [target companies] reduce [pain point] by [benefit]. I\'d love 2 minutes to see if it\'s worth a longer chat. Sound fair?"</p>' },
        { folder: 'Openers', title: 'Warm Referral Opener', tags: ['referral', 'warm'], body: '<p><strong>"Hi [Name], [Referrer] suggested I reach out.</strong></p><p>They mentioned you might be looking at [solution area]. I help companies like yours with [benefit] — do you have a quick minute?"</p>' },
        { folder: 'Objection Handlers', title: 'Too Expensive', tags: ['price', 'objection'], body: '<p><strong>"I totally understand budget is a concern."</strong></p><p>"Just so I understand — is it that the price is higher than expected, or that you\'re not sure about the ROI?"</p><p><em>If ROI:</em> "What if I could show you how [Client X] saved [amount] in the first 3 months?"</p><p><em>If budget:</em> "We have flexible options — let me walk you through what fits."</p>' },
        { folder: 'Objection Handlers', title: 'Need to Think About It', tags: ['stall', 'objection'], body: '<p><strong>"Of course, I want you to feel 100% good about this."</strong></p><p>"Just so I can help — is there a specific concern, or do you need to loop in someone else?"</p><p><em>Then:</em> "How about I send a quick summary and we reconnect [day]? That way it\'s fresh."</p>' },
        { folder: 'Closers', title: 'Assumptive Close', tags: ['close', 'demo'], body: '<p><strong>"Great, sounds like this is a good fit."</strong></p><p>"Let me get you set up — I have availability [Day 1] at [Time] or [Day 2] at [Time] for the demo. Which works better?"</p><p><em>Confirm:</em> Repeat date, time, email. "You\'ll get a calendar invite in the next few minutes."</p>' },
        { folder: 'Closers', title: 'Summary Close', tags: ['close', 'recap'], body: '<p><strong>"Let me make sure I have everything right:"</strong></p><ul><li>You need [solution] by [timeline]</li><li>Budget is around [range]</li><li>[Decision maker] needs to sign off</li></ul><p>"Based on all that, here\'s what I recommend: [plan]. Want me to send over the proposal?"</p>' }
      ]
    },
    {
      id: 'customer-service',
      icon: '📞',
      nameKey: 'tplServiceName',
      descKey: 'tplServiceDesc',
      folders: ['Greetings', 'Troubleshooting', 'Escalation'],
      scripts: [
        { folder: 'Greetings', title: 'Standard Greeting', tags: ['greeting', 'inbound'], body: '<p><strong>"Thank you for calling [Company], my name is [You]. How can I help you today?"</strong></p><p><em>Listen actively, then:</em> "I understand — let me look into that for you right away."</p>' },
        { folder: 'Greetings', title: 'Returning Customer', tags: ['greeting', 'returning'], body: '<p><strong>"Welcome back to [Company]! I can see you\'ve been with us since [date]."</strong></p><p>"How can I help you today?"</p><p><em>Acknowledge loyalty:</em> "We really appreciate you being a customer."</p>' },
        { folder: 'Troubleshooting', title: 'Technical Issue Flow', tags: ['tech', 'troubleshoot'], body: '<p><strong>Step 1:</strong> "Can you describe exactly what\'s happening?"</p><p><strong>Step 2:</strong> "Have you tried restarting [device/app]?"</p><p><strong>Step 3:</strong> "Let me walk you through a fix — this usually works."</p><p><strong>If unresolved:</strong> "I\'m going to escalate this to our specialist team. You\'ll hear back within [timeframe]."</p>' },
        { folder: 'Escalation', title: 'Angry Customer De-escalation', tags: ['angry', 'escalation'], body: '<p><strong>1. Acknowledge:</strong> "I completely understand your frustration, and I\'m sorry you\'re dealing with this."</p><p><strong>2. Own it:</strong> "Let me take responsibility for getting this resolved."</p><p><strong>3. Act:</strong> "Here\'s what I\'m going to do right now: [specific action]."</p><p><strong>4. Follow up:</strong> "I\'ll personally make sure this gets handled. Can I call you back at [time] with an update?"</p>' }
      ]
    },
    {
      id: 'insurance',
      icon: '🏥',
      nameKey: 'tplInsuranceName',
      descKey: 'tplInsuranceDesc',
      folders: ['Quoting', 'Objections', 'Follow-ups'],
      scripts: [
        { folder: 'Quoting', title: 'Needs Assessment', tags: ['quote', 'assessment'], body: '<p><strong>"To find you the best rate, I need to ask a few quick questions:"</strong></p><ul><li>"What type of coverage are you looking for?"</li><li>"Who needs to be covered?"</li><li>"What\'s your current monthly budget for insurance?"</li><li>"Any pre-existing conditions or special requirements?"</li></ul><p>"Great — give me 60 seconds to pull up some options."</p>' },
        { folder: 'Objections', title: 'Already Have Insurance', tags: ['objection', 'competitor'], body: '<p><strong>"That\'s great that you\'re already covered!"</strong></p><p>"A lot of our customers came from [competitor] and found they were paying more for less. Would you be open to a free comparison? It takes 5 minutes and there\'s zero obligation."</p>' },
        { folder: 'Follow-ups', title: 'Quote Follow-up Call', tags: ['follow-up', 'quote'], body: '<p><strong>"Hi [Name], it\'s [You] from [Company]. I\'m following up on the quote we discussed."</strong></p><p>"Were you able to review the options? Any questions I can answer?"</p><p><em>If ready:</em> "Great, let\'s get you enrolled — it only takes a few minutes."</p><p><em>If not:</em> "No rush at all. What\'s the best time for me to check back?"</p>' }
      ]
    }
  ];

  function renderTemplatePacks() {
    const container = document.getElementById('templatePacksList');
    if (!container) return;
    container.innerHTML = '';

    TEMPLATE_PACKS.forEach(pack => {
      const div = document.createElement('div');
      div.className = 'template-pack-card';
      div.innerHTML = `
        <div class="template-pack-header">
          <span class="template-pack-icon">${pack.icon}</span>
          <div class="template-pack-info">
            <div class="template-pack-name">${t(pack.nameKey)}</div>
            <div class="template-pack-desc">${t(pack.descKey)}</div>
          </div>
        </div>
        <button class="template-pack-btn">${t('loadPack')} (${pack.scripts.length} ${t('scriptsCount')})</button>
      `;
      div.querySelector('.template-pack-btn').addEventListener('click', async () => {
        const btn = div.querySelector('.template-pack-btn');
        btn.disabled = true;
        btn.textContent = t('loading') + '...';
        await loadTemplatePack(pack);
        btn.textContent = '✓ ' + t('loaded');
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = t('loadPack') + ` (${pack.scripts.length} ${t('scriptsCount')})`;
        }, 2000);
      });
      container.appendChild(div);
    });
  }

  async function loadTemplatePack(pack) {
    // Create folders if they don't exist
    const existingFolders = state.folders;
    const folderMap = {};
    for (const folderName of pack.folders) {
      let existing = existingFolders.find(f => f.name === folderName);
      if (!existing) {
        existing = await StorageAPI.createFolder(folderName);
      }
      folderMap[folderName] = existing.id;
    }

    // Create scripts
    for (const s of pack.scripts) {
      // Check if a script with same title already exists
      const exists = state.scripts.find(sc => sc.title === s.title);
      if (exists) continue; // Skip duplicates
      await StorageAPI.createScript({
        title: s.title,
        body: s.body,
        tags: s.tags,
        folderId: folderMap[s.folder] || null,
        type: 'standard'
      });
    }

    // Reload data
    await loadData();
    showToast('✓ ' + t('packLoaded'));
  }

  function bindEvents() {
    // Search
    els.searchInput.addEventListener('input', () => {
      state.searchQuery = els.searchInput.value;
      state.selectedIndex = -1;
      if (state.activeTab === 'notes') {
        renderNotes();
      } else if (state.activeTab === 'kb') {
        renderKB();
      } else {
        renderMain();
      }
    });

    // Tabs
    els.scriptsTab.addEventListener('click', () => switchTab('scripts'));
    els.notesTab.addEventListener('click', () => switchTab('notes'));
    els.kbTab.addEventListener('click', () => switchTab('kb'));

    // KB filter chips
    els.kbFilterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.kb-chip');
      if (!chip) return;
      state.kbCategoryFilter = chip.dataset.category;
      renderKB();
    });

    // KB events
    els.newKBEntryBtn.addEventListener('click', () => {
      if (!isPro() && (state.knowledgeBase || []).length >= StorageAPI.FREE_KB_LIMIT) {
        showToast(t('kbLimitWarning'));
        return;
      }
      openKBEditor(null);
    });
    els.kbDetailBackBtn.addEventListener('click', () => {
      showView('main');
      switchTab('kb');
    });
    els.copyKBEntryBtn.addEventListener('click', copyCurrentKBEntry);
    els.editKBEntryBtn.addEventListener('click', () => openKBEditor(state.currentKBEntryId));
    els.pinKBEntryBtn.addEventListener('click', toggleKBPinCurrent);
    els.deleteKBEntryBtn.addEventListener('click', deleteCurrentKBEntry);
    els.kbEditorBackBtn.addEventListener('click', () => {
      if (state.editingKBEntryId) {
        openKBEntry(state.editingKBEntryId);
      } else {
        showView('main');
        switchTab('kb');
      }
    });
    els.saveKBEntryBtn.addEventListener('click', saveKBEntry);

    // Notes
    els.quickNoteSave.addEventListener('click', quickAddNote);
    els.quickNoteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        quickAddNote();
      }
    });
    els.newNoteBtnFooter.addEventListener('click', () => {
      els.quickNoteInput.focus();
    });
    els.noteBackBtn.addEventListener('click', () => {
      showView('main');
      switchTab('notes');
    });
    els.copyNoteBtn.addEventListener('click', copyCurrentNote);
    els.deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    els.noteEditTextarea.addEventListener('input', handleNoteAutoSave);

    // Account & Auth
    els.signInBtn.addEventListener('click', openSignIn);
    els.signOutBtn.addEventListener('click', handleSignOut);
    els.upgradeFromSettings.addEventListener('click', openUpgrade);
    els.signInBackBtn.addEventListener('click', () => showView('settings'));
    els.authSubmitBtn.addEventListener('click', handleAuth);
    els.authPasswordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuth();
    });
    els.authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      state.authMode = state.authMode === 'signin' ? 'signup' : 'signin';
      els.authError.style.display = 'none';
      els.authSuccess.style.display = 'none';
      updateAuthUI();
    });
    els.authForgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = els.authEmailInput.value.trim();
      if (!email || !email.includes('@')) {
        showAuthError(t('authErrorEmail'));
        return;
      }
      els.authError.style.display = 'none';
      els.authSuccess.style.display = 'none';
      try {
        await Auth.resetPassword(email);
        els.authSuccess.textContent = t('resetEmailSent');
        els.authSuccess.style.display = 'block';
      } catch (err) {
        showAuthError(err.message || t('authErrorNetwork'));
      }
    });
    // Upgrade view
    els.upgradeBackBtn.addEventListener('click', () => showView('settings'));
    els.subscribeMonthlyBtn.addEventListener('click', () => handleSubscribe('monthly'));
    els.subscribeAnnualBtn.addEventListener('click', () => handleSubscribe('annual'));

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
    els.newFolderBtnMain.addEventListener('click', createNewFolder);

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

    // Teams
    const createTeamBtn = document.getElementById('createTeamBtn');
    const joinTeamBtn = document.getElementById('joinTeamBtn');
    const joinCodeInput = document.getElementById('joinCodeInput');
    if (createTeamBtn) createTeamBtn.addEventListener('click', createTeamFlow);
    if (joinTeamBtn) joinTeamBtn.addEventListener('click', joinTeamFlow);
    if (joinCodeInput) joinCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') joinTeamFlow();
    });

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

    // ---- AI Assistant events ----
    els.aiFab.addEventListener('click', () => toggleAIPanel(true));
    els.aiCloseBtn.addEventListener('click', () => toggleAIPanel(false));
    els.aiBackdrop.addEventListener('click', () => toggleAIPanel(false));
    els.aiClearBtn.addEventListener('click', clearAIChat);
    els.aiUpgradeBtn.addEventListener('click', () => {
      toggleAIPanel(false);
      openUpgrade();
    });
    els.aiSendBtn.addEventListener('click', sendAIMessage);
    els.aiInput.addEventListener('input', autoResizeAIInput);
    els.aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);
  }

  // ---- Start ----
  init();
})();
