const axios = require('axios');

const HF_API_URL =
  'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct';

const AI_FALLBACK_MESSAGE = 'AI summary temporarily unavailable';
const HF_TIMEOUT_MS = 10000;
const HF_MAX_RETRIES = 2;

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
    const { disease, query, research, clinicalTrials } = data || {};

    const topResearch = (research || []).slice(0, 3);
    const topClinicalTrials = (clinicalTrials || []).slice(0, 8);

    const researchLines = topResearch.length
      ? topResearch
          .map((item, index) => {
            const title = item?.title || 'Untitled';
            const source = item?.source || 'Unknown source';
            const year = item?.year ?? 'Unknown year';
            const abstract = item?.abstract || 'No abstract available';
            return `${index + 1}. ${title} (${source}, ${year}) - ${abstract}`;
          })
          .join('\n')
      : 'No research data provided.';

    const trialLines = topClinicalTrials.length
      ? topClinicalTrials
          .map((item, index) => {
            const title = item?.title || 'Untitled trial';
            const status = item?.status || 'Unknown status';
            const eligibility = item?.eligibility || 'Not provided';
            const location = item?.locations || 'Not provided';
            const contactName = item?.contact?.name || 'Not provided';
            const contactEmail = item?.contact?.email || 'Not provided';
            return (
              `${index + 1}. ${title} | Status: ${status} | ` +
              `Eligibility: ${eligibility} | Location: ${location} | ` +
              `Contact: ${contactName} (${contactEmail})`
            );
          })
          .join('\n')
      : 'No clinical trial data provided.';

    const prompt = [
      'You are a medical research assistant.',
      '',
      'STRICT RULES:',
      '- Do NOT hallucinate.',
      '- Use ONLY the given data.',
      '- If data is missing, explicitly say "Not available in provided data".',
      '- Output MUST follow this exact structure and headings:',
      'Condition Overview',
      'Research Insights',
      'Clinical Trials',
      'References',
      '',
      `Disease: ${disease || 'Not provided'}`,
      `User Query: ${query || 'Not provided'}`,
      '',
      'Top Research Data:',
      researchLines,
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
          return AI_FALLBACK_MESSAGE;
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
          return AI_FALLBACK_MESSAGE;
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

        return AI_FALLBACK_MESSAGE;
      }
    }

    return AI_FALLBACK_MESSAGE;
  } catch (error) {
    console.error('Error generating Hugging Face LLM response:', error.message);
    return AI_FALLBACK_MESSAGE;
  }
}

module.exports = { generateLLMResponse };
