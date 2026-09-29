import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const API = "https://www.googleapis.com/youtube/v3";

export interface YtPlaylist {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

export interface YtVideo {
  youtubeVideoId: string;
  title: string;
  thumbnail: string;
  durationSec: number;
  position: number;
}

export const parsePlaylistId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^(PL|UU|LL|FL|OL|RD)[\w-]{10,}$/.test(trimmed)) return trimmed;
  try {
    return new URL(trimmed).searchParams.get("list");
  } catch {
    return null;
  }
};

export const parseIsoDuration = (iso: string): number => {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [d, h, min, s] = m.slice(1).map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
};

const get = async <T>(path: string, params: Record<string, string>): Promise<T> => {
  if (!env.youtubeApiKey) throw new AppError(500, "YOUTUBE_API_KEY is not configured");
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key: env.youtubeApiKey })}`;
  const res = await fetch(url);
  if (res.status === 404) throw new AppError(404, "Playlist not found");
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new AppError(502, "YouTube rejected the API key or quota. Check YOUTUBE_API_KEY.");
  }
  if (!res.ok) throw new AppError(502, `YouTube API error (${res.status})`);
  return (await res.json()) as T;
};

interface Thumbs {
  medium?: { url: string };
  default?: { url: string };
}

export const youtubeService = {
  async fetchPlaylist(playlistId: string): Promise<{ playlist: YtPlaylist; videos: YtVideo[] }> {
    const meta = await get<{
      items: { snippet: { title: string; channelTitle: string; thumbnails: Thumbs } }[];
    }>("playlists", { part: "snippet", id: playlistId });
    const snippet = meta.items[0]?.snippet;
    if (!snippet) throw new AppError(404, "Playlist not found or is private");

    const items: { id: string; title: string; thumbnail: string }[] = [];
    let pageToken = "";
    do {
      const page = await get<{
        nextPageToken?: string;
        items: {
          snippet: { title: string; thumbnails?: Thumbs };
          contentDetails: { videoId: string };
        }[];
      }>("playlistItems", {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: "50",
        ...(pageToken && { pageToken }),
      });
      for (const it of page.items) {
        items.push({
          id: it.contentDetails.videoId,
          title: it.snippet.title,
          thumbnail: it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? "",
        });
      }
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);

    // Durations come from a separate endpoint, 50 ids per call. Private or deleted
    // videos are absent from that response, so they are skipped here.
    const durations = new Map<string, number>();
    for (let i = 0; i < items.length; i += 50) {
      const ids = items.slice(i, i + 50).map((v) => v.id);
      const res = await get<{ items: { id: string; contentDetails: { duration: string } }[] }>(
        "videos",
        { part: "contentDetails", id: ids.join(",") },
      );
      for (const v of res.items) durations.set(v.id, parseIsoDuration(v.contentDetails.duration));
    }

    const videos = items
      .filter((v) => durations.has(v.id))
      .map<YtVideo>((v, position) => ({
        youtubeVideoId: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        durationSec: durations.get(v.id)!,
        position,
      }));

    return {
      playlist: {
        id: playlistId,
        title: snippet.title,
        channel: snippet.channelTitle,
        thumbnail: snippet.thumbnails.medium?.url ?? snippet.thumbnails.default?.url ?? "",
      },
      videos,
    };
  },
};
