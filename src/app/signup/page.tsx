"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();

    const { data, error: signUpError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      alert("アカウントを作成しました！");
      router.push("/mypage");
      return;
    }

    setMessage(
      "アカウントを作成しました。確認メールを送信しました。メールを確認してからログインしてください。"
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <Link
          href="/"
          className="mb-6 inline-block font-bold text-blue-600 hover:underline"
        >
          ← URLinkに戻る
        </Link>

        <h1 className="text-3xl font-extrabold text-slate-950">
          アカウント作成
        </h1>

        <p className="mt-2 text-slate-600">
          URLinkをはじめよう
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <div>
            <label className="mb-2 block font-bold text-slate-800">
              ユーザー名
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="ユーザー名"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-4 text-slate-950 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-slate-800">
              メールアドレス
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="example@email.com"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-4 text-slate-950 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-slate-800">
              パスワード
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="8文字以上"
              minLength={8}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-4 text-slate-950 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl bg-green-50 p-4 font-bold text-green-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 py-4 text-lg font-extrabold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "作成中..."
              : "アカウントを作成"}
          </button>
        </form>

        <div className="mt-7 border-t pt-6 text-center">
          <p className="text-slate-600">
            すでにアカウントを持っていますか？
          </p>

          <Link
            href="/login"
            className="mt-2 inline-block font-extrabold text-blue-600 hover:underline"
          >
            ログイン
          </Link>
        </div>
      </div>
    </main>
  );
}