const RunwayML = require('@runwayml/sdk').default;
const { TaskFailedError, TaskTimedOutError } = require('@runwayml/sdk');

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RUNWAYML_API_SECRET) {
    return res.status(503).json({
      error: 'Runway is not connected. Add RUNWAYML_API_SECRET in Vercel Environment Variables and redeploy.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    const duration = Number(body.duration);
    const ratio = String(body.ratio || '1280:720');
    const promptImage = body.promptImage || null;

    if (!prompt) return res.status(400).json({ error: 'Please enter a video prompt.' });
    if (![6, 10].includes(duration)) return res.status(400).json({ error: 'Duration must be 6 or 10 seconds.' });

    const allowedRatios = ['1280:720', '720:1280', '960:960'];
    if (!allowedRatios.includes(ratio)) return res.status(400).json({ error: 'Unsupported aspect ratio.' });
    if (!promptImage && ratio === '960:960') {
      return res.status(400).json({ error: 'Square text-to-video is not supported by the selected Runway model. Choose Landscape or Portrait, or add an image.' });
    }

    const client = new RunwayML();
    const input = {
      model: 'gen4.5',
      promptText: prompt,
      ratio,
      duration,
    };
    if (promptImage) input.promptImage = promptImage;

    const task = await client.imageToVideo.create(input).waitForTaskOutput({ timeout: 9 * 60 * 1000 });
    const videoUrl = task && Array.isArray(task.output) ? task.output[0] : null;

    if (!videoUrl) {
      return res.status(502).json({ error: 'Runway completed the task but did not return a video URL.' });
    }

    return res.status(200).json({ videoUrl, message: 'Video generated successfully.' });
  } catch (error) {
    console.error('Runway generation error:', error);
   if (error?.taskDetails?.failure || error?.taskDetails?.error) {
  return res.status(502).json({
    error:
      error.taskDetails.failure ||
      error.taskDetails.error ||
      'Runway could not generate the video.',
  });
}

if (error?.name === 'TaskTimedOutError' || error?.name === 'TimeoutError') {
  return res.status(504).json({
    error: 'The video generation took too long. Please try again.',
  });
}

return res.status(500).json({
  error: error?.message || 'Video generation failed.',
});
