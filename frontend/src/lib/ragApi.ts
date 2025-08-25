
const BASE = process.env.NEXT_PUBLIC_RAG_BASE || "http://127.0.0.1:7000";

export async function ragLoad(url: string, sessionId?: string) {
  const res = await fetch(`${BASE}/rag/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, session_id: sessionId || "new" }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; session_id: string; doc_count: number }>;
}

export async function ragChat(message: string, sessionId: string) {
  const res = await fetch(`${BASE}/rag/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; session_id: string; answer: string; citations: string[] }>;
}
