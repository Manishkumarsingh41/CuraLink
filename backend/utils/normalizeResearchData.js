function normalizeResearchData(rankedResearch) {
  return (rankedResearch || []).map((item) => {
    const normalizedAuthors = Array.isArray(item?.authors)
      ? item.authors.filter(Boolean).join(', ') || 'Unknown'
      : item?.authors
        ? String(item.authors)
        : 'Unknown';

    // 🔥 CRITICAL FIX HERE
    const normalizedAbstract =
      item?.abstract ||
      item?.summary ||
      item?.title || // fallback to title
      '';

    const parsedYear = Number.parseInt(String(item?.year ?? ''), 10);
    const normalizedYear = Number.isFinite(parsedYear) ? parsedYear : null;

    const parsedScore = Number(item?.score);
    const normalizedScore = Number.isFinite(parsedScore) ? parsedScore : 0;

    return {
      id: item?.id ? String(item.id) : '',
      title: String(item?.title || ''),
      abstract: String(normalizedAbstract), // ✅ always usable text
      authors: normalizedAuthors,
      year: normalizedYear,
      source: String(item?.source || ''),
      link: item?.link ? String(item.link) : item?.url ? String(item.url) : '',
      url: item?.url ? String(item.url) : item?.link ? String(item.link) : '',
      score: normalizedScore,
    };
  });
}

module.exports = { normalizeResearchData };