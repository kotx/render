# Render

Proxies readonly requests to [Cloudflare R2](https://developers.cloudflare.com/r2) via [Cloudflare Workers](https://workers.dev).

## Features
- Handles `HEAD`, `GET`, and `OPTIONS` requests
- Forwards caching headers (`etag`, `cache-control`, `expires`, `last-modified`)
- Forwards content headers (`content-type`, `content-encoding`, `content-language`, `content-disposition`)
- Caches served files using the [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)

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

### Deploying

Note: Due to how custom domains for workers work, you MUST use a route to take advantage of caching. Cloudflare may fix this soon.
Also note that *.workers.dev domains do not cache responses. You MUST use a route to your own (sub)domain.

#### Method 1 (Local)
```sh
wrangler publish # or `npm deploy`
```

#### Method 2 (GitHub Actions)
1. Fork this repository
2. Create and set the R2 bucket names in `wrangler.toml`
3. Set the secrets [`CF_API_TOKEN`](https://dash.cloudflare.com/profile/api-tokens) and `CF_ACCOUNT_ID` in settings
4. Enable workflows in the Actions tab
5. Profit

## Development

Install deps:
```sh
npm install
```

To launch the development server:
```sh
npm dev
```
