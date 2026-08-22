/**
 * Renders a JSON-LD <script> tag. `<` is escaped so the serialized data can
 * never accidentally close the script tag early (data here is always our
 * own static structured-data objects, never user input, but this is cheap
 * insurance regardless).
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
