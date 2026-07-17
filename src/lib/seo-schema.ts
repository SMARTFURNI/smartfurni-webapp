import type { BlogPost } from "./blog-data";
import type { Product } from "./product-store";
import type { ProductFamilyDefinition } from "./product-families";
import { absoluteUrl, SITE_URL } from "./site-url";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "SmartFurni",
    url: SITE_URL,
    logo: absoluteUrl("/smartfurni-logo-transparent.png"),
    email: "info@smartfurni.vn",
    telephone: "+84-28-7122-0818",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+84-28-7122-0818",
      contactType: "customer service",
      areaServed: "VN",
      availableLanguage: ["vi"],
    },
    sameAs: ["https://www.youtube.com/@SmartFurni"],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: "SmartFurni",
    inLanguage: "vi-VN",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function productCategoryNavigationSchema(families: ProductFamilyDefinition[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/products#categories`,
    name: "Danh mục sản phẩm SmartFurni",
    numberOfItems: families.length,
    itemListElement: families.map((family, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: family.label,
      url: absoluteUrl(`/products/${family.slug}`),
      image: absoluteUrl(family.seoImage),
    })),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function availabilityFor(product: Product) {
  if (product.status === "active") return "https://schema.org/InStock";
  if (product.status === "out_of_stock") return "https://schema.org/OutOfStock";
  if (product.status === "coming_soon") return "https://schema.org/PreOrder";
  return "https://schema.org/Discontinued";
}

export function productSchema(product: Product) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description,
    url,
    image: (product.images.length ? product.images : product.coverImage ? [product.coverImage] : []).map(absoluteUrl),
    sku: product.variants[0]?.sku || product.slug,
    brand: { "@type": "Brand", name: "SmartFurni" },
    category: product.productFamily || product.category,
    additionalProperty: product.purchaseOptions?.map((option) => ({
      "@type": "PropertyValue",
      name: "Cấu hình mua hàng",
      value: `${option.name}: ${option.description}`,
    })),
  };

  if (product.price > 0) {
    const pricedOptions = product.purchaseOptions?.filter((option) => typeof option.price === "number") || [];
    schema.offers = pricedOptions.length
      ? pricedOptions.map((option) => ({
          "@type": "Offer",
          name: option.name,
          url,
          sku: `${product.variants[0]?.sku || product.slug}-${option.skuSuffix}`,
          priceCurrency: "VND",
          price: option.price,
          availability: availabilityFor(product),
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": ORGANIZATION_ID },
        }))
      : {
          "@type": "Offer",
          url,
          priceCurrency: "VND",
          price: product.price,
          availability: availabilityFor(product),
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": ORGANIZATION_ID },
        };
  }

  if (product.rating > 0 && product.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (product.reviews.length) {
    schema.review = product.reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.userName },
      datePublished: review.date,
      reviewBody: review.comment,
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    }));
  }

  return schema;
}

export function collectionSchema(family: ProductFamilyDefinition, products: Product[]) {
  const url = absoluteUrl(`/products/${family.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: family.title,
    description: family.description,
    url,
    inLanguage: "vi-VN",
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/products/${product.slug}`),
        name: product.name,
      })),
    },
  };
}

export function faqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function articleSchema(post: BlogPost) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [absoluteUrl(post.coverImage)] : undefined,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(post.publishedAt).toISOString(),
    inLanguage: "vi-VN",
    mainEntityOfPage: url,
    author: { "@type": "Person", name: post.author },
    publisher: { "@id": ORGANIZATION_ID },
  };
}
