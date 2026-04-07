export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        system: 'You are a JSON-only competitive intelligence API. You must respond with valid JSON and absolutely nothing else. Never include explanatory text, preambles, apologies, disclaimers, or markdown formatting of any kind. Your entire response must be a single valid JSON object starting with { and ending with }. If you cannot find sufficient data, still return the JSON schema with whatever data you can find.',
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 5
          }
        ],
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `API error: ${errorText}` });
    }

    const data = await response.json();

    // Extract text from all content blocks
    const text = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return res.status(200).json({ text });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: err.message });
  }
}
