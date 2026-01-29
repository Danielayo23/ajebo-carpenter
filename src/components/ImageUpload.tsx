'use client';

import { useState } from 'react';

export default function ImageUpload({
  onUpload,
}: {
  onUpload: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    onUpload(data.url);

    setLoading(false);
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleChange} />
      {loading && <p className="text-sm text-gray-500">Uploading...</p>}
    </div>
  );
}
