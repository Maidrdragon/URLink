//7/19日に訂正済み文
// import Image from "next/image";

// export default function Header() {
//   return (
//     <header className="h-28 bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-cyan-500 via-blue-500 to-purple-600 shadow-lg">
//       <div className="flex h-full items-center gap-6 px-8">

//         <Image
//           src="/URLink.png"
//           alt="URLink"
//           width={180}
//           height={80}
//           priority
//           className="h-20 w-auto"
//         />

//         <input
//           type="text"
//           placeholder="検索..."
//           className="flex-1 rounded-full bg-slate-800 px-6 py-3 text-white outline-none"
//         />

//         <button className="rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
//           マイページ
//         </button>

//       </div>
//     </header>
//   );
// }
//ここから新しいやつ7月2021時21分

// "use client";

// import Image from "next/image";
// import Link from "next/link";
// import { useState } from "react";

// type HeaderProps = {
//   onSearch?: (keyword: string) => void;
// };

// export default function Header({ onSearch }: HeaderProps) {
//   const [keyword, setKeyword] = useState("");

//   function handleSearch() {
//     const trimmedKeyword = keyword.trim();

//     if (!trimmedKeyword || !onSearch) {
//       return;
//     }

//     onSearch(trimmedKeyword);
//   }

//   function handleKeyDown(
//     event: React.KeyboardEvent<HTMLInputElement>
//   ) {
//     if (event.key === "Enter") {
//       handleSearch();
//     }
//   }

//   return (
//     <header className="sticky top-0 z-50 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 shadow-lg">
//       <div className="mx-auto flex max-w-[1600px] items-center gap-5 px-6 py-2">
//         {/* URLink画像ロゴ */}
//         <Link
//           href="/"
//           className="flex flex-shrink-0 items-center transition hover:opacity-90"
//         >
//           <Image
//             src="/URLink.png"
//             alt="URLink"
//             width={260}
//             height={90}
//             priority
//             className="h-20 w-auto object-contain"
//           />
//         </Link>

//         {/* 検索バー */}
//         {onSearch && (
//           <div className="flex flex-1 items-center gap-2">
//             <input
//               type="text"
//               value={keyword}
//               onChange={(event) =>
//                 setKeyword(event.target.value)
//               }
//               onKeyDown={handleKeyDown}
//               placeholder="YouTube・Twitchを検索..."
//               className="min-w-0 flex-1 rounded-xl border-2 border-white/40 bg-white px-4 py-3 text-base font-bold text-slate-950 outline-none placeholder:text-slate-500 focus:border-white"
//             />

//             <button
//               type="button"
//               onClick={handleSearch}
//               className="rounded-xl bg-white px-6 py-3 font-extrabold text-slate-950 shadow-sm transition hover:bg-slate-100"
//             >
//               検索
//             </button>
//           </div>
//         )}

//         {/* マイページ */}
//         <Link
//           href="/mypage"
//           className="flex-shrink-0 rounded-xl bg-slate-900 px-5 py-3 font-extrabold text-white shadow-sm transition hover:bg-slate-700"
//         >
//           ⭐ マイページ
//         </Link>
//       </div>
//     </header>
//   );
// }
///072111時21分に変更ここから新しいやつ、人気順とかの機能
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
        {/* URLink画像ロゴ */}
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

            {/* 並び替え */}
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