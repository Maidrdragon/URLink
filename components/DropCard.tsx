export default function DropCard() {
  return (
    <div className="flex aspect-video cursor-pointer items-center justify-center rounded-xl border-4 border-dashed border-blue-400 bg-blue-50 transition hover:bg-blue-100">

      <div className="text-center">

        <p className="text-6xl font-bold text-blue-500">
          ＋
        </p>

        <p className="mt-2 text-lg font-semibold text-gray-700">
          ここへURLをドロップ
        </p>

        <p className="mt-2 text-sm text-gray-500">
          YouTube・Twitch・Kick対応予定
        </p>

      </div>

    </div>
  );
}
//0719に新しく追加したやつ新規で既存の変更ではなく