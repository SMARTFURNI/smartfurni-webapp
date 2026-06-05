import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LandingPageAdminRedirect({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  query.set("edit", "1");

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (key === "edit" || key === "admin") continue;
    const normalizedValue = firstValue(value);
    if (normalizedValue !== undefined) query.set(key, normalizedValue);
  }

  redirect(`/lp/${encodeURIComponent(slug)}?${query.toString()}`);
}
