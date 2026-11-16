
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PostActionsMenu from "../../../components/PostActionsMenu";
import {
  type FavoriteItem,
  getFavorites,
  removeFavorite,
  migrateLocalFavorites,
} from "../../lib/favorites";
import {
  type PostItem,
  getMyPosts,
  getPosts,
  deletePost,
} from "../../lib/posts";
import {
  type Playlist,
  getPlaylists,
  getPlaylistPostIds,
  createPlaylist,
} from "../../lib/playlists";
import { createClient } from "../../lib/supabase/client";

function getThumbnail(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let id: string | null = null;

    if (host === "youtu.be") {
      id = parsed.pathname.split("/")[1] || null;
    } else if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com")
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v");
      } else {
        const segments = parsed.pathname.split("/").filter(Boolean);

        if (["shorts", "embed", "live"].includes(segments[0])) {
          id = segments[1] || null;
        }
      }
    }

    return id
      ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
      : null;
  } catch {
    return null;
  }
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
    // 不正なURLは通常のリンクとして扱う
  }

  return "other";
}

export default function MyPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [allPosts, setAllPosts] = useState<PostItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistPostIds, setPlaylistPostIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [loading, setLoading] = useState(true);

  // 投稿を読み込む
  const loadPosts = useCallback(async () => {
    try {
      const [myPosts, publicPosts] = await Promise.all([
        getMyPosts(),
        getPosts(),
      ]);

      setPosts(myPosts);
      setAllPosts(publicPosts);
    } catch (error) {
      console.error("投稿の読み込みに失敗しました:", error);
    }
  }, []);

  // お気に入りを読み込む
  const loadFavorites = useCallback(async () => {
    try {
      setFavorites(await getFavorites());
    } catch (error) {
      console.error("お気に入りの読み込みに失敗しました:", error);
    }
  }, []);

  // プレイリストを読み込む
  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await getPlaylists());
    } catch (error) {
      console.error("プレイリストの読み込みに失敗しました:", error);
    }
  }, []);

  // ログイン確認と初期読み込み
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        if (mounted) {
          setCurrentUserId(user.id);
        }

        await migrateLocalFavorites();

        await Promise.all([
          loadPosts(),
          loadFavorites(),
          loadPlaylists(),
        ]);
      } catch (error) {
        console.error("マイページの読み込みエラー:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, [router, loadPosts, loadFavorites, loadPlaylists]);

  // 投稿・お気に入り・プレイリストの更新を反映
  useEffect(() => {
    const refreshPosts = () => void loadPosts();
    const refreshFavorites = () => void loadFavorites();
    const refreshPlaylists = () => void loadPlaylists();

    window.addEventListener("posts-updated", refreshPosts);
    window.addEventListener("favorites-updated", refreshFavorites);
    window.addEventListener("playlists-updated", refreshPlaylists);

    return () => {
      window.removeEventListener("posts-updated", refreshPosts);
      window.removeEventListener("favorites-updated", refreshFavorites);
      window.removeEventListener("playlists-updated", refreshPlaylists);
    };
  }, [loadPosts, loadFavorites, loadPlaylists]);

  // 選択したプレイリストの投稿IDを取得
  useEffect(() => {
    let active = true;

    const selectedPlaylist = playlists.some(
      (playlist) => playlist.id === activeTab
    );

    if (!selectedPlaylist) {
      setPlaylistPostIds([]);
      return;
    }

    void getPlaylistPostIds(activeTab)
      .then((ids) => {
        if (active) {
          setPlaylistPostIds(ids);
        }
      })
      .catch((error) => {
        console.error("プレイリストの投稿取得エラー:", error);
      });

    return () => {
      active = false;
    };
  }, [activeTab, playlists]);

  // プレイリストに入っている投稿
  const playlistPosts = useMemo(() => {
    return allPosts.filter((post) =>
      playlistPostIds.includes(post.id)
    );
  }, [allPosts, playlistPostIds]);

  // お気に入りから削除
  async function handleRemoveFavorite(id: string) {
    if (!window.confirm("お気に入りから削除しますか？")) {
      return;
    }

    try {
      await removeFavorite(id);
      await loadFavorites();
    } catch (error) {
      console.error(error);
      window.alert("お気に入りの削除に失敗しました。");
    }
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
    } catch (error) {
      console.error("投稿の削除エラー:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "投稿を削除できませんでした。"
      );
    }
  }

  // 新しいプレイリストを作成
  async function handleCreatePlaylist() {
    const name = window.prompt("プレイリスト名を入力してください。");

    if (name === null || !name.trim()) {
      return;
    }

    try {
      const playlist = await createPlaylist(name);
      await loadPlaylists();
      setActiveTab(playlist.id);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "プレイリストを作成できませんでした。"
      );
    }
  }

  // 投稿カード
  function renderPostCard(post: PostItem) {
    const thumbnail = getThumbnail(post.url);
    const service = getService(post.url);
    const isOwner = currentUserId === post.userId;

    const favoriteItem: FavoriteItem | undefined =
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
        className="relative overflow-visible rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
      >
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-2xl"
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={post.title}
              className="aspect-video w-full bg-slate-600 object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-slate-700 text-2xl font-extrabold text-white">
              {service === "twitch" ? "Twitch" : "URL"}
            </div>
          )}

          <div className="p-3">
            <h2
              className="truncate pr-7 text-sm font-extrabold leading-6 text-slate-950"
              title={post.title}
            >
              {post.title}
            </h2>

            <p className="mt-2 text-xs font-semibold text-slate-600">
              {post.category}
            </p>

            {post.tag && (
              <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                #{post.tag}
              </span>
            )}

            <p className="mt-2 truncate text-xs font-semibold text-slate-500">
              {post.url}
            </p>
          </div>
        </a>

        <div className="absolute right-2 top-2 z-30">
          <PostActionsMenu
            postId={post.id}
            url={post.url}
            playlists={playlists}
            favoriteItem={favoriteItem}
            onDelete={
              isOwner
                ? () => void handleDeletePost(post.id)
                : undefined
            }
          />
        </div>
      </article>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center font-bold text-slate-700">
        読み込み中...
      </main>
    );
  }

  const selectedPlaylist = playlists.find(
    (playlist) => playlist.id === activeTab
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-5">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-extrabold text-blue-600"
          >
            URLink
          </Link>

          <Link
            href="/account"
            className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-200"
          >
            アカウント
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1700px] gap-6 px-6 py-8">
        {/* 左側メニュー */}
        <aside className="hidden w-60 shrink-0 sm:block">
          <div className="sticky top-6 rounded-2xl bg-white p-4 shadow-sm">
            <nav className="space-y-2">
              <Link
                href="/"
                className="block rounded-xl px-4 py-3 font-extrabold text-slate-700 transition hover:bg-slate-100"
              >
                ホーム
              </Link>

              <Link
                href="/mypage"
                className="block rounded-xl bg-blue-600 px-4 py-3 font-extrabold text-white"
              >
                マイページ
              </Link>
            </nav>
          </div>
        </aside>

        {/* メイン画面 */}
        <main className="min-w-0 flex-1">
          <h1 className="mb-7 text-3xl font-extrabold text-slate-950">
            マイページ
          </h1>

          {/* タブ */}
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`rounded-xl px-5 py-3 font-extrabold transition ${
                activeTab === "posts"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              自分の投稿 ({posts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`rounded-xl px-5 py-3 font-extrabold transition ${
                activeTab === "favorites"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              お気に入り ({favorites.length})
            </button>

            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => setActiveTab(playlist.id)}
                className={`max-w-48 truncate rounded-xl px-5 py-3 font-extrabold transition ${
                  activeTab === playlist.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
                title={playlist.name}
              >
                {playlist.name}
              </button>
            ))}

            <button
              type="button"
              onClick={() => void handleCreatePlaylist()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-5 py-3 font-extrabold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
            >
              ＋ プレイリスト作成
            </button>
          </div>

          {/* 自分の投稿 */}
          {activeTab === "posts" && (
            <section>
              {posts.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-600">
                    まだ投稿がありません。
                  </p>
                  <Link
                    href="/post"
                    className="mt-5 inline-block font-bold text-blue-600 hover:underline"
                  >
                    ＋ 投稿する
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {posts.map(renderPostCard)}
                </div>
              )}
            </section>
          )}

          {/* お気に入り */}
          {activeTab === "favorites" && (
            <section>
              {favorites.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-600">
                    まだお気に入りがありません。
                  </p>
                  <Link
                    href="/"
                    className="mt-5 inline-block font-bold text-blue-600 hover:underline"
                  >
                    動画を探す
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {favorites.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="aspect-video w-full bg-slate-600 object-cover"
                          />
                        ) : (
                          <div className="flex aspect-video items-center justify-center bg-slate-700 font-bold text-white">
                            動画
                          </div>
                        )}
                      </a>

                      <div className="p-3">
                        <h2
                          className="truncate text-sm font-extrabold text-slate-950"
                          title={item.title}
                        >
                          {item.title}
                        </h2>

                        <p className="mt-2 truncate text-xs font-semibold text-slate-500">
                          {item.creator}
                        </p>

                        <button
                          type="button"
                          onClick={() => void handleRemoveFavorite(item.id)}
                          className="mt-3 w-full rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                        >
                          お気に入りから削除
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* プレイリスト */}
          {selectedPlaylist && (
            <section>
              {playlistPosts.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-600">
                    このプレイリストには、まだ投稿がありません。
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    ホーム画面の投稿メニューから追加できます。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {playlistPosts.map(renderPostCard)}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
