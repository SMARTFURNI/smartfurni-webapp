type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

export default function JsonLd({ data }: { data: JsonLdValue }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
