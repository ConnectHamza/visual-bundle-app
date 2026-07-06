import type { LoaderFunctionArgs } from "react-router";

import {
  Link,
  useLoaderData,
  useNavigate,
} from "react-router";

import {
  Badge,
  Card,
  Page,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { db } from "../db.server";

type BundleListItem = {
  id: string;
  title: string;
  status: string;
  displayDiscount: number;
};

type LoaderData = {
  bundles: BundleListItem[];
};

type BundleQueryResult = {
  id: string;
  title: string;
  status: string;
  discountValue: number;
  discountTiers: {
    discountValue: number;
  }[];
};

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<LoaderData> {
  const { session } = await authenticate.admin(request);

  const results: BundleQueryResult[] = await db.bundle.findMany({
    where: {
      shop: session.shop,
    },
    select: {
      id: true,
      title: true,
      status: true,
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
  displayDiscount:
    bundle.discountTiers[0]?.discountValue ?? bundle.discountValue,
}));

  return { bundles };
}

export default function Bundles() {
  const { bundles } = useLoaderData() as LoaderData;
  const navigate = useNavigate();

  return (
    <Page
      title="Visual Bundles"
      primaryAction={{
        content: "Create bundle",
        onAction: () => navigate("/app/bundles/new"),
      }}
    >
      <Card>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}