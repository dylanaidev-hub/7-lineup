import type { ReactNode } from "react";
import { contentfulImageUrl, type ContentfulNode } from "./hooks/useContentfulNews";

type AssetMap = Record<string, { url: string; title: string }>;

const renderChildren = (node: ContentfulNode, assets: AssetMap): ReactNode =>
  (node.content ?? []).map((child, index) => renderNode(child, assets, index));

const renderText = (node: ContentfulNode, key: number): ReactNode => {
  let value: ReactNode = node.value ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") value = <strong key={`${key}-bold`}>{value}</strong>;
    if (mark.type === "italic") value = <em key={`${key}-italic`}>{value}</em>;
    if (mark.type === "underline") value = <u key={`${key}-underline`}>{value}</u>;
    if (mark.type === "code") value = <code key={`${key}-code`}>{value}</code>;
  }
  return value;
};

const renderNode = (node: ContentfulNode, assets: AssetMap, key: number): ReactNode => {
  if (node.nodeType === "text") return renderText(node, key);
  const children = renderChildren(node, assets);
  switch (node.nodeType) {
    case "document": return <>{children}</>;
    case "paragraph": return <p key={key}>{children}</p>;
    case "heading-2": return <h2 key={key}>{children}</h2>;
    case "heading-3": return <h3 key={key}>{children}</h3>;
    case "heading-4": return <h4 key={key}>{children}</h4>;
    case "unordered-list": return <ul key={key}>{children}</ul>;
    case "ordered-list": return <ol key={key}>{children}</ol>;
    case "list-item": return <li key={key}>{children}</li>;
    case "blockquote": return <blockquote key={key}>{children}</blockquote>;
    case "hr": return <hr key={key} />;
    case "hyperlink": {
      const uri = node.data?.uri;
      if (!uri) return children;
      const external = /^https?:\/\//.test(uri);
      return <a key={key} href={uri} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
    }
    case "embedded-asset-block": {
      const id = node.data?.target?.sys?.id;
      const asset = id ? assets[id] : undefined;
      if (!asset) return null;
      return <figure key={key}><img src={contentfulImageUrl(asset.url, 1200)} srcSet={`${contentfulImageUrl(asset.url, 640)} 640w, ${contentfulImageUrl(asset.url, 960)} 960w, ${contentfulImageUrl(asset.url, 1200)} 1200w`} sizes="(max-width: 760px) 100vw, 720px" alt={asset.title} width="1200" height="675" loading="lazy" />{asset.title ? <figcaption>{asset.title}</figcaption> : null}</figure>;
    }
    default: return <span key={key}>{children}</span>;
  }
};

export function ContentfulRichText({ document, assets = {} }: { document: ContentfulNode; assets?: AssetMap }) {
  return <>{renderNode(document, assets, 0)}</>;
}
