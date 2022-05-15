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
      let file = await env.R2_BUCKET.get(url.pathname.substring(1));
      if (file === null) {
        return new Response("File Not Found", { status: 404 });
      }

      response = new Response(file.body,
        {
          headers: {
            "etag": file.httpEtag,
            "cache-control": file.httpMetadata.cacheControl ?? "",
            "expires": file.httpMetadata.cacheExpiry?.toUTCString() ?? "",

            "content-encoding": file.httpMetadata?.contentEncoding ?? "",
            "content-type": file.httpMetadata?.contentType ?? "",
            "content-language": file.httpMetadata?.contentLanguage ?? "",
            "content-disposition": file.httpMetadata?.contentDisposition ?? "",
          },
        });
    }

    ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  },
};
