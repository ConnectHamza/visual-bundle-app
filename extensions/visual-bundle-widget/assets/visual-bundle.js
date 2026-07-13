"use strict";

(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function variantIdFromGid(value) {
    const parts = String(value || "").split("/");
    return parts[parts.length - 1];
  }

  function imageMarkup(product, className) {
    if (product.imageUrl) {
      return (
        '<img class="' +
        className +
        '" src="' +
        escapeHtml(product.imageUrl) +
        '" alt="">'
      );
    }

    return '<div class="' + className + ' visual-bundle-widget__placeholder"></div>';
  }

  function tierLabel(tier) {
    return (
      "Buy " +
      escapeHtml(tier.minimumQuantity) +
      "+, save " +
      escapeHtml(tier.discountValue) +
      "%"
    );
  }

  function tierMarkup(tier, index, selected) {
    return (
      '<button class="visual-bundle-widget__tier visual-bundle-widget__tier--option' +
      (selected ? " is-selected" : "") +
      '" type="button" data-volume-tier-index="' +
      index +
      '">' +
      '<span>' +
      tierLabel(tier) +
      "</span>" +
      "</button>"
    );
  }

  function productCheckbox(product, checked, modifier) {
    const disabled = product.variantId ? "" : "disabled";
    const isChecked = checked && product.variantId ? "checked" : "";

    return (
      '<label class="visual-bundle-widget__product ' +
      modifier +
      '">' +
      '<input class="visual-bundle-widget__checkbox" type="checkbox" data-bundle-product-checkbox data-variant-id="' +
      escapeHtml(product.variantId || "") +
      '" data-product-handle="' +
      escapeHtml(product.handle || "") +
      '" ' +
      disabled +
      " " +
      isChecked +
      ">" +
      imageMarkup(product, "visual-bundle-widget__image") +
      '<span class="visual-bundle-widget__product-title">' +
      escapeHtml(product.title) +
      (product.variantId ? "" : " (unavailable)") +
      "</span>" +
      "</label>"
    );
  }

  function hiddenProduct(product, checked) {
    return (
      '<input class="visual-bundle-widget__checkbox" type="checkbox" data-bundle-product-checkbox data-variant-id="' +
      escapeHtml(product.variantId || "") +
      '" data-product-handle="' +
      escapeHtml(product.handle || "") +
      '" ' +
      (checked && product.variantId ? "checked" : "") +
      ' style="display:none" hidden>'
    );
  }

  function mixAndMatchProducts(bundle) {
    const max = Number(bundle.maximumSelections || bundle.products.length || 0);
    const slots = Array.from({ length: Math.max(2, Math.min(max || 4, 6)) })
      .map(function (_, index) {
        return (
          '<div class="visual-bundle-widget__slot" data-visual-bundle-slot="' +
          index +
          '">+</div>'
        );
      })
      .join("");

    return (
      '<div class="visual-bundle-widget__build-box">' +
      '<div class="visual-bundle-widget__products visual-bundle-widget__products--pool">' +
      bundle.products
        .map(function (product) {
          return (
            '<label class="visual-bundle-widget__product visual-bundle-widget__product--pool">' +
            imageMarkup(product, "visual-bundle-widget__image") +
            '<span class="visual-bundle-widget__product-title">' +
            escapeHtml(product.title) +
            (product.variantId ? "" : " (unavailable)") +
            "</span>" +
            '<input class="visual-bundle-widget__checkbox" type="checkbox" data-bundle-product-checkbox data-variant-id="' +
            escapeHtml(product.variantId || "") +
            '" data-product-handle="' +
            escapeHtml(product.handle || "") +
            '" ' +
            (product.variantId ? "" : "disabled") +
            ">" +
            '<span class="visual-bundle-widget__add-pill" data-pool-action>Add</span>' +
            "</label>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="visual-bundle-widget__tray" data-visual-bundle-tray>' +
      slots +
      "</div>" +
      "</div>"
    );
  }

  function fbtProducts(bundle) {
    return (
      '<div class="visual-bundle-widget__fbt-list">' +
      bundle.products
        .map(function (product, index) {
          const discount = Number(bundle.fbtDiscountValue || 0);

          return (
            '<div class="visual-bundle-widget__fbt-item">' +
            (index > 0 ? '<span class="visual-bundle-widget__plus">+</span>' : "") +
            hiddenProduct(product, true) +
            '<span class="visual-bundle-widget__included" aria-hidden="true"></span>' +
            imageMarkup(product, "visual-bundle-widget__image") +
            '<div class="visual-bundle-widget__fbt-copy">' +
            '<span class="visual-bundle-widget__product-title">' +
            escapeHtml(product.title) +
            (product.variantId ? "" : " (unavailable)") +
            "</span>" +
            (index === 0
              ? '<small>Main product</small>'
              : '<small>Recommended add-on' +
                (discount ? ", save " + escapeHtml(discount) + "%" : "") +
                "</small>") +
            "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function volumeProducts(bundle) {
    const product = bundle.products[0];

    if (!product) {
      return "";
    }

    const tiers =
      bundle.tiers && bundle.tiers.length > 0
        ? bundle.tiers
        : [{ minimumQuantity: 1, discountValue: 0 }];

    return (
      hiddenProduct(product, true) +
      '<div class="visual-bundle-widget__volume">' +
      '<div class="visual-bundle-widget__volume-product">' +
      imageMarkup(product, "visual-bundle-widget__image") +
      '<span class="visual-bundle-widget__product-title">' +
      escapeHtml(product.title) +
      "</span>" +
      "</div>" +
      '<div class="visual-bundle-widget__volume-options">' +
      tiers
        .map(function (tier, index) {
          return tierMarkup(tier, index, index === 0);
        })
        .join("") +
      "</div>" +
      "</div>"
    );
  }

  function fixedProducts(bundle) {
    return (
      '<div class="visual-bundle-widget__products visual-bundle-widget__products--fixed">' +
      bundle.products
        .map(function (product) {
          return (
            hiddenProduct(product, true) +
            '<div class="visual-bundle-widget__product visual-bundle-widget__product--fixed">' +
            imageMarkup(product, "visual-bundle-widget__image") +
            '<span class="visual-bundle-widget__product-title">' +
            escapeHtml(product.title) +
            "</span>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function classicProducts(bundle) {
    return (
      '<div class="visual-bundle-widget__products">' +
      bundle.products
        .map(function (product) {
          return productCheckbox(product, false, "");
        })
        .join("") +
      "</div>"
    );
  }

  function productMarkup(bundle) {
    if (
      bundle.bundleType === "frequently_bought_together" ||
      bundle.bundleType === "cross_sell" ||
      bundle.bundleType === "bogo" ||
      bundle.bundleType === "buy_x_get_y"
    ) {
      return fbtProducts(bundle);
    }

    if (
      bundle.bundleType === "quantity_breaks" ||
      bundle.bundleType === "volume_discount" ||
      bundle.bundleType === "mystery_box"
    ) {
      return volumeProducts(bundle);
    }

    if (
      bundle.bundleType === "mix_match" ||
      bundle.bundleType === "tiered_mix_match" ||
      bundle.bundleType === "build_box_limited" ||
      bundle.bundleType === "build_box_unlimited" ||
      bundle.bundleType === "collection_bundle"
    ) {
      return mixAndMatchProducts(bundle);
    }

    if (bundle.bundleType === "fixed_bundle") {
      return fixedProducts(bundle);
    }

    return classicProducts(bundle);
  }

  function tierBadges(bundle) {
    if (
      bundle.bundleType === "quantity_breaks" ||
      bundle.bundleType === "volume_discount" ||
      bundle.bundleType === "mystery_box"
    ) {
      return "";
    }

    if (
      bundle.bundleType === "frequently_bought_together" ||
      bundle.bundleType === "cross_sell" ||
      bundle.bundleType === "bogo" ||
      bundle.bundleType === "buy_x_get_y"
    ) {
      return (
        '<div class="visual-bundle-widget__tiers"><span class="visual-bundle-widget__tier">Together discount: save ' +
        escapeHtml(bundle.fbtDiscountValue || 0) +
        "%</span></div>"
      );
    }

    return (
      '<div class="visual-bundle-widget__tiers">' +
      (bundle.tiers || [])
        .map(function (tier) {
          return (
            '<span class="visual-bundle-widget__tier">' +
            tierLabel(tier) +
            "</span>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function bundleMarkup(bundle) {
    const tiers = escapeHtml(JSON.stringify(bundle.tiers || []));
    const layoutStyle = escapeHtml(bundle.layoutStyle || "list");
    const bundleType = escapeHtml(bundle.bundleType || "classic");
    const accentColor = escapeHtml(bundle.accentColor || "#008060");
    const buttonText = escapeHtml(bundle.buttonText || "Add bundle");

    return (
      '<div class="visual-bundle-widget__content visual-bundle-widget__content--' +
      layoutStyle +
      " visual-bundle-widget__content--type-" +
      bundleType +
      '" style="--visual-bundle-accent:' +
      accentColor +
      '" data-visual-bundle-content data-bundle-id="' +
      escapeHtml(bundle.id) +
      '" data-bundle-type="' +
      bundleType +
      '" data-minimum-selections="' +
      escapeHtml(bundle.minimumSelections || 2) +
      '" data-maximum-selections="' +
      escapeHtml(bundle.maximumSelections || "") +
      '" data-bundle-tiers="' +
      tiers +
      '">' +
      '<h2 class="visual-bundle-widget__title">' +
      escapeHtml(bundle.title) +
      "</h2>" +
      productMarkup(bundle) +
      tierBadges(bundle) +
      '<div class="visual-bundle-widget__selection" data-visual-bundle-selection>Select products.</div>' +
      '<button class="visual-bundle-widget__button" type="button" data-visual-bundle-confirm disabled>' +
      buttonText +
      "</button>" +
      '<div class="visual-bundle-widget__message" data-visual-bundle-message></div>' +
      "</div>"
    );
  }

  function contentFor(root) {
    return root.querySelector("[data-visual-bundle-content]");
  }

  function bundleType(root) {
    return contentFor(root)?.getAttribute("data-bundle-type") || "classic";
  }

  function minimumSelections(root) {
    const content = contentFor(root);
    const type = bundleType(root);

    if (
      type === "quantity_breaks" ||
      type === "volume_discount" ||
      type === "mystery_box" ||
      type === "frequently_bought_together" ||
      type === "cross_sell" ||
      type === "bogo" ||
      type === "buy_x_get_y" ||
      type === "fixed_bundle"
    ) {
      return 1;
    }

    return Math.max(2, Number(content?.getAttribute("data-minimum-selections")) || 2);
  }

  function selectedCheckboxes(root) {
    return Array.from(
      root.querySelectorAll("[data-bundle-product-checkbox]:checked"),
    );
  }

  function maxSelections(root) {
    const value = contentFor(root)?.getAttribute("data-maximum-selections") || "";

    return value ? Number(value) : null;
  }

  function bundleTiers(root) {
    const tiersValue = contentFor(root)?.getAttribute("data-bundle-tiers") || "[]";

    try {
      const tiers = JSON.parse(tiersValue);

      return Array.isArray(tiers) ? tiers : [];
    } catch {
      return [];
    }
  }

  function currencyCode() {
    return window.Shopify?.currency?.active || "USD";
  }

  function formatMoney(cents) {
    return new Intl.NumberFormat(undefined, {
      currency: currencyCode(),
      style: "currency",
    }).format(cents / 100);
  }

  function selectedTierDiscount(root, selectedCount) {
    const type = bundleType(root);

    if (
      type === "quantity_breaks" ||
      type === "volume_discount" ||
      type === "mystery_box"
    ) {
      const selectedTier = root.querySelector(
        ".visual-bundle-widget__tier--option.is-selected",
      );
      const selectedIndex = Number(
        selectedTier?.getAttribute("data-volume-tier-index") || "0",
      );
      const tier = bundleTiers(root)[selectedIndex];

      return Number(tier?.discountValue || 0);
    }

    return bundleTiers(root).reduce(function (bestDiscount, tier) {
      const minimumQuantity = Number(tier.minimumQuantity || 0);
      const discountValue = Number(tier.discountValue || 0);

      return selectedCount >= minimumQuantity
        ? Math.max(bestDiscount, discountValue)
        : bestDiscount;
    }, 0);
  }

  function volumeQuantity(root) {
    const selectedTier = root.querySelector(
      ".visual-bundle-widget__tier--option.is-selected",
    );
    const selectedIndex = Number(
      selectedTier?.getAttribute("data-volume-tier-index") || "0",
    );
    const tier = bundleTiers(root)[selectedIndex];

    return Math.max(1, Number(tier?.minimumQuantity || 1));
  }

  function updatePriceSummary(root) {
    const selected = selectedCheckboxes(root);
    const type = bundleType(root);
    const quantityMultiplier =
      type === "quantity_breaks" ||
      type === "volume_discount" ||
      type === "mystery_box"
        ? volumeQuantity(root)
        : 1;
    const originalTotal = selected.reduce(function (total, checkbox) {
      return (
        total +
        Number(checkbox.getAttribute("data-price-cents") || 0) *
          quantityMultiplier
      );
    }, 0);
    const discount = selectedTierDiscount(root, selected.length);

    if (!originalTotal || !discount) {
      updateThemePrice(null);
      return;
    }

    const discountedTotal = Math.round(originalTotal * (1 - discount / 100));

    updateThemePrice({
      discountedTotal,
      originalTotal,
    });
  }

  function productPriceElement() {
    const selectors = [
      ".product__info-container .price",
      ".product__info-wrapper .price",
      ".product-info .price",
      ".product .price",
      "[data-product-price]",
    ];

    for (const selector of selectors) {
      const element = Array.from(document.querySelectorAll(selector)).find(
        function (candidate) {
          return !candidate.closest("[data-visual-bundle]");
        },
      );

      if (element) {
        return element;
      }
    }

    return null;
  }

  function updateThemePrice(price) {
    const element = productPriceElement();

    if (!element) {
      return;
    }

    if (!element.getAttribute("data-visual-bundle-original-price-html")) {
      element.setAttribute(
        "data-visual-bundle-original-price-html",
        element.innerHTML,
      );
    }

    if (!price) {
      element.innerHTML =
        element.getAttribute("data-visual-bundle-original-price-html") || "";
      element.removeAttribute("data-visual-bundle-price-active");
      return;
    }

    element.setAttribute("data-visual-bundle-price-active", "true");
    element.innerHTML =
      '<span class="visual-bundle-widget__theme-price-new">' +
      formatMoney(price.discountedTotal) +
      "</span> " +
      '<span class="visual-bundle-widget__theme-price-old">' +
      formatMoney(price.originalTotal) +
      "</span>";
  }

  async function hydratePrices(root) {
    const checkboxes = Array.from(
      root.querySelectorAll("[data-bundle-product-checkbox]"),
    );
    const handles = Array.from(
      new Set(
        checkboxes
          .map(function (checkbox) {
            return checkbox.getAttribute("data-product-handle") || "";
          })
          .filter(Boolean),
      ),
    );

    await Promise.all(
      handles.map(async function (handle) {
        try {
          const response = await fetch("/products/" + encodeURIComponent(handle) + ".js");

          if (!response.ok) {
            return;
          }

          const product = await response.json();
          const price = Number(product.variants?.[0]?.price || product.price || 0);

          checkboxes.forEach(function (checkbox) {
            if (checkbox.getAttribute("data-product-handle") === handle) {
              checkbox.setAttribute("data-price-cents", String(price));
            }
          });
        } catch {
          // Price preview is non-critical; discounts still apply in cart.
        }
      }),
    );

    updatePriceSummary(root);
  }

  function updateBuildBox(root) {
    const slots = Array.from(root.querySelectorAll("[data-visual-bundle-slot]"));
    const selected = selectedCheckboxes(root);

    slots.forEach(function (slot, index) {
      const checkbox = selected[index];
      const product = checkbox?.closest(".visual-bundle-widget__product");
      const image = product?.querySelector(".visual-bundle-widget__image");

      slot.classList.toggle("is-filled", Boolean(product));
      slot.innerHTML = image
        ? image.outerHTML
        : index < selected.length
          ? "Selected"
          : "+";
    });

    root.querySelectorAll("[data-pool-action]").forEach(function (action) {
      const product = action.closest(".visual-bundle-widget__product");
      const checkbox = product?.querySelector("[data-bundle-product-checkbox]");

      action.textContent = checkbox?.checked ? "Remove" : "Add";
    });
  }

  function updateSelection(root) {
    const type = bundleType(root);
    const selected = selectedCheckboxes(root);
    const minimum = minimumSelections(root);
    const selection = root.querySelector("[data-visual-bundle-selection]");
    const button = root.querySelector("[data-visual-bundle-confirm]");
    const ready = selected.length >= minimum;

    root.setAttribute("data-bundle-ready", "false");

    if (button instanceof HTMLButtonElement) {
      button.disabled = !ready;
    }

    updatePriceSummary(root);

    if (
      type === "mix_match" ||
      type === "tiered_mix_match" ||
      type === "build_box_limited" ||
      type === "build_box_unlimited" ||
      type === "collection_bundle"
    ) {
      updateBuildBox(root);
    }

    if (!selection) {
      return;
    }

    if (
      type === "frequently_bought_together" ||
      type === "cross_sell" ||
      type === "bogo" ||
      type === "buy_x_get_y" ||
      type === "fixed_bundle"
    ) {
      selection.textContent = "Buy these products together to unlock the offer.";
      return;
    }

    if (
      type === "quantity_breaks" ||
      type === "volume_discount" ||
      type === "mystery_box"
    ) {
      selection.textContent = "Choose a quantity tier, then confirm the offer.";
      return;
    }

    if (selected.length === 0) {
      selection.textContent =
        type === "mix_match" ||
        type === "tiered_mix_match" ||
        type === "build_box_limited" ||
        type === "build_box_unlimited" ||
        type === "collection_bundle"
          ? "Build your bundle from the product pool."
          : "Select products.";
      return;
    }

    if (!ready) {
      selection.textContent =
        "Select " + (minimum - selected.length) + " more product.";
      return;
    }

    selection.textContent = selected.length + " products selected. Confirm, then add.";
  }

  function confirmBundle(root) {
    const message = root.querySelector("[data-visual-bundle-message]");
    const selected = selectedCheckboxes(root);
    const minimum = minimumSelections(root);

    if (selected.length < minimum) {
      root.setAttribute("data-bundle-ready", "false");
      if (message) {
        message.textContent = "Select enough products to unlock this bundle.";
      }
      return;
    }

    root.setAttribute("data-bundle-ready", "true");
    if (message) {
      message.textContent = "Bundle ready. Use the main Add to cart button.";
    }
  }

  async function addItems(items) {
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error("Cart add failed");
    }

    return response.json();
  }

  function replaceSection(selector, html) {
    const current = document.querySelector(selector);
    const next = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector);

    if (current && next) {
      current.replaceWith(next);
    }
  }

  async function refreshCartDrawer() {
    const response = await fetch("?sections=cart-drawer");

    if (!response.ok) {
      return false;
    }

    const sections = await response.json();
    replaceSection("cart-drawer", sections["cart-drawer"]);

    const cartDrawer = document.querySelector("cart-drawer");
    if (cartDrawer && typeof cartDrawer.open === "function") {
      cartDrawer.open();
      return true;
    }

    document.querySelector("#cart-icon-bubble")?.click();
    return true;
  }

  function currentQuantity(form) {
    const quantityInput =
      form instanceof HTMLFormElement ? form.querySelector('input[name="quantity"]') : null;

    return Math.max(1, Number(quantityInput?.value) || 1);
  }

  async function submitBundle(root, submitter, form) {
    const message = root.querySelector("[data-visual-bundle-message]");
    const selected = selectedCheckboxes(root);
    const minimum = minimumSelections(root);

    if (selected.length < minimum) {
      if (message) {
        message.textContent = "Select enough products to unlock this bundle.";
      }
      return;
    }

    const content = contentFor(root);
    const bundleId = content?.getAttribute("data-bundle-id") || "";
    const tiers = content?.getAttribute("data-bundle-tiers") || "[]";
    const quantity =
      bundleType(root) === "quantity_breaks" ||
      bundleType(root) === "volume_discount"
        ? currentQuantity(form)
        : 1;
    const properties = {
      _visual_bundle_id: bundleId,
      _visual_bundle_tiers: tiers,
    };
    const items = selected.map(function (checkbox) {
      return {
        id: variantIdFromGid(checkbox.getAttribute("data-variant-id")),
        quantity,
        properties,
      };
    });

    if (message) {
      message.textContent = "";
    }

    if (submitter instanceof HTMLElement) {
      submitter.setAttribute("aria-busy", "true");
      submitter.setAttribute("disabled", "disabled");
    }

    try {
      await addItems(items);
      if (message) {
        message.textContent = "Bundle added.";
      }
      await refreshCartDrawer();
    } catch {
      if (message) {
        message.textContent = "Bundle add failed.";
      }
    } finally {
      if (submitter instanceof HTMLElement) {
        submitter.removeAttribute("aria-busy");
        submitter.removeAttribute("disabled");
      }
      root.setAttribute("data-bundle-ready", "false");
      updateSelection(root);
    }
  }

  function readyBundle() {
    return Array.from(document.querySelectorAll("[data-visual-bundle]")).find(
      function (root) {
        return (
          contentFor(root) &&
          root.getAttribute("data-bundle-ready") === "true" &&
          selectedCheckboxes(root).length >= minimumSelections(root)
        );
      },
    );
  }

  function isCartAddForm(form) {
    return (form.getAttribute("action") || "").includes("/cart/add");
  }

  function isCheckoutButton(button) {
    if (!button) {
      return false;
    }

    const formAction = button.getAttribute("formaction") || "";
    return button.name === "checkout" || formAction.includes("/checkout");
  }

  async function onSubmit(event) {
    const form = event.target;
    const submitter = event.submitter;
    const root = readyBundle();

    if (
      !(form instanceof HTMLFormElement) ||
      !isCartAddForm(form) ||
      !root ||
      isCheckoutButton(submitter)
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    await submitBundle(root, submitter, form);
  }

  function bindWidget(root) {
    root.querySelectorAll("[data-bundle-product-checkbox]").forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        const type = bundleType(root);
        const maximum = maxSelections(root);

        if (
          maximum &&
          (type === "mix_match" ||
            type === "tiered_mix_match" ||
            type === "build_box_limited" ||
            type === "build_box_unlimited" ||
            type === "collection_bundle") &&
          selectedCheckboxes(root).length > maximum
        ) {
          checkbox.checked = false;
        }

        const message = root.querySelector("[data-visual-bundle-message]");
        if (message) {
          message.textContent = "";
        }
        updateSelection(root);
      });
    });

    root.querySelectorAll("[data-volume-tier-index]").forEach(function (tier) {
      tier.addEventListener("click", function () {
        root.querySelectorAll("[data-volume-tier-index]").forEach(function (option) {
          option.classList.toggle("is-selected", option === tier);
        });
        updatePriceSummary(root);
      });
    });

    root.querySelector("[data-visual-bundle-confirm]")?.addEventListener(
      "click",
      function () {
        confirmBundle(root);
      },
    );

    updateSelection(root);
    hydratePrices(root);
  }

  async function loadWidget(root) {
    const productId = root.getAttribute("data-product-id");
    const shop = root.getAttribute("data-shop");

    if (!productId || !shop) {
      root.innerHTML = "";
      return;
    }

    const requestUrl =
      "/apps/visual-bundles?productId=" +
      encodeURIComponent(productId) +
      "&shop=" +
      encodeURIComponent(shop);

    try {
      const response = await fetch(requestUrl, {
        credentials: "same-origin",
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error("Bundle request failed");
      }

      const payload = await response.json();
      const bundle = payload.bundles && payload.bundles[0];

      if (!bundle) {
        root.innerHTML = "";
        return;
      }

      root.innerHTML = bundleMarkup(bundle);
      bindWidget(root);
    } catch {
      root.innerHTML = '<div class="visual-bundle-widget__empty"></div>';
    }
  }

  document.addEventListener("submit", onSubmit, true);
  document.querySelectorAll("[data-visual-bundle]").forEach(loadWidget);
})();
