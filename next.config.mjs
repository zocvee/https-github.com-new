// ============================================================================
// MCP 空实现（静态导出兼容版）
// 静态导出模式（output: "export"）不支持 Next.js Server Actions
// ============================================================================

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

export async function getClientsStatus(): Promise<
  Record<string, { status: string; errorMsg: string | null }>
> {
  return {};
}

export async function getClientTools(_clientId: string) {
  return null;
}

export async function getAvailableClientsCount() {
  return 0;
}

export async function getAllTools() {
  return [];
}

export async function initializeMcpSystem() {
  return EMPTY_CONFIG;
}

export async function addMcpServer(
  clientId: string,
  config: McpServerConfig,
): Promise<McpConfigData> {
  return {
    mcpServers: { ...EMPTY_CONFIG.mcpServers, [clientId]: config },
  };
}

export async function pauseMcpServer(_clientId: string) {
  return EMPTY_CONFIG;
}

export async function resumeMcpServer(_clientId: string): Promise<void> {}

export async function removeMcpServer(_clientId: string) {
  return EMPTY_CONFIG;
}

export async function restartAllClients() {
  return EMPTY_CONFIG;
}

export async function executeMcpAction(_clientId: string, _request: unknown) {
  return { status: "disabled" };
}

export async function getMcpConfigFromFile() {
  return EMPTY_CONFIG;
}

export function isMcpEnabled(): boolean {
  return false;
}
