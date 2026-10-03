"use client";
import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memberPreviewPath } from "@/features/clans/member-preview";
export function ShareMemberPreview({
  clanSlug,
  clanName,
  enabled,
}: {
  clanSlug: string;
  clanName: string;
  enabled: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState("");
  async function share() {
    const url = new URL(memberPreviewPath(clanSlug), window.location.origin)
      .href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `รายชื่อสมาชิก ${clanName}`, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setFallback(url);
    }
  }
  return (
    <div id="member_preview_share_container" className="relative">
      <Button
        id="member_preview_share"
        type="button"
        variant="outline"
        size="sm"
        className="size-8 p-0"
        onClick={share}
        disabled={!enabled}
        aria-label={copied ? "คัดลอกลิงก์แล้ว" : "แชร์รายชื่อสมาชิก"}
        title={
          !enabled
            ? "เปิดรายชื่อสมาชิกสาธารณะในหน้าตั้งค่า"
            : copied
              ? "คัดลอกลิงก์แล้ว"
              : "แชร์รายชื่อสมาชิก"
        }
      >
        {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      </Button>
      <span id="member_preview_share_status" role="status" className="sr-only">
        {copied ? "คัดลอกลิงก์แล้ว" : ""}
      </span>
      {fallback && (
        <input
          id="member_preview_share_link"
          aria-label="ลิงก์รายชื่อสมาชิก"
          value={fallback}
          readOnly
          onFocus={(event) => event.target.select()}
          className="border-input bg-background absolute top-10 right-0 z-10 h-10 w-64 rounded-md border px-3 text-xs shadow-lg"
        />
      )}
    </div>
  );
}
