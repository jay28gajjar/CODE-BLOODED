import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../types/security';

const Options = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [newBrand, setNewBrand] = useState('');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (!chrome.runtime.lastError && res) {
        setSettings(res);
      } else {
        // Fallback to default if not configured yet
        setSettings({
            enableURLProtection: true, enableHoverAnalysis: false, enableClickWarnings: true,
            enableWebpageAnalysis: true, enableEmailAnalysis: false, enableSearchAnalysis: false,
            showPageBadge: true, enableLocalAnalysis: true, enableAIAnalysis: false,
            storeScanHistory: true, googleSafeBrowsingApiKey: '', virusTotalApiKey: '',
            aiProviderApiKey: '', aiProvider: 'none',
            sensitivityLevel: 'medium', protectedBrands: ['google', 'microsoft', 'apple', 'amazon', 'paypal'],
            riskThresholds: { suspicious: 50, high: 75 }
        } as ExtensionSettings);
      }
    });
  }, []);

  const saveSettings = (newSettings: ExtensionSettings) => {
    setSettings(newSettings);
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: newSettings }, () => {
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    });
  };

  const handleChange = (key: keyof ExtensionSettings, value: any) => {
    if (settings) {
      saveSettings({ ...settings, [key]: value });
    }
  };

  const handleAddBrand = () => {
    if (newBrand.trim() && settings && !settings.protectedBrands.includes(newBrand.trim().toLowerCase())) {
      saveSettings({
        ...settings,
        protectedBrands: [...settings.protectedBrands, newBrand.trim().toLowerCase()]
      });
      setNewBrand('');
    }
  };

  const handleRemoveBrand = (brand: string) => {
    if (settings) {
      saveSettings({
        ...settings,
        protectedBrands: settings.protectedBrands.filter(b => b !== brand)
      });
    }
  };

  if (!settings) return <div>Loading settings...</div>;

  return (
    <div>
      <div className="header">
        <h1>🛡️ Shield Settings</h1>
      </div>

      <div className="section-card">
        <h2>Protection</h2>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-title">Enable URL Protection</div>
            <div className="setting-desc">Analyze URLs before navigation</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.enableURLProtection} onChange={e => handleChange('enableURLProtection', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-title">Webpage Analysis</div>
            <div className="setting-desc">Scan page contents for threats</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.enableWebpageAnalysis} onChange={e => handleChange('enableWebpageAnalysis', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-title">Show Page Badge</div>
            <div className="setting-desc">Display floating security indicator</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.showPageBadge} onChange={e => handleChange('showPageBadge', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <h2>Privacy</h2>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-title">Local Analysis</div>
            <div className="setting-desc">Run basic heuristic checks offline</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.enableLocalAnalysis} disabled />
            <span className="slider"></span>
          </label>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-title">External AI Analysis</div>
            <div className="setting-desc">Use AI provider to deeply analyze suspicious pages</div>
            {settings.enableAIAnalysis && (
              <div className="warning-box">Enabling this may transmit webpage content to your configured AI provider</div>
            )}
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.enableAIAnalysis} onChange={e => handleChange('enableAIAnalysis', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-title">Store Scan History</div>
            <div className="setting-desc">Keep a local log of analyzed URLs</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={settings.storeScanHistory} onChange={e => handleChange('storeScanHistory', e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <h2>Threat Intelligence Integrations</h2>
        <div className="setting-info">
          <div className="setting-title">Google Safe Browsing API Key</div>
          <input type="password" value={settings.googleSafeBrowsingApiKey} onChange={e => handleChange('googleSafeBrowsingApiKey', e.target.value)} placeholder="API Key" />
        </div>
        <div className="setting-info" style={{marginTop: '16px'}}>
          <div className="setting-title">VirusTotal API Key</div>
          <input type="password" value={settings.virusTotalApiKey} onChange={e => handleChange('virusTotalApiKey', e.target.value)} placeholder="API Key" />
        </div>
      </div>

      <div className="section-card">
        <h2>AI Provider</h2>
        <div className="radio-group">
          {['none', 'openai', 'gemini', 'anthropic'].map(provider => (
            <label key={provider} className="radio-label">
              <input type="radio" name="aiProvider" checked={settings.aiProvider === provider} onChange={() => handleChange('aiProvider', provider as any)} />
              {provider.toUpperCase()}
            </label>
          ))}
        </div>
        {settings.aiProvider !== 'none' && (
          <div style={{marginTop: '12px'}}>
            <input type="password" value={settings.aiProviderApiKey} onChange={e => handleChange('aiProviderApiKey', e.target.value)} placeholder={`${settings.aiProvider.toUpperCase()} API Key`} />
          </div>
        )}
      </div>

      <div className="section-card">
        <h2>Sensitivity</h2>
        <div className="radio-group">
          {['low', 'medium', 'high'].map(level => (
            <label key={level} className="radio-label">
              <input type="radio" name="sensitivity" checked={settings.sensitivityLevel === level} onChange={() => handleChange('sensitivityLevel', level as any)} />
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div className="section-card">
        <h2>Protected Brands</h2>
        <div className="setting-desc">Alert if a site tries to impersonate these brands</div>
        <div className="tag-list">
          {settings.protectedBrands.map(brand => (
            <span key={brand} className="tag">
              {brand} <span className="tag-remove" onClick={() => handleRemoveBrand(brand)}>×</span>
            </span>
          ))}
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
          <input type="text" value={newBrand} onChange={e => setNewBrand(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddBrand()} placeholder="Add brand..." />
          <button className="btn btn-secondary" onClick={handleAddBrand}>Add</button>
        </div>
      </div>

      <div className="section-card">
        <h2>Data Management</h2>
        <div style={{display: 'flex', gap: '8px'}}>
          <button className="btn btn-danger" onClick={() => { if(confirm('Clear URL cache?')) console.log('cleared'); }}>Clear URL Cache</button>
          <button className="btn btn-danger" onClick={() => { if(confirm('Clear history?')) console.log('cleared'); }}>Clear Scan History</button>
        </div>
      </div>

      <div className="save-container">
        <span className="success-msg">{saveStatus}</span>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Options />);
export default Options;
