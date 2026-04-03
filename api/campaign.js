export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'INSTANTLY_API_KEY not configured.' });

  const { name, subject, emails, senderEmail } = req.body;
  if (!name || !emails || !emails.length) {
    return res.status(400).json({ error: 'Missing required fields: name, emails' });
  }

  try {
    const subjects = emails.map((e, i) => {
      const subjectLine = e.match(/^Subject: (.+)/m);
      return subjectLine ? subjectLine[1] : (i === 0 ? subject : '');
    });

    const bodies = emails.map(e => {
      return e.replace(/^Subject: .+\n\n/, '').replace(/\n/g, '<br>');
    });

    const delays = [0, 3, 7, 12, 18];

    const createRes = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name,
        campaign_schedule: {
          schedules: [{
            name: 'Default',
            timing: { from: '09:00', to: '17:00' },
            days: { sunday: false, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false },
            timezone: 'America/Chicago'
          }]
        },
        sequences: [{
          steps: emails.map((e, i) => ({
            type: 'email',
            delay: delays[i] || i * 3,
            variants: [{
              subject: subjects[i] || (i === 0 ? subject : ''),
              body: bodies[i]
            }]
          }))
        }],
        email_list: senderEmail ? [senderEmail] : [],
        stop_on_reply: true,
        stop_on_auto_reply: true,
        track_opens: false,
        track_clicks: false,
        daily_limit: 30
      })
    });

    const campaign = await createRes.json();
    if (!createRes.ok) return res.status(createRes.status).json({ error: campaign.message || JSON.stringify(campaign) });

    return res.status(200).json({
      success: true,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      url: `https://app.instantly.ai/app/campaigns/${campaign.id}`
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
