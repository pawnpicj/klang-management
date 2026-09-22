export type ClanActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialClanState: ClanActionState = { status: "idle" };
