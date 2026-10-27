

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 space-y-2">
      <Link
        href="/"
        className={`block rounded-xl px-4 py-3 font-extrabold transition ${
          pathname === "/"
            ? "bg-blue-600 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        ホーム
      </Link>

      <Link
        href="/mypage"
        className={`block rounded-xl px-4 py-3 font-extrabold transition ${
          pathname === "/mypage"
            ? "bg-blue-600 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        マイページ
      </Link>
    </nav>
  );
}
