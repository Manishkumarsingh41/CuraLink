function rankResearchPapers(researchPapers, query) {
  const currentYear = new Date().getFullYear();
  const queryKeywords = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .map((keyword) => keyword.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);

  return [...(researchPapers || [])]
    .map((paper) => {
      const titleText = String(paper?.title || '').toLowerCase();
      const abstractText = String(paper?.abstract || '').toLowerCase();
      const combinedText = `${titleText} ${abstractText}`;

      const matchedKeywords = queryKeywords.filter((keyword) =>
        combinedText.includes(keyword)
      ).length;

      const relevance =
        queryKeywords.length > 0 ? matchedKeywords / queryKeywords.length : 0;

      const parsedYear = Number.parseInt(String(paper?.year || ''), 10);
      const recency =
        Number.isFinite(parsedYear) && parsedYear > 0
          ? Math.min(parsedYear / currentYear, 1)
          : 0;

      const source = String(paper?.source || '');
      const credibility =
        source === 'PubMed' ? 1 : source === 'OpenAlex' ? 0.8 : 0.5;

      const score = relevance * 0.5 + recency * 0.3 + credibility * 0.2;

      return {
        ...paper,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = { rankResearchPapers };
