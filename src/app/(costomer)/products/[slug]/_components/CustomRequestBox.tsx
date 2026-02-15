"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Send, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";

type Status = "idle" | "sending" | "success" | "error";

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M12 2a10 10 0 0 1 10 10h-2a8 8 0 0 0-8-8V2z"
      />
    </svg>
  );
}

export default function CustomRequestBox({
  productName,
  productSlug,
}: {
  productName: string;
  productSlug: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { user, isSignedIn } = useUser();

  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  const sending = status === "sending";

  const senderEmail = useMemo(() => {
    if (!isSignedIn) return "";
    return (
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      ""
    );
  }, [isSignedIn, user]);

  // Build thumbnails + cleanup old blob URLs
  useEffect(() => {
    thumbs.forEach((u) => URL.revokeObjectURL(u));
    const next = files.map((f) => URL.createObjectURL(f));
    setThumbs(next);

    return () => {
      next.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Auto-hide success after 3s
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      setMsg("");
      setStatus("idle");
    }, 3000);
    return () => clearTimeout(t);
  }, [status]);

  function openPicker() {
    fileRef.current?.click();
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    setFiles((prev) => [...prev, ...picked]);

    // allow selecting the same file again later
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAllFiles() {
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    setMsg("");

    const hasNote = note.trim().length > 0;
    const hasImages = files.length > 0;

    if (!hasNote && !hasImages) {
      setStatus("error");
      setMsg("Please type a note or upload an image.");
      return;
    }

    setStatus("sending");

    try {
      const fd = new FormData();
      fd.append("productName", productName);
      fd.append("productSlug", productSlug);
      fd.append("note", note.trim());
      if (senderEmail) fd.append("fromEmail", senderEmail);

      // ✅ multi-images
      for (const f of files) fd.append("images", f);

      const res = await fetch("/api/product-note", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setStatus("success");
        setMsg("Sent! We’ll reply soon.");
        setNote("");
        clearAllFiles();
        return;
      }

      setStatus("error");
      setMsg(data?.message ?? "Failed to send. Please try again.");
    } catch {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Need something else?</h3>
      <p className="mt-1 text-xs text-gray-500">
        Leave a note or upload an image and we’ll get back to you.
      </p>

      {/* ✅ Thumbnails (ONLY show when images exist) */}
      {thumbs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {thumbs.map((url, i) => (
            <div
              key={url}
              className="relative h-14 w-14 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
            >
              <img src={url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />

              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={sending}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Remove image"
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ✅ One single horizontal row (WhatsApp-like) */}
      <div className="mt-4 flex items-center gap-2">
        {/* Input pill with ONE image icon inside */}
        <div className="flex h-11 flex-1 items-center rounded-full border border-gray-300 bg-white px-4 shadow-sm focus-within:border-[#04209d] focus-within:ring-2 focus-within:ring-[#04209d]/20">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Leave a note or upload an image"
            disabled={sending}
            className="h-full w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none disabled:cursor-not-allowed"
          />

          {/* ✅ SINGLE image icon (always visible, for multi-upload) */}
          <button
            type="button"
            onClick={openPicker}
            disabled={sending}
            className="ml-2 grid h-9 w-9 place-items-center rounded-full text-gray-600 transition hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Upload images"
            title="Upload images"
          >
            <ImageIcon size={18} />
          </button>
        </div>

        {/* Send (icon-only) */}
        <button
          type="button"
          onClick={submit}
          disabled={sending}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#04209d] text-white shadow-md transition hover:bg-[#0530cc] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Send note"
          title="Send"
        >
          {sending ? <Spinner /> : <Send size={18} />}
        </button>

        {/* Hidden File Input (multiple) */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
      </div>

      {/* Status message */}
      {msg ? (
        <p className={`mt-2 text-xs ${status === "success" ? "text-green-700" : "text-red-600"}`}>
          {msg}
        </p>
      ) : null}

      {/* Optional: show which email is being used (only if logged in) */}
      {senderEmail ? (
        <p className="mt-1 text-[11px] text-gray-400">
          Sending as: <span className="font-medium">{senderEmail}</span>
        </p>
      ) : null}
    </div>
  );
}



