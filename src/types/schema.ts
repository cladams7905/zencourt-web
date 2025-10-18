/**
 * DB Entity Types
 */
import { projects, images, templates, generatedContent } from "@/db/schema";

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
export type GeneratedContent = typeof generatedContent.$inferSelect;
export type NewGeneratedContent = typeof generatedContent.$inferInsert;
