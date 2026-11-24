
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import type { SortOrder } from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import PostActionsMenu from "../../components/PostActionsMenu";
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

  if (hashtags.length) {
    return [...new Set(hashtags)].slice(0, MAX_SEARCH_KEYWORDS);
  }

  const words = trimmed
    .split(/[、,，\s]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return [...new Set(words)].slice(0, MAX_SEARCH_KEYWORDS);
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be") {
      return parsed.pathname.split("/")[1] || null;
    }

    if (host !== "youtube.com" && !host.endsWith(".youtube.com")) {
      return null;
    }

    if (parsed.pathname === "/watch") {
      return parsed.searchParams.get("v");
    }

    const segments = parsed.pathname.split("/").filter(Boolean);

    if (["shorts", "embed", "live"].includes(segments[0])) {
      return segments[1] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeVideoId(url);

  return id
    ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
    : null;
}

function getService(url: string): "youtube" | "twitch" | "other" {
  try {
    const host = new URL(url).hostname.toLowerCase();

    if (
      host === "youtu.be" ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com")
    ) {
      return "youtube";
    }

    if (host === "twitch.tv" || host.endsWith(".twitch.tv")) {
      return "twitch";
    }
  } catch {
    // URLが不正な場合は通常のリンクとして扱う
  }

  return "other";
}

// タグを1つずつに分割して整える
function parseTags(tag: string): string[] {
  return [
    ...new Set(
      tag
        .split(/[,\s、，]+/)
        .map((item) => item.trim().replace(/^#+/, ""))
        .filter(Boolean)
    ),
  ];
}

// 投稿日から年月のキーを作る
function getMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

// 年月キーを表示用に変換
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");

  return `${year}年${Number(month)}月`;
}

export default function Home() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("all");
  const [playlistPostIds, setPlaylistPostIds] = useState<string[]>([]);
  const [searchWord, setSearchWord] = useState("");
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SortOrder>("date");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ログイン中のユーザーを取得
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) {
        setCurrentUserId(user?.id ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setCurrentUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 全ページ共通ヘッダーからの検索を受け取る
  useEffect(() => {
    function receiveSearch(event: Event) {
      const customEvent = event as CustomEvent<{
        keyword: string;
        order: SortOrder;
      }>;

      handleSearch(
        customEvent.detail.keyword,
        customEvent.detail.order
      );
    }

    window.addEventListener("urlink-search", receiveSearch);

    return () => {
      window.removeEventListener("urlink-search", receiveSearch);
    };
  }, []);

  // 別ページから検索してホームに移動した場合の処理
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");

    if (query !== null) {
      const orderParam = params.get("order");

      const order: SortOrder =
        orderParam === "relevance" ||
        orderParam === "date" ||
        orderParam === "viewCount"
          ? orderParam
          : "date";

      handleSearch(query, order);
    }
  }, []);

  // 投稿とプロフィール画像を読み込む
  const loadPosts = useCallback(async () => {
    try {
      setError("");

      const savedPosts = await getPosts();
      setPosts(savedPosts);

      const userIds = [
        ...new Set(savedPosts.map((post) => post.userId)),
      ];

      if (userIds.length > 0) {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .in("id", userIds);

        if (error) {
          console.error("プロフィール画像の取得に失敗:", error);
        } else {
          const avatarMap: Record<string, string> = {};

          data?.forEach((profile) => {
            if (profile.avatar_url) {
              avatarMap[profile.id] = profile.avatar_url;
            }
          });

          setAvatarUrls(avatarMap);
        }
      } else {
        setAvatarUrls({});
      }
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

    return () => {
      window.removeEventListener("posts-updated", onUpdated);
    };
  }, [loadPosts]);

  // プレイリストを読み込む
  useEffect(() => {
    const load = async () => {
      try {
        setPlaylists(await getPlaylists());
      } catch (cause) {
        console.error("プレイリスト読み込みエラー:", cause);
      }
    };

    void load();

    window.addEventListener("playlists-updated", load);

    return () => {
      window.removeEventListener("playlists-updated", load);
    };
  }, []);

  // 選択したプレイリストの投稿を取得
  useEffect(() => {
    let active = true;

    if (selectedPlaylistId === "all") {
      setPlaylistPostIds([]);
      return;
    }

    void getPlaylistPostIds(selectedPlaylistId)
      .then((ids) => {
        if (active) {
          setPlaylistPostIds(ids);
        }
      })
      .catch((cause) => {
        console.error("プレイリスト内の投稿取得エラー:", cause);
      });

    return () => {
      active = false;
    };
  }, [selectedPlaylistId]);

  // 投稿に存在する年月を取得
  const availableMonths = useMemo(() => {
    const months = [
      ...new Set(posts.map((post) => getMonthKey(post.createdAt))),
    ];

    return months.sort((a, b) => b.localeCompare(a));
  }, [posts]);

  // 検索・年月・プレイリストを反映
  const visiblePosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      if (
        selectedPlaylistId !== "all" &&
        !playlistPostIds.includes(post.id)
      ) {
        return false;
      }

      if (
        selectedMonth !== "all" &&
        getMonthKey(post.createdAt) !== selectedMonth
      ) {
        return false;
      }

      if (!searchKeywords.length) {
        return true;
      }

      const searchable = [
        post.title,
        post.tag,
        post.category,
        post.url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchKeywords.some((keyword) =>
        searchable.includes(keyword.toLocaleLowerCase())
      );
    });

    return [...filtered].sort((a, b) => {
      if (selectedOrder === "relevance" && searchKeywords.length) {
        const score = (post: PostItem) =>
          searchKeywords.reduce((sum, keyword) => {
            const word = keyword.toLocaleLowerCase();

            return (
              sum +
              (post.title.toLocaleLowerCase().includes(word) ? 3 : 0) +
              (post.tag.toLocaleLowerCase().includes(word) ? 2 : 0) +
              (post.category.toLocaleLowerCase().includes(word) ? 1 : 0)
            );
          }, 0);

        const difference = score(b) - score(a);

        if (difference !== 0) {
          return difference;
        }
      }

      return b.createdAt - a.createdAt;
    });
  }, [
    posts,
    playlistPostIds,
    selectedPlaylistId,
    searchKeywords,
    selectedOrder,
    selectedMonth,
  ]);

  // 検索処理
  function handleSearch(input: string, order: SortOrder) {
    setSearchWord(input.trim());
    setSearchKeywords(parseSearchKeywords(input));
    setSelectedOrder(order);
  }

  // 自分の投稿を削除
  async function handleDeletePost(id: string) {
    if (
      !currentUserId ||
      !posts.some(
        (post) => post.id === id && post.userId === currentUserId
      )
    ) {
      window.alert("自分の投稿だけ削除できます。");
      return;
    }

    if (!window.confirm("この投稿を削除しますか？")) {
      return;
    }

    try {
      await deletePost(id);
      await loadPosts();
    } catch (cause) {
      console.error("削除エラー:", cause);

      window.alert(
        cause instanceof Error
          ? cause.message
          : "投稿を削除できませんでした。"
      );
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#303030] text-white">
      {/* 背景ロゴ */}
      <div
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <img
          src="/URLink.png"
          alt=""
          className="w-[75vw] max-w-[1300px] select-none opacity-[0.025]"
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-[1700px] flex-col gap-6 px-6 py-8 sm:flex-row">
        {/* 左側サイドバー */}
        <aside className="w-full flex-shrink-0 sm:w-60">
          <div className="rounded-2xl border border-[#555555] bg-[#424242] p-4 shadow-sm sm:sticky sm:top-6">
            <Sidebar />

            <h2 className="mb-4 text-lg font-extrabold text-white">
              マイリスト
            </h2>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedPlaylistId("all")}
                className={`w-full rounded-xl px-4 py-3 text-left font-extrabold transition ${
                  selectedPlaylistId === "all"
                    ? "bg-[#505050] text-white"
                    : "text-[#DDDDDD] hover:bg-[#505050] hover:text-white"
                }`}
              >
                すべて
              </button>

              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left font-bold transition ${
                    selectedPlaylistId === playlist.id
                      ? "bg-[#505050] text-white"
                      : "text-[#DDDDDD] hover:bg-[#505050] hover:text-white"
                  }`}
                >
                  {playlist.name}
                </button>
              ))}
            </div>

            <a
              href="/post"
              className="mt-5 block rounded-xl border border-[#666666] px-4 py-3 text-center font-extrabold text-white transition hover:bg-[#505050]"
            >
              ＋ 投稿する
            </a>
          </div>
        </aside>

        {/* メイン画面 */}
        <main className="min-w-0 flex-1">
          <section className="mb-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-extrabold text-white">
                {searchWord
                  ? `「${searchWord}」の投稿検索結果`
                  : "新着投稿"}
              </h1>

              {/* 年月別検索 */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="month-filter"
                  className="flex items-center gap-2 text-sm font-bold text-[#DDDDDD]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                  </svg>
                  投稿日
                </label>

                <select
                  id="month-filter"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-xl border border-[#666666] bg-[#505050] px-3 py-2 text-sm font-bold text-white outline-none transition hover:bg-[#606060] focus:ring-2 focus:ring-[#999999]"
                >
                  <option value="all">すべての年月</option>

                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mb-6 font-semibold text-[#DDDDDD]">
              URLinkに登録されたURLを、タイトル・タグ・カテゴリーから探せます。
            </p>

            {selectedMonth !== "all" && (
              <p className="mb-4 text-sm font-semibold text-[#DDDDDD]">
                {formatMonthLabel(selectedMonth)}の投稿：
                {visiblePosts.length}件
              </p>
            )}

            {loading && (
              <p className="py-12 text-center font-bold text-[#DDDDDD]">
                投稿を読み込み中...
              </p>
            )}

            {error && (
              <p className="mb-6 rounded-xl border border-[#666666] bg-[#505050] p-4 font-bold text-white">
                {error}
              </p>
            )}

            {!loading && !error && visiblePosts.length === 0 && (
              <div className="rounded-2xl border border-[#555555] bg-[#424242] p-10 text-center font-bold text-[#DDDDDD]">
                {searchWord || selectedMonth !== "all"
                  ? "条件に合う投稿が見つかりませんでした。"
                  : "表示できる投稿がありません。URLを投稿してみましょう。"}
              </div>
            )}

            {/* 投稿カード一覧 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visiblePosts.map((post) => {
                const thumbnail = getYouTubeThumbnail(post.url);
                const service = getService(post.url);
                const isOwner = currentUserId === post.userId;

                const favoriteItem =
                  service === "youtube" || service === "twitch"
                    ? {
                        id: `${service}-post-${post.id}`,
                        service,
                        title: post.title,
                        creator: "URLink投稿",
                        thumbnail: thumbnail ?? "",
                        url: post.url,
                      }
                    : undefined;

                return (
                  <article
                    key={post.id}
                    className="relative overflow-visible rounded-sm border border-[#555555] bg-[#424242] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#777777] hover:shadow-lg"
                  >
                    {/* 投稿内容 */}
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-sm"
                    >
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={post.title}
                          className="aspect-video w-full bg-[#505050] object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video w-full items-center justify-center bg-white p-6">
                          <img
                            src="/logonew.PNG"
                            alt="URLink"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}

                      <div className="p-3">
                        <h2
                          className="truncate pr-7 text-sm font-extrabold leading-6 text-white"
                          title={post.title}
                        >
                          {post.title}
                        </h2>

                        <div className="mt-2 flex min-w-0 items-center gap-2">
                          {avatarUrls[post.userId] ? (
                            <img
                              src={avatarUrls[post.userId]}
                              alt="投稿者のプロフィール画像"
                              className="h-7 w-7 flex-shrink-0 rounded-full border border-[#666666] object-cover"
                            />
                          ) : (
                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#606060] text-[#DDDDDD]">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="h-5 w-5"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 9a8 8 0 1 1 16 0H4Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}

                          <p className="truncate text-xs font-bold text-[#DDDDDD]">
                            投稿者：{post.userName}
                          </p>
                        </div>

                        {/* 投稿日時 */}
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#BBBBBB]">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-3.5 w-3.5 flex-shrink-0"
                          >
                            <rect
                              x="3"
                              y="5"
                              width="18"
                              height="16"
                              rx="2"
                            />
                            <path d="M16 3v4M8 3v4M3 11h18" />
                          </svg>

                          <span>
                            {new Date(post.createdAt).toLocaleDateString(
                              "ja-JP",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-semibold text-[#DDDDDD]">
                          {post.category}
                        </p>

                        {/* タグを1つずつ表示 */}
                        {post.tag && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {parseTags(post.tag).map((tag, index) => (
                              <span
                                key={`${tag}-${index}`}
                                className="rounded-full bg-[#606060] px-3 py-1 text-xs font-bold text-white"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="mt-2 truncate text-xs font-semibold text-[#BBBBBB]">
                          {post.url}
                        </p>
                      </div>
                    </a>

                    {/* 共通の投稿メニュー */}
                    <div className="absolute right-2 top-2 z-30">
                      <PostActionsMenu
                        postId={post.id}
                        url={post.url}
                        playlists={playlists}
                        favoriteItem={favoriteItem}
                        onDelete={
                          isOwner
                            ? () => {
                                void handleDeletePost(post.id);
                              }
                            : undefined
                        }
                      />
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
