import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import type { FormEvent } from "react";
import {
  Form,
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router";

import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { bundleTypeFor } from "../lib/bundleTypes";

type DiscountTierData = {
  id: string;
  minimumQuantity: number;
  discountValue: number;
};

type BundleItemData = {
  id: string;
  productId: string;
  title: string;
  handle: string | null;
  imageUrl: string | null;
};

type BundleDetailsData = {
  bundle: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    bundleType: string;
    layoutStyle: string;
    accentColor: string;
    buttonText: string;
    volumeScope: string;
    minimumSelections: number;
    maximumSelections: number | null;
    fbtDiscountValue: number | null;
    discountTiers: DiscountTierData[];
    bundleItems: BundleItemData[];
  };
  message?: string;
};

const routeMessages: Record<string, string> = {
  "bundle-updated": "Bundle updated successfully.",
  "bundle-duplicated": "Bundle duplicated successfully.",
  "bundle-activated": "Bundle activated successfully.",
  "bundle-drafted": "Bundle moved to draft.",
};

function layoutStyleLabel(bundleType: string, layoutStyle: string) {
  return (
    bundleTypeFor(bundleType).layoutOptions.find(
      (option) => option.value === layoutStyle,
    )?.label ?? layoutStyle
  );
}

function bundleIdFromRequest(request: Request, params: LoaderFunctionArgs["params"]) {
  if (params.id) {
    return params.id;
  }

  const pathname = new URL(request.url).pathname;
  const match = pathname.match(/\/app\/bundles\/([^/]+)/);

  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Handles GET requests for /app/bundles/:id
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<BundleDetailsData> {
  const { session } = await authenticate.admin(request);
  const bundleId = bundleIdFromRequest(request, params);
  const messageKey = new URL(request.url).searchParams.get("message") || "";

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
      discountTiers: {
        orderBy: {
          minimumQuantity: "asc",
        },
      },
      bundleItems: {
        orderBy: {
          position: "asc",
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
      description: bundle.description,
      status: bundle.status,
      bundleType: bundle.bundleType,
      layoutStyle: bundle.layoutStyle,
      accentColor: bundle.accentColor,
      buttonText: bundle.buttonText,
      volumeScope: bundle.volumeScope,
      minimumSelections: bundle.minimumSelections,
      maximumSelections: bundle.maximumSelections,
      fbtDiscountValue: bundle.fbtDiscountValue,
      discountTiers: bundle.discountTiers.map((tier: DiscountTierData) => ({
        id: tier.id,
        minimumQuantity: tier.minimumQuantity,
        discountValue: tier.discountValue,
      })),
      bundleItems: bundle.bundleItems.map((item: BundleItemData) => ({
        id: item.id,
        productId: item.productId,
        title: item.title,
        handle: item.handle,
        imageUrl: item.imageUrl,
      })),
    },
    message: routeMessages[messageKey],
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
  const intent = String(formData.get("intent") || "update-status");

  if (intent === "delete") {
    await db.bundle.deleteMany({
      where: {
        id: bundleId,
        shop: session.shop,
      },
    });

    return redirect("/app/bundles?message=bundle-deleted");
  }

  if (intent === "duplicate") {
    const bundle = await db.bundle.findFirst({
      where: {
        id: bundleId,
        shop: session.shop,
      },
      include: {
        discountTiers: true,
        bundleItems: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!bundle) {
      throw new Response("Bundle not found.", {
        status: 404,
      });
    }

    const duplicate = await db.bundle.create({
      data: {
        title: `${bundle.title} copy`,
        description: bundle.description,
        shop: session.shop,
        status: "draft",
        discountType: bundle.discountType,
        discountValue: bundle.discountValue,
        heroImage: bundle.heroImage,
        bundleType: bundle.bundleType,
        layoutStyle: bundle.layoutStyle,
        accentColor: bundle.accentColor,
        buttonText: bundle.buttonText,
        volumeScope: bundle.volumeScope,
        minimumSelections: bundle.minimumSelections,
        maximumSelections: bundle.maximumSelections,
        fbtDiscountValue: bundle.fbtDiscountValue,
        discountTiers: {
          create: bundle.discountTiers.map((tier) => ({
            minimumQuantity: tier.minimumQuantity,
            discountType: tier.discountType,
            discountValue: tier.discountValue,
          })),
        },
        bundleItems: {
          create: bundle.bundleItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            handle: item.handle,
            imageUrl: item.imageUrl,
            position: item.position,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    return redirect(`/app/bundles/${duplicate.id}?message=bundle-duplicated`);
  }

  const status = String(formData.get("status") || "");

  if (status !== "active" && status !== "draft") {
    throw new Response("Invalid bundle status.", {
      status: 400,
    });
  }

  await db.bundle.updateMany({
    where: {
      id: bundleId,
      shop: session.shop,
    },
    data: {
      status,
    },
  });

  return redirect(
    `/app/bundles/${bundleId}?message=${
      status === "active" ? "bundle-activated" : "bundle-drafted"
    }`,
  );
}

export default function BundleDetails() {
  const { bundle, message } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";
  const nextStatus = bundle.status === "active" ? "draft" : "active";

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Delete "${bundle.title}"? This cannot be undone.`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  if (location.pathname.endsWith("/edit")) {
    return <Outlet />;
  }

  return (
    <Page
      title={bundle.title}
      backAction={{
        content: "Bundles",
        onAction: () => navigate("/app/bundles"),
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {message ? (
              <Banner tone="success">{message}</Banner>
            ) : null}

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Bundle details
                  </Text>

                  <Badge
                    tone={
                      bundle.status === "active"
                        ? "success"
                        : "attention"
                    }
                  >
                    {bundle.status}
                  </Badge>
                </InlineStack>

                <InlineStack gap="300">
                  <Button
                    onClick={() => navigate(`/app/bundles/${bundle.id}/edit`)}
                    accessibilityLabel={`Edit ${bundle.title}`}
                  >
                    Edit bundle
                  </Button>

                  <Button
                    onClick={() =>
                      submit(
                        { intent: "duplicate" },
                        { method: "post" },
                      )
                    }
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Duplicate
                  </Button>

                  <Form method="post">
                    <input type="hidden" name="status" value={nextStatus} />
                    <Button
                      submit
                      variant={
                        bundle.status === "active" ? "secondary" : "primary"
                      }
                      loading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      {bundle.status === "active"
                        ? "Move to draft"
                        : "Activate bundle"}
                    </Button>
                  </Form>
                </InlineStack>

                <Form method="post" onSubmit={confirmDelete}>
                  <input type="hidden" name="intent" value="delete" />
                  <Button
                    submit
                    tone="critical"
                    variant="plain"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Delete bundle
                  </Button>
                </Form>

                <Text as="p" variant="bodyMd">
                  {bundle.description || "No description added."}
                </Text>

                <InlineStack gap="200">
                  <Badge>
                    {bundleTypeFor(bundle.bundleType).title}
                  </Badge>
                  <Badge>
                    {layoutStyleLabel(bundle.bundleType, bundle.layoutStyle)}
                  </Badge>
                  <Badge>{bundle.buttonText}</Badge>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Discount tiers
                </Text>

                {bundle.discountTiers.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No discount tiers configured.
                  </Text>
                ) : (
                  bundle.discountTiers.map((tier) => (
                    <div
                      key={tier.id}
                      style={{
                        padding: "12px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "8px",
                      }}
                    >
                      <Text as="p" variant="bodyMd">
                        Select {tier.minimumQuantity} items -{" "}
                        {tier.discountValue}% off
                      </Text>
                    </div>
                  ))
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Products
                </Text>

                {bundle.bundleItems.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No products selected.
                  </Text>
                ) : (
                  <BlockStack gap="300">
                    {bundle.bundleItems.map((item) => (
                      <InlineStack
                        key={item.id}
                        gap="300"
                        blockAlign="center"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "6px",
                              objectFit: "cover",
                            }}
                          />
                        ) : null}

                        <BlockStack gap="100">
                          <Text as="span" variant="bodyMd">
                            {item.title}
                          </Text>

                          {item.handle ? (
                            <Text as="span" variant="bodySm" tone="subdued">
                              <Link to={`/products/${item.handle}`}>
                                /products/{item.handle}
                              </Link>
                            </Text>
                          ) : null}
                        </BlockStack>
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            <Outlet />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
