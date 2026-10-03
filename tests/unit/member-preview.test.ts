import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  memberPreviewColumnsSchema,
  memberPreviewPath,
} from "../../src/features/clans/member-preview";
import { PublicMemberPreview } from "../../src/components/clan/public-member-preview";
describe("member preview visibility", () => {
  it("requires at least one unique supported column", () => {
    expect(memberPreviewColumnsSchema.parse(["MEMBER", "SOCIAL"])).toEqual([
      "MEMBER",
      "SOCIAL",
    ]);
    for (const value of [[], ["ROLE"], ["MEMBER", "MEMBER"]])
      expect(memberPreviewColumnsSchema.safeParse(value).success).toBe(false);
    expect(memberPreviewPath("doo-white")).toBe("/doo-white/preview-members");
  });
  it("omits hidden columns and removes the clan selection form", () => {
    const members = [
      {
        character_name: "Player Test",
        social_links: { kickUrl: "https://kick.com/player" },
        equipment: [{ category: "OTHER", name: "Radio" }],
      },
    ];
    const html = renderToStaticMarkup(
      createElement(PublicMemberPreview, {
        selected: { name: "Test Clan" },
        members,
        failed: false,
        columns: ["MEMBER"],
      }),
    );
    expect(html).toContain("Player Test");
    expect(html).not.toContain("https://kick.com/player");
    expect(html).not.toContain("Radio");
    expect(html).not.toContain("preview_members_clan_form");
    expect((html.match(/scope="col"/g) || []).length).toBe(1);
  });
  it("renders a selected social and equipment view without member names", () => {
    const html = renderToStaticMarkup(
      createElement(PublicMemberPreview, {
        selected: { name: "Test Clan" },
        members: [
          {
            character_name: "",
            social_links: { kickUrl: "https://kick.com/player" },
            equipment: [{ category: "OTHER", name: "Radio" }],
          },
        ],
        failed: false,
        columns: ["SOCIAL", "EQUIPMENT"],
      }),
    );
    expect(html).toContain("https://kick.com/player");
    expect(html).toContain("Radio");
    expect(html).not.toContain("preview_member_name_0");
    expect((html.match(/scope="col"/g) || []).length).toBe(2);
  });
  it("shows delivery quantities and complete status only in the selected column", () => {
    const members = [
      {
        character_name: "Pending",
        social_links: {},
        equipment: [],
        delivery_summary: {
          complete: false,
          items: [{ name: "Delivery Coin", unit: "coin", quantity: 300000 }],
        },
      },
      {
        character_name: "Paid",
        social_links: {},
        equipment: [],
        delivery_summary: { complete: true, items: [] },
      },
    ];
    const render = (columns: string[]) =>
      renderToStaticMarkup(
        createElement(PublicMemberPreview, {
          selected: { name: "Clan" },
          members,
          failed: false,
          columns,
        }),
      );
    const html = render(["MEMBER", "DELIVERIES"]);
    expect(html).toContain("ยอดค้างส่ง");
    expect(html).toContain("Delivery Coin");
    expect(html).toContain("300,000");
    expect(html).toContain("ครบแล้ว");
    expect(render(["MEMBER"])).not.toContain("Delivery Coin");
    expect(
      memberPreviewColumnsSchema.safeParse([
        "MEMBER",
        "SOCIAL",
        "EQUIPMENT",
        "DELIVERIES",
      ]).success,
    ).toBe(true);
  });
});
