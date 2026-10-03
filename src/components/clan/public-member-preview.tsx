import Image from "next/image";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { SocialLogo } from "@/components/clan/social-logo";
import {
  equipmentCategories,
  memberEquipmentSchema,
  memberSocialPlatforms,
  readMemberSocialLinks,
} from "@/features/clans/member-profile";
import { htmlId } from "@/lib/html-id";
import { memberPreviewColumns } from "@/features/clans/member-preview";
import type { Json } from "@/types/database";
export function PublicMemberPreview({
  selected,
  members,
  failed,
  columns,
}: {
  selected?: { name: string };
  members: { character_name: string; social_links: Json; equipment: Json }[];
  failed: boolean;
  columns: string[];
}) {
  return (
    <>
      <header id="preview_members_header" className="border-input border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4 sm:px-6">
          <Link
            id="preview_members_home"
            href="/"
            className="flex items-center gap-3"
          >
            <Image
              id="preview_members_logo"
              src="/klang-icon.png"
              width={40}
              height={40}
              alt=""
            />
            <span id="preview_members_brand" className="font-bold">
              KLANG Management
            </span>
          </Link>
        </div>
      </header>
      <main
        id="preview_members_page"
        className="mx-auto max-w-5xl px-5 py-8 sm:px-6"
      >
        <h1 id="preview_members_title" className="text-3xl font-bold">
          รายชื่อสมาชิก
        </h1>
        {failed ? (
          <p
            id="preview_members_error"
            role="alert"
            className="mt-6 text-red-500"
          >
            โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง
          </p>
        ) : selected ? (
          <section
            id="preview_members_section"
            className="border-input mt-8 overflow-hidden rounded-xl border"
          >
            <div className="border-input flex items-center justify-between gap-4 border-b px-5 py-5">
              <h2
                id="preview_members_clan_name"
                className="flex items-center gap-2 text-xl font-semibold"
              >
                <UsersRound className="text-primary size-6" />
                {selected.name}
              </h2>
              <p
                id="preview_members_count"
                className="text-muted-foreground text-sm"
              >
                {members?.length ?? 0} คน
              </p>
            </div>
            <div id="preview_members_scroll" className="overflow-x-auto">
              <table
                id="preview_members_table"
                className="w-full min-w-[550px] text-left text-sm"
              >
                <thead
                  id="preview_members_table_header"
                  className="bg-muted/50 text-muted-foreground"
                >
                  <tr>
                    {memberPreviewColumns
                      .filter((column) => columns.includes(column.key))
                      .map((column) => (
                        <th
                          id={htmlId("preview_members_column", column.key)}
                          key={column.key}
                          scope="col"
                          className="px-5 py-3 font-semibold"
                        >
                          {column.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody
                  id="preview_members_body"
                  className="divide-input divide-y"
                >
                  {members?.length ? (
                    members.map((member, index) => {
                      const social = readMemberSocialLinks(member.social_links);
                      const parsed = memberEquipmentSchema.element
                        .omit({ quantity: true })
                        .array()
                        .safeParse(member.equipment);
                      const equipment = parsed.success ? parsed.data : [];
                      return (
                        <tr
                          id={htmlId("preview_member_row", index)}
                          key={index}
                        >
                          {columns.includes("MEMBER") && (
                            <td
                              id={htmlId("preview_member_name", index)}
                              className="px-5 py-4 font-medium"
                            >
                              {member.character_name}
                            </td>
                          )}
                          {columns.includes("SOCIAL") && (
                            <td
                              id={htmlId("preview_member_social", index)}
                              className="px-5 py-4"
                            >
                              <div className="flex flex-wrap gap-1">
                                {memberSocialPlatforms.map((platform) =>
                                  social[platform.key] ? (
                                    <a
                                      id={htmlId(
                                        "preview_member_link",
                                        index,
                                        platform.key,
                                      )}
                                      key={platform.key}
                                      href={social[platform.key]}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={
                                        member.character_name
                                          ? `${platform.label} ของ ${member.character_name}`
                                          : platform.label
                                      }
                                      title={platform.label}
                                      className="focus-visible:ring-ring flex size-7 items-center justify-center rounded-full outline-none hover:opacity-80 focus-visible:ring-2 [&>svg]:size-5"
                                    >
                                      <SocialLogo platform={platform.key} />
                                    </a>
                                  ) : null,
                                )}
                                {!Object.values(social).some(Boolean) && (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {columns.includes("EQUIPMENT") && (
                            <td
                              id={htmlId("preview_member_equipment", index)}
                              className="px-5 py-4"
                            >
                              {equipment.length ? (
                                <ul
                                  id={htmlId("preview_member_items", index)}
                                  className="space-y-2"
                                >
                                  {equipment.map((item, itemIndex) => (
                                    <li
                                      id={htmlId(
                                        "preview_member_item",
                                        index,
                                        itemIndex,
                                      )}
                                      key={itemIndex}
                                      className="flex items-start gap-2"
                                    >
                                      <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-xs">
                                        {
                                          equipmentCategories.find(
                                            (category) =>
                                              category.value === item.category,
                                          )?.label
                                        }
                                      </span>
                                      <span className="break-words">
                                        {item.name}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        id="preview_members_no_members"
                        colSpan={columns.length}
                        className="text-muted-foreground px-5 py-6 text-center"
                      >
                        ยังไม่มีสมาชิก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <p
            id="preview_members_empty"
            className="text-muted-foreground border-input mt-8 rounded-xl border p-6"
          >
            {"Clan/Gang นี้ไม่ได้เปิดรายชื่อสาธารณะ"}
          </p>
        )}
      </main>
    </>
  );
}
