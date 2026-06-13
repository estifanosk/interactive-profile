"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "What kind of backend work has Estifanos done?",
  "Which personal projects best show how Estifanos builds?",
  "Where would he be strongest on a team?",
  "Tell me about Genzeb and AlgoLens.",
];

const personalProjects = [
  {
    name: "Genzeb",
    href: "https://github.com/estifanosk/genzeb",
    summary:
      "Local-first desktop expense tracker with plain CSV storage, receipt workflows, categorization, and optional AI/MCP integrations.",
    tags: ["Electron", "React", "TypeScript", "Local-first", "MCP"],
    question: "What does Genzeb show about Estifanos's engineering style?",
  },
  {
    name: "AlgoLens",
    href: "https://github.com/estifanosk/algolens",
    summary:
      "Visual coding interview companion for algorithm patterns, walkthroughs, guided hints, and practice flows.",
    tags: ["Next.js", "TypeScript", "Learning tools", "Visualization"],
    question: "How does AlgoLens demonstrate product and frontend thinking?",
  },
  {
    name: "Interactive Profile",
    href: "https://github.com/estifanosk/interactive-profile",
    summary:
      "This AI-backed career profile, built as a practical experiment in grounded resume Q&A, content retrieval, and deployment.",
    tags: ["Next.js", "OpenAI", "Vercel Blob", "Rate limiting"],
    question: "What does this interactive profile project demonstrate?",
  },
  {
    name: "HardHat",
    href: "https://github.com/estifanosk/hardhat",
    summary:
      "QR-based construction compliance prototype for worker certifications, equipment readiness, daily inspections, and JHA sign-off.",
    tags: ["Next.js", "Supabase", "Compliance", "Workflow design"],
    question: "What kind of product problem does HardHat explore?",
  },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `This is an experimental portfolio assistant built by **Estifanos Kidane**. Ask about his work, projects, skills, or engineering background.

Highlights:

- Technical Lead / Architect at Capital One (2021-2025); led speech analytics, NLP pipelines, and MLOps for card contact-center operations.
- Senior Software Engineer at Expedia Group (2019-2020); built conversation routing and enrichment services for Expedia's virtual agent platform.
- Senior Software Engineer at Microsoft Azure Blockchain (2017-2019); built provisioning and ops automation for enterprise Ethereum consortium networks on [Azure Blockchain Service](https://github.com/Azure-Samples/blockchain/blob/master/abs/migration-guide.md).
- Senior Software Engineer at SAP Concur (2014-2017); helped drive monolith-to-microservices migration and built Kafka platform capabilities for [SAP Concur](https://www.concur.com/).
- Software Design Engineer at Microsoft (2009-2013); worked on [Microsoft Advertising Editor](https://about.ads.microsoft.com/en-us/solutions/tools/microsoft-advertising-editor) (formerly Bing Ads Editor), shipping desktop features and sync workflows.
- Software Engineer / Support Engineer in Addis Ababa, Ethiopia (2002-2007); built government finance and court systems with Java/J2EE, Struts, WebSphere, VB.NET/WinForms, and SQL Server.

Try one of the starter questions below or ask directly.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    const key = "chat_session_id";
    const existing = window.localStorage.getItem(key);
    if (existing) {
      sessionIdRef.current = existing;
      return;
    }

    const created = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, created);
    sessionIdRef.current = created;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmedContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Cancel any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          sessionId: sessionIdRef.current || undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment.");
        }
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setMessages((prev) => {
                  const updated = prev.slice(0, -1);
                  const last = prev[prev.length - 1];
                  if (last.role === "assistant") {
                    return [...updated, { ...last, content: last.content + parsed.content }];
                  }
                  return prev;
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-lg">
              EK
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                Estifanos Kidane
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Software Engineer / AI Portfolio Experiment
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="px-4 py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === "user"
                    ? "rounded-2xl rounded-br-md bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-white shadow-md"
                    : "rounded-2xl rounded-bl-md bg-white px-5 py-4 text-slate-700 shadow-md ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm prose-slate max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:my-2 prose-ul:my-2 prose-li:my-0 prose-headings:my-2 prose-strong:text-slate-900 dark:prose-strong:text-white [&_li+li]:mt-3 [&_li+li]:border-t [&_li+li]:border-slate-200 [&_li+li]:pt-3 dark:[&_li+li]:border-slate-700">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="leading-relaxed">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {messages.length === 1 && (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm leading-relaxed text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-slate-800 dark:focus:ring-blue-900"
                    disabled={isLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>

              <section aria-labelledby="personal-projects" className="space-y-3">
                <div>
                  <h2
                    id="personal-projects"
                    className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    Personal projects
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Side projects Estifanos uses to explore product ideas, AI-assisted workflows,
                    and practical engineering tradeoffs.
                  </p>
                </div>

                <div className="grid gap-3">
                  {personalProjects.map((project) => (
                    <article
                      key={project.name}
                      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            <a
                              href={project.href}
                              target="_blank"
                              rel="noreferrer"
                              className="underline-offset-4 hover:underline"
                            >
                              {project.name}
                            </a>
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {project.summary}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendMessage(project.question)}
                          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-slate-800 dark:focus:ring-blue-900"
                          disabled={isLoading}
                        >
                          Ask
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white px-5 py-4 shadow-md ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about experience, skills, projects..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 shadow-sm transition-shadow focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:ring-blue-900"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md disabled:hover:brightness-100"
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            A learning project using curated resume context, OpenAI, Vercel Blob, and rate limiting.
          </p>
        </form>
      </footer>
    </div>
  );
}
