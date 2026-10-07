module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RUNWAYML_API_SECRET;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Runway is not connected in Vercel.'
    });
  }

  try {
    const taskId = String(req.query.taskId || '').trim();

    if (!taskId) {
      return res.status(400).json({
        error: 'Missing task ID.'
      });
    }

    const response = await fetch(
      'https://api.dev.runwayml.com/v1/tasks/' +
        encodeURIComponent(taskId),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          data?.message ||
          'Could not check Runway task.'
      });
    }

    if (data.status === 'SUCCEEDED') {
      const videoUrl =
        Array.isArray(data.output)
          ? data.output[0]
          : null;

      return res.status(200).json({
        status: 'SUCCEEDED',
        videoUrl
      });
    }

    if (data.status === 'FAILED') {
      return res.status(200).json({
        status: 'FAILED',
        error:
          data.failure ||
          data.error ||
          'Runway could not generate the video.'
      });
    }

    return res.status(200).json({
      status: data.status || 'RUNNING'
    });

  } catch (error) {
    console.error('Status API error:', error);

    return res.status(500).json({
      error:
        error?.message ||
        'Could not check video status.'
    });
  }
};
