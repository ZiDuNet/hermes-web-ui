/**
 * Hermes config schema metadata.
 * Inlined from hermes-agent/hermes_cli/web_server.py.
 */

export interface SchemaOverride {
  type: string;
  description: string;
  category?: string;
  options?: string[];
}

export const SCHEMA_OVERRIDES: Record<string, SchemaOverride> = {
  model: {
    type: "string",
    description: "Default model (e.g. anthropic/claude-sonnet-4.6)",
    category: "general",
  },
  model_context_length: {
    type: "number",
    description: "Context window override (0 = auto-detect from model metadata)",
    category: "general",
  },
  "terminal.backend": {
    type: "select",
    description: "Terminal execution backend",
    options: ["local", "docker", "ssh", "modal", "daytona", "singularity"],
  },
  "terminal.modal_mode": {
    type: "select",
    description: "Modal sandbox mode",
    options: ["sandbox", "function"],
  },
  "tts.provider": {
    type: "select",
    description: "Text-to-speech provider",
    options: ["edge", "elevenlabs", "openai", "neutts"],
  },
  "stt.provider": {
    type: "select",
    description: "Speech-to-text provider",
    options: ["local", "openai", "mistral"],
  },
  "display.skin": {
    type: "select",
    description: "CLI visual theme",
    options: ["default", "ares", "mono", "slate"],
  },
  "dashboard.theme": {
    type: "select",
    description: "Web dashboard visual theme",
    options: ["default", "midnight", "ember", "mono", "cyberpunk", "rose"],
  },
  "display.resume_display": {
    type: "select",
    description: "How resumed sessions display history",
    options: ["minimal", "full", "off"],
  },
  "display.busy_input_mode": {
    type: "select",
    description: "Input behavior while agent is running",
    options: ["queue", "interrupt", "block"],
  },
  "memory.provider": {
    type: "select",
    description: "Memory provider plugin",
    options: ["builtin", "honcho"],
  },
  "approvals.mode": {
    type: "select",
    description: "Dangerous command approval mode",
    options: ["ask", "yolo", "deny"],
  },
  "context.engine": {
    type: "select",
    description: "Context management engine",
    options: ["default", "custom"],
  },
  "human_delay.mode": {
    type: "select",
    description: "Simulated typing delay mode",
    options: ["off", "typing", "fixed"],
  },
  "logging.level": {
    type: "select",
    description: "Log level for agent.log",
    options: ["DEBUG", "INFO", "WARNING", "ERROR"],
  },
  "agent.service_tier": {
    type: "select",
    description: "API service tier (OpenAI/Anthropic)",
    options: ["", "auto", "default", "flex"],
  },
  "delegation.reasoning_effort": {
    type: "select",
    description: "Reasoning effort for delegated subagents",
    options: ["", "low", "medium", "high"],
  },
};

export const CATEGORY_MERGE: Record<string, string> = {
  privacy: "security",
  context: "agent",
  skills: "agent",
  cron: "agent",
  network: "agent",
  checkpoints: "agent",
  approvals: "security",
  human_delay: "display",
  smart_model_routing: "agent",
  dashboard: "display",
};

export const CATEGORY_ORDER: string[] = [
  "general", "agent", "terminal", "display", "delegation",
  "memory", "compression", "security", "browser", "voice",
  "tts", "stt", "logging", "discord", "auxiliary",
];
