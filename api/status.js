const RunwayML = require('@runwayml/sdk').default;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  if (!process.env.RUNWAYML_API_SECRET) {
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

    const client = new RunwayML();

    const task = await client.tasks.retrieve(taskId);

    const status = task.status;

    if (status === 'SUCCEEDED') {
      const videoUrl =
        task.output && Array.isArray(task.output)
          ? task.output[0]
          : null;

      return res.status(200).json({
        status: 'SUCCEEDED',
        videoUrl
      });
    }

    if (status === 'FAILED') {
      return res.status(200).json({
        status: 'FAILED',
        error:
          task.failure ||
          task.error ||
          'Runway could not generate the video.'
      });
    }

    return res.status(200).json({
      status: status || 'RUNNING'
    });

  } catch (error) {
    console.error('Runway status error:', error);

    return res.status(500).json({
      error: error?.message || 'Could not check video status.'
    });
  }
};
