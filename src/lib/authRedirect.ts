export function sanitizeAuthRedirect(value: string | null) {
  const fallbackPath = '/app';
  if (!value?.startsWith('/') || value.startsWith('//')) return fallbackPath;

  const lowerValue = value.toLowerCase();
  if (value.includes('\\') || lowerValue.startsWith('/%5c') || lowerValue.startsWith('/%2f')) {
    return fallbackPath;
  }

  return value;
}
