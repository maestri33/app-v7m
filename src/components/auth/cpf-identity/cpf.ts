export function onlyCpfDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function maskCpf(value: string): string {
  const digits = onlyCpfDigits(value);
  if (digits.length <= 3) return digits.padEnd(11, "•").replace(/^(.{3})(.{3})(.{3})(.{2})$/, "$1.$2.$3-$4");
  const visible = digits.padEnd(11, "•");
  return `${visible.slice(0, 3)}.${visible.slice(3, 6)}.${visible.slice(6, 9)}-${visible.slice(9, 11)}`;
}

export function isValidCpf(value: string): boolean {
  const digits = onlyCpfDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const checkDigit = (base: string, factor: number) => {
    let sum = 0;
    for (const digit of base) {
      sum += Number(digit) * factor;
      factor -= 1;
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  return (
    checkDigit(digits.slice(0, 9), 10) === Number(digits[9]) &&
    checkDigit(digits.slice(0, 10), 11) === Number(digits[10])
  );
}
