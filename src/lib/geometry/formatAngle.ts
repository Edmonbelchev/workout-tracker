export function formatAngle(angle: number | null): string {
  return angle === null ? "—" : `${Math.round(angle)}°`;
}
