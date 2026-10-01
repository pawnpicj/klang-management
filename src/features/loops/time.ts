const countdownPattern = /^(\d{1,4})(?:[.:]([0-5]?\d))?$/;

export function parseCountdown(value: string) {
  const match = countdownPattern.exec(value.trim());
  if (!match) return null;
  const totalSeconds = Number(match[1]) * 60 + Number(match[2] ?? 0);
  return totalSeconds <= 86400 ? totalSeconds : null;
}

export function normalizeCountdownInput(value: string) {
  const totalSeconds = parseCountdown(value);
  if (totalSeconds === null) return null;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function addCountdownSeconds(value: string, secondsToAdd: number) {
  const current = parseCountdown(value) ?? 0;
  const next = Math.min(86400, Math.max(0, current + secondsToAdd));
  return (
    normalizeCountdownInput(
      String(Math.floor(next / 60)) + ":" + String(next % 60),
    ) ?? "00:00"
  );
}
