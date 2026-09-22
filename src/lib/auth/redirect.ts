export function safeNextPath(value: string | null | undefined) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/profile";
  }

  return value;
}
