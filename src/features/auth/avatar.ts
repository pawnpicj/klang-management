export const avatarMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const avatarMaxBytes = 5 * 1024 * 1024;

export function getAvatarValidationError(file: {
  size: number;
  type: string;
}): string | null {
  if (
    !avatarMimeTypes.includes(file.type as (typeof avatarMimeTypes)[number])
  ) {
    return "เลือกได้เฉพาะไฟล์ JPEG, PNG, WebP หรือ GIF";
  }
  if (file.size > avatarMaxBytes) {
    return "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB";
  }
  return null;
}

export async function hasValidAvatarSignature(file: Blob): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  }
  if (file.type === "image/gif") {
    return (
      new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" ||
      new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a"
    );
  }
  if (file.type === "image/webp") {
    const decoder = new TextDecoder();
    return (
      decoder.decode(bytes.slice(0, 4)) === "RIFF" &&
      decoder.decode(bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}
