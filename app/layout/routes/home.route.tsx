/**
 * Landing page.
 *
 * Doubles as a build status board during development: each of the five stages is
 * listed with what it will do and whether it is live yet. Honest about what is
 * not built, which is cheaper than explaining a mysteriously empty screen.
 */
import { Link } from "react-router";

const STAGES = [
  {
    name: "Self-help",
    description: "Answers policy questions from indexed documents, with citations.",
    phase: "Phase 2–4",
    ready: false,
  },
  {
    name: "Issue diagnosis",
    description: "Reads an attached screenshot, quotes the error, suggests fixes.",
    phase: "Phase 4",
    ready: false,
  },
  {
    name: "Problem resolution",
    description: "Files a real Azure DevOps work item, with your agreement.",
    phase: "Phase 5",
    ready: false,
  },
  {
    name: "Support assignment",
    description: "Names an engineer with the right skills who is actually available.",
    phase: "Phase 5",
    ready: false,
  },
  {
    name: "Continuous improvement",
    description: "Deflection rate, recurring issues, and gaps in the knowledge base.",
    phase: "Phase 5",
    ready: false,
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Customer Service</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          An assistant for workplace IT and HR questions. Ask it something, show it
          an error, and it will either solve the problem or get it to the right person.
        </p>
        <Link
          to="/chat"
          className="mt-5 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Start a conversation
        </Link>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-900">Capabilities</h2>
        <ul className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {STAGES.map((stage) => (
            <li key={stage.name} className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{stage.name}</p>
                <p className="mt-0.5 text-sm text-slate-600">{stage.description}</p>
              </div>
              <span
                className={
                  stage.ready
                    ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    : "shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                }
              >
                {stage.ready ? "Live" : stage.phase}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
