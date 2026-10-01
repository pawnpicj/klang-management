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
  return (
    <nav
      aria-label="เมนู Clan/Gang"
      className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {items
        .filter((item) => item.path !== "members" || canManageMembers)
        .map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            href={`/c/${clanSlug}/${path}`}
            className="group border-input/80 bg-background hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-ring flex min-h-20 items-center gap-3 rounded-xl border p-3 shadow-sm transition duration-150 outline-none hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 sm:p-4"
          >
            <span className="bg-primary/[0.08] text-primary group-hover:bg-primary/[0.14] flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors">
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="min-w-0 text-sm leading-5 font-semibold">
              {label}
            </span>
          </Link>
        ))}
    </nav>
  );
}
