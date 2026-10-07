module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RUNWAYML_API_SECRET;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Runway is not connected. Add RUNWAYML_API_SECRET in Vercel.'
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
    const promptImage =
      typeof body.promptImage === 'string' && body.promptImage.trim()
        ? body.promptImage
        : null;

    if (!prompt) {
      return res.status(400).json({
        error: 'Please enter a video prompt.'
      });
    }

    if (![6, 10].includes(duration)) {
      return res.status(400).json({
        error: 'Duration must be 6 or 10 seconds.'
      });
    }

    if (!['1280:720', '720:1280', '960:960'].includes(ratio)) {
      return res.status(400).json({
        error: 'Unsupported aspect ratio.'
      });
    }

    if (!promptImage && ratio === '960:960') {
      return res.status(400).json({
        error:
          'Square video requires an image. Choose Landscape or Portrait for text-only video.'
      });
    }

    const runwayBody = {
      model: 'gen4.5',
      promptText: prompt,
      ratio,
      duration
    };

    if (promptImage) {
      runwayBody.promptImage = promptImage;
    }

    const runwayResponse = await fetch(
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

    const raw = await runwayResponse.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error:
          'Runway returned an unexpected response: ' +
          raw.slice(0, 300)
      });
    }

    if (!runwayResponse.ok) {
      console.error('Runway API error:', data);

      const message =
        data?.error?.message ||
        data?.message ||
        data?.error ||
        'Runway rejected the video request.';

      return res.status(runwayResponse.status).json({
        error: String(message)
      });
    }

    if (!data.id) {
      return res.status(502).json({
        error: 'Runway did not return a task ID.'
      });
    }

    return res.status(200).json({
      taskId: data.id,
      status: 'PENDING'
    });

  } catch (error) {
    console.error('Generate error:', error);

    return res.status(500).json({
      error: error?.message || 'Video generation failed.'
    });
  }
};
