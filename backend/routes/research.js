const express = require('express');
const { fetchPubMed } = require('../services/pubmedService');
const { fetchOpenAlex } = require('../services/openAlexService');
const { fetchClinicalTrials } = require('../services/clinicalTrialsService');
const { expandQuery } = require('../utils/queryExpander');
const { parsePubMedXML } = require('../utils/pubmedParser');
const { rankResearchPapers } = require('../utils/ranker');
const { generateLLMResponse } = require('../services/hfService');

const router = express.Router();

function cleanText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildPaperLink(item, expandedQuery) {
  const source = String(item?.source || '').toLowerCase();
  const id = cleanText(item?.id);

  if (source === 'pubmed') {
    if (id) {
      return `https://pubmed.ncbi.nlm.nih.gov/${id}`;
    }
    const encodedPubMedFallback = encodeURIComponent(item?.title || expandedQuery || 'medical research');
    return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodedPubMedFallback}`;
  }

  if (source === 'openalex') {
    return String(item?.url || item?.id || 'https://openalex.org/works');
  }

  if (item?.url) {
    return String(item.url);
  }

  const titleOrQuery = item?.title || expandedQuery || 'medical research';
  const encoded = encodeURIComponent(titleOrQuery);
  return `https://scholar.google.com/scholar?q=${encoded}`;
}

function normalizeAuthors(authors) {
  if (Array.isArray(authors)) {
    const joined = authors.map((author) => cleanText(author)).filter(Boolean).join(', ');
    return joined || 'Unknown';
  }

  const asText = cleanText(authors);
  return asText || 'Unknown';
}

function buildShortSummary(abstract, expandedQuery) {
  const sentences = splitSentences(abstract);
  if (sentences.length >= 2) {
    return `${sentences[0]} ${sentences[1]}`;
  }
  if (sentences.length === 1) {
    return sentences[0];
  }

  return `This study provides relevant context for ${expandedQuery || 'the requested medical topic'}, but detailed abstract text is not available.`;
}

function buildKeyFinding(abstract, shortSummary) {
  const sentences = splitSentences(abstract);
  const findingSentence = sentences.find((sentence) =>
    /(suggest|show|improv|reduc|increase|decrease|association|effect|benefit|risk)/i.test(sentence)
  );

  if (findingSentence) {
    return findingSentence;
  }

  if (sentences.length > 0) {
    return sentences[0];
  }

  return shortSummary;
}

function buildRelevanceReason(title, shortSummary, expandedQuery, source) {
  const queryTerms = String(expandedQuery || '')
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9]/g, ''))
    .filter((term) => term.length > 2);

  const content = `${title || ''} ${shortSummary || ''}`.toLowerCase();
  const matches = queryTerms.filter((term) => content.includes(term)).length;

  if (matches > 0) {
    return `This aligns with ${matches} query term(s) and is sourced from ${source || 'a trusted medical database'}.`;
  }

  return `This provides supporting evidence relevant to ${expandedQuery || 'the medical question'} from ${source || 'a medical source'}.`;
}

function summarizeResearch(paper, query, disease) {
  const normalizedPaper = paper || {};
  const title = cleanText(normalizedPaper?.title) || 'Untitled study';
  const source = cleanText(normalizedPaper?.source) || 'Unknown source';
  let abstract = cleanText(normalizedPaper?.abstract);
  if (!abstract || abstract.length < 20) {
    abstract = title;
  }
  const text = abstract.toLowerCase();

  const summaryFromAbstract = abstract && abstract.length > 30
    ? abstract.split('.').slice(0, 2).join('.').trim()
    : title;
  const shortSummary = summaryFromAbstract || title;

  let keyFinding = 'Study provides insights into disease mechanisms';
  if (text.includes('improve') || text.includes('improvement')) {
    keyFinding = 'Study shows improvement in symptoms';
  } else if (text.includes('reduce') || text.includes('reduction')) {
    keyFinding = 'Study shows reduction in disease progression';
  } else if (text.includes('amyloid')) {
    keyFinding = 'Study targets amyloid-beta pathology in Alzheimer\'s disease';
  } else if (text.includes('microbiome')) {
    keyFinding = 'Highlights role of gut microbiome in disease';
  } else {
    const fallbackFinding = buildKeyFinding(abstract, shortSummary);
    if (fallbackFinding) {
      keyFinding = fallbackFinding;
    }
  }

  let relevanceReason = 'Relevant to the query';
  const normalizedQuery = String(query || '').toLowerCase();
  const normalizedDisease = String(disease || '').toLowerCase();
  const numericYear = Number.isFinite(Number(normalizedPaper?.year))
    ? Number(normalizedPaper.year)
    : null;

  if (normalizedQuery && text.includes(normalizedQuery)) {
    relevanceReason = 'Direct match with query keywords';
  } else if (normalizedDisease && text.includes(normalizedDisease)) {
    relevanceReason = 'Matches disease context';
  } else if (numericYear && numericYear >= 2024) {
    relevanceReason = 'Recent research study';
  } else {
    relevanceReason = buildRelevanceReason(title, shortSummary, query || disease, source);
  }

  return {
    ...normalizedPaper,
    title,
    shortSummary,
    keyFinding,
    relevanceReason,
    authors: normalizeAuthors(normalizedPaper?.authors),
    year: numericYear,
    source,
    id: cleanText(normalizedPaper?.id),
    link: buildPaperLink(normalizedPaper, query || disease),
    score: Number.isFinite(Number(normalizedPaper?.score)) ? Number(normalizedPaper.score) : 0,
  };
}

function buildDynamicAiSummary(disease, query, insights) {
  const safeDisease = disease || 'the selected condition';
  const safeQuery = query || 'the requested intervention';
  const safeInsights = Array.isArray(insights)
    ? insights.filter((item) => cleanText(item).length > 0).slice(0, 5)
    : [];

  const bulletInsights =
    safeInsights.length > 0
      ? safeInsights.map((item) => `- ${item}`).join('\n')
      : '- Emerging studies indicate multiple promising treatment pathways.';

  return [
    `Research on ${safeDisease} focusing on "${safeQuery}" shows strong developments.`,
    '',
    'Key findings include:',
    bulletInsights,
    '',
    'These studies highlight emerging treatment strategies and improved understanding of disease mechanisms.',
  ].join('\n');
}

function extractInsights(processedResults) {
  const fromResults = (processedResults || [])
    .slice(0, 5)
    .map((paper) => cleanText(paper?.keyFinding))
    .filter(Boolean);

  if (fromResults.length >= 3) {
    return fromResults.slice(0, 5);
  }

  const padded = [...fromResults];
  while (padded.length < 3) {
    padded.push('Key finding not available');
  }

  return padded.slice(0, 5);
}

function buildDefaultResearchItems(expandedQuery) {
  return Array.from({ length: 6 }, (_, index) => ({
    title: `Research data unavailable (${index + 1})`,
    shortSummary: `No detailed summary is currently available for "${expandedQuery || 'this query'}".`,
    keyFinding: 'A specific key finding is not available in the retrieved data.',
    relevanceReason: `This placeholder keeps the report complete while live data is unavailable for ${expandedQuery || 'the requested condition'}.`,
    authors: 'Unknown',
    year: null,
    source: 'Fallback',
    link: `https://scholar.google.com/scholar?q=${encodeURIComponent(expandedQuery || 'medical research')}`,
    score: 0,
  }));
}

function ensureResearchCount(results, expandedQuery) {
  const safeResults = Array.isArray(results) ? [...results] : [];

  if (safeResults.length === 0) {
    return buildDefaultResearchItems(expandedQuery);
  }

  const withScore = safeResults.map((item) => {
    const normalizedTitle = cleanText(item?.title) || 'Untitled study';
    const normalizedSummary = cleanText(item?.shortSummary) || normalizedTitle;
    const normalizedFinding = cleanText(item?.keyFinding) || 'Study provides insights into disease mechanisms';

    return {
      ...item,
      shortSummary: normalizedSummary,
      keyFinding: normalizedFinding,
      score: Number.isFinite(Number(item?.score)) ? Number(item.score) : 0,
    };
  });

  const minimum = 6;
  if (withScore.length >= minimum) {
    return withScore.slice(0, 8);
  }

  const padded = [...withScore];
  while (padded.length < minimum) {
    padded.push({
      title: `Additional fallback research (${padded.length + 1})`,
      shortSummary: `No additional research details are currently available for "${expandedQuery || 'this query'}".`,
      keyFinding: 'No additional key finding available.',
      relevanceReason: `Added as a fallback entry to preserve a complete research view for ${expandedQuery || 'the query'}.`,
      authors: 'Unknown',
      year: null,
      source: 'Fallback',
      link: `https://scholar.google.com/scholar?q=${encodeURIComponent(expandedQuery || 'medical research')}`,
      score: 0,
    });
  }

  return padded.slice(0, 8);
}

function ensureClinicalTrials(trials) {
  const safeTrials = Array.isArray(trials) ? trials : [];
  if (safeTrials.length > 0) {
    return safeTrials.slice(0, 5);
  }

  return [
    {
      title: 'No active trials found',
      status: 'N/A',
      location: 'N/A',
      locations: 'N/A',
      eligibility: 'N/A',
      explanation: 'Related therapies are still under active research.',
      contact: 'N/A',
      source: 'ClinicalTrials.gov',
      link: 'https://clinicaltrials.gov/',
    },
  ];
}

function buildFallbackRawResearch(searchQuery) {
  return Array.from({ length: 4 }, (_, index) => ({
    title: `Fallback research item ${index + 1}`,
    abstract: `No direct study was retrieved for \"${searchQuery}\" at this time. This placeholder keeps retrieval output non-empty for downstream processing.`,
    authors: 'Unknown',
    year: null,
    source: 'Fallback',
    url: `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQuery || 'medical research')}`,
    score: 0,
  }));
}

router.post('/query', async (req, res) => {
  try {
    const { disease, query, location } = req.body;
    const expanded = expandQuery(disease, query);
    const expandedQuery = expanded.primary;
    const searchQuery = `${String(disease || '').trim()} ${String(query || '').trim()} treatment research`
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Search Query:', searchQuery);

    const [pubmedTask, openAlexTask, clinicalTrialsTask] =
      await Promise.allSettled([
        fetchPubMed(searchQuery, 100, disease),
        fetchOpenAlex(searchQuery, 100, disease),
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

    console.log('PubMed Count:', parsedPubMed.length);
    console.log('OpenAlex Count:', openAlexResult.length);

    let combinedResults = [...parsedPubMed, ...openAlexResult];
    if (combinedResults.length === 0) {
      console.warn('Combined retrieval returned empty results. Injecting fallback research items.');
      combinedResults = buildFallbackRawResearch(searchQuery);
    }

    const rankedResults = rankResearchPapers(combinedResults, expandedQuery);
    console.log('Sample paper before summarize:', rankedResults[0]);
    const processedResults = rankedResults.map((paper) =>
      summarizeResearch(paper, query, disease)
    );
    const finalProcessedResults = ensureResearchCount(processedResults, expandedQuery);
    console.log('Final result sample:', finalProcessedResults[0]);

    const clinicalTrials = ensureClinicalTrials(clinicalTrialsResult);
    const insights = extractInsights(finalProcessedResults);

    let aiResponse = buildDynamicAiSummary(disease, query, insights);
    try {
      const llmSummary = await generateLLMResponse({
        disease,
        query,
        research: finalProcessedResults,
        clinicalTrials,
        insights,
      });
      if (String(llmSummary || '').trim()) {
        aiResponse = llmSummary;
      }
    } catch (aiError) {
      console.error('AI summary generation failed:', aiError.message);
      aiResponse = buildDynamicAiSummary(disease, query, insights);
    }

    if (!String(aiResponse || '').trim()) {
      aiResponse = buildDynamicAiSummary(disease, query, insights);
    }

    console.log('Final results:', finalProcessedResults.length);

    return res.json({
      success: true,
      aiSummary: aiResponse,
      insights,
      results: finalProcessedResults,
      clinicalTrials,
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
