# Cloudflare Worker (AI proxy)

1. Install Wrangler: `npm install -g wrangler`
2. In this folder, run `wrangler login`
3. Edit `wrangler.toml` and set `ALLOWED_ORIGIN` to your exact Pages origin:
   - `https://YOURNAME.github.io` for a project site
   - or `https://YOURNAME.github.io/YOUR-REPO` is **not** an Origin; Origin contains only scheme + host.
4. Add your provider key as a Worker secret (never commit it):
   `wrangler secret put OPENAI_API_KEY`
5. Deploy: `wrangler deploy`
6. Copy the deployed `https://...workers.dev` URL into the root `.env.local` as `VITE_AI_WORKER_URL`.
7. Rebuild and redeploy the frontend after changing `.env.local`.

The browser sends only the chat messages. The provider key stays in the Worker environment.
For production, add rate limiting and abuse monitoring (e.g. Cloudflare rate limiting/Turnstile) and set a spending limit with your AI provider.
