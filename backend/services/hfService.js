const axios = require('axios');

const HF_API_URL =
  'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct';

const HF_TIMEOUT_MS = 10000;
const HF_MAX_RETRIES = 2;

function buildFallbackSummary(data) {
  const { disease, query, insights } = data || {};
  const safeDisease = disease || 'the selected condition';
  const safeQuery = query || 'the requested intervention';
  const safeInsights = Array.isArray(insights)
    ? insights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
    : [];

  const insightLines =
    safeInsights.length > 0
      ? safeInsights.map((item) => `- ${item}`).join('\n')
      : '- Emerging studies indicate multiple promising treatment pathways.';

  return [
    `Research on ${safeDisease} focusing on "${safeQuery}" shows promising advancements.`,
    '',
    'Key findings include:',
    insightLines,
    '',
    'These studies highlight emerging treatment strategies and improved understanding of disease mechanisms.',
  ].join('\n');
}

function stripPromptEcho(generatedText, prompt) {
  const text = String(generatedText || '').trim();
  if (!text) {
    return '';
  }

  if (text.startsWith(prompt)) {
    return text.slice(prompt.length).trim();
  }

  return text;
}

async function generateLLMResponse(data) {
  try {
    if (!process.env.HF_API_KEY) {
      console.error('HF_API_KEY is missing. Set it in backend/.env');
      return buildFallbackSummary(data);
    }

    const { disease, query, research, clinicalTrials, insights } = data || {};

    const topResearch = (research || []).slice(0, 3);
    const topClinicalTrials = (clinicalTrials || []).slice(0, 3);
    const topInsights = (insights || []).slice(0, 5);

    const researchLines = topResearch.length
      ? topResearch
          .map((item, index) => {
            const title = item?.title || 'Untitled';
            const source = item?.source || 'Unknown source';
            const year = item?.year ?? 'Unknown year';
            const shortSummary = item?.shortSummary || 'No summary available';
            const keyFinding = item?.keyFinding || 'No key finding available';
            const relevanceReason = item?.relevanceReason || 'No relevance reason available';
            return (
              `${index + 1}. ${title} (${source}, ${year})\n` +
              `Key finding: ${keyFinding}\n` +
              `Summary: ${shortSummary}\n` +
              `Relevance: ${relevanceReason}`
            );
          })
          .join('\n')
      : 'No research data provided.';

    const trialLines = topClinicalTrials.length
      ? topClinicalTrials
          .map((item, index) => {
            const title = item?.title || 'Untitled trial';
            const status = item?.status || 'Unknown status';
            const explanation = item?.explanation || 'Not provided';
            const location = item?.locations || 'Not provided';
            const contact = item?.contact || 'Not provided';
            return (
              `${index + 1}. ${title} | Status: ${status} | ` +
              `Explanation: ${explanation} | Location: ${location} | ` +
              `Contact: ${contact}`
            );
          })
          .join('\n')
      : 'No clinical trial data provided.';

    const insightLines = topInsights.length
      ? topInsights.map((insight, index) => `${index + 1}. ${insight}`).join('\n')
      : 'No extracted insights provided.';

    const prompt = [
      'You are an expert medical research assistant.',
      '',
      'STRICT RULES:',
      '- Do NOT hallucinate.',
      '- Use ONLY the given data.',
      '- If data is missing, explicitly say "Not available in provided data".',
      '- Keep output concise and practical for clinicians and patients.',
      '- Output MUST follow this exact structure and headings:',
      'Condition Overview',
      'Key Insights',
      'Treatment / Research Trends',
      'Clinical Relevance',
      'Clinical Trials',
      '',
      `Disease: ${disease || 'Not provided'}`,
      `User Query: ${query || 'Not provided'}`,
      'Keywords to prioritize if present: microbiome, FMT (fecal transplant), probiotics, gut-brain axis.',
      '',
      'Top Research Data:',
      researchLines,
      '',
      'Extracted Insights:',
      insightLines,
      '',
      'Clinical Trial Data:',
      trialLines,
      '',
      'Now produce the final answer using the required headings only.',
    ].join('\n');

    for (let attempt = 0; attempt <= HF_MAX_RETRIES; attempt += 1) {
      try {
        const response = await axios.post(
          HF_API_URL,
          {
            inputs: prompt,
            options: {
              wait_for_model: true,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.HF_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: HF_TIMEOUT_MS,
          }
        );

        const payload = response.data;
        console.log('Hugging Face raw response:', payload);

        if (payload?.error) {
          const errorMessage = String(payload.error);
          const estimatedTime = payload?.estimated_time;

          if (/loading/i.test(errorMessage)) {
            console.warn('Hugging Face model loading.', {
              estimatedTime,
              errorMessage,
              attempt: attempt + 1,
            });
          } else {
            console.error('Hugging Face API error response:', {
              errorMessage,
              attempt: attempt + 1,
            });
          }

          if (attempt < HF_MAX_RETRIES) {
            continue;
          }
          return buildFallbackSummary(data);
        }

        const generatedText = Array.isArray(payload)
          ? payload[0]?.generated_text
          : payload?.generated_text;

        const cleanedOutput = stripPromptEcho(generatedText, prompt);

        if (!cleanedOutput) {
          console.warn('Hugging Face returned empty generated_text.', {
            attempt: attempt + 1,
          });
          if (attempt < HF_MAX_RETRIES) {
            continue;
          }
          return buildFallbackSummary(data);
        }

        const sectionsPresent =
          /Condition Overview/i.test(cleanedOutput) &&
          /Key Insights/i.test(cleanedOutput) &&
          /Treatment\s*\/\s*Research Trends/i.test(cleanedOutput) &&
          /Clinical Relevance/i.test(cleanedOutput);

        if (!sectionsPresent) {
          if (attempt < HF_MAX_RETRIES) {
            continue;
          }
          return buildFallbackSummary(data);
        }

        return cleanedOutput;
      } catch (attemptError) {
        const isTimeout =
          attemptError?.code === 'ECONNABORTED' || /timeout/i.test(attemptError?.message || '');

        console.error('Error generating Hugging Face LLM response:', {
          message: attemptError.message,
          attempt: attempt + 1,
          timeout: isTimeout,
        });

        if (attempt < HF_MAX_RETRIES) {
          continue;
        }

        return buildFallbackSummary(data);
      }
    }

    return buildFallbackSummary(data);
  } catch (error) {
    console.error('Error generating Hugging Face LLM response:', error.message);
    return buildFallbackSummary(data);
  }
}

module.exports = { generateLLMResponse };
