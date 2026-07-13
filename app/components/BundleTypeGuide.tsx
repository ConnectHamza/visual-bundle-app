import { Banner, BlockStack, Text } from "@shopify/polaris";

import { bundleTypeFor } from "../lib/bundleTypes";

type BundleTypeGuideProps = {
  bundleType: string;
};

const bundleTypeDetails: Record<string, string> = {
  classic:
    "Best when the customer chooses qualifying products from a simple product list.",
  fixed_bundle:
    "Best for predefined combos where all products are included together.",
  mix_match:
    "Best when customers can choose their own products from a product pool.",
  build_box_limited:
    "Best for fixed-size boxes, such as pick exactly 3 items from this set.",
  build_box_unlimited:
    "Best when customers can add any number of eligible products and save more.",
  quantity_breaks:
    "Best for one product with buy-more-save-more tiers.",
  volume_discount:
    "Best for applying the same quantity tiers across multiple eligible products.",
  frequently_bought_together:
    "Best for showing a main product with recommended products bought together.",
  tiered_mix_match:
    "Best when the discount improves as customers pick more products from the pool.",
  bogo:
    "Best for buy-one-get-one style offers. Full free-item logic will use advanced discount rules.",
  buy_x_get_y:
    "Best for trigger-and-reward offers. Full reward targeting will use advanced discount rules.",
  mystery_box:
    "Best for pack-size or mystery-box offers with quantity-based tiers.",
  cross_sell:
    "Best for a small add-on offer on the product page.",
  collection_bundle:
    "Best for collection-based bundle rules planned for the advanced rule builder.",
};

export function BundleTypeGuide({ bundleType }: BundleTypeGuideProps) {
  const type = bundleTypeFor(bundleType);

  return (
    <Banner tone={type.supported ? "info" : "warning"}>
      <BlockStack gap="100">
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {type.title}
        </Text>
        <Text as="p" variant="bodyMd">
          {type.description}
        </Text>
        <Text as="p" variant="bodyMd">
          {bundleTypeDetails[type.value]}
        </Text>
        {!type.supported ? (
          <Text as="p" variant="bodyMd">
            This advanced bundle type is planned next and is not available for
            saving yet.
          </Text>
        ) : null}
      </BlockStack>
    </Banner>
  );
}
