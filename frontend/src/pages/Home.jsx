import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";

/* Decorative shapes behind the hero. Purely visual, so everything in
   this block is hidden from assistive technology. */
function HeroShapes() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Soft dot field */}
      <div className="pattern-dots absolute -top-4 right-0 h-72 w-[42%] rounded-full blur-[0.2px]" />

      {/* Warm sun */}
      <div className="absolute -top-10 -left-12 h-40 w-40 rounded-full bg-sun-100" />
      <div className="absolute top-24 -left-4 h-14 w-14 rounded-full border-2 border-dashed border-forest-700/30" />

      {/* Sky tile */}
      <div className="absolute bottom-16 left-[46%] h-16 w-16 rotate-12 rounded-2xl bg-sky-100" />

      {/* Blush blob */}
      <svg
        className="absolute -bottom-6 -right-8 h-56 w-56 text-blush-100"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M43.9 -67.2C56.3 -58.3 65.5 -45.3 71.2 -30.9C76.9 -16.6 79.1 -0.8 75.9 13.2C72.7 27.2 64.1 39.5 52.6 49.8C41.1 60.1 26.7 68.4 11.2 72.9C-4.3 77.4 -20.9 78.1 -35.3 72.4C-49.7 66.7 -61.9 54.6 -69.4 39.9C-76.9 25.2 -79.7 7.9 -76.9 -8.1C-74.1 -24.1 -65.7 -38.8 -53.6 -47.9C-41.5 -57 -25.7 -60.5 -10.3 -64.1C5.1 -67.7 31.5 -76.1 43.9 -67.2Z" transform="translate(100 100)" />
      </svg>

      {/* Grid patch */}
      <div className="pattern-grid absolute bottom-4 left-6 h-32 w-48 rounded-xl" />
    </div>
  );
}

/* Static, clearly illustrative preview of the two card types on the
   site. Hidden from screen readers — it shows no real data. */
function HeroPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md pb-10 pt-8">
      {/* Skills-needed chip, tucked behind the team card */}
      <div className="card animate-rise delay-3 absolute -top-1 right-2 z-10 rotate-3 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">
          Needs
        </p>

        <p className="mt-1 text-sm font-medium text-ink">
          Frontend · UI/UX
        </p>
      </div>

      {/* Team card */}
      <div className="card animate-rise delay-1 relative z-20 w-[94%] p-5 sm:p-6 shadow-pop rotate-[1.5deg]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Team</p>

            <p className="display mt-1.5 text-xl text-forest-900">
              Team Nebula
            </p>
          </div>

          <span className="badge badge-open shrink-0">2 spots</span>
        </div>

        <p className="mt-3 text-sm font-semibold text-ink">
          Smart study-buddy app
        </p>

        <p className="mt-1 text-sm text-ink-soft leading-relaxed">
          An AI companion that turns lecture notes into quizzes and
          revision plans.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="tag tag-mint">Python</span>
          <span className="tag tag-sky">React</span>
          <span className="tag tag-lilac">Machine Learning</span>
        </div>
      </div>

      {/* Student sticker, overlapping the front bottom-left corner */}
      <div className="card animate-rise delay-2 card-hover absolute -bottom-2 -left-1 sm:-left-6 z-30 w-52 rotate-[-4deg] p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center font-semibold">
            S
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-forest-900">
              Sana K.
            </p>

            <p className="text-xs text-ink-muted">BSCS</p>
          </div>
        </div>

        <p className="tag tag-sand mt-3">Looking for a team</p>
      </div>

      {/* Floating accents */}
      <div className="absolute -right-4 top-1/3 h-8 w-8 rounded-full bg-sun-300" />
      <div className="absolute -left-6 bottom-1/4 h-5 w-5 rotate-45 rounded-sm bg-forest-200" />
    </div>
  );
}

function Home() {
  const steps = [
    {
      number: "1",
      tone: "bg-forest-100 text-forest-800",
      title: "Find students",
      copy: "Browse classmates by program, skills, interests and FYP status.",
    },
    {
      number: "2",
      tone: "bg-sun-100 text-sun-700",
      title: "Explore teams",
      copy: "See what teams are building and which skills and roles they still need.",
    },
    {
      number: "3",
      tone: "bg-sky-100 text-sky-700",
      title: "Connect",
      copy: "Open a profile, reach out, and start your final-year project together.",
    },
  ];

  return (
    <main>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <HeroShapes />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="eyebrow animate-rise">
                Final-year project teams
              </p>

              <h1 className="display animate-rise delay-1 mt-5 text-[2.6rem] leading-[1.03] sm:text-6xl lg:text-[4.2rem]">
                Build your FYP
                <br className="hidden sm:block" /> with the{" "}
                <em className="accent-italic">right people.</em>
              </h1>

              <p className="animate-rise delay-2 mt-6 max-w-xl text-lg text-ink-soft leading-relaxed">
                Discover students by skills, explore the teams forming
                right now, and connect with the teammates your
                final-year project deserves.
              </p>

              <div className="animate-rise delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/students" className="primary-button !px-6 !py-3">
                  <Search size={17} aria-hidden="true" />
                  Find students
                </Link>

                <Link to="/teams" className="secondary-button !px-6 !py-3">
                  <Compass size={17} aria-hidden="true" />
                  Explore teams
                </Link>
              </div>

              <p className="animate-rise delay-4 mt-6 text-sm text-ink-muted">
                Free for students · Sign in with your @iqra.edu.pk email
              </p>
            </div>

            <HeroPreview />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-forest-900/10 bg-cream-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>

            <h2 className="display mt-3 text-3xl sm:text-4xl">
              Finding your team is <em className="accent-italic">simple.</em>
            </h2>

            <p className="mt-4 text-ink-soft leading-relaxed">
              Everything you need to find teammates — or build your own
              team — in one place.
            </p>
          </div>

          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {steps.map((step, index) => (
              <li
                key={step.number}
                className={`relative ${index > 0 ? "md:border-l md:border-dashed md:border-forest-900/20 md:pl-10" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`display flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${step.tone}`}
                >
                  {step.number}
                </span>

                <h3 className="display mt-5 text-xl text-forest-900">
                  {step.title}
                </h3>

                <p className="mt-2 text-ink-soft leading-relaxed">
                  {step.copy}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Two ways in                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <p className="eyebrow">Where to start</p>

          <h2 className="display mt-3 text-3xl sm:text-4xl">
            Two ways to use <em className="accent-italic">FYP Finder.</em>
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="card card-hover p-7 sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-100 text-forest-800">
                <Users size={21} aria-hidden="true" />
              </div>

              <h3 className="display mt-5 text-2xl text-forest-900">
                Looking for a team?
              </h3>

              <p className="mt-3 text-ink-soft leading-relaxed">
                Set your skills and FYP status, then browse the teams
                that are still missing someone with exactly what you
                offer.
              </p>

              <Link
                to="/teams"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-800 transition-colors hover:text-forest-600"
              >
                Browse teams
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>

            <article className="card card-hover p-7 sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-100 text-sun-700">
                <GraduationCap size={21} aria-hidden="true" />
              </div>

              <h3 className="display mt-5 text-2xl text-forest-900">
                Looking for teammates?
              </h3>

              <p className="mt-3 text-ink-soft leading-relaxed">
                Create a team, describe your project, and list the
                skills and roles you still need. Interested students
                can find you.
              </p>

              <Link
                to="/students"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-800 transition-colors hover:text-forest-600"
              >
                Find students
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing CTA                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-forest-900 px-6 py-12 sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -top-16 -right-10 h-52 w-52 rounded-full bg-forest-700/60" />
            <div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-sun-500/25" />
            <div className="pattern-dots absolute bottom-0 left-0 h-40 w-64 opacity-[0.18] invert" />
          </div>

          <div className="relative max-w-2xl">
            <h2 className="display text-3xl sm:text-4xl text-cream-50">
              Ready to find your{" "}
              <em className="italic text-sun-300">FYP team?</em>
            </h2>

            <p className="mt-4 text-cream-100/85 leading-relaxed">
              Create an account with your university email, add your
              skills, and start connecting with classmates today.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/students"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cream-50 px-6 py-3 text-sm font-semibold text-forest-900 transition-transform hover:-translate-y-0.5"
              >
                Find students
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-cream-50/40 px-6 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-cream-50/10"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
