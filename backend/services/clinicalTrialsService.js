const axios = require('axios');

const CLINICAL_TRIALS_URL = 'https://clinicaltrials.gov/api/v2/studies';
const DEFAULT_TRIAL = {
  title: 'No trials available',
  status: 'N/A',
  eligibility: 'N/A',
  locations: 'N/A',
  contact: {
    name: 'N/A',
    email: 'N/A',
  },
  source: 'ClinicalTrials.gov',
};

async function fetchClinicalTrials(disease, query, location, maxResults = 50) {
  try {
    const combinedTerm = `${disease || ''} ${query || ''}`.trim();

    const response = await axios.get(CLINICAL_TRIALS_URL, {
      params: {
        'query.cond': disease,
        'query.term': combinedTerm,
        pageSize: maxResults,
        format: 'json',
      },
    });

    const studies = response.data?.studies || [];

    const mapped = studies.map((study) => {
      const firstLocation =
        study.protocolSection?.contactsLocationsModule?.locations?.[0] || {};
      const firstContact =
        study.protocolSection?.contactsLocationsModule?.centralContacts?.[0] || {};

      return {
        title: study.protocolSection?.identificationModule?.briefTitle,
        status: study.protocolSection?.statusModule?.overallStatus,
        eligibility:
          study.protocolSection?.eligibilityModule?.eligibilityCriteria,
        locations: [firstLocation.city, firstLocation.country]
          .filter(Boolean)
          .join(', '),
        contact: {
          name: firstContact.name,
          email: firstContact.email,
        },
        source: 'ClinicalTrials.gov',
      };
    });

    if (mapped.length === 0) {
      return [DEFAULT_TRIAL];
    }

    const minimumResults = Math.min(5, mapped.length);
    return mapped.slice(0, Math.max(minimumResults, 1));
  } catch (error) {
    console.error('Error fetching ClinicalTrials.gov data:', error.message);
    return [DEFAULT_TRIAL];
  }
}

module.exports = { fetchClinicalTrials };
