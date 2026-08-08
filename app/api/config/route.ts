import { NextResponse } from "next/server";

import { getServerSideConfig } from "../../config/server";

// Danger! Do not hard code any secret value here!
// 警告！不要在这里写入任何敏感信息！
const DANGER_CONFIG = {
  needCode: true,
  hideUserApiKey: false,
  disableGPT4: false,
  hideBalanceQuery: false,
  disableFastLink: false,
  customModels: "",
  defaultModel: "",
  visionModels: "",
};

declare global {
  type DangerConfig = typeof DANGER_CONFIG;
}

async function handle() {
  // 每次请求时实时读取环境变量，确保获取最新配置
  const serverConfig = getServerSideConfig();
  return NextResponse.json({
    needCode: serverConfig.needCode,
    hideUserApiKey: serverConfig.hideUserApiKey,
    disableGPT4: serverConfig.disableGPT4,
    hideBalanceQuery: serverConfig.hideBalanceQuery,
    disableFastLink: serverConfig.disableFastLink,
    customModels: serverConfig.customModels,
    defaultModel: serverConfig.defaultModel,
    visionModels: serverConfig.visionModels,
    // 管理员配置了哪些 AI 服务商的 API Key
    availableProviders: {
      OpenAI: !!serverConfig.apiKey,
      Azure: serverConfig.isAzure,
      Google: serverConfig.isGoogle,
      Anthropic: serverConfig.isAnthropic,
      Baidu: serverConfig.isBaidu,
      ByteDance: serverConfig.isBytedance,
      Alibaba: serverConfig.isAlibaba,
      Tencent: serverConfig.isTencent,
      Moonshot: serverConfig.isMoonshot,
      Iflytek: serverConfig.isIflytek,
      DeepSeek: serverConfig.isDeepSeek,
      XAI: serverConfig.isXAI,
      ChatGLM: serverConfig.isChatGLM,
      SiliconFlow: serverConfig.isSiliconFlow,
      Stability: serverConfig.isStability,
    } as Record<string, boolean>,
  });
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
