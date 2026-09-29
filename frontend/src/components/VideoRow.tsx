import { useState } from 'react'
import { FiArrowDown, FiArrowUp, FiCheck, FiClock, FiEdit3, FiRotateCcw, FiSkipForward } from 'react-icons/fi'
import { toast } from 'react-toastify'
import { formatDuration } from '../lib/format'
import { useToggleVideo, useUpdateVideo } from '../lib/queries'
import type { Video } from '../lib/types'

interface Manage {
  canUp: boolean
  canDown: boolean
  busy: boolean
  onMove: (direction: -1 | 1) => void
}

const iconBtn =
  'relative flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent'

export function VideoRow({ video, meta, manage }: { video: Video; meta?: string; manage?: Manage }) {
  const toggle = useToggleVideo()
  const update = useUpdateVideo()
  const [noteOpen, setNoteOpen] = useState(false)
  const [draft, setDraft] = useState(video.note)

  const saveNote = () =>
    update.mutate(
      { id: video._id, patch: { note: draft } },
      {
        onSuccess: () => {
          setNoteOpen(false)
          toast.success('Note saved')
        },
      },
    )

  const actions = (
    <>
      <button
        aria-label="Notes"
        title="Notes"
        className={`${iconBtn} ${video.note ? '!text-indigo-600' : ''}`}
        onClick={() => {
          setDraft(video.note)
          setNoteOpen((o) => !o)
        }}
      >
        <FiEdit3 className="size-4" />
        {video.note && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-indigo-500" />}
      </button>
      {manage && (
        <>
          <button aria-label="Move up" title="Move up" className={iconBtn} disabled={!manage.canUp || manage.busy} onClick={() => manage.onMove(-1)}>
            <FiArrowUp className="size-4" />
          </button>
          <button aria-label="Move down" title="Move down" className={iconBtn} disabled={!manage.canDown || manage.busy} onClick={() => manage.onMove(1)}>
            <FiArrowDown className="size-4" />
          </button>
          <button
            aria-label={video.skipped ? 'Restore video' : 'Skip video'}
            title={video.skipped ? 'Restore' : 'Skip'}
            className={iconBtn}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: video._id, patch: { skipped: !video.skipped } })}
          >
            {video.skipped ? <FiRotateCcw className="size-4" /> : <FiSkipForward className="size-4" />}
          </button>
        </>
      )}
    </>
  )

  return (
    <li className={`rounded-xl px-2 py-2.5 transition hover:bg-slate-50 ${video.skipped ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          aria-label={video.completed ? 'Mark as not completed' : 'Mark as completed'}
          disabled={toggle.isPending || video.skipped}
          onClick={() => toggle.mutate({ id: video._id, completed: !video.completed })}
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition duration-200 ${
            video.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-400'
          }`}
        >
          {video.completed && <FiCheck className="size-3.5" strokeWidth={3} />}
        </button>

        {video.thumbnail && (
          <img src={video.thumbnail} alt="" loading="lazy" className="hidden h-12 w-[86px] shrink-0 rounded-lg object-cover sm:block" />
        )}

        <div className="min-w-0 flex-1">
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
            target="_blank"
            rel="noreferrer"
            className={`line-clamp-2 text-sm font-medium leading-snug hover:text-indigo-600 ${
              video.completed || video.skipped ? 'text-slate-400 line-through' : 'text-slate-800'
            }`}
          >
            {video.title}
          </a>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <FiClock className="size-3" />
              {formatDuration(video.durationSec)}
            </span>
            {(video.skipped || meta) && <span className="truncate">{video.skipped ? 'Skipped' : meta}</span>}
          </p>
          {manage && <div className="-ml-2 mt-1 flex sm:hidden">{actions}</div>}
        </div>

        <div className={`shrink-0 items-center ${manage ? 'hidden sm:flex' : 'flex'}`}>{actions}</div>
      </div>

      {noteOpen && (
        <div className="animate-fade-up mt-2 space-y-2 pl-9">
          <textarea
            className="input min-h-24"
            maxLength={5000}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Key takeaways, timestamps, questions…"
          />
          <div className="flex gap-2">
            <button className="btn-primary btn-sm" disabled={update.isPending || draft === video.note} onClick={saveNote}>
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setNoteOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
