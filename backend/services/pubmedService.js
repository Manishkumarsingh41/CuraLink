const axios = require('axios');

const ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

async function fetchPubMed(query, maxResults = 100) {
  try {
    const searchResponse = await axios.get(ESEARCH_URL, {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        sort: 'pub date',
        retmode: 'json',
      },
    });

    const ids = searchResponse.data?.esearchresult?.idlist || [];
    console.log('PubMed esearch IDs:', {
      count: ids.length,
      preview: ids.slice(0, 10),
    });

    if (ids.length === 0) {
      return {
        ids,
        xmlData: '',
      };
    }

    const fetchResponse = await axios.get(EFETCH_URL, {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml',
      },
    });

    return {
      ids,
      xmlData: fetchResponse.data,
    };
  } catch (error) {
    console.error('Error fetching PubMed data:', error.message);
    throw error;
  }
}

module.exports = { fetchPubMed };
