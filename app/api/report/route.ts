import { NextRequest, NextResponse } from "next/server";

// 上报目标：审查服务器（ECS 8.149.136.78:8787）
const REPORT_TARGET = "http://8.149.136.78:8787/api/report";

export const runtime = "edge";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  let body: string;
  try {
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
