export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.protocol === "http:" || url.hostname === "www.moscowrooftop.ru") {
      url.protocol = "https:";
      url.hostname = "moscowrooftop.ru";
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
