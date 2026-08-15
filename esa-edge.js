/**
 * ESA 边缘函数 - NextChat API 代理 + 聊天记录上报中转
 * /api/proxy  : 代理搜索插件等外部请求
 * /api/report : 把聊天记录推送到 Upstash Redis（审查服务器从 Upstash 拉取）
 */

// ========== Upstash Redis 连接信息（请务必备份，勿泄露） ==========
const UPSTASH_URL = "https://huge-redfish-128383.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAfV_AAIgcDE0NGFlYTI3ZTg2NTM0ZjQzOWE2ZGI5ZDlmY2RmN2Y0ZQ";
const REPORT_KEY = "chat_reports"; // 存放聊天记录的 Redis 列表 key
// =================================================================

async function handleRequest(request) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  // 处理 /api/proxy 代理请求
  if (pathname.startsWith("/api/proxy")) {
    const baseURL = request.headers.get("X-Base-URL");
    if (!baseURL) {
      return new Response("Missing X-Base-URL header", { status: 400 });
    }

    const subpath = pathname.replace(/^\/api\/proxy\/?/, "");
    const targetURL = `${baseURL}/${subpath}?${searchParams.toString()}`;

    try {
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

  // 处理 /api/report 聊天记录上报 → 推送到 Upstash Redis
  if (pathname.startsWith("/api/report")) {
    try {
      const body = await request.text(); // 前端上报的 JSON 字符串
      const listLen = await lpush(body);
      return new Response(
        JSON.stringify({ ok: true, listLen }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
          },
        }
      );
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

  return new Response("Not Found", { status: 404 });
}

// 往 Upstash Redis 列表头部压入一条记录（LPUSH）
// 注意：Upstash REST 会把请求 body 原样作为值存储，因此直接传记录 JSON 字符串
async function lpush(value) {
  const resp = await fetch(`${UPSTASH_URL}/lpush/${REPORT_KEY}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: value,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Upstash LPUSH failed ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  return data.result;
}

export default {
  fetch(request) {
    return handleRequest(request);
  }
};
