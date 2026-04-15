const axios = require('axios');

const CLINICAL_TRIALS_URL = 'https://clinicaltrials.gov/api/v2/studies';

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

    return studies.map((study) => {
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
  } catch (error) {
    console.error('Error fetching ClinicalTrials.gov data:', error.message);
    throw error;
  }
}

module.exports = { fetchClinicalTrials };
