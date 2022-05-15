import parseRange from "range-parser";

interface Env {
  R2_BUCKET: R2Bucket,
  CACHE_CONTROL: string
}

function hasBody(object: R2Object | R2ObjectBody): object is R2ObjectBody {
  return (<R2ObjectBody>object).body !== undefined;
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

      let file: R2Object | R2ObjectBody | null | undefined;

      // Range handling (Currently bugged in R2- ranges starting with 0 will error)
      let range: R2Range | undefined;
      if (request.method === "GET") {
        const rangeHeader = request.headers.get("range");
        if (rangeHeader) {
          file = await env.R2_BUCKET.head(path);
          if (file === null) return new Response("File Not Found", { status: 404 });
          const parsedRanges = parseRange(file?.size || 0, rangeHeader);
          if (parsedRanges !== -1 && parsedRanges !== -2 && parsedRanges.length === 1) {
            let firstRange = parsedRanges[0];
            range = {
              offset: firstRange.start,
              length: firstRange.end - firstRange.start + 1
            }
          } else {
            return new Response("Range Not Satisfiable", { status: 416 });
          }
        }
      }

      // Etag/If-(Not)-Match handling
      // R2 requires that etag checks must not contain quotes, and the S3 spec only allows one etag
      // This silently ignores invalid or weak (W/) headers
      const getHeaderEtag = (header: string | null) => header?.trim().replace(/^['"]|['"]$/g, "");
      const ifMatch = getHeaderEtag(request.headers.get("if-match"));
      const ifNoneMatch = getHeaderEtag(request.headers.get("if-none-match"));

      const ifModifiedSince = Date.parse(request.headers.get("if-modified-since") || "");
      const ifUnmodifiedSince = Date.parse(request.headers.get("if-unmodified-since") || "");

      if (ifMatch || ifUnmodifiedSince) {
        file = await env.R2_BUCKET.get(path, {
          onlyIf: {
            etagMatches: ifMatch,
            uploadedBefore: ifUnmodifiedSince ? new Date(ifUnmodifiedSince) : undefined
          }, range
        });

        if (file && !hasBody(file)) {
          return new Response("Precondition Failed", { status: 412 });
        }
      }

      if (ifNoneMatch || ifModifiedSince) {
        // if-none-match overrides if-modified-since completely
        if (ifNoneMatch) {
          file = await env.R2_BUCKET.get(path, { onlyIf: { etagDoesNotMatch: ifNoneMatch }, range });
        } else if (ifModifiedSince) {
          file = await env.R2_BUCKET.get(path, { onlyIf: { uploadedAfter: new Date(ifModifiedSince) }, range });
        }
        if (file && !hasBody(file)) {
          return new Response(null, { status: 304 });
        }
      }

      file = request.method === "HEAD"
        ? await env.R2_BUCKET.head(path)
        : ((file && hasBody(file)) ? file : await env.R2_BUCKET.get(path, { range }));

      if (file === null) {
        return new Response("File Not Found", { status: 404 });
      }

      response = new Response(hasBody(file) ? file.body : null, {
        status: (file?.size || 0) === 0 ? 204 : (range ? 206 : 200),
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
