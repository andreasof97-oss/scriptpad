// ScriptPad — Chrome Storage API Layer

const StorageAPI = (() => {
  // Use chrome.storage.local for persistence
  const storage = chrome.storage.local;

  // Generate a UUID v4
  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  }

  // ---- Generic helpers ----

  async function getAll() {
    return new Promise((resolve) => {
      storage.get(['folders', 'scripts', 'settings'], (data) => {
        resolve({
          folders: data.folders || [],
          scripts: data.scripts || [],
          settings: data.settings || { language: 'en', theme: 'dark', hotkey: 'Ctrl+Shift+S' }
        });
      });
    });
  }

  async function saveAll(data) {
    return new Promise((resolve) => {
      storage.set(data, resolve);
    });
  }

  // ---- Scripts ----

  async function getScripts() {
    const data = await getAll();
    return data.scripts;
  }

  async function getScript(id) {
    const scripts = await getScripts();
    return scripts.find(s => s.id === id) || null;
  }

  async function createScript({ title, body, tags, folderId, pinned }) {
    const data = await getAll();
    const now = new Date().toISOString();
    const script = {
      id: uuid(),
      folderId: folderId || null,
      title: title || '',
      body: body || '',
      tags: tags || [],
      pinned: pinned || false,
      createdAt: now,
      updatedAt: now
    };
    data.scripts.push(script);
    await saveAll({ scripts: data.scripts });
    return script;
  }

  async function updateScript(id, updates) {
    const data = await getAll();
    const idx = data.scripts.findIndex(s => s.id === id);
    if (idx === -1) return null;
    data.scripts[idx] = {
      ...data.scripts[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await saveAll({ scripts: data.scripts });
    return data.scripts[idx];
  }

  async function deleteScript(id) {
    const data = await getAll();
    data.scripts = data.scripts.filter(s => s.id !== id);
    await saveAll({ scripts: data.scripts });
  }

  async function togglePin(id) {
    const script = await getScript(id);
    if (!script) return null;
    return updateScript(id, { pinned: !script.pinned });
  }

  // ---- Folders ----

  async function getFolders() {
    const data = await getAll();
    return data.folders.sort((a, b) => a.order - b.order);
  }

  async function createFolder(name) {
    const data = await getAll();
    const folder = {
      id: uuid(),
      name: name,
      order: data.folders.length
    };
    data.folders.push(folder);
    await saveAll({ folders: data.folders });
    return folder;
  }

  async function renameFolder(id, name) {
    const data = await getAll();
    const idx = data.folders.findIndex(f => f.id === id);
    if (idx === -1) return null;
    data.folders[idx].name = name;
    await saveAll({ folders: data.folders });
    return data.folders[idx];
  }

  async function deleteFolder(id) {
    const data = await getAll();
    data.folders = data.folders.filter(f => f.id !== id);
    // Move scripts in this folder to uncategorized
    data.scripts = data.scripts.map(s =>
      s.folderId === id ? { ...s, folderId: null } : s
    );
    await saveAll({ folders: data.folders, scripts: data.scripts });
  }

  // ---- Settings ----

  async function getSettings() {
    const data = await getAll();
    return data.settings;
  }

  async function updateSettings(updates) {
    const data = await getAll();
    data.settings = { ...data.settings, ...updates };
    await saveAll({ settings: data.settings });
    return data.settings;
  }

  // ---- Import / Export ----

  async function exportData() {
    const data = await getAll();
    return JSON.stringify(data, null, 2);
  }

  async function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.scripts || !Array.isArray(data.scripts)) {
        throw new Error('Invalid format: missing scripts array');
      }
      // Validate and sanitize
      const sanitized = {
        folders: Array.isArray(data.folders) ? data.folders : [],
        scripts: data.scripts.map(s => ({
          id: s.id || uuid(),
          folderId: s.folderId || null,
          title: s.title || '',
          body: s.body || '',
          tags: Array.isArray(s.tags) ? s.tags : [],
          pinned: !!s.pinned,
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt || new Date().toISOString()
        })),
        settings: data.settings || { language: 'en', theme: 'dark', hotkey: 'Ctrl+Shift+S' }
      };
      await saveAll(sanitized);
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }

  // ---- Seed Data ----

  async function seedIfEmpty() {
    const data = await getAll();
    if (data.scripts.length > 0 || data.folders.length > 0) return false;

    const folderId1 = uuid();
    const folderId2 = uuid();
    const folderId3 = uuid();

    const seedData = {
      folders: [
        { id: folderId1, name: 'Openers', order: 0 },
        { id: folderId2, name: 'Objection Handlers', order: 1 },
        { id: folderId3, name: 'Closers', order: 2 }
      ],
      scripts: [
        {
          id: uuid(),
          folderId: folderId1,
          title: 'Opening Script',
          body: '<p><strong>Greeting:</strong></p><p>"Hi, this is <span style="color:#fbbf24">[Your Name]</span> calling from <span style="color:#fbbf24">[Company]</span>. How are you doing today?"</p><p><strong>Purpose:</strong></p><p>"The reason for my call is that we help businesses like yours <span style="color:#fbbf24">[key benefit]</span>. I\'d love to take just 2 minutes to see if this might be a fit for you."</p><p><strong>Permission to continue:</strong></p><p>"Would that be okay?"</p><ul><li>If <strong>yes</strong> → proceed to qualification questions</li><li>If <strong>not a good time</strong> → "No problem! When would be a better time to chat?"</li><li>If <strong>not interested</strong> → "I totally understand. Just out of curiosity, what are you currently using for [solution area]?"</li></ul>',
          tags: ['opener', 'intro', 'greeting'],
          pinned: true,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: uuid(),
          folderId: folderId2,
          title: 'Price Objection Handler',
          body: '<p><strong>Initial Response:</strong></p><p>"I completely understand — <span style="color:#fbbf24">price is always an important factor</span>. Let me share what you\'re getting so you can see the full picture..."</p><p><strong>Value Points:</strong></p><ul><li><strong>24/7 support</strong> — dedicated team, not a chatbot</li><li><strong>Free onboarding</strong> — we set everything up for you</li><li><strong>No contract</strong> — cancel anytime, no penalties</li><li><strong>ROI guarantee</strong> — if you don\'t see results in 30 days, full refund</li></ul><p><strong>If still hesitant:</strong></p><ul><li>"Can I think about it?" → Use urgency: limited-time offer, spots filling up</li><li>"Competitor is cheaper" → Compare value, not just price. Ask what\'s included.</li><li>"Need to ask my manager" → "Totally understand. Can we schedule a quick call with them?"</li></ul><p><strong>Close:</strong></p><p>"Based on what you\'ve shared, I think <span style="color:#fbbf24">[Plan Name]</span> would be the perfect fit. Would you like me to get you started today?"</p>',
          tags: ['objection', 'price', 'common'],
          pinned: true,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: uuid(),
          folderId: folderId3,
          title: 'Soft Close Script',
          body: '<p><strong>Transition:</strong></p><p>"So based on everything we\'ve discussed, it sounds like <span style="color:#fbbf24">[Product/Plan]</span> would really help you with <span style="color:#fbbf24">[their pain point]</span>."</p><p><strong>The Soft Ask:</strong></p><p>"What I\'d like to suggest is getting you set up with a <span style="color:#fbbf24">[trial/starter plan]</span> so you can experience it firsthand. There\'s absolutely no commitment — you can cancel if it\'s not the right fit."</p><p><strong>Confirm:</strong></p><p>"Does that sound fair?"</p><p><strong>If yes:</strong></p><ul><li>"Great! Let me just grab a few details to get your account set up..."</li><li>Collect: name, email, billing info</li></ul><p><strong>If hesitant:</strong></p><ul><li>"Totally fair. What\'s the one thing holding you back?"</li><li>Address their specific concern, then re-ask</li></ul>',
          tags: ['closer', 'soft-close', 'trial'],
          pinned: false,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: uuid(),
          folderId: null,
          title: 'Refund Policy FAQ',
          body: '<p><strong>Standard Policy:</strong></p><p>"Our refund policy is simple: if you\'re not satisfied within the first <span style="color:#fbbf24">30 days</span>, we\'ll issue a full refund, no questions asked."</p><p><strong>After 30 days:</strong></p><p>"After the initial 30-day period, we offer <span style="color:#fbbf24">prorated refunds</span> based on your remaining subscription time."</p><p><strong>Processing time:</strong></p><ul><li>Refunds processed within <strong>5-7 business days</strong></li><li>Credited back to original payment method</li><li>Confirmation email sent once processed</li></ul><p><strong>How to request:</strong></p><ul><li>Call our support line: <strong>1-800-XXX-XXXX</strong></li><li>Email: <strong>support@company.com</strong></li><li>Through the account dashboard → Billing → Request Refund</li></ul><p><strong>Important notes:</strong></p><ul><li>Annual plans: prorated from cancellation date</li><li>Add-ons: refunded separately</li><li>No restocking fees — ever</li></ul>',
          tags: ['faq', 'refund', 'policy'],
          pinned: false,
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      settings: {
        language: (typeof detectLanguage === 'function') ? detectLanguage() : 'en',
        theme: 'dark',
        hotkey: 'Ctrl+Shift+S'
      }
    };

    await saveAll(seedData);
    return true;
  }

  return {
    getAll,
    getScripts,
    getScript,
    createScript,
    updateScript,
    deleteScript,
    togglePin,
    getFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    getSettings,
    updateSettings,
    exportData,
    importData,
    seedIfEmpty
  };
})();
