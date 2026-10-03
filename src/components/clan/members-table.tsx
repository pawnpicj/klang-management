import type { ReactNode } from "react";
import {
  equipmentCategories,
  memberSocialPlatforms,
  readMemberEquipment,
  readMemberSocialLinks,
} from "@/features/clans/member-profile";
import { SocialLogo } from "@/components/clan/social-logo";
import { htmlId } from "@/lib/html-id";
export type MemberTableEntry = {
  id: string;
  character_name: string;
  role: { name: string };
  social_links: unknown;
  equipment: unknown;
};
export function MembersTable({
  members,
  editControls,
}: {
  members: MemberTableEntry[];
  editControls?: Record<string, ReactNode>;
}) {
  return (
    <div id="dashboard_members_scroll" className="overflow-x-auto">
      <table
        id="dashboard_members_table"
        className="w-full min-w-[650px] text-left text-sm"
      >
        <thead
          id="dashboard_members_header"
          className="bg-muted/50 text-muted-foreground"
        >
          <tr id="dashboard_members_header_row">
            {[
              "สมาชิก",
              "Social Media",
              "อาวุธ / ยา / ระเบิด / อื่นๆ",
              "Role",
            ].map((label, index) => (
              <th
                id={htmlId("dashboard_members_column", index)}
                key={label}
                scope="col"
                className="px-5 py-3 font-semibold"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody id="dashboard_members_body" className="divide-input divide-y">
          {members.length ? (
            members.map((member) => {
              const equipment = readMemberEquipment(member.equipment);
              const social = readMemberSocialLinks(member.social_links);
              return (
                <tr
                  id={htmlId("member_row", member.id)}
                  key={member.id}
                  className="hover:bg-muted/20"
                >
                  <td
                    id={htmlId("member_name", member.id)}
                    className="px-5 py-4"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        id={htmlId("member_character_name", member.id)}
                        className="font-medium"
                      >
                        {member.character_name}
                      </span>
                      {editControls?.[member.id]}
                    </div>
                  </td>
                  <td
                    id={htmlId("member_social", member.id)}
                    className="px-5 py-4"
                  >
                    <div className="flex flex-wrap gap-1">
                      {memberSocialPlatforms.map((platform) => {
                        const url = social[platform.key];
                        if (!url) return null;
                        return (
                          <a
                            id={htmlId(
                              "member_social_link",
                              member.id,
                              platform.key,
                            )}
                            key={platform.key}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={platform.label}
                            aria-label={`${platform.label} ของ ${member.character_name}`}
                            className="focus-visible:ring-ring flex size-7 items-center justify-center rounded-full outline-none hover:opacity-80 focus-visible:ring-2 [&>svg]:size-5"
                          >
                            <SocialLogo platform={platform.key} />
                          </a>
                        );
                      })}
                      {!Object.values(social).some(Boolean) && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td
                    id={htmlId("member_equipment", member.id)}
                    className="px-5 py-4"
                  >
                    {equipment.length ? (
                      <ul
                        id={htmlId("member_equipment_list", member.id)}
                        className="space-y-2"
                      >
                        {equipment.map((item, index) => (
                          <li
                            id={htmlId(
                              "member_equipment_item",
                              member.id,
                              index,
                            )}
                            key={index}
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
                            <span className="break-words">{item.name}</span>
                            <span className="text-muted-foreground shrink-0">
                              ×{item.quantity.toLocaleString("th-TH")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td
                    id={htmlId("member_role", member.id)}
                    className="px-5 py-4"
                  >
                    <span className="bg-muted rounded-full px-2.5 py-1 text-xs">
                      {member.role.name}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr id="dashboard_members_empty_row">
              <td
                id="dashboard_members_empty"
                colSpan={4}
                className="text-muted-foreground px-5 py-6 text-center"
              >
                ยังไม่มีสมาชิก
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
