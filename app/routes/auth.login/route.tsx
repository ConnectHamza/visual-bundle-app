import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (!url.searchParams.get("shop")) {
    throw new Response(
      "Open this app from the Shopify dev preview. Direct localhost app routes do not include Shopify shop/host authentication context.",
      { status: 400 },
    );
  }

  await login(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await login(request);

  return null;
};

export default function Auth() {
  return null;
}
