import { useChat } from "@ai-sdk/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeft, Compass, Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { getThread, readThreads, saveThreadMessages } from "@/lib/threads";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Business plan chat — Launchpad" },
      {
        name: "description",
        content: "Chat with Launchpad about your student business plan.",
      },
    ],
  }),
  component: ChatPage,
});

function buildKickoffMessage(industry: string, country: string): string {
  return `I want to start a business in the ${industry} industry in ${country}. Please create a business plan for me.`;
}

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();

  const thread = useMemo(() => getThread(threadId), [threadId]);

  useEffect(() => {
    if (!thread) {
      navigate({ to: "/", replace: true });
    }
  }, [thread, navigate]);

  if (!thread) return null;
  return <ChatWindow key={thread.id} thread={thread} />;
}

// Module-level guard: survives StrictMode double-mounts, resets on page reload
// (a reloaded thread already has saved messages, so no kickoff is needed then).
const kickedOffThreadIds = new Set<string>();

function ChatWindow({ thread }: { thread: NonNullable<ReturnType<typeof getThread>> }) {
  const { messages, sendMessage, status, stop } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => {
      toast.error("Something went wrong", {
        description: error.message || "Please try sending your message again.",
      });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Kick off the business plan request once for a brand-new thread.
  useEffect(() => {
    if (thread.messages.length > 0) return;
    if (kickedOffThreadIds.has(thread.id)) return;
    kickedOffThreadIds.add(thread.id);
    void sendMessage({
      text: buildKickoffMessage(thread.industry, thread.country),
    }).catch((error: unknown) => {
      kickedOffThreadIds.delete(thread.id);
      console.error("Kickoff failed", error);
    });
  }, [thread, sendMessage]);

  // Persist messages to localStorage whenever they change and the stream settles.
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      saveThreadMessages(thread.id, messages as UIMessage[]);
    }
  }, [messages, status, thread.id]);

  const siblings = readThreads().filter((t) => t.id !== thread.id).slice(0, 5);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link
          to="/"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Compass className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-sm font-semibold">{thread.title}</h1>
          <p className="text-xs text-muted-foreground">Launchpad · student business plan</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <Plus className="size-3.5" />
          New plan
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent className="gap-6 px-4 py-6">
            {messages.length === 0 && status !== "submitted" ? (
              <ConversationEmptyState
                title="Preparing your plan…"
                description={`Industry: ${thread.industry} · Country: ${thread.country}`}
              />
            ) : (
              messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return message.role === "assistant" ? (
                          <MessageResponse key={index}>{part.text}</MessageResponse>
                        ) : (
                          <p key={index} className="whitespace-pre-wrap">
                            {part.text}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
            {status === "submitted" && <Shimmer className="text-sm">Drafting your plan…</Shimmer>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t px-4 py-4">
          <PromptInput
            onSubmit={({ text }) => {
              if (!text.trim() || busy) return;
              sendMessage({ text: text.trim() });
            }}
          >
            <PromptInputTextarea
              placeholder="Ask a follow-up about your plan…"
              autoFocus
              disabled={busy}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={busy} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
          {siblings.length > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {siblings.length} other plan{siblings.length === 1 ? "" : "s"} saved —{" "}
              <Link to="/" className="underline underline-offset-2 hover:text-foreground">
                view all
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
