# Let’s Pick

A mobile-first, real-time approval-voting app for deciding what to do together.
Create a room with any URL path, share it or its QR code, add ideas, and vote.

**Live app:** [lets-pick-together.adamholter.chatgpt.site](https://lets-pick-together.adamholter.chatgpt.site)

## Features

- Any URL path becomes its own room
- Exact-URL sharing and QR codes
- Live room presence with conflict-free character avatars
- Optional profile-photo uploads
- Shared room types: thing, song, question, person, or place
- Mobile-first ballot UI
- Cloudflare D1 persistence and R2 image storage

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local URL printed by the development server. Use any path, such
as `/friday-night`, to create a room.

Useful commands:

```bash
npm run build
npm test
npm run db:generate
```

Local D1 and R2 bindings are simulated by the Cloudflare Vite plugin. Database
migrations live in `drizzle/`.

## Deployment

The app is built with Next.js, vinext, Cloudflare Workers, D1, and R2. The
included `.openai/hosting.json` uses logical bindings only; connect it to your
own Sites project before deploying.

## Privacy and security

The app uses anonymous browser-generated IDs for presence. Uploaded profile
pictures are limited to JPG, PNG, or WebP files under 2 MB. Do not commit
deployment credentials or environment files; `.env*` is ignored.

Please report vulnerabilities according to [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
