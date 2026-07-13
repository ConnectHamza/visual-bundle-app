import type { CSSProperties } from "react";

import { bundleTypeFor } from "../lib/bundleTypes";
import type { DiscountTierInput } from "../lib/discountTiers";

type BundlePreviewProduct = {
  productId: string;
  title: string;
  imageUrl?: string;
};

type BundlePreviewProps = {
  title: string;
  products: BundlePreviewProduct[];
  bundleType: string;
  layoutStyle: string;
  volumeScope: string;
  minimumSelections: string;
  maximumSelections: string;
  fbtDiscountValue: string;
  accentColor: string;
  buttonText: string;
  tiers: DiscountTierInput[];
};

const emptyProductSlots = [
  "Select your first product",
  "Select another product",
  "Add more products",
];

function previewProducts(products: BundlePreviewProduct[]) {
  return products.length > 0
    ? products.slice(0, 4)
    : emptyProductSlots.map((slot, index) => ({
        productId: `empty-${index}`,
        title: slot,
      }));
}

function previewTiers(tiers: DiscountTierInput[]) {
  return tiers
    .filter((tier) => {
      return (
        tier.minimumQuantity.trim().length > 0 &&
        tier.discountValue.trim().length > 0
      );
    })
    .sort((first, second) => {
      return Number(first.minimumQuantity) - Number(second.minimumQuantity);
    });
}

function ProductImage({ product }: { product: BundlePreviewProduct }) {
  if (product.imageUrl) {
    return <img className="bundle-preview__image" src={product.imageUrl} alt="" />;
  }

  return <div className="bundle-preview__placeholder" />;
}

function ClassicPreview({
  products,
  layoutClass,
  tiers,
}: {
  products: BundlePreviewProduct[];
  layoutClass: string;
  tiers: DiscountTierInput[];
}) {
  return (
    <>
      <div className={`bundle-preview__products ${layoutClass}`}>
        {products.map((product) => (
          <div className="bundle-preview__product" key={product.productId}>
            <input
              checked={false}
              className="bundle-preview__check"
              readOnly
              type="checkbox"
            />
            <ProductImage product={product} />
            <span className="bundle-preview__product-title">{product.title}</span>
          </div>
        ))}
      </div>
      <TierBadges tiers={tiers} />
      <div className="bundle-preview__hint">Select products, confirm, then add.</div>
    </>
  );
}

function MixMatchPreview({
  products,
  minimumSelections,
  maximumSelections,
  tiers,
}: {
  products: BundlePreviewProduct[];
  minimumSelections: string;
  maximumSelections: string;
  tiers: DiscountTierInput[];
}) {
  const slotCount = Math.max(
    2,
    Math.min(Number(maximumSelections || products.length || 4) || 4, 6),
  );

  return (
    <>
      <div className="bundle-preview__pool">
        {products.map((product, index) => (
          <div className="bundle-preview__pool-card" key={product.productId}>
            <ProductImage product={product} />
            <span className="bundle-preview__product-title">{product.title}</span>
            <span className="bundle-preview__pill">
              {index < Number(minimumSelections || 2) ? "Added" : "Add"}
            </span>
          </div>
        ))}
      </div>
      <div className="bundle-preview__tray">
        {Array.from({ length: slotCount }).map((_, index) => {
          const product = products[index];

          return (
            <div
              className={`bundle-preview__slot ${product ? "is-filled" : ""}`}
              key={index}
            >
              {product ? <ProductImage product={product} /> : "+"}
            </div>
          );
        })}
      </div>
      <TierBadges tiers={tiers} />
      <div className="bundle-preview__hint">
        Build a box with {minimumSelections || "2"}
        {maximumSelections ? `-${maximumSelections}` : "+"} products.
      </div>
    </>
  );
}

function FrequentlyBoughtPreview({
  products,
  fbtDiscountValue,
  label = "Recommended add-on",
}: {
  products: BundlePreviewProduct[];
  fbtDiscountValue: string;
  label?: string;
}) {
  return (
    <>
      <div className="bundle-preview__fbt">
        {products.slice(0, 3).map((product, index) => (
          <div className="bundle-preview__fbt-row" key={product.productId}>
            {index > 0 ? <span className="bundle-preview__plus">+</span> : null}
            <span className="bundle-preview__included" aria-hidden="true" />
            <ProductImage product={product} />
            <div className="bundle-preview__fbt-copy">
              <span className="bundle-preview__product-title">{product.title}</span>
              <small>
                {index === 0
                  ? "Main product"
                  : `${label}, save ${fbtDiscountValue || "10"}%`}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="bundle-preview__tiers">
        <span className="bundle-preview__tier">
          Together discount: save {fbtDiscountValue || "10"}%
        </span>
      </div>
      <div className="bundle-preview__hint">
        Fixed buy-together offer. Customers do not build this set.
      </div>
    </>
  );
}

function FixedBundlePreview({
  products,
  tiers,
}: {
  products: BundlePreviewProduct[];
  tiers: DiscountTierInput[];
}) {
  return (
    <>
      <div className="bundle-preview__products bundle-preview__products--list">
        {products.map((product) => (
          <div className="bundle-preview__product bundle-preview__fixed" key={product.productId}>
            <ProductImage product={product} />
            <span className="bundle-preview__product-title">{product.title}</span>
          </div>
        ))}
      </div>
      <TierBadges tiers={tiers} />
      <div className="bundle-preview__hint">
        Predefined combo. Customers get these products together.
      </div>
    </>
  );
}

function VolumePreview({
  products,
  tiers,
}: {
  products: BundlePreviewProduct[];
  tiers: DiscountTierInput[];
}) {
  const product = products[0];

  return (
    <>
      {product ? (
        <div className="bundle-preview__volume-product">
          <ProductImage product={product} />
          <span className="bundle-preview__product-title">{product.title}</span>
        </div>
      ) : null}
      <div className="bundle-preview__volume-options">
        {previewTiers(tiers).map((tier) => (
          <div className="bundle-preview__volume-tier" key={tier.id}>
            <span>
              Buy {tier.minimumQuantity}+, save {tier.discountValue}%
            </span>
          </div>
        ))}
      </div>
      <div className="bundle-preview__hint">
        Eligible products show this same quantity-tier offer on their own product
        pages.
      </div>
    </>
  );
}

function TierBadges({ tiers }: { tiers: DiscountTierInput[] }) {
  return (
    <div className="bundle-preview__tiers">
      {previewTiers(tiers).map((tier) => (
        <span className="bundle-preview__tier" key={tier.id}>
          Buy {tier.minimumQuantity}+, save {tier.discountValue}%
        </span>
      ))}
    </div>
  );
}

export function BundlePreview({
  title,
  products,
  bundleType,
  layoutStyle,
  minimumSelections,
  maximumSelections,
  fbtDiscountValue,
  accentColor,
  buttonText,
  tiers,
}: BundlePreviewProps) {
  const visibleProducts = previewProducts(products);
  const layoutClass =
    layoutStyle === "cards"
      ? "bundle-preview__products--cards"
      : layoutStyle === "compact"
        ? "bundle-preview__products--compact"
        : "bundle-preview__products--list";
  const selectedBundleType = bundleTypeFor(bundleType);

  return (
    <div
      className="bundle-preview"
      style={
        {
          "--bundle-preview-accent": accentColor,
        } as CSSProperties
      }
    >
      <style>
        {`
          .bundle-preview {
            border: 1px solid #dfe3e8;
            border-radius: 8px;
            max-width: 520px;
            padding: 18px;
          }
          .bundle-preview__title {
            font-size: 18px;
            font-weight: 650;
            line-height: 1.25;
            margin: 0 0 8px;
          }
          .bundle-preview__hint {
            color: #616161;
            font-size: 13px;
            margin-bottom: 10px;
          }
          .bundle-preview__products,
          .bundle-preview__pool,
          .bundle-preview__fbt,
          .bundle-preview__volume-options {
            display: grid;
            gap: 10px;
            margin-bottom: 14px;
          }
          .bundle-preview__products--cards,
          .bundle-preview__pool {
            grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
          }
          .bundle-preview__products--compact {
            grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
          }
          .bundle-preview__product,
          .bundle-preview__pool-card,
          .bundle-preview__volume-product,
          .bundle-preview__fixed {
            align-items: center;
            border-radius: 8px;
            display: flex;
            gap: 10px;
            min-width: 0;
          }
          .bundle-preview__products--cards .bundle-preview__product,
          .bundle-preview__pool-card {
            align-items: flex-start;
            border: 1px solid #dfe3e8;
            flex-direction: column;
            min-height: 150px;
            padding: 12px;
          }
          .bundle-preview__products--compact .bundle-preview__product,
          .bundle-preview__products--list .bundle-preview__product {
            padding: 6px;
          }
          .bundle-preview__products--compact .bundle-preview__product {
            align-items: center;
            border: 1px solid #dfe3e8;
            flex-direction: column;
            padding: 10px;
            text-align: center;
          }
          .bundle-preview__check {
            accent-color: var(--bundle-preview-accent);
            height: 18px;
            margin: 0;
            width: 18px;
          }
          .bundle-preview__image,
          .bundle-preview__placeholder {
            border-radius: 6px;
            height: 48px;
            object-fit: cover;
            width: 48px;
          }
          .bundle-preview__placeholder {
            background: #f1f2f4;
          }
          .bundle-preview__pool-card .bundle-preview__image,
          .bundle-preview__pool-card .bundle-preview__placeholder {
            height: 68px;
            width: 68px;
          }
          .bundle-preview__product-title {
            font-size: 14px;
            line-height: 1.35;
            overflow-wrap: anywhere;
          }
          .bundle-preview__tiers {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 14px;
          }
          .bundle-preview__tier,
          .bundle-preview__pill {
            background: color-mix(in srgb, var(--bundle-preview-accent) 12%, white);
            border: 1px solid color-mix(in srgb, var(--bundle-preview-accent) 18%, white);
            border-radius: 999px;
            color: var(--bundle-preview-accent);
            font-size: 13px;
            font-weight: 600;
            padding: 6px 10px;
          }
          .bundle-preview__pill {
            margin-top: auto;
            text-align: center;
            width: 100%;
          }
          .bundle-preview__tray {
            align-items: center;
            background: color-mix(in srgb, var(--bundle-preview-accent) 7%, white);
            border: 1px dashed color-mix(in srgb, var(--bundle-preview-accent) 35%, white);
            border-radius: 8px;
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
            margin-bottom: 14px;
            padding: 10px;
          }
          .bundle-preview__slot {
            align-items: center;
            aspect-ratio: 1;
            background: white;
            border: 1px dashed #c9cccf;
            border-radius: 6px;
            color: #6d7175;
            display: flex;
            font-size: 22px;
            justify-content: center;
            overflow: hidden;
          }
          .bundle-preview__slot.is-filled {
            border-style: solid;
          }
          .bundle-preview__slot .bundle-preview__image {
            height: 100%;
            width: 100%;
          }
          .bundle-preview__fbt-row {
            align-items: center;
            border: 1px solid #dfe3e8;
            border-radius: 8px;
            display: grid;
            gap: 8px;
            grid-template-columns: 18px 18px 44px minmax(0, 1fr);
            min-height: 66px;
            padding: 8px;
          }
          .bundle-preview__fbt-row:first-child {
            grid-template-columns: 18px 44px minmax(0, 1fr);
          }
          .bundle-preview__included,
          .bundle-preview__plus {
            align-items: center;
            border-radius: 999px;
            display: inline-flex;
            font-size: 0;
            font-weight: 700;
            height: 18px;
            justify-content: center;
            width: 18px;
          }
          .bundle-preview__included {
            background: color-mix(in srgb, var(--bundle-preview-accent) 16%, white);
            border: 1px solid color-mix(in srgb, var(--bundle-preview-accent) 45%, white);
            color: var(--bundle-preview-accent);
          }
          .bundle-preview__included::after {
            background: var(--bundle-preview-accent);
            border-radius: 50%;
            content: "";
            display: block;
            height: 7px;
            width: 7px;
          }
          .bundle-preview__plus {
            background: var(--bundle-preview-accent);
            color: white;
            font-size: 13px;
          }
          .bundle-preview__fbt-copy {
            display: grid;
            gap: 3px;
            min-width: 0;
          }
          .bundle-preview__fbt-copy small {
            color: #616161;
            font-size: 12px;
          }
          .bundle-preview__volume-product {
            margin-bottom: 12px;
          }
          .bundle-preview__volume-tier {
            align-items: center;
            background: white;
            border: 1px solid #dfe3e8;
            border-radius: 8px;
            display: flex;
            font-size: 14px;
            font-weight: 650;
            justify-content: space-between;
            min-height: 54px;
            padding: 10px 12px;
          }
          .bundle-preview__volume-tier:first-child {
            background: color-mix(in srgb, var(--bundle-preview-accent) 8%, white);
            box-shadow: inset 0 0 0 1px var(--bundle-preview-accent);
          }
          .bundle-preview__button {
            background: var(--bundle-preview-accent);
            border: 1px solid var(--bundle-preview-accent);
            border-radius: 2px;
            color: white;
            font: inherit;
            font-size: 14px;
            font-weight: 650;
            min-height: 44px;
            padding: 11px 16px;
            width: 100%;
          }
        `}
      </style>

      <h3 className="bundle-preview__title">
        {title.trim() || "Bundle preview"}
      </h3>
      <p className="bundle-preview__hint">{selectedBundleType.storefrontHint}</p>

      {bundleType === "frequently_bought_together" ||
      bundleType === "cross_sell" ? (
        <FrequentlyBoughtPreview
          products={visibleProducts}
          fbtDiscountValue={fbtDiscountValue}
          label={bundleType === "cross_sell" ? "Cross-sell add-on" : undefined}
        />
      ) : bundleType === "bogo" || bundleType === "buy_x_get_y" ? (
        <FrequentlyBoughtPreview
          products={visibleProducts}
          fbtDiscountValue={fbtDiscountValue}
          label={bundleType === "bogo" ? "Reward item" : "Reward product"}
        />
      ) : bundleType === "fixed_bundle" ? (
        <FixedBundlePreview products={visibleProducts} tiers={tiers} />
      ) : bundleType === "volume_discount" ||
        bundleType === "quantity_breaks" ||
        bundleType === "mystery_box" ? (
        <VolumePreview products={visibleProducts} tiers={tiers} />
      ) : bundleType === "mix_match" ||
        bundleType === "tiered_mix_match" ||
        bundleType === "build_box_limited" ||
        bundleType === "build_box_unlimited" ||
        bundleType === "collection_bundle" ? (
        <MixMatchPreview
          products={visibleProducts}
          minimumSelections={minimumSelections}
          maximumSelections={maximumSelections}
          tiers={tiers}
        />
      ) : (
        <ClassicPreview
          products={visibleProducts}
          layoutClass={layoutClass}
          tiers={tiers}
        />
      )}

      <button className="bundle-preview__button" type="button">
        {buttonText.trim() || "Add bundle"}
      </button>
    </div>
  );
}
