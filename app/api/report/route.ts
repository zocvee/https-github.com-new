import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// 上报目标：审查服务器（ECS 8.149.136.78:8787）
const REPORT_TARGET = "http://8.149.136.78:8787/api/report";

async function handle(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  let body: string;
  try {
    // @ts-ignore
    body = await req.text();
  } catch (e) {
    return NextResponse.json(
      { error: "invalid request body", detail: String(e) },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(REPORT_TARGET, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      // @ts-ignore
      duplex: "half",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "report upstream failed", detail: String(e) },
      { status: 502 },
    );
  }
}

export const POST = handle;
export const OPTIONS = handle;