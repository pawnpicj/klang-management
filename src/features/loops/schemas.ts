import { z } from "zod";
import { clanSlugSchema } from "@/features/clans/schemas";
import { parseCountdown } from "@/features/loops/time";

const uuid = z.uuid("ข้อมูลอ้างอิงไม่ถูกต้อง");

export const loopStepSchema = z
  .object({
    location: z.string().trim().max(200, "Location ต้องไม่เกิน 200 ตัวอักษร"),
    timerType: z.enum(["COUNTDOWN", "CLOCK"]),
    countdown: z.string().trim(),
    clockTime: z.string().trim(),
    sirenEnabled: z.boolean(),
    soundEnabled: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.timerType === "COUNTDOWN") {
      const seconds = parseCountdown(value.countdown);
      if (seconds === null || seconds < 1) {
        context.addIssue({
          code: "custom",
          path: ["countdown"],
          message: "เวลาแบบนับถอยหลังต้องอยู่ระหว่าง 00:01 ถึง 1440:00",
        });
      }
    }
    if (
      value.timerType === "CLOCK" &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.clockTime)
    ) {
      context.addIssue({
        code: "custom",
        path: ["clockTime"],
        message: "กรุณาเลือกเวลา",
      });
    }
  })
  .transform((value) => {
    const countdownSeconds = parseCountdown(value.countdown);
    return {
      location: value.location,
      timerType: value.timerType,
      countdownSeconds:
        value.timerType === "COUNTDOWN" ? countdownSeconds : null,
      clockTime: value.timerType === "CLOCK" ? value.clockTime : null,
      sirenEnabled: value.sirenEnabled,
      soundEnabled: value.soundEnabled,
    };
  });

export const createLoopTopicSchema = z
  .object({
    clanSlug: clanSlugSchema,
    name: z.string().trim().min(1, "กรุณากรอกชื่อหัวข้อ Loop").max(100),
    ownerType: z.enum(["CLAN", "MEMBER"]),
    memberId: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (
      value.ownerType === "MEMBER" &&
      !uuid.safeParse(value.memberId).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["memberId"],
        message: "กรุณาเลือกสมาชิก",
      });
    }
  })
  .transform((value) => ({
    ...value,
    memberId: value.ownerType === "MEMBER" ? value.memberId : null,
  }));

export const addLoopStepSchema = z.object({
  clanSlug: clanSlugSchema,
  loopTimerId: uuid,
  step: loopStepSchema,
});

export const loopTimerReferenceSchema = z.object({
  clanSlug: clanSlugSchema,
  loopTimerId: uuid,
});

export const loopTimerStepReferenceSchema = loopTimerReferenceSchema.extend({
  stepNumber: z.coerce.number().int().min(1).max(100),
});
