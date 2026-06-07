export const numberFormatter = new Intl.NumberFormat("es-BO");

export const percentFormatter = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export const compactFormatter = new Intl.NumberFormat("es-BO", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const dateTimeFormatter = new Intl.DateTimeFormat("es-BO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatLatency(ms: number) {
  return `${numberFormatter.format(ms)} ms`;
}
