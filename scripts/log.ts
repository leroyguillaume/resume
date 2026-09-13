const LEVELS = ["debug", "info", "warn", "error"] as const;

export type Level = (typeof LEVELS)[number];

function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

const configured = process.env.RESUME_LOG_LEVEL ?? "info";
if (!isLevel(configured)) {
  throw new Error(`RESUME_LOG_LEVEL must be one of ${LEVELS.join(", ")}, got "${configured}"`);
}
const threshold = LEVELS.indexOf(configured);

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (LEVELS.indexOf(level) < threshold) {
    return;
  }
  process.stderr.write(`${JSON.stringify({ time: new Date().toISOString(), level, event, ...fields })}\n`);
}
