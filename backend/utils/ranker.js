function rankResearchPapers(researchPapers, query) {
  const currentYear = new Date().getFullYear();
  const tokenize = (text) =>
    String(text || '')
      .toLowerCase()
      .split(/\s+/)
      .map((keyword) => keyword.replace(/[^a-z0-9]/g, ''))
      .filter(Boolean);

  const queryKeywords = tokenize(query);

  const input = [...(researchPapers || [])];

  const ranked = input
    .map((paper) => {
      const titleText = String(paper?.title || '').toLowerCase();
      const abstractText = String(paper?.abstract || '').toLowerCase();
      const combinedText = `${titleText} ${abstractText}`;

      const diseaseKeywords = tokenize(
        paper?.disease || paper?.condition || paper?.topic || ''
      );
      const searchKeywords = Array.from(new Set([...diseaseKeywords, ...queryKeywords]));
      const matchedKeywords = searchKeywords.filter((keyword) => combinedText.includes(keyword)).length;

      const relevance =
        searchKeywords.length > 0 ? matchedKeywords / searchKeywords.length : 0;

      const parsedYear = Number.parseInt(String(paper?.year || ''), 10);
      const recency =
        Number.isFinite(parsedYear) && parsedYear > 0
          ? Math.max(0, Math.min(1, 1 - (currentYear - parsedYear) / 15))
          : 0;

      const source = String(paper?.source || '');
      const credibility =
        source === 'PubMed' ? 1 : source === 'OpenAlex' ? 0.75 : 0.5;

      const rawScore = relevance * 0.55 + recency * 0.25 + credibility * 0.2;
      const score = Math.max(0, Math.min(100, Number((rawScore * 100).toFixed(2))));

      return {
        ...paper,
        _relevance: relevance,
        _credibility: credibility,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (ranked.length === 0) {
    return [];
  }

  const bestRelevance = ranked.reduce(
    (bestIdx, paper, idx, arr) =>
      paper._relevance > arr[bestIdx]._relevance ||
      (paper._relevance === arr[bestIdx]._relevance && paper.score > arr[bestIdx].score)
        ? idx
        : bestIdx,
    0
  );

  const bestYear = ranked.reduce(
    (bestIdx, paper, idx, arr) => {
      const year = Number.parseInt(String(paper?.year || ''), 10);
      const best = Number.parseInt(String(arr[bestIdx]?.year || ''), 10);
      const safeYear = Number.isFinite(year) ? year : -Infinity;
      const safeBest = Number.isFinite(best) ? best : -Infinity;
      if (safeYear > safeBest) {
        return idx;
      }
      if (safeYear === safeBest && paper.score > arr[bestIdx].score) {
        return idx;
      }
      return bestIdx;
    },
    0
  );

  const bestImpact = ranked.reduce(
    (bestIdx, paper, idx, arr) =>
      paper._credibility > arr[bestIdx]._credibility ||
      (paper._credibility === arr[bestIdx]._credibility && paper.score > arr[bestIdx].score)
        ? idx
        : bestIdx,
    0
  );

  return ranked.map((paper, idx) => {
    let tag = '';
    if (idx === bestRelevance) {
      tag = 'Most Relevant';
    } else if (idx === bestYear) {
      tag = 'Latest Study';
    } else if (idx === bestImpact) {
      tag = 'High Impact';
    }

    const { _relevance, _credibility, ...rest } = paper;

    return {
      ...rest,
      tag,
    };
  });
}

module.exports = { rankResearchPapers };
