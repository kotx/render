interface Env {
  R2_BUCKET: R2Bucket
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const allowedMethods = ["GET", "HEAD", "OPTIONS"];
    if (allowedMethods.indexOf(request.method) === -1) return new Response("Method Not Allowed", { status: 405 });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "allow": allowedMethods.join(", ") } })
    }

    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response("OK");
    }

    const cache = caches.default;
    let response = await cache.match(request);

    if (!response || !response.ok) {
      const path = url.pathname.substring(1);

      const file = request.method === "HEAD" ? await env.R2_BUCKET.head(path) : await env.R2_BUCKET.get(path);
      if (file === null) {
        return new Response("File Not Found", { status: 404 });
      }

      function hasBody(object: R2Object | R2ObjectBody): object is R2ObjectBody {
        return (file?.size || 0) !== 0 && (<R2ObjectBody>object).body !== undefined;
      }

      const shouldSendBody = hasBody(file);

      response = new Response(shouldSendBody ? file.body : null, {
        status: shouldSendBody ? 200 : 204,
        headers: {
          "etag": file.httpEtag,
          "cache-control": file.httpMetadata.cacheControl ?? "",
          "expires": file.httpMetadata.cacheExpiry?.toUTCString() ?? "",
          "last-modified": file.uploaded.toUTCString(),

          "content-encoding": file.httpMetadata?.contentEncoding ?? "",
          "content-type": file.httpMetadata?.contentType ?? "application/octet-stream",
          "content-language": file.httpMetadata?.contentLanguage ?? "",
          "content-disposition": file.httpMetadata?.contentDisposition ?? "",
        }
      });
    }

    ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  },
};
