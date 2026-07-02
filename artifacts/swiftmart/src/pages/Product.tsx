import { useState } from "react";
import { useRoute } from "wouter";
import { SEO } from "@/components/SEO";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/lib/currency";
import { QuantityStepper } from "@/components/QuantityStepper";
import { WeightStepper } from "@/components/WeightStepper";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";
import { SectionHeader } from "@/components/SectionHeader";
import { categories } from "@/data/categories";
import { cartKey } from "@/context/CartContext";
import { parseUnit, weightPresets, priceForWeight, formatWeight } from "@/lib/weightUtils";

const COLOR_HEX: Record<string, string> = {
  Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e", Yellow: "#eab308",
  Black: "#1a1a1a", White: "#f3f4f6", Pink: "#ec4899", Purple: "#a855f7",
  Orange: "#f97316", Navy: "#1e3a5f", Gray: "#6b7280", Grey: "#6b7280",
  Brown: "#92400e", Maroon: "#800000",
};

export default function Product() {
  const [, params] = useRoute("/product/:id");
  const id = params?.id;
  const { products } = useProducts();
  const { items, addToCart, updateQty, updateWeight } = useCart();

  const product = products.find(p => p.id === id);

  const allImages = product?.images?.filter(Boolean) ?? (product?.image ? [product.image] : []);
  const hasColors = (product?.colors?.length ?? 0) > 0;
  const hasSizes = (product?.sizes?.length ?? 0) > 0;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showVariantError, setShowVariantError] = useState(false);

  if (!product) return <div className="p-8 text-center">Product not found</div>;

  const productSeo = {
    title: product.name,
    description: product.description
      ? `${product.description.substring(0, 140)}… Buy ${product.name} from local shops in Balurghat on SwiftMart.`
      : `Buy ${product.name} from local shops in Balurghat on SwiftMart. Fast 10-minute delivery.`,
    image: product.image && !product.image.includes("placeholder") ? product.image : undefined,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.description || `${product.name} available on SwiftMart Balurghat`,
      "image": product.image,
      "offers": {
        "@type": "Offer",
        "price": product.discountedPrice ?? product.price,
        "priceCurrency": "INR",
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "SwiftMart" }
      }
    }
  };

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const category = categories.find(c => c.id === product.category);
  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  const displayImage = selectedColor && product.colorImages?.[selectedColor]
    ? product.colorImages[selectedColor]
    : allImages[activeImageIndex] ?? product.image;

  // Weight-based unit detection
  const unitInfo = parseUnit(product.unit);
  const isWeightBased = !hasColors && !hasSizes && unitInfo.type === "weight";
  const baseGrams = isWeightBased && unitInfo.type === "weight" ? unitInfo.baseGrams : 1000;
  const maxGrams = product.stock > 0 ? product.stock * baseGrams : undefined;
  const weightPresetList = weightPresets(maxGrams);

  const handleColorSelect = (color: string) => {
    setSelectedColor(prev => prev === color ? null : color);
    setShowVariantError(false);
    if (product.colorImages?.[color]) {
      const idx = allImages.indexOf(product.colorImages[color]);
      if (idx >= 0) setActiveImageIndex(idx);
    }
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(prev => prev === size ? null : size);
    setShowVariantError(false);
  };

  const variantSelectionValid = () => {
    if (hasColors && !selectedColor) return false;
    if (hasSizes && !selectedSize) return false;
    return true;
  };

  const itemKey = cartKey(
    product.id,
    hasColors ? selectedColor : undefined,
    hasSizes ? selectedSize : undefined,
  );
  const cartItem = items.find(
    item => cartKey(item.product.id, item.selectedColor, item.selectedSize) === itemKey
  );
  const qty = cartItem?.qty || 0;
  const selectedGrams = cartItem?.selectedGrams;

  const effectivePrice = product.discountedPrice && product.discountedPrice < product.price
    ? product.discountedPrice : product.price;
  const displayPrice = isWeightBased && selectedGrams
    ? priceForWeight(effectivePrice, baseGrams, selectedGrams)
    : effectivePrice;

  const handleAddToCart = () => {
    if (!variantSelectionValid()) {
      setShowVariantError(true);
      return;
    }
    if (isWeightBased) {
      const defaultGrams = weightPresetList[1] ?? weightPresetList[0];
      addToCart(product, 1, undefined, undefined, defaultGrams);
    } else {
      addToCart(
        product,
        1,
        hasColors ? selectedColor ?? undefined : undefined,
        hasSizes ? selectedSize ?? undefined : undefined,
      );
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto space-y-8">
      <SEO
        title={productSeo.title}
        description={productSeo.description}
        canonical={`/product/${id}`}
        ogImage={productSeo.image}
        ogType="product"
        jsonLd={productSeo.jsonLd}
      />
      <div className="flex flex-col md:flex-row gap-8">
        {/* Image Gallery */}
        <div className="w-full md:w-1/2 space-y-3">
          <div className="aspect-square rounded-3xl bg-card neu-card p-2 flex items-center justify-center relative overflow-hidden group">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${category?.color || 'var(--primary)'}, transparent)` }}
            />
            <img
              src={displayImage}
              alt={product.name}
              className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setActiveImageIndex(idx); setSelectedColor(null); }}
                  className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all
                    ${activeImageIndex === idx && !selectedColor ? "border-primary" : "border-transparent opacity-60 hover:opacity-90"}`}
                >
                  <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="text-sm font-medium text-muted-foreground mb-2">{category?.name}</div>
          <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-2">{product.name}</h1>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1 bg-background neu-inset px-2 py-1 rounded-md text-sm font-bold">
              <Star className="w-4 h-4 text-primary fill-primary" />
              {product.rating}
            </div>
            <div className="text-muted-foreground text-sm font-medium bg-background neu-inset px-2 py-1 rounded-md">
              {product.unit}
            </div>
          </div>

          <div className="flex items-end gap-3 mb-4">
            <div className="text-3xl font-bold text-primary">
              {formatINR(displayPrice)}
            </div>
            {isWeightBased && selectedGrams ? (
              <div className="text-sm text-muted-foreground mb-1">
                {formatWeight(selectedGrams)} · {formatINR(effectivePrice)}/{formatWeight(baseGrams)}
              </div>
            ) : product.discountedPrice && product.discountedPrice < product.price ? (
              <>
                <div className="text-lg text-muted-foreground line-through mb-0.5">
                  {formatINR(product.price)}
                </div>
                <div className="mb-0.5 bg-green-500/15 text-green-600 text-sm font-bold px-2 py-0.5 rounded-full">
                  {Math.round((1 - product.discountedPrice / product.price) * 100)}% off
                </div>
              </>
            ) : null}
          </div>

          {/* Color selector */}
          {hasColors && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Color</span>
                {selectedColor
                  ? <span className="text-sm text-muted-foreground">— {selectedColor}</span>
                  : <span className="text-sm text-destructive font-medium">— select one</span>
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {product.colors!.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    title={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm hover:scale-110
                      ${selectedColor === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"}`}
                    style={{ backgroundColor: COLOR_HEX[color] ?? "#888" }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          {hasSizes && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Size</span>
                {selectedSize
                  ? <span className="text-sm text-muted-foreground">— {selectedSize}</span>
                  : <span className="text-sm text-destructive font-medium">— select one</span>
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes!.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSizeSelect(size)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all
                      ${selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/60"}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showVariantError && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/30 mb-4">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-sm font-semibold text-destructive">
                Please select {[hasColors && !selectedColor ? "a color" : null, hasSizes && !selectedSize ? "a size" : null].filter(Boolean).join(" and ")} before adding to cart.
              </span>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-bold mb-2">Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {product.description || "Premium quality product guaranteed by SwiftMart."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card neu-card p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background neu-inset flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm font-medium leading-tight">10 MIN<br/>DELIVERY</div>
            </div>
            <div className="bg-card neu-card p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background neu-inset flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="text-sm font-medium leading-tight">QUALITY<br/>ASSURED</div>
            </div>
          </div>

          {isLowStock && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Only {product.stock} left in stock — order soon!
              </span>
            </div>
          )}

          <div className="mt-auto">
            {isOutOfStock ? (
              <Button size="lg" disabled
                className="w-full md:w-auto rounded-full text-lg font-bold shadow-none h-14 px-12 opacity-50 cursor-not-allowed">
                Out of Stock
              </Button>
            ) : isWeightBased ? (
              selectedGrams ? (
                <div className="flex items-center gap-4">
                  <WeightStepper
                    selectedGrams={selectedGrams}
                    presets={weightPresetList}
                    maxGrams={maxGrams}
                    onChange={(grams) => updateWeight(itemKey, grams)}
                  />
                  <div className="text-sm text-muted-foreground font-medium">
                    {formatWeight(selectedGrams)} added to cart
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground">Select quantity:</div>
                  <div className="flex flex-wrap gap-2">
                    {weightPresetList.map(grams => (
                      <button
                        key={grams}
                        type="button"
                        onClick={() => addToCart(product, 1, undefined, undefined, grams)}
                        className="px-4 py-2 rounded-full text-sm font-bold border-2 border-primary/30 bg-background hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all neu-card"
                      >
                        {formatWeight(grams)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : qty > 0 ? (
              <div className="flex items-center gap-4">
                <QuantityStepper qty={qty} maxQty={product.stock} onChange={(newQty) => updateQty(itemKey, newQty)} />
                <div className="text-sm text-muted-foreground font-medium">
                  {selectedColor && <span className="font-semibold">{selectedColor}</span>}
                  {selectedColor && selectedSize && " · "}
                  {selectedSize && <span className="font-semibold">{selectedSize}</span>}
                  {(selectedColor || selectedSize) ? " added" : "Added to cart"}
                </div>
              </div>
            ) : (
              <Button size="lg"
                className="w-full md:w-auto rounded-full text-lg font-bold shadow-none neu-card h-14 px-12"
                onClick={handleAddToCart}>
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="pt-8">
          <SectionHeader title="Similar Products" />
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </div>
  );
}
