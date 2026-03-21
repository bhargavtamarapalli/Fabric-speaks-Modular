import { notFound } from 'next/navigation';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';
import { getStoryBySlug } from '@/lib/api/stories';

export default async function StoryPage({ params }: { params: { slug: string } }) {
  let story;
  try {
    story = await getStoryBySlug(params.slug);
  } catch (err) {
    // Ideally log this error or handle specific statuses
    return notFound();
  }

  if (!story) {
    return notFound(); 
  }

  return (
    <main className="min-h-screen bg-[var(--fs-void)] pb-24">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] md:h-[70vh] bg-gray-900 border-b border-[var(--fs-wire)]">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url(${story.heroImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--fs-void)] to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[var(--fs-linen)] text-xs uppercase tracking-[0.2em] font-medium">{story.category || 'Editorial'}</span>
            <span className="w-12 h-px bg-[var(--fs-wire)]"></span>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-[var(--fs-ivory)] leading-tight max-w-3xl">
            {story.title}
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-2xl leading-relaxed">
            {story.excerpt}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <article className="max-w-3xl mx-auto px-6 py-16 md:py-24 text-[var(--fs-ivory)] font-sans">
        <div 
          className="prose prose-invert prose-p:text-gray-300 prose-p:leading-loose prose-a:text-[var(--fs-linen)] prose-headings:font-serif prose-headings:text-[var(--fs-ivory)]"
          dangerouslySetInnerHTML={{ __html: story.bodyHtml }}
        />
        
        <div className="mt-16 pt-8 border-t border-[var(--fs-wire)] flex justify-between items-center">
            <span className="text-xs uppercase tracking-widest text-gray-500">Fabric Speaks Origination</span>
            <Link href="/products">
                <button className="px-6 py-3 uppercase tracking-widest text-xs font-medium bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-white transition-colors">
                    Explore Fabrics
                </button>
            </Link>
        </div>
      </article>
    </main>
  );
}

import Link from 'next/link';
