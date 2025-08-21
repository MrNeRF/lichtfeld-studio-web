import { z, defineCollection } from 'astro:content';

const bountyCollection = defineCollection({
  type: 'content'
});

export const collections = {
  bounty: bountyCollection,
};