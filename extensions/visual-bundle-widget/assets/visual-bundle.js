(function () {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function variantNumericId(variantId) {
    var parts = String(variantId || "").split("/");

    return parts[parts.length - 1];
  }

  function renderProduct(product) {
    var image = product.imageUrl
      ? '<img class="visual-bundle-widget__image" src="' +
        escapeHtml(product.imageUrl) +
        '" alt="">'
      : '<div class="visual-bundle-widget__placeholder"></div>';

    return (
      '<div class="visual-bundle-widget__product">' +
      '<input class="visual-bundle-widget__checkbox" type="checkbox" ' +
      'data-bundle-product-checkbox data-variant-id="' +
      escapeHtml(product.variantId || "") +
      '" ' +
      (product.variantId ? "checked" : "disabled") +
      ">" +
      image +
      '<label class="visual-bundle-widget__product-title">' +
      escapeHtml(product.title) +
      (product.variantId ? "" : " (unavailable)") +
      "</label>" +
      "</div>"
    );
  }

  function renderTier(tier) {
    return (
      '<span class="visual-bundle-widget__tier">' +
      "Buy " +
      escapeHtml(tier.minimumQuantity) +
      "+, save " +
      escapeHtml(tier.discountValue) +
      "%" +
      "</span>"
    );
  }

  function renderBundle(bundle) {
    return (
      '<div data-visual-bundle-content data-bundle-id="' +
      escapeHtml(bundle.id) +
      '">' +
      '<h2 class="visual-bundle-widget__title">' +
      escapeHtml(bundle.title) +
      "</h2>" +
      '<div class="visual-bundle-widget__products">' +
      bundle.products.map(renderProduct).join("") +
      "</div>" +
      '<div class="visual-bundle-widget__tiers">' +
      bundle.tiers.map(renderTier).join("") +
      "</div>" +
      '<button class="visual-bundle-widget__button" type="button" data-add-bundle-to-cart>' +
      "Add selected bundle to cart" +
      "</button>" +
      '<div class="visual-bundle-widget__message" data-visual-bundle-message></div>' +
      "</div>"
    );
  }

  async function addBundleToCart(widget) {
    var message = widget.querySelector("[data-visual-bundle-message]");
    var checkedProducts = Array.prototype.slice.call(
      widget.querySelectorAll("[data-bundle-product-checkbox]:checked"),
    );

    if (checkedProducts.length === 0) {
      if (message) {
        message.textContent = "Select at least one product.";
      }
      return;
    }

    var button = widget.querySelector("[data-add-bundle-to-cart]");
    var bundleId =
      widget.querySelector("[data-visual-bundle-content]")?.getAttribute(
        "data-bundle-id",
      ) || "";

    if (button) {
      button.disabled = true;
      button.textContent = "Adding...";
    }

    if (message) {
      message.textContent = "";
    }

    try {
      var items = checkedProducts.map(function (checkbox) {
        return {
          id: variantNumericId(checkbox.getAttribute("data-variant-id")),
          quantity: 1,
          properties: {
            _visual_bundle_id: bundleId,
          },
        };
      });

      var response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items,
        }),
      });

      if (!response.ok) {
        throw new Error("Cart add failed");
      }

      if (message) {
        message.textContent = "Bundle added to cart.";
      }

      document.dispatchEvent(new CustomEvent("cart:refresh"));
    } catch (error) {
      if (message) {
        message.textContent = "Could not add bundle to cart.";
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Add selected bundle to cart";
      }
    }
  }

  async function loadBundle(widget) {
    var productId = widget.getAttribute("data-product-id");
    var shop = widget.getAttribute("data-shop");

    if (!productId || !shop) {
      widget.innerHTML = "";
      return;
    }

    var url =
      "/apps/visual-bundles?productId=" +
      encodeURIComponent(productId) +
      "&shop=" +
      encodeURIComponent(shop);

    try {
      var response = await fetch(url, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Bundle request failed");
      }

      var data = await response.json();
      var bundle = data.bundles && data.bundles[0];

      if (!bundle) {
        widget.innerHTML = "";
        return;
      }

      widget.innerHTML = renderBundle(bundle);
      widget
        .querySelector("[data-add-bundle-to-cart]")
        ?.addEventListener("click", function () {
          addBundleToCart(widget);
        });
    } catch (error) {
      widget.innerHTML =
        '<div class="visual-bundle-widget__empty">Bundle unavailable.</div>';
    }
  }

  document.querySelectorAll("[data-visual-bundle]").forEach(loadBundle);
})();
