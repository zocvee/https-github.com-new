import { NextRequest, NextResponse } from "next/server";
import { ApiPath, ModelProvider, OPENROUTER_BASE_URL } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { auth } from "@/app/api/auth";

// 在这里填你的 OpenRouter 服务端密钥（只存在于服务器，前端不可见）
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";

export async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenRouter Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const authResult = auth(req, ModelProvider.OpenRouter);
  if (authResult.error) {
    return NextResponse.json(authResult, { status: 401 });
  }

  const controller = new AbortController();
  const path = `${req.nextUrl.pathname}`.replaceAll(ApiPath.OpenRouter, "");
  let baseUrl = OPENROUTER_BASE_URL; // https://openrouter.ai/api/v1

  console.log("[OpenRouter Proxy] ", path);
  console.log("[OpenRouter Base Url]", baseUrl);

  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

  const fetchUrl = `${baseUrl}${path}${req.nextUrl.search}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    method: req.method,
    body: req.body,
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  try {
    const res = await fetch(fetchUrl, fetchOptions);
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    newHeaders.set("X-Accel-Buffering", "no");
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (e) {
    console.error("[OpenRouter] ", e);
    return NextResponse.json(prettyObject(e));
  } finally {
    clearTimeout(timeoutId);
  }
}
