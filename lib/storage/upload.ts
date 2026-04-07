import { getSupabaseAdmin } from "@/lib/supabase/server";

const IMAGE_BUCKET = "chat-images";

export async function uploadImage(file: File, chatId: string): Promise<string> {
  const supabase = getSupabaseAdmin();

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${chatId}/${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
