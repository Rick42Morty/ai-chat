// Default model for chat completions (via AI SDK @ai-sdk/openai)
// Override with OPENAI_MODEL env var
export const CHAT_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";
