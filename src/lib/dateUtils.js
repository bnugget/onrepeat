// Helpers for putting dates on a continuous numeric axis. eventDate
// is a YYYYMMDD int, which is NOT evenly spaced (Jan 31 -> Feb 1 jumps
// by 70, not 1) — bad for a numeric chart axis where x-position should
// represent elapsed time. "Ordinal" here means whole days since the
// Unix epoch, which IS evenly spaced.

export function dayIntToOrdinal(d) {
  const y = Math.floor(d / 10000);
  const m = Math.floor((d % 10000) / 100);
  const day = d % 100;
  return Math.floor(Date.UTC(y, m - 1, day) / 86400000);
}

export function ordinalToDate(ord) {
  return new Date(ord * 86400000);
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function ordinalToLabel(ord) {
  const dt = ordinalToDate(ord);
  return `${MONTH_SHORT[dt.getUTCMonth()]} '${String(dt.getUTCFullYear()).slice(2)}`;
}

export function ordinalToISO(ord) {
  const dt = ordinalToDate(ord);
  return dt.toISOString().slice(0, 10);
}
