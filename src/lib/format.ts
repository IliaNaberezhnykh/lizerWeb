export function formatMoney(value: number, currency = "RUB") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatMm(value: number) {
  return `${formatNumber(value, 1)} мм`;
}

export function formatMeters(mm: number) {
  return `${formatNumber(mm / 1000, 2)} м`;
}

export function formatArea(mm2: number) {
  return `${formatNumber(mm2 / 1_000_000, 3)} м²`;
}
