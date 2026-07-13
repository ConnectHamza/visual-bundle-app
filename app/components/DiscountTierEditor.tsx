import {
  BlockStack,
  Button,
  InlineError,
  InlineStack,
  Text,
  TextField,
} from "@shopify/polaris";

import type { DiscountTierInput } from "../lib/discountTiers";
import { createDiscountTierInput } from "../lib/discountTiers";

type DiscountTierEditorProps = {
  error?: string;
  tiers: DiscountTierInput[];
  onChange: (tiers: DiscountTierInput[]) => void;
};

export function DiscountTierEditor({
  error,
  tiers,
  onChange,
}: DiscountTierEditorProps) {
  function updateTier(
    tierId: string,
    field: keyof Pick<DiscountTierInput, "minimumQuantity" | "discountValue">,
    value: string,
  ) {
    onChange(
      tiers.map((tier) =>
        tier.id === tierId
          ? {
              ...tier,
              [field]: value,
            }
          : tier,
      ),
    );
  }

  function removeTier(tierId: string) {
    onChange(tiers.filter((tier) => tier.id !== tierId));
  }

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Discount tiers
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Add as many quantity-based discounts as this bundle needs.
          </Text>
        </BlockStack>

        <Button onClick={() => onChange([...tiers, createDiscountTierInput(tiers)])}>
          Add tier
        </Button>
      </InlineStack>

      <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />

      {error ? (
        <InlineError message={error} fieldID="bundle-tiers-error" />
      ) : null}

      <BlockStack gap="300">
        {tiers.map((tier, index) => (
          <InlineStack key={tier.id} gap="300" blockAlign="start">
            <div style={{ width: "140px" }}>
              <TextField
                label={index === 0 ? "Minimum items" : ""}
                type="number"
                min={2}
                value={tier.minimumQuantity}
                onChange={(value) =>
                  updateTier(tier.id, "minimumQuantity", value)
                }
                autoComplete="off"
              />
            </div>

            <div style={{ width: "140px" }}>
              <TextField
                label={index === 0 ? "Discount" : ""}
                type="number"
                min={1}
                max={99}
                suffix="%"
                value={tier.discountValue}
                onChange={(value) =>
                  updateTier(tier.id, "discountValue", value)
                }
                autoComplete="off"
              />
            </div>

            <div style={{ paddingTop: index === 0 ? "28px" : "0" }}>
              <Button
                tone="critical"
                variant="plain"
                onClick={() => removeTier(tier.id)}
                disabled={tiers.length === 1}
              >
                Remove
              </Button>
            </div>
          </InlineStack>
        ))}
      </BlockStack>
    </BlockStack>
  );
}
