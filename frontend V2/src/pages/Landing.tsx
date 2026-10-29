import { Link } from 'react-router-dom';
import { ButtonLink } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { Photo, Bands, PhotoCaption } from '../ui/Photo';
import { SwapBars } from '../features/changes/SwapBars';
import { PlanPreview } from '../features/landing/PlanPreview';
import { PlacesStrip } from '../features/landing/PlacesStrip';
import { HERO_PHOTOS } from '../lib/photos';
import { ROUTES } from '../constants/routes';

const steps = [
  {
    span: 'lg:col-span-5',
    bar: 'bg-cyan text-ink',
    title: 'Say what to change',
    body: 'Write it the way you would say it out loud: the kids are tired, add something outdoors.',
  },
  {
    span: 'lg:col-span-4',
    bar: 'bg-yellow text-ink',
    title: 'Agents re-plan',
    body: 'An AI agent turns the message into constraints and the optimizer builds the new itinerary.',
  },
  {
    span: 'lg:col-span-3',
    bar: 'bg-green text-ink',
    title: 'A person approves',
    body: 'A travel agent compares the options and approves one. Nothing is final without them.',
  },
];

export function Landing() {
  return (
    <div className="bg-ground">
      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-5">
          <a href="#how" className="hidden text-sm font-bold underline-offset-4 hover:underline md:inline">
            How it works
          </a>
          <a href="#places" className="hidden text-sm font-bold underline-offset-4 hover:underline md:inline">
            Places
          </a>
          <Link to={ROUTES.LOGIN} className="text-sm font-bold underline underline-offset-4 decoration-2">
            Sign in
          </Link>
          <Link to={ROUTES.SIGNUP} className="hidden text-sm font-bold underline underline-offset-4 decoration-2 sm:inline">
            Sign up
          </Link>
          <ButtonLink to={ROUTES.DEMO} variant="cyan">
            Explore the demo
          </ButtonLink>
        </nav>
      </header>

      {/* Hero: copy on the ground, a photograph bleeding off the right edge under the colour bands */}
      <section className="grid lg:grid-cols-[minmax(0,5fr)_7fr]">
        <div className="flex flex-col justify-center px-4 py-10 sm:px-6 lg:py-16 lg:pl-[max(1.5rem,calc((100vw-1200px)/2+1.5rem))] lg:pr-10">
          <h1 className="display text-[3.2rem] sm:text-[4.4rem] lg:text-[5rem]">
            Plans that <span className="mark mark-cyan">explain</span> their own{' '}
            <span className="mark mark-yellow">changes</span>.
          </h1>
          <p className="mt-6 max-w-[40ch] text-lg text-ink-2">
            Merydian re-plans a group trip when feedback arrives, then shows exactly what moved and why.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink to={ROUTES.DEMO} size="lg">
              Explore the demo
            </ButtonLink>
            <ButtonLink to={ROUTES.SIGNUP} variant="quiet">
              Create an account
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-ink-3">The demo uses synthetic trips. An agent approves every change.</p>
        </div>

        <div className="relative min-h-[360px] sm:min-h-[460px] lg:min-h-[560px]">
          <div className="absolute inset-0 lg:rounded-bl-[3rem] overflow-hidden">
            <Photo
              photo={HERO_PHOTOS.fort}
              alt="The Red Fort in Delhi, seen across its lawn"
              priority
              className="h-full w-full"
            >
              <Bands width="44%" />
            </Photo>
          </div>
          <div className="absolute bottom-4 left-4 w-[min(24rem,calc(100%-2rem))] rounded-2xl bg-paper p-4 shadow-[var(--shadow-lift)] sm:bottom-8 sm:left-8">
            <p className="mb-3 flex items-center justify-between gap-3 text-sm font-extrabold">
              <span>Day 3, version 1 to 2</span>
              <span className="text-xs font-bold text-ink-3">Sample</span>
            </p>
            <SwapBars
              before={{ title: 'National Museum', start: 14 * 60, end: 16 * 60 }}
              after={{ title: 'Garden of Five Senses', start: 14 * 60, end: 15 * 60 + 30 }}
            />
          </div>
          <PhotoCaption photo={HERO_PHOTOS.fort} className="absolute bottom-2 right-3 hidden text-paper/80 lg:block" />
        </div>
      </section>

      {/* A real plan view, sample data */}
      <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="preview">
        <h2 id="preview" className="title max-w-[22ch] text-4xl sm:text-5xl">
          See the plan the way a traveller does.
        </h2>
        <p className="mt-3 max-w-[56ch] text-lg text-ink-2">
          Days, stops with photos, a map, what the new version changed, and the reason for each change.
        </p>
        <div className="mt-8">
          <PlanPreview />
        </div>
      </section>

      <section id="how" className="border-t-4 border-ink bg-panel">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
          <h2 className="title max-w-[18ch] text-4xl sm:text-5xl">One message in. One explained plan out.</h2>
          <div className="mt-8 grid gap-3 lg:grid-cols-12">
            {steps.map((s) => (
              <div key={s.title} className={`${s.span} ${s.bar} flex min-h-44 flex-col justify-between rounded-2xl p-5 sm:p-6`}>
                <h3 className="display text-4xl sm:text-5xl lg:text-[2.3rem] xl:text-[2.7rem]">{s.title}</h3>
                <p className="mt-8 max-w-[34ch] font-bold">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="places" className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="title max-w-[20ch] text-4xl sm:text-5xl">Real places, drawn from real coordinates.</h2>
        <p className="mt-3 max-w-[56ch] text-lg text-ink-2">
          The demo trips visit twenty Delhi stops. Routes and maps use their actual positions.
        </p>
        <div className="mt-8">
          <PlacesStrip />
        </div>
        <p className="mt-3 text-sm text-ink-3">
          Photographs from Wikimedia Commons.{' '}
          <Link to="/credits" className="font-bold text-ink underline underline-offset-4">
            Credits and licences
          </Link>
        </p>
      </section>

      <section className="border-t-4 border-ink">
        <div className="mx-auto grid max-w-[1200px] gap-3 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-12">
          <div className="flex min-h-72 flex-col justify-between rounded-2xl bg-ink p-6 text-paper sm:p-8 lg:col-span-7 lg:row-span-2">
            <h2 className="display text-5xl sm:text-6xl lg:text-7xl">Nothing is final without a person.</h2>
            <p className="mt-8 max-w-[46ch] text-lg">
              The AI proposes. A travel agent compares the options against the current plan and approves one before
              anything moves forward.
            </p>
          </div>
          <div className="flex min-h-40 flex-col justify-between rounded-2xl bg-cyan p-5 sm:p-6 lg:col-span-5">
            <h3 className="title text-3xl">Plain-language feedback</h3>
            <p className="mt-6 max-w-[40ch] font-bold">No forms. Write what you want, the way you would say it.</p>
          </div>
          <div className="flex min-h-40 flex-col justify-between rounded-2xl bg-yellow p-5 sm:p-6 lg:col-span-5">
            <h3 className="title text-3xl">Live progress</h3>
            <div className="mt-6 grid grid-cols-4 gap-1.5" aria-hidden>
              <span className="block h-3 rounded-sm bg-green" />
              <span className="block h-3 rounded-sm bg-green" />
              <span className="block h-3 animate-pulse rounded-sm bg-ink" />
              <span className="block h-3 rounded-sm bg-ink/25" />
            </div>
            <p className="mt-3 font-bold">Watch the plan being re-made, step by step.</p>
          </div>
          <div className="flex min-h-40 flex-col justify-between rounded-2xl bg-green p-5 sm:p-6 lg:col-span-4">
            <h3 className="title text-3xl">Reasons attached</h3>
            <p className="mt-6 font-bold">Every added or dropped stop says why it changed.</p>
          </div>
          <div className="flex min-h-40 flex-col justify-between rounded-2xl bg-magenta p-5 text-paper sm:p-6 lg:col-span-4">
            <h3 className="title text-3xl">Nothing hidden</h3>
            <p className="mt-6 font-bold">Dropped stops stay visible, struck out, beside what replaced them.</p>
          </div>
          <div className="flex min-h-40 flex-col justify-between rounded-2xl bg-paper p-5 shadow-[var(--shadow-card)] sm:p-6 lg:col-span-4">
            <h3 className="title text-3xl">Real geography</h3>
            <p className="mt-6 text-ink-2">Routes are drawn from the actual coordinates of every stop.</p>
          </div>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-4 py-12 sm:px-6 sm:py-14">
          <h2 className="display text-5xl sm:text-7xl">See it re-plan.</h2>
          <ButtonLink to={ROUTES.DEMO} variant="cyan" size="lg">
            Explore the demo
          </ButtonLink>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-3 sm:px-6">
        <p>Merydian is an academic project. Every trip, name and number in the demo is synthetic.</p>
        <nav aria-label="Footer" className="flex gap-5 font-bold text-ink">
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
