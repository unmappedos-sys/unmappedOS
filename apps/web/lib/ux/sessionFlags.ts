const PREFIX = 'unmappedos:';

export function getSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(PREFIX + key) === '1';
  } catch {
    return false;
  }
}

export function setSessionFlag(key: string, value: boolean): void {
  try {
    sessionStorage.setItem(PREFIX + key, value ? '1' : '0');
  } catch {
    // ignore
  }
}
