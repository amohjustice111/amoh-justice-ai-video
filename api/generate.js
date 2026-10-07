const RunwayML = require('@runwayml/sdk').default;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RUNWAYML_API_SECRET) {
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
    const promptImage = body.promptImage || null;

    if (!prompt) {
      return res.status(400).json({ error: 'Please enter a video prompt.' });
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
        error: 'For text-only video, choose Landscape or Portrait.'
      });
    }

    const client = new RunwayML();

    const input = {
      model: 'gen4.5',
      promptText: prompt,
      ratio,
      duration
    };

    // Only include promptImage when the user actually selected an image.
    if (promptImage) {
      input.promptImage = promptImage;
    }

    const task = await client.imageToVideo.create(input);

    if (!task || !task.id) {
      return res.status(502).json({
        error: 'Runway did not return a task ID.'
      });
    }

    return res.status(200).json({
      taskId: task.id,
      status: 'PENDING'
    });

  } catch (error) {
    console.error('Runway generation error:', error);

    return res.status(500).json({
      error: error?.message || 'Video generation failed.'
    });
  }
};
