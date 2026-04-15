const express = require('express');
const { fetchPubMed } = require('../services/pubmedService');
const { fetchOpenAlex } = require('../services/openAlexService');
const { fetchClinicalTrials } = require('../services/clinicalTrialsService');
const { expandQuery } = require('../utils/queryExpander');
const { parsePubMedXML } = require('../utils/pubmedParser');
const { rankResearchPapers } = require('../utils/ranker');
const { normalizeResearchData } = require('../utils/normalizeResearchData');
const { generateLLMResponse } = require('../services/hfService');

const router = express.Router();

router.post('/query', async (req, res) => {
  try {
    const { disease, query, location } = req.body;
    const expanded = expandQuery(disease, query);
    const expandedQuery = expanded.primary;

    const [pubmedTask, openAlexTask, clinicalTrialsTask] =
      await Promise.allSettled([
        fetchPubMed(expanded.variations[1], 100),
        fetchOpenAlex(expanded.variations[2], 100),
        fetchClinicalTrials(disease, query, location, 50),
      ]);

    if (pubmedTask.status === 'rejected') {
      console.error('PubMed task failed:', pubmedTask.reason?.message || pubmedTask.reason);
    }
    if (openAlexTask.status === 'rejected') {
      console.error('OpenAlex task failed:', openAlexTask.reason?.message || openAlexTask.reason);
    }
    if (clinicalTrialsTask.status === 'rejected') {
      console.error(
        'ClinicalTrials task failed:',
        clinicalTrialsTask.reason?.message || clinicalTrialsTask.reason
      );
    }

    const pubmedResult = pubmedTask.status === 'fulfilled' ? pubmedTask.value : null;
    const openAlexResult =
      openAlexTask.status === 'fulfilled' && Array.isArray(openAlexTask.value)
        ? openAlexTask.value
        : [];
    const clinicalTrialsResult =
      clinicalTrialsTask.status === 'fulfilled' && Array.isArray(clinicalTrialsTask.value)
        ? clinicalTrialsTask.value
        : [];

    const parsedPubMed = pubmedResult?.xmlData
      ? (await parsePubMedXML(pubmedResult.xmlData)).map((article) => ({
          ...article,
          source: 'PubMed',
        }))
      : [];

    console.log('PubMed response:', {
      idsCount: pubmedResult?.ids?.length || 0,
      idsPreview: (pubmedResult?.ids || []).slice(0, 10),
      parsedCount: parsedPubMed.length,
      parsedPreview: parsedPubMed.slice(0, 2),
    });

    console.log('OpenAlex response:', {
      count: openAlexResult.length,
      preview: openAlexResult.slice(0, 2),
    });

    const combinedResults = [...parsedPubMed, ...openAlexResult];
    console.log('Combined research results count:', combinedResults.length);

    const rankedResults = rankResearchPapers(combinedResults, expandedQuery);
    console.log('Ranked research results count:', rankedResults.length);

    const topResults = rankedResults.slice(0, 8);
    const fallbackRawResults = combinedResults.slice(0, 8);
    const finalResultsSource = topResults.length > 0 ? topResults : fallbackRawResults;

    if (topResults.length === 0 && fallbackRawResults.length > 0) {
      console.warn('Ranking returned empty results. Returning fallback raw results.');
    }

    const cleanedResults = normalizeResearchData(finalResultsSource);
    const clinicalTrials = clinicalTrialsResult;

    let aiResponse = 'AI summary temporarily unavailable';
    try {
      aiResponse = await generateLLMResponse({
        disease,
        query,
        research: cleanedResults,
        clinicalTrials,
      });
    } catch (aiError) {
      console.error('AI summary generation failed:', aiError.message);
    }

    return res.json({
      success: true,
      expandedQuery,
      results: cleanedResults,
      clinicalTrials,
      aiSummary: aiResponse,
    });
  } catch (error) {
    console.error('Error in /api/research/query:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;
