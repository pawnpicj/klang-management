import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { htmlId } from "@/lib/html-id";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;
  if (typeof userId !== "string") redirect("/login?next=/profile");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, status, created_at")
    .eq("id", userId)
    .single();
  if (error || !profile || profile.status !== "ACTIVE") {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login");
  }

  const email = typeof claims?.email === "string" ? claims.email : "ไม่พบอีเมล";
  let avatarPreviewUrl: string | null = null;
  if (profile.avatar_url) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 3600);
    avatarPreviewUrl = data?.signedUrl ?? null;
  }

  return (
    <main
      id={htmlId("profile_profile_page_main")}
      className="mx-auto min-h-screen w-full max-w-2xl px-6 py-12"
    >
      <header
        id={htmlId("profile_profile_page_header")}
        className="flex items-center justify-between gap-4"
      >
        <Image
          id={htmlId("profile_profile_page_image")}
          src="/klang-icon.png"
          alt="KLANG Management"
          width={1254}
          height={1254}
          sizes="56px"
          className="size-14 object-contain"
        />
        <div className="flex items-center gap-2">
          <Button
            id={htmlId("profile_profile_page_button")}
            asChild
            variant="outline"
          >
            <Link id={htmlId("profile_profile_page_clans")} href="/clans">
              Clan/Gang
            </Link>
          </Button>
          <form id={htmlId("profile_profile_page_form")} action={logoutAction}>
            <Button
              id={htmlId("profile_profile_page_button_2")}
              type="submit"
              variant="outline"
            >
              ออกจากระบบ
            </Button>
          </form>
        </div>
      </header>

      <section id={htmlId("profile_profile_page_section")} className="mt-10">
        <p
          id={htmlId("profile_profile_page_p")}
          className="text-primary text-sm font-semibold"
        >
          บัญชีของฉัน
        </p>
        <h1
          id={htmlId("profile_profile_page_h1")}
          className="mt-2 text-3xl font-bold tracking-tight"
        >
          โปรไฟล์
        </h1>
        <dl className="border-input mt-6 grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-sm">ชื่อผู้ใช้</dt>
            <dd className="mt-1 font-medium">{profile.username}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">อีเมล</dt>
            <dd className="mt-1 font-medium break-all">{email}</dd>
          </div>
        </dl>
      </section>

      <section
        id={htmlId("profile_profile_page_section_2")}
        className="border-input mt-8 rounded-xl border p-5 sm:p-6"
      >
        <h2
          id={htmlId("profile_profile_page_h2")}
          className="text-lg font-semibold"
        >
          แก้ไขโปรไฟล์
        </h2>
        <div className="mt-5">
          <ProfileForm
            displayName={profile.display_name}
            avatarPreviewUrl={avatarPreviewUrl}
          />
        </div>
      </section>
    </main>
  );
}
