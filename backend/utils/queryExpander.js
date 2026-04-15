function expandQuery(disease, query) {
  const safeDisease = (disease || '').trim();
  const safeQuery = (query || '').trim();

  const primary = [safeDisease, safeQuery].filter(Boolean).join(' ').trim();

  const variations = [
    primary,
    [primary, 'clinical trial'].filter(Boolean).join(' ').trim(),
    [primary, 'treatment', 'research'].filter(Boolean).join(' ').trim(),
  ];

  return {
    primary,
    variations,
  };
}

module.exports = { expandQuery };
