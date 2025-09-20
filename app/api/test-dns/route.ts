import dns from "dns";

export async function GET() {
  try {
    const res = await dns.promises.lookup("db.uxaxrrpxgagezzybqiiz.supabase.co");
    return new Response(JSON.stringify(res));
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }));
  }
}
