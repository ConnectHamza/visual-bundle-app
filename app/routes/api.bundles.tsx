import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";

import { db } from "../db.server";

type BundleResponse = {
  bundles: {
    id: string;
    title: string;
    status: string;
    products: {
      id: string;
      productId: string;
      variantId: string | null;
      title: string;
      handle: string | null;
      imageUrl: string | null;
    }[];
    tiers: {
      minimumQuantity: number;
      discountValue: number;
    }[];
  }[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop");

  if (!productId || !shop) {
    return data<BundleResponse>(
      { bundles: [] },
      { headers: corsHeaders },
    );
  }

  const bundles = await db.bundle.findMany({
    where: {
      shop,
      bundleItems: {
        some: {
          productId,
        },
      },
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
    orderBy: {
      createdAt: "desc",
    },
  });

  return data<BundleResponse>(
    {
      bundles: bundles.map((bundle) => ({
        id: bundle.id,
        title: bundle.title,
        status: bundle.status,
        products: bundle.bundleItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          title: item.title,
          handle: item.handle,
          imageUrl: item.imageUrl,
        })),
        tiers: bundle.discountTiers.map((tier) => ({
          minimumQuantity: tier.minimumQuantity,
          discountValue: tier.discountValue,
        })),
      })),
    },
    { headers: corsHeaders },
  );
}
