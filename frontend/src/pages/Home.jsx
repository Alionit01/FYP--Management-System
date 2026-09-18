import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="pb-20 md:pb-0">

      {/* Hero */}
      <section className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-3xl">

            <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-600 mb-6">
              FYP Team Finder
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              Find the right people
              <br className="hidden sm:block" />
              for your FYP.
            </h1>

            <p className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl">
              Discover students, explore FYP teams, see what skills
              people have, and connect with the right teammates.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/students"
                className="inline-flex items-center justify-center bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
              >
                Find Students
              </Link>

              <Link
                to="/teams"
                className="inline-flex items-center justify-center border border-gray-300 bg-white px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Explore Teams
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">

          <div className="max-w-2xl mb-10">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              How it works
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Finding your team is simple.
            </h2>

            <p className="mt-3 text-gray-600">
              Everything you need to find teammates or build your
              own FYP team in one place.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center font-semibold mb-5">
                1
              </div>

              <h3 className="font-semibold text-lg">
                Find students
              </h3>

              <p className="mt-2 text-gray-600 leading-relaxed">
                Browse students by program, skills, interests,
                and FYP status.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center font-semibold mb-5">
                2
              </div>

              <h3 className="font-semibold text-lg">
                Explore teams
              </h3>

              <p className="mt-2 text-gray-600 leading-relaxed">
                See teams that are looking for members and
                understand what roles they need.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center font-semibold mb-5">
                3
              </div>

              <h3 className="font-semibold text-lg">
                Connect
              </h3>

              <p className="mt-2 text-gray-600 leading-relaxed">
                View profiles and contact the students or teams
                that are right for you.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <div className="border border-gray-200 rounded-2xl p-7 sm:p-10 md:flex md:items-center md:justify-between gap-8">

            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to find your FYP team?
              </h2>

              <p className="mt-2 text-gray-600">
                Start exploring students and teams today.
              </p>
            </div>

            <div className="mt-6 md:mt-0 shrink-0">
              <Link
                to="/teams"
                className="inline-flex items-center justify-center bg-gray-900 text-white px-5 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
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