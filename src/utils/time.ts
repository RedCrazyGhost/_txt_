export function zeroFill(i: number): string {
  return i >= 0 && i <= 9 ? `0${i}` : `${i}`;
}

export function getTime(date: Date): string {
  const month = zeroFill(date.getMonth() + 1);
  const day = zeroFill(date.getDate());
  const hour = zeroFill(date.getHours());
  const minute = zeroFill(date.getMinutes());
  const second = zeroFill(date.getSeconds());
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function getTimeYYYY(date: Date): number {
  return date.getFullYear();
}

export function getTimeYYYYMM(date: Date): string {
  const month = zeroFill(date.getMonth() + 1);
  return `${date.getFullYear()}-${month}`;
}

export function getTimeYYYYMMDD(date: Date): string {
  const month = zeroFill(date.getMonth() + 1);
  const day = zeroFill(date.getDate());
  return `${date.getFullYear()}-${month}-${day}`;
}
