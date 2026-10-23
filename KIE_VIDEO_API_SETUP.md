# KIE Video API setup for AMOH JUSTICE AI Video

This adds a second, separate video-generation provider. The existing Runway endpoint at `/api/generate` is not changed.

## Files and endpoints

- `POST /api/kie-generate` creates a text-to-video task using KIE's Wan 2.5 text-to-video model.
- `GET /api/kie-status?taskId=YOUR_TASK_ID` checks progress and returns `videoUrl` when the task succeeds.
- Existing `/api/generate` remains the original Runway endpoint.

## 1. Create a KIE API key

Open https://kie.ai/api-key and create a key. KIE generation uses credits and may cost money; check current pricing at https://kie.ai/pricing. A successful task submission does not mean the video is already finished.

## 2. Add the key to Vercel

1. Open https://vercel.com/dashboard.
2. Select the `amoh-justice-ai-video` project.
3. Open **Settings → Environment Variables**.
4. Add `KIE_API_KEY` as the name and paste your secret KIE key as the value.
5. Apply it to the environments you use (at least Production).
6. Save, then redeploy the latest deployment.

Do not put the key in frontend JavaScript, HTML, or a public repository file.

## 3. Create a video task

Send a POST request to `/api/kie-generate` with JSON:

```json
{
  "prompt": "A cinematic aerial view of Accra at sunset, smooth camera movement, realistic lighting",
  "duration": "5",
  "ratio": "16:9",
  "resolution": "720p"
}
```

Allowed values: duration `5` or `10`; ratio `16:9` or `9:16`; resolution `720p` or `1080p`. Ten-second videos must use 720p. Prompts are limited to 1200 characters.

A successful response includes a `taskId`. Generation is asynchronous, so it does not return the finished video immediately.

## 4. Check the task

Call `GET /api/kie-status?taskId=THE_TASK_ID` using the task ID returned above. Repeat after a short wait until status is `success` or `fail`. On success, the response includes `videoUrl`.

## Important

- The endpoint is added to the repository, but it will not work until the KIE key is configured in Vercel and a deployment containing these files is live.
- The app's existing frontend has not been changed to use this new endpoint automatically. The current UI must call `/api/kie-generate` and then poll `/api/kie-status` to use KIE.
- KIE says generated media is retained for 14 days, so download successful videos you want to keep.
