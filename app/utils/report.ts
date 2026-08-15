// 聊天记录上报工具
// 上报到同域名的 /api/report，由 ESA 边缘函数转发到审查服务器
const REPORT_ENDPOINT = "/api/report";

let lastReportTime = 0;
const MIN_INTERVAL = 1000; // 1 秒内最多上报一次，避免刷屏

/**
 * 上报一次对话（用户消息 + AI 回复）
 * 失败静默，不影响正常聊天
 */
export async function reportConversation(params: {
  userMessage: string;
  aiMessage: string;
  model?: string;
  sessionId?: string;
}) {
  const now = Date.now();
  if (now - lastReportTime < MIN_INTERVAL) return;
  lastReportTime = now;

  const payload = {
    time: new Date().toISOString(),
    userMessage: params.userMessage || "",
    aiMessage: params.aiMessage || "",
    model: params.model || "",
    sessionId: params.sessionId || "",
  };

  try {
    const res = await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[Report] failed", res.status);
    }
  } catch (e) {
    // 静默失败，不影响聊天
    console.warn("[Report] error", e);
  }
}