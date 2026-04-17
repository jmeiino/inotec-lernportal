import type { Tool } from "@prisma/client"

export const TOOL_LIST: Tool[] = ["CHATGPT", "CLAUDE", "OPENWEBUI"]

export const DEFAULT_TOOL_ENABLED: Record<Tool, boolean> = {
  CHATGPT: true,
  CLAUDE: false,
  OPENWEBUI: false,
}

export function defaultToolEnabled(tool: Tool): boolean {
  return DEFAULT_TOOL_ENABLED[tool]
}
