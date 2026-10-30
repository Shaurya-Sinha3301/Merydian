import { Link } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { PHOTO_CREDITS } from '../data/photoCredits';
import { useTitle } from '../lib/useTitle';

export function Credits() {
  useTitle('Photo credits');
  return (
    <div className="min-h-dvh bg-ground">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link to="/" className="text-sm font-bold underline underline-offset-4 decoration-2">
          Back to home
        </Link>
      </header>
      <main className="border-t-2 border-ink">
        <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="display text-[2.8rem] sm:text-[4.2rem]">Photo credits.</h1>
          <p className="mt-4 max-w-[62ch] text-lg text-ink-2">
            Every photograph in Merydian comes from Wikimedia Commons and is used under the licence shown. The images are
            resized, and cropped by the layout. Each is shared under the same licence.
          </p>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {PHOTO_CREDITS.map((c) => (
              <li key={c.id} className="flex gap-4 rounded-2xl bg-paper p-3 shadow-[var(--shadow-card)]">
                <img src={c.file} alt="" loading="lazy" className="h-24 w-32 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold">{c.name}</h2>
                  <p className="text-sm text-ink-2">By {c.author}</p>
                  <p className="mt-1 text-sm">
                    <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">
                      {c.license}
                    </a>
                    {' · '}
                    <a href={c.source} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">
                      Source on Commons
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
