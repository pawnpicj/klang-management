export type DeliveryAsset = {
  id: string;
  name: string;
  unit: string;
  required_quantity: number;
  created_at: string;
};

export type DeliveryMember = {
  id: string;
  joined_at: string;
  delivery_started_on?: string | null;
};
export type DeliveryRecord = {
  member_id: string;
  asset_id: string;
  delivery_date: string;
  quantity: number;
};

export type MemberDeliverySummary = {
  complete: boolean;
  missingDates: string[];
  missingByAsset: Array<DeliveryAsset & { quantity: number }>;
};

const datePart = (value: string) => value.slice(0, 10);

function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function summarizeMemberDeliveries({
  member,
  assets,
  deliveries,
  trackingStartedOn,
  throughDate,
}: {
  member: DeliveryMember;
  assets: DeliveryAsset[];
  deliveries: DeliveryRecord[];
  trackingStartedOn: string;
  throughDate: string;
}): MemberDeliverySummary {
  const memberStart = member.delivery_started_on
    ? datePart(member.delivery_started_on)
    : datePart(member.joined_at);
  const start =
    memberStart > trackingStartedOn ? memberStart : trackingStartedOn;
  if (start > throughDate) {
    return { complete: true, missingDates: [], missingByAsset: [] };
  }

  const delivered = new Map<string, number>();
  for (const record of deliveries) {
    if (record.member_id !== member.id) continue;
    const key = `${record.delivery_date}:${record.asset_id}`;
    delivered.set(key, (delivered.get(key) ?? 0) + Number(record.quantity));
  }

  const missingDates: string[] = [];
  const missing = new Map<string, number>();
  for (const date of datesBetween(start, throughDate)) {
    let dateIsMissing = false;
    for (const asset of assets) {
      if (
        Number(asset.required_quantity) <= 0 ||
        datePart(asset.created_at) > date
      )
        continue;
      const deficit = Math.max(
        Number(asset.required_quantity) -
          (delivered.get(`${date}:${asset.id}`) ?? 0),
        0,
      );
      if (deficit > 0) {
        dateIsMissing = true;
        missing.set(asset.id, (missing.get(asset.id) ?? 0) + deficit);
      }
    }
    if (dateIsMissing) missingDates.push(date);
  }

  return {
    complete: missingDates.length === 0,
    missingDates,
    missingByAsset: assets
      .filter((asset) => (missing.get(asset.id) ?? 0) > 0)
      .map((asset) => ({ ...asset, quantity: missing.get(asset.id) ?? 0 })),
  };
}
