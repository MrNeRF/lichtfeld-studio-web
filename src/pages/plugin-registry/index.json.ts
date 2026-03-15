import { getRegistryIndexDocument } from "@/services/plugin-registry-data";

export async function GET() {
  const document = await getRegistryIndexDocument();
  return new Response(JSON.stringify(document, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
