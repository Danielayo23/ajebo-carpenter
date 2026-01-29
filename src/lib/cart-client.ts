export type GuestCartItem = { productId: number; quantity: number };

const KEY = "ajebo_guest_cart_v1";

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({
        productId: Number(x.productId),
        quantity: Math.max(1, Number(x.quantity || 1)),
      }))
      .filter((x) => Number.isFinite(x.productId) && x.productId > 0);
  } catch {
    return [];
  }
}

export function setGuestCart(items: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToGuestCart(productId: number, qty = 1) {
  const items = getGuestCart();
  const i = items.findIndex((x) => x.productId === productId);
  if (i >= 0) items[i].quantity += Math.max(1, qty);
  else items.push({ productId, quantity: Math.max(1, qty) });
  setGuestCart(items);
}
