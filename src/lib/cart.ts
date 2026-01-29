// src/lib/cart.ts
export type CartLine = {
  id: number; // product id
  name: string;
  slug: string;
  price: number; // kobo
  quantity: number;
  image: string;
};

const KEY = "ajebo_cart_v1";

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as CartLine[];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(lines));
}

export function setQty(lines: CartLine[], id: number, quantity: number) {
  const q = Math.max(1, Math.floor(quantity || 1));
  return lines.map((l) => (l.id === id ? { ...l, quantity: q } : l));
}

export function removeLine(lines: CartLine[], id: number) {
  return lines.filter((l) => l.id !== id);
}

export function clearCart() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
