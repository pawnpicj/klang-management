export type LoopStep = {
  id: string;
  stepNumber: number;
  location: string | null;
  timerType: string;
  countdownSeconds: number | null;
  clockTime: string | null;
  sirenEnabled: boolean;
  soundEnabled: boolean;
  alertAt: string | null;
  acknowledgedAt: string | null;
};

export type AddLoopStepState =
  | { status: "idle"; message?: string }
  | { status: "error"; message?: string }
  | { status: "success"; message: string; step: LoopStep };

export const initialAddLoopStepState: AddLoopStepState = { status: "idle" };
