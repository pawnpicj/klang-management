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

  // Deliveries use numeric(20,4); integer units avoid fractional leftovers.
  const scale = 10_000;
  const delivered = new Map<string, number>();
  for (const record of deliveries) {
    if (
      record.member_id !== member.id ||
      record.delivery_date < start ||
      record.delivery_date > throughDate
    )
      continue;
    const key = `${record.delivery_date}:${record.asset_id}`;
    delivered.set(
      key,
      (delivered.get(key) ?? 0) + Math.round(Number(record.quantity) * scale),
    );
  }

  const obligations = new Map<string, { date: string; quantity: number }[]>();
  const firstUnpaid = new Map<string, number>();
  for (const date of datesBetween(start, throughDate)) {
    for (const asset of assets) {
      if (
        Number(asset.required_quantity) <= 0 ||
        datePart(asset.created_at) > date
      )
        continue;
      const debts = obligations.get(asset.id) ?? [];
      debts.push({
        date,
        quantity: Math.round(Number(asset.required_quantity) * scale),
      });
      obligations.set(asset.id, debts);
      let available = delivered.get(`${date}:${asset.id}`) ?? 0;
      let index = firstUnpaid.get(asset.id) ?? 0;
      // Pay the oldest accrued obligation first. Excess is not a future-day payment.
      while (available > 0 && index < debts.length) {
        const paid = Math.min(available, debts[index].quantity);
        debts[index].quantity -= paid;
        available -= paid;
        if (debts[index].quantity === 0) index++;
      }
      firstUnpaid.set(asset.id, index);
    }
  }

  const unpaidDates = new Set<string>();
  const missing = new Map<string, number>();
  for (const [assetId, debts] of obligations) {
    let total = 0;
    for (
      let index = firstUnpaid.get(assetId) ?? 0;
      index < debts.length;
      index++
    ) {
      if (debts[index].quantity > 0) {
        total += debts[index].quantity;
        unpaidDates.add(debts[index].date);
      }
    }
    if (total > 0) missing.set(assetId, total / scale);
  }
  const missingDates = [...unpaidDates].sort();
  return {
    complete: missingDates.length === 0,
    missingDates,
    missingByAsset: assets
      .filter((asset) => (missing.get(asset.id) ?? 0) > 0)
      .map((asset) => ({ ...asset, quantity: missing.get(asset.id) ?? 0 })),
  };
}
