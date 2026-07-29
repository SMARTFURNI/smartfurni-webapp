export function canDeleteFacebookGroupMarketing(
  session: { isAdmin: boolean } | null | undefined,
) {
  return session?.isAdmin === true;
}
