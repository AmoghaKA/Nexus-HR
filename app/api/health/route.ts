export async function GET() {
  return Response.json({
    status: "ok",
    service: "workforceiq",
    integrations: {
      supabase: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
  });
}