import type {
  HeadersArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={polarisTranslations}>
        <NavMenu>
          <a href="/app/bundles" rel="home">
            Bundles
          </a>
          <a href="/app/bundles/new">Create bundle</a>
        </NavMenu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

export const headers: HeadersFunction = (headersArgs: HeadersArgs) => {
  return boundary.headers(headersArgs);
};
