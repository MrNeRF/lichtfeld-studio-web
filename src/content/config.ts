import { z, defineCollection } from 'astro:content';

const bountyCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    deadline: z.date().optional(),
    summary: z.string(),
    winner: z.string().default('').optional()
  })
});

export const collections = {
  bounty: bountyCollection,
};
