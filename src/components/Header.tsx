import { getContent } from "@/lib/content";
import { logoFor } from "@/lib/content-types";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const { site, header, images } = await getContent();
  return (
    <HeaderNav name={site.name} phone={site.phone} header={header} logo={logoFor(images, "header")} />
  );
}
