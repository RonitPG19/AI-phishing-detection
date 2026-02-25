import { useState } from 'react';
import './App.css';

function App() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const data = await window.electronAPI.scanEmail();
      setResult(data);
    } catch (err) {
      setError(err.error || 'Failed to scan email');
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>Phishing Email Scanner</h1>
          <p>Analyze your latest email for malicious links</p>
        </header>

        <div className="scan-section">
          <button 
            className="scan-button"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <div className="spinner"></div>
                <span>Scanning email...</span>
              </>
            ) : (
              'Scan Latest Email'
            )}
          </button>
        </div>

        {error && (
          <div className="error-box">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="results">
            <div className="status-badge">
              {result.connected ? (
                <span className="badge success">✓ Connected to Gmail</span>
              ) : (
                <span className="badge error">× Connection Failed</span>
              )}
            </div>

            {result.urls && result.urls.length > 0 ? (
              <div className="urls-section">
                <h2>Links Found · {result.urls.length}</h2>
                <div className="urls-list">
                  {result.urls.map((item, index) => (
                    <div key={index} className="url-item">
                      <div className="url-content">
                        <span className="url-text">{item.url}</span>
                        <span className={`status-pill ${item.status}`}>
                          {item.status === 'phishing' && '⚠ Phishing'}
                          {item.status === 'safe' && '✓ Safe'}
                          {item.status === 'unknown' && '? Unknown'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-urls">
                <p>No links detected in the latest email</p>
              </div>
            )}

            <details className="raw-output">
              <summary>View raw output</summary>
              <pre>{result.rawOutput}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;