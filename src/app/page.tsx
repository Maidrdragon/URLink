
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import Header, { type SortOrder } from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import FavoriteButton from "../../components/FavoriteButton";
import { deletePost, getPosts, type PostItem } from "../lib/posts";
import {
  getPlaylistPostIds,
  getPlaylists,
  type Playlist,
} from "../lib/playlists";

const MAX_SEARCH_KEYWORDS = 5;

function parseSearchKeywords(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const hashtags = Array.from(trimmed.matchAll(/#([^\s#、,，]+)/g))
    .map((match) => match[1]?.trim())
    .filter((word): word is string => Boolean(word));
  if (hashtags.length) return [...new Set(hashtags)].slice(0, MAX_SEARCH_KEYWORDS);
  const words = trimmed.split(/[、,，]+/).map((word) => word.trim()).filter(Boolean);
  return [...new Set(words)].slice(0, MAX_SEARCH_KEYWORDS);
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "youtu.be") return parsed.pathname.split("/")[1] || null;
    if (host !== "youtube.com" && !host.endsWith(".youtube.com")) return null;
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(segments[0])) return segments[1] || null;
    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null;
}

function getService(url: string): "youtube" | "twitch" | "other" {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) return "youtube";
    if (host === "twitch.tv" || host.endsWith(".twitch.tv")) return "twitch";
  } catch {
    // Invalid URL: show as a generic link.
  }
  return "other";
}

export default function Home() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("all");
  const [playlistPostIds, setPlaylistPostIds] = useState<string[]>([]);
  const [searchWord, setSearchWord] = useState("");
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SortOrder>("date");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setCurrentUserId(user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setCurrentUserId(session?.user?.id ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const loadPosts = useCallback(async () => {
    try {
      setError("");
      const savedPosts = await getPosts();
      setPosts(savedPosts);
    } catch (cause) {
      console.error("投稿の読み込みに失敗:", cause);
      setError("投稿を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
    const onUpdated = () => void loadPosts();
    window.addEventListener("posts-updated", onUpdated);
    return () => window.removeEventListener("posts-updated", onUpdated);
  }, [loadPosts]);

  useEffect(() => {
    const load = async () => {
      try { setPlaylists(await getPlaylists()); }
      catch (cause) { console.error("プレイリスト読み込みエラー:", cause); }
    };
    void load();
    window.addEventListener("playlists-updated", load);
    return () => window.removeEventListener("playlists-updated", load);
  }, []);

  useEffect(() => {
    let active = true;
    if (selectedPlaylistId === "all") {
      setPlaylistPostIds([]);
      return;
    }
    void getPlaylistPostIds(selectedPlaylistId)
      .then((ids) => { if (active) setPlaylistPostIds(ids); })
      .catch((cause) => console.error("プレイリスト内の投稿取得エラー:", cause));
    return () => { active = false; };
  }, [selectedPlaylistId]);

  const visiblePosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      if (selectedPlaylistId !== "all" && !playlistPostIds.includes(post.id)) return false;
      if (!searchKeywords.length) return true;
      const searchable = [post.title, post.tag, post.category, post.url]
        .filter(Boolean).join(" ").toLocaleLowerCase();
      return searchKeywords.some((keyword) => searchable.includes(keyword.toLocaleLowerCase()));
    });
    // PostItem has no view count; 'viewCount' falls back to newest-first.
    return [...filtered].sort((a, b) => {
      if (selectedOrder === "relevance" && searchKeywords.length) {
        const score = (post: PostItem) => searchKeywords.reduce((sum, keyword) => {
          const word = keyword.toLocaleLowerCase();
          return sum + (post.title.toLocaleLowerCase().includes(word) ? 3 : 0)
            + (post.tag.toLocaleLowerCase().includes(word) ? 2 : 0)
            + (post.category.toLocaleLowerCase().includes(word) ? 1 : 0);
        }, 0);
        const difference = score(b) - score(a);
        if (difference !== 0) return difference;
      }
      return b.createdAt - a.createdAt;
    });
  }, [posts, playlistPostIds, selectedPlaylistId, searchKeywords, selectedOrder]);

  function handleSearch(input: string, order: SortOrder) {
    setSearchWord(input.trim());
    setSearchKeywords(parseSearchKeywords(input));
    setSelectedOrder(order);
  }

  async function handleDeletePost(id: string) {
    if (!currentUserId || !posts.some((post) => post.id === id && post.userId === currentUserId)) {
      window.alert("自分の投稿だけ削除できます。");
      return;
    }
    if (!window.confirm("この投稿を削除しますか？")) return;
    try {
      await deletePost(id);
      await loadPosts();
    } catch (cause) {
      console.error("削除エラー:", cause);
      window.alert(cause instanceof Error ? cause.message : "投稿を削除できませんでした。");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <Header onSearch={handleSearch} />
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center" aria-hidden="true">
        <img src="/URLink.png" alt="" className="w-[75vw] max-w-[1300px] select-none opacity-[0.05]" />
      </div>
      <div className="relative z-10 mx-auto flex max-w-[1700px] gap-6 px-6 py-8">
        <aside className="w-60 flex-shrink-0">
          <div className="sticky top-6 rounded-2xl bg-white p-4 shadow-sm">
            <Sidebar />
            <h2 className="mb-4 text-lg font-extrabold text-slate-950"> マイリスト</h2>
            <div className="space-y-2">
              <button type="button" onClick={() => setSelectedPlaylistId("all")}
                className={`w-full rounded-xl px-4 py-3 text-left font-extrabold transition ${selectedPlaylistId === "all" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                 すべて
              </button>
              {playlists.map((playlist) => (
                <button key={playlist.id} type="button" onClick={() => setSelectedPlaylistId(playlist.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left font-bold transition ${selectedPlaylistId === playlist.id ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                  {playlist.name}
                </button>
              ))}
            </div>
            <a href="/post" className="mt-5 block rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-center font-extrabold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
              ＋ 投稿する
            </a>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <section className="mb-10">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-950">{searchWord ? `「${searchWord}」の投稿検索結果` : " 新着投稿"}</h1>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">{visiblePosts.length}件</span>
            </div>
            <p className="mb-6 font-semibold text-slate-600">URLinkに登録されたURLを、タイトル・タグ・カテゴリーから探せます。</p>
            {loading && <p className="py-12 text-center font-bold text-slate-700">投稿を読み込み中...</p>}
            {error && <p className="mb-6 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
            {!loading && !error && visiblePosts.length === 0 && (
              <div className="rounded-2xl bg-white p-10 text-center font-bold text-slate-600">
                {searchWord ? "条件に合う投稿が見つかりませんでした。" : "表示できる投稿がありません。URLを投稿してみましょう。"}
              </div>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visiblePosts.map((post) => {
                const thumbnail = getYouTubeThumbnail(post.url);
                const service = getService(post.url);
                return (
                  <article key={post.id} className="overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="block">
                      {thumbnail ? (
                        <img src={thumbnail} alt={post.title} className="aspect-video w-full bg-slate-600 object-cover" />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-slate-700 text-4xl font-extrabold text-white">{service === "twitch" ? "Twitch" : "URL"}</div>
                      )}
                      <div className="p-4">
                        <h2 className="line-clamp-3 text-base font-extrabold leading-6 text-slate-950">{post.title}</h2>
                        <p className="mt-2 text-sm font-bold text-slate-500">
  投稿者：{post.userName}
</p>
                        <p className="mt-3 text-sm font-semibold text-slate-600">{post.category}</p>
                        {post.tag && <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">#{post.tag}</span>}
                        <p className="mt-3 break-all text-xs font-semibold text-slate-500">{post.url}</p>
                      </div>
                    </a>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-4">
                      {(service === "youtube" || service === "twitch") && (
                        <FavoriteButton item={{
                          id: `${service}-post-${post.id}`,
                          service,
                          title: post.title,
                          creator: "URLink投稿",
                          thumbnail: thumbnail ?? "",
                          url: post.url,
                        }} />
                      )}
                      {currentUserId === post.userId && (
                        <button type="button" onClick={() => void handleDeletePost(post.id)}
                          className="rounded-lg bg-red-100 px-3 py-2 text-sm font-extrabold text-red-700 transition hover:bg-red-200">🗑 削除</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
