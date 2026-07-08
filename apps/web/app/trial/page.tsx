import Link from "next/link";

const YOUTUBE_VIDEO_ID = "aEG2lSN3lHM";

export default function TrialPage() {
  return (
    <main className="bg-background">
      <section className="relative">
        <div className="relative w-full max-w-5xl mx-auto mt-24 sm:mt-28 px-4 sm:px-8">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black/40">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`}
              title="Mukha Mudra trial session"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 mt-8 sm:mt-10 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p
                className="text-xl sm:text-2xl tracking-[0.04em]"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-heading-gold)",
                }}
              >
                Experience a session
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                This is what a live Mukha Mudra class feels like. 30 minutes of
                guided face yoga and breathwork, 3 times a week, through your
                screen.
              </p>
            </div>

            <Link
              href="/pricing"
              className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-full border border-border bg-transparent text-[0.8rem] uppercase tracking-[0.2em] text-foreground/80 transition-all duration-500 hover:border-foreground/30 hover:text-foreground shrink-0"
            >
              See plans
              <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
