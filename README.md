# Render

Proxies readonly requests to R2 via Cloudflare Workers.

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
wrangler publish
```