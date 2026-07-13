import { BlockStack, InlineStack, Text, TextField } from "@shopify/polaris";

type BundleTypeSettingsProps = {
  bundleType: string;
  fbtDiscountValue: string;
  maximumSelections: string;
  minimumSelections: string;
  volumeScope: string;
  onFbtDiscountValueChange: (value: string) => void;
  onMaximumSelectionsChange: (value: string) => void;
  onMinimumSelectionsChange: (value: string) => void;
  onVolumeScopeChange: (value: string) => void;
};

export function BundleTypeSettings({
  bundleType,
  fbtDiscountValue,
  maximumSelections,
  minimumSelections,
  onFbtDiscountValueChange,
  onMaximumSelectionsChange,
  onMinimumSelectionsChange,
}: BundleTypeSettingsProps) {
  const hiddenFields = (
    <>
      <input type="hidden" name="volumeScope" value="multiple" />
      <input
        type="hidden"
        name="minimumSelections"
        value={minimumSelections}
      />
      <input
        type="hidden"
        name="maximumSelections"
        value={maximumSelections}
      />
      <input
        type="hidden"
        name="fbtDiscountValue"
        value={fbtDiscountValue}
      />
    </>
  );

  if (bundleType === "volume_discount") {
    return (
      <BlockStack gap="300">
        <input type="hidden" name="volumeScope" value="multiple" />
        <input
          type="hidden"
          name="minimumSelections"
          value={minimumSelections}
        />
        <input
          type="hidden"
          name="maximumSelections"
          value={maximumSelections}
        />
        <input
          type="hidden"
          name="fbtDiscountValue"
          value={fbtDiscountValue}
        />
        <Text as="p" variant="bodyMd" tone="subdued">
          Select every product that should use these quantity tiers. On the
          storefront, each eligible product page shows its own volume offer.
        </Text>
      </BlockStack>
    );
  }

  if (
    bundleType === "mix_match" ||
    bundleType === "tiered_mix_match" ||
    bundleType === "build_box_limited" ||
    bundleType === "build_box_unlimited" ||
    bundleType === "collection_bundle"
  ) {
    return (
      <BlockStack gap="300">
        {hiddenFields}
        <Text as="p" variant="bodyMd" tone="subdued">
          Customers choose from this product pool. Set the minimum and optional
          maximum number of products they can pick.
        </Text>
        <InlineStack gap="400" blockAlign="start">
          <div style={{ width: "160px" }}>
            <TextField
              label="Minimum picks"
              name="minimumSelections"
              type="number"
              min={2}
              value={minimumSelections}
              onChange={onMinimumSelectionsChange}
              autoComplete="off"
            />
          </div>
          <div style={{ width: "160px" }}>
            <TextField
              label="Maximum picks"
              name="maximumSelections"
              type="number"
              min={2}
              value={maximumSelections}
              onChange={onMaximumSelectionsChange}
              autoComplete="off"
              placeholder="No limit"
            />
          </div>
        </InlineStack>
      </BlockStack>
    );
  }

  if (bundleType === "frequently_bought_together" || bundleType === "cross_sell") {
    return (
      <BlockStack gap="300">
        {hiddenFields}
        <Text as="p" variant="bodyMd" tone="subdued">
          The first selected product is the main product. The rest are add-ons
          shown with a simple together discount.
        </Text>
        <div style={{ width: "180px" }}>
          <TextField
            label="Together discount"
            name="fbtDiscountValue"
            type="number"
            min={1}
            max={99}
            suffix="%"
            value={fbtDiscountValue}
            onChange={onFbtDiscountValueChange}
            autoComplete="off"
          />
        </div>
      </BlockStack>
    );
  }

  return hiddenFields;
}
