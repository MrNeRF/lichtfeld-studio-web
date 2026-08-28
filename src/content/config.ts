import { z, defineCollection } from "astro:content";

const bountyCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    deadline: z.date().optional(),
    summary: z.string(),
    winner: z.string().default("").optional(),
  }),
});

const pluginCollection = defineCollection({
  type: "data",
  schema: z.object({
    id: z.string(),
    namespace: z.string(),
    name: z.string(),
    displayName: z.string(),
    summary: z.string(),
    description: z.string(),
    author: z.string(),
    latestVersion: z.string(),
    lichtfeldVersion: z.string(),
    pluginApi: z.string(),
    requiredFeatures: z.array(z.string()).default([]),
    downloads: z.number().int().nonnegative().default(0),
    keywords: z.array(z.string()).default([]),
    repository: z.string().url(),
    featured: z.boolean().optional(),
    versions: z
      .array(
        z.object({
          version: z.string(),
          pluginApi: z.string(),
          lichtfeldVersion: z.string(),
          requiredFeatures: z.array(z.string()).default([]),
          dependencies: z.array(z.string()).default([]),
          gitRef: z.string().optional(),
          downloadUrl: z.string().url().optional(),
          checksum: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

const docsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
  }),
});

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    summary: z.string(),
    date: z.date(),
    updatedDate: z.date().optional(),
    author: z.string().default("LichtFeld Studio"),
    category: z.string().default("Updates"),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    /** Set false when the post body opens with its own media (e.g. a video
     *  embed) so the header image is not shown twice. The image is still
     *  used for list thumbnails and social previews. */
    showHeroImage: z.boolean().default(true),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  bounty: bountyCollection,
  plugins: pluginCollection,
  docs: docsCollection,
  blog: blogCollection,
};
