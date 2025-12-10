// web/app/hms/products/components/MediaUploader.tsx
"use client";

import { useRef } from "react";

export default function MediaUploader({
  media,
  setMedia,
}: {
  media: any[];
  setMedia: (v: any[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/media/upload", {
      method: "POST",
      body,
    });

    const json = await res.json();

    setMedia([...media, json]);
  };

  const remove = async (id: string) => {
    await fetch(`/api/media/${id}`, { method: "DELETE" });
    setMedia(media.filter((m) => m.id !== id));
  };

  return (
    <div className="mt-10 space-y-6">
      <button
        onClick={() => fileInput.current?.click()}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl"
      >
        Upload File
      </button>

      <input
        type="file"
        ref={fileInput}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />

      <div className="grid grid-cols-3 gap-6">
        {media.map((m) => (
          <div
            key={m.id}
            className="relative p-3 bg-white/70 rounded-xl border shadow"
          >
            <img
              src={m.url}
              className="rounded-xl object-cover w-full h-36"
            />

            <button
              onClick={() => remove(m.id)}
              className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-lg text-xs"
            >
              ✕
            </button>
          </div>
        ))}

        {media.length === 0 && (
          <div className="text-gray-500">No media uploaded.</div>
        )}
      </div>
    </div>
  );
}
