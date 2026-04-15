import React, { useState } from 'react';
import './index.css';

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
    <div>
      <h1>Curalink</h1>

      <div className="search-card">
        <label htmlFor="disease">Disease</label>
        <input
          id="disease"
          type="text"
          value={disease}
          onChange={(e) => setDisease(e.target.value)}
          placeholder="e.g. lung cancer"
        />

        <label htmlFor="query">Query</label>
        <input
          id="query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. vitamin D"
        />

        <label htmlFor="location">Location</label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. India"
        />

        <button type="button" onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section>
        <h2>AI Summary</h2>
        <div className="ai-summary">
          {aiSummary || 'Generating insights...'}
        </div>
      </section>

      <section>
        <h2>Research Results</h2>
        {results?.length > 0 ? (
          <div>
            {results.map((item, index) => (
              <div key={`${item.title || 'research'}-${index}`} className="result-card">
                <span className="badge badge-source">{item.source || 'Unknown'}</span>
                <span className="badge badge-year">{item.year ?? 'N/A'}</span>
                <h3>{item.title || 'Untitled'}</h3>
                <p>{item.abstract || 'No abstract available.'}</p>
                <p>
                  <strong>Authors:</strong> {item.authors || 'Unknown'}
                </p>
                {item.url ? (
                  <p>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      View paper
                    </a>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {fallbackResearch.map((item, index) => (
              <div key={`fallback-research-${index}`} className="result-card">
                <span className="badge badge-source">{item.source}</span>
                <span className="badge badge-year">{item.year}</span>
                <h3>{item.title}</h3>
                <p>{item.abstract}</p>
                <p>
                  <strong>Authors:</strong> Unknown
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Clinical Trials</h2>
        {clinicalTrials?.length > 0 ? (
          <div>
            {clinicalTrials.map((trial, index) => (
              <div key={`${trial.title || 'trial'}-${index}`} className="result-card">
                <span className="badge badge-trial">{trial.status || 'Unknown'}</span>
                <h3>{trial.title || 'Untitled trial'}</h3>
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
          <div>
            {fallbackTrials.map((trial, index) => (
              <div key={`fallback-trial-${index}`} className="result-card">
                <span className="badge badge-trial">{trial.status}</span>
                <h3>{trial.title}</h3>
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
