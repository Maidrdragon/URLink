
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 space-y-2 font-sans">
      <Link
        href="/"
        className={`block rounded-xl px-4 py-3 text-base font-semibold transition ${
          pathname === "/"
            ? "bg-[#505050] text-white"
            : "text-[#DDDDDD] hover:bg-[#505050] hover:text-white"
        }`}
      >
        ホーム
      </Link>

      <Link
        href="/mypage"
        className={`block rounded-xl px-4 py-3 text-base font-semibold transition ${
          pathname === "/mypage"
            ? "bg-[#505050] text-white"
            : "text-[#DDDDDD] hover:bg-[#505050] hover:text-white"
        }`}
      >
        マイページ
      </Link>
    </nav>
  );
}
