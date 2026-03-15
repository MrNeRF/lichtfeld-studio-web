import type { GetStaticPaths } from "astro";
import { getRegistryDetailDocuments } from "@/services/plugin-registry-data";

export const getStaticPaths: GetStaticPaths = async () => {
  const documents = await getRegistryDetailDocuments();

  return documents.map((document) => ({
    params: {
      namespace: document.namespace,
      name: document.name,
    },
    props: {
      document,
    },
  }));
};

export async function GET({ props }: { props: { document: Awaited<ReturnType<typeof getRegistryDetailDocuments>>[number] } }) {
  return new Response(JSON.stringify(props.document, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
