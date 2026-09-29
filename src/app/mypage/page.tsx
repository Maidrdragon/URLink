
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "../../../components/Sidebar";
import {
  type FavoriteItem,
  getFavorites,
  removeFavorite,
  migrateLocalFavorites,
} from "../../lib/favorites";
import {
  type PostItem,
  getPosts,
} from "../../lib/posts";
import { createClient } from "../../lib/supabase/client";

function getThumbnail(url: string): string | null {
  try {
    const parsed = new URL(url);
    let id: string | null = null;

    if (
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        id = parsed.searchParams.get("v");
      } else if (
        parsed.pathname.startsWith("/shorts/") ||
        parsed.pathname.startsWith("/embed/")
      ) {
        id = parsed.pathname.split("/")[2] || null;
      }
    } else if (parsed.hostname === "youtu.be") {
      id = parsed.pathname.split("/")[1] || null;
    }

    return id
      ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      : null;
  } catch {
    return null;
  }
}

export default function MyPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "posts" | "favorites"
  >("posts");

  useEffect(() => {
    let mounted = true;

    async function loadPosts() {
      const data = await getPosts();
      if (mounted) setPosts(data);
    }

    async function loadFavorites() {
      const data = await getFavorites();
      if (mounted) setFavorites(data);
    }

    async function initialize() {
      try {
        const supabase = createClient();
        const { data: { user }, error } =
          await supabase.auth.getUser();

        if (error || !user) {
          router.replace("/login");
          return;
        }

        await migrateLocalFavorites();
        await Promise.all([
          loadPosts(),
          loadFavorites(),
        ]);
      } catch (error) {
        console.error("読み込みエラー:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initialize();

    const refreshPosts = () => {
      void loadPosts();
    };
    const refreshFavorites = () => {
      void loadFavorites();
    };

    window.addEventListener("posts-updated", refreshPosts);
    window.addEventListener(
      "favorites-updated",
      refreshFavorites
    );

    return () => {
      mounted = false;
      window.removeEventListener(
        "posts-updated",
        refreshPosts
      );
      window.removeEventListener(
        "favorites-updated",
        refreshFavorites
      );
    };
  }, [router]);

  async function handleRemoveFavorite(id: string) {
    if (!window.confirm("お気に入りから削除しますか？")) {
      return;
    }

    try {
      await removeFavorite(id);
      setFavorites(await getFavorites());
    } catch (error) {
      console.error(error);
      alert("お気に入りの削除に失敗しました。");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        読み込み中...
      </main>
    );
  }

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
            className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-800 hover:bg-slate-200"
          >
            ⚙️ アカウント
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1700px] gap-6 px-6 py-8">
        <aside className="w-60 shrink-0">
          <div className="sticky top-6 rounded-2xl bg-white p-4 shadow-sm">
            <nav className="mb-6 space-y-2">
  <a
    href="/"
    className="block rounded-xl px-4 py-3 font-extrabold text-slate-700 hover:bg-slate-100"
  >
    🏠 ホーム
  </a>

  <a
    href="/mypage"
    className="block rounded-xl bg-blue-600 px-4 py-3 font-extrabold text-white"
  >
    👤 マイページ
  </a>
</nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <h1 className="mb-7 text-3xl font-extrabold text-slate-950">
            マイページ
          </h1>

          <div className="mb-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`rounded-xl px-6 py-3 font-extrabold ${
                activeTab === "posts"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              📝 自分の投稿 ({posts.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`rounded-xl px-6 py-3 font-extrabold ${
                activeTab === "favorites"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700"
              }`}
            >
              ⭐ お気に入り ({favorites.length})
            </button>
          </div>

          {activeTab === "posts" && (
            <section>
              {posts.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-600">
                    まだ投稿がありません。
                  </p>
                  <Link
                    href="/post"
                    className="mt-5 inline-block font-bold text-blue-600"
                  >
                    ＋ 投稿する
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((post) => {
                    const thumbnail = getThumbnail(post.url);

                    return (
                      <article
                        key={post.id}
                        className="overflow-hidden rounded-2xl bg-white shadow-md"
                      >
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={post.title}
                              className="aspect-video w-full object-cover"
                            />
                          ) : (
                            <div className="flex aspect-video items-center justify-center bg-slate-200 font-bold">
                              URL投稿
                            </div>
                          )}
                        </a>

                        <div className="p-5">
                          <h2 className="font-extrabold text-slate-950">
                            {post.title}
                          </h2>
                          <p className="mt-3 text-sm text-slate-600">
                            {post.category}
                          </p>
                          {post.tag && (
                            <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                              #{post.tag}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "favorites" && (
            <section>
              {favorites.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                  <p className="font-bold text-slate-600">
                    まだお気に入りがありません。
                  </p>
                  <Link
                    href="/"
                    className="mt-5 inline-block font-bold text-blue-600"
                  >
                    動画を探す
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {favorites.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-2xl bg-white shadow-md"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="aspect-video w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-video items-center justify-center bg-slate-200">
                            動画
                          </div>
                        )}
                      </a>

                      <div className="p-5">
                        <h2 className="line-clamp-3 font-extrabold">
                          {item.title}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          {item.creator}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            void handleRemoveFavorite(item.id)
                          }
                          className="mt-5 w-full rounded-xl bg-red-50 px-4 py-3 font-bold text-red-600 hover:bg-red-100"
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
        </main>
      </div>
    </div>
  );
}
