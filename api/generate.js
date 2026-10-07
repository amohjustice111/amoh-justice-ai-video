module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  const apiKey = process.env.RUNWAYML_API_SECRET;

  if (!apiKey) {
    return res.status(503).json({
      error:
        'Runway is not connected. Add RUNWAYML_API_SECRET in Vercel and redeploy.'
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

    if (![6, 10].includes(duration)) {
      return res.status(400).json({
        error: 'Duration must be 6 or 10 seconds.'
      });
    }

    if (!['1280:720', '720:1280'].includes(ratio)) {
      return res.status(400).json({
        error:
          'Please choose Landscape or Portrait for text-to-video.'
      });
    }

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

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        'RUNWAY ERROR:',
        JSON.stringify(data)
      );

      let message = 'Runway rejected the request.';

      if (
        data &&
        Array.isArray(data.issues) &&
        data.issues.length
      ) {
        message = data.issues
          .map(issue =>
            issue.message ||
            issue.detail ||
            JSON.stringify(issue)
          )
          .join(' ');
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
        error:
          'Runway accepted the request but did not return a task ID.'
      });
    }

    return res.status(200).json({
      taskId: data.id,
      status: data.status || 'PENDING'
    });

  } catch (error) {
    console.error(
      'Generate API error:',
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        'Video generation failed.'
    });
  }
};
