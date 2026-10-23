module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'KIE is not connected. Add KIE_API_KEY in Vercel Environment Variables, then redeploy.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    const duration = String(body.duration || '5');
    const ratio = String(body.ratio || '16:9');
    const resolution = String(body.resolution || '720p');

    if (!prompt) {
      return res.status(400).json({ error: 'Please enter a video prompt.' });
    }
    if (prompt.length > 1200) {
      return res.status(400).json({ error: 'Prompt must be 1200 characters or fewer.' });
    }
    if (!['5', '10'].includes(duration)) {
      return res.status(400).json({ error: 'Duration must be 5 or 10 seconds.' });
    }
    if (!['16:9', '9:16'].includes(ratio)) {
      return res.status(400).json({ error: 'Ratio must be 16:9 (landscape) or 9:16 (portrait).' });
    }
    if (!['720p', '1080p'].includes(resolution)) {
      return res.status(400).json({ error: 'Resolution must be 720p or 1080p.' });
    }
    if (duration === '10' && resolution === '1080p') {
      return res.status(400).json({ error: 'Choose 720p for a 10-second video, or choose 5 seconds for 1080p.' });
    }

    const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        model: 'wan/2-5-text-to-video',
        input: {
          prompt,
          duration,
          aspect_ratio: ratio,
          resolution,
          enable_prompt_expansion: true
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.code !== 200 || !data.data || !data.data.taskId) {
      console.error('KIE video generation error:', JSON.stringify(data));
      const status = response.status >= 400 && response.status < 600 ? response.status : 502;
      return res.status(status).json({
        error: data.msg || data.message || 'KIE could not create the video task. Check your KIE key, credits, and model access.'
      });
    }

    return res.status(200).json({
      provider: 'kie',
      taskId: data.data.taskId,
      status: 'submitted',
      message: 'Video task submitted. Check task status using KIE task logs or the KIE task-details API.'
    });
  } catch (error) {
    console.error('KIE video API error:', error);
    return res.status(500).json({ error: 'Video request failed. Please try again.' });
  }
};
