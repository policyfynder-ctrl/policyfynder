import {
  HeartPulse,
  Car,
  Umbrella,
  Plane,
  Building2,
  Users,
  type LucideIcon,
} from 'lucide-react'

// Static, typed content for the public website's insurance categories (M14).
// Drives the categories hub, the six product pages, the header/footer menus, and
// the sitemap. No DB dependency — marketing content is config, not data.

export type InsuranceCategory = {
  slug: string
  name: string
  tagline: string
  icon: LucideIcon
  summary: string
  heroDescription: string
  coverage: string[]
  benefits: { title: string; description: string }[]
  faqs: { q: string; a: string }[]
}

export const insuranceCategories: InsuranceCategory[] = [
  {
    slug: 'health',
    name: 'Health Insurance',
    tagline: 'Cover for hospital bills, big and small',
    icon: HeartPulse,
    summary: 'Protect your family against rising medical costs with cashless hospitalisation.',
    heroDescription:
      'From planned surgeries to medical emergencies, a health plan keeps a hospital bill from becoming a financial crisis. We help you compare cover, network hospitals, and waiting periods so you pick the right plan — not just the cheapest one.',
    coverage: [
      'Cashless treatment at network hospitals',
      'Pre- and post-hospitalisation expenses',
      'Day-care procedures and modern treatments',
      'Family floater and individual options',
      'Optional critical-illness and top-up cover',
    ],
    benefits: [
      { title: 'Compare real plans', description: 'See cover, premiums, and exclusions side by side — no jargon.' },
      { title: 'Cashless network', description: 'Treatment at thousands of network hospitals with no upfront payment.' },
      { title: 'Claims support', description: 'Your relationship manager helps you file and follow up on claims.' },
    ],
    faqs: [
      { q: 'What is a family floater plan?', a: 'A single policy that covers your whole family under one shared sum insured, usually cheaper than separate individual plans.' },
      { q: 'What is a waiting period?', a: 'The time before certain conditions are covered. We help you compare waiting periods so there are no surprises at claim time.' },
      { q: 'Can I get cashless treatment anywhere?', a: 'Cashless works at the insurer’s network hospitals. For others you pay and claim reimbursement — we guide you through both.' },
    ],
  },
  {
    slug: 'motor',
    name: 'Motor Insurance',
    tagline: 'Cover for your car and two-wheeler',
    icon: Car,
    summary: 'Comprehensive and third-party cover for cars and bikes, renewed on time.',
    heroDescription:
      'Motor cover is mandatory — but the right plan does more than tick a legal box. We help you balance premium, IDV, and add-ons like zero-depreciation so you are properly protected on the road.',
    coverage: [
      'Mandatory third-party liability',
      'Own-damage / comprehensive cover',
      'Zero-depreciation and engine-protection add-ons',
      'Roadside assistance',
      'No-claim bonus protection',
    ],
    benefits: [
      { title: 'Right IDV', description: 'We help you set an insured value that protects you without overpaying.' },
      { title: 'On-time renewals', description: 'Never let cover lapse — we remind you before every renewal.' },
      { title: 'Claim guidance', description: 'Accident or theft, your RM walks you through the claim process.' },
    ],
    faqs: [
      { q: 'Third-party vs comprehensive?', a: 'Third-party is the legal minimum and covers damage to others. Comprehensive also covers your own vehicle against accident, theft, and disasters.' },
      { q: 'What is zero-depreciation?', a: 'An add-on that pays the full cost of replaced parts without deducting for wear and tear — valuable for newer vehicles.' },
      { q: 'Will my premium rise after a claim?', a: 'It can, as you may lose your no-claim bonus. We help you weigh small claims against keeping your bonus.' },
    ],
  },
  {
    slug: 'life',
    name: 'Life Insurance',
    tagline: 'Financial security for the people you love',
    icon: Umbrella,
    summary: 'Term and savings plans that protect your family’s future.',
    heroDescription:
      'Life cover replaces your income if the unexpected happens, so your family can keep their home, education, and plans on track. We help you choose the right cover amount and the right type — term, endowment, or ULIP — for your goals.',
    coverage: [
      'Pure term cover for maximum protection',
      'Savings and endowment plans',
      'Critical-illness and accidental-death riders',
      'Cover for loans and liabilities',
      'Tax-efficient long-term options',
    ],
    benefits: [
      { title: 'Right cover amount', description: 'A simple needs analysis so you are neither under- nor over-insured.' },
      { title: 'Honest advice', description: 'We explain term vs savings plans clearly — you decide what fits.' },
      { title: 'Nominee support', description: 'We help your family with the claim when it matters most.' },
    ],
    faqs: [
      { q: 'How much life cover do I need?', a: 'A common guide is 10–15× your annual income, adjusted for loans and goals. Your RM helps you calculate it.' },
      { q: 'What is term insurance?', a: 'The most affordable life cover — it pays a large sum if you pass away during the term, with no maturity payout.' },
      { q: 'Are premiums tax-deductible?', a: 'Life premiums often qualify for tax benefits. We can explain what applies to your situation.' },
    ],
  },
  {
    slug: 'travel',
    name: 'Travel Insurance',
    tagline: 'Peace of mind on every trip',
    icon: Plane,
    summary: 'Medical, baggage, and trip-cancellation cover for India and abroad.',
    heroDescription:
      'A missed flight, lost luggage, or a medical emergency overseas can derail a trip and your budget. Travel cover handles the unexpected so you can focus on the journey.',
    coverage: [
      'Overseas medical emergencies and evacuation',
      'Trip cancellation and delay',
      'Lost or delayed baggage and passport',
      'Single-trip and multi-trip options',
      'Student and senior-citizen plans',
    ],
    benefits: [
      { title: 'Visa-ready cover', description: 'Plans that meet Schengen and other visa requirements.' },
      { title: 'Global assistance', description: '24×7 emergency assistance while you travel.' },
      { title: 'Fast to buy', description: 'Get covered in minutes before you fly.' },
    ],
    faqs: [
      { q: 'Is travel insurance mandatory?', a: 'Many countries (e.g. the Schengen area) require it for a visa. Even where optional, medical costs abroad make it well worth it.' },
      { q: 'Does it cover pre-existing conditions?', a: 'Coverage varies by plan. We help you find one that covers declared conditions where possible.' },
      { q: 'Single-trip or multi-trip?', a: 'Frequent flyers usually save with an annual multi-trip plan. We compare both for your travel pattern.' },
    ],
  },
  {
    slug: 'commercial',
    name: 'Commercial Insurance',
    tagline: 'Protection for your business and assets',
    icon: Building2,
    summary: 'Property, liability, and specialised cover for businesses of every size.',
    heroDescription:
      'From a single shop to a growing enterprise, the right commercial cover protects your premises, stock, people, and liabilities — so one incident doesn’t threaten everything you’ve built.',
    coverage: [
      'Property, fire, and burglary cover',
      'Public and product liability',
      'Marine and transit insurance',
      'Professional indemnity',
      'Business-interruption cover',
    ],
    benefits: [
      { title: 'Tailored to your risk', description: 'Cover built around your industry, premises, and exposure.' },
      { title: 'One point of contact', description: 'A dedicated manager for quotes, renewals, and claims.' },
      { title: 'Scales with you', description: 'Adjust cover as your business grows.' },
    ],
    faqs: [
      { q: 'What cover does a small business need?', a: 'Typically property/fire, burglary, and public liability at minimum. We assess your specific risks and recommend accordingly.' },
      { q: 'What is business-interruption cover?', a: 'It replaces lost income if your business has to pause after an insured event, like a fire — keeping you afloat during recovery.' },
      { q: 'Can you cover multiple locations?', a: 'Yes. We can structure cover across several premises under coordinated policies.' },
    ],
  },
  {
    slug: 'group',
    name: 'Group Insurance',
    tagline: 'Employee benefits that retain talent',
    icon: Users,
    summary: 'Group health, life, and accident cover for teams and organisations.',
    heroDescription:
      'Group benefits are one of the most valued things you can offer a team. We help employers design cost-effective group health, life, and accident plans — and manage them end to end.',
    coverage: [
      'Group health (GMC) with family options',
      'Group term life (GTL)',
      'Group personal accident (GPA)',
      'Wellness and OPD add-ons',
      'Flexible enrolment and endorsements',
    ],
    benefits: [
      { title: 'Attract & retain', description: 'Competitive benefits that help you hire and keep great people.' },
      { title: 'Simple administration', description: 'We handle enrolment, endorsements, and claims for your HR team.' },
      { title: 'Better rates', description: 'Group buying power means stronger cover for less.' },
    ],
    faqs: [
      { q: 'How many employees do we need?', a: 'Group plans are typically available from a small minimum headcount. Talk to us about your team size.' },
      { q: 'Can families be covered?', a: 'Yes — group health can extend to spouses, children, and dependents based on the plan you choose.' },
      { q: 'Who manages claims?', a: 'We do, alongside the insurer — so your HR team and employees have a single point of contact.' },
    ],
  },
]

export function getCategory(slug: string): InsuranceCategory | undefined {
  return insuranceCategories.find((c) => c.slug === slug)
}

export const categorySlugs = insuranceCategories.map((c) => c.slug)
