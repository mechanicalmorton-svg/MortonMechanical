import { getContent } from "@/lib/content";
import { HeaderNav } from "./HeaderNav";

export async function Header() {
  const { site, header } = await getContent();
  return <HeaderNav name={site.name} phone={site.phone} header={header} />;
}
