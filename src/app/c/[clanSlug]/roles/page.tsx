import { ActionNotice } from "@/components/ui/action-notice";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/clan/app-header";
import {
  CreateRoleForm,
  EditRoleForm,
} from "@/components/clan/role-management-forms";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";

export default async function RolesPage({
  params,
  searchParams,
}: {
  params: Promise<{ clanSlug: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const [{ clanSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string")
    redirect(`/login?next=${encodeURIComponent(`/c/${clanSlug}/roles`)}`);
  const { data: clan } = await supabase
    .from("clans")
    .select("id,name,slug")
    .eq("slug", clanSlug)
    .maybeSingle();
  if (!clan) notFound();
  const [{ data: roles }, { data: permissions }, { data: canManage }] =
    await Promise.all([
      supabase
        .from("clan_roles")
        .select("id,name,is_system_role,role_permissions(permission_code)")
        .eq("clan_id", clan.id)
        .order("is_system_role", { ascending: false })
        .order("name"),
      supabase.from("permissions").select("code,description").order("code"),
      supabase.rpc("has_clan_permission", {
        p_clan_id: clan.id,
        p_permission_code: "member.manage",
      }),
    ]);
  const notice = query.created
    ? "สร้าง Custom Role แล้ว"
    : query.updated
      ? "แก้ไข Role แล้ว"
      : query.deleted
        ? "ลบ Role แล้ว"
        : null;

  return (
    <>
      <AppHeader activeClan={clan.name} />
      <main
        id={htmlId("roles_roles_page_main")}
        className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              id={htmlId("roles_roles_page_dashboard")}
              href={`/c/${clan.slug}/dashboard`}
              className="text-primary text-sm font-medium hover:underline"
            >
              ← กลับ Dashboard
            </Link>
            <h1
              id={htmlId("roles_roles_page_roles_permissions")}
              className="mt-4 text-3xl font-bold"
            >
              Roles และ Permissions
            </h1>
            <p
              id={htmlId("roles_roles_page_clan_name")}
              className="text-muted-foreground mt-2"
            >
              {clan.name}
            </p>
          </div>
          <Button
            id={htmlId("roles_roles_page_button")}
            asChild
            variant="outline"
          >
            <Link
              id={htmlId("roles_roles_page_link")}
              href={`/c/${clan.slug}/members`}
            >
              สมาชิก
            </Link>
          </Button>
        </div>
        {notice && (
          <ActionNotice
            queryKeys={["created", "updated", "deleted"]}
            className="mt-6 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {notice}
          </ActionNotice>
        )}
        {query.error && (
          <p
            id={htmlId("roles_roles_page_p")}
            className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {query.error === "role-in-use"
              ? "ลบ Role ไม่ได้ เพราะยังมีสมาชิกใช้งานอยู่"
              : "ลบ Role ไม่สำเร็จ"}
          </p>
        )}
        {canManage && permissions && (
          <section
            id={htmlId("roles_roles_page_section")}
            className="border-input mt-8 rounded-xl border p-5 sm:p-6"
          >
            <h2
              id={htmlId("roles_roles_page_custom_role")}
              className="text-lg font-semibold"
            >
              สร้าง Custom Role
            </h2>
            <div className="mt-5">
              <CreateRoleForm clanSlug={clan.slug} permissions={permissions} />
            </div>
          </section>
        )}
        <section
          id={htmlId("roles_roles_page_section_2")}
          className="mt-8 space-y-4"
        >
          <h2
            id={htmlId("roles_roles_page_role")}
            className="text-xl font-semibold"
          >
            Role ทั้งหมด
          </h2>
          {roles?.map((role, htmlRowIndex1) => {
            const selected = role.role_permissions.map(
              (item) => item.permission_code,
            );
            return (
              <article
                id={htmlId("roles_roles_page_article", htmlRowIndex1)}
                key={role.id}
                className="border-input rounded-xl border p-5 sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3
                    id={htmlId("roles_roles_page_role_name", htmlRowIndex1)}
                    className="text-lg font-semibold"
                  >
                    {role.name}
                  </h3>
                  <span className="bg-muted rounded-full px-2.5 py-1 text-xs">
                    {role.is_system_role ? "System" : "Custom"}
                  </span>
                </div>
                {role.is_system_role || !canManage ? (
                  <div className="flex flex-wrap gap-2">
                    {selected.map((code) => (
                      <span
                        key={code}
                        className="bg-muted rounded-md px-2 py-1 text-xs"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                ) : (
                  permissions && (
                    <EditRoleForm
                      clanSlug={clan.slug}
                      role={{
                        id: role.id,
                        name: role.name,
                        permissionCodes: selected,
                      }}
                      permissions={permissions}
                    />
                  )
                )}
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}
