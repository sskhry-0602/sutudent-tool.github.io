function corsHeaders(origin, allowedOrigin) {
  const allowed = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || "");
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return Response.json({ error: "Not found" }, { status: 404, headers: cors });
    }
    if (origin !== env.ALLOWED_ORIGIN) {
      return Response.json({ error: "Origin not allowed" }, { status: 403, headers: cors });
    }
    if (!env.OPENAI_API_KEY) {
      return Response.json({ error: "AI service is not configured." }, { status: 503, headers: cors });
    }
    try {
      const body = await request.json();
      if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 12) {
        return Response.json({ error: "Invalid messages." }, { status: 400, headers: cors });
      }
      const messages = body.messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "").slice(0, 5000)
      }));
      const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: "あなたは日本語で回答する親切な学習 tutor です。学生の理解度に合わせて、答えだけでなく考え方を段階的に説明してください。必要なら例題を出してください。危険・違法な依頼には協力せず、安全な学習内容に誘導してください。" },
            ...messages
          ],
          temperature: 0.6,
          max_tokens: 900
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        return Response.json({ error: data.error?.message || "AI provider error." }, { status: 502, headers: cors });
      }
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) throw new Error("AI returned an empty response.");
      return Response.json({ reply }, { headers: { ...cors, "Cache-Control": "no-store" } });
    } catch (error) {
      return Response.json({ error: error.message || "Unexpected server error." }, { status: 500, headers: cors });
    }
  }
};