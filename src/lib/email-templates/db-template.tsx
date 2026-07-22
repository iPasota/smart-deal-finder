import * as React from "react";
import { Body, Container, Head, Html, Preview } from "@react-email/components";
import type { TemplateEntry } from "./registry";

// A single React Email wrapper for admin-editable HTML bodies stored in
// the `email_templates` table. The transactional send route pre-renders
// placeholders in the DB body and passes the final HTML in as __html.
interface Props {
  __subject?: string;
  __html?: string;
  __preview?: string;
}

const DbEmail = ({ __html = "", __preview = "" }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>{__preview}</Preview>
    <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }}>
      <Container style={{ padding: "24px 24px", maxWidth: 640, color: "#111827", lineHeight: 1.55 }}>
        <div dangerouslySetInnerHTML={{ __html }} />
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: DbEmail,
  subject: (data: Record<string, any>) => (data?.__subject as string) || "whdfinder",
  displayName: "DB-backed template",
  previewData: { __subject: "Preview", __html: "<p>Preview</p>" },
} satisfies TemplateEntry;
