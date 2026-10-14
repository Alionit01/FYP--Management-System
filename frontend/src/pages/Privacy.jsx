import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/* Public privacy policy. Must stay readable signed-out, because a
   visitor has to be able to read it before deciding whether to create
   an account — the consent checkbox on /register links straight here.

   PLACEHOLDER: replace CONTACT_EMAIL with the real address before this
   page is published. It is the only way a student can ask for their
   account to be removed. */

const EFFECTIVE_DATE = "14 October 2026";
const CONTACT_EMAIL = "privacy@REPLACE-WITH-YOUR-ADDRESS.example";

/* Sections are data, not hand-rolled JSX, so the copy is easy to scan
   and edit without touching layout markup. */
const SECTIONS = [
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p>
          When you create an account we ask for your name, your
          university roll number, your university email address, your
          degree programme and a password. We also store whether your
          email address has been confirmed.
        </p>

        <p className="mt-3">
          Your profile is yours to fill in. These fields are all
          optional and only contain what you choose to type:
        </p>

        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Profile picture</li>
          <li>Bio</li>
          <li>GitHub and LinkedIn links</li>
          <li>WhatsApp number</li>
          <li>Skills and interests</li>
          <li>Your final-year project status</li>
        </ul>

        <p className="mt-3">
          We do not ask for your date of birth, address, national
          identity number, payment details or any other sensitive
          information.
        </p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why we collect it",
    body: (
      <>
        <p>
          FYP Finder exists to help final-year students find teammates.
          We use your information to:
        </p>

        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Create and secure your account</li>
          <li>Show you in the student directory so classmates can find you</li>
          <li>Match you to teams based on programme, skills and interests</li>
          <li>Send verification, password-reset and invitation emails</li>
        </ul>
      </>
    ),
  },
  {
    id: "who-see",
    title: "Who can see your information",
    body: (
      <>
        <p>
          This is the most important part of this policy, so it is worth
          reading carefully. Your information is <strong>not</strong>{" "}
          private by default.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-forest-900/15">
                <th className="py-2 pr-4 font-semibold text-forest-900">
                  Information
                </th>
                <th className="py-2 font-semibold text-forest-900">
                  Who can see it
                </th>
              </tr>
            </thead>

            <tbody className="align-top text-ink-soft">
              <tr className="border-b border-forest-900/8">
                <td className="py-3 pr-4">Name, roll number, programme, bio, profile picture, skills, interests, GitHub/LinkedIn links, FYP status</td>
                <td className="py-3">
                  <strong className="text-forest-900">
                    Every signed-in student
                  </strong>
                  , through the student directory
                </td>
              </tr>

              <tr className="border-b border-forest-900/8">
                <td className="py-3 pr-4">Email address, WhatsApp number</td>
                <td className="py-3">
                  Only teammates you are on a team with, and students who
                  have invited you to one
                </td>
              </tr>

              <tr className="border-b border-forest-900/8">
                <td className="py-3 pr-4">Your password</td>
                <td className="py-3">
                  Nobody. It is stored as a one-way hash and cannot be
                  read back, including by us
                </td>
              </tr>

              <tr>
                <td className="py-3 pr-4">Everything above</td>
                <td className="py-3">
                  Site administrators, who maintain the accounts
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4">
          If you do not want your profile found, the safest option is to
          leave the optional fields empty — a bare account still lists
          your name, roll number and programme.
        </p>
      </>
    ),
  },
  {
    id: "storage",
    title: "How we store it",
    body: (
      <>
        <p>
          Your information is held in a database on the server that runs
          FYP Finder. Your password is never stored in readable form.
        </p>

        <p className="mt-3">
          When you sign in we keep a login token in your browser's local
          storage so you stay signed in as you move around the site. It
          is not a cookie, it is not used to track you across other
          websites, and clearing your browser data removes it.
        </p>

        <p className="mt-3">
          We do not use advertising trackers, analytics cookies or
          third-party profiling of any kind.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <p>
        We keep your information for as long as your account exists. If
        you ask us to remove your account, we delete it and the personal
        data attached to it. Team records you contributed to may remain
        where other students are still relying on them.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>You can, at any time:</p>

        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            See and correct everything we hold about you from{" "}
            <Link to="/my-profile" className="font-semibold text-forest-800 underline-offset-4 hover:underline">
              My Profile
            </Link>
          </li>
          <li>
            Ask us to remove your account and your personal data — email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-forest-800 underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            and we will delete it
          </li>
          <li>
            Withdraw your agreement to this policy at any time, by
            contacting the same address
          </li>
        </ul>
      </>
    ),
  },
];

function Privacy() {
  return (
    <main className="page-container max-w-3xl">
      <p className="eyebrow">Your information</p>

      <h1 className="display mt-4 text-3xl sm:text-4xl text-forest-900">
        Privacy Policy
      </h1>

      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 font-medium text-forest-800">
          <ShieldCheck size={14} aria-hidden="true" />
          Effective {EFFECTIVE_DATE}
        </span>

        <span>
          Written in plain language on purpose — please read it before
          creating an account.
        </span>
      </p>

      <p className="mt-6 text-sm text-ink-soft leading-relaxed">
        This policy explains what FYP Finder collects, why we collect it,
        and who can see it. It applies to everyone who uses FYP Finder,
        including accounts created before {EFFECTIVE_DATE}.
      </p>

      {/* Short summary for people who will not read the whole page —
          it links down to the sections it summarises. */}
      <div className="card mt-6 p-5 sm:p-6">
        <h2 className="eyebrow">The short version</h2>

        <ul className="mt-4 space-y-2.5 text-sm text-ink-soft leading-relaxed">
          <li>
            <strong className="text-forest-900">We collect</strong> your
            name, roll number, university email, programme and whatever
            you choose to add to your profile.
          </li>

          <li>
            <strong className="text-forest-900">Your profile is visible</strong>{" "}
            to every other signed-in student — see{" "}
            <a href="#who-see" className="font-semibold text-forest-800 underline-offset-4 hover:underline">
              who can see your information
            </a>
            .
          </li>

          <li>
            <strong className="text-forest-900">Your password</strong> is
            stored as a one-way hash and is never readable by anyone.
          </li>

          <li>
            <strong className="text-forest-900">You can ask us to delete</strong>{" "}
            your account and everything attached to it at any time.
          </li>
        </ul>
      </div>

      <div className="mt-8">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="card mt-5 p-5 sm:p-8">
            <h2 className="display text-xl text-forest-900">
              {section.title}
            </h2>

            <div className="mt-3 text-sm text-ink-soft leading-relaxed">
              {section.body}
            </div>
          </section>
        ))}

        <section className="card mt-5 p-5 sm:p-8">
          <h2 className="display text-xl text-forest-900">
            Changes to this policy
          </h2>

          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            If we change how we handle your information we will update
            this page and move the effective date forward. Continued use
            of FYP Finder after a change means the updated policy
            applies to you. If you disagree with a change, you may
            contact us to have your account removed.
          </p>
        </section>

        <section className="card mt-5 p-5 sm:p-8">
          <h2 className="display text-xl text-forest-900">Contact</h2>

          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Questions, access requests and account-removal requests all
            go to the same place:
          </p>

          <p className="mt-3 text-sm">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-forest-800 underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>

      <p className="mt-8 text-sm text-ink-soft">
        By creating an account you confirm that you have read this
        policy and have no objection to the way we handle your
        information.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/register" className="primary-button">
          Back to registration
        </Link>

        <Link to="/" className="secondary-button">
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default Privacy;
