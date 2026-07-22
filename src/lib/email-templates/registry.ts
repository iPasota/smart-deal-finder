import type { ComponentType } from "react";
import { template as dbTemplate } from "./db-template";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  to?: string;
}

// All app emails render through `db-template`, which injects pre-rendered
// HTML (built from the admin-editable `email_templates` table) into a
// React Email shell. Callers pass templateData = { __subject, __html }.
export const TEMPLATES: Record<string, TemplateEntry> = {
  "db-template": dbTemplate,
};
