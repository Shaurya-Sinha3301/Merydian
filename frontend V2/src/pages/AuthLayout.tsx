import { type ReactNode } from 'react';
import { Logo } from '../ui/Logo';
import { Photo, PhotoCaption } from '../ui/Photo';
import { HERO_PHOTOS } from '../lib/photos';

interface AuthLayoutProps {
  title: ReactNode;
  lead: string;
  children: ReactNode;
}

/** Sign in and sign up share one frame: a colour field with the pitch, and the form beside it. */
export function AuthLayout({ title, lead, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-12">
      <aside className="relative min-h-[260px] lg:col-span-6 lg:min-h-0">
        <div className="absolute inset-0">
          <Photo photo={HERO_PHOTOS.tomb} alt="Humayun's Tomb in Delhi" scrim priority className="h-full w-full">
          </Photo>
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-6 text-paper sm:p-10 lg:p-14">
          <Logo light />
          <div className="py-10 lg:py-0 lg:pr-[26%]">
            <h1 className="display text-[3rem] sm:text-[4.4rem] lg:text-[5rem]">{title}</h1>
            <p className="mt-5 max-w-[34ch] text-lg font-bold">{lead}</p>
          </div>
          <PhotoCaption photo={HERO_PHOTOS.tomb} className="opacity-80" />
        </div>
      </aside>
      <main className="flex items-center bg-ground px-6 py-10 sm:px-10 lg:col-span-6 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
