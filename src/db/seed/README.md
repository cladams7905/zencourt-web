# Template Seed Data

This directory contains seed data for the content template marketplace.

## Overview

The seed data includes **20 diverse templates** covering all content types and major social media platforms:

- **7 Video Templates** (4 free, 3 premium)
- **8 Post Templates** (5 free, 3 premium)
- **5 Flyer Templates** (3 free, 2 premium)

## Files

- **`templates.ts`** - Template seed data and utility functions
- **`seed-templates.ts`** - Seeding script to populate the database
- **`README.md`** - This file

## Running the Seed Script

### Quick Start

```bash
npm run db:seed:templates
```

### Manual Execution

```bash
npx tsx src/db/seed/seed-templates.ts
```

## What the Script Does

1. **Checks existing data** - Identifies templates already in the database
2. **Inserts new templates** - Adds templates that don't exist
3. **Updates existing templates** - Updates templates with the same ID
4. **Provides statistics** - Shows counts and details of the seeding process

## Seed Data Details

### Template Distribution

| Content Type | Free | Premium | Total |
|--------------|------|---------|-------|
| Videos       | 4    | 3       | 7     |
| Posts        | 5    | 3       | 8     |
| Flyers       | 3    | 2       | 5     |
| **Total**    | 12   | 8       | 20    |

### Platform Coverage

- **Instagram**: Reels, Posts, Stories
- **TikTok**: Short-form videos
- **Facebook**: Posts, Stories
- **YouTube**: Full videos, Shorts
- **LinkedIn**: Professional posts
- **Print**: Flyers and brochures

### Required Categories

Templates require various room categories to generate content:
- `living_room`
- `kitchen`
- `bedroom`
- `bathroom`
- `exterior`

## Using the Seed Data

### Import in Code

```typescript
import { seedTemplates, getTemplateStats } from '@/db/seed/templates';

// Get all templates
const allTemplates = seedTemplates;

// Get statistics
const stats = getTemplateStats();
console.log(stats);
// {
//   total: 20,
//   free: 12,
//   premium: 8,
//   byType: { video: 7, post: 8, flyer: 5 }
// }

// Filter templates
import { getFreeTemplates, getPremiumTemplates } from '@/db/seed/templates';

const freeTemplates = getFreeTemplates();
const premiumTemplates = getPremiumTemplates();
```

### Customizing Templates

To add or modify templates, edit `templates.ts`:

1. Add new template objects to the `seedTemplates` array
2. Follow the existing structure and include all required fields
3. Use Unsplash URLs for preview images (or your own CDN)
4. Assign realistic usage counts for testing
5. Run the seed script to update the database

### Template ID Format

Template IDs follow the pattern: `template_{type}_{name}_{number}`

Examples:
- `template_video_modern_tour_001`
- `template_post_feature_highlight_001`
- `template_flyer_classic_listing_001`

## Important Notes

- The script is **idempotent** - you can run it multiple times safely
- Existing templates with the same ID will be **updated** (not duplicated)
- Preview images use Unsplash URLs (free to use)
- All templates include realistic usage statistics
- Premium templates require `isPremium: true`

## Verification

After running the seed script:

1. **Check Drizzle Studio**: `npm run db:studio`
2. **Visit**: https://local.drizzle.studio
3. **Navigate to**: `templates` table
4. **Verify**: 20 templates are present

## Troubleshooting

### Error: Cannot find module '@/db'

Make sure you're running the script from the project root:
```bash
cd /path/to/zencourt-web
npm run db:seed:templates
```

### Error: Database connection failed

Check your `.env` file for the correct `DATABASE_URL`:
```bash
DATABASE_URL=postgresql://...
```

### Templates not appearing

1. Verify the database schema is up to date: `npm run db:push`
2. Check Drizzle Studio to confirm tables exist
3. Review the seed script output for errors

## Next Steps

After seeding:

1. **Verify data** in Drizzle Studio
2. **Test queries** with the server actions (Task 5)
3. **Create UI components** to display templates (Tasks 12-22)
4. **Add more templates** as needed for your marketplace
