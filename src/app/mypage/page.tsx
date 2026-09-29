"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  FavoriteItem,
  getFavorites,
  removeFavorite,
  migrateLocalFavorites,
} from "../../lib/favorites";

import {
  PostItem,
  getPosts,
} from "../../lib/posts";

import { createClient } from "../../lib/supabase/client";

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.hostname.includes("youtube.com") &&
      parsedUrl.pathname === "/watch"
    ) {
      return parsedUrl.searchParams.get("v");
    }

    if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname.split("/")[1] || null;
    }

    if (
      parsedUrl.hostname.includes("youtube.com") &&
      parsedUrl.pathname.startsWith("/shorts/")
    ) {
      return parsedUrl.pathname.split("/")[2] || null;
    }

    if (
      parsedUrl.hostname.includes("youtube.com") &&
      parsedUrl.pathname.startsWith("/embed/")
    ) {
      return parsedUrl.pathname.split("/")[2] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumbnail(url: string): string | null {
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return null;
  }

  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export default function MyPage() {
  const router = useRouter();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [loading, setLoading] = useState(true);

  async function loadFavorites() {
  const savedFavorites = await getFavorites();
  setFavorites(savedFavorites);
}

  async function loadPosts() {
    const savedPosts = await getPosts();
    setPosts(savedPosts);
  }

  useEffect(() => {
    async function loadPage() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? "");

      const name = user.user_metadata?.name;

      if (typeof name === "string") {
        setUserName(name);
      }

      await migrateLocalFavorites();
      await loadFavorites();
      await loadPosts();

      setLoading(false);
    }

    loadPage();

    window.addEventListener(
      "favorites-updated",
      loadFavorites
    );

    window.addEventListener(
      "posts-updated",
      loadPosts
    );

    return () => {
      window.removeEventListener(
        "favorites-updated",
        loadFavorites
      );

      window.removeEventListener(
        "posts-updated",
        loadPosts
      );
    };
  }, [router]);

  async function deleteFavorite(id: string) {
  try {
    await removeFavorite(id);
    await loadFavorites();
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      alert(error.message);
    } else {
      alert("お気に入りの削除に失敗しました。");
    }
  }
}

  async function handleLogout() {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ログアウトに失敗しました。");
      return;
    }

    alert("ログアウトしました。");

    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-xl font-extrabold text-slate-700">
          読み込み中...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">

        {/* 上部 */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="font-extrabold text-blue-600 hover:underline"
          >
            ← URLinkに戻る
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-red-500 px-5 py-3 font-extrabold text-white transition hover:bg-red-600"
          >
            ログアウト
          </button>
        </div>

        {/* ユーザー情報 */}

        <section className="mb-12 rounded-3xl bg-white p-8 shadow-md">
          <div className="flex items-center gap-5">

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-3xl font-extrabold text-white">
              {userName
                ? userName.charAt(0).toUpperCase()
                : "U"}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-500">
                ログイン中
              </p>

              <h1 className="mt-1 text-3xl font-extrabold text-slate-950">
                {userName || "URLinkユーザー"}
              </h1>

              <p className="mt-2 text-slate-600">
                {userEmail}
              </p>
            </div>

          </div>
        </section>

        {/* 自分の投稿 */}

        <section className="mb-14">

          <div className="mb-8 flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-slate-900">
              📝 自分の投稿
            </h2>

            <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-800">
              {posts.length}件
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-md">
              <p className="text-lg font-bold text-slate-600">
                まだ投稿がありません。
              </p>

              <Link
                href="/post"
                className="mt-4 inline-block font-extrabold text-green-600 hover:underline"
              >
                最初の投稿をする
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {posts.map((post) => {
                const thumbnail =
                  getYouTubeThumbnail(post.url);

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
                        <div className="flex aspect-video w-full items-center justify-center bg-slate-200 px-4 text-center font-bold text-slate-500">
                          URL投稿
                        </div>
                      )}
                    </a>

                    <div className="p-5">

                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <h3 className="font-extrabold text-slate-950 hover:text-blue-600">
                          {post.title}
                        </h3>
                      </a>

                      <p className="mt-3 font-bold text-slate-600">
                        {post.category}
                      </p>

                      {post.tag && (
                        <span className="mt-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                          {post.tag}
                        </span>
                      )}

                    </div>
                  </article>
                );
              })}

            </div>
          )}

        </section>

        {/* お気に入り */}

        <section>

          <div className="mb-8 flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-slate-900">
              ⭐ お気に入り
            </h2>

            <span className="rounded-full bg-yellow-100 px-3 py-1 font-bold text-yellow-800">
              {favorites.length}件
            </span>
          </div>

          {favorites.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-md">

              <p className="text-lg font-bold text-slate-600">
                まだお気に入りがありません。
              </p>

              <Link
                href="/"
                className="mt-4 inline-block font-extrabold text-blue-600 hover:underline"
              >
                動画を探す
              </Link>

            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {favorites.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-md"
                >

                  {item.thumbnail && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="aspect-video w-full object-cover"
                      />
                    </a>
                  )}

                  <div className="p-4">

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <h3 className="line-clamp-3 font-extrabold text-slate-950 hover:text-blue-600">
                        {item.title}
                      </h3>
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        deleteFavorite(item.id)
                      }
                      className="mt-4 w-full rounded-xl bg-red-50 px-4 py-3 font-extrabold text-red-600 transition hover:bg-red-100"
                    >
                      お気に入りから削除
                    </button>

                  </div>
                </article>
              ))}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}