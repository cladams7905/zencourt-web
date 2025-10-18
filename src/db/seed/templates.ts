/**
 * Template Seed Data
 *
 * Sample templates for the content marketplace with a mix of free and premium templates
 * covering all content types (video, post, flyer) and major platforms.
 */

import { NewTemplate } from "@/types/schema";
import { Platform, ContentType } from "@/types/templates";

/**
 * Seed templates for the marketplace
 * Includes 20 templates: 12 free, 8 premium
 */
export const seedTemplates: NewTemplate[] = [
  // ============================================================================
  // VIDEO TEMPLATES (7 templates: 4 free, 3 premium)
  // ============================================================================
  {
    id: "template_video_modern_tour_001",
    title: "Modern Property Tour",
    description:
      "Sleek, fast-paced video showcasing modern properties with dynamic transitions and ambient music. Perfect for contemporary homes and apartments.",
    contentType: "video" as ContentType,
    platforms: [
      "instagram-reel",
      "tiktok",
      "youtube-short",
      "facebook-post"
    ] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"
    ],
    isPremium: false,
    requiredCategories: ["living_room", "kitchen", "bedroom"],
    tags: ["modern", "contemporary", "fast-paced", "music"],
    usageCount: 245,
    usageCount30Days: 67
  },
  {
    id: "template_video_luxury_showcase_002",
    title: "Luxury Estate Showcase",
    description:
      "Premium cinematic video template highlighting luxury estates with slow pans, elegant transitions, and sophisticated styling. Includes property details overlay.",
    contentType: "video" as ContentType,
    platforms: [
      "instagram-reel",
      "youtube",
      "linkedin",
      "facebook-post"
    ] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
    ],
    isPremium: true,
    requiredCategories: ["living_room", "kitchen", "bedroom", "exterior"],
    tags: ["luxury", "cinematic", "elegant", "premium"],
    usageCount: 189,
    usageCount30Days: 52
  },
  {
    id: "template_video_quick_walkthrough_003",
    title: "Quick Walkthrough",
    description:
      "15-second rapid property walkthrough perfect for social media. Shows room flow with quick cuts and energetic background music.",
    contentType: "video" as ContentType,
    platforms: ["instagram-reel", "tiktok", "instagram-story"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["living_room", "kitchen"],
    tags: ["quick", "social", "energetic", "short"],
    usageCount: 412,
    usageCount30Days: 98
  },
  {
    id: "template_video_virtual_tour_004",
    title: "Virtual Property Tour",
    description:
      "Complete virtual tour template with smooth transitions between rooms, property information cards, and professional voiceover placeholder.",
    contentType: "video" as ContentType,
    platforms: ["youtube", "facebook-post", "linkedin"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: true,
    requiredCategories: [
      "living_room",
      "kitchen",
      "bedroom",
      "bathroom",
      "exterior"
    ],
    tags: ["virtual-tour", "comprehensive", "professional", "detailed"],
    usageCount: 156,
    usageCount30Days: 41
  },
  {
    id: "template_video_minimal_tour_005",
    title: "Minimalist Showcase",
    description:
      "Clean, minimal video template focusing on architectural details and natural light. Slow, deliberate camera movements with subtle transitions.",
    contentType: "video" as ContentType,
    platforms: ["instagram-reel", "tiktok", "youtube-short"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["living_room", "bedroom"],
    tags: ["minimal", "clean", "architectural", "light"],
    usageCount: 321,
    usageCount30Days: 73
  },
  {
    id: "template_video_before_after_006",
    title: "Before & After Transformation",
    description:
      "Dynamic before-and-after video template for renovated properties. Split-screen comparisons with reveal animations.",
    contentType: "video" as ContentType,
    platforms: ["instagram-reel", "tiktok", "facebook-post"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: true,
    requiredCategories: ["living_room", "kitchen"],
    tags: ["renovation", "transformation", "before-after", "dramatic"],
    usageCount: 203,
    usageCount30Days: 61
  },
  {
    id: "template_video_neighborhood_tour_007",
    title: "Neighborhood Highlight",
    description:
      "Combines property interior with exterior neighborhood shots. Shows amenities, parks, and local attractions.",
    contentType: "video" as ContentType,
    platforms: [
      "youtube",
      "facebook-post",
      "instagram-reel",
      "linkedin"
    ] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["exterior"],
    tags: ["neighborhood", "location", "community", "lifestyle"],
    usageCount: 178,
    usageCount30Days: 44
  },

  // ============================================================================
  // POST TEMPLATES (8 templates: 5 free, 3 premium)
  // ============================================================================
  {
    id: "template_post_feature_highlight_001",
    title: "Feature Highlight Post",
    description:
      "Instagram-optimized carousel post highlighting 3-5 key property features. Modern design with property details and call-to-action.",
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "linkedin"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [
      "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80"
    ],
    isPremium: false,
    requiredCategories: ["living_room", "kitchen", "bedroom"],
    tags: ["carousel", "features", "instagram", "modern"],
    usageCount: 523,
    usageCount30Days: 134
  },
  {
    id: "template_post_single_room_002",
    title: "Single Room Spotlight",
    description:
      "Beautifully designed single image post focusing on one stunning room. Includes property branding and key details overlay.",
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "pinterest"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["living_room"],
    tags: ["single-image", "spotlight", "elegant", "branding"],
    usageCount: 687,
    usageCount30Days: 167
  },
  {
    id: "template_post_luxury_collage_003",
    title: "Luxury Property Collage",
    description:
      "Premium multi-image collage design showcasing property highlights in an elegant grid layout with gold accents and sophisticated typography.",
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "linkedin"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: true,
    requiredCategories: ["living_room", "kitchen", "bedroom", "bathroom"],
    tags: ["luxury", "collage", "elegant", "premium"],
    usageCount: 234,
    usageCount30Days: 58
  },
  {
    id: "template_post_just_listed_004",
    title: "Just Listed Announcement",
    description:
      'Eye-catching "Just Listed" announcement post with property hero image, key stats, and agent branding. High engagement design.',
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "linkedin"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["exterior"],
    tags: ["announcement", "just-listed", "marketing", "engagement"],
    usageCount: 456,
    usageCount30Days: 112
  },
  {
    id: "template_post_price_drop_005",
    title: "Price Reduction Alert",
    description:
      "Attention-grabbing price drop announcement with bold typography and property highlights. Creates urgency and drives inquiries.",
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "instagram-story"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600047509782-20d39509f26d?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["exterior"],
    tags: ["price-drop", "urgent", "promotion", "sale"],
    usageCount: 198,
    usageCount30Days: 47
  },
  {
    id: "template_post_open_house_006",
    title: "Open House Invitation",
    description:
      "Professional open house invitation post with event details, property preview, and directional map. Includes RSVP call-to-action.",
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "instagram-story"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: true,
    requiredCategories: ["exterior", "living_room"],
    tags: ["open-house", "event", "invitation", "professional"],
    usageCount: 312,
    usageCount30Days: 79
  },
  {
    id: "template_post_testimonial_007",
    title: "Client Testimonial Feature",
    description:
      "Showcase happy homeowners with their new property. Combines property photos with client quotes and satisfaction ratings.",
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "linkedin"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["exterior"],
    tags: ["testimonial", "social-proof", "reviews", "trust"],
    usageCount: 267,
    usageCount30Days: 63
  },
  {
    id: "template_post_lifestyle_scene_008",
    title: "Lifestyle Staging Post",
    description:
      "Premium lifestyle-focused post showing property in lived-in context. Perfect for connecting emotionally with potential buyers.",
    contentType: "post" as ContentType,
    platforms: ["instagram-post", "facebook-post", "pinterest"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: true,
    requiredCategories: ["living_room", "kitchen"],
    tags: ["lifestyle", "staging", "emotional", "premium"],
    usageCount: 189,
    usageCount30Days: 51
  },

  // ============================================================================
  // FLYER TEMPLATES (5 templates: 3 free, 2 premium)
  // ============================================================================
  {
    id: "template_flyer_classic_listing_001",
    title: "Classic Listing Flyer",
    description:
      "Traditional real estate flyer with property photos, details, agent information, and QR code. Perfect for print distribution and email.",
    contentType: "flyer" as ContentType,
    platforms: ["print"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["exterior", "living_room", "kitchen"],
    tags: ["classic", "traditional", "print", "professional"],
    usageCount: 398,
    usageCount30Days: 89
  },
  {
    id: "template_flyer_luxury_brochure_002",
    title: "Luxury Property Brochure",
    description:
      "Multi-page premium brochure design for high-end properties. Includes property story, detailed features, neighborhood info, and floor plans.",
    contentType: "flyer" as ContentType,
    platforms: ["print"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600566752229-250ed79c5267?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: true,
    requiredCategories: [
      "exterior",
      "living_room",
      "kitchen",
      "bedroom",
      "bathroom"
    ],
    tags: ["luxury", "brochure", "multi-page", "comprehensive"],
    usageCount: 145,
    usageCount30Days: 38
  },
  {
    id: "template_flyer_modern_minimal_003",
    title: "Modern Minimal Flyer",
    description:
      "Clean, contemporary flyer design with bold typography and whitespace. Perfect for modern properties and urban apartments.",
    contentType: "flyer" as ContentType,
    platforms: ["print"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["living_room", "exterior"],
    tags: ["modern", "minimal", "clean", "contemporary"],
    usageCount: 523,
    usageCount30Days: 128
  },
  {
    id: "template_flyer_open_house_004",
    title: "Open House Flyer",
    description:
      "Event-focused flyer design for open house marketing. Includes property highlights, event details, and directional information.",
    contentType: "flyer" as ContentType,
    platforms: ["print"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: false,
    requiredCategories: ["exterior", "living_room"],
    tags: ["open-house", "event", "marketing", "print"],
    usageCount: 412,
    usageCount30Days: 94
  },
  {
    id: "template_flyer_investment_property_005",
    title: "Investment Property Report",
    description:
      "Professional investment-focused flyer with ROI calculations, rental estimates, property stats, and market analysis. Perfect for investors.",
    contentType: "flyer" as ContentType,
    platforms: ["print"] as Platform[],
    previewImageUrl:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
    previewVideoUrl: null,
    exampleOutputUrls: [],
    isPremium: true,
    requiredCategories: ["exterior", "living_room"],
    tags: ["investment", "roi", "data", "professional"],
    usageCount: 176,
    usageCount30Days: 43
  }
];

/**
 * Get templates by content type
 */
export function getTemplatesByType(
  contentType: ContentType
): NewTemplate[] {
  return seedTemplates.filter((t) => t.contentType === contentType);
}

/**
 * Get free templates only
 */
export function getFreeTemplates(): NewTemplate[] {
  return seedTemplates.filter((t) => !t.isPremium);
}

/**
 * Get premium templates only
 */
export function getPremiumTemplates(): NewTemplate[] {
  return seedTemplates.filter((t) => t.isPremium);
}

/**
 * Get template statistics
 */
export function getTemplateStats() {
  return {
    total: seedTemplates.length,
    free: getFreeTemplates().length,
    premium: getPremiumTemplates().length,
    byType: {
      video: getTemplatesByType("video").length,
      post: getTemplatesByType("post").length,
      flyer: getTemplatesByType("flyer").length
    }
  };
}
