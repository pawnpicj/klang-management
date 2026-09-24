import {
  avatarMimeTypes,
  hasValidAvatarSignature,
} from "@/features/auth/avatar";

export const assetImageMaxBytes = 5 * 1024 * 1024;
export const assetImageMimeTypes = avatarMimeTypes;

export function getAssetImageValidationError(file: {
  size: number;
  type: string;
}): string | null {
  if (
    !assetImageMimeTypes.includes(
      file.type as (typeof assetImageMimeTypes)[number],
    )
  ) {
    return "เลือกได้เฉพาะไฟล์ JPEG, PNG, WebP หรือ GIF";
  }
  if (file.size > assetImageMaxBytes) {
    return "รูป Asset ต้องมีขนาดไม่เกิน 5 MB";
  }
  return null;
}

export const hasValidAssetImageSignature = hasValidAvatarSignature;
