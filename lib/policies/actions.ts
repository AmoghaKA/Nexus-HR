"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAuth } from "@/lib/supabase/auth-client";
import {
  chunkPolicyText,
  extractPolicyText,
  fileExtensionOf,
  mimeTypeOf,
  slugify,
} from "@/lib/policies/extract";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PolicyIndexRow {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  status: string;
  version: number;
  contentLength: number;
  fileName: string | null;
  filePath: string | null;
  mimeType: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ListPoliciesResult =
  | { ok: true; policies: PolicyIndexRow[] }
  | { ok: false; error: string };

export type UploadPolicyResult =
  | { ok: true; id: string; title: string; slug: string; chunkCount: number }
  | { ok: false; error: string };

export type DeletePolicyResult =
  | { ok: true; deleted: boolean }
  | { ok: false; error: string };

export type GetPolicySourceResult =
  | { ok: true; url: string; fileName: string | null }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// List policies with chunk counts (service-role client, read-only)
// ---------------------------------------------------------------------------

export async function listPolicies(): Promise<ListPoliciesResult> {
  const supabase = getSupabaseServer();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  try {
    const [{ data: policies, error: policyErr }, { data: chunks, error: chunkErr }] = await Promise.all([
      supabase
        .from("policies")
        .select("id, title, slug, category, status, version, content, file_name, file_path, mime_type, created_at, updated_at")
        .order("updated_at", { ascending: false }),
      supabase.from("policy_chunks").select("policy_id"),
    ]);

    if (policyErr) return { ok: false, error: `policies: ${policyErr.message}` };
    if (chunkErr) return { ok: false, error: `policy_chunks: ${chunkErr.message}` };

    const chunkCountMap = new Map<string, number>();
    for (const row of chunks ?? []) {
      chunkCountMap.set(row.policy_id, (chunkCountMap.get(row.policy_id) ?? 0) + 1);
    }

    const result: PolicyIndexRow[] = (policies ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      status: p.status,
      version: p.version,
      contentLength: (p.content ?? "").length,
      fileName: p.file_name,
      filePath: p.file_path,
      mimeType: p.mime_type,
      chunkCount: chunkCountMap.get(p.id) ?? 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return { ok: true, policies: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to list policies." };
  }
}

// ---------------------------------------------------------------------------
// Upload / re-index a policy document
// ---------------------------------------------------------------------------

export async function uploadPolicy(input: {
  title: string;
  category?: string | null;
  fileName: string;
  mimeType?: string;
  base64: string;
}): Promise<UploadPolicyResult> {
  const auth = await getSupabaseAuth();
  if (!auth) return { ok: false, error: "Supabase is not configured." };

  try {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Policy title is required." };
    if (!input.fileName) return { ok: false, error: "No file provided." };

    const category = input.category ?? null;
    const validCategories = ["hr", "finance", "it", "security", "conduct"];
    const safeCategory = category && validCategories.includes(category) ? category : null;

    const mimeType = mimeTypeOf(input.fileName, input.mimeType);
    const buffer = Buffer.from(input.base64, "base64");
    const text = await extractPolicyText(new Uint8Array(buffer), mimeType);
    if (!text.replace(/\s+/g, "")) {
      return { ok: false, error: "The uploaded file does not contain extractable text." };
    }

    const slug = `${slugify(title)}-${Date.now().toString(36)}`;
    const ext = fileExtensionOf(input.fileName, mimeType);
    const filePath = `policy-uploads/${slug}.${ext}`;

    // Ensure the user is authenticated (RLS is_hr() gate)
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in to upload policies." };

    const uploadRes = await auth.storage.from("policies").upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadRes.error) {
      return { ok: false, error: `Storage upload failed: ${uploadRes.error.message}` };
    }

    const { data: policy, error: insertErr } = await auth
      .from("policies")
      .insert({
        title,
        slug,
        category: safeCategory,
        status: "published",
        version: 1,
        content: text,
        file_name: input.fileName,
        file_path: filePath,
        mime_type: mimeType,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertErr) {
      await auth.storage.from("policies").remove([filePath]).catch(() => {});
      return { ok: false, error: `Failed to insert policy: ${insertErr.message}` };
    }

    const chunks = chunkPolicyText(text);
    if (chunks.length) {
      const { error: chunkErr } = await auth.from("policy_chunks").insert(
        chunks.map((content, index) => ({
          policy_id: policy!.id,
          chunk_index: index,
          content,
          character_count: content.length,
        }))
      );
      if (chunkErr) {
        await auth.from("policies").delete().eq("id", policy!.id);
        await auth.storage.from("policies").remove([filePath]).catch(() => {});
        return { ok: false, error: `Failed to save policy chunks: ${chunkErr.message}` };
      }
    }

    return { ok: true, id: policy!.id, title, slug, chunkCount: chunks.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to upload policy." };
  }
}

// ---------------------------------------------------------------------------
// Delete a policy + storage + chunks (cascade handles chunks)
// ---------------------------------------------------------------------------

export async function deletePolicy(policyId: string): Promise<DeletePolicyResult> {
  const auth = await getSupabaseAuth();
  if (!auth) return { ok: false, error: "Supabase is not configured." };

  try {
    const { data: row, error: fetchErr } = await auth
      .from("policies")
      .select("file_path")
      .eq("id", policyId)
      .single();

    if (fetchErr) return { ok: false, error: `Could not load policy: ${fetchErr.message}` };

    if (row?.file_path) {
      const { error: storageErr } = await auth.storage.from("policies").remove([row.file_path]);
      if (storageErr && !storageErr.message.toLowerCase().includes("not found")) {
        console.warn("policy delete: storage removal failed:", storageErr.message);
      }
    }

    const { error: deleteErr } = await auth.from("policies").delete().eq("id", policyId);
    if (deleteErr) return { ok: false, error: `Failed to delete policy: ${deleteErr.message}` };

    return { ok: true, deleted: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to delete policy." };
  }
}

// ---------------------------------------------------------------------------
// Create a time-limited signed URL for the source file
// ---------------------------------------------------------------------------

export async function getPolicySourceUrl(policyId: string): Promise<GetPolicySourceResult> {
  const auth = await getSupabaseAuth();
  if (!auth) return { ok: false, error: "Supabase is not configured." };

  try {
    const { data, error } = await auth
      .from("policies")
      .select("file_path, file_name")
      .eq("id", policyId)
      .single();

    if (error) return { ok: false, error: `Could not load policy: ${error.message}` };
    if (!data?.file_path) return { ok: false, error: "This policy has no uploaded source file." };

    const signed = await auth.storage.from("policies").createSignedUrl(data.file_path, 600);
    if (signed.error) return { ok: false, error: `Could not create signed URL: ${signed.error.message}` };

    return { ok: true, url: signed.data.signedUrl, fileName: data.file_name };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create signed URL." };
  }
}