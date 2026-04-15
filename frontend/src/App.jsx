import React, { useState } from 'react';

function App() {
  const [disease, setDisease] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('Generating insights...');
  const [results, setResults] = useState([]);
  const [clinicalTrials, setClinicalTrials] = useState([]);

  const fallbackResearch = [
    {
      title: 'No research available',
      source: 'Fallback',
      year: 'N/A',
      abstract: 'No research available at the moment.',
    },
  ];

  const fallbackTrials = [
    {
      title: 'No trials available',
      status: 'N/A',
      locations: 'N/A',
      eligibility: 'N/A',
    },
  ];

  const handleSearch = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/research/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ disease, query, location }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Request failed.');
      }

      setAiSummary(data?.aiSummary || 'Generating insights...');
      setResults(Array.isArray(data.results) ? data.results : []);
      setClinicalTrials(
        Array.isArray(data.clinicalTrials) ? data.clinicalTrials : []
      );
    } catch (err) {
      setError('Something went wrong. Showing available data.');
      setAiSummary('Generating insights...');
      setResults([]);
      setClinicalTrials([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
      <h1>Curalink</h1>

      <div
        style={{
          display: 'grid',
          gap: '8px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <label htmlFor="disease">Disease</label>
        <input
          id="disease"
          type="text"
          value={disease}
          onChange={(e) => setDisease(e.target.value)}
          placeholder="e.g. lung cancer"
          style={{ padding: '8px' }}
        />

        <label htmlFor="query">Query</label>
        <input
          id="query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. vitamin D"
          style={{ padding: '8px' }}
        />

        <label htmlFor="location">Location</label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. India"
          style={{ padding: '8px' }}
        />

        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          style={{ width: '120px', padding: '10px' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <section style={{ marginBottom: '20px' }}>
        <h2>AI Summary</h2>
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.5,
          }}
        >
          {aiSummary || 'Generating insights...'}
        </div>
      </section>

      <section style={{ marginBottom: '20px' }}>
        <h2>Research Results</h2>
        {results?.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {results.map((item, index) => (
              <div
                key={`${item.title || 'research'}-${index}`}
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}
              >
                <h3 style={{ marginTop: 0 }}>{item.title || 'Untitled'}</h3>
                <p>
                  <strong>Source:</strong> {item.source || 'Unknown'}
                </p>
                <p>
                  <strong>Year:</strong> {item.year ?? 'N/A'}
                </p>
                <p>{item.abstract || 'No abstract available.'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {fallbackResearch.map((item, index) => (
              <div
                key={`fallback-research-${index}`}
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}
              >
                <h3 style={{ marginTop: 0 }}>{item.title}</h3>
                <p>
                  <strong>Source:</strong> {item.source}
                </p>
                <p>
                  <strong>Year:</strong> {item.year}
                </p>
                <p>{item.abstract}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Clinical Trials</h2>
        {clinicalTrials?.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {clinicalTrials.map((trial, index) => (
              <div
                key={`${trial.title || 'trial'}-${index}`}
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}
              >
                <h3 style={{ marginTop: 0 }}>{trial.title || 'Untitled trial'}</h3>
                <p>
                  <strong>Status:</strong> {trial.status || 'Unknown'}
                </p>
                <p>
                  <strong>Location:</strong> {trial.locations || 'N/A'}
                </p>
                <p>
                  <strong>Eligibility:</strong> {trial.eligibility || 'N/A'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {fallbackTrials.map((trial, index) => (
              <div
                key={`fallback-trial-${index}`}
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}
              >
                <h3 style={{ marginTop: 0 }}>{trial.title}</h3>
                <p>
                  <strong>Status:</strong> {trial.status}
                </p>
                <p>
                  <strong>Location:</strong> {trial.locations}
                </p>
                <p>
                  <strong>Eligibility:</strong> {trial.eligibility}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
