import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";

/* Ambient backdrop for the hero: two soft blurred gradients and a
   faint grid that dissolves before it reaches the text. No floating
   shapes, nothing that competes with the copy. Purely visual, so it
   is hidden from assistive technology. */
function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Warm light spilling in from the top-left corner */}
      <div className="absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-forest-100/70 blur-3xl" />

      {/* Cooler glow balancing the card stack on the right */}
      <div className="absolute -right-40 top-8 h-[26rem] w-[26rem] rounded-full bg-sun-100/60 blur-3xl" />

      {/* Clean grid lines, masked so they fade out toward the content */}
      <div className="pattern-grid absolute inset-x-0 top-0 h-[26rem] [-webkit-mask-image:radial-gradient(ellipse_75%_80%_at_72%_18%,#000,transparent_72%)] [mask-image:radial-gradient(ellipse_75%_80%_at_72%_18%,#000,transparent_72%)]" />
    </div>
  );
}

/* Static, clearly illustrative preview of the two card types on the
   site. Hidden from screen readers — it shows no real data.

   The cards sit in normal document flow (offset with margins, not
   absolute positioning) so nothing is clipped, truncated or pushed
   off-screen at any width. Small rotations keep the sticker feel. */
function HeroPreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      {/* Soft glow separating the stack from the cream page */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-forest-100/60 via-transparent to-sun-100/50 blur-2xl" />

      {/* Skills still needed — right-aligned above the team card */}
      <div className="animate-rise delay-3 card ml-auto w-fit max-w-full rotate-2 px-4 py-3">
        <p className="eyebrow">Needs</p>

        <p className="mt-1 text-sm font-medium text-ink">
          Frontend · UI/UX
        </p>
      </div>

      {/* Team card */}
      <div className="animate-rise delay-1 card shadow-pop mt-5 -rotate-[0.6deg] p-5 sm:p-6">
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

      {/* Student sticker, tucked under the bottom-left of the stack */}
      <div className="animate-rise delay-2 card card-hover mt-5 w-full max-w-[16rem] -rotate-2 p-4 sm:-ml-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center font-semibold">
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
        <HeroBackdrop />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="eyebrow-badge animate-rise">
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

              {/* Primary CTA is the only filled button in the hero, so
                  the eye lands on it first; secondary stays a solid,
                  bordered surface that reads clearly on cream. */}
              <div className="animate-rise delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/students" className="primary-button px-6 py-3">
                  <Search size={17} aria-hidden="true" />
                  Find students
                </Link>

                <Link to="/teams" className="secondary-button px-6 py-3">
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
