export const API_BASE = "https://express-js-on-vercel-rosy-one.vercel.app";

export async function apiPost(path: string, body: any, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  return res.json();
}
