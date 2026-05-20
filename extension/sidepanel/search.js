// ScriptPad — Fuzzy Search Engine (lightweight Fuse.js-style)

const SearchEngine = (() => {
  let scripts = [];

  function setScripts(allScripts) {
    scripts = allScripts;
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
        const bodyScore = fuzzyScore(pattern, stripHtml(script.body)) * 1;
        const tagScore = script.tags.reduce((max, tag) =>
          Math.max(max, fuzzyScore(pattern, tag)), 0) * 2; // Tags weighted 2x

        const totalScore = titleScore + bodyScore + tagScore;

        return { script, score: totalScore };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.script);

    return results;
  }

  return { setScripts, search };
})();
