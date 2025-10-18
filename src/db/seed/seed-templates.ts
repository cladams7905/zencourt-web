/**
 * Seed Script for Templates
 *
 * Run this script to populate the database with initial template data
 * Usage: npx tsx src/db/seed/seed-templates.ts
 */

import { db } from "@/db";
import { templates } from "@/db/schema";
import { seedTemplates, getTemplateStats } from "./templates";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  try {
    console.log("🌱 Starting template seeding process...\n");

    const stats = getTemplateStats();
    console.log("📊 Seed Data Statistics:");
    console.log(`   Total templates: ${stats.total}`);
    console.log(`   Free templates: ${stats.free}`);
    console.log(`   Premium templates: ${stats.premium}`);
    console.log(`   Videos: ${stats.byType.video}`);
    console.log(`   Posts: ${stats.byType.post}`);
    console.log(`   Flyers: ${stats.byType.flyer}\n`);

    // Check for existing templates
    const existingTemplates = await db.select().from(templates);

    if (existingTemplates.length > 0) {
      console.log(`⚠️  Found ${existingTemplates.length} existing templates in database`);
      console.log("   This will replace existing templates with the same IDs\n");
    }

    // Insert or update templates
    let insertedCount = 0;
    let updatedCount = 0;

    for (const template of seedTemplates) {
      try {
        // Check if template exists
        const existing = await db
          .select()
          .from(templates)
          .where(eq(templates.id, template.id));

        if (existing.length > 0) {
          // Update existing template
          await db
            .update(templates)
            .set({
              ...template,
              updatedAt: new Date()
            })
            .where(eq(templates.id, template.id));
          updatedCount++;
          console.log(`   ✓ Updated: ${template.title}`);
        } else {
          // Insert new template
          await db.insert(templates).values(template);
          insertedCount++;
          console.log(`   ✓ Inserted: ${template.title}`);
        }
      } catch (error) {
        console.error(`   ✗ Failed to process ${template.title}:`, error);
      }
    }

    console.log("\n✅ Seeding complete!");
    console.log(`   Inserted: ${insertedCount} templates`);
    console.log(`   Updated: ${updatedCount} templates`);
    console.log(`   Total in database: ${insertedCount + updatedCount} templates\n`);

    // Verify the data
    const finalCount = await db.select().from(templates);
    console.log(`📋 Database now contains ${finalCount.length} templates total`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();
