module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const apiKey = process.env.RUNWAYML_API_SECRET;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Runway is not connected. Add RUNWAYML_API_SECRET in Vercel.'
    });
  }

  try {
    const taskId = String(req.query.taskId || '').trim();

    if (!taskId) {
      return res.status(400).json({
        error: 'Missing task ID.'
      });
    }

    const runwayResponse = await fetch(
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

    const raw = await runwayResponse.text();

    let task;

    try {
      task = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: 'Runway returned an invalid status response.'
      });
    }

    if (!runwayResponse.ok) {
      console.error('Runway status error:', task);

      return res.status(runwayResponse.status).json({
        error:
          task?.error?.message ||
          task?.message ||
          task?.error ||
          'Could not check the Runway task.'
      });
    }

    if (task.status === 'SUCCEEDED') {
      const videoUrl =
        Array.isArray(task.output) && task.output.length
          ? task.output[0]
          : null;

      if (!videoUrl) {
        return res.status(502).json({
          error: 'Runway finished but did not return a video URL.'
        });
      }

      return res.status(200).json({
        status: 'SUCCEEDED',
        videoUrl
      });
    }

    if (task.status === 'FAILED') {
      return res.status(200).json({
        status: 'FAILED',
        error:
          task.failure ||
          task.error ||
          'Runway could not generate the video.'
      });
    }

    if (task.status === 'CANCELED') {
      return res.status(200).json({
        status: 'FAILED',
        error: 'The Runway video task was canceled.'
      });
    }

    return res.status(200).json({
      status: task.status || 'PENDING'
    });

  } catch (error) {
    console.error('Status error:', error);

    return res.status(500).json({
      error: error?.message || 'Could not check video status.'
    });
  }
};
