export const PALETTE = [
  'red',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'redBright',
  'yellowBright',
  'blueBright',
  'magentaBright',
  'cyanBright',
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export function usernameColor(username: string): PaletteColor {
  const index = hashString(username) % PALETTE.length;
  const color = PALETTE[index];
  if (color === undefined) throw new Error('unreachable: hash modulo is always within palette bounds');
  return color;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
