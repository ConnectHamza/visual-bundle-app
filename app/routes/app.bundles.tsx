import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import {
  Form,
  Link,
  data,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from "react-router";

import {
  Badge,
  Banner,
  Button,
  Card,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { bundleTypeFor } from "../lib/bundleTypes";

type BundleListItem = {
  id: string;
  title: string;
  status: string;
  bundleType: string;
  layoutStyle: string;
  displayDiscount: number;
};

type LoaderData = {
  bundles: BundleListItem[];
  discountStatus: "active" | "inactive" | "unknown";
  message?: string;
};

type ActionData = {
  success?: string;
  error?: string;
};

type BundleQueryResult = {
  id: string;
  title: string;
  status: string;
  bundleType: string;
  layoutStyle: string;
  discountValue: number;
  discountTiers: {
    discountValue: number;
  }[];
};

const routeMessages: Record<string, string> = {
  "bundle-created": "Bundle created successfully.",
  "bundle-deleted": "Bundle deleted successfully.",
};

function layoutStyleLabel(bundleType: string, layoutStyle: string) {
  return (
    bundleTypeFor(bundleType).layoutOptions.find(
      (option) => option.value === layoutStyle,
    )?.label ?? layoutStyle
  );
}

type ShopifyFunctionNode = {
  id: string;
  title?: string | null;
  apiType?: string | null;
};

type ShopifyFunctionsResponse = {
  data?: {
    shopifyFunctions?: {
      nodes?: ShopifyFunctionNode[];
    };
  };
};

type DiscountCreateResponse = {
  data?: {
    discountAutomaticAppCreate?: {
      automaticAppDiscount?: {
        discountId?: string;
        title?: string;
      } | null;
      userErrors?: {
        message: string;
      }[];
    };
  };
};

type AutomaticDiscountNode = {
  id: string;
  discount?: {
    __typename?: string;
    title?: string | null;
    status?: string | null;
    appDiscountType?: {
      functionId?: string | null;
    } | null;
  } | null;
};

type AutomaticDiscountNodesResponse = {
  data?: {
    discountNodes?: {
      nodes?: AutomaticDiscountNode[];
    };
  };
};

const VISUAL_BUNDLE_DISCOUNT_TITLE = "Visual Bundle Discount";

async function findVisualBundleDiscount(admin: {
  graphql: (query: string) => Promise<Response>;
}) {
  const discountsResponse = await admin.graphql(`
    #graphql
    query VisualBundleAutomaticDiscounts {
      discountNodes(first: 50) {
        nodes {
          id
          discount {
            __typename
            ... on DiscountAutomaticApp {
              title
              status
              appDiscountType {
                functionId
              }
            }
          }
        }
      }
    }
  `);
  const discountsJson =
    (await discountsResponse.json()) as AutomaticDiscountNodesResponse;
  const discounts = discountsJson.data?.discountNodes?.nodes ?? [];

  return discounts.find((discount) => {
    const title = discount.discount?.title ?? "";

    return title.toLowerCase() === VISUAL_BUNDLE_DISCOUNT_TITLE.toLowerCase();
  });
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<LoaderData> {
  const { admin, session } = await authenticate.admin(request);
  const messageKey = new URL(request.url).searchParams.get("message") || "";
  const message = routeMessages[messageKey];

  const results: BundleQueryResult[] = await db.bundle.findMany({
    where: {
      shop: session.shop,
    },
    select: {
      id: true,
      title: true,
      status: true,
      bundleType: true,
      layoutStyle: true,
      discountValue: true,
      discountTiers: {
        select: {
          discountValue: true,
        },
        orderBy: {
          minimumQuantity: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const bundles: BundleListItem[] = results.map((bundle) => ({
    id: bundle.id,
    title: bundle.title,
    status: bundle.status,
    bundleType: bundle.bundleType,
    layoutStyle: bundle.layoutStyle,
    displayDiscount:
      bundle.discountTiers[0]?.discountValue ?? bundle.discountValue,
  }));

  try {
    const discount = await findVisualBundleDiscount(admin);
    const status = discount?.discount?.status?.toLowerCase();

    return {
      bundles,
      discountStatus: status === "active" ? "active" : "inactive",
      message,
    };
  } catch {
    return { bundles, discountStatus: "unknown", message };
  }
}

export async function action({
  request,
}: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent !== "activate-discount") {
    return data<ActionData>(
      { error: "Unknown action." },
      { status: 400 },
    );
  }

  try {
    const existingDiscount = await findVisualBundleDiscount(admin);

    if (existingDiscount) {
      const status = existingDiscount.discount?.status?.toLowerCase();

      return data<ActionData>({
        success:
          status === "active"
            ? "Discount engine is already active."
            : "Discount engine already exists. Open Shopify Discounts and reactivate Visual Bundle Discount.",
      });
    }
  } catch {
    return data<ActionData>(
      {
        error:
          "Could not check discount status. Reauthorize the app if Shopify asks for updated discount permissions, then try again.",
      },
      { status: 400 },
    );
  }

  const functionsResponse = await admin.graphql(`
    #graphql
    query VisualBundleFunctions {
      shopifyFunctions(first: 25) {
        nodes {
          id
          title
          apiType
        }
      }
    }
  `);
  const functionsJson =
    (await functionsResponse.json()) as ShopifyFunctionsResponse;
  const functions = functionsJson.data?.shopifyFunctions?.nodes ?? [];
  const discountFunction = functions.find((shopifyFunction) => {
    const title = shopifyFunction.title?.toLowerCase() ?? "";
    const apiType = shopifyFunction.apiType?.toLowerCase() ?? "";

    return (
      title.includes("visual-bundle-discount") ||
      title.includes("visual bundle discount") ||
      apiType.includes("product")
    );
  });

  if (!discountFunction) {
    return data<ActionData>(
      {
        error:
          "The discount function is not available yet. Restart npm run dev and wait until the visual-bundle-discount extension builds successfully.",
      },
      { status: 400 },
    );
  }

  const discountResponse = await admin.graphql(
    `
      #graphql
      mutation CreateVisualBundleDiscount(
        $automaticAppDiscount: DiscountAutomaticAppInput!
      ) {
        discountAutomaticAppCreate(
          automaticAppDiscount: $automaticAppDiscount
        ) {
          automaticAppDiscount {
            discountId
            title
          }
          userErrors {
            message
          }
        }
      }
    `,
    {
      variables: {
        automaticAppDiscount: {
          title: "Visual Bundle Discount",
          functionId: discountFunction.id,
          startsAt: new Date().toISOString(),
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
        },
      },
    },
  );
  const discountJson =
    (await discountResponse.json()) as DiscountCreateResponse;
  const userErrors =
    discountJson.data?.discountAutomaticAppCreate?.userErrors ?? [];

  if (userErrors.length > 0) {
    return data<ActionData>(
      { error: userErrors.map((error) => error.message).join(" ") },
      { status: 400 },
    );
  }

  return data<ActionData>({
    success: "Discount engine activated. Test again by adding a bundle to cart.",
  });
}

export default function Bundles() {
  const { bundles, discountStatus, message } = useLoaderData() as LoaderData;
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Page
      title="Visual Bundles"
      primaryAction={{
        content: "Create bundle",
        onAction: () => navigate("/app/bundles/new"),
      }}
    >
      {message ? (
        <Banner tone="success">{message}</Banner>
      ) : null}

      {actionData?.success ? (
        <Banner tone="success">{actionData.success}</Banner>
      ) : null}

      {actionData?.error ? (
        <Banner tone="critical">{actionData.error}</Banner>
      ) : null}

      <Card>
        <div style={{ marginBottom: "1rem" }}>
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="bodyMd">
                Discount engine
              </Text>
              <Badge
                tone={
                  discountStatus === "active"
                    ? "success"
                    : discountStatus === "inactive"
                      ? "attention"
                      : "warning"
                }
              >
                {discountStatus}
              </Badge>
            </InlineStack>

            <Form method="post">
              <input
                type="hidden"
                name="intent"
                value="activate-discount"
              />
              <Button
                submit
                loading={isSubmitting}
                disabled={isSubmitting || discountStatus === "active"}
              >
                {discountStatus === "active"
                  ? "Discount engine active"
                  : "Activate discount engine"}
              </Button>
            </Form>
          </InlineStack>
        </div>

        {bundles.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
            }}
          >
            <Text as="p" variant="bodyMd">
              No bundles yet. Click &quot;Create bundle&quot; to get started.
            </Text>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "1rem",
            }}
          >
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #dfe3e8",
                  borderRadius: "12px",
                }}
              >
                <Link
                  to={`/app/bundles/${bundle.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <Text as="h3" variant="bodyMd">
                    {bundle.title}
                  </Text>
                </Link>

                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    marginTop: "0.5rem",
                  }}
                >
                  <Text as="span" variant="bodyMd">
                    Up to {bundle.displayDiscount}% off
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

                  <Badge>
                    {bundleTypeFor(bundle.bundleType).title}
                  </Badge>

                  <Badge>
                    {layoutStyleLabel(bundle.bundleType, bundle.layoutStyle)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
