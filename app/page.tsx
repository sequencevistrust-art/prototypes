import Link from "next/link";

const prototypes = [
  {
    href: "/explain",
    number: "1",
    title: "Generating agentic insights in chat applications",
  },
  {
    href: "/fact-checking",
    number: "2",
    title: "Automated fact checking in chat applications",
  },
  {
    href: "/explore",
    number: "3",
    title: "Tracing analytic provenance in AI-assisted visual data analysis systems",
  },
];

const supplementary = [
  {
    href: "https://github.com/sequencevistrust-art/prototypes",
    title: "Code for the three prototypes",
  },
  {
    href: "https://github.com/sequencevistrust-art/prototypes/blob/main/app/api/explain/system-prompt.ts",
    title: "Insight generation system prompt",
  },
  {
    href: "https://github.com/sequencevistrust-art/prototypes/blob/main/app/api/fact-checking/system-prompt.ts",
    title: "Fact checking system prompt",
  },
  {
    href: "https://github.com/sequencevistrust-art/supplementary/tree/main/tech-eval",
    title: "Technical evaluation",
  },
  {
    href: "https://github.com/sequencevistrust-art/supplementary/tree/main/crowd-exp",
    title: "Two crowd experiments",
  },
  {
    href: "https://github.com/sequencevistrust-art/supplementary/tree/main/lab-study",
    title: "Lab study",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-xl w-full px-8 py-16">
        <div className="mb-10">
          <h1 className="text-[22px] font-semibold leading-snug text-gray-900">
            Explainable Agentic Insights at a Subsentence Level
          </h1>
          <p className="text-[15px] text-gray-400 mt-1">Technique and Evaluations</p>
        </div>

        <div className="border-t border-gray-200 pt-8 mb-10">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-5">
            Prototypes
          </h2>
          <div className="space-y-3">
            {prototypes.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group flex items-start gap-4 rounded-lg bg-white border border-gray-200 px-5 py-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
              >
                <span className="text-[13px] font-semibold text-gray-300 mt-px">
                  {p.number}
                </span>
                <span className="text-[14px] text-gray-700 group-hover:text-gray-900 leading-snug">
                  {p.title}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-5">
            Supplementary Materials
          </h2>
          <div className="space-y-3">
            {supplementary.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-lg bg-white border border-gray-200 px-5 py-3.5 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
              >
                <span className="text-[14px] text-gray-700 group-hover:text-gray-900">
                  {s.title}
                </span>
                <svg
                  className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 ml-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
