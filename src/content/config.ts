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
    versions: z.array(z.object({
      version: z.string(),
      pluginApi: z.string(),
      lichtfeldVersion: z.string(),
      requiredFeatures: z.array(z.string()).default([]),
      dependencies: z.array(z.string()).default([]),
      gitRef: z.string().optional(),
      downloadUrl: z.string().url().optional(),
      checksum: z.string().optional(),
    })).default([]),
  }),
});

export const collections = {
  bounty: bountyCollection,
  plugins: pluginCollection,
};
