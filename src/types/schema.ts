/**
 * DB Entity Types
 */
import { projects, images } from "@/db/schema";

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
