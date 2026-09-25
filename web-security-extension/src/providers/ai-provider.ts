import { AIAnalysisResult, ExtensionSettings, ThreatIndicator, RiskLevel } from '../types/security';

export interface AIAnalysisInput {
  url: string;
  domain: string;
  pageText?: string;
  emailContent?: string;
  existingIndicators: ThreatIndicator[];
}

const TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI Request timeout')), TIMEOUT_MS))
  ]);
}

function buildPrompt(input: AIAnalysisInput): string {
  return `Analyze this web context for phishing or security threats.
URL: ${input.url}
Domain: ${input.domain}
Existing Indicators: ${JSON.stringify(input.existingIndicators)}

Respond strictly in JSON format with exactly this structure:
{
  "riskLevel": "LOW" | "UNKNOWN" | "SUSPICIOUS" | "HIGH",
  "confidence": <number 0-100>,
  "reasons": ["<reason 1>", "<reason 2>"]
}`;
}

function parseResponse(text: string): AIAnalysisResult | null {
  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);
    if (['LOW', 'UNKNOWN', 'SUSPICIOUS', 'HIGH'].includes(result.riskLevel) && typeof result.confidence === 'number' && Array.isArray(result.reasons)) {
      return result as AIAnalysisResult;
    }
  } catch (e) {
    console.error('Failed to parse AI response', e);
  }
  return null;
}

export async function analyzeWithAI(
  input: AIAnalysisInput,
  settings: ExtensionSettings
): Promise<AIAnalysisResult | null> {
  if (!settings.enableAIAnalysis || settings.aiProvider === 'none' || !settings.aiProviderApiKey) {
    return null;
  }

  const prompt = buildPrompt(input);

  try {
    if (settings.aiProvider === 'openai') {
      return await withTimeout(callOpenAI(prompt, settings.aiProviderApiKey));
    } else if (settings.aiProvider === 'gemini') {
      return await withTimeout(callGemini(prompt, settings.aiProviderApiKey));
    } else if (settings.aiProvider === 'anthropic') {
      return await withTimeout(callAnthropic(prompt, settings.aiProviderApiKey));
    }
  } catch (e) {
    console.error(`AI Provider ${settings.aiProvider} failed:`, e);
  }

  return null;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<AIAnalysisResult | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  });
  if (!response.ok) return null;
  const data = await response.json();
  return parseResponse(data.choices[0]?.message?.content || '');
}

async function callGemini(prompt: string, apiKey: string): Promise<AIAnalysisResult | null> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  if (!response.ok) return null;
  const data = await response.json();
  return parseResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

async function callAnthropic(prompt: string, apiKey: string): Promise<AIAnalysisResult | null> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true' // often required in browser extensions
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) return null;
  const data = await response.json();
  return parseResponse(data.content?.[0]?.text || '');
}
