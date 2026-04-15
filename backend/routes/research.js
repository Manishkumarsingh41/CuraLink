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
const AI_FALLBACK_MESSAGE =
  'Based on current research, multiple studies suggest promising advancements related to this query. Please refer to the research results below.';

function buildDefaultResearchItems(expandedQuery) {
  return Array.from({ length: 6 }, (_, index) => ({
    title: `Research data unavailable (${index + 1})`,
    abstract: `No research abstract available for "${expandedQuery || 'this query'}" at the moment.`,
    authors: 'Unknown',
    year: null,
    source: 'Fallback',
    score: 0,
  }));
}

function ensureResearchCount(results, expandedQuery) {
  const safeResults = Array.isArray(results) ? [...results] : [];

  if (safeResults.length === 0) {
    return buildDefaultResearchItems(expandedQuery);
  }

  const withScore = safeResults.map((item) => ({
    ...item,
    score: Number.isFinite(Number(item?.score)) ? Number(item.score) : 0,
  }));

  const minimum = 6;
  if (withScore.length >= minimum) {
    return withScore.slice(0, 8);
  }

  const padded = [...withScore];
  while (padded.length < minimum) {
    padded.push({
      title: `Additional fallback research (${padded.length + 1})`,
      abstract: `No additional research details available for "${expandedQuery || 'this query'}".`,
      authors: 'Unknown',
      year: null,
      source: 'Fallback',
      score: 0,
    });
  }

  return padded.slice(0, 8);
}

function ensureClinicalTrials(trials) {
  const safeTrials = Array.isArray(trials) ? trials : [];
  if (safeTrials.length > 0) {
    return safeTrials;
  }

  return [
    {
      title: 'No trials available',
      status: 'N/A',
      eligibility: 'N/A',
      locations: 'N/A',
      contact: {
        name: 'N/A',
        email: 'N/A',
      },
      source: 'ClinicalTrials.gov',
    },
  ];
}

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

    console.log('PubMed count:', parsedPubMed.length);
    console.log('OpenAlex count:', openAlexResult.length);

    const combinedResults = [...parsedPubMed, ...openAlexResult];
    const rankedResults = rankResearchPapers(combinedResults, expandedQuery);

    const topResults = rankedResults.slice(0, 8);
    const fallbackRawResults = combinedResults
      .map((item) => ({
        ...item,
        score: Number.isFinite(Number(item?.score)) ? Number(item.score) : 0,
      }))
      .slice(0, 8);
    const finalResultsSource = topResults.length > 0 ? topResults : fallbackRawResults;

    if (topResults.length === 0 && fallbackRawResults.length > 0) {
      console.warn('Ranking returned empty results. Returning fallback raw results.');
    }

    const cleanedResults = ensureResearchCount(
      normalizeResearchData(finalResultsSource),
      expandedQuery
    );
    const clinicalTrials = ensureClinicalTrials(clinicalTrialsResult);

    let aiResponse = AI_FALLBACK_MESSAGE;
    try {
      aiResponse = await generateLLMResponse({
        disease,
        query,
        research: cleanedResults,
        clinicalTrials,
      });
    } catch (aiError) {
      console.error('AI summary generation failed:', aiError.message);
      aiResponse = AI_FALLBACK_MESSAGE;
    }

    if (!String(aiResponse || '').trim()) {
      aiResponse = AI_FALLBACK_MESSAGE;
    }

    console.log('Final results:', cleanedResults.length);

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
