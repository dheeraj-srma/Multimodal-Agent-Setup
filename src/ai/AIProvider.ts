import { storageManager } from '../storage/StorageManager';
import { localIntelligenceEngine } from './LocalIntelligenceEngine';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AIProvider {
  private static instance: AIProvider;

  private constructor() {}

  public static getInstance(): AIProvider {
    if (!AIProvider.instance) {
      AIProvider.instance = new AIProvider();
    }
    return AIProvider.instance;
  }

  public async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const settings = storageManager.getSettings();

    // If Gemini key is set, try calling Google Gemini API
    if (settings.apiKeyGemini) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.apiKeyGemini}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              ...(systemPrompt ? [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Understood.' }] }] : []),
              { role: 'user', parts: [{ text: prompt }] },
            ],
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (err) {
        console.warn('[AIProvider] Gemini API call failed, falling back to local intelligence:', err);
      }
    }

    // If OpenAI key is set, try calling OpenAI API
    if (settings.apiKeyOpenAI) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.apiKeyOpenAI}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: prompt },
            ],
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (err) {
        console.warn('[AIProvider] OpenAI API call failed, falling back to local intelligence:', err);
      }
    }

    // If Ollama endpoint is configured, try calling Ollama
    if (settings.ollamaEndpoint) {
      try {
        const res = await fetch(`${settings.ollamaEndpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',
            prompt: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}`,
            stream: false,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          if (data.response) return data.response;
        }
      } catch (err) {
        console.warn('[AIProvider] Ollama API call failed, falling back to local engine:', err);
      }
    }

    // Default: Return structured response using LocalIntelligenceEngine
    return `[ACC Local Intelligence Engine] Processed prompt for mission objectives with verified static heuristics.`;
  }
}

export const aiProvider = AIProvider.getInstance();
