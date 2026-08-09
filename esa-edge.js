/**
 * ESA 边缘函数 - NextChat API 代理
 * 处理 /api/proxy 路由，代理搜索插件等外部请求
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  // 处理 /api/proxy 代理请求
  if (pathname.startsWith("/api/proxy")) {
    const baseURL = request.headers.get("X-Base-URL");
    if (!baseURL) {
      return new Response("Missing X-Base-URL header", { status: 400 });
    }

    // 提取子路径（去掉 /api/proxy 前缀）
    const subpath = pathname.replace(/^\/api\/proxy\/?/, "");
    const targetURL = `${baseURL}/${subpath}?${searchParams.toString()}`;

    try {
      const proxyRes = await fetch(targetURL, {
        method: request.method,
        headers: request.headers,
        body: request.method !== "GET" && request.method !== "HEAD" 
          ? await request.text() 
          : undefined,
        redirect: "follow",
      });

      const resHeaders = new Headers(proxyRes.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "*");
      resHeaders.set("Access-Control-Allow-Headers", "*");

      return new Response(proxyRes.body, {
        status: proxyRes.status,
        headers: resHeaders,
      });
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, { status: 502 });
    }
  }

  // 处理 CORS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 其他请求交由 Pages 静态资源处理
  return new Response("Not Found", { status: 404 });
}

export default {
  fetch(request) {
    return handleRequest(request);
  }
};