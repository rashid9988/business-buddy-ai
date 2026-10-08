import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

const SYSTEM_PROMPT = `You are Launchpad, a student support agent that helps students turn ideas into realistic business plans.

Your primary job: given an industry and a country, produce a clear, student-friendly business plan.

When the user provides an industry and a country, respond with a well-structured business plan in markdown covering:
1. **Executive summary** — the idea in 2-3 sentences
2. **Market opportunity** — demand, trends and customer segments in that country
3. **Target customers** — who they are and what problem you solve for them
4. **Product / service offering** — what you sell and the pricing approach
5. **Go-to-market strategy** — how to reach the first 100 customers in that country
6. **Operations & legal basics** — registration, permits or regulations that matter in that country
7. **Startup costs & funding** — a rough budget breakdown and realistic funding options for a student
8. **Risks & next steps** — top 3 risks and a 30-60-90 day action plan

Keep language simple and encouraging — assume the user is a student with limited budget and experience. Use concrete numbers and local context for the given country (currency, market size ranges, typical costs) rather than generic advice. After the plan, invite follow-up questions and offer to go deeper on any section.`;

export async function handleChat(request: Request) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI is not configured yet. Please try again later." },
      { status: 500 },
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Messages are required." }, { status: 400 });
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: provider.responses(MODEL),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const streamResponse = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
  });

  return withLovableAiGatewayRunIdHeader(streamResponse, runIdFetch);
}
