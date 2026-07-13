import type {
  RunInput,
  FunctionRunResult,
} from "../generated/api";
import { DiscountApplicationStrategy } from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discountApplicationStrategy: DiscountApplicationStrategy.All,
  discounts: [],
};

type BundleLine = RunInput["cart"]["lines"][number];

type DiscountTier = {
  minimumQuantity: number;
  discountValue: number;
};

const FALLBACK_TIERS: DiscountTier[] = [
  {
    minimumQuantity: 2,
    discountValue: 10,
  },
  {
    minimumQuantity: 3,
    discountValue: 15,
  },
  {
    minimumQuantity: 4,
    discountValue: 20,
  },
];

function isDiscountTier(value: unknown): value is DiscountTier {
  if (!value || typeof value !== "object") {
    return false;
  }

  const tier = value as Record<string, unknown>;

  return (
    typeof tier.minimumQuantity === "number" &&
    Number.isFinite(tier.minimumQuantity) &&
    typeof tier.discountValue === "number" &&
    Number.isFinite(tier.discountValue)
  );
}

function parseDiscountTiers(value: string | undefined): DiscountTier[] {
  if (!value) {
    return FALLBACK_TIERS;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return FALLBACK_TIERS;
    }

    const tiers = parsed.filter(isDiscountTier);

    return tiers.length > 0 ? tiers : FALLBACK_TIERS;
  } catch {
    return FALLBACK_TIERS;
  }
}

function discountPercentForQuantity(
  quantity: number,
  tiers: DiscountTier[],
): number {
  const matchingTier = [...tiers]
    .sort((first, second) => second.minimumQuantity - first.minimumQuantity)
    .find((tier) => quantity >= tier.minimumQuantity);

  if (matchingTier) {
    return matchingTier.discountValue;
  }

  if (quantity >= 4) return 20;
  if (quantity >= 3) return 15;
  if (quantity >= 2) return 10;
  return 0;
}

export function run(input: RunInput): FunctionRunResult {
  const bundleGroups = input.cart.lines.reduce<Record<string, BundleLine[]>>(
    (groups, line) => {
      const bundleId = line.bundleId?.value;
      if (!bundleId) return groups;

      groups[bundleId] = groups[bundleId] ?? [];
      groups[bundleId].push(line);
      return groups;
    },
    {},
  );

  const discounts = Object.values(bundleGroups).flatMap((lines) => {
    const quantity = lines.reduce((total, line) => total + line.quantity, 0);
    const tiers = parseDiscountTiers(lines[0]?.bundleTiers?.value ?? undefined);
    const percentage = discountPercentForQuantity(quantity, tiers);

    if (percentage === 0) return [];

    return [
      {
        message: `Bundle discount: save ${percentage}%`,
        targets: lines.map((line) => ({
          cartLine: {
            id: line.id,
          },
        })),
        value: {
          percentage: {
            value: percentage.toString(),
          },
        },
      },
    ];
  });

  if (discounts.length === 0) return EMPTY_DISCOUNT;

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.All,
    discounts,
  };
}
