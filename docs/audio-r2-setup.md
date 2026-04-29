# Lang5K Audio Hosting Setup

Lang5K should host production audio in Cloudflare R2 and reference audio files from sentence IDs.

## Recommended Public URL

Use a custom public domain:

```text
https://audio.lang5k.com
```

Cloudflare's default `r2.dev` URL can work for testing, but the custom domain is better for product trust and future caching rules.

## Local Secrets

Do not commit secrets. Store them in a local `.env.audio.local` file or in the deployment provider's secret manager:

```env
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=lang5k-audio
R2_PUBLIC_BASE_URL=https://audio.lang5k.com
ELEVENLABS_API_KEY=
```

## Bucket Layout

Use stable sentence IDs when audio is generated:

```text
ru/ru_000001.mp3
ru/ru_000002.mp3
ru/ru_000003.mp3
```

The app can then map each sentence index to:

```text
${R2_PUBLIC_BASE_URL}/ru/ru_000001.mp3
```

## CORS

Allow browser playback from:

```text
https://www.lang5k.com
https://lang5k.com
https://www.lag5.com
https://lag5.com
```

If Vercel preview deployments are used, add the preview domain pattern in Cloudflare.

## Generation Order

1. Assign stable IDs to all Russian sentences.
2. Generate or record audio for one small batch first.
3. Upload that batch to R2.
4. Add an app audio loader with browser TTS fallback.
5. Generate the remaining files only after the first batch sounds correct.
