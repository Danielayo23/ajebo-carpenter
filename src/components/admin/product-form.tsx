"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, Plus } from "lucide-react";

type Category = {
  id: number;
  name: string;
};

type InitialData = {
  id?: number;
  name: string;
  slug: string;
  description: string;
  priceKobo: number;
  stock: number;
  imageUrl: string | null;
  images?: string[] | null; // ✅ extra images
  categoryId: number;
};

export default function ProductForm({
  categories,
  action,
  initial,
  submitLabel,
}: {
  categories: Category[];
  action: (formData: FormData) => void;
  initial?: InitialData;
  submitLabel: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const initialImages =
    (initial?.images && initial.images.length > 0
      ? initial.images
      : initial?.imageUrl
      ? [initial.imageUrl]
      : []) ?? [];

  const [images, setImages] = useState<string[]>(initialImages.filter(Boolean) as string[]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const MAX_IMAGES = 6;

  async function uploadOne(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Upload failed");
    }

    const data = (await res.json()) as { url?: string };
    if (!data.url) throw new Error("Upload failed: no URL returned");
    return data.url;
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadError(null);
    setUploading(true);

    try {
      const room = Math.max(0, MAX_IMAGES - images.length);
      const toUpload = files.slice(0, room);

      const uploaded: string[] = [];
      for (const f of toUpload) {
        const url = await uploadOne(f);
        uploaded.push(url);
      }

      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAt(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setUploadError(null);
  }

  const primaryImage = images[0] ?? "";

  return (
    <form action={action} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Image Upload */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Product Images</h3>

            {/* Main preview */}
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-gray-100">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt="Primary"
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center text-sm text-gray-400">
                    No image yet
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative">
                      <img
                        src={url}
                        alt={`Image ${idx + 1}`}
                        className="h-20 w-full rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                        aria-label="Remove image"
                      >
                        <X size={14} />
                      </button>
                      {idx === 0 ? (
                        <div className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Primary
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadError ? (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {uploadError}
                </div>
              ) : null}

              {/* Hidden fields used by server actions */}
              <input type="hidden" name="imageUrl" value={primaryImage} />
              <input type="hidden" name="images" value={JSON.stringify(images)} />

              {/* Upload controls */}
              <div className="flex gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || images.length >= MAX_IMAGES}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  {uploading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Uploading…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Upload size={16} />
                      Add Images
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || images.length >= MAX_IMAGES}
                  className="inline-flex items-center justify-center rounded-xl bg-[#04209d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#03185a] disabled:opacity-60"
                  aria-label="Add"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="text-xs text-gray-500">
                You can upload up to {MAX_IMAGES} images. The first image is used as the primary image.
              </div>

              {uploading ? (
                <div className="text-xs text-gray-500">Please wait for uploads to finish…</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Column - Product Details */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-sm font-semibold text-gray-900">Product Details</h3>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={initial?.name}
                  placeholder="Modern velvet sofa"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  name="slug"
                  defaultValue={initial?.slug}
                  placeholder="modern-velvet-sofa"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  name="categoryId"
                  defaultValue={initial?.categoryId ?? ""}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    name="price"
                    defaultValue={initial ? initial.priceKobo / 100 : ""}
                    placeholder="50000"
                    required
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    name="stock"
                    defaultValue={initial?.stock ?? ""}
                    placeholder="100"
                    required
                    min="0"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={initial?.description}
                  placeholder="A sleek, contemporary sofa upholstered in soft premium velvet..."
                  rows={6}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-[#04209d] focus:outline-none focus:ring-2 focus:ring-[#04209d]/20"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="text-xs text-gray-500">
                  {images.length === 0 ? "Upload at least 1 image to publish." : null}
                </div>

                <button
                  type="submit"
                  disabled={uploading || images.length === 0}
                  className="rounded-xl bg-[#04209d] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#03185a] disabled:opacity-60"
                >
                  {submitLabel}
                </button>
              </div>

              {uploading ? (
                <div className="text-xs text-gray-500">Please wait for image upload to finish…</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
