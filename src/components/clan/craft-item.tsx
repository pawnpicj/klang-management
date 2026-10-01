"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Hammer,
  Minus,
  Package,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  saveRecipeAction,
  deleteRecipeAction,
} from "@/features/crafting/actions";
import { calculateMaterials } from "@/features/crafting/calculator";
import {
  initialRecipeState,
  type CraftAsset,
  type CraftRecipe,
  type RecipeItem,
  type RecipeActionState,
} from "@/features/crafting/schemas";
import {
  assetImageMimeTypes,
  getAssetImageValidationError,
} from "@/features/inventory/image";
import { htmlId } from "@/lib/html-id";
import { useId as useHtmlId } from "react";

const field =
  "border-input bg-background focus-visible:ring-ring mt-1 h-10 w-full rounded-md border px-3 outline-none focus-visible:ring-2";
const number = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 4 });
const emptyItem = (): RecipeItem => ({
  source: "CUSTOM",
  assetId: null,
  name: "",
  unit: "ชิ้น",
  quantity: 1,
  imagePath: null,
});

function ItemImage({
  url,
  name,
  large = false,
}: {
  url?: string | null;
  name: string;
  large?: boolean;
}) {
  const htmlIdPrefix = useHtmlId();

  return url ? (
    <Image
      id={htmlId("clan_item_image_image", htmlIdPrefix)}
      src={url}
      alt={name}
      width={large ? 120 : 48}
      height={large ? 120 : 48}
      unoptimized
      className={
        large
          ? "size-28 rounded-lg object-contain"
          : "size-12 shrink-0 rounded-lg object-contain"
      }
    />
  ) : (
    <div
      className={
        (large ? "size-28" : "size-12") +
        " bg-muted flex shrink-0 items-center justify-center rounded-lg"
      }
    >
      <Package className="text-muted-foreground size-6" />
    </div>
  );
}

function CustomImage({
  name,
  currentUrl,
}: {
  name: string;
  currentUrl?: string | null;
}) {
  const htmlIdPrefix = useHtmlId();

  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  return (
    <div className="mt-3 space-y-2">
      <label
        id={htmlId("clan_custom_image_label", htmlIdPrefix)}
        className="block text-sm"
      >
        รูปภาพ (ไม่บังคับ)
        <input
          id={htmlId("clan_custom_image_input", htmlIdPrefix)}
          className={
            field +
            " py-1.5 file:mr-2 file:rounded file:border-0 file:bg-emerald-100 file:px-2 file:py-1"
          }
          name={name}
          type="file"
          accept={assetImageMimeTypes.join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const invalid = getAssetImageValidationError(file);
            setError(invalid);
            if (invalid) {
              event.target.value = "";
              return;
            }
            if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
            objectUrl.current = URL.createObjectURL(file);
            setPreview(objectUrl.current);
          }}
        />
      </label>
      <p
        id={htmlId(
          "clan_custom_image_jpeg_png_web_p_gif_5_mb_10_mb",
          htmlIdPrefix,
        )}
        className="text-muted-foreground text-xs"
      >
        JPEG, PNG, WebP หรือ GIF ไม่เกิน 5 MB ต่อรูป รวมทั้งสูตรไม่เกิน 10 MB
      </p>
      {error && (
        <p
          id={htmlId("clan_custom_image_p", htmlIdPrefix)}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
      {preview && <ItemImage url={preview} name="รูปที่เลือก" />}
    </div>
  );
}

function ItemFields({
  item,
  assets,
  onChange,
  imageName,
  label,
}: {
  item: RecipeItem;
  assets: CraftAsset[];
  onChange: (item: RecipeItem) => void;
  imageName: string;
  label: string;
}) {
  const htmlIdPrefix = useHtmlId();

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[150px_1fr_130px]">
        <label
          id={htmlId("clan_item_fields_label", htmlIdPrefix)}
          className="text-sm"
        >
          รูปแบบ
          <select
            id={htmlId("clan_item_fields_select", htmlIdPrefix)}
            aria-label={`รูปแบบ ${label}`}
            value={item.source}
            className={field}
            onChange={(event) =>
              onChange({
                ...emptyItem(),
                source: event.target.value as RecipeItem["source"],
                quantity: item.quantity,
              })
            }
          >
            <option value="ASSET">เลือกจาก Assets</option>
            <option value="CUSTOM">กำหนดเอง</option>
          </select>
        </label>
        {item.source === "ASSET" ? (
          <label
            id={htmlId("clan_item_fields_asset", htmlIdPrefix)}
            className="text-sm"
          >
            Asset
            <select
              id={htmlId("clan_item_fields_select_2", htmlIdPrefix)}
              aria-label={`Asset ${label}`}
              className={field}
              value={item.assetId ?? ""}
              required
              onChange={(event) =>
                onChange({
                  ...item,
                  assetId: event.target.value || null,
                  imagePath: null,
                })
              }
            >
              <option value="">เลือก Asset</option>
              {assets.map((asset) => (
                <option
                  key={asset.id}
                  value={asset.id}
                  disabled={!asset.isActive}
                >
                  {asset.name} ({asset.unit})
                  {asset.isActive ? "" : " — ปิดใช้งาน"}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <label
              id={htmlId("clan_item_fields_label_2", htmlIdPrefix)}
              className="text-sm"
            >
              ชื่อ
              <input
                id={htmlId("clan_item_fields_input", htmlIdPrefix)}
                aria-label={`ชื่อ ${label}`}
                value={item.name}
                required
                maxLength={100}
                className={field}
                onChange={(event) =>
                  onChange({ ...item, name: event.target.value })
                }
              />
            </label>
            <label
              id={htmlId("clan_item_fields_label_3", htmlIdPrefix)}
              className="text-sm"
            >
              หน่วย
              <input
                id={htmlId("clan_item_fields_input_2", htmlIdPrefix)}
                aria-label={`หน่วย ${label}`}
                value={item.unit}
                required
                maxLength={30}
                className={field}
                onChange={(event) =>
                  onChange({ ...item, unit: event.target.value })
                }
              />
            </label>
          </div>
        )}
        <label
          id={htmlId("clan_item_fields_label_4", htmlIdPrefix)}
          className="text-sm"
        >
          จำนวนต่อรอบ
          <input
            id={htmlId("clan_item_fields_input_3", htmlIdPrefix)}
            aria-label={`จำนวนต่อรอบ ${label}`}
            type="number"
            min="0.0001"
            max="1000000000000"
            step="0.0001"
            required
            value={item.quantity || ""}
            className={field}
            onChange={(event) =>
              onChange({ ...item, quantity: Number(event.target.value) })
            }
          />
        </label>
      </div>
      {item.source === "CUSTOM" && (
        <CustomImage name={imageName} currentUrl={item.imageUrl} />
      )}
    </div>
  );
}

function SaveButton() {
  const htmlIdPrefix = useHtmlId();

  const { pending } = useFormStatus();
  return (
    <Button
      id={htmlId("clan_save_button_button", htmlIdPrefix)}
      type="submit"
      disabled={pending}
    >
      {pending ? "กำลังบันทึก…" : "บันทึกสูตร"}
    </Button>
  );
}

function RecipeEditor({
  clanSlug,
  recipe,
  assets,
  onSaved,
  onClose,
}: {
  clanSlug: string;
  recipe: CraftRecipe | null;
  assets: CraftAsset[];
  onSaved: (recipe: CraftRecipe) => void;
  onClose: () => void;
}) {
  const htmlIdPrefix = useHtmlId();

  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(recipe?.name ?? "");
  const [output, setOutput] = useState<RecipeItem>(
    recipe?.output ?? emptyItem(),
  );
  const [materials, setMaterials] = useState(() =>
    (recipe?.materials ?? [emptyItem()]).map((item) => ({
      ...item,
      rowKey: crypto.randomUUID(),
    })),
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const [state, action] = useActionState(
    async (previous: RecipeActionState, form: FormData) => {
      const result = await saveRecipeAction(previous, form);
      if (result.status === "success") {
        onSaved(result.recipe);
        onClose();
      }
      return result;
    },
    initialRecipeState,
  );
  return (
    <dialog
      id={htmlId("clan_recipe_editor_dialog", htmlIdPrefix)}
      ref={dialog}
      onCancel={(event) => {
        // A file input also emits a bubbling cancel event when its picker closes.
        // Only a cancel originating from this dialog should close the editor.
        if (event.target !== event.currentTarget) {
          event.stopPropagation();
          return;
        }
        onClose();
      }}
      className="bg-background text-foreground fixed inset-0 m-auto max-h-[90vh] w-[min(94vw,58rem)] overflow-y-auto rounded-xl border p-0 shadow-xl backdrop:bg-black/40"
    >
      <form
        id={htmlId("clan_recipe_editor_form", htmlIdPrefix)}
        action={action}
        className="space-y-5 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id={htmlId("clan_recipe_editor_h2", htmlIdPrefix)}
            className="text-xl font-semibold"
          >
            {recipe ? "แก้ไขสูตรคราฟต์" : "สร้างสูตรคราฟต์"}
          </h2>
          <Button
            id={htmlId("clan_recipe_editor_button", htmlIdPrefix)}
            type="button"
            size="sm"
            variant="outline"
            aria-label="ปิดฟอร์มสูตร"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
        <input
          id={htmlId("clan_recipe_editor_recipe", htmlIdPrefix)}
          type="hidden"
          name="recipe"
          value={JSON.stringify({
            clanSlug,
            recipeId: recipe?.id ?? null,
            name,
            output,
            materials,
          })}
        />
        <label
          id={htmlId("clan_recipe_editor_label", htmlIdPrefix)}
          className="block text-sm font-medium"
        >
          ชื่อสูตร
          <input
            id={htmlId("clan_recipe_editor_input", htmlIdPrefix)}
            aria-label="ชื่อสูตร"
            className={field}
            value={name}
            required
            maxLength={100}
            placeholder="เช่น Weapon A"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <fieldset className="border-input rounded-lg border p-4">
          <legend className="px-2 font-semibold">ไอเทมผลผลิต</legend>
          <ItemFields
            label="ผลผลิต"
            item={output}
            assets={assets}
            onChange={setOutput}
            imageName="outputImage"
          />
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="mb-3 font-semibold">ส่วนประกอบต่อรอบ</legend>
          {materials.map((item, index) => (
            <div
              key={item.rowKey}
              className="border-input rounded-lg border p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">
                  ส่วนประกอบ {index + 1}
                </span>
                <Button
                  id={htmlId(
                    "clan_recipe_editor_button_2",
                    htmlIdPrefix,
                    index,
                  )}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="size-8 p-0 text-red-600"
                  disabled={materials.length === 1}
                  aria-label={`ลบส่วนประกอบ ${index + 1}`}
                  onClick={() =>
                    setMaterials((rows) =>
                      rows.filter((row) => row.rowKey !== item.rowKey),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <ItemFields
                label={`ส่วนประกอบ ${index + 1}`}
                item={item}
                assets={assets}
                imageName={`materialImage_${index}`}
                onChange={(next) =>
                  setMaterials((rows) =>
                    rows.map((row) =>
                      row.rowKey === item.rowKey
                        ? { ...next, rowKey: item.rowKey }
                        : row,
                    ),
                  )
                }
              />
            </div>
          ))}
          <Button
            id={htmlId("clan_recipe_editor_button_3", htmlIdPrefix)}
            type="button"
            variant="outline"
            size="sm"
            disabled={materials.length >= 50}
            onClick={() =>
              setMaterials((rows) => [
                ...rows,
                { ...emptyItem(), rowKey: crypto.randomUUID() },
              ])
            }
          >
            <Plus className="size-4" /> เพิ่มส่วนประกอบ
          </Button>
        </fieldset>
        {state.status === "error" && (
          <p
            id={htmlId("clan_recipe_editor_state_message", htmlIdPrefix)}
            role="alert"
            className="text-sm text-red-600"
          >
            {state.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            id={htmlId("clan_recipe_editor_button_4", htmlIdPrefix)}
            type="button"
            variant="outline"
            onClick={onClose}
          >
            ยกเลิก
          </Button>
          <SaveButton />
        </div>
      </form>
    </dialog>
  );
}

export function CraftItem({
  clanSlug,
  initialRecipes,
  assets,
  warehouseId,
  balances,
  canManage,
  canViewInventory,
}: {
  clanSlug: string;
  initialRecipes: CraftRecipe[];
  assets: CraftAsset[];
  warehouseId: string;
  balances: Record<string, number>;
  canManage: boolean;
  canViewInventory: boolean;
}) {
  const htmlIdPrefix = useHtmlId();

  const [recipes, setRecipes] = useState(initialRecipes);
  const [selectedId, setSelectedId] = useState(initialRecipes[0]?.id ?? "");
  const [editing, setEditing] = useState<CraftRecipe | null | undefined>(
    undefined,
  );
  const [rounds, setRounds] = useState(1);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const searchContainer = useRef<HTMLDivElement>(null);
  const searchListId = useId();
  const matchingRecipes = recipes.filter((row) =>
    row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  useEffect(() => {
    if (!searchOpen) return;
    function closeOutside(event: PointerEvent) {
      if (!searchContainer.current?.contains(event.target as Node))
        setSearchOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [searchOpen]);
  function selectRecipe(row: CraftRecipe) {
    setSelectedId(row.id);
    setRounds(1);
    setSearch("");
    setSearchOpen(false);
  }
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const recipe = recipes.find((row) => row.id === selectedId);
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  function display(item: RecipeItem) {
    const asset = item.assetId ? assetMap.get(item.assetId) : undefined;
    return {
      name: asset?.name ?? (item.name || "Asset ที่ไม่พร้อมใช้งาน"),
      unit: asset?.unit ?? item.unit,
      imageUrl: asset?.imageUrl ?? item.imageUrl,
    };
  }
  function remove(row: CraftRecipe) {
    if (!window.confirm(`ยืนยันการลบสูตร “${row.name}”?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRecipeAction({ clanSlug, recipeId: row.id });
      if (result.status === "error") {
        setError(result.message ?? "ลบไม่สำเร็จ");
        return;
      }
      setRecipes((rows) => rows.filter((item) => item.id !== row.id));
      if (selectedId === row.id)
        setSelectedId(recipes.find((item) => item.id !== row.id)?.id ?? "");
    });
  }
  return (
    <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div ref={searchContainer} className="relative w-full sm:w-96">
          <label
            id={htmlId("clan_craft_item_label", htmlIdPrefix)}
            className="block text-sm"
          >
            ค้นหาสูตร
            <input
              id={htmlId("clan_craft_item_input", htmlIdPrefix)}
              className={field}
              value={search}
              placeholder={recipe?.name ?? "กดเพื่อค้นหาและเลือกสูตร"}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
              aria-controls={searchListId}
              aria-activedescendant={
                searchOpen && matchingRecipes[activeOption]
                  ? `${searchListId}-${activeOption}`
                  : undefined
              }
              onFocus={() => {
                setSearchOpen(true);
                setActiveOption(0);
              }}
              onClick={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
                setActiveOption(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setSearchOpen(false);
                }
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setSearchOpen(true);
                  setActiveOption((index) =>
                    Math.max(
                      0,
                      Math.min(
                        matchingRecipes.length - 1,
                        index + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
                  );
                }
                if (
                  event.key === "Enter" &&
                  searchOpen &&
                  matchingRecipes[activeOption]
                ) {
                  event.preventDefault();
                  selectRecipe(matchingRecipes[activeOption]);
                }
                if (event.key === "Tab") setSearchOpen(false);
              }}
            />
          </label>
          {searchOpen && (
            <div
              id={searchListId}
              role="listbox"
              aria-label="รายการสูตร"
              className="border-input bg-background absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border shadow-lg"
            >
              {matchingRecipes.map((row, index) => {
                const output = display(row.output);
                return (
                  <button
                    type="button"
                    id={`${searchListId}-${index}`}
                    key={row.id}
                    role="option"
                    aria-selected={row.id === selectedId}
                    className={
                      "flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-emerald-50 " +
                      (index === activeOption ? "bg-emerald-50/60" : "")
                    }
                    onMouseEnter={() => setActiveOption(index)}
                    onClick={() => selectRecipe(row)}
                  >
                    <ItemImage url={output.imageUrl} name={output.name} />
                    <span className="min-w-0">
                      <span className="block font-medium break-words">
                        {row.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {row.materials.length} ส่วนประกอบ
                      </span>
                    </span>
                  </button>
                );
              })}
              {!matchingRecipes.length && (
                <p
                  id={htmlId("clan_craft_item_p", htmlIdPrefix)}
                  className="text-muted-foreground p-4 text-sm"
                >
                  {recipes.length ? "ไม่พบสูตรที่ค้นหา" : "ยังไม่มีสูตรคราฟต์"}
                </p>
              )}
            </div>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              id={htmlId("clan_craft_item_button", htmlIdPrefix)}
              onClick={() => setEditing(null)}
            >
              <Plus className="size-4" /> สร้างสูตร
            </Button>
            <Button
              id={htmlId("clan_craft_item_button_2", htmlIdPrefix)}
              asChild
              variant="outline"
            >
              <Link
                id={htmlId("clan_craft_item_link", htmlIdPrefix)}
                href={`/c/${clanSlug}/craft-item/settings`}
              >
                <Settings2 className="size-4" /> ตั้งค่า
              </Link>
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p
          id={htmlId("clan_craft_item_p_2", htmlIdPrefix)}
          className="mt-4 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-6">
        {recipe ? (
          <div className="grid items-start gap-5 md:grid-cols-[1fr_1.3fr]">
            <section
              id={htmlId("clan_craft_item_section", htmlIdPrefix)}
              className="border-input space-y-5 rounded-xl border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2
                  id={htmlId("clan_craft_item_recipe_name", htmlIdPrefix)}
                  className="text-xl font-semibold"
                >
                  {recipe.name}
                </h2>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      id={htmlId("clan_craft_item_button_3", htmlIdPrefix)}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="size-8 p-0"
                      aria-label={`แก้ไขสูตร ${recipe.name}`}
                      onClick={() => setEditing(recipe)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      id={htmlId("clan_craft_item_button_4", htmlIdPrefix)}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="size-8 p-0 text-red-600"
                      aria-label={`ลบสูตร ${recipe.name}`}
                      disabled={pending}
                      onClick={() => remove(recipe)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
              <ItemImage
                url={display(recipe.output).imageUrl}
                name={display(recipe.output).name}
                large
              />
              <div>
                <p
                  id={htmlId(
                    "clan_craft_item_display_recipe_output_name",
                    htmlIdPrefix,
                  )}
                  className="font-medium"
                >
                  {display(recipe.output).name}
                </p>
                <p
                  id={htmlId("clan_craft_item_p_3", htmlIdPrefix)}
                  className="text-muted-foreground mt-1 text-sm"
                >
                  ผลผลิตต่อรอบ {number.format(recipe.output.quantity)}{" "}
                  {display(recipe.output).unit}
                </p>
              </div>
              <div>
                <label
                  id={htmlId("clan_craft_item_label_2", htmlIdPrefix)}
                  htmlFor="craft-rounds"
                  className="text-sm font-medium"
                >
                  จำนวนรอบ
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    id={htmlId("clan_craft_item_button_5", htmlIdPrefix)}
                    variant="outline"
                    size="sm"
                    disabled={rounds <= 1}
                    aria-label="ลดจำนวนรอบ"
                    onClick={() => setRounds((n) => Math.max(1, n - 1))}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <input
                    id="craft-rounds"
                    className={field + " mt-0 w-24 text-center"}
                    type="number"
                    min="1"
                    max="99999"
                    step="1"
                    value={rounds}
                    onChange={(event) =>
                      setRounds(
                        Math.min(
                          99999,
                          Math.max(
                            1,
                            Math.floor(Number(event.target.value)) || 1,
                          ),
                        ),
                      )
                    }
                  />
                  <Button
                    id={htmlId("clan_craft_item_button_6", htmlIdPrefix)}
                    variant="outline"
                    size="sm"
                    disabled={rounds >= 99999}
                    aria-label="เพิ่มจำนวนรอบ"
                    onClick={() => setRounds((n) => Math.min(99999, n + 1))}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950">
                <p
                  id={htmlId("clan_craft_item_p_4", htmlIdPrefix)}
                  className="text-sm text-emerald-800 dark:text-emerald-200"
                >
                  ผลผลิตรวม
                </p>
                <p
                  id={htmlId("clan_craft_item_p_5", htmlIdPrefix)}
                  className="mt-1 text-xl font-semibold text-emerald-900 dark:text-emerald-200"
                >
                  {number.format(recipe.output.quantity * rounds)}{" "}
                  {display(recipe.output).unit}
                </p>
              </div>
            </section>
            <section
              id={htmlId("clan_craft_item_section_2", htmlIdPrefix)}
              className="border-input overflow-hidden rounded-xl border"
            >
              <div className="border-input border-b p-4">
                <h2
                  id={htmlId("clan_craft_item_h2", htmlIdPrefix)}
                  className="font-semibold"
                >
                  วัตถุดิบที่ต้องใช้
                </h2>
              </div>
              <div className="divide-input divide-y">
                {calculateMaterials(recipe.materials, rounds).map(
                  (item, index) => {
                    const detail = display(item);
                    const linked =
                      item.source === "ASSET" &&
                      canViewInventory &&
                      Boolean(warehouseId);
                    const available = item.assetId
                      ? (balances[`${warehouseId}:${item.assetId}`] ?? 0)
                      : 0;
                    const missing = Math.max(
                      0,
                      Math.round((item.quantity - available) * 10000) / 10000,
                    );
                    return (
                      <div
                        key={`${item.assetId ?? "custom"}-${index}`}
                        className={
                          "flex items-start gap-3 p-4 " +
                          (linked
                            ? missing > 0
                              ? "bg-red-50/50"
                              : "bg-emerald-50/50"
                            : "")
                        }
                      >
                        <ItemImage url={detail.imageUrl} name={detail.name} />
                        <div className="min-w-0 flex-1">
                          <p
                            id={htmlId(
                              "clan_craft_item_detail_name",
                              htmlIdPrefix,
                              index,
                            )}
                            className="font-medium break-words"
                          >
                            {detail.name}
                          </p>
                          <p
                            id={htmlId(
                              "clan_craft_item_p_6",
                              htmlIdPrefix,
                              index,
                            )}
                            className="mt-1 text-sm"
                          >
                            ต้องใช้ {number.format(item.quantity)} {detail.unit}
                          </p>
                          {linked ? (
                            <>
                              <p
                                id={htmlId(
                                  "clan_craft_item_p_7",
                                  htmlIdPrefix,
                                  index,
                                )}
                                className="text-muted-foreground mt-1 text-xs"
                              >
                                มี {number.format(available)} {detail.unit}
                              </p>
                              <p
                                id={htmlId(
                                  "clan_craft_item_p_8",
                                  htmlIdPrefix,
                                  index,
                                )}
                                className={
                                  "mt-1 text-xs font-medium " +
                                  (missing > 0
                                    ? "text-red-600"
                                    : "text-emerald-700")
                                }
                              >
                                {missing > 0
                                  ? `ขาด ${number.format(missing)} ${detail.unit}`
                                  : "วัตถุดิบเพียงพอ"}
                              </p>
                            </>
                          ) : (
                            <p
                              id={htmlId(
                                "clan_craft_item_p_9",
                                htmlIdPrefix,
                                index,
                              )}
                              className="text-muted-foreground mt-1 text-xs"
                            >
                              {item.source === "CUSTOM"
                                ? "กำหนดเอง · ไม่ได้เชื่อม Inventory"
                                : "ยังไม่แสดงยอดจาก Inventory"}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="border-input text-muted-foreground rounded-xl border border-dashed p-10 text-center">
            <Hammer className="mx-auto mb-3 size-8" />
            <p id={htmlId("clan_craft_item_p_10", htmlIdPrefix)}>
              เลือกสูตรเพื่อคำนวณวัตถุดิบ{canManage ? " หรือสร้างสูตรแรก" : ""}
            </p>
          </div>
        )}
      </div>
      {editing !== undefined && (
        <RecipeEditor
          clanSlug={clanSlug}
          recipe={editing}
          assets={assets}
          onClose={() => setEditing(undefined)}
          onSaved={(saved) => {
            setRecipes((rows) => [
              saved,
              ...rows.filter((row) => row.id !== saved.id),
            ]);
            setSelectedId(saved.id);
            setRounds(1);
          }}
        />
      )}
    </>
  );
}
