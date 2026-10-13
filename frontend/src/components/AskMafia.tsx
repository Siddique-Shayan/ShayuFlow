import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  FiAlertCircle,
  FiCheck,
  FiCopy,
  FiCornerDownLeft,
  FiDatabase,
  FiFileText,
  FiMessageCircle,
  FiPlay,
  FiRotateCw,
  FiSend,
  FiTrash2,
  FiZap,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { errorMessage } from "../lib/api";
import { formatClock } from "../lib/format";
import {
  useAskMafia,
  useBuildKnowledge,
  useClearChat,
  useVideoChat,
} from "../lib/queries";
import type { ChatMessage } from "../lib/types";

/*
 * Colours stick to tokens the dark theme re-maps (slate, indigo-50..200/600/700, amber, emerald, red)
 * and var(--surface) for cards. bg-white is never used: it stays white in dark mode.
 */

const STARTERS = [
  "Explain the main idea simply",
  "What examples does the video use?",
  "Quiz me with 3 questions",
];
const MAX_QUESTION = 1000;
const TIME_RE = /(\b\d{1,2}:\d{2}(?::\d{2})?\b)/g;

const toSec = (t: string) =>
  t.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface Props {
  videoId: string;
  youtubeVideoId: string;
  durationSec: number;
}

/** AskMafia: a chatbot that answers questions using only this video's saved knowledge base. */
export default function AskMafia({
  videoId,
  youtubeVideoId,
  durationSec,
}: Props) {
  const chat = useVideoChat(videoId, true);
  const build = useBuildKnowledge(videoId);
  const ask = useAskMafia(videoId);
  const clear = useClearChat(videoId);
  const [question, setQuestion] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const data = chat.data;
  const messages = data?.messages ?? [];
  const pendingQuestion = ask.isPending ? ask.variables : null;
  const failedQuestion = ask.isError ? ask.variables : null;
  const outOfQuota = !!data && data.remaining <= 0;
  const lastAssistant = messages.findLastIndex((m) => m.role === "assistant");

  const watchAt = (sec: number) =>
    `https://www.youtube.com/watch?v=${youtubeVideoId}&t=${Math.floor(sec)}s`;

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, pendingQuestion, failedQuestion]);

  // Grow the composer with its content, up to its max height.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || ask.isPending || outOfQuota) return;
    setQuestion("");
    ask.mutate(q, { onError: () => setQuestion((current) => current || q) });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(question);
  };
  const clearChat = () => {
    clear.mutate(undefined, { onSuccess: () => ask.reset() });
    setConfirmClear(false);
  };

  /** Turns "12:34" inside answer text into a link that opens the video at that moment. */
  const linkify = (text: string): ReactNode[] =>
    text.split(TIME_RE).map((part, i) => {
      if (i % 2 === 0) return part;
      const sec = toSec(part);
      if (durationSec > 0 && sec > durationSec) return part;
      return (
        <a
          key={i}
          href={watchAt(sec)}
          target="_blank"
          rel="noreferrer"
          className="rounded bg-indigo-50 px-1 font-medium text-indigo-700 hover:underline"
        >
          {part}
        </a>
      );
    });

  return (
    <section className="card flex h-[36rem] max-h-[85dvh] flex-col !p-0 xl:h-[calc(100dvh-4rem)] xl:max-h-none">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <BotAvatar size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            AskMafia
            {data?.ready && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Ready
              </span>
            )}
          </h2>
          <p className="truncate text-xs text-slate-500">
            {data?.ready
              ? `Answers only from this video · ${data.remaining}/${data.dailyLimit} left today`
              : "Your study buddy for this video"}
          </p>
        </div>
        {data?.ready &&
          messages.length > 0 &&
          (confirmClear ? (
            <div className="flex items-center gap-1">
              <button
                className="btn-danger btn-sm"
                disabled={clear.isPending}
                onClick={clearChat}
              >
                Clear
              </button>
              <button
                className="btn-ghost btn-sm"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="btn-ghost btn-sm"
              onClick={() => setConfirmClear(true)}
              aria-label="Clear chat"
              title="Clear chat"
            >
              <FiTrash2 className="size-4" />
            </button>
          ))}
      </div>

      {/* Body */}
      <div
        ref={listRef}
        className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4"
      >
        {chat.isLoading ? (
          <div className="space-y-3">
            <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-slate-100" />
            <div className="ml-auto h-8 w-1/2 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 w-3/4 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : !data?.ready ? (
          <BuildPrompt
            pending={build.isPending}
            error={build.isError ? errorMessage(build.error) : null}
            onBuild={() => build.mutate()}
          />
        ) : (
          <>
            {messages.length === 0 && !pendingQuestion && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <BotAvatar size="xl" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Ask me anything about this video
                  </p>
                  <p className="text-xs text-slate-500">
                    I only answer from its summary and transcript.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {STARTERS.map((s) => (
                    <SuggestionChip
                      key={s}
                      text={s}
                      disabled={outOfQuota}
                      onClick={() => send(s)}
                    />
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <UserBubble
                  key={i}
                  text={m.content}
                  time={clockTime(m.createdAt)}
                />
              ) : (
                <AssistantMessage
                  key={i}
                  message={m}
                  linkify={linkify}
                  watchAt={watchAt}
                  showFollowUps={i === lastAssistant && !pendingQuestion}
                  disabled={ask.isPending || outOfQuota}
                  onFollowUp={send}
                />
              ),
            )}

            {pendingQuestion && (
              <>
                <UserBubble text={pendingQuestion} />
                <TypingIndicator />
              </>
            )}

            {failedQuestion && (
              <div className="flex flex-col items-end gap-1.5">
                <UserBubble text={failedQuestion} failed />
                <p className="flex items-center gap-2 text-xs text-red-600">
                  <FiAlertCircle className="size-3.5" />{" "}
                  {errorMessage(ask.error)}
                  <button
                    className="font-semibold underline"
                    onClick={() => send(failedQuestion)}
                  >
                    <FiRotateCw className="mr-0.5 inline size-3" /> Retry
                  </button>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      {data?.ready && (
        <form
          onSubmit={onSubmit}
          className="space-y-1.5 border-t border-slate-200 px-3 py-3 sm:px-4"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-[var(--surface)] p-1.5 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
            <textarea
              ref={inputRef}
              className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
              rows={1}
              maxLength={MAX_QUESTION}
              value={question}
              disabled={outOfQuota}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(question);
                }
              }}
              placeholder={
                outOfQuota
                  ? "Daily question limit reached"
                  : "Ask about this video…"
              }
            />
            <button
              type="submit"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              disabled={ask.isPending || !question.trim() || outOfQuota}
              aria-label="Send"
            >
              <FiSend className="size-4" />
            </button>
          </div>
          <p className="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <FiCornerDownLeft className="size-3" /> Enter to send ·
              Shift+Enter for a new line
            </span>
            {question.length > MAX_QUESTION * 0.8 && (
              <span>
                {question.length}/{MAX_QUESTION}
              </span>
            )}
          </p>
        </form>
      )}
    </section>
  );
}

function BotAvatar({ size = "md" }: { size?: "md" | "lg" | "xl" }) {
  const box = { md: "size-7", lg: "size-9", xl: "size-12" }[size];
  const icon = { md: "size-3.5", lg: "size-4", xl: "size-5" }[size];
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/30 dark:shadow-none`}
    >
      <FiMessageCircle className={icon} />
    </span>
  );
}

function BuildPrompt({
  pending,
  error,
  onBuild,
}: {
  pending: boolean;
  error: string | null;
  onBuild: () => void;
}) {
  const steps = [
    {
      icon: FiFileText,
      text: "Saves the video's detailed summary and full transcript",
    },
    {
      icon: FiMessageCircle,
      text: "Ask questions and get answers grounded in the video",
    },
    { icon: FiPlay, text: "Jump to the exact moment each answer comes from" },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-4 text-center">
      <BotAvatar size="xl" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">
          Set up AskMafia for this video
        </p>
        <p className="text-xs text-slate-500">
          One click, then chat about anything in it.
        </p>
      </div>
      <ul className="w-full space-y-2 text-left">
        {steps.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-3 rounded-xl bg-[var(--surface)] px-3 py-2.5 text-xs text-slate-600 ring-1 ring-slate-200"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Icon className="size-3.5" />
            </span>
            {text}
          </li>
        ))}
      </ul>
      <button
        className="btn-primary w-full"
        disabled={pending}
        onClick={onBuild}
      >
        <FiDatabase className={`size-4 ${pending ? "animate-pulse" : ""}`} />
        {pending ? "Building knowledge base…" : "Build knowledge base"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function UserBubble({
  text,
  time,
  failed = false,
}: {
  text: string;
  time?: string;
  failed?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <p
        className={`max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-6 text-white dark:bg-indigo-500 ${
          failed ? "bg-indigo-600 opacity-60" : "bg-indigo-600"
        }`}
      >
        {text}
      </p>
      {time && <span className="px-1 text-[10px] text-slate-400">{time}</span>}
    </div>
  );
}

function AssistantMessage({
  message,
  linkify,
  watchAt,
  showFollowUps,
  disabled,
  onFollowUp,
}: {
  message: ChatMessage;
  linkify: (text: string) => ReactNode[];
  watchAt: (sec: number) => string;
  showFollowUps: boolean;
  disabled: boolean;
  onFollowUp: (q: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const d = message.details;
  const covered = d?.covered !== false;

  const copy = async () => {
    const text = [
      message.content,
      ...(d?.points ?? []).map((p) => `• ${p}`),
      ...(d?.moments ?? []).map((m) => `${formatClock(m.sec)} ${m.label}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <div className="min-w-0 flex-1 space-y-2">
        <div
          className={`space-y-3 rounded-2xl rounded-tl-md px-3.5 py-3 text-sm leading-6 ring-1 ${
            covered
              ? "bg-[var(--surface)] text-slate-800 ring-slate-200"
              : "bg-amber-50 text-amber-900 ring-amber-200"
          }`}
        >
          <p className="flex gap-2 whitespace-pre-line">
            {!covered && (
              <FiAlertCircle className="mt-1 size-4 shrink-0 text-amber-600" />
            )}
            <span>{linkify(message.content)}</span>
          </p>

          {!!d?.points.length && (
            <ol className="space-y-1.5">
              {d.points.map((p, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-700">
                    {i + 1}
                  </span>
                  <span className="min-w-0">{linkify(p)}</span>
                </li>
              ))}
            </ol>
          )}

          {!!d?.moments.length && (
            <div className="space-y-1.5 border-t border-slate-200 pt-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                In the video
              </p>
              <div className="flex flex-col gap-1.5">
                {d.moments.map((m) => (
                  <a
                    key={m.sec}
                    href={watchAt(m.sec)}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200 transition hover:ring-indigo-200"
                  >
                    <FiPlay className="size-3 shrink-0 text-indigo-600" />
                    <span className="font-semibold tabular-nums text-indigo-700">
                      {formatClock(m.sec)}
                    </span>
                    <span className="min-w-0 truncate">{m.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400">
          <span>{clockTime(message.createdAt)}</span>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 transition hover:text-slate-600"
            aria-label="Copy answer"
          >
            {copied ? (
              <FiCheck className="size-3" />
            ) : (
              <FiCopy className="size-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {showFollowUps && !!d?.followUps.length && (
          <div className="flex flex-col gap-1.5 pt-1">
            {d.followUps.map((q) => (
              <SuggestionChip
                key={q}
                text={q}
                disabled={disabled}
                onClick={() => onFollowUp(q)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionChip({
  text,
  disabled,
  onClick,
}: {
  text: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-left text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:text-indigo-700 hover:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FiZap className="size-3.5 shrink-0 text-indigo-600" />
      {text}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <div
        className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-[var(--surface)] px-4 py-3.5 ring-1 ring-slate-200"
        aria-label="AskMafia is thinking"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
