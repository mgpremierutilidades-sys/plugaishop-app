export function makePixCode(orderId: string) {
  // Mock realista (string longa), suficiente para QR + copiar/colar
  return `00020126PLUGAISHOP.${orderId}.${Date.now()}5204000053039865802BR5920PLUGAI SHOP LTDA6009GOIANIA62070503***6304ABCD`;
}

export function pixExpiresAt(hours = 2) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function msLeft(expiresAtISO: string) {
  const end = new Date(expiresAtISO).getTime();
  return Math.max(0, end - Date.now());
}
