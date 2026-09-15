function Home() {
  return (
    <main className="min-h-screen pb-20 md:pb-0">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-gray-500 mb-4">
            Final Year Project Team Finder
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Find the right people for your FYP.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed">
            Discover students, explore their skills, and find
            Final Year Project teams looking for members.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href="/students"
              className="w-full sm:w-auto text-center bg-black text-white px-6 py-3 rounded-xl font-medium"
            >
              Find Students
            </a>

            <a
              href="/teams"
              className="w-full sm:w-auto text-center border px-6 py-3 rounded-xl font-medium"
            >
              Explore Teams
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;