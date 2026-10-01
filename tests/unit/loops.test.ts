import { describe, expect, it } from "vitest";
import {
  addLoopStepSchema,
  createLoopTopicSchema,
} from "@/features/loops/schemas";
import {
  addCountdownSeconds,
  normalizeCountdownInput,
} from "@/features/loops/time";

const topic = {
  clanSlug: "doo-white",
  name: "รอบเก็บของ",
  ownerType: "CLAN",
  memberId: "",
};

describe("loop topic validation", () => {
  it("creates a topic without any Loop rows", () => {
    const result = createLoopTopicSchema.safeParse(topic);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.memberId).toBeNull();
  });

  it("requires a member for an individual topic", () => {
    expect(
      createLoopTopicSchema.safeParse({ ...topic, ownerType: "MEMBER" })
        .success,
    ).toBe(false);
    expect(
      createLoopTopicSchema.safeParse({
        ...topic,
        ownerType: "MEMBER",
        memberId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });

  it("accepts colon and dotted countdown values", () => {
    const base = {
      clanSlug: topic.clanSlug,
      loopTimerId: "11111111-1111-4111-8111-111111111111",
    };
    const colon = addLoopStepSchema.safeParse({
      ...base,
      step: {
        location: "",
        timerType: "COUNTDOWN",
        countdown: "01:00",
        clockTime: "",
        sirenEnabled: true,
        soundEnabled: true,
      },
    });
    const dotted = addLoopStepSchema.safeParse({
      ...base,
      step: {
        location: "จุด A",
        timerType: "COUNTDOWN",
        countdown: "5.0",
        clockTime: "",
        sirenEnabled: true,
        soundEnabled: true,
      },
    });
    expect(colon.success).toBe(true);
    expect(dotted.success).toBe(true);
    if (colon.success) expect(colon.data.step.countdownSeconds).toBe(60);
    if (dotted.success) expect(dotted.data.step.countdownSeconds).toBe(300);
    expect(normalizeCountdownInput("5.0")).toBe("05:00");
    expect(normalizeCountdownInput("0.30")).toBe("00:30");
    expect(addCountdownSeconds("00:30", 30)).toBe("01:00");
    expect(addCountdownSeconds(addCountdownSeconds("00:00", 30), 30)).toBe(
      "01:00",
    );
  });

  it("validates clock rows and rejects a zero countdown", () => {
    const base = {
      clanSlug: topic.clanSlug,
      loopTimerId: "11111111-1111-4111-8111-111111111111",
    };
    expect(
      addLoopStepSchema.safeParse({
        ...base,
        step: {
          location: "จุด A",
          timerType: "CLOCK",
          countdown: "",
          clockTime: "22:45",
          sirenEnabled: false,
          soundEnabled: false,
        },
      }).success,
    ).toBe(true);
    expect(
      addLoopStepSchema.safeParse({
        ...base,
        step: {
          location: "จุด A",
          timerType: "COUNTDOWN",
          countdown: "00:00",
          clockTime: "",
          sirenEnabled: true,
          soundEnabled: true,
        },
      }).success,
    ).toBe(false);
  });
});
