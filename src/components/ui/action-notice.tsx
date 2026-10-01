"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { clearActionNoticeParams } from "@/lib/action-notice";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

type NoticeProps = {
  children: ReactNode;
  className?: string;
  queryKeys: string[];
};

function TimedNotice({
  children,
  className,
  keys,
  signature,
}: {
  children: ReactNode;
  className?: string;
  keys: string;
  signature: string;
}) {
  const htmlIdPrefix = useHtmlId();

  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      const url = new URL(window.location.href);
      // Do not change a newer navigation when an older notice expires.
      if (`${url.pathname}?${url.searchParams.toString()}` !== signature)
        return;
      window.history.replaceState(
        null,
        "",
        clearActionNoticeParams(url.href, keys.split(",")),
      );
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [keys, signature]);
  return visible ? (
    <p
      id={htmlId("ui_timed_notice_p", htmlIdPrefix)}
      className={className}
      role="status"
    >
      {children}
    </p>
  ) : null;
}

export function ActionNotice({ children, className, queryKeys }: NoticeProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (!queryKeys.some((key) => params.has(key))) return null;
  const signature = `${pathname}?${params.toString()}`;
  return (
    <TimedNotice
      key={signature}
      signature={signature}
      keys={queryKeys.join(",")}
      className={className}
    >
      {children}
    </TimedNotice>
  );
}
