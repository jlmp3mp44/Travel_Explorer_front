/**
 * Whether the signed-in user is the trip owner/creator (if the API exposes it).
 */
export function isTripOwnerFromPayload(trip, user) {
  if (!trip || user?.id == null) return false;
  const uid = Number(user.id);
  const o =
    trip.ownerId ??
    trip.userId ??
    trip.createdByUserId ??
    trip.createdBy?.id ??
    trip.owner?.id ??
    trip.user?.id;
  if (o == null || o === "") return false;
  return Number(o) === uid;
}
