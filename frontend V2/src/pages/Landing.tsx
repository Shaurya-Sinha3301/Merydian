import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { Photo, PhotoCaption } from '../ui/Photo';
import { PlanPreview } from '../features/landing/PlanPreview';
import { AgentPreview } from '../features/landing/AgentPreview';
import { PlacesStrip } from '../features/landing/PlacesStrip';
import { HERO_PHOTOS } from '../lib/photos';
import { useLandingMotion } from '../lib/motion';
import { ROUTES } from '../constants/routes';

const STEPS = [
  { n: 'I', title: 'Say what to change', body: 'Write it the way you would say it out loud: the kids are tired, add something outdoors.' },
  { n: 'II', title: 'Agents re-plan', body: 'An AI agent turns the message into constraints and the optimizer builds the new itinerary.' },
  { n: 'III', title: 'A person approves', body: 'A travel agent compares the options against the current plan and approves one. Nothing is final without them.' },
];

const SPEC: Array<[string, string]> = [
  ['Plain-language feedback', 'No forms. Write what you want, the way you would say it.'],
  ['Live progress', 'Watch the plan being re-made, step by step, from reading the message to writing the reasons.'],
  ['Reasons attached', 'Every added or withdrawn stop says why it changed, with the factors behind it.'],
  ['Nothing hidden', 'Withdrawn stops stay visible, struck through, beside what replaced them.'],
  ['Real geography', 'Maps and routes use the actual coordinates of every stop.'],
  ['One trip, two views', 'Agent and traveller read the same plan and the same version history.'],
  ['Cost and fit per version', 'Each version prints its cost and its fit against the one before.'],
  ['A person in the loop', 'The agent chooses between options. The system never books on its own.'],
];

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useLandingMotion(root);

  return (
    <div ref={root} className="bg-ground">
      <div className="border-b-2 border-ink bg-paper">
        <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-5 text-sm font-semibold">
            <a href="#traveller" className="hidden hover:underline underline-offset-4 md:inline">
              Traveller
            </a>
            <a href="#agent" className="hidden hover:underline underline-offset-4 md:inline">
              Agent
            </a>
            <a href="#places" className="hidden hover:underline underline-offset-4 md:inline">
              Places
            </a>
            <Link to={ROUTES.LOGIN} className="underline underline-offset-4">
              Sign in
            </Link>
            <Link to={ROUTES.SIGNUP} className="hidden underline underline-offset-4 sm:inline">
              Sign up
            </Link>
            <ButtonLink to={ROUTES.DEMO} variant="cyan">
              Explore the demo
            </ButtonLink>
          </nav>
        </header>
      </div>

      {/* Hero: the title page of a timetable, with a photograph plate and a real map */}
      <section className="mx-auto grid max-w-[1240px] gap-x-8 gap-y-6 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-8">
        <div className="flex flex-col justify-center lg:col-span-7">
          <h1 className="display text-[2.7rem] sm:text-[3.6rem] lg:text-[4.2rem]">
            <span className="block overflow-hidden pb-1">
              <span className="block" data-line>
                Plans that explain
              </span>
            </span>
            <span className="block overflow-hidden pb-1">
              <span className="block" data-line>
                their own <span className="mark mark-magenta">changes</span>.
              </span>
            </span>
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg text-ink-2" data-fade>
            Merydian re-plans a group trip when feedback arrives, then prints exactly what moved and why, in a timetable
            both the travellers and the travel agent can read.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3" data-fade>
            <ButtonLink to={ROUTES.DEMO} size="lg">
              Explore the demo
            </ButtonLink>
            <ButtonLink to={ROUTES.SIGNUP} variant="quiet">
              Create an account
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-ink-3" data-fade>
            The demo uses synthetic trips. An agent approves every change.
          </p>
        </div>

        <figure className="self-center border border-rule bg-paper p-1.5 lg:col-span-5" data-unmask-host>
          <div className="relative aspect-[16/8] overflow-hidden" data-unmask>
            <div data-parallax="9" className="absolute inset-x-0 -top-[10%] h-[120%]">
              <Photo photo={HERO_PHOTOS.fort} alt="The Red Fort in Delhi, seen across its lawn" priority className="h-full w-full" />
            </div>
          </div>
          <figcaption className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[11px] text-ink-3">
            <span className="font-semibold text-ink-2">Red Fort, Old Delhi</span>
            <PhotoCaption photo={HERO_PHOTOS.fort} />
          </figcaption>
        </figure>
      </section>

      <section id="traveller" className="border-t-2 border-ink bg-paper">
        <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
          <div data-rise>
            <PlanPreview />
          </div>
        </div>
      </section>

      <section id="agent" className="border-t-2 border-ink">
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="title max-w-[26ch] text-3xl sm:text-4xl">The agent runs the whole desk.</h2>
          <p className="mt-2 max-w-[62ch] text-ink-2">
            Requests waiting, plan value, cost by trip and a calendar of departures, then a side-by-side comparison of
            the options before anything is approved.
          </p>
          <div className="mt-6" data-rise>
            <AgentPreview />
          </div>
        </div>
      </section>

      <section className="border-t-2 border-ink bg-paper">
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="title text-3xl sm:text-4xl">One message in. One explained plan out.</h2>
          <ol className="mt-6 grid border-t-2 border-ink md:grid-cols-3 md:divide-x md:divide-rule">
            {STEPS.map((s) => (
              <li key={s.n} className="border-b border-rule py-5 md:border-b-0 md:px-6 md:first:pl-0" data-rise>
                <h3 className="title text-2xl">{s.n}. {s.title}</h3>
                <p className="mt-2 max-w-[40ch] text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="places" className="border-t-2 border-ink">
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="title text-3xl sm:text-4xl">Real places, plotted from real coordinates.</h2>
          <p className="mt-2 max-w-[62ch] text-ink-2">
            The demo trips visit twenty-one Delhi stops. Photographs are from Wikimedia Commons and carry their credit.
          </p>
          <div className="mt-6">
            <PlacesStrip />
          </div>
          <p className="mt-3 text-sm text-ink-3">
            <Link to="/credits" className="font-semibold text-ink underline underline-offset-4">
              Credits and licences
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t-2 border-ink bg-paper">
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="title text-3xl sm:text-4xl">What the platform does</h2>
          <dl className="mt-6 grid border-t-2 border-ink md:grid-cols-2 md:gap-x-10">
            {SPEC.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[12rem_1fr] gap-x-4 border-b border-rule py-3" data-row>
                <dt className="font-semibold">{k}</dt>
                <dd className="text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6">
          <h2 className="display text-4xl sm:text-6xl">Nothing is final without a person.</h2>
          <ButtonLink to={ROUTES.DEMO} variant="outline" size="lg">
            Explore the demo
          </ButtonLink>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-3 sm:px-6">
        <p>Merydian is an academic project. Every trip, name and number in the demo is synthetic.</p>
        <nav aria-label="Footer" className="flex gap-5 font-semibold text-ink">
          <Link to="/credits" className="underline underline-offset-4">
            Photo credits
          </Link>
          <Link to={ROUTES.LOGIN} className="underline underline-offset-4">
            Sign in
          </Link>
        </nav>
      </footer>
    </div>
  );
}
