import { Container } from "@/components/Container";
import { ToolCard } from "@/components/ToolCard";
import { ButtonLink } from "@/components/Button";
import { tools } from "@/lib/tools";

const steps = [
  {
    title: "Choose a tool",
    description: "Pick from merge, split, rotate, or convert — no account needed.",
  },
  {
    title: "Drop in your file",
    description: "Your file never leaves your device. Everything runs locally.",
  },
  {
    title: "Download the result",
    description: "Get your converted file instantly, ready to use anywhere.",
  },
];

const badges = ["5 free tools", "100% private", "No file limits", "No sign-up"];

export default function Home() {
  return (
    <>
      <section>
        <Container className="flex flex-col items-center gap-8 py-24 text-center sm:py-32">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-card-border bg-card px-3 py-1 text-xs font-medium text-secondary"
              >
                {badge}
              </span>
            ))}
          </div>
          <h1 className="font-display max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-7xl">
            Convert files.
            <br />
            <span className="gradient-headline">Right in your browser.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-secondary sm:text-xl">
            AI convertly is a free toolkit for merging, splitting, rotating,
            and converting PDFs and images. No uploads, no accounts, no
            limits.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <ButtonLink href="#tools" size="lg">
              Browse all tools
            </ButtonLink>
            <ButtonLink href="/tools/merge-pdf" variant="secondary" size="lg">
              Try Merge PDF
            </ButtonLink>
          </div>
        </Container>
      </section>

      <section id="tools" className="scroll-mt-20 py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <div className="flex flex-col gap-4 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Five tools. Zero friction.
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-secondary">
              Every tool below runs entirely client-side — your files are
              processed on your device and never touch a server.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-card-border/60 py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <div className="flex flex-col gap-4 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-secondary">
              Three steps, no waiting rooms.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex flex-col gap-3">
                <span className="font-display text-sm font-bold text-accent">
                  0{index + 1}
                </span>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="leading-relaxed text-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-card-border/60 py-20 sm:py-24">
        <Container className="flex flex-col items-center gap-6 rounded-3xl border border-card-border bg-card px-6 py-16 text-center sm:py-20">
          <h2 className="font-display max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your files stay on your device. Always.
          </h2>
          <p className="max-w-xl text-lg text-secondary">
            No servers, no paid APIs, no data collection. Just fast,
            free conversion tools that respect your privacy.
          </p>
          <ButtonLink href="#tools" size="lg">
            Start converting
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
