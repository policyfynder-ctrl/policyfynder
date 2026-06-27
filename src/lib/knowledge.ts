// Knowledge Centre content (M14). Typed, static articles rendered as SSG — no DB and
// no MDX build dependency. Swap this module for an MDX/CMS loader later without
// changing the pages, since they only depend on these types.

export type ArticleSection = { heading?: string; paragraphs: string[]; bullets?: string[] }

export type Article = {
  slug: string
  title: string
  excerpt: string
  category: string
  date: string // ISO
  readingMinutes: number
  sections: ArticleSection[]
}

export const articles: Article[] = [
  {
    slug: 'how-much-health-insurance-do-you-need',
    title: 'How much health insurance cover do you actually need?',
    excerpt:
      'Picking a sum insured is the most important health-insurance decision — here’s a simple way to get it right.',
    category: 'Health',
    date: '2026-05-12',
    readingMinutes: 4,
    sections: [
      {
        paragraphs: [
          'The “right” health cover isn’t a fixed number — it depends on where you live, your family’s health, and the kind of hospitals you’d want to use. But a few simple rules make the decision much easier.',
        ],
      },
      {
        heading: 'Start with the cost of a major treatment',
        paragraphs: [
          'A single serious hospitalisation in a private hospital in a metro city can run into several lakhs. Your sum insured should comfortably cover that worst-case event, not just routine visits.',
        ],
      },
      {
        heading: 'Add a buffer with a top-up',
        paragraphs: [
          'Instead of buying a very high base cover, many families pair a moderate base plan with a top-up that kicks in above a threshold. It’s a cost-effective way to reach a high total cover.',
        ],
      },
      {
        heading: 'Don’t forget the details',
        paragraphs: ['Cover amount matters, but so do these:'],
        bullets: [
          'Room-rent limits — these can quietly reduce your effective cover.',
          'Waiting periods for pre-existing conditions.',
          'Network hospitals near you for cashless treatment.',
        ],
      },
      {
        heading: 'The simple takeaway',
        paragraphs: [
          'Aim for cover that handles a major hospitalisation without dipping into savings, use a top-up to stretch it efficiently, and read the fine print on room rent and waiting periods. A relationship manager can run the numbers for your situation.',
        ],
      },
    ],
  },
  {
    slug: 'term-vs-whole-life-insurance',
    title: 'Term vs. savings life insurance: which is right for you?',
    excerpt:
      'Term plans are cheap and simple; savings plans bundle investment. Here’s how to choose without the sales pitch.',
    category: 'Life',
    date: '2026-04-28',
    readingMinutes: 5,
    sections: [
      {
        paragraphs: [
          'Life insurance broadly comes in two flavours: pure protection (term) and protection-plus-savings (endowment/ULIP). They solve different problems, and mixing them up is a common — and expensive — mistake.',
        ],
      },
      {
        heading: 'Term insurance: maximum protection',
        paragraphs: [
          'Term plans pay a large sum if you pass away during the policy term, and nothing if you outlive it. Because there’s no savings component, premiums are low — which means you can afford a genuinely large cover.',
        ],
      },
      {
        heading: 'Savings plans: protection + a payout',
        paragraphs: [
          'Endowment and ULIP plans return money at maturity, but the cover per rupee of premium is far smaller, and returns are often modest. They suit specific goals, not maximum protection.',
        ],
      },
      {
        heading: 'A rule of thumb',
        paragraphs: [
          'For most families, a large term plan plus separate investments (mutual funds, PPF, etc.) gives more cover and better returns than a bundled savings plan. But your goals and tax situation matter — talk it through before deciding.',
        ],
      },
    ],
  },
  {
    slug: 'before-you-renew-car-insurance',
    title: '5 things to check before renewing your car insurance',
    excerpt:
      'Renewal is the best time to fix gaps and save money. Don’t just click “renew” — check these first.',
    category: 'Motor',
    date: '2026-04-10',
    readingMinutes: 3,
    sections: [
      {
        paragraphs: ['Auto-renewing on the same terms is easy, but a two-minute check can save money and close cover gaps.'],
      },
      {
        heading: 'The checklist',
        paragraphs: [],
        bullets: [
          'IDV (insured value): too low and you’re underpaid after a total loss; too high and you overpay.',
          'No-claim bonus: make sure your earned discount carries over.',
          'Add-ons: zero-depreciation and engine protection are worth it for newer cars.',
          'Claims history of the insurer: cheap premiums mean little if claims are painful.',
          'Coverage type: confirm you have comprehensive, not just third-party, if you want own-damage cover.',
        ],
      },
      {
        heading: 'Get a second opinion',
        paragraphs: [
          'A quick comparison across insurers at renewal often reveals better value. Your relationship manager can do this for you before the policy lapses.',
        ],
      },
    ],
  },
]

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug)
}

export const articleSlugs = articles.map((a) => a.slug)

export function formatArticleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
}
