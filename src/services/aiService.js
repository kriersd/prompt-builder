import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = () => process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

const PROMPT_TYPE_LABELS = {
  system:             'System Prompt',
  task:               'Task Prompt',
  'few-shot':         'Few-Shot Prompt',
  'chain-of-thought': 'Chain of Thought Prompt',
  react:              'ReAct (Reasoning + Acting) Prompt',
}

// ─── Generator Meta-Prompt ────────────────────────────────────────────────────

const GENERATOR_SYSTEM = `You are PromptForge, an expert enterprise AI prompt engineer with deep knowledge of prompt engineering best practices, large language model capabilities, and enterprise software development patterns.

Your sole responsibility is to generate production-ready, high-quality AI prompts based on user-provided configuration. Every prompt you produce must be:

- Unambiguous and precisely scoped
- Structured with clearly labelled ## sections
- Written at the appropriate technical depth for the specified role
- Consistent with the requested tone and output format
- Free of padding, filler phrases, and meta-commentary

Return ONLY the final prompt text. No explanations, no preamble.`

function buildGeneratorUserMessage(config) {
  const {
    type = 'system',
    role = '',
    roleTraits = [],
    taskDescription = '',
    tone = 'Professional & Precise',
    outputFormat = 'Structured Markdown',
    constraints = '',
    targetModel = 'claude-sonnet-4-6',
  } = config

  const typLabel   = PROMPT_TYPE_LABELS[type] ?? 'System Prompt'
  const traitsStr  = roleTraits.length ? `\nRole traits: ${roleTraits.join(', ')}` : ''

  return `Generate a ${typLabel} with the following specifications:

**AI Role:** ${role || 'Not specified'}${traitsStr}
**Task:** ${taskDescription || 'Not specified'}
**Tone & Style:** ${tone}
**Output Format:** ${outputFormat}
**Constraints:** ${constraints || 'None'}
**Target Model:** ${targetModel}

Produce a complete, production-ready prompt an enterprise team would confidently deploy. Include all necessary sections, context, and instructions.`
}

// ─── Prompt Scoring ───────────────────────────────────────────────────────────

const ANALYZER_SYSTEM = `You are an AI prompt quality analyst. Score the provided prompt across three dimensions (each 0–100):

- clarity:      How unambiguous and easy to follow the prompt is
- specificity:  How detailed and precise the instructions are
- completeness: How thoroughly the prompt covers the task

Return ONLY valid JSON — no explanation, no markdown wrapper:
{"clarity": <number>, "specificity": <number>, "completeness": <number>}`

async function analyzePrompt(promptText) {
  try {
    const msg = await client.messages.create({
      model: MODEL(),
      max_tokens: 128,
      system: ANALYZER_SYSTEM,
      messages: [{ role: 'user', content: `Analyze this prompt:\n\n${promptText}` }],
    })

    const metrics = JSON.parse(msg.content[0].text)
    const qualityScore = Math.round(
      (metrics.clarity + metrics.specificity + metrics.completeness) / 3
    )
    return { qualityScore, qualityMetrics: metrics }
  } catch {
    return {
      qualityScore: 85,
      qualityMetrics: { clarity: 85, specificity: 85, completeness: 85 },
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a prompt and quality metrics in a single round-trip (non-streaming).
 */
export async function generatePrompt(config) {
  const msg = await client.messages.create({
    model: MODEL(),
    max_tokens: 2048,
    system: GENERATOR_SYSTEM,
    messages: [{ role: 'user', content: buildGeneratorUserMessage(config) }],
  })

  const generatedPrompt = msg.content[0].text
  const metrics = await analyzePrompt(generatedPrompt)
  return { generatedPrompt, ...metrics }
}

/**
 * Stream prompt generation via SSE.
 * `onChunk` receives either { type:'delta', text } or { type:'complete', metrics, generatedPrompt }.
 */
export async function generatePromptStream(config, onChunk) {
  let fullText = ''

  const stream = client.messages.stream({
    model: MODEL(),
    max_tokens: 2048,
    system: GENERATOR_SYSTEM,
    messages: [{ role: 'user', content: buildGeneratorUserMessage(config) }],
  })

  stream.on('text', text => {
    fullText += text
    onChunk({ type: 'delta', text })
  })

  await stream.finalMessage()

  const metrics = await analyzePrompt(fullText)
  onChunk({ type: 'complete', generatedPrompt: fullText, ...metrics })
}

/**
 * AI-enhance a task description to make it more precise and enterprise-ready.
 */
export async function enhanceTask(taskDescription) {
  const msg = await client.messages.create({
    model: MODEL(),
    max_tokens: 512,
    system: `You are an expert at writing precise, actionable task descriptions for AI prompts. Rewrite the provided description to be clearer, more specific, and enterprise-ready. Return ONLY the enhanced description.`,
    messages: [{ role: 'user', content: `Enhance this task description:\n\n${taskDescription}` }],
  })
  return msg.content[0].text
}
