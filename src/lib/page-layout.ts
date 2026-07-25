import {
  BUILT_IN_SECTION_LABELS,
  DEFAULT_PAGE_SECTIONS,
  type BuiltInSectionId,
  type CustomBlock,
  type PageSectionEntry,
  type SectionAlign,
  type SiteContent,
} from "./content-types";

export function isBuiltInSectionId(id: string): id is BuiltInSectionId {
  return id in BUILT_IN_SECTION_LABELS;
}

export function isCustomSectionId(id: string) {
  return id.startsWith("custom:");
}

export function customBlockIdFromSection(sectionId: string) {
  return sectionId.replace(/^custom:/, "");
}

export function sectionIdForCustomBlock(blockId: string) {
  return `custom:${blockId}`;
}

export function sectionLabel(content: SiteContent, sectionId: string) {
  if (isBuiltInSectionId(sectionId)) return BUILT_IN_SECTION_LABELS[sectionId];
  if (isCustomSectionId(sectionId)) {
    const block = content.customBlocks.find((b) => b.id === customBlockIdFromSection(sectionId));
    return block?.title?.trim() || "Custom section";
  }
  return sectionId;
}

export function normalizePageLayout(content: SiteContent): SiteContent {
  const byId = new Map(content.pageLayout.sections.map((s) => [s.id, s]));
  const next: PageSectionEntry[] = [];

  // Keep stored order first.
  for (const entry of content.pageLayout.sections) {
    if (isBuiltInSectionId(entry.id) || isCustomSectionId(entry.id)) {
      next.push({
        id: entry.id,
        enabled: entry.enabled !== false,
        align: normalizeAlign(entry.align),
      });
    }
  }

  // Ensure every built-in section exists.
  for (const def of DEFAULT_PAGE_SECTIONS) {
    if (!next.some((s) => s.id === def.id)) {
      next.push({ ...def });
    }
  }

  // Ensure every custom block has a layout entry.
  for (const block of content.customBlocks) {
    const sid = sectionIdForCustomBlock(block.id);
    if (!next.some((s) => s.id === sid)) {
      next.push({ id: sid, enabled: true, align: "left" });
    }
  }

  // Drop layout rows for deleted custom blocks.
  content.pageLayout.sections = next.filter(
    (s) => isBuiltInSectionId(s.id) || content.customBlocks.some((b) => sectionIdForCustomBlock(b.id) === s.id),
  );

  return content;
}

function normalizeAlign(align: unknown): SectionAlign {
  if (align === "center" || align === "right" || align === "left") return align;
  return "left";
}

export function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function createCustomBlock(): CustomBlock {
  const id = `block-${Date.now().toString(36)}`;
  return {
    id,
    title: "New section",
    body: "Write your content here. This section appears on the homepage where you place it in Page layout.",
    imageUrl: "",
    buttonText: "",
    buttonHref: "/contact",
  };
}

export function alignClass(align: SectionAlign) {
  if (align === "center") return "text-center items-center";
  if (align === "right") return "text-right items-end";
  return "text-left items-start";
}
