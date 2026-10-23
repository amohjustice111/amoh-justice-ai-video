module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'KIE is not connected. Add KIE_API_KEY in Vercel and redeploy.' });
  }

  const taskId = String((req.query && req.query.taskId) || '').trim();
  if (!taskId || taskId.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
    return res.status(400).json({ error: 'A valid taskId query parameter is required.' });
  }

  try {
    const response = await fetch(
      'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + encodeURIComponent(taskId),
      { method: 'GET', headers: { Authorization: 'Bearer ' + apiKey, Accept: 'application/json' } }
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.code !== 200 || !data.data) {
      console.error('KIE task status error:', JSON.stringify(data));
      return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
        error: data.msg || data.message || 'Could not retrieve KIE task status.'
      });
    }

    const task = data.data;
    let result = {};
    if (typeof task.resultJson === 'string') {
      try { result = JSON.parse(task.resultJson); } catch (_) { result = {}; }
    } else if (task.resultJson && typeof task.resultJson === 'object') {
      result = task.resultJson;
    }

    const urls = Array.isArray(result.resultUrls) ? result.resultUrls : [];
    return res.status(200).json({
      taskId: task.taskId,
      status: task.state,
      progress: typeof task.progress === 'number' ? task.progress : undefined,
      videoUrl: task.state === 'success' ? (urls[0] || null) : null,
      error: task.state === 'fail' ? (task.failMsg || 'Video generation failed.') : undefined
    });
  } catch (error) {
    console.error('KIE task status API error:', error);
    return res.status(500).json({ error: 'Could not check video status. Please try again.' });
  }
};
