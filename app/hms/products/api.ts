// web/app/hms/products/api.ts
export const fetcher = (url: string) =>
  fetch(url).then((r) => r.json());

export async function readProduct(id: string) {
  return fetch(`/api/products/${id}`).then((r) => r.json());
}

export async function saveProduct(data: any, id?: string) {
  return fetch(id ? `/api/products/${id}` : "/api/products", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
}
