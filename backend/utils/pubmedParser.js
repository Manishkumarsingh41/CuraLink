const xml2js = require('xml2js');

async function parsePubMedXML(xmlData) {
  const parsed = await xml2js.parseStringPromise(xmlData);

  const articles = parsed?.PubmedArticleSet?.PubmedArticle || [];

  return articles.map((article) => {
    const articleData = article?.MedlineCitation?.[0]?.Article?.[0];

    const titleRaw = articleData?.ArticleTitle?.[0];
    const title =
      typeof titleRaw === 'string'
        ? titleRaw
        : titleRaw?._ || '';

    const abstractParts = articleData?.Abstract?.[0]?.AbstractText || [];
    const abstract = abstractParts
      .map((part) => (typeof part === 'string' ? part : part?._ || ''))
      .filter(Boolean)
      .join(' ');

    const authors = (articleData?.AuthorList?.[0]?.Author || [])
      .map((author) => {
        const collectiveName = author?.CollectiveName?.[0];
        if (collectiveName) {
          return collectiveName;
        }

        const foreName = author?.ForeName?.[0] || '';
        const lastName = author?.LastName?.[0] || '';
        return `${foreName} ${lastName}`.trim();
      })
      .filter(Boolean);

    const year =
      articleData?.ArticleDate?.[0]?.Year?.[0] ||
      articleData?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0] ||
      articleData?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.MedlineDate?.[0] ||
      '';

    return {
      title,
      abstract,
      authors,
      year,
    };
  });
}

module.exports = { parsePubMedXML };
