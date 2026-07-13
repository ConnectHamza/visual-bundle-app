export type DiscountTierInput = {
  id: string;
  minimumQuantity: string;
  discountValue: string;
};

export type NormalizedDiscountTier = {
  minimumQuantity: number;
  discountValue: number;
};

export type DiscountTierErrors = {
  tiers?: string;
};

export const defaultDiscountTiers: DiscountTierInput[] = [
  { id: "tier-2", minimumQuantity: "2", discountValue: "10" },
  { id: "tier-3", minimumQuantity: "3", discountValue: "15" },
  { id: "tier-4", minimumQuantity: "4", discountValue: "20" },
];

export function createDiscountTierInput(
  existingTiers: DiscountTierInput[],
): DiscountTierInput {
  const quantities = existingTiers
    .map((tier) => Number(tier.minimumQuantity))
    .filter(Number.isFinite);
  const nextQuantity =
    quantities.length > 0 ? Math.max(...quantities) + 1 : 2;

  return {
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    minimumQuantity: String(nextQuantity),
    discountValue: "",
  };
}

export function parseDiscountTiers(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((tier): tier is Record<string, unknown> => {
        return Boolean(tier) && typeof tier === "object";
      })
      .map((tier, index) => ({
        id:
          typeof tier.id === "string" && tier.id.length > 0
            ? tier.id
            : `tier-${index}`,
        minimumQuantity: String(tier.minimumQuantity ?? "").trim(),
        discountValue: String(tier.discountValue ?? "").trim(),
      }));
  } catch {
    return [];
  }
}

export function normalizeDiscountTiers(tiers: DiscountTierInput[]) {
  return tiers
    .map((tier) => ({
      minimumQuantity: Number(tier.minimumQuantity),
      discountValue: Number(tier.discountValue),
    }))
    .sort((first, second) => first.minimumQuantity - second.minimumQuantity);
}

export function maxDiscountValue(tiers: NormalizedDiscountTier[]) {
  return tiers.reduce(
    (maxDiscount, tier) => Math.max(maxDiscount, tier.discountValue),
    0,
  );
}

export function validateDiscountTiers(tiers: DiscountTierInput[]) {
  const errors: DiscountTierErrors = {};
  const normalizedTiers = normalizeDiscountTiers(tiers);
  const quantities = new Set<number>();

  if (normalizedTiers.length === 0) {
    errors.tiers = "Add at least one discount tier.";
    return { errors, normalizedTiers };
  }

  for (const tier of normalizedTiers) {
    if (
      !Number.isInteger(tier.minimumQuantity) ||
      tier.minimumQuantity < 2
    ) {
      errors.tiers = "Each tier quantity must be a whole number of 2 or more.";
      return { errors, normalizedTiers };
    }

    if (
      !Number.isFinite(tier.discountValue) ||
      tier.discountValue <= 0 ||
      tier.discountValue >= 100
    ) {
      errors.tiers = "Each tier discount must be between 1 and 99.";
      return { errors, normalizedTiers };
    }

    if (quantities.has(tier.minimumQuantity)) {
      errors.tiers = "Each tier quantity must be unique.";
      return { errors, normalizedTiers };
    }

    quantities.add(tier.minimumQuantity);
  }

  return { errors, normalizedTiers };
}
