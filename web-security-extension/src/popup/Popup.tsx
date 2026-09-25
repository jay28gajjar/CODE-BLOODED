import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { RiskLevel, SecurityResult, ExtensionSettings, ThreatIndicator } from '../types/security';
import { WebpageAnalysis } from '../types/webpage';

interface PopupState {
  loading: boolean;
  error: string | null;
  currentURL: string;
  currentDomain: string;
  urlResult: SecurityResult | null;
  pageAnalysis: WebpageAnalysis | null;
  settings: ExtensionSettings | null;
}

const getRiskColor = (level?: RiskLevel) => {
  switch (level) {
    case 'LOW': return 'text-low bg-low';
    case 'UNKNOWN': return 'text-unknown bg-unknown';
    case 'SUSPICIOUS': return 'text-suspicious bg-suspicious';
    case 'HIGH': return 'text-high bg-high';
    default: return 'text-unknown bg-unknown';
  }
};

const getRiskBarColor = (level?: RiskLevel) => {
  switch (level) {
    case 'LOW': return '#22c55e';
    case 'UNKNOWN': return '#94a3b8';
    case 'SUSPICIOUS': return '#f97316';
    case 'HIGH': return '#ef4444';
    default: return '#94a3b8';
  }
};

const getRiskLabel = (level?: RiskLevel) => level || 'Analyzing...';
const getRiskEmoji = (level?: RiskLevel) => {
  switch (level) {
    case 'LOW': return '✅';
    case 'UNKNOWN': return '❓';
    case 'SUSPICIOUS': return '⚠️';
    case 'HIGH': return '🚨';
    default: return '🔍';
  }
};

const Popup = () => {
  const [state, setState] = useState<PopupState>({
    loading: true,
    error: null,
    currentURL: '',
    currentDomain: '',
    urlResult: null,
    pageAnalysis: null,
    settings: null
  });

  const analyze = async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0 || !tabs[0].url) {
        throw new Error("No active tab URL found");
      }
      const url = tabs[0].url;
      const domain = new URL(url).hostname;
      
      setState(s => ({ ...s, currentURL: url, currentDomain: domain }));

      // Mock messages since background script isn't implemented in this prompt
      const result: SecurityResult = await new Promise(res => {
        chrome.runtime.sendMessage({ type: 'ANALYZE_URL', payload: { url } }, (resp) => {
          if (chrome.runtime.lastError) {
             res({ url, domain, riskLevel: 'UNKNOWN', score: 0, indicators: [{code: 'ERR', message: 'Analysis failed', score: 0}], isCached: false, analyzedAt: Date.now() });
          } else {
             res(resp || { url, domain, riskLevel: 'LOW', score: 0, indicators: [], isCached: false, analyzedAt: Date.now() });
          }
        });
      });

      setState(s => ({ ...s, urlResult: result, loading: false }));
      
    } catch (err: any) {
      setState(s => ({ ...s, error: err.message || 'Error occurred', loading: false }));
    }
  };

  useEffect(() => {
    analyze();
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
       if (!chrome.runtime.lastError && settings) {
           setState(s => ({...s, settings}));
       }
    });
  }, []);

  return (
    <div className="card">
      <div className="header">
        <span className="shield-icon">🛡️</span> Web Security Shield
      </div>
      
      <div className="url-display" title={state.currentURL}>
        {state.currentDomain || 'Loading...'}
      </div>

      {state.loading ? (
        <div className="spinner"></div>
      ) : state.error ? (
        <div className="text-high">{state.error}</div>
      ) : (
        <>
          <div className="score-container">
            <span className={`badge ${getRiskColor(state.urlResult?.riskLevel)}`}>
              {getRiskEmoji(state.urlResult?.riskLevel)} {getRiskLabel(state.urlResult?.riskLevel)}
            </span>
            <div className="score-bar-bg">
              <div 
                className="score-bar-fill" 
                style={{
                  width: `${state.urlResult?.score || 0}%`, 
                  backgroundColor: getRiskBarColor(state.urlResult?.riskLevel)
                }}
              ></div>
            </div>
            <span style={{fontWeight: 'bold'}}>{state.urlResult?.score || 0}/100</span>
          </div>

          <div className="card" style={{backgroundColor: '#0f172a', marginBottom: '16px'}}>
            <h3 style={{marginTop: 0, fontSize: '1rem'}}>Findings</h3>
            <ul className="indicator-list">
              {state.urlResult?.indicators.length === 0 ? (
                <li className="indicator-item"><span>✅</span> No threats detected</li>
              ) : (
                state.urlResult?.indicators.map((ind, i) => (
                  <li key={i} className="indicator-item">
                    <span>{ind.score > 50 ? '🚨' : ind.score > 20 ? '⚠️' : 'ℹ️'}</span>
                    {ind.message}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="actions">
            <button className="btn btn-secondary" onClick={() => analyze()}>Scan Again</button>
            <button className="btn btn-primary" onClick={() => chrome.runtime.openOptionsPage()}>Options</button>
          </div>
        </>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
export default Popup;
