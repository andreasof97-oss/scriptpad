// ScriptPad — Fuzzy Search Engine (lightweight Fuse.js-style)

const SearchEngine = (() => {
  let scripts = [];
  let notes = [];
  let kbEntries = [];

  function setScripts(allScripts) {
    scripts = allScripts;
  }

  function setNotes(allNotes) {
    notes = allNotes;
  }

  function setKB(allKB) {
    kbEntries = allKB;
  }

  // Simple fuzzy match — checks if all characters of the pattern appear in order in the text
  function fuzzyScore(pattern, text) {
    if (!pattern || !text) return 0;
    pattern = pattern.toLowerCase();
    text = text.toLowerCase();

    // Exact substring match gets highest score
    if (text.includes(pattern)) {
      // Boost for match at start of word
      const words = text.split(/\s+/);
      for (const word of words) {
        if (word.startsWith(pattern)) return 1.0;
      }
      return 0.8;
    }

    // Fuzzy character-by-character match
    let patternIdx = 0;
    let score = 0;
    let consecutive = 0;
    let lastMatchIdx = -2;

    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        patternIdx++;
        // Bonus for consecutive matches
        if (i === lastMatchIdx + 1) {
          consecutive++;
          score += consecutive * 2;
        } else {
          consecutive = 0;
          score += 1;
        }
        lastMatchIdx = i;
      }
    }

    // All pattern characters must be found
    if (patternIdx < pattern.length) return 0;

    // Normalize score (0 to 1)
    return Math.min(score / (pattern.length * 3), 0.6);
  }

  // Strip HTML tags for searching body text
  function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function search(query) {
    if (!query || query.trim() === '') return scripts;

    const pattern = query.trim();

    const results = scripts
      .map(script => {
        const titleScore = fuzzyScore(pattern, script.title) * 3; // Title weighted 3x
        const tagScore = script.tags.reduce((max, tag) =>
          Math.max(max, fuzzyScore(pattern, tag)), 0) * 2; // Tags weighted 2x

        let bodyScore = 0;
        if (script.type === 'branching' && Array.isArray(script.nodes)) {
          // Index all node labels and body text for branching scripts
          script.nodes.forEach(node => {
            bodyScore = Math.max(bodyScore, fuzzyScore(pattern, node.label) * 1.5);
            bodyScore = Math.max(bodyScore, fuzzyScore(pattern, stripHtml(node.body)) * 1);
            // Also search choice labels
            if (Array.isArray(node.choices)) {
              node.choices.forEach(c => {
                bodyScore = Math.max(bodyScore, fuzzyScore(pattern, c.label) * 1);
              });
            }
          });
        } else {
          bodyScore = fuzzyScore(pattern, stripHtml(script.body)) * 1;
        }

        const totalScore = titleScore + bodyScore + tagScore;

        return { script, score: totalScore };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.script);

    return results;
  }

  function searchNotes(query) {
    if (!query || query.trim() === '') return notes;

    const pattern = query.trim();

    const results = notes
      .map(note => {
        const titleScore = fuzzyScore(pattern, note.title) * 3;
        const bodyScore = fuzzyScore(pattern, note.body) * 1;
        const totalScore = titleScore + bodyScore;
        return { note, score: totalScore, type: 'note' };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => ({ ...r.note, _type: 'note' }));

    return results;
  }

  function searchKB(query) {
    if (!query || query.trim() === '') return kbEntries;

    const pattern = query.trim();

    const results = kbEntries
      .map(entry => {
        const titleScore = fuzzyScore(pattern, entry.title) * 3;
        const bodyScore = fuzzyScore(pattern, stripHtml(entry.body)) * 1;
        const tagScore = (entry.tags || []).reduce((max, tag) =>
          Math.max(max, fuzzyScore(pattern, tag)), 0) * 2;
        const categoryScore = fuzzyScore(pattern, entry.category) * 1.5;
        const totalScore = titleScore + bodyScore + tagScore + categoryScore;
        return { entry, score: totalScore };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.entry);

    return results;
  }

  return { setScripts, setNotes, setKB, search, searchNotes, searchKB };
})();
