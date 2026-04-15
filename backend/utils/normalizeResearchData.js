function normalizeResearchData(rankedResearch) {
  return (rankedResearch || []).map((item) => {
    const normalizedAuthors = Array.isArray(item?.authors)
      ? item.authors.filter(Boolean).join(', ') || 'Unknown'
      : item?.authors
        ? String(item.authors)
        : 'Unknown';

    const normalizedAbstract = item?.abstract
      ? String(item.abstract)
      : 'No abstract available';

    const parsedYear = Number.parseInt(String(item?.year ?? ''), 10);
    const normalizedYear = Number.isFinite(parsedYear) ? parsedYear : null;

    const parsedScore = Number(item?.score);
    const normalizedScore = Number.isFinite(parsedScore) ? parsedScore : 0;

    return {
      title: String(item?.title || ''),
      abstract: normalizedAbstract,
      authors: normalizedAuthors,
      year: normalizedYear,
      source: String(item?.source || ''),
      score: normalizedScore,
    };
  });
}

module.exports = { normalizeResearchData };
