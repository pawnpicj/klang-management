import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { getAssetImageUrls } from "@/lib/supabase/asset-images";
import type { Database } from "@/types/database";

function storage(data: unknown) {
  const createSignedUrls = vi.fn().mockResolvedValue({ data });
  const from = vi.fn().mockReturnValue({ createSignedUrls });
  return {
    client: { storage: { from } } as unknown as SupabaseClient<Database>,
    from,
    createSignedUrls,
  };
}

describe("asset image batch signing", () => {
  it("signs unique private paths once and maps responses by path", async () => {
    const mock = storage([
      { path: "clan/b.png", signedUrl: "https://signed/b" },
      { path: "clan/a.png", signedUrl: "https://signed/a" },
    ]);
    const urls = await getAssetImageUrls(mock.client, [
      { id: "a", image_url: "clan/a.png" },
      { id: "b", image_url: "clan/b.png" },
      { id: "duplicate", image_url: "clan/a.png" },
      { id: "public", image_url: "https://example.com/image.png" },
      { id: "missing", image_url: null },
    ]);
    expect(mock.from).toHaveBeenCalledWith("asset-images");
    expect(mock.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(mock.createSignedUrls).toHaveBeenCalledWith(
      ["clan/a.png", "clan/b.png"],
      3600,
    );
    expect(urls.get("a")).toBe("https://signed/a");
    expect(urls.get("duplicate")).toBe("https://signed/a");
    expect(urls.get("b")).toBe("https://signed/b");
    expect(urls.get("public")).toBe("https://example.com/image.png");
    expect(urls.get("missing")).toBeNull();
  });
  it("makes no storage request when there are no private images", async () => {
    const mock = storage([]);
    await getAssetImageUrls(mock.client, [{ id: "empty", image_url: null }]);
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("keeps the placeholder for images that could not be signed", async () => {
    const mock = storage([
      { path: "clan/a.png", signedUrl: "", error: "not found" },
    ]);
    const urls = await getAssetImageUrls(mock.client, [
      { id: "a", image_url: "clan/a.png" },
    ]);
    expect(urls.get("a")).toBeNull();
  });
});
