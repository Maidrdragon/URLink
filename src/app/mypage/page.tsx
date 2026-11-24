
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

  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [playlistError, setPlaylistError] = useState("");

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

  const loadFavorites = useCallback(async () => {
    try {
      setFavorites(await getFavorites());
    } catch (error) {
      console.error("お気に入りの読み込みに失敗しました:", error);
    }
  }, []);

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await getPlaylists());
    } catch (error) {
      console.error("プレイリストの読み込みに失敗しました:", error);
    }
  }, []);

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

  const playlistPosts = useMemo(() => {
    return allPosts.filter((post) =>
      playlistPostIds.includes(post.id)
    );
  }, [allPosts, playlistPostIds]);

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

  function openCreatePlaylist() {
    setNewPlaylistName("");
    setPlaylistError("");
    setShowCreatePlaylist(true);
  }

  async function handleCreatePlaylist() {
    const name = newPlaylistName.trim();

    if (!name) {
      setPlaylistError("プレイリスト名を入力してください。");
      return;
    }

    if (creatingPlaylist) return;

    try {
      setCreatingPlaylist(true);
      setPlaylistError("");

      const playlist = await createPlaylist(name);

      await loadPlaylists();
      setActiveTab(playlist.id);
      setShowCreatePlaylist(false);
      setNewPlaylistName("");
    } catch (error) {
      console.error("プレイリスト作成エラー:", error);
      setPlaylistError(
        error instanceof Error
          ? error.message
          : "プレイリストを作成できませんでした。"
      );
    } finally {
      setCreatingPlaylist(false);
    }
  }

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
        className="relative overflow-hidden rounded-xl border border-[#555555] bg-[#424242] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#777777] hover:shadow-md"
      >
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={post.title}
              className="aspect-video w-full rounded-t-xl bg-[#505050] object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-t-xl bg-[#505050] p-6">
              <img
                src="/logonew.PNG"
                alt="URLink"
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <div className="p-3">
            <h2
              className="truncate pr-7 text-sm font-extrabold leading-6 text-[#EEEEEE]"
              title={post.title}
            >
              {post.title}
            </h2>

            <p className="mt-2 text-xs font-semibold text-[#DDDDDD]">
              {post.category}
            </p>

            {post.tag && (
              <span className="mt-2 inline-block rounded-full bg-[#606060] px-3 py-1 text-xs font-bold text-white">
                #{post.tag}
              </span>
            )}

            <p className="mt-2 truncate text-xs font-semibold text-[#BBBBBB]">
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
      <main className="flex min-h-screen items-center justify-center bg-[#303030] font-bold text-[#DDDDDD]">
        読み込み中...
      </main>
    );
  }

  const selectedPlaylist = playlists.find(
    (playlist) => playlist.id === activeTab
  );

  return (
    <div className="min-h-screen bg-[#303030]">
      <main className="mx-auto max-w-[1700px] px-6 py-8">
        <h1 className="mb-7 text-3xl font-extrabold text-[#EEEEEE]">
          マイページ
        </h1>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`rounded-xl px-5 py-3 font-extrabold transition ${
              activeTab === "posts"
                ? "bg-[#505050] text-white"
                : "border border-[#555555] bg-[#424242] text-[#DDDDDD] hover:bg-[#505050]"
            }`}
          >
            自分の投稿 ({posts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={`rounded-xl px-5 py-3 font-extrabold transition ${
              activeTab === "favorites"
                ? "bg-[#505050] text-white"
                : "border border-[#555555] bg-[#424242] text-[#DDDDDD] hover:bg-[#505050]"
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
                  ? "bg-[#505050] text-white"
                  : "border border-[#555555] bg-[#424242] text-[#DDDDDD] hover:bg-[#505050]"
              }`}
              title={playlist.name}
            >
              {playlist.name}
            </button>
          ))}

          <button
            type="button"
            onClick={openCreatePlaylist}
            className="rounded-xl border-2 border-dashed border-[#777777] bg-[#424242] px-5 py-3 font-extrabold text-[#DDDDDD] transition hover:border-[#AAAAAA] hover:bg-[#505050]"
          >
            ＋ プレイリスト作成
          </button>
        </div>

        {activeTab === "posts" && (
          <section>
            {posts.length === 0 ? (
              <div className="rounded-xl border border-[#555555] bg-[#424242] p-10 text-center shadow-sm">
                <p className="font-bold text-[#DDDDDD]">
                  まだ投稿がありません。
                </p>
                <Link
                  href="/post"
                  className="mt-5 inline-block font-bold text-[#EEEEEE] hover:underline"
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

        {activeTab === "favorites" && (
          <section>
            {favorites.length === 0 ? (
              <div className="rounded-xl border border-[#555555] bg-[#424242] p-10 text-center shadow-sm">
                <p className="font-bold text-[#DDDDDD]">
                  まだお気に入りがありません。
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-block font-bold text-[#EEEEEE] hover:underline"
                >
                  動画を探す
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {favorites.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-[#555555] bg-[#424242] shadow-sm transition hover:-translate-y-1 hover:border-[#777777] hover:shadow-md"
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
                          className="aspect-video w-full rounded-t-xl bg-[#505050] object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center rounded-t-xl bg-[#505050] p-6">
                          <img
                            src="/logonew.PNG"
                            alt="URLink"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      )}
                    </a>

                    <div className="p-3">
                      <h2
                        className="truncate text-sm font-extrabold text-[#EEEEEE]"
                        title={item.title}
                      >
                        {item.title}
                      </h2>

                      <p className="mt-2 truncate text-xs font-semibold text-[#BBBBBB]">
                        {item.creator}
                      </p>

                      <button
                        type="button"
                        onClick={() => void handleRemoveFavorite(item.id)}
                        className="mt-3 w-full rounded-lg bg-[#606060] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#707070]"
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

        {selectedPlaylist && (
          <section>
            {playlistPosts.length === 0 ? (
              <div className="rounded-xl border border-[#555555] bg-[#424242] p-10 text-center shadow-sm">
                <p className="font-bold text-[#DDDDDD]">
                  このプレイリストには、まだ投稿がありません。
                </p>
                <p className="mt-2 text-sm text-[#BBBBBB]">
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

      {showCreatePlaylist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creatingPlaylist) {
              setShowCreatePlaylist(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-[#666666] bg-[#424242] p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-extrabold text-[#EEEEEE]">
              プレイリストを作成
            </h2>

            <label
              htmlFor="playlist-name"
              className="mb-2 block text-sm font-bold text-[#DDDDDD]"
            >
              プレイリスト名
            </label>

            <input
              id="playlist-name"
              type="text"
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleCreatePlaylist();
                }
              }}
              placeholder="例：お気に入りの動画"
              maxLength={30}
              autoFocus
              className="w-full rounded-xl border border-[#666666] bg-[#505050] px-4 py-3 font-semibold text-[#EEEEEE] outline-none transition placeholder:text-[#AAAAAA] focus:border-[#AAAAAA] focus:ring-2 focus:ring-[#777777]"
            />

            {playlistError && (
              <p className="mt-3 text-sm font-bold text-red-400">
                {playlistError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={creatingPlaylist}
                onClick={() => setShowCreatePlaylist(false)}
                className="rounded-xl bg-[#606060] px-5 py-3 font-bold text-[#EEEEEE] transition hover:bg-[#707070] disabled:opacity-50"
              >
                キャンセル
              </button>

              <button
                type="button"
                disabled={creatingPlaylist}
                onClick={() => void handleCreatePlaylist()}
                className="rounded-xl bg-[#707070] px-5 py-3 font-bold text-white transition hover:bg-[#808080] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingPlaylist ? "作成中..." : "作成する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
