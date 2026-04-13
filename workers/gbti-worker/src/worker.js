const allowedPaths = ["/", "/index.html"];
const allowedPrefixes = ["/image/", "/favicon/", "/assets/", "/data/"];

function canServe(pathname) {
  if (allowedPaths.includes(pathname)) return true;
  return allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!canServe(url.pathname)) {
      return new Response("Not Found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
