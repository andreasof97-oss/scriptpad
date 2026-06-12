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

  // ---- Constants ----
  const FREE_NOTE_LIMIT = 15;
  const FREE_SCRIPT_LIMIT = 15;
  const FREE_FOLDER_LIMIT = 5;
  const FREE_KB_LIMIT = 20;
  const FREE_AI_QUERIES_PER_DAY = 5;

  // ---- Generic helpers ----

  async function getAll() {
    return new Promise((resolve) => {
      storage.get(['folders', 'scripts', 'settings', 'notes', 'knowledgeBase'], (data) => {
        resolve({
          folders: data.folders || [],
          scripts: data.scripts || [],
          notes: data.notes || [],
          knowledgeBase: data.knowledgeBase || [],
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

  // ---- Notes ----

  function generateNoteTitle(body, existingNotes) {
    if (body && body.trim()) {
      const firstLine = body.trim().split('\n')[0].trim();
      if (firstLine) {
        return firstLine.length > 50 ? firstLine.substring(0, 50) + '…' : firstLine;
      }
    }
    const num = (existingNotes || []).length + 1;
    return `Note #${num}`;
  }

  async function getNotes() {
    const data = await getAll();
    return data.notes;
  }

  async function getNote(id) {
    const notes = await getNotes();
    return notes.find(n => n.id === id) || null;
  }

  async function createNote({ body }) {
    const data = await getAll();
    const now = new Date().toISOString();
    const note = {
      id: uuid(),
      title: generateNoteTitle(body, data.notes),
      body: body || '',
      createdAt: now,
      updatedAt: now
    };
    data.notes.push(note);
    await saveAll({ notes: data.notes });
    return note;
  }

  async function updateNote(id, { body }) {
    const data = await getAll();
    const idx = data.notes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    if (body !== undefined) {
      data.notes[idx].body = body;
      data.notes[idx].title = generateNoteTitle(body, data.notes);
    }
    data.notes[idx].updatedAt = new Date().toISOString();
    await saveAll({ notes: data.notes });
    return data.notes[idx];
  }

  async function deleteNote(id) {
    const data = await getAll();
    data.notes = data.notes.filter(n => n.id !== id);
    await saveAll({ notes: data.notes });
  }

  async function getNotesCount() {
    const notes = await getNotes();
    return notes.length;
  }

  // ---- Knowledge Base ----

  async function getKnowledgeBase() {
    const data = await getAll();
    return data.knowledgeBase;
  }

  async function getKBEntry(id) {
    const kb = await getKnowledgeBase();
    return kb.find(e => e.id === id) || null;
  }

  async function createKBEntry({ category, title, body, tags, pinned }) {
    const data = await getAll();
    const now = new Date().toISOString();
    const entry = {
      id: uuid(),
      category: category || 'custom',
      title: title || '',
      body: body || '',
      tags: tags || [],
      pinned: pinned || false,
      createdAt: now,
      updatedAt: now
    };
    data.knowledgeBase.push(entry);
    await saveAll({ knowledgeBase: data.knowledgeBase });
    return entry;
  }

  async function updateKBEntry(id, updates) {
    const data = await getAll();
    const idx = data.knowledgeBase.findIndex(e => e.id === id);
    if (idx === -1) return null;
    data.knowledgeBase[idx] = {
      ...data.knowledgeBase[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await saveAll({ knowledgeBase: data.knowledgeBase });
    return data.knowledgeBase[idx];
  }

  async function deleteKBEntry(id) {
    const data = await getAll();
    data.knowledgeBase = data.knowledgeBase.filter(e => e.id !== id);
    await saveAll({ knowledgeBase: data.knowledgeBase });
  }

  async function toggleKBPin(id) {
    const entry = await getKBEntry(id);
    if (!entry) return null;
    return updateKBEntry(id, { pinned: !entry.pinned });
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
        notes: Array.isArray(data.notes) ? data.notes.map(n => ({
          id: n.id || uuid(),
          title: n.title || '',
          body: n.body || '',
          createdAt: n.createdAt || new Date().toISOString(),
          updatedAt: n.updatedAt || new Date().toISOString()
        })) : [],
        knowledgeBase: Array.isArray(data.knowledgeBase) ? data.knowledgeBase.map(e => ({
          id: e.id || uuid(),
          category: e.category || 'custom',
          title: e.title || '',
          body: e.body || '',
          tags: Array.isArray(e.tags) ? e.tags : [],
          pinned: !!e.pinned,
          createdAt: e.createdAt || new Date().toISOString(),
          updatedAt: e.updatedAt || new Date().toISOString()
        })) : [],
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

  // Add branching sample for users upgrading from v1.0
  async function addBranchingSampleIfMissing() {
    // Re-read fresh from storage to avoid stale references
    const freshData = await getAll();
    const hasBranching = freshData.scripts.some(s => s.type === 'branching');
    if (hasBranching) return;

    // Find an Openers folder if one exists
    let folderId = null;
    const openersFolder = freshData.folders.find(f => f.name === 'Openers');
    if (openersFolder) folderId = openersFolder.id;

    const n1 = uuid(), n2 = uuid(), n3 = uuid(), n4 = uuid(), n5 = uuid(), n6 = uuid();
    const sample = {
      id: uuid(),
      folderId: folderId,
      title: 'Sales Qualification Flow',
      type: 'branching',
      tags: ['qualification', 'branching', 'sales'],
      pinned: false,
      startNodeId: n1,
      nodes: [
        {
          id: n1, label: 'Opening',
          body: '<p><strong>Greeting:</strong></p><p>"Hi, this is <span style="color:#fbbf24">[Your Name]</span> from <span style="color:#fbbf24">[Company]</span>. Am I speaking with <span style="color:#fbbf24">[Prospect Name]</span>?"</p><p><strong>Purpose:</strong></p><p>"Great! The reason for my call is we help companies like yours reduce <span style="color:#fbbf24">[pain point]</span> by up to 40%. I\'d love to ask a couple of quick questions to see if it\'s a fit. Do you have two minutes?"</p>',
          choices: [
            { label: 'Yes, go ahead', targetNodeId: n2 },
            { label: 'Not a good time', targetNodeId: n5 },
            { label: 'Not interested', targetNodeId: n4 }
          ]
        },
        {
          id: n2, label: 'Qualification Questions',
          body: '<p><strong>Budget:</strong></p><p>"What are you currently spending on <span style="color:#fbbf24">[solution area]</span> per month?"</p><p><strong>Timeline:</strong></p><p>"When are you looking to have a solution in place?"</p><p><strong>Authority:</strong></p><p>"Besides yourself, who else would be involved in making this decision?"</p><p><strong>Need:</strong></p><p>"What\'s the biggest challenge you\'re facing with <span style="color:#fbbf24">[pain point]</span> right now?"</p>',
          choices: [
            { label: 'Has budget & authority', targetNodeId: n3 },
            { label: 'Needs manager approval', targetNodeId: n5 },
            { label: 'No budget right now', targetNodeId: n6 }
          ]
        },
        {
          id: n3, label: 'Close — Book Demo',
          body: '<p><strong>Transition:</strong></p><p>"Based on what you\'ve shared, I think we can really help. The next step would be a quick 15-minute demo where I\'ll show you exactly how we solve <span style="color:#fbbf24">[their pain point]</span>."</p><p><strong>Close:</strong></p><p>"I have availability <span style="color:#fbbf24">[Day 1]</span> at <span style="color:#fbbf24">[Time]</span> or <span style="color:#fbbf24">[Day 2]</span> at <span style="color:#fbbf24">[Time]</span>. Which works better for you?"</p><p><strong>Confirm:</strong></p><ul><li>Repeat date, time, and email</li><li>"You\'ll receive a calendar invite shortly. Looking forward to it!"</li></ul>',
          choices: []
        },
        {
          id: n4, label: 'Objection — Not Interested',
          body: '<p><strong>Acknowledge:</strong></p><p>"I completely understand, and I appreciate your honesty."</p><p><strong>Curiosity hook:</strong></p><p>"Just out of curiosity — if there was a way to <span style="color:#fbbf24">[key benefit]</span> without <span style="color:#fbbf24">[common friction]</span>, would that be worth a 2-minute conversation?"</p><p><strong>If still no:</strong></p><p>"No problem at all. Could I send you a quick one-pager by email? That way if things change, you\'ll have it handy."</p>',
          choices: [
            { label: 'Willing to hear more', targetNodeId: n2 },
            { label: 'Hard no — send email', targetNodeId: n6 }
          ]
        },
        {
          id: n5, label: 'Schedule Follow-up',
          body: '<p><strong>Set callback:</strong></p><p>"No problem at all! When would be a better time to reconnect?"</p><p><strong>Options:</strong></p><ul><li>"How about <span style="color:#fbbf24">[Day]</span> at <span style="color:#fbbf24">[Time]</span>?"</li><li>"Morning or afternoon — what\'s better for you?"</li></ul><p><strong>Confirm:</strong></p><p>"Perfect, I\'ll give you a call on <span style="color:#fbbf24">[Day/Time]</span>. And just so I\'m prepared — can I grab your email in case I need to send anything over beforehand?"</p>',
          choices: []
        },
        {
          id: n6, label: 'Wrap Up — Send Info',
          body: '<p><strong>Email follow-up:</strong></p><p>"I\'ll send that right over. Could I grab your best email?"</p><p><strong>After getting email:</strong></p><p>"You\'ll see an email from <span style="color:#fbbf24">[Company]</span> with a quick overview. If anything catches your eye, just hit reply and I\'ll set up a proper demo."</p><p><strong>Closing:</strong></p><p>"Thanks for your time today, <span style="color:#fbbf24">[Name]</span>. Have a great rest of your day!"</p>',
          choices: []
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    freshData.scripts.push(sample);
    await saveAll({ scripts: freshData.scripts });
    console.log('[ScriptPad] Added branching sample "Sales Qualification Flow"');
  }

  async function seedIfEmpty() {
    const data = await getAll();
    if (data.scripts.length > 0 || data.folders.length > 0) {
      // Check if we need to add the branching sample (v1.1 upgrade)
      try {
        await addBranchingSampleIfMissing();
      } catch (e) {
        console.error('[ScriptPad] Failed to add branching sample:', e);
      }
      // Check if we need to add KB seed data (v1.4 upgrade)
      try {
        await addKBSeedIfMissing();
      } catch (e) {
        console.error('[ScriptPad] Failed to add KB seed data:', e);
      }
      return false;
    }

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

    // Also seed KB entries on fresh install
    await addKBSeedIfMissing();

    return true;
  }

  // Add KB seed data for users upgrading or on fresh install
  async function addKBSeedIfMissing() {
    const freshData = await getAll();
    if (freshData.knowledgeBase.length > 0) return;

    const kbSeed = [
      {
        id: uuid(),
        category: 'products',
        title: 'Premium Internet Plan',
        body: '<p><strong>Speed:</strong> 500 Mbps down / 100 Mbps up</p><p><strong>Price:</strong> $79.99/mo</p><p><strong>Includes:</strong></p><ul><li>Wi-Fi router rental</li><li>24/7 support</li></ul><p><strong>Contract:</strong> 12 months, $199 early termination fee</p><p><strong>Best for:</strong> Families, remote workers, gamers</p>',
        tags: ['internet', 'premium', '500mbps'],
        pinned: true,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        id: uuid(),
        category: 'bundles',
        title: 'Triple Play Bundle',
        body: '<p><strong>Includes:</strong></p><ul><li>Internet 500 Mbps</li><li>TV 200 channels</li><li>Phone unlimited local</li></ul><p><strong>Regular price:</strong> $149.99/mo</p><p><strong>Bundle price:</strong> <span style="color:#fbbf24">$119.99/mo (save $30)</span></p><p><strong>Add-ons:</strong></p><ul><li>Premium channels +$15/mo</li><li>International calling +$10/mo</li></ul><p><strong>Availability:</strong> New customers or upgrades only</p>',
        tags: ['bundle', 'triple-play', 'tv', 'internet', 'phone'],
        pinned: false,
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: uuid(),
        category: 'retention',
        title: 'Loyalty Discount — 3 Month Offer',
        body: '<p><strong>Trigger:</strong> Customer calls to cancel or downgrade</p><p><strong>Offer:</strong> <span style="color:#fbbf24">50% off current plan for 3 months</span></p><p><strong>Eligibility:</strong></p><ul><li>6+ months on current plan</li><li>No prior retention offer in 12 months</li></ul><p><strong>Escalation:</strong> If they decline, offer free month + waive any fees</p><p><strong>Approval:</strong> Auto-approved, no supervisor needed</p>',
        tags: ['retention', 'loyalty', 'discount', 'save'],
        pinned: true,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      {
        id: uuid(),
        category: 'objections',
        title: '"Too Expensive" Objection Handler',
        body: '<p><strong>Step 1 — Acknowledge:</strong></p><p>"I completely understand, and I appreciate you being upfront about that. Price is always an important factor."</p><p><strong>Step 2 — Reframe Value:</strong></p><p>"Let me break down what you\'re actually getting for that price..."</p><ul><li>Highlight unique features they won\'t get elsewhere</li><li>Calculate cost per day ("that\'s less than a cup of coffee")</li><li>Mention what\'s <em>included</em> that competitors charge extra for</li></ul><p><strong>Step 3 — Compare Alternatives:</strong></p><p>"If you went with <span style="color:#fbbf24">[competitor]</span>, you\'d pay <span style="color:#fbbf24">[price]</span> but you\'d lose <span style="color:#fbbf24">[key benefits]</span>."</p><p><strong>Step 4 — Close:</strong></p><p>"So with everything included, would you like to go ahead and get started today?"</p>',
        tags: ['objection', 'price', 'expensive', 'common'],
        pinned: false,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    freshData.knowledgeBase = kbSeed;
    await saveAll({ knowledgeBase: freshData.knowledgeBase });
    console.log('[ScriptPad] Added KB seed data (4 entries)');
  }

  // ---- AI Usage Tracking ----

  function getTodayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function getAIUsage() {
    return new Promise((resolve) => {
      storage.get(['aiQueriesUsed', 'aiQueriesDate'], (data) => {
        const today = getTodayDateStr();
        if (data.aiQueriesDate !== today) {
          // Reset for new day
          resolve({ used: 0, date: today });
        } else {
          resolve({ used: data.aiQueriesUsed || 0, date: today });
        }
      });
    });
  }

  async function incrementAIUsage() {
    const usage = await getAIUsage();
    const newUsed = usage.used + 1;
    return new Promise((resolve) => {
      storage.set({ aiQueriesUsed: newUsed, aiQueriesDate: usage.date }, () => {
        resolve({ used: newUsed, date: usage.date });
      });
    });
  }

  async function canUseAI(isPro) {
    if (isPro) return true;
    const usage = await getAIUsage();
    return usage.used < FREE_AI_QUERIES_PER_DAY;
  }

  return {
    FREE_NOTE_LIMIT,
    FREE_SCRIPT_LIMIT,
    FREE_FOLDER_LIMIT,
    FREE_KB_LIMIT,
    FREE_AI_QUERIES_PER_DAY,
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
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    getNotesCount,
    getKnowledgeBase,
    getKBEntry,
    createKBEntry,
    updateKBEntry,
    deleteKBEntry,
    toggleKBPin,
    getSettings,
    updateSettings,
    exportData,
    importData,
    seedIfEmpty,
    getAIUsage,
    incrementAIUsage,
    canUseAI
  };
})();
