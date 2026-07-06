import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";

import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

type DiscountTierData = {
  id: string;
  minimumQuantity: number;
  discountValue: number;
};

type BundleDetailsData = {
  bundle: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    discountTiers: DiscountTierData[];
  };
};

/**
 * Handles GET requests for /app/bundles/:id
 */
export async function loader({
  request,
  params,
}: LoaderFunctionArgs): Promise<BundleDetailsData> {
  const { session } = await authenticate.admin(request);

  if (!params.id) {
    throw new Response("Bundle ID is missing.", {
      status: 400,
    });
  }

  const bundle = await db.bundle.findFirst({
    where: {
      id: params.id,
      shop: session.shop,
    },
    include: {
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
      description: bundle.description,
      status: bundle.status,
      discountTiers: bundle.discountTiers.map((tier: DiscountTierData) => ({
        id: tier.id,
        minimumQuantity: tier.minimumQuantity,
        discountValue: tier.discountValue,
      })),
    },
  };
}

export default function BundleDetails() {
  const { bundle } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

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

                <Text as="p" variant="bodyMd">
                  {bundle.description || "No description added."}
                </Text>
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
                        Select {tier.minimumQuantity} items —{" "}
                        {tier.discountValue}% off
                      </Text>
                    </div>
                  ))
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}