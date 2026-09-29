"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type SortOrder =
  | "relevance"
  | "date"
  | "viewCount";

type HeaderProps = {
  onSearch?: (
    keyword: string,
    order: SortOrder
  ) => void;
};

export default function Header({
  onSearch,
}: HeaderProps) {
  const [keyword, setKeyword] = useState("");
  const [sortOrder, setSortOrder] =
    useState<SortOrder>("relevance");

  function handleSearch() {
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword || !onSearch) {
      return;
    }

    onSearch(trimmedKeyword, sortOrder);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }

  function handleSortChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const newSortOrder =
      event.target.value as SortOrder;

    setSortOrder(newSortOrder);

    const trimmedKeyword = keyword.trim();

    if (trimmedKeyword && onSearch) {
      onSearch(trimmedKeyword, newSortOrder);
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 shadow-lg">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-2">

        {/* URLinkロゴ */}
        <Link
          href="/"
          className="flex flex-shrink-0 items-center transition hover:opacity-90"
        >
          <Image
            src="/URLink.png"
            alt="URLink"
            width={260}
            height={90}
            priority
            className="h-20 w-auto object-contain"
          />
        </Link>

        {/* 検索エリア */}
        {onSearch && (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">

            <input
              type="text"
              value={keyword}
              onChange={(event) =>
                setKeyword(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="YouTube・Twitchを検索..."
              className="min-w-[240px] flex-1 rounded-xl border-2 border-white/40 bg-white px-4 py-3 text-base font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-white"
            />

            <select
              value={sortOrder}
              onChange={handleSortChange}
              aria-label="検索結果の並び替え"
              className="rounded-xl border-2 border-white/40 bg-white px-4 py-3 font-extrabold text-slate-950 outline-none focus:border-white"
            >
              <option value="relevance">
                関連度順
              </option>

              <option value="date">
                新着順
              </option>

              <option value="viewCount">
                再生回数順
              </option>
            </select>

            <button
              type="button"
              onClick={handleSearch}
              className="rounded-xl bg-white px-6 py-3 font-extrabold text-slate-950 shadow-sm transition hover:bg-slate-100"
            >
              検索
            </button>

          </div>
        )}

        {/* ★ 新しく追加する投稿ボタン */}
        <Link
          href="/post"
          className="flex-shrink-0 rounded-xl bg-green-500 px-6 py-3 font-extrabold text-white shadow-sm transition hover:bg-green-600"
        >
          ＋ 投稿
        </Link>

        {/* マイページ */}
        <Link
          href="/mypage"
          className="flex-shrink-0 rounded-xl bg-slate-900 px-5 py-3 font-extrabold text-white shadow-sm transition hover:bg-slate-700"
        >
          ⭐ マイページ
        </Link>

      </div>
    </header>
  );
}