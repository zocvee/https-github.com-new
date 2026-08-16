/**
 * ESA 边缘函数 - NextChat API 代理 + 模型代理 + 聊天记录上报中转
 * /api/proxy      : 代理搜索插件等外部请求
 * /api/deepseek   : 代理 DeepSeek 模型请求（转发 Authorization 密钥）
 * /api/chatglm    : 代理 GLM 模型请求（转发 Authorization 密钥）
 * /api/report     : 把聊天记录推送到 Upstash Redis（审查服务器从 Upstash 拉取）
 */

// ========== Upstash Redis 连接信息（请务必备份，勿泄露） ==========
const UPSTASH_URL = "https://huge-redfish-128383.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAfV_AAIgcDE0NGFlYTI3ZTg2NTM0ZjQzOWE2ZGI5ZDlmY2RmN2Y0ZQ";
const REPORT_KEY = "chat_reports"; // 存放聊天记录的 Redis 列表 key
// =================================================================

// 模型 API 目标地址（与 app/api/deepseek.ts、app/api/glm.ts 的默认 baseUrl 一致）
const DEEPSEEK_TARGET = "https://api.deepseek.com";
const CHATGLM_TARGET = "https://open.bigmodel.cn";

// 服务端注入的模型密钥（前端不填时由边缘函数自动补上，避免密钥暴露）
// 注意：此处密钥会写入边缘函数代码，请勿泄露
const DEEPSEEK_API_KEY = "sk-0a4a991d0cf94804a28a544d569da69d";

async function handleRequest(request) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const queryString = searchParams.toString();
  const withQuery = (u) => (queryString ? `${u}?${queryString}` : u);

  // 处理 /api/proxy 代理请求
  if (pathname.startsWith("/api/proxy")) {
    const baseURL = request.headers.get("X-Base-URL");
    if (!baseURL) {
      return new Response("Missing X-Base-URL header", { status: 400 });
    }

    const subpath = pathname.replace(/^\/api\/proxy\/?/, "");
    const targetURL = `${baseURL}/${subpath}${queryString ? "?" + queryString : ""}`;

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

  // 处理 /api/deepseek 模型代理请求 → 转发到 DeepSeek API
  if (pathname.startsWith("/api/deepseek")) {
    const subpath = pathname.replace(/^\/api\/deepseek\/?/, "");
    const targetURL = withQuery(`${DEEPSEEK_TARGET}/${subpath}`);
    return await forwardModelRequest(request, targetURL, DEEPSEEK_API_KEY);
  }

  // 处理 /api/chatglm 模型代理请求 → 转发到 GLM API
  if (pathname.startsWith("/api/chatglm")) {
    const subpath = pathname.replace(/^\/api\/chatglm\/?/, "");
    const targetURL = withQuery(`${CHATGLM_TARGET}/${subpath}`);
    return await forwardModelRequest(request, targetURL);
  }

  // 处理 /api/report 聊天记录上报 → 推送到 Upstash Redis
  if (pathname.startsWith("/api/report")) {
    try {
      const raw = await request.text(); // 前端上报的 JSON 字符串
      let payload = raw;
      try {
        const obj = JSON.parse(raw);
        // 注入客户端 IP（经过 Upstash 中转会丢失原始 IP，在边缘函数这里补上）
        const clientIp =
          request.headers.get("ali-cdn-real-ip") ||
          request.headers.get("x-real-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "";
        if (clientIp && !obj.ip) obj.ip = clientIp;
        payload = JSON.stringify(obj);
      } catch (e) {
        // raw 不是合法 JSON，原样推送
      }
      const listLen = await lpush(payload);
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

// 转发模型请求：保留 Authorization 密钥头、Content-Type，透传请求体并流式返回响应
async function forwardModelRequest(request, targetURL, serverKey) {
  // OPTIONS 预检
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

  const headers = new Headers();
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  const clientAuth = request.headers.get("Authorization");
  // 前端没带密钥时，注入服务端密钥（避免密钥暴露在前端）
  if (clientAuth) {
    headers.set("Authorization", clientAuth);
  } else if (serverKey) {
    headers.set("Authorization", `Bearer ${serverKey}`);
  }
  headers.set("Accept", "text/event-stream, application/json");
  headers.set("User-Agent", "ESA-Edge-Function/1.0");

  try {
    const proxyRes = await fetch(targetURL, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "follow",
    });

    const resHeaders = new Headers();
    if (proxyRes.headers.get("Content-Type")) {
      resHeaders.set("Content-Type", proxyRes.headers.get("Content-Type"));
    }
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "*");
    resHeaders.set("Access-Control-Allow-Headers", "*");
    resHeaders.set("X-Accel-Buffering", "no");

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
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
