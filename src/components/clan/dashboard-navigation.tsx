import Link from "next/link";
import {
  Boxes,
  Hammer,
  Package,
  ShieldCheck,
  TimerReset,
  Truck,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

const items = [
  { path: "craft-item", label: "Craft Item", icon: Hammer },
  { path: "deliveries", label: "Delivery", icon: Truck },
  { path: "inventory", label: "Inventory", icon: Boxes },
  { path: "loops", label: "Loop / Checkpoint", icon: TimerReset },
  { path: "roles", label: "Roles และ Permissions", icon: ShieldCheck },
  { path: "assets", label: "Assets", icon: Package },
  { path: "warehouses", label: "Warehouses", icon: Warehouse },
  { path: "members", label: "Member", icon: UsersRound },
];
export function DashboardNavigation({
  clanSlug,
  canManageMembers,
}: {
  clanSlug: string;
  canManageMembers: boolean;
}) {
  const htmlIdPrefix = useHtmlId();

  return (
    <nav
      id={htmlId("clan_dashboard_navigation_clan_gang", htmlIdPrefix)}
      aria-label="เมนู Clan/Gang"
      className="brand-navigation mt-7 flex flex-wrap gap-3"
    >
      {items
        .filter((item) => item.path !== "members" || canManageMembers)
        .map(({ path, label, icon: Icon }, htmlRowIndex1) => (
          <Link
            id={htmlId(
              "clan_dashboard_navigation_link",
              htmlIdPrefix,
              htmlRowIndex1,
            )}
            key={path}
            href={`/c/${clanSlug}/${path}`}
            aria-label={label}
            className="group border-input/80 bg-background hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-ring flex h-14 items-center rounded-xl border p-2 shadow-sm transition duration-200 outline-none hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <span className="bg-primary/[0.08] text-primary group-hover:bg-primary/[0.14] flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors">
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span
              id={htmlId("dashboard_menu_label", htmlIdPrefix, path)}
              aria-hidden="true"
              className="max-w-0 overflow-hidden text-sm font-semibold whitespace-nowrap opacity-0 transition-[max-width,padding,opacity] duration-300 ease-out group-hover:max-w-64 group-hover:pr-2 group-hover:pl-3 group-hover:opacity-100 group-focus-visible:max-w-64 group-focus-visible:pr-2 group-focus-visible:pl-3 group-focus-visible:opacity-100 motion-reduce:transition-none"
            >
              <span className="block -translate-x-2 transition-transform duration-300 group-hover:translate-x-0 group-focus-visible:translate-x-0 motion-reduce:transition-none">
                {label}
              </span>
            </span>
          </Link>
        ))}
    </nav>
  );
}
