import { getConfiguredProviders } from "@/lib/ai/router";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "nexushr",
    integrations: {
      supabase: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    },
    ai: {
      providers: getConfiguredProviders(),
    },
  });
}