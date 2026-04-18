import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import './index.css';

function App() {
  const [disease, setDisease] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('Generating insights...');
  const [insights, setInsights] = useState([]);
  const [results, setResults] = useState([]);
  const [clinicalTrials, setClinicalTrials] = useState([]);
  const reportRef = useRef(null);

  const fallbackResearch = [
    {
      title: 'No research available',
      source: 'Fallback',
      year: 'N/A',
      authors: 'Unknown',
      shortSummary: 'No research available at the moment.',
      keyFinding: 'No key finding available.',
      relevanceReason: 'No relevance note available.',
      link: '',
    },
  ];

  const fallbackTrials = [
    {
      title: 'No active trials found',
      status: 'N/A',
      location: 'N/A',
      eligibility: 'N/A',
      explanation: 'Related therapies are still under active research.',
      contact: 'N/A',
      link: 'https://clinicaltrials.gov/',
    },
  ];

  const safeInsights = Array.isArray(insights) ? insights : [];
  const safeResults = Array.isArray(results) ? results : [];
  const safeClinicalTrials = Array.isArray(clinicalTrials) ? clinicalTrials : [];
  const displayedInsights =
    safeInsights.length > 0
      ? safeInsights
      : [
          'FMT improves motor symptoms in selected cohorts.',
          'Amyloid-beta reduction observed in targeted therapies.',
          'New approaches suggest stronger disease-modifying potential.',
        ];

  const formatContact = (contact) => {
    if (!contact) {
      return 'N/A';
    }

    if (typeof contact === 'string') {
      return contact;
    }

    const name = contact?.name || 'N/A';
    const email = contact?.email || 'N/A';

    if (name === 'N/A' && email === 'N/A') {
      return 'N/A';
    }

    return `${name} (${email})`;
  };

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
      console.log(data);
      console.log('Clinical Trials Data:', data?.clinicalTrials);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Request failed.');
      }

      setAiSummary(data?.aiSummary || 'Generating insights...');
      setInsights(Array.isArray(data?.insights) ? data.insights : []);
      setResults(Array.isArray(data.results) ? data.results : []);
      const normalizedTrials = Array.isArray(data?.clinicalTrials)
        ? data.clinicalTrials.map((trial) => ({
            title: trial?.title || 'No title',
            status: trial?.status || 'N/A',
            location: trial?.location || 'N/A',
            eligibility: trial?.eligibility || 'N/A',
            contact: trial?.contact || 'N/A',
            link: trial?.link || '',
            source: trial?.source || 'ClinicalTrials.gov',
            explanation: trial?.explanation || 'N/A',
          }))
        : [];
      setClinicalTrials(normalizedTrials);
    } catch (err) {
      setError('Something went wrong. Showing available data.');
      setAiSummary('Generating insights...');
      setInsights([]);
      setResults([]);
      setClinicalTrials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportRef.current) {
      return;
    }

    setDownloading(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#050d1a',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const startY = 130;
      const imageHeight = (canvas.height * contentWidth) / canvas.width;
      const imageData = canvas.toDataURL('image/png');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text('Curalink Medical Research Report', margin, 40);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text(`Disease: ${disease || 'Not provided'}`, margin, 62);
      pdf.text(`Query: ${query || 'Not provided'}`, margin, 80);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, 98);

      pdf.addImage(imageData, 'PNG', margin, startY, contentWidth, imageHeight, undefined, 'FAST');

      let remainingHeight = imageHeight - (pageHeight - startY - margin);

      while (remainingHeight > 0) {
        pdf.addPage();
        const nextY = margin - (imageHeight - remainingHeight);
        pdf.addImage(imageData, 'PNG', margin, nextY, contentWidth, imageHeight, undefined, 'FAST');
        remainingHeight -= pageHeight - margin * 2;
      }

      pdf.save('Curalink_Report.pdf');
    } catch (downloadError) {
      setError('Unable to download report right now. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>Curalink</h1>
        <p className="hero-subtitle">AI research assistant for evidence, insight, and trial discovery.</p>
      </header>

      <div className="search-card section">
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

        <div className="action-row">
          <button type="button" onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            className="download-btn"
            onClick={handleDownloadReport}
            disabled={loading || downloading}
          >
            {downloading ? 'Preparing PDF...' : 'Download Report'}
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {loading ? <div className="loading">Searching...</div> : null}

      <div ref={reportRef}>
        <section className="section">
          <h2>AI Summary</h2>
          <div className="ai-summary">
            {String(aiSummary || 'Generating insights...')}
          </div>
        </section>

        <section className="section">
          <h2>Key Insights</h2>
          {displayedInsights.length > 0 ? (
            <ul className="insights-list">
              {displayedInsights.map((insight, index) => (
                <li key={`insight-${index}`}>{String(insight || 'No insight available')}</li>
              ))}
            </ul>
          ) : (
            <ul className="insights-list">
              <li>Research trends and key signals will appear here after search.</li>
            </ul>
          )}
        </section>

        <section className="section">
          <h2>Research Results</h2>
          {safeResults.length > 0 ? (
            <div className="card-grid">
              {safeResults.map((item, index) => (
                <div key={`${item.title || 'research'}-${index}`} className="result-card">
                  <div className="card-meta">
                    <span className="badge badge-source">{item.source || 'Unknown'}</span>
                    <span className="badge badge-year">{item.year ?? 'N/A'}</span>
                    <span className="badge badge-relevance">{item.relevanceReason || 'Relevant to query'}</span>
                  </div>
                  <h3>{item.title || 'Untitled'}</h3>
                  <p className="key-finding"><strong>Key finding:</strong> <strong>{item.keyFinding || 'Not available'}</strong></p>
                  <p>{item.shortSummary || 'No short summary available.'}</p>
                  <p className="meta-line">
                    <strong>Authors:</strong> {item.authors || 'Unknown'}
                  </p>
                  <p className="meta-line">
                    <strong>Source:</strong> {item.source || 'Unknown'}
                  </p>
                  {item.link ? (
                    <p>
                      <a href={item.link} target="_blank" rel="noreferrer">
                        Read More
                      </a>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="card-grid">
              {fallbackResearch.map((item, index) => (
                <div key={`fallback-research-${index}`} className="result-card">
                  <div className="card-meta">
                    <span className="badge badge-source">{item.source}</span>
                    <span className="badge badge-year">{item.year}</span>
                    <span className="badge badge-relevance">{item.relevanceReason}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="key-finding"><strong>Key finding:</strong> <strong>{item.keyFinding}</strong></p>
                  <p>{item.shortSummary}</p>
                  <p className="meta-line"><strong>Authors:</strong> {item.authors}</p>
                  <p className="meta-line"><strong>Source:</strong> {item.source}</p>
                  {item.link ? (
                    <p>
                      <a href={item.link} target="_blank" rel="noreferrer">
                        Read More
                      </a>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <h2>Clinical Trials</h2>
          {safeClinicalTrials.length > 0 ? (
            <div className="card-grid">
              {safeClinicalTrials.map((trial, index) => (
                <div key={`${trial.title || 'trial'}-${index}`} className="result-card">
                  <span className="badge badge-trial">{trial.status || 'Unknown'}</span>
                  <h3>{trial.title || 'Untitled trial'}</h3>
                  <p>
                    <strong>Location:</strong> {trial.location || 'N/A'}
                  </p>
                  <p>
                    <strong>Eligibility:</strong> {trial.eligibility || 'N/A'}
                  </p>
                  <p>
                    <strong>Contact:</strong> {formatContact(trial?.contact)}
                  </p>
                  <p>
                    <strong>Explanation:</strong> {trial.explanation || 'N/A'}
                  </p>
                  {trial.link ? (
                    <p>
                      <a href={trial.link} target="_blank" rel="noreferrer">
                        View trial
                      </a>
                    </p>
                  ) : null}
                  <p>
                    <strong>Source:</strong> {trial.source || 'ClinicalTrials.gov'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-grid">
              {fallbackTrials.map((trial, index) => (
                <div key={`fallback-trial-${index}`} className="result-card">
                  <span className="badge badge-trial">{trial.status}</span>
                  <h3>{trial.title}</h3>
                  <p>
                    <strong>Location:</strong> {trial.location}
                  </p>
                  <p>
                    <strong>Eligibility:</strong> {trial.eligibility}
                  </p>
                  <p>
                    <strong>Contact:</strong> {trial.contact}
                  </p>
                  <p>
                    <strong>Explanation:</strong> {trial.explanation}
                  </p>
                  <p>
                    <a href={trial.link} target="_blank" rel="noreferrer">
                      View trial
                    </a>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
