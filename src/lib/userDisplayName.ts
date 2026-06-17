export function getUserDisplayName(opts: {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}): string {
  const name = opts.fullName?.trim();
  if (name) return name;

  const email = opts.email?.trim();
  if (email) {
    const local = email.split("@")[0] ?? "there";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  const phone = opts.phone?.replace(/\D/g, "");
  if (phone && phone.length >= 4) {
    return `User ••••${phone.slice(-4)}`;
  }

  return "there";
}

export function isProfileIdentityComplete(fullName?: string | null): boolean {
  return !!fullName?.trim();
}
