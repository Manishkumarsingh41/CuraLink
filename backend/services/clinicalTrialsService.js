const axios = require('axios');

const CLINICAL_TRIALS_URL = 'https://clinicaltrials.gov/api/v2/studies';
const DEFAULT_TRIAL = {
  title: 'No active trials found',
  status: 'N/A',
  location: 'N/A',
  eligibility: 'N/A',
  contact: 'N/A',
  explanation:
    'Related therapies are still under active research.',
  source: 'ClinicalTrials.gov',
};

async function fetchClinicalTrials(disease, query, location, maxResults = 50) {
  try {
    const diseaseTerm = String(disease || '').trim();
    const fullTerm = `${String(disease || '').trim()} ${String(query || '').trim()}`.trim();

    const fetchStudies = async (params) => {
      const response = await axios.get(CLINICAL_TRIALS_URL, {
        params: {
          ...params,
          pageSize: 10,
          format: 'json',
        },
        timeout: 10000,
      });

      return response.data?.studies || [];
    };

    let studies = [];
    if (diseaseTerm) {
      studies = await fetchStudies({ 'query.cond': diseaseTerm });
    }
    if (studies.length === 0 && fullTerm) {
      studies = await fetchStudies({ 'query.term': fullTerm });
    }

    const mapped = studies.map((study) => {
      const firstLocation =
        study.protocolSection?.contactsLocationsModule?.locations?.[0] || {};
      const firstContact =
        study.protocolSection?.contactsLocationsModule?.centralContacts?.[0] || {};
      const eligibility =
        study.protocolSection?.eligibilityModule?.eligibilityCriteria ||
        study.protocolSection?.eligibilityModule?.healthyVolunteers ||
        'N/A';

      const nctId =
        study.protocolSection?.identificationModule?.nctId ||
        study.protocolSection?.identificationModule?.orgStudyIdInfo?.id ||
        '';

      return {
        title:
          study.protocolSection?.identificationModule?.briefTitle ||
          study.protocolSection?.identificationModule?.officialTitle ||
          'Untitled clinical study',
        status: study.protocolSection?.statusModule?.overallStatus,
        location: [firstLocation.city, firstLocation.country]
          .filter(Boolean)
          .join(', ') || 'N/A',
        locations: [firstLocation.city, firstLocation.country]
          .filter(Boolean)
          .join(', ') || 'N/A',
        eligibility,
        contact: firstContact.name
          ? `${firstContact.name}${firstContact.email ? ` (${firstContact.email})` : ''}`
          : 'N/A',
        explanation:
          study.protocolSection?.descriptionModule?.briefSummary ||
          'Clinical trial details are available on ClinicalTrials.gov.',
        source: 'ClinicalTrials.gov',
        link: nctId ? `https://clinicaltrials.gov/study/${nctId}` : 'https://clinicaltrials.gov/',
      };
    }).filter((study) => Boolean(study?.title));

    if (mapped.length === 0) {
      return [DEFAULT_TRIAL];
    }

    const prioritized = mapped
      .filter((study) => /recruit|active|not yet recruiting/i.test(String(study?.status || '')));
    if (prioritized.length > 0) {
      return prioritized.slice(0, 5);
    }

    return mapped.slice(0, 5);
  } catch (error) {
    console.error('Error fetching ClinicalTrials.gov data:', error.message);
    return [DEFAULT_TRIAL];
  }
}

module.exports = { fetchClinicalTrials };
