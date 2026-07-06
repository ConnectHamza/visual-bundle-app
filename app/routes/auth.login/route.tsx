import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1 style={{ marginBottom: "30px" }}>Log in</h1>
      <Form method="post">
        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="shop" style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
            Shop domain
          </label>
          <input
            id="shop"
            type="text"
            name="shop"
            placeholder="example.myshopify.com"
            value={shop}
            onChange={(e) => setShop(e.currentTarget.value)}
            autoComplete="on"
            style={{
              width: "100%",
              padding: "10px",
              border: errors.shop ? "2px solid #e82600" : "1px solid #d3d3d3",
              borderRadius: "4px",
              fontSize: "16px",
              boxSizing: "border-box",
            }}
          />
          {errors.shop && (
            <div style={{ color: "#e82600", marginTop: "6px", fontSize: "14px" }}>
              {errors.shop}
            </div>
          )}
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#008060",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Log in
        </button>
      </Form>
    </div>
  );
}
