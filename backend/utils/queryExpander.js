function expandQuery(disease, query) {
  const safeDisease = (disease || '').trim();
  const safeQuery = (query || '').trim();

  let primary = '';
  if (safeDisease && safeQuery) {
    primary = `${safeQuery} ${safeDisease} treatment clinical research`;
  } else if (safeQuery) {
    primary = `${safeQuery} medical research`;
  } else if (safeDisease) {
    primary = `${safeDisease} treatment research`;
  }

  primary = primary.replace(/\s+/g, ' ').trim();

  const variations = [
    primary,
    [primary, 'therapy'].filter(Boolean).join(' ').trim(),
    [primary, 'trial'].filter(Boolean).join(' ').trim(),
  ];

  return {
    primary,
    variations,
  };
}

module.exports = { expandQuery };
