import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreatIndicator } from '../types/security';

const Warning = () => {
  const [url, setUrl] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState('HIGH');
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url') || '';
    
    // validate HTTP(S) URL
    try {
        const parsed = new URL(targetUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Invalid protocol');
        }
        setUrl(targetUrl);
    } catch {
        setUrl('');
    }

    setScore(Number(params.get('score')) || 100);
    setLevel(params.get('level') || 'HIGH');
    try {
      const inds = params.get('indicators');
      if (inds) {
        setIndicators(JSON.parse(decodeURIComponent(inds)));
      }
    } catch (e) {
      console.error('Failed to parse indicators');
    }

    const timer = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  const handleContinue = () => {
    if (countdown === 0 && url) {
      window.location.href = url;
    }
  };

  if (!url) {
      return (
          <div className="card">
              <h1>Invalid URL</h1>
              <button className="btn btn-primary" onClick={handleGoBack}>Go Back</button>
          </div>
      );
  }

  return (
    <div className="card">
      <div className="icon">⚠️</div>
      <h1>High-Risk Website Detected</h1>
      
      <p>This page has been blocked because it poses a security threat.</p>
      
      <div className="url-box">
        {url.length > 80 ? url.substring(0, 80) + '...' : url}
      </div>

      <div className="score">Risk Score: {score}/100</div>

      {indicators.length > 0 && (
        <ul className="indicator-list">
          {indicators.map((ind, i) => (
            <li key={i}>{ind.message}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={handleGoBack}>
          Go Back (Safe)
        </button>
        <button 
          className="btn btn-danger" 
          onClick={handleContinue}
          disabled={countdown > 0}
        >
          {countdown > 0 ? `Continue Anyway (${countdown})` : 'Continue Anyway'}
        </button>
      </div>
      
      <div className="footer">
        Web Security Shield - Protecting your browsing
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Warning />);
export default Warning;
