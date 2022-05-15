interface Env {
  R2_BUCKET: R2Bucket,
  CACHE_CONTROL: string
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
      console.warn("Cache miss");
      const path = url.pathname.substring(1);

      // Range handling (Currently bugged in R2, so disabled)
      // let head: R2Object | null | undefined;
      // let range: R2Range | undefined;
      // if (request.method === "GET") {
      //   const rangeHeader = request.headers.get("range");
      //   if (rangeHeader) {
      //     head = await env.R2_BUCKET.head(path);
      //     const parsedRanges = parseRange(head?.size || 0, rangeHeader);
      //     if (parsedRanges !== -1 && parsedRanges !== -2 && parsedRanges.length === 1) {
      //       let firstRange = parsedRanges[0];
      //       range = {
      //         offset: firstRange.start,
      //         length: firstRange.end - firstRange.start
      //       }
      //       console.log(range);
      //     } else {
      //       return new Response("Range Not Satisfiable", { status: 416 });
      //     }
      //   }
      // }

      // Etag/If-(Not)-Match handling
      // R2 requires that etag checks must not contain quotes
      // const processMatchHeaders = (header: string | null) => header?.split(",")
      //   .map(item => item.startsWith("W/") ? null : item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean).join(",");
      //
      // const ifMatch = processMatchHeaders(request.headers.get("if-match"));
      // const ifNoneMatch = processMatchHeaders(request.headers.get("if-none-match"));

      // const options = { onlyIf: { etagMatches: ifMatch || undefined, etagDoesNotMatch: ifNoneMatch || undefined }, range };

      const file = request.method === "HEAD" ? await env.R2_BUCKET.head(path) : await env.R2_BUCKET.get(path);
      if (file === null) {
        return new Response("File Not Found", { status: 404 });
      }

      function hasBody(object: R2Object | R2ObjectBody): object is R2ObjectBody {
        return (<R2ObjectBody>object).body !== undefined;
      }

      const shouldSendBody = hasBody(file);

      response = new Response(shouldSendBody ? file.body : null, {
        status: (file?.size || 0) === 0 ? 204 : 200,
        headers: {
          "etag": file.httpEtag,
          "cache-control": file.httpMetadata.cacheControl ?? (env.CACHE_CONTROL || ""),
          "expires": file.httpMetadata.cacheExpiry?.toUTCString() ?? "",
          "last-modified": file.uploaded.toUTCString(),

          "content-encoding": file.httpMetadata?.contentEncoding ?? "",
          "content-type": file.httpMetadata?.contentType ?? "application/octet-stream",
          "content-language": file.httpMetadata?.contentLanguage ?? "",
          "content-disposition": file.httpMetadata?.contentDisposition ?? "",
        }
      });
    }

    if (request.method === "GET")
      ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  },
};
