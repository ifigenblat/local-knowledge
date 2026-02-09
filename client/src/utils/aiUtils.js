/**
 * Returns a short display name for the current AI provider (e.g. "Ollama phi", "Groq llama-3").
 * Use this so UI messages are dynamic and not hardcoded to a specific provider.
 * @param {{ provider?: string, cloudLabel?: string, model?: string }} aiStatus
 * @returns {string}
 */
export function getAIDisplayName(aiStatus) {
  if (!aiStatus?.provider) return 'AI';
  if (aiStatus.provider === 'ollama') return aiStatus.model ? `Ollama ${aiStatus.model}` : 'Ollama';
  if (aiStatus.provider === 'openai') {
    if (aiStatus.cloudLabel && aiStatus.model) return `${aiStatus.cloudLabel} ${aiStatus.model}`;
    if (aiStatus.model) return aiStatus.model;
    return 'Cloud AI';
  }
  return 'AI';
}
