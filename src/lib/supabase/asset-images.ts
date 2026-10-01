import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Sign private images in one request, retaining direct URLs and missing images.
export async function getAssetImageUrls(
  supabase: SupabaseClient<Database>,
  assets: Array<{ id: string; image_url: string | null }>,
  bucket = "asset-images",
) {
  const urls = new Map<string, string | null>();
  const paths = new Set<string>();
  for (const asset of assets) {
    const image = asset.image_url;
    urls.set(asset.id, image && /^https?:\/\//i.test(image) ? image : null);
    if (image && !/^https?:\/\//i.test(image)) paths.add(image);
  }
  if (!paths.size) return urls;
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrls([...paths], 3600);
  const signed = new Map(
    (data ?? []).map((image) => [image.path, image.signedUrl]),
  );
  for (const asset of assets) {
    if (asset.image_url && paths.has(asset.image_url)) {
      urls.set(asset.id, signed.get(asset.image_url) || null);
    }
  }
  return urls;
}
