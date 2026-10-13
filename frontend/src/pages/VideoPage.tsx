import { useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiFileText,
  FiList,
  FiPlay,
  FiRotateCcw,
  FiSkipForward,
  FiZap,
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AskMafia from "../components/AskMafia";
import { EmptyState, IconBadge, ListSkeleton } from "../components/ui";
import { errorMessage } from "../lib/api";
import { formatDate, formatDuration } from "../lib/format";
import {
  useAiEnabled,
  useGenerateSummary,
  useToggleVideo,
  useUpdateVideo,
  useVideo,
  useVideoSummary,
} from "../lib/queries";
import type { Video } from "../lib/types";

export default function VideoPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useVideo(id);

  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError || !data) {
    return (
      <EmptyState
        icon={FiClock}
        title="Video not found"
        text="It may have been removed along with its playlist."
        action={
          <Link to="/playlists" className="btn-primary">
            Back to playlists
          </Link>
        }
      />
    );
  }
  return <VideoDetail video={data.video} playlist={data.playlist} />;
}

/** Full-resolution YouTube thumbnail, falling back to smaller sizes when a video has no maxres image. */
const THUMB_SIZES = ["maxresdefault", "hqdefault", "mqdefault"];

function Thumbnail({
  youtubeVideoId,
  fallback,
}: {
  youtubeVideoId: string;
  fallback: string;
}) {
  const [size, setSize] = useState(0);
  const src =
    size < THUMB_SIZES.length
      ? `https://i.ytimg.com/vi/${youtubeVideoId}/${THUMB_SIZES[size]}.jpg`
      : fallback;
  return (
    <img
      src={src}
      alt=""
      onError={() => size < THUMB_SIZES.length && setSize(size + 1)}
      className="size-full object-cover transition duration-300 group-hover:scale-105"
    />
  );
}

function VideoDetail({
  video,
  playlist,
}: {
  video: Video;
  playlist: { _id: string; title: string } | null;
}) {
  const toggle = useToggleVideo();
  const update = useUpdateVideo();
  const aiEnabled = !!useAiEnabled().data;
  const summary = useVideoSummary(video._id, aiEnabled);
  const generate = useGenerateSummary(video._id);
  const [note, setNote] = useState(video.note);
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.youtubeVideoId}`;

  const saveNote = () =>
    update.mutate(
      { id: video._id, patch: { note } },
      { onSuccess: () => toast.success("Note saved") },
    );

  return (
    <div className="animate-fade-up space-y-5">
      <Link
        to={playlist ? `/playlists/${playlist._id}` : "/playlists"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <FiArrowLeft className="size-4" /> {playlist?.title ?? "Playlists"}
      </Link>

      <section className="card flex flex-col gap-5 sm:flex-row sm:items-center">
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Watch on YouTube"
          className="group relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200 sm:w-56"
        >
          <Thumbnail
            youtubeVideoId={video.youtubeVideoId}
            fallback={video.thumbnail}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/10 transition group-hover:bg-slate-900/30">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-indigo-600 shadow-md">
              <FiPlay className="size-4 translate-x-px" />
            </span>
          </span>
        </a>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <h1
              className={`text-lg font-semibold leading-snug text-slate-900 ${video.skipped ? "line-through opacity-60" : ""}`}
            >
              {video.title}
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                <FiClock className="size-3" />{" "}
                {formatDuration(video.durationSec)}
              </span>
              {video.completed && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  Completed
                </span>
              )}
              {video.skipped && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">
                  Skipped
                </span>
              )}
              {!video.completed && !video.skipped && video.scheduledDate && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                  Planned {formatDate(video.scheduledDate)}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <FiExternalLink className="size-4" /> Watch on YouTube
            </a>
            <button
              className="btn-outline"
              disabled={toggle.isPending || video.skipped}
              onClick={() =>
                toggle.mutate({ id: video._id, completed: !video.completed })
              }
            >
              {video.completed ? (
                <FiRotateCcw className="size-4" />
              ) : (
                <FiCheck className="size-4" />
              )}
              {video.completed ? "Mark not completed" : "Mark completed"}
            </button>
            <button
              className="btn-outline"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  id: video._id,
                  patch: { skipped: !video.skipped },
                })
              }
            >
              {video.skipped ? (
                <FiRotateCcw className="size-4" />
              ) : (
                <FiSkipForward className="size-4" />
              )}
              {video.skipped ? "Restore" : "Skip"}
            </button>
          </div>
        </div>
      </section>

      {/*
        xl+: summary and notes on the left, AskMafia sticky on the right.
        Smaller screens stack summary, AskMafia, notes: the left wrapper is `contents` there, so `order` applies to its children.
      */}
      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] xl:items-start">
        <div className="contents xl:flex xl:flex-col xl:gap-5">
          <section className="card order-1 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <IconBadge icon={FiZap} tone="amber" className="!size-9" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  AI summary
                </h2>
                <p className="text-xs text-slate-500">
                  From the video's captions, in English
                </p>
              </div>
              {aiEnabled && (
                <button
                  className="btn-primary btn-sm"
                  disabled={generate.isPending || !!summary.data}
                  onClick={() => generate.mutate()}
                >
                  {generate.isPending
                    ? "Summarising…"
                    : summary.data
                      ? "Summary ready"
                      : "Generate summary"}
                </button>
              )}
            </div>

            {aiEnabled ? (
              <>
                {summary.data ? (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FiFileText className="size-4 text-indigo-600" />{" "}
                        Overview
                      </h3>
                      <div className="space-y-4 text-[15px] leading-7 text-slate-700">
                        {summary.data.summary
                          .split(/\n{2,}|\n/)
                          .filter(Boolean)
                          .map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                      </div>
                    </div>
                    <div className="space-y-3 border-t border-slate-200 pt-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FiList className="size-4 text-indigo-600" /> Key points
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {summary.data.keyPoints.length}
                        </span>
                      </h3>
                      <ul className="space-y-3 text-[15px] leading-6 text-slate-700">
                        {summary.data.keyPoints.map((p, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3.5 py-3 text-slate-800"
                          >
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                              {i + 1}
                            </span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-100 p-6 text-sm text-slate-500">
                    {summary.isLoading
                      ? "Loading…"
                      : "Press “Generate summary” and it will appear here."}
                  </p>
                )}
                {generate.isError && (
                  <p className="text-sm text-red-600">
                    {errorMessage(generate.error)}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  AI summaries can contain mistakes.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                AI summaries are not enabled on this server.
              </p>
            )}
          </section>

          <section className="card order-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <IconBadge icon={FiEdit3} tone="indigo" className="!size-9" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-slate-900">
                  My notes
                </h2>
                <p className="text-xs text-slate-500">{note.length} / 5000</p>
              </div>
              <button
                className="btn-primary btn-sm"
                disabled={update.isPending || note === video.note}
                onClick={saveNote}
              >
                {update.isPending ? "Saving…" : "Save notes"}
              </button>
            </div>
            <textarea
              className="input min-h-[20rem] flex-1 resize-y leading-relaxed"
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Key takeaways, timestamps, questions…"
            />
          </section>
        </div>

        {aiEnabled && (
          <aside className="order-2 xl:sticky xl:top-8">
            <AskMafia
              videoId={video._id}
              youtubeVideoId={video.youtubeVideoId}
              durationSec={video.durationSec}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
