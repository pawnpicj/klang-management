"use client";
import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SocialLogo } from "@/components/clan/social-logo";
import {
  equipmentCategories,
  memberSocialPlatforms,
  type MemberEquipment,
  type MemberSocialLinks,
} from "@/features/clans/member-profile";
import { htmlId } from "@/lib/html-id";

export function MemberProfileFields({
  memberId,
  socialLinks,
  equipment,
  assets,
}: {
  memberId: string;
  socialLinks: MemberSocialLinks;
  equipment: MemberEquipment;
  assets: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(() =>
    equipment.map((item, index) => ({ ...item, key: String(index) })),
  );
  const nextKey = useRef(equipment.length);
  const prefix = (name: string) => htmlId("member", memberId, name);
  function change(key: string, patch: Partial<MemberEquipment[number]>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }
  return (
    <>
      <fieldset
        id={prefix("social_fields")}
        className="border-input space-y-3 border-t pt-5"
      >
        <legend id={prefix("social_title")} className="font-semibold">
          Social Media
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {memberSocialPlatforms.map((platform) => (
            <label
              id={prefix(platform.key + "_label")}
              key={platform.key}
              className="block text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <span className="[&>svg]:size-5">
                  <SocialLogo platform={platform.key} />
                </span>
                {platform.label}
              </span>
              <input
                id={prefix(platform.key)}
                type="url"
                name={platform.key}
                defaultValue={socialLinks[platform.key] ?? ""}
                maxLength={1000}
                placeholder={platform.placeholder}
                className="border-input bg-background focus-visible:ring-ring mt-1 h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
              />
            </label>
          ))}
        </div>
      </fieldset>
      <section
        id={prefix("equipment_fields")}
        className="border-input space-y-3 border-t pt-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={prefix("equipment_title")} className="font-semibold">
            อาวุธ / ยา / ระเบิด / อื่นๆ
          </h3>
          <Button
            id={prefix("equipment_add")}
            type="button"
            size="sm"
            variant="outline"
            disabled={rows.length >= 100}
            onClick={() => {
              const key = String(nextKey.current++);
              setRows((current) => [
                ...current,
                { key, category: "WEAPON", name: "", quantity: 1 },
              ]);
            }}
          >
            <Plus className="size-4" />
            เพิ่มรายการ
          </Button>
        </div>
        <input
          id={prefix("equipment_data")}
          type="hidden"
          name="equipment"
          value={JSON.stringify(
            rows.map(({ category, name, quantity }) => ({
              category,
              name,
              quantity,
            })),
          )}
        />
        <datalist id={prefix("asset_names")}>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.name} />
          ))}
        </datalist>
        {rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                id={prefix("equipment_row_" + row.key)}
                className="border-input grid grid-cols-[1fr_1fr_auto] gap-2 rounded-lg border p-3 sm:grid-cols-[7rem_1fr_5rem_auto]"
              >
                <label
                  id={prefix("equipment_category_label_" + row.key)}
                  className="min-w-0 text-xs"
                >
                  ประเภท
                  <select
                    id={prefix("equipment_category_" + row.key)}
                    aria-label="ประเภทสินค้า"
                    value={row.category}
                    onChange={(event) =>
                      change(row.key, {
                        category: event.target
                          .value as MemberEquipment[number]["category"],
                      })
                    }
                    className="border-input bg-background mt-1 h-10 w-full min-w-0 rounded-md border px-2"
                  >
                    {equipmentCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  id={prefix("equipment_name_label_" + row.key)}
                  className="col-span-2 row-start-2 min-w-0 text-xs sm:col-span-1 sm:row-start-auto"
                >
                  ชื่อสินค้า
                  <input
                    id={prefix("equipment_name_" + row.key)}
                    value={row.name}
                    onChange={(event) =>
                      change(row.key, { name: event.target.value })
                    }
                    list={prefix("asset_names")}
                    required
                    maxLength={100}
                    placeholder="เลือก Assets หรือพิมพ์เอง"
                    className="border-input bg-background mt-1 h-10 w-full min-w-0 rounded-md border px-2"
                  />
                </label>
                <label
                  id={prefix("equipment_quantity_label_" + row.key)}
                  className="min-w-0 text-xs"
                >
                  จำนวน
                  <input
                    id={prefix("equipment_quantity_" + row.key)}
                    type="number"
                    value={row.quantity || ""}
                    min={1}
                    max={1000000}
                    step={1}
                    required
                    onChange={(event) =>
                      change(row.key, { quantity: Number(event.target.value) })
                    }
                    className="border-input bg-background mt-1 h-10 w-full min-w-0 rounded-md border px-2"
                  />
                </label>
                <Button
                  id={prefix("equipment_remove_" + row.key)}
                  type="button"
                  variant="outline"
                  className="h-10 w-10 self-end p-0 text-red-500"
                  aria-label={`ลบรายการ ${row.name || "สินค้า"}`}
                  onClick={() =>
                    setRows((current) =>
                      current.filter((item) => item.key !== row.key),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p
            id={prefix("equipment_empty")}
            className="text-muted-foreground bg-muted/40 rounded-lg p-3 text-sm"
          >
            ยังไม่มีรายการ
          </p>
        )}
      </section>
    </>
  );
}
