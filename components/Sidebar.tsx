
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
            ? "bg-[#383838] text-white"
            : "text-[#BBBBBB] hover:bg-[#292929] hover:text-white"
        }`}
      >
        ホーム
      </Link>

      <Link
        href="/mypage"
        className={`block rounded-xl px-4 py-3 font-extrabold transition ${
          pathname === "/mypage"
            ? "bg-[#383838] text-white"
            : "text-[#BBBBBB] hover:bg-[#292929] hover:text-white"
        }`}
      >
        マイページ
      </Link>
    </nav>
  );
}
