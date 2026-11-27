import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const siteLastModified = new Date("2026-11-27T00:00:00.000Z");
const baseUrl = "https://supportmargin.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/gorgias-cost-calculator",
    "/blog",
    "/about",
    "/affiliate-disclosure",
    "/privacy-policy",
    "/contact",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: siteLastModified,
    changeFrequency: (route === "/" ? "weekly" : "monthly") as
      | "weekly"
      | "monthly",
    priority: route === "/" ? 1 : route === "/gorgias-cost-calculator" ? 0.9 : 0.6,
  }));

  const postRoutes: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
