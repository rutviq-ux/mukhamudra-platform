import Image from "next/image";
import Link from "next/link";
import { readdir } from "node:fs/promises";
import path from "node:path";

const palette = [
  { name: "Ivory", token: "--color-background", value: "#F7F2E8", note: "Primary canvas" },
  { name: "Ink Black", token: "--color-foreground", value: "#1B1A18", note: "Typography anchor" },
  { name: "Sage", token: "--color-primary", value: "#7E9A83", note: "Primary action" },
  { name: "Warm Sand", token: "--color-secondary", value: "#EADCC8", note: "Soft depth" },
  { name: "Clay", token: "--color-accent", value: "#E6A18F", note: "Warm highlight" },
  { name: "Aura Mint", token: "--color-aura-mint", value: "#B9E0C2", note: "Glow accent" },
  { name: "Aura Sun", token: "--color-aura-sun", value: "#F2E3B8", note: "Halo light" },
];

const publicLibraryRoot = path.join(process.cwd(), "public", "visual-library");

async function readLibraryFiles(subdir: string, extensions: string[]) {
  const dirPath = path.join(publicLibraryRoot, subdir);
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const lower = name.toLowerCase();
      return extensions.some((ext) => lower.endsWith(ext));
    })
    .sort((a, b) => a.localeCompare(b));
}

export default async function VisualLibraryPage() {
  const [editorialImages, auraImages, motionReferences] = await Promise.all([
    readLibraryFiles("editorial", [".jpg", ".jpeg", ".png"]),
    readLibraryFiles("aura", [".jpg", ".jpeg", ".png"]),
    readLibraryFiles("motion", [".mp4", ".mov", ".webm"]),
  ]);

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-6xl mx-auto space-y-20">
        <header className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-muted-foreground"
            >
              Back to home
            </Link>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              RU Visual Library
            </h1>
            <p className="text-lg text-muted-foreground max-w-full text-pretty leading-relaxed">
              A living reference for RU: ivory paper, sage breath, ink-black
              grounding, and a quiet aura glow. Use it to align tone, texture,
              and motion across every surface.
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 aura-halo opacity-40" />
            <div className="w-[14rem] h-[14rem] aura-core" />
            <div className="absolute w-[8rem] h-[8rem] aura-star" />
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10">
          <div className="aura-card p-8 space-y-6">
            <div className="tag-pill uppercase tracking-[0.25em]">
              <span className="aura-dot" />
              Core palette
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {palette.map((color) => (
                <div
                  key={color.name}
                  className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3"
                >
                  <div
                    className="h-16 rounded-xl border border-border"
                    style={{ background: `var(${color.token})` }}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{color.name}</span>
                    <span className="text-muted-foreground">{color.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{color.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="aura-card p-8 space-y-6">
            <div className="tag-pill uppercase tracking-[0.25em]">
              <span className="aura-dot" />
              Material cues
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="h-28 aura-field" />
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Aura field backdrop for hero and key panels.
                </div>
              </div>
              <div className="rounded-2xl border border-border overflow-hidden grain-overlay">
                <div className="h-28 gradient-mesh" />
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Soft grain + haze for depth, never glossy.
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                Use ink-black accents sparingly: strong typography, thin strokes,
                and small caps.
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10">
          <div className="aura-card p-8 space-y-6">
            <div className="tag-pill uppercase tracking-[0.25em]">
              <span className="aura-dot" />
              Motifs
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center">
                <div className="w-[6rem] h-[6rem] aura-core" />
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center">
                <div className="w-[5rem] h-[5rem] aura-star" />
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center">
                <div className="w-[6rem] h-[6rem] aura-orb" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Motifs should feel like soft energy fields, never metallic or
              glossy. Keep opacity low and motion slow.
            </p>
          </div>

          <div className="aura-card p-8 space-y-6">
            <div className="tag-pill uppercase tracking-[0.25em]">
              <span className="aura-dot" />
              Typography
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Display
              </p>
              <p
                className="text-4xl font-light leading-[1.05]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                The ritual is soft, the tone is grounded.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Body
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Keep paragraphs breathable with generous line height. Let the
                ivory canvas do the work and allow sage accents to guide the eye
                toward actions.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="tag-pill uppercase tracking-[0.25em]">
              <span className="aura-dot" />
              Editorial references
            </div>
            <p className="text-sm text-muted-foreground">
              Studio portraits, sculptural silhouettes, and calm skin tones.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {editorialImages.map((src, index) => (
              <div
                key={src}
                className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-border bg-card"
              >
                <Image
                  src={`/visual-library/editorial/${src}`}
                  alt={`RU editorial reference ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="tag-pill uppercase tracking-[0.25em]">
              <span className="aura-dot" />
              Aura references
            </div>
            <p className="text-sm text-muted-foreground">
              Airbrushed gradients, soft halos, and painterly glow.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {auraImages.map((src, index) => (
              <div
                key={src}
                className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-border bg-card"
              >
                <Image
                  src={`/visual-library/aura/${src}`}
                  alt={`RU aura reference ${index + 1}`}
                  fill
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="tag-pill uppercase tracking-[0.25em]">
              <span className="aura-dot" />
              Motion cues
            </div>
            <p className="text-sm text-muted-foreground">
              Slow, graceful movement for ritual calm.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {motionReferences.map((src, index) => (
              <div
                key={src}
                className="rounded-3xl border border-border bg-card p-2"
              >
                <video
                  className="w-full aspect-[3/4] rounded-2xl object-cover"
                  controls
                  muted
                  playsInline
                  preload="metadata"
                >
                  <source src={`/visual-library/motion/${src}`} type="video/mp4" />
                  RU motion reference {index + 1}
                </video>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
