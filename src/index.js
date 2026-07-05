export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const cfVisitor = request.headers.get("cf-visitor") || "";
    const isHttp =
      url.protocol === "http:" ||
      forwardedProto === "http" ||
      cfVisitor.includes('"scheme":"http"');

    if (isHttp || url.hostname === "www.moscowrooftop.ru") {
      url.protocol = "https:";
      url.hostname = "moscowrooftop.ru";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.endsWith("/index.html")) {
      url.pathname = url.pathname.slice(0, -"index.html".length) || "/";
      return Response.redirect(url.toString(), 301);
    }

    const assetUrl = new URL(request.url);
    const lastSegment = assetUrl.pathname.split("/").pop();

    if (assetUrl.pathname.endsWith("/")) {
      assetUrl.pathname = `${assetUrl.pathname}index.html`;
    } else if (lastSegment && !lastSegment.includes(".")) {
      assetUrl.pathname = `${assetUrl.pathname}/index.html`;
    }

    const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));

    if (url.hostname.endsWith(".workers.dev")) {
      const headers = new Headers(response.headers);
      headers.set("X-Robots-Tag", "noindex");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
