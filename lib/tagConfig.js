// ============================================================
// FILE: lib/tagConfig.js
// PURPOSE: Single source of truth for all tag categories and tags
// LAST CHANGED: May 16, 2026
// WHY IT EXISTS: Centralise tag/category definitions so future
//   additions, removals, or renames only require editing THIS file.
//   Nothing else needs to change — seed route reads from here,
//   tags page reads from here, search reads from here.
// DEPENDENCIES: None
// ⚠️ DO NOT CHANGE: Category `id` values — they are stored in
//   Supabase as the `category` column. Renaming an id without a
//   migration will orphan existing tags.
// ============================================================

/**
 * TAG CONFIG
 * ----------
 * To add a category:   push a new object into TAG_CATEGORIES
 * To add a tag:        push a new string into the tags array of the right category
 * To rename a tag:     change the string — slug is auto-generated from name at seed time
 * To rename a category label: change `label` only — never change `id`
 * To remove a tag:     delete the string — run seed route again to soft-delete (post_count stays)
 *
 * Slug generation rule: lowercase, spaces → hyphens, strip special chars
 * Users can select UP TO 5 tags per post/question.
 */

export const TAG_CATEGORIES = [
  {
    id: 'subjects',
    label: '📚 Subjects',
    description: 'Core medical science subjects taught across all programs',
    tags: [
      'Anatomy',
      'Physiology',
      'Biochemistry',
      'Pathology',
      'Pharmacology',
      'Microbiology',
      'Immunology',
      'Genetics',
      'Embryology',
      'Histology',
      'Biostatistics',
      'Epidemiology',
      'Forensic Medicine',
      'Community Medicine',
    ],
  },
  {
    id: 'pre-clinical',
    label: '🔬 Pre-Clinical',
    description: 'First and second year medical school — foundations and lab work',
    tags: [
      'First Year',
      'Second Year',
      'MBBS Basics',
      'Lab Skills',
      'Dissection',
      'Case Studies',
      'Revision',
      'Study Tips',
    ],
  },
  {
    id: 'clinical',
    label: '🏥 Clinical',
    description: 'Clinical rotations, specialties, and hospital life',
    tags: [
      'Internal Medicine',
      'Surgery',
      'Pediatrics',
      'Obstetrics & Gynecology',
      'Psychiatry',
      'Dermatology',
      'Ophthalmology',
      'ENT',
      'Orthopedics',
      'Radiology',
      'Anesthesia',
      'Emergency Medicine',
      'Neurology',
      'Cardiology',
      'Oncology',
      'Nephrology',
      'Endocrinology',
      'Gastroenterology',
      'Pulmonology',
      'Rheumatology',
      'Infectious Disease',
      'ICU & Critical Care',
    ],
  },
  {
    id: 'exams',
    label: '📝 Exams',
    description: 'Licensing exams, board prep, and interview strategies worldwide',
    tags: [
      'USMLE Step 1',
      'USMLE Step 2',
      'USMLE Step 3',
      'PLAB',
      'AMC',
      'NEET PG',
      'FMGE',
      'MRCP',
      'UKMLA',
      'MCCQE',
      'DHA / HAAD',
      'Residency Match',
      'Fellowship',
      'Interview Prep',
      'MCQ Strategy',
      'Revision Plans',
    ],
  },
  {
    id: 'support',
    label: '🤝 Support',
    description: 'Mental health, wellbeing, and peer support for medical students and doctors',
    tags: [
      'Mental Health',
      'Burnout',
      'Imposter Syndrome',
      'First Day Jitters',
      'Seniors & Juniors',
      'Study Groups',
      'Motivation',
      'Work-Life Balance',
      'Relationships',
      'Financial Advice',
      'Housing & Accommodation',
      'International Students',
    ],
  },
  {
    id: 'profession',
    label: '💼 Profession',
    description: 'Healthcare professions beyond MBBS — allied health, research, and more',
    tags: [
      'Nursing',
      'Dentistry',
      'Pharmacy',
      'Physiotherapy',
      'Medical Research',
      'Public Health',
      'Healthcare Management',
      'Allied Health',
      'Veterinary',
      'Medical Ethics',
      'AI in Medicine',
      'Medical Writing',
      'Global Health',
    ],
  },
  {
    id: 'career-life',
    label: '🌍 Career & Life',
    description: 'Residency, attending life, immigration, research, and life beyond med school',
    tags: [
      'Residency Life',
      'Attending Life',
      'Locum & Freelance',
      'Medical Tourism',
      'Rural Medicine',
      'Volunteering',
      'Medical Education',
      'Teaching',
      'Publications & Research',
      'Scholarships & Grants',
      'Visa & Immigration',
      'Gap Year',
    ],
  },
  {
    id: 'community',
    label: '💬 Community',
    description: 'Introductions, wins, discussions, humor, and community resources',
    tags: [
      'Introductions',
      'Wins & Milestones',
      'Rant & Vent',
      'Humor & Memes',
      'Case of the Day',
      'Poll & Discussion',
      'Resources & Tools',
      'Book Recommendations',
      'App Reviews',
      'News & Updates',
    ],
  },
]

/**
 * Flat list of all tags with their category id attached.
 * Useful for search, seed routes, and validation.
 */
export const ALL_TAGS = TAG_CATEGORIES.flatMap((cat) =>
  cat.tags.map((tag) => ({
    name: tag,
    category: cat.id,
    slug: tag.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
  }))
)

/**
 * Max tags a user can attach to a single post/question.
 * Change this number to adjust the limit app-wide.
 */
export const MAX_TAGS_PER_POST = 5

/**
 * Get a category object by its id.
 * Returns undefined if not found.
 */
export function getCategoryById(id) {
  return TAG_CATEGORIES.find((cat) => cat.id === id)
}

/**
 * Get a tag config object by its slug.
 * Returns undefined if not found.
 */
export function getTagBySlug(slug) {
  return ALL_TAGS.find((tag) => tag.slug === slug)
}

// --- CHANGE LOG ---
// [May 16, 2026] CREATED: Initial build — Phase 6 Tags & Discovery
// REASON: Central config so future team can manage tags without touching any other file
// --- END CHANGE LOG ---
