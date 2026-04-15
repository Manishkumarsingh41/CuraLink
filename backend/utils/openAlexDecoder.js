function decodeOpenAlexAbstract(abstractInvertedIndex) {
  if (!abstractInvertedIndex || typeof abstractInvertedIndex !== 'object') {
    return '';
  }

  const tokens = [];

  Object.entries(abstractInvertedIndex).forEach(([word, positions]) => {
    if (!Array.isArray(positions)) {
      return;
    }

    positions.forEach((position) => {
      if (Number.isInteger(position) && position >= 0) {
        tokens[position] = word;
      }
    });
  });

  return tokens.filter(Boolean).join(' ');
}

module.exports = { decodeOpenAlexAbstract };
