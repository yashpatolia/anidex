"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";

const TARGET_SIZE = 256;

// Downscales/crops whatever the user picked to a small square JPEG before
// it ever leaves the browser — keeps the upload small and keeps encoding
// (and its browser-support quirks, e.g. WebP export) off the server
// entirely. This app has no blob/file storage; the result gets stored
// inline as a data URL (see prisma/schema.prisma's avatarImage comment).
function resizeToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image"));
    };
    img.src = url;
  });
}

export function AvatarUpload({
  username,
  initialSrc,
  initialHasCustom,
}: {
  username: string;
  initialSrc: string | null;
  initialHasCustom: boolean;
}) {
  const [src, setSrc] = useState(initialSrc);
  const [hasCustom, setHasCustom] = useState(initialHasCustom);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets picking the same file again re-trigger onChange
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const dataUrl = await resizeToSquareDataUrl(file);
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!res.ok) throw new Error();
      setSrc(dataUrl);
      setHasCustom(true);
    } catch {
      setError("Couldn't upload that image. Try a different one.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSrc(null);
      setHasCustom(false);
    } catch {
      setError("Couldn't remove your picture. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={src} username={username} size={64} />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:border-hanko hover:text-hanko disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Change picture"}
          </button>
          {hasCustom && (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="font-mono text-xs uppercase tracking-widest text-ash transition-colors hover:text-hanko disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="font-mono text-xs text-hanko">{error}</p>}
        <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      </div>
    </div>
  );
}
