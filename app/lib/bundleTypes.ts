export type BundleType = {
  description: string;
  layoutOptions: {
    label: string;
    value: string;
  }[];
  minimumProducts: number;
  productMode: "single" | "multiple" | "configurable";
  storefrontHint: string;
  supported: boolean;
  title: string;
  value: string;
};

const fixedBundleLayouts = [
  { label: "Fixed combo list", value: "fixed_combo" },
  { label: "Stacked product cards", value: "fixed_cards" },
];

const classicLayouts = [
  { label: "Clean list", value: "list" },
  { label: "Product cards", value: "cards" },
  { label: "Compact row", value: "compact" },
];

const buildBoxLayouts = [
  { label: "Limited pick box", value: "build_box_limited" },
  { label: "Unlimited pick box", value: "build_box_unlimited" },
];

const volumeLayouts = [
  { label: "Tier selector", value: "tier_selector" },
  { label: "Pack cards", value: "pack_cards" },
];

const fbtLayouts = [
  { label: "Bought together list", value: "together_list" },
  { label: "Cross-sell card", value: "cross_sell_card" },
];

const rewardLayouts = [
  { label: "Trigger and reward", value: "trigger_reward" },
  { label: "Offer cards", value: "offer_cards" },
];

export const bundleTypes: BundleType[] = [
  {
    value: "classic",
    title: "Classic product bundle",
    description: "Bundle fixed products together and reward larger selections.",
    layoutOptions: classicLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Select 2+ products.",
    supported: true,
  },
  {
    value: "fixed_bundle",
    title: "Fixed bundle",
    description: "Offer a predefined set of products as a simple combo.",
    layoutOptions: fixedBundleLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Get these products together.",
    supported: true,
  },
  {
    value: "mix_match",
    title: "Mix and match",
    description: "Let customers choose products from a selected pool.",
    layoutOptions: buildBoxLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Choose your bundle products.",
    supported: true,
  },
  {
    value: "build_box_limited",
    title: "Build a box - limited picks",
    description: "Let customers fill a fixed number of bundle slots.",
    layoutOptions: buildBoxLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Fill your box with selected products.",
    supported: true,
  },
  {
    value: "build_box_unlimited",
    title: "Build a box - unlimited picks",
    description: "Let customers add as many eligible products as they want.",
    layoutOptions: buildBoxLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Build your own box.",
    supported: true,
  },
  {
    value: "quantity_breaks",
    title: "Quantity breaks",
    description: "Discount one product when customers buy more quantity.",
    layoutOptions: volumeLayouts,
    productMode: "single",
    minimumProducts: 1,
    storefrontHint: "Increase quantity to unlock savings.",
    supported: true,
  },
  {
    value: "volume_discount",
    title: "Volume discount",
    description:
      "Offer bigger quantity discounts for one product or selected eligible products.",
    layoutOptions: volumeLayouts,
    productMode: "configurable",
    minimumProducts: 1,
    storefrontHint: "Buy more of this product and save more.",
    supported: true,
  },
  {
    value: "frequently_bought_together",
    title: "Frequently bought together",
    description: "Show a main product with recommended add-ons.",
    layoutOptions: fbtLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Add recommended products together.",
    supported: true,
  },
  {
    value: "tiered_mix_match",
    title: "Tiered mix and match",
    description: "Give better discounts as customers choose more products.",
    layoutOptions: buildBoxLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Choose more products to unlock higher savings.",
    supported: true,
  },
  {
    value: "bogo",
    title: "Buy one, get one",
    description: "Buy X and get another item free or discounted.",
    layoutOptions: rewardLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Buy one, get one offer.",
    supported: true,
  },
  {
    value: "buy_x_get_y",
    title: "Buy X, get Y",
    description: "Use trigger products and reward products.",
    layoutOptions: rewardLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Buy selected products to unlock rewards.",
    supported: true,
  },
  {
    value: "mystery_box",
    title: "Mystery box / pack selector",
    description: "Sell curated packs with size or theme selectors.",
    layoutOptions: volumeLayouts,
    productMode: "single",
    minimumProducts: 1,
    storefrontHint: "Choose a pack size.",
    supported: true,
  },
  {
    value: "cross_sell",
    title: "Product page cross-sell",
    description: "Show a lightweight add-on offer near the product form.",
    layoutOptions: fbtLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Add a recommended item.",
    supported: true,
  },
  {
    value: "collection_bundle",
    title: "Collection bundle",
    description: "Apply bundle rules to products from a collection.",
    layoutOptions: buildBoxLayouts,
    productMode: "multiple",
    minimumProducts: 2,
    storefrontHint: "Bundle products from this collection.",
    supported: false,
  },
];

export const bundleTypeOptions = bundleTypes.map((type) => ({
  label: type.supported ? type.title : `${type.title} (coming next)`,
  value: type.value,
}));

export function bundleTypeFor(value: string) {
  return bundleTypes.find((type) => type.value === value) ?? bundleTypes[0];
}

export function supportedBundleTypeValues() {
  return bundleTypes.map((type) => type.value);
}

export function layoutOptionsForBundleType(value: string) {
  return bundleTypeFor(value).layoutOptions;
}

export function layoutValueForBundleType(bundleType: string, layoutStyle: string) {
  const options = layoutOptionsForBundleType(bundleType);

  return options.some((option) => option.value === layoutStyle)
    ? layoutStyle
    : options[0].value;
}
