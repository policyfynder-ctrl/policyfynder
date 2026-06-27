import Link from 'next/link'
import { type Article, formatArticleDate } from '@/lib/knowledge'

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/knowledge/${article.slug}`}
      className="group border-border bg-card hover:border-brand/40 flex flex-col gap-3 rounded-xl border p-6 shadow-sm transition-colors"
    >
      <div className="text-brand text-xs font-medium tracking-wide uppercase">{article.category}</div>
      <h3 className="font-heading group-hover:text-brand text-lg font-semibold transition-colors">
        {article.title}
      </h3>
      <p className="text-muted-foreground flex-1 text-sm leading-relaxed">{article.excerpt}</p>
      <div className="text-muted-foreground text-xs">
        {formatArticleDate(article.date)} · {article.readingMinutes} min read
      </div>
    </Link>
  )
}
