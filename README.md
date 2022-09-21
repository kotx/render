# Render

Proxies readonly requests to [Cloudflare R2](https://developers.cloudflare.com/r2) via [Cloudflare Workers](https://workers.dev).

If you see a bug or something missing, please open an issue or pull request!

## Features
- Handles `HEAD`, `GET`, and `OPTIONS` requests
- Forwards caching headers (`etag`, `cache-control`, `expires`, `last-modified`)
- Forwards content headers (`content-type`, `content-encoding`, `content-language`, `content-disposition`)
- Caches served files using the [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- Ranged requests (`range`, `if-range`, returns `content-range`)
- Handles precondition headers (`if-modified-since`, `if-unmodified-since`, `if-match`, `if-none-match`)
- Can serve an appended path if the requested url ends with / - Defaults to `index.html` in 0.5.0
- Can serve custom 404 responses if a file is not found

## Setup

### Installing wrangler

```sh
npm i -g wrangler
wrangler login
```

### Configuration

Create your R2 bucket(s) if you haven't already (replace `bucket_name` and `preview_bucket_name` appropriately):
```sh
wrangler r2 bucket create bucket_name # required
wrangler r2 bucket create preview_bucket_name # optional
```
You can also do this from the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/r2/buckets/new).

Edit `wrangler.toml` to have the correct `bucket_name` and optionally, `preview_bucket_name`  (you can set it to `bucket_name`) if you're going to run this locally.
You can do this from a fork, if using the [GitHub Actions method](#method-2-github-actions).

You may edit `CACHE_CONTROL` to the default [`cache-control` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control) or remove it entirely to fall back to nothing. If you set `CACHE_CONTROL` to `"no-store"` then Cloudflare caching will not be used.

### Deploying

Note: Due to how custom domains for workers work, you MUST use a route to take advantage of caching. Cloudflare may fix this soon.
Also note that *.workers.dev domains do not cache responses. You MUST use a route to your own (sub)domain.

#### Method 1 (Local)
```sh
npm install
wrangler publish # or `npm run deploy`
```

#### Method 2 (GitHub Actions)
1. Fork this repository
2. Set the secrets [`CF_API_TOKEN`](https://dash.cloudflare.com/profile/api-tokens) (with `Worker Scripts: Edit` permissions) and `CF_ACCOUNT_ID` in the repo settings
3. Enable workflows in the Actions tab
4. Update `wrangler.toml` as needed (this will trigger the workflow)
5. (Optionally) set the worker route in the Cloudflare dashboard to use the Cache API

## Using as a package

You may use this worker's functionality as a package by installing and importing [`render2`](https://www.npmjs.com/package/render2):
```sh
npm install render2
```
Usage:
```js
import render from "render2";
render.fetch(req, env, ctx);
```

## Development

Install deps:
```sh
npm install
```

To launch the development server:
```sh
npm run dev
```
