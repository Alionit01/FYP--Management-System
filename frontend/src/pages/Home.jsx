import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="pb-20 md:pb-0">

      {/* Hero */}
      <section className="border-b border-zinc-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-3xl">

            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-500 mb-6">
              FYP Team Finder
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Find the right people
              <br className="hidden sm:block" />
              for your FYP.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-zinc-600 leading-relaxed max-w-2xl">
              Discover students, explore FYP teams, see what skills
              people have, and connect with the right teammates.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/students"
                className="primary-button !px-6 !py-3"
              >
                Find Students
              </Link>

              <Link
                to="/teams"
                className="secondary-button !px-6 !py-3"
              >
                Explore Teams
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">

          <div className="max-w-2xl mb-10">
            <p className="eyebrow">
              How it works
            </p>

            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
              Finding your team is simple.
            </h2>

            <p className="mt-3 text-zinc-600 leading-relaxed">
              Everything you need to find teammates or build your
              own FYP team in one place.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">

            <div className="card p-6">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold mb-5">
                1
              </div>

              <h3 className="font-semibold text-lg text-zinc-900">
                Find students
              </h3>

              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                Browse students by program, skills, interests,
                and FYP status.
              </p>
            </div>

            <div className="card p-6">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold mb-5">
                2
              </div>

              <h3 className="font-semibold text-lg text-zinc-900">
                Explore teams
              </h3>

              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                See teams that are looking for members and
                understand what roles they need.
              </p>
            </div>

            <div className="card p-6">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold mb-5">
                3
              </div>

              <h3 className="font-semibold text-lg text-zinc-900">
                Connect
              </h3>

              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                View profiles and contact the students or teams
                that are right for you.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-50 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="card p-7 sm:p-10 md:flex md:items-center md:justify-between gap-8 shadow-md">

            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to find your FYP team?
              </h2>

              <p className="mt-2 text-zinc-600">
                Start exploring students and teams today.
              </p>
            </div>

            <div className="mt-6 md:mt-0 shrink-0">
              <Link
                to="/teams"
                className="primary-button !px-6 !py-3"
              >
                Explore Teams
              </Link>
            </div>

          </div>
        </div>
      </section>

    </main>
  );
}

export default Home;