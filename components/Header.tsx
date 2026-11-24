
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../src/lib/supabase/client";

export type SortOrder = "relevance" | "date" | "viewCount";

type HeaderProps = {
  onSearch?: (keyword: string, order: SortOrder) => void;
};

export default function Header({ onSearch }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [keyword, setKeyword] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");
  const [avatarUrl, setAvatarUrl] = useState("");

  const isHome = pathname === "/";

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadAvatar() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !user) {
        setAvatarUrl("");
        return;
      }

      setAvatarUrl(user.user_metadata?.avatar_url || "");
    }

    void loadAvatar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setAvatarUrl(session?.user?.user_metadata?.avatar_url || "");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (onSearch) {
      onSearch(keyword, sortOrder);
      return;
    }

    if (pathname === "/") {
      window.dispatchEvent(
        new CustomEvent("urlink-search", {
          detail: {
            keyword,
            order: sortOrder,
          },
        })
      );
    } else {
      const params = new URLSearchParams();

      params.set("q", keyword);
      params.set("order", sortOrder);

      router.push(`/?${params.toString()}`);
    }
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/30 shadow-md"
      style={{
        background:
          "linear-gradient(to right, #3B82F6, #67E8F9, #5EEAD4, #D9F99D, #FCD34D, #FB923C)",
      }}
    >
      <div className="mx-auto flex min-h-16 max-w-[1700px] items-center gap-4 px-6 py-3">

        {/* ロゴ */}
        <Link
          href="/"
          aria-label="URLinkホーム"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/logonew.PNG"
            alt="URLink"
            width={120}
            height={120}
            className="rounded-lg object-contain"
            priority
          />
        </Link>

        {/* ホーム画面だけ検索バーを表示 */}
        {isHome && (
          <form
            onSubmit={handleSubmit}
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="動画や投稿を検索..."
              className="min-w-0 flex-1 rounded-full border border-[#383838] bg-[#212121] px-5 py-2.5 text-white placeholder:text-[#AAAAAA] outline-none transition focus:border-[#666666]"
            />

            <button
              type="submit"
              className="rounded-full bg-[#272727] px-5 py-2.5 font-bold text-white transition hover:bg-[#3A3A3A]"
            >
              検索
            </button>
          </form>
        )}

        {/* プロフィール画像 */}
        <Link
          href="/account"
          aria-label="アカウント"
          title="アカウント"
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#444444] bg-[#272727] text-white transition hover:bg-[#3A3A3A]"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="プロフィール画像"
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 9a8 8 0 1 1 16 0H4Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </Link>

      </div>
    </header>
  );
}
