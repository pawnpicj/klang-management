import { beforeEach, describe, expect, it, vi } from "vitest";
import { addLoopStepAction } from "@/features/loops/actions";
import { initialAddLoopStepState } from "@/features/loops/state";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

const timerId = "11111111-1111-4111-8111-111111111111";
const saved = {
  id: "22222222-2222-4222-8222-222222222222",
  step_number: 2,
  location: null,
  timer_type: "COUNTDOWN",
  countdown_seconds: 60,
  clock_time: null,
  siren_enabled: false,
  sound_enabled: false,
  alert_at: "2026-09-30T12:01:00Z",
  acknowledged_at: null,
};
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    clanSlug: "doo-white",
    loopTimerId: timerId,
    location: "",
    timerType: "COUNTDOWN",
    countdown: "01:00",
    clockTime: "",
  }))
    data.set(key, value);
  return data;
}
function client(authenticated = true, readError = false) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: "clan-id" } }),
    single: vi.fn().mockResolvedValue({
      data: readError ? null : saved,
      error: readError ? { code: "read-error" } : null,
    }),
  };
  return {
    auth: {
      getClaims: vi
        .fn()
        .mockResolvedValue({
          data: authenticated ? { claims: { sub: "user-id" } } : null,
        }),
    },
    from: vi.fn().mockReturnValue(query),
    rpc: vi.fn().mockResolvedValue({ data: saved.id, error: null }),
    query,
  };
}

beforeEach(() => vi.clearAllMocks());
describe("adding a Loop without reloading the page", () => {
  it("returns the saved row and server deadline without redirecting or revalidating the page", async () => {
    const supabase = client();
    mocks.createClient.mockResolvedValue(supabase);
    const result = await addLoopStepAction(initialAddLoopStepState, form());
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.step).toMatchObject({
        id: saved.id,
        stepNumber: 2,
        alertAt: saved.alert_at,
      });
    }
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.query.eq).toHaveBeenCalledWith("clan_id", "clan-id");
    expect(supabase.query.eq).toHaveBeenCalledWith("loop_timer_id", timerId);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not insert when the user is unauthenticated", async () => {
    const supabase = client(false);
    mocks.createClient.mockResolvedValue(supabase);
    expect(
      (await addLoopStepAction(initialAddLoopStepState, form())).status,
    ).toBe("error");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("reports that saving succeeded if reading the inserted row fails", async () => {
    mocks.createClient.mockResolvedValue(client(true, true));
    const result = await addLoopStepAction(initialAddLoopStepState, form());
    expect(result.status).toBe("error");
    expect(result.message).toContain("บันทึก Loop แล้ว");
    expect(result.message).toContain("รีเฟรช");
  });
});
