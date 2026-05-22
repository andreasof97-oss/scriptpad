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

  async function createScript({ title, body, tags, folderId, pinned, type, nodes, startNodeId }) {
    const data = await getAll();
    const now = new Date().toISOString();
    const script = {
      id: uuid(),
      folderId: folderId || null,
      title: title || '',
      body: body || '',
      tags: tags || [],
      pinned: pinned || false,
      type: type || 'standard',
      createdAt: now,
      updatedAt: now
    };
    if (type === 'branching') {
      script.nodes = nodes || [];
      script.startNodeId = startNodeId || null;
      delete script.body;
    }
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
        scripts: data.scripts.map(s => {
          const base = {
            id: s.id || uuid(),
            folderId: s.folderId || null,
            title: s.title || '',
            tags: Array.isArray(s.tags) ? s.tags : [],
            pinned: !!s.pinned,
            type: s.type || 'standard',
            createdAt: s.createdAt || new Date().toISOString(),
            updatedAt: s.updatedAt || new Date().toISOString()
          };
          if (s.type === 'branching') {
            base.nodes = Array.isArray(s.nodes) ? s.nodes : [];
            base.startNodeId = s.startNodeId || null;
          } else {
            base.body = s.body || '';
          }
          return base;
        }),
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

    const branchingNodeIds = {
      n1: uuid(), n2: uuid(), n3: uuid(), n4: uuid(), n5: uuid(), n6: uuid()
    };

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
        },
        // Branching seed script
        {
          id: uuid(),
          folderId: folderId1,
          title: 'Sales Qualification Flow',
          type: 'branching',
          tags: ['qualification', 'branching', 'sales'],
          pinned: false,
          startNodeId: branchingNodeIds.n1,
          nodes: [
            {
              id: branchingNodeIds.n1,
              label: 'Opening',
              body: '<p><strong>Greeting:</strong></p><p>"Hi, this is <span style="color:#fbbf24">[Your Name]</span> from <span style="color:#fbbf24">[Company]</span>. Am I speaking with <span style="color:#fbbf24">[Prospect Name]</span>?"</p><p><strong>Purpose:</strong></p><p>"Great! The reason for my call is we help companies like yours reduce <span style="color:#fbbf24">[pain point]</span> by up to 40%. I\'d love to ask a couple of quick questions to see if it\'s a fit. Do you have two minutes?"</p>',
              choices: [
                { label: 'Yes, go ahead', targetNodeId: branchingNodeIds.n2 },
                { label: 'Not a good time', targetNodeId: branchingNodeIds.n5 },
                { label: 'Not interested', targetNodeId: branchingNodeIds.n4 }
              ]
            },
            {
              id: branchingNodeIds.n2,
              label: 'Qualification Questions',
              body: '<p><strong>Budget:</strong></p><p>"What are you currently spending on <span style="color:#fbbf24">[solution area]</span> per month?"</p><p><strong>Timeline:</strong></p><p>"When are you looking to have a solution in place?"</p><p><strong>Authority:</strong></p><p>"Besides yourself, who else would be involved in making this decision?"</p><p><strong>Need:</strong></p><p>"What\'s the biggest challenge you\'re facing with <span style="color:#fbbf24">[pain point]</span> right now?"</p>',
              choices: [
                { label: 'Has budget & authority', targetNodeId: branchingNodeIds.n3 },
                { label: 'Needs manager approval', targetNodeId: branchingNodeIds.n5 },
                { label: 'No budget right now', targetNodeId: branchingNodeIds.n6 }
              ]
            },
            {
              id: branchingNodeIds.n3,
              label: 'Close — Book Demo',
              body: '<p><strong>Transition:</strong></p><p>"Based on what you\'ve shared, I think we can really help. The next step would be a quick 15-minute demo where I\'ll show you exactly how we solve <span style="color:#fbbf24">[their pain point]</span>."</p><p><strong>Close:</strong></p><p>"I have availability <span style="color:#fbbf24">[Day 1]</span> at <span style="color:#fbbf24">[Time]</span> or <span style="color:#fbbf24">[Day 2]</span> at <span style="color:#fbbf24">[Time]</span>. Which works better for you?"</p><p><strong>Confirm:</strong></p><ul><li>Repeat date, time, and email</li><li>"You\'ll receive a calendar invite shortly. Looking forward to it!"</li></ul>',
              choices: []
            },
            {
              id: branchingNodeIds.n4,
              label: 'Objection — Not Interested',
              body: '<p><strong>Acknowledge:</strong></p><p>"I completely understand, and I appreciate your honesty."</p><p><strong>Curiosity hook:</strong></p><p>"Just out of curiosity — if there was a way to <span style="color:#fbbf24">[key benefit]</span> without <span style="color:#fbbf24">[common friction]</span>, would that be worth a 2-minute conversation?"</p><p><strong>If still no:</strong></p><p>"No problem at all. Could I send you a quick one-pager by email? That way if things change, you\'ll have it handy."</p>',
              choices: [
                { label: 'Willing to hear more', targetNodeId: branchingNodeIds.n2 },
                { label: 'Hard no — send email', targetNodeId: branchingNodeIds.n6 }
              ]
            },
            {
              id: branchingNodeIds.n5,
              label: 'Schedule Follow-up',
              body: '<p><strong>Set callback:</strong></p><p>"No problem at all! When would be a better time to reconnect?"</p><p><strong>Options:</strong></p><ul><li>"How about <span style="color:#fbbf24">[Day]</span> at <span style="color:#fbbf24">[Time]</span>?"</li><li>"Morning or afternoon — what\'s better for you?"</li></ul><p><strong>Confirm:</strong></p><p>"Perfect, I\'ll give you a call on <span style="color:#fbbf24">[Day/Time]</span>. And just so I\'m prepared — can I grab your email in case I need to send anything over beforehand?"</p>',
              choices: []
            },
            {
              id: branchingNodeIds.n6,
              label: 'Wrap Up — Send Info',
              body: '<p><strong>Email follow-up:</strong></p><p>"I\'ll send that right over. Could I grab your best email?"</p><p><strong>After getting email:</strong></p><p>"You\'ll see an email from <span style="color:#fbbf24">[Company]</span> with a quick overview. If anything catches your eye, just hit reply and I\'ll set up a proper demo."</p><p><strong>Closing:</strong></p><p>"Thanks for your time today, <span style="color:#fbbf24">[Name]</span>. Have a great rest of your day!"</p>',
              choices: []
            }
          ],
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
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
