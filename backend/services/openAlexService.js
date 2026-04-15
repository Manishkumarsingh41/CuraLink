const axios = require('axios');
const { decodeOpenAlexAbstract } = require('../utils/openAlexDecoder');

const OPENALEX_URL = 'https://api.openalex.org/works';

async function fetchOpenAlex(query, maxResults = 100) {
  try {
    const perPage = 25;
    const totalPages = Math.ceil(maxResults / perPage);
    const pagesToFetch = Math.min(totalPages, 4);

    const requests = Array.from({ length: pagesToFetch }, (_, index) => {
      const page = index + 1;
      return axios.get(OPENALEX_URL, {
        params: {
          search: query,
          'per-page': perPage,
          page,
          sort: 'relevance_score:desc',
        },
      });
    });

    const responses = await Promise.all(requests);

    const combinedResults = responses
      .flatMap((response) => response.data?.results || [])
      .slice(0, maxResults)
      .map((item) => ({
        title: item.title,
        abstract: decodeOpenAlexAbstract(item.abstract_inverted_index),
        authors: item.authorships?.[0]?.author?.display_name,
        year: item.publication_year,
        url: item.primary_location?.landing_page_url,
        source: 'OpenAlex',
      }));

    return combinedResults;
  } catch (error) {
    console.error('Error fetching OpenAlex data:', error.message);
    throw error;
  }
}

module.exports = { fetchOpenAlex };
