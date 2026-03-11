import { notFound } from 'next/navigation';
import { SpiderLoader } from '@/components/atoms/SpiderLoader';

// Next.js 14 expected dynamic API setup
// Ideally, this calls `apiFetch` in a Server Component or relies on a React Server Action
// For mocking the edge case layout, we simulate fetching story content here.

interface StoryContent {
  title: string;
  heroImage: string;
  excerpt: string;
  bodyHtml: string;
}

const fetchStory = async (slug: string): Promise<StoryContent | null> => {
  // Simulate network
  await new Promise(r => setTimeout(r, 600));

  if (slug === 'origin-of-kanjeevaram' || slug === 'kanjeevaram-origin') {
    return {
      title: 'The Origin of Kanjeevaram',
      heroImage: 'https://images.unsplash.com/photo-1605650201201-d85c18cfab8e?q=80&w=2670&auto=format&fit=crop',
      excerpt: 'Discover the ancient weaving traditions passed down through generations in Kanchipuram.',
      bodyHtml: `
        <p class="mb-6">The Kanjeevaram silk saree is a magnificent creation of the weavers of Kanchipuram, a small temple town in Tamil Nadu, India. Legend has it that the Kanchi silk weavers are descendants of Sage Markanda, the master weaver of Gods who is supposed to have woven tissue from lotus fibre.</p>
        <p class="mb-6">What makes Kanjeevaram silk so special is its weight and texture. Woven from pure mulberry silk, the sheer weight of the silk makes it drape beautifully. The zari used in an authentic Kanjeevaram is made with a silver wire that is coated with gold.</p>
        <h3 class="text-xl font-serif text-[var(--fs-linen)] mt-12 mb-4">The Art of Weaving</h3>
        <p class="mb-6">It takes anywhere from 10 to 30 days to weave a single authentic Kanjeevaram piece. The borders and the pallu are often woven separately from the main body and then interlocked together. This joint is woven so strongly that even if the saree tears, the border will not detach—a testament to the incredible skill of the Korvai technique.</p>
      `
    };
  }
  
  return null; // Triggers 404 if not found
};

export default async function StoryPage({ params }: { params: { slug: string } }) {
  const story = await fetchStory(params.slug);

  if (!story) {
    notFound(); 
  }

  return (
    <main className="min-h-screen bg-[var(--fs-void)]">
      {/* Hero Section */}
      <div className="relative w-full h-[60vh] md:h-[70vh] bg-gray-900 border-b border-[var(--fs-wire)]">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url(${story.heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--fs-void)] to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[var(--fs-linen)] text-xs uppercase tracking-[0.2em] font-medium">Editorial</span>
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
            <button className="px-6 py-3 uppercase tracking-widest text-xs font-medium bg-[var(--fs-linen)] text-[var(--fs-void)] hover:bg-white transition-colors">
                Shop Kanjeevaram
            </button>
        </div>
      </article>
    </main>
  );
}
