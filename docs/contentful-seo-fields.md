# Contentful SEO fields

Content model `lineupFootball` supports these optional fields in the frontend:

- `excerpt`: Long text, used on news cards and as a fallback meta description.
- `seoTitle`: Short text, recommended maximum 60 characters.
- `seoDescription`: Long text, recommended maximum 160 characters.

The existing required fields remain `title`, `slug`, and `content`. Entries without
all three required fields are excluded from prerendering and the sitemap. The build
uses `sys.updatedAt` for the article `dateModified` value and sitemap `lastmod`.

These fields must be added in Contentful's model editor because the Content Delivery
API token used by this project is read-only and cannot modify a content model.
