import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  throw redirect(
    url.search
      ? `/app/bundles${url.search}`
      : "/app/bundles",
  );
};

export default function App() {
  return null;
}
