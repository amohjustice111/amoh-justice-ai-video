module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RUNWAYML_API_SECRET;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Runway API key is missing in Vercel.'
    });
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};

    const prompt = String(body.prompt || '').trim();
    const duration = Number(body.duration);
    const ratio = String(body.ratio || '1280:720');

    if (!prompt) {
      return res.status(400).json({
        error: 'Please enter a video prompt.'
      });
    }

    if (duration !== 6 && duration !== 10) {
      return res.status(400).json({
        error: 'Duration must be 6 or 10 seconds.'
      });
    }

    const isLandscape = ratio === '1280:720';
    const isPortrait = ratio === '720:1280';

    if (!isLandscape && !isPortrait) {
      return res.status(400).json({
        error: 'For text-to-video, choose Landscape or Portrait.'
      });
    }

    /*
     * IMPORTANT:
     * Start with TEXT-TO-VIDEO only.
     * We are deliberately not sending promptImage yet.
     * This removes the image validation problem completely.
     */
    const runwayBody = {
      model: 'gen4.5',
      promptText: prompt,
      ratio: ratio,
      duration: duration
    };

    const response = await fetch(
      'https://api.dev.runwayml.com/v1/image_to_video',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06'
        },
        body: JSON.stringify(runwayBody)
      }
    );

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: 'Runway returned an invalid response.'
      });
    }

    if (!response.ok) {
      console.error('RUNWAY ERROR:', JSON.stringify(data));

      let message = 'Runway rejected the request.';

      if (data?.issues && Array.isArray(data.issues)) {
        message = data.issues
          .map(issue => {
            const path = Array.isArray(issue.path)
              ? issue.path.join('.')
              : '';

            return path
              ? `${path}: ${issue.message || issue.code || 'Invalid value'}`
              : issue.message || issue.code || 'Invalid value';
          })
          .join(' | ');
      } else if (data?.error?.message) {
        message = data.error.message;
      } else if (data?.message) {
        message = data.message;
      }

      return res.status(response.status).json({
        error: message
      });
    }

    if (!data?.id) {
      return res.status(502).json({
        error: 'Runway did not return a task ID.'
      });
    }

    return res.status(200).json({
      taskId: data.id,
      status: data.status || 'PENDING'
    });

  } catch (error) {
    console.error('SERVER ERROR:', error);

    return res.status(500).json({
      error: error?.message || 'Video generation failed.'
    });
  }
};
