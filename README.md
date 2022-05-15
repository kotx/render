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

Edit `wrangler.toml` to have the correct `bucket_name` and optionally, `preview_bucket_name`  (you can set it to `bucket_name`) if you're going to run this locally.

### Deploying

```sh
wrangler publish # or `npm deploy`
```

## Development

Install deps:
```sh
npm install
```

To launch the development server:
```sh
npm dev
```