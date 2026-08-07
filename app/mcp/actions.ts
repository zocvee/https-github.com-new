// ============================================================================
// MCP 空实现（静态导出兼容版）
// ----------------------------------------------------------------------------
// 静态导出模式（output: "export"）不支持 Next.js Server Actions，
// 原先本文件以 "use server" 导出 MCP 服务端动作，会导致导出构建失败。
// 此处改为纯客户端可用的空实现：MCP 功能整体禁用（isMcpEnabled 恒为 false），
// 其余函数返回安全空值，所有调用方无需改动即可正常编译。
// 注意：不能 import "./types"，因为 types.ts 会引入 @modelcontextprotocol/sdk
// （Node 端包），会被打包进客户端而构建失败。
// ============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */

interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  status?: "active" | "paused" | "error";
}

interface McpConfigData {
  mcpServers: Record<string, McpServerConfig>;
}

const EMPTY_CONFIG: McpConfigData = { mcpServers: {} };

// 获取客户端状态（已禁用，返回空）
export async function getClientsStatus(): Promise<
  Record<string, { status: string; errorMsg: string | null }>
> {
  return {};
}

// 获取客户端工具（已禁用，返回 null）
export async function getClientTools(_clientId: string) {
  return null;
}

// 获取可用客户端数量（已禁用，返回 0）
export async function getAvailableClientsCount() {
  return 0;
}

// 获取所有客户端工具（已禁用，返回空数组）
export async function getAllTools() {
  return [];
}

// 初始化 MCP 系统（已禁用，空操作）
export async function initializeMcpSystem() {
  return EMPTY_CONFIG;
}

// 添加服务器（已禁用，仅返回内存配置）
export async function addMcpServer(
  clientId: string,
  config: McpServerConfig,
): Promise<McpConfigData> {
  return {
    mcpServers: { ...EMPTY_CONFIG.mcpServers, [clientId]: config },
  };
}

// 暂停服务器（已禁用）
export async function pauseMcpServer(_clientId: string) {
  return EMPTY_CONFIG;
}

// 恢复服务器（已禁用）
export async function resumeMcpServer(_clientId: string): Promise<void> {}

// 移除服务器（已禁用）
export async function removeMcpServer(_clientId: string) {
  return EMPTY_CONFIG;
}

// 重启所有客户端（已禁用）
export async function restartAllClients() {
  return EMPTY_CONFIG;
}

// 执行 MCP 请求（已禁用，返回 disabled 状态）
export async function executeMcpAction(_clientId: string, _request: unknown) {
  return { status: "disabled" };
}

// 获取 MCP 配置文件（已禁用，返回空配置）
export async function getMcpConfigFromFile() {
  return EMPTY_CONFIG;
}

// 检查 MCP 是否启用（恒为 false）
export function isMcpEnabled(): boolean {
  return false;
}
