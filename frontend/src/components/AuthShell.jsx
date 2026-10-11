/* Shared shell for the small, single-purpose auth screens
   (forgot / reset / verify): centred heading above a single card. */
function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <main className="min-h-[calc(100vh-56px)] md:min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 pb-24 md:pb-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="eyebrow justify-center">{eyebrow}</p>

          <h1 className="display mt-4 text-3xl sm:text-4xl text-forest-900">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-3 text-ink-soft leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}

export default AuthShell;
