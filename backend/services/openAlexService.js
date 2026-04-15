const axios = require('axios');
const { decodeOpenAlexAbstract } = require('../utils/openAlexDecoder');

const OPENALEX_URL = 'https://api.openalex.org/works';

async function fetchOpenAlex(query, maxResults = 100, fallbackQuery = '') {
  try {
    const targetResults = Math.max(50, Number(maxResults) || 50);
    const perPage = 25;
    const totalPages = Math.ceil(targetResults / perPage);
    const pagesToFetch = Math.min(totalPages, 4);

    const fetchByTerm = async (term) => {
      const requests = Array.from({ length: pagesToFetch }, (_, index) => {
        const page = index + 1;
        return axios.get(OPENALEX_URL, {
          params: {
            search: term,
            'per-page': perPage,
            page,
            sort: 'relevance_score:desc',
          },
        });
      });

      const responses = await Promise.all(requests);

      return responses
        .flatMap((response) => response.data?.results || [])
        .slice(0, targetResults)
        .map((item) => ({
          id: item.id || '',
          title: item.title,
          abstract:
            decodeOpenAlexAbstract(item.abstract_inverted_index) ||
            'No abstract available',
          authors: (item.authorships || [])
            .map((authorship) => authorship?.author?.display_name)
            .filter(Boolean),
          year: item.publication_year,
          url: item.primary_location?.landing_page_url || item.id || '',
          source: 'OpenAlex',
        }));
    };

    const primaryTerm = String(query || '').trim();
    const diseaseOnlyTerm = String(fallbackQuery || '').trim();

    let combinedResults = await fetchByTerm(primaryTerm);
    if (
      combinedResults.length === 0 &&
      diseaseOnlyTerm &&
      diseaseOnlyTerm.toLowerCase() !== primaryTerm.toLowerCase()
    ) {
      console.log('OpenAlex primary query returned empty results. Retrying with disease-only query.');
      combinedResults = await fetchByTerm(diseaseOnlyTerm);
    }

    return combinedResults;
  } catch (error) {
    console.error('Error fetching OpenAlex data:', error.message);
    throw error;
  }
}

module.exports = { fetchOpenAlex };
