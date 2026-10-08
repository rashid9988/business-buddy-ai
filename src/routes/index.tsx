import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createThread, deleteThread, readThreads, type ChatThread } from "@/lib/threads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launchpad — Student Business Plan Agent" },
      {
        name: "description",
        content:
          "Launchpad is a student support agent that turns an industry and a country into a practical, student-friendly business plan.",
      },
      { property: "og:title", content: "Launchpad — Student Business Plan Agent" },
      {
        property: "og:description",
        content:
          "Enter an industry and a country, and Launchpad drafts a realistic business plan built for students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>([]);

  useEffect(() => {
    setThreads(readThreads());
  }, []);

  const canSubmit = industry.trim().length > 0 && country.trim().length > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const thread = createThread(industry.trim(), country.trim());
    navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
  }

  function handleDelete(id: string) {
    deleteThread(id);
    setThreads(readThreads());
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
        <header className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Launchpad</h1>
            <p className="text-sm text-muted-foreground">Student business plan agent</p>
          </div>
        </header>

        <main className="mt-12 flex-1">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            What do you want to build, and where?
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Tell Launchpad your industry and country. It will draft a realistic business plan —
            market, customers, costs and next steps — tailored to a student budget.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="e.g. Coffee shop, tutoring app, fashion resale"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="e.g. United Arab Emirates, Brazil, Germany"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={!canSubmit}>
              Generate my business plan
              <ArrowRight className="size-4" />
            </Button>
          </form>

          {threads.length > 0 && (
            <section className="mt-12">
              <h3 className="text-sm font-medium text-muted-foreground">Your plans</h3>
              <ul className="mt-3 space-y-2">
                {threads.map((thread) => (
                  <li
                    key={thread.id}
                    className="group flex items-center gap-2 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: thread.id }}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-medium">{thread.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(thread.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {thread.messages.length} message{thread.messages.length === 1 ? "" : "s"}
                      </p>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Delete ${thread.title}`}
                      onClick={() => handleDelete(thread.id)}
                      className="rounded-md p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Plans are saved in this browser only.
        </footer>
      </div>
    </div>
  );
}
