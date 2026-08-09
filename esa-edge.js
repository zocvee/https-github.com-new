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
      // 使用干净的请求头，避免传递原始 Host 等头导致问题
      const proxyRes = await fetch(targetURL, {
        method: request.method,
        headers: {
          "Accept": "application/json",
          "User-Agent": "ESA-Edge-Function/1.0",
        },
        redirect: "follow",
      });

      const resHeaders = new Headers();
      resHeaders.set("Content-Type", "application/json");
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "*");
      resHeaders.set("Access-Control-Allow-Headers", "*");

      const body = await proxyRes.text();
      return new Response(body, {
        status: proxyRes.status,
        headers: resHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
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