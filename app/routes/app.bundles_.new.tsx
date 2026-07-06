import { useState } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

import {
  data,
  Form,
  useActionData,
  useNavigate,
  useNavigation,
} from "react-router";

import {
  Page,
  Layout,
  Card,
  Text,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  InlineError,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { db } from "../db.server";

type ActionDataResponse = {
  errors?: {
    title?: string;
    tier2?: string;
    tier3?: string;
    tier4?: string;
    server?: string;
  };
};

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, redirect } = await authenticate.admin(request);

  const formData = await request.formData();

  const title = String(formData.get("title") || "").trim();
  const tier2 = Number(formData.get("tier2"));
  const tier3 = Number(formData.get("tier3"));
  const tier4 = Number(formData.get("tier4"));

  const errors: NonNullable<ActionDataResponse["errors"]> = {};

  if (!title) {
    errors.title = "Bundle title is required.";
  }

  if (!Number.isFinite(tier2) || tier2 <= 0 || tier2 >= 100) {
    errors.tier2 = "Enter a discount between 1 and 99.";
  }

  if (!Number.isFinite(tier3) || tier3 <= tier2 || tier3 >= 100) {
    errors.tier3 =
      "The 3-item discount must be higher than the 2-item discount.";
  }

  if (!Number.isFinite(tier4) || tier4 <= tier3 || tier4 >= 100) {
    errors.tier4 =
      "The 4-item discount must be higher than the 3-item discount.";
  }

  if (Object.keys(errors).length > 0) {
    return data<ActionDataResponse>(
      { errors },
      { status: 400 },
    );
  }

  try {
    await db.bundle.create({
      data: {
        title,
        shop: session.shop,
        status: "draft",

        // Temporary fields still used by the bundle list
        discountType: "PERCENTAGE",
        discountValue: tier4,

        discountTiers: {
          create: [
            {
              minimumQuantity: 2,
              discountType: "PERCENTAGE",
              discountValue: tier2,
            },
            {
              minimumQuantity: 3,
              discountType: "PERCENTAGE",
              discountValue: tier3,
            },
            {
              minimumQuantity: 4,
              discountType: "PERCENTAGE",
              discountValue: tier4,
            },
          ],
        },
      },
    });

    return redirect("/app/bundles");
  } catch (error) {
    console.error("Failed to create bundle:", error);

    return data<ActionDataResponse>(
      {
        errors: {
          server: "The bundle could not be saved.",
        },
      },
      { status: 500 },
    );
  }
}

export default function CreateBundle() {
  const actionData = useActionData<ActionDataResponse>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [tier2, setTier2] = useState("10");
  const [tier3, setTier3] = useState("15");
  const [tier4, setTier4] = useState("20");

  const isSubmitting = navigation.state === "submitting";

  return (
    <Page
      title="Create Flexible Bundle"
      subtitle="Customers unlock larger discounts by selecting more products."
      backAction={{
        content: "Bundles",
        onAction: () => navigate("/app/bundles"),
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
                    placeholder="Example: Summer Complete the Look"
                    error={actionData?.errors?.title}
                  />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Discount tiers
                  </Text>

                  <Text as="p" variant="bodyMd" tone="subdued">
                    Each discount must be higher than the previous tier.
                  </Text>

                  <InlineStack gap="400" blockAlign="start">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="2 items"
                        name="tier2"
                        type="number"
                        suffix="%"
                        value={tier2}
                        onChange={setTier2}
                        autoComplete="off"
                        error={actionData?.errors?.tier2}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <TextField
                        label="3 items"
                        name="tier3"
                        type="number"
                        suffix="%"
                        value={tier3}
                        onChange={setTier3}
                        autoComplete="off"
                        error={actionData?.errors?.tier3}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <TextField
                        label="4 items"
                        name="tier4"
                        type="number"
                        suffix="%"
                        value={tier4}
                        onChange={setTier4}
                        autoComplete="off"
                        error={actionData?.errors?.tier4}
                      />
                    </div>
                  </InlineStack>

                  {actionData?.errors?.server ? (
                    <InlineError
                      message={actionData.errors.server}
                      fieldID="bundle-server-error"
                    />
                  ) : null}
                </BlockStack>
              </Card>

              <InlineStack align="end">
                <Button
                  submit
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Save Bundle
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}