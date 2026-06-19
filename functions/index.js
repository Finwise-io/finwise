// F-1 (QA-2026-06-18): server-side AI proxy.
// The client (src/services/economicData.ts → analyzeExpenses) POSTs {expenses, monthlyIncome,
// inflationRate} here. THIS function holds the Anthropic key (never the app), builds the prompt,
// calls the model, and returns a parsed ExpenseAnalysis. The key lives in a Firebase secret, so it
// is never bundled into the mobile binary.
//
// Deploy:
//   firebase functions:secrets:set ANTHROPIC_API_KEY     # paste your sk-ant-… key
//   firebase deploy --only functions
// Then set AI_PROXY_URL (the deployed URL) in your app build env.
const { onRequest } = require('firebase-functions/v2/https');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

function buildPrompt(expenses, monthlyIncome, inflationRate) {
  const lines = (expenses || [])
    .map((e) => `- ${e.category}: $${Number(e.amount).toFixed(2)} at ${e.store || 'various'}`)
    .join('\n');
  return `You are a friendly personal finance advisor. Analyze these monthly expenses and give specific, actionable advice.

Monthly income: $${Number(monthlyIncome).toFixed(2)}
Inflation rate: ${inflationRate}%

Expenses this month:
${lines}

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "summary": "2-sentence plain English summary of spending health",
  "tips": [
    { "title": "Short tip title (5 words max)", "detail": "Specific actionable advice in 1-2 sentences.", "savingsMin": 15, "savingsMax": 30 }
  ],
  "totalSavingsMin": 50,
  "totalSavingsMax": 120
}
Provide 3-5 tips. Keep language simple enough for a 10-year-old.`;
}

exports.aiTips = onRequest(
  { secrets: ['ANTHROPIC_API_KEY'], cors: true, region: 'us-central1' },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Proxy missing ANTHROPIC_API_KEY secret' });

    const { expenses, monthlyIncome, inflationRate } = req.body || {};
    if (!Array.isArray(expenses)) return res.status(400).json({ error: 'expenses[] required' });

    try {
      const upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          messages: [{ role: 'user', content: buildPrompt(expenses, monthlyIncome, inflationRate) }],
        }),
      });
      if (!upstream.ok) return res.status(502).json({ error: 'upstream error' });

      const data = await upstream.json();
      const text = data?.content?.[0]?.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
      } catch {
        return res.status(502).json({ error: 'model returned non-JSON' });
      }
      return res.status(200).json(parsed);
    } catch (e) {
      return res.status(502).json({ error: 'proxy failure' });
    }
  }
);
