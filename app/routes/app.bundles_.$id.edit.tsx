import { useState } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "react-router";

import { useAppBridge, type Product } from "@shopify/app-bridge-react";
import {
  BlockStack,
  Button,
  Card,
  InlineError,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import { db } from "../db.server";
import { authenticate } from "../shopify.server";
import { BundlePreview } from "../components/BundlePreview";
import { BundleTypeGuide } from "../components/BundleTypeGuide";
import { BundleTypeSettings } from "../components/BundleTypeSettings";
import { DiscountTierEditor } from "../components/DiscountTierEditor";
import {
  bundleTypeFor,
  bundleTypeOptions,
  layoutOptionsForBundleType,
  layoutValueForBundleType,
  supportedBundleTypeValues,
} from "../lib/bundleTypes";
import {
  maxDiscountValue,
  parseDiscountTiers,
  validateDiscountTiers,
} from "../lib/discountTiers";
import type { DiscountTierInput } from "../lib/discountTiers";

type SelectedProduct = {
  productId: string;
  variantId?: string;
  title: string;
  handle?: string;
  imageUrl?: string;
};

type EditBundleLoaderData = {
  bundle: {
    id: string;
    title: string;
    bundleType: string;
    layoutStyle: string;
    accentColor: string;
    buttonText: string;
    volumeScope: string;
    minimumSelections: string;
    maximumSelections: string;
    fbtDiscountValue: string;
    products: SelectedProduct[];
    tiers: DiscountTierInput[];
  };
};

type ActionDataResponse = {
  errors?: {
    title?: string;
    products?: string;
    accentColor?: string;
    buttonText?: string;
    tiers?: string;
    typeSettings?: string;
    server?: string;
  };
};

function allowedValue(value: FormDataEntryValue | null, allowed: string[]) {
  const nextValue = String(value || "");

  return allowed.includes(nextValue) ? nextValue : allowed[0];
}

function validHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function validDiscountPercent(value: number) {
  return Number.isFinite(value) && value > 0 && value < 100;
}

function bundleIdFromRequest(request: Request, params: LoaderFunctionArgs["params"]) {
  if (params.id) {
    return params.id;
  }

  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/\/app\/bundles\/([^/]+)\/edit/);

  return match ? decodeURIComponent(match[1]) : null;
}

function isSelectedProduct(value: unknown): value is SelectedProduct {
  if (!value || typeof value !== "object") {
    return false;
  }

  const product = value as Record<string, unknown>;

  return (
    typeof product.productId === "string" &&
    product.productId.length > 0 &&
    typeof product.title === "string" &&
    product.title.length > 0 &&
    (product.variantId === undefined || typeof product.variantId === "string") &&
    (product.handle === undefined || typeof product.handle === "string") &&
    (product.imageUrl === undefined || typeof product.imageUrl === "string")
  );
}

function parseSelectedProducts(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSelectedProduct);
  } catch {
    return [];
  }
}

function productFromPicker(product: Product): SelectedProduct {
  return {
    productId: product.id,
    variantId: product.variants[0]?.id,
    title: product.title,
    handle: product.handle || undefined,
    imageUrl: product.images[0]?.originalSrc,
  };
}

function validateBundleForm(
  title: string,
  bundleType: string,
  selectedProducts: SelectedProduct[],
  accentColor: string,
  buttonText: string,
  discountTiers: DiscountTierInput[],
  volumeScope: string,
  minimumSelections: number,
  maximumSelections: number | null,
  fbtDiscountValue: number,
) {
  const errors: NonNullable<ActionDataResponse["errors"]> = {};
  const tierValidation = validateDiscountTiers(discountTiers);
  const selectedBundleType = bundleTypeFor(bundleType);
  const effectiveProductMode =
    selectedBundleType.value === "volume_discount"
      ? "multiple"
      : selectedBundleType.productMode;
  const minimumProducts =
    effectiveProductMode === "single" ? 1 : selectedBundleType.minimumProducts;

  if (!title) {
    errors.title = "Bundle title is required.";
  }

  if (!selectedBundleType.supported) {
    errors.products = `${selectedBundleType.title} is coming next. Choose a supported type for now.`;
  } else if (selectedProducts.length < minimumProducts) {
    errors.products =
      effectiveProductMode === "single"
        ? "Select one product for this bundle type."
        : `Select at least ${minimumProducts} products for this bundle.`;
  } else if (
    effectiveProductMode === "single" &&
    selectedProducts.length > 1
  ) {
    errors.products = "This bundle type works with one product only.";
  }

  if (
    (selectedBundleType.value === "mix_match" ||
      selectedBundleType.value === "tiered_mix_match" ||
      selectedBundleType.value === "build_box_limited" ||
      selectedBundleType.value === "build_box_unlimited" ||
      selectedBundleType.value === "collection_bundle") &&
    (!Number.isInteger(minimumSelections) || minimumSelections < 2)
  ) {
    errors.typeSettings = "Minimum picks must be a whole number of 2 or more.";
  }

  if (
    maximumSelections !== null &&
    (!Number.isInteger(maximumSelections) ||
      maximumSelections < minimumSelections)
  ) {
    errors.typeSettings =
      "Maximum picks must be empty or greater than the minimum picks.";
  }

  if (
    (selectedBundleType.value === "frequently_bought_together" ||
      selectedBundleType.value === "cross_sell") &&
    !validDiscountPercent(fbtDiscountValue)
  ) {
    errors.typeSettings = "Together discount must be between 1 and 99.";
  }

  if (!validHexColor(accentColor)) {
    errors.accentColor = "Use a valid hex color, like #008060.";
  }

  if (!buttonText || buttonText.length > 40) {
    errors.buttonText = "Enter button text up to 40 characters.";
  }

  if (tierValidation.errors.tiers) {
    errors.tiers = tierValidation.errors.tiers;
  }

  return {
    errors,
    normalizedTiers: tierValidation.normalizedTiers,
  };
}

export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<EditBundleLoaderData> {
  const { session } = await authenticate.admin(request);
  const bundleId = bundleIdFromRequest(request, params);

  if (!bundleId) {
    throw new Response("Bundle ID is missing.", {
      status: 400,
    });
  }

  const bundle = await db.bundle.findFirst({
    where: {
      id: bundleId,
      shop: session.shop,
    },
    include: {
      bundleItems: {
        orderBy: {
          position: "asc",
        },
      },
      discountTiers: {
        orderBy: {
          minimumQuantity: "asc",
        },
      },
    },
  });

  if (!bundle) {
    throw new Response("Bundle not found.", {
      status: 404,
    });
  }

  return {
    bundle: {
      id: bundle.id,
      title: bundle.title,
      bundleType: bundle.bundleType,
      layoutStyle: bundle.layoutStyle,
      accentColor: bundle.accentColor,
      buttonText: bundle.buttonText,
      volumeScope: bundle.volumeScope,
      minimumSelections: String(bundle.minimumSelections),
      maximumSelections:
        bundle.maximumSelections === null ? "" : String(bundle.maximumSelections),
      fbtDiscountValue:
        bundle.fbtDiscountValue === null ? "10" : String(bundle.fbtDiscountValue),
      products: bundle.bundleItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        title: item.title,
        handle: item.handle || undefined,
        imageUrl: item.imageUrl || undefined,
      })),
      tiers: bundle.discountTiers.map((tier) => ({
        id: tier.id,
        minimumQuantity: String(tier.minimumQuantity),
        discountValue: String(tier.discountValue),
      })),
    },
  };
}

export async function action({
  request,
  params,
}: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const bundleId = bundleIdFromRequest(request, params);

  if (!bundleId) {
    throw new Response("Bundle ID is missing.", {
      status: 400,
    });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const bundleType = allowedValue(
    formData.get("bundleType"),
    supportedBundleTypeValues(),
  );
  const layoutStyle = allowedValue(
    formData.get("layoutStyle"),
    layoutOptionsForBundleType(bundleType).map((option) => option.value),
  );
  const accentColor = String(formData.get("accentColor") || "#008060").trim();
  const buttonText = String(formData.get("buttonText") || "Add bundle").trim();
  const selectedBundleType = bundleTypeFor(bundleType);
  const volumeScope = allowedValue(formData.get("volumeScope"), [
    "single",
    "multiple",
  ]);
  const minimumSelections = Number(formData.get("minimumSelections") || "2");
  const maximumSelectionsRaw = String(formData.get("maximumSelections") || "");
  const maximumSelections =
    maximumSelectionsRaw.trim().length > 0 ? Number(maximumSelectionsRaw) : null;
  const fbtDiscountValue = Number(formData.get("fbtDiscountValue") || "10");
  const selectedProducts = parseSelectedProducts(formData.get("products"));
  const discountTiers =
    selectedBundleType.value === "frequently_bought_together" ||
    selectedBundleType.value === "cross_sell"
      ? [
          {
            id: "fbt-tier",
            minimumQuantity: "2",
            discountValue: String(fbtDiscountValue),
          },
        ]
      : parseDiscountTiers(formData.get("tiers"));
  const validation = validateBundleForm(
    title,
    bundleType,
    selectedProducts,
    accentColor,
    buttonText,
    discountTiers,
    volumeScope,
    minimumSelections,
    maximumSelections,
    fbtDiscountValue,
  );

  if (Object.keys(validation.errors).length > 0) {
    return data<ActionDataResponse>(
      { errors: validation.errors },
      { status: 400 },
    );
  }

  const existingBundle = await db.bundle.findFirst({
    where: {
      id: bundleId,
      shop: session.shop,
    },
    select: {
      id: true,
    },
  });

  if (!existingBundle) {
    throw new Response("Bundle not found.", {
      status: 404,
    });
  }

  try {
    await db.$transaction([
      db.discountTier.deleteMany({
        where: {
          bundleId,
        },
      }),
      db.bundleItem.deleteMany({
        where: {
          bundleId,
        },
      }),
      db.bundle.update({
        where: {
          id: bundleId,
        },
        data: {
          title,
          bundleType: bundleTypeFor(bundleType).value,
          layoutStyle,
          accentColor,
          buttonText,
          volumeScope,
          minimumSelections,
          maximumSelections,
          fbtDiscountValue:
            selectedBundleType.value === "frequently_bought_together" ||
            selectedBundleType.value === "cross_sell"
              ? fbtDiscountValue
              : null,
          discountValue: maxDiscountValue(validation.normalizedTiers),
          discountTiers: {
            create: validation.normalizedTiers.map((tier) => ({
                minimumQuantity: tier.minimumQuantity,
                discountType: "PERCENTAGE",
                discountValue: tier.discountValue,
            })),
          },
          bundleItems: {
            create: selectedProducts.map((product, index) => ({
              productId: product.productId,
              variantId: product.variantId,
              title: product.title,
              handle: product.handle,
              imageUrl: product.imageUrl,
              position: index,
            })),
          },
        },
      }),
    ]);

    return redirect(`/app/bundles/${bundleId}?message=bundle-updated`);
  } catch (error) {
    console.error("Failed to update bundle:", error);

    return data<ActionDataResponse>(
      {
        errors: {
          server: "The bundle could not be updated.",
        },
      },
      { status: 500 },
    );
  }
}

export default function EditBundle() {
  const { bundle } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const actionData = useActionData<ActionDataResponse>();
  const navigate = useNavigate();
  const navigation = useNavigation();

  const [title, setTitle] = useState(bundle.title);
  const [bundleType, setBundleType] = useState(bundle.bundleType);
  const [layoutStyle, setLayoutStyle] = useState(bundle.layoutStyle);
  const [accentColor, setAccentColor] = useState(bundle.accentColor);
  const [buttonText, setButtonText] = useState(bundle.buttonText);
  const [volumeScope, setVolumeScope] = useState(bundle.volumeScope);
  const [minimumSelections, setMinimumSelections] = useState(
    bundle.minimumSelections,
  );
  const [maximumSelections, setMaximumSelections] = useState(
    bundle.maximumSelections,
  );
  const [fbtDiscountValue, setFbtDiscountValue] = useState(
    bundle.fbtDiscountValue,
  );
  const [products, setProducts] = useState<SelectedProduct[]>(bundle.products);
  const [tiers, setTiers] = useState<DiscountTierInput[]>(bundle.tiers);

  const isSubmitting = navigation.state === "submitting";
  const selectedBundleType = bundleTypeFor(bundleType);
  const effectiveProductMode =
    bundleType === "volume_discount"
      ? "multiple"
      : selectedBundleType.productMode;
  const layoutStyleOptions = layoutOptionsForBundleType(bundleType);
  const showTogetherDiscount =
    bundleType === "frequently_bought_together" || bundleType === "cross_sell";
  const showTierEditor = !showTogetherDiscount;

  async function selectProducts() {
    const selection = await shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: effectiveProductMode !== "single",
      filter: {
        hidden: false,
        variants: false,
      },
      selectionIds: products.map((product) => ({
        id: product.productId,
      })),
    });

    if (!selection) {
      return;
    }

    const selected = selection.selection.map(productFromPicker);

    setProducts(
      effectiveProductMode === "single"
        ? selected.slice(0, 1)
        : selected,
    );
  }

  function updateBundleType(nextBundleType: string) {
    const nextType = bundleTypeFor(nextBundleType);

    setBundleType(nextBundleType);
    setLayoutStyle((currentLayoutStyle) =>
      layoutValueForBundleType(nextBundleType, currentLayoutStyle),
    );
    if (nextType.value === "volume_discount") {
      setVolumeScope("multiple");
      return;
    }

    if (
      nextType.productMode === "single"
    ) {
      setProducts((currentProducts) => currentProducts.slice(0, 1));
    }
  }

  return (
    <Page
      title="Edit bundle"
      backAction={{
        content: "Bundle details",
        onAction: () => navigate(`/app/bundles/${bundle.id}`),
      }}
    >
      <Layout>
        <Layout.Section>
          <Form method="post">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Bundle details
                  </Text>

                  <TextField
                    label="Bundle title"
                    name="title"
                    value={title}
                    onChange={setTitle}
                    autoComplete="off"
                    error={actionData?.errors?.title}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Storefront display
                  </Text>

                  <InlineStack gap="400" blockAlign="start">
                    <div style={{ flex: 1 }}>
                      <Select
                        label="Bundle type"
                        name="bundleType"
                        options={bundleTypeOptions}
                        value={bundleType}
                        onChange={updateBundleType}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Select
                        label="Layout"
                        name="layoutStyle"
                        options={layoutStyleOptions}
                        value={layoutStyle}
                        onChange={setLayoutStyle}
                      />
                    </div>
                  </InlineStack>

                  <BundleTypeGuide bundleType={bundleType} />

                  <BundleTypeSettings
                    bundleType={bundleType}
                    volumeScope={volumeScope}
                    minimumSelections={minimumSelections}
                    maximumSelections={maximumSelections}
                    fbtDiscountValue={fbtDiscountValue}
                    onVolumeScopeChange={(nextVolumeScope) => {
                      setVolumeScope(nextVolumeScope);
                      if (nextVolumeScope === "single") {
                        setProducts((currentProducts) =>
                          currentProducts.slice(0, 1),
                        );
                      }
                    }}
                    onMinimumSelectionsChange={setMinimumSelections}
                    onMaximumSelectionsChange={setMaximumSelections}
                    onFbtDiscountValueChange={setFbtDiscountValue}
                  />

                  {actionData?.errors?.typeSettings ? (
                    <InlineError
                      message={actionData.errors.typeSettings}
                      fieldID="bundle-type-settings-error"
                    />
                  ) : null}

                  <InlineStack gap="400" blockAlign="start">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Accent color"
                        name="accentColor"
                        value={accentColor}
                        onChange={setAccentColor}
                        autoComplete="off"
                        error={actionData?.errors?.accentColor}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Button text"
                        name="buttonText"
                        value={buttonText}
                        onChange={setButtonText}
                        autoComplete="off"
                        error={actionData?.errors?.buttonText}
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Live preview
                  </Text>

                  <BundlePreview
                    title={title}
                    products={products}
                    layoutStyle={layoutStyle}
                    bundleType={bundleType}
                    volumeScope={volumeScope}
                    minimumSelections={minimumSelections}
                    maximumSelections={maximumSelections}
                    fbtDiscountValue={fbtDiscountValue}
                    accentColor={accentColor}
                    buttonText={buttonText}
                    tiers={tiers}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      Products
                    </Text>

                    <Button onClick={selectProducts}>
                      {products.length > 0
                        ? effectiveProductMode === "single"
                          ? "Change product"
                          : "Edit products"
                        : effectiveProductMode === "single"
                          ? "Select product"
                          : "Select products"}
                    </Button>
                  </InlineStack>

                  <input
                    type="hidden"
                    name="products"
                    value={JSON.stringify(products)}
                  />

                  {actionData?.errors?.products ? (
                    <InlineError
                      message={actionData.errors.products}
                      fieldID="bundle-products-error"
                    />
                  ) : null}

                  {products.length === 0 ? (
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No products selected.
                    </Text>
                  ) : (
                    <BlockStack gap="300">
                      {products.map((product) => (
                        <InlineStack
                          key={product.productId}
                          gap="300"
                          blockAlign="center"
                        >
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt=""
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "6px",
                                objectFit: "cover",
                              }}
                            />
                          ) : null}

                          <Text as="span" variant="bodyMd">
                            {product.title}
                          </Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              <Card>
                {showTierEditor ? (
                  <DiscountTierEditor
                    tiers={tiers}
                    onChange={setTiers}
                    error={actionData?.errors?.tiers}
                  />
                ) : (
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Together discount
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      This bundle uses the together discount from Storefront
                      display instead of quantity tiers.
                    </Text>
                  </BlockStack>
                )}

                <BlockStack gap="400">
                  {actionData?.errors?.server ? (
                    <InlineError
                      message={actionData.errors.server}
                      fieldID="bundle-server-error"
                    />
                  ) : null}
                </BlockStack>
              </Card>

              <InlineStack align="end" gap="300">
                <Button
                  onClick={() => navigate(`/app/bundles/${bundle.id}`)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  submit
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Save changes
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
