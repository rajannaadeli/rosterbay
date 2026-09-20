import { DeviceMobile, DownloadSimple, UserGear } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';

import { BrowserFrame } from '@/components/browser-frame';
import { LiveRelativeTime } from '@/components/live-relative-time';
import { useTheme } from '@/components/theme-provider';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { useSignInAsAdmin } from '@/features/auth/hooks';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useWorkerAppRelease } from '@/features/release/hooks';
import { APK_DOWNLOAD_PATH } from '@/lib/release-target';

// A permanent path, not a per-build artifact URL: CI republishes the APK to the
// same release tag on every mobile change, so this link is always the newest
// build without anyone editing an env var. `VITE_APK_URL` still overrides it.
const APK_URL = import.meta.env.VITE_APK_URL || APK_DOWNLOAD_PATH;
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL ?? 'https://rajanna.dev';
const UPWORK_URL = import.meta.env.VITE_UPWORK_URL ?? '#';

/** `sm` and up, and tall enough for the hero to be worth drawing. */
const HERO_MQ = '(min-width: 40rem) and (min-height: 34rem)';

export function EntryPage() {
  const navigate = useNavigate();
  const signIn = useSignInAsAdmin();
  const apk = useWorkerAppRelease();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  // Rendered conditionally rather than hidden with `hidden sm:block`, for two
  // reasons. The shots are ~1200px wide and there are two of them (one per
  // theme, stacked for an instant crossfade), and `display: none` stops them
  // being *seen* on a phone but not from being fetched — which is the entire
  // cost. And the query tests height as well as width: the hero is capped at
  // 46dvh, so a landscape phone gets ~165px of which 34px is browser chrome,
  // and a 130px sliver of screenshot reads as a broken image rather than as a
  // page continuing below the fold.
  const showHero = useMediaQuery(HERO_MQ);

  return (
    <div className="px-safe [--safe-pad:1rem] sm:[--safe-pad:1.5rem] relative flex min-h-dvh flex-col overflow-hidden pt-10 pb-8 sm:pt-14 sm:pb-10">
      {/* Accent-derived wash. Two soft radials rather than a linear gradient:
          a linear ramp reads as a template background, where an off-centre
          glow reads as light falling on something. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(70rem 40rem at 18% -10%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 60%),' +
            'radial-gradient(50rem 30rem at 92% 8%, color-mix(in oklab, var(--accent) 9%, transparent), transparent 55%)',
        }}
      />
      {/* Ghosted wordmark behind the hero, as in the reference grammar. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 left-1/2 -z-10 -translate-x-1/2 text-[clamp(6rem,18vw,16rem)] leading-none font-bold tracking-[-0.05em] text-foreground/[0.03] select-none"
      >
        ROSTERBAY
      </span>

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 sm:gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Wordmark className="text-2xl sm:text-3xl" iconSize={30} />
        <p className="max-w-md text-balance text-muted-foreground">
          Roster, verify, and track your field workforce.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button
          size="lg"
          className="h-12 text-base whitespace-normal coarse:h-12"
          disabled={signIn.isPending}
          onClick={() => {
            signIn.mutate(undefined, { onSuccess: () => void navigate('/app') });
          }}
        >
          <UserGear size={20} weight="duotone" aria-hidden />
          {signIn.isPending ? 'Signing in…' : 'Explore as Agency Admin'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          // `h-auto min-h-12` + wrapping: at 320px this label is two lines,
          // and a fixed-height button would clip its own second line.
          // `coarse:h-auto` is load-bearing — tailwind-merge drops the size
          // variant's `h-10` in favour of `h-auto`, but leaves its
          // `coarse:h-11` standing, and that sorts last. Without this the
          // button is 44px tall on exactly the screens where it wraps.
          className="h-auto min-h-12 py-2 text-center text-base whitespace-normal coarse:h-auto"
          onClick={() => void navigate('/worker')}
        >
          <DeviceMobile size={20} weight="duotone" aria-hidden />
          Explore as Worker (Liam, Security Guard)
        </Button>

        {signIn.isError && (
          <p role="alert" className="text-center text-sm text-danger">
            Couldn&apos;t sign in — has the database been seeded yet?
          </p>
        )}

        {/* Android only, and said so — a link that installs nothing on the
            iPhone in someone's hand is worse than no link. */}
        <div className="flex flex-col items-center gap-0.5 py-1">
          <a
            href={APK_URL}
            className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <DownloadSimple size={15} aria-hidden />
            Install the worker app (Android APK)
          </a>
          {/* The build stamp is the whole point: it says out loud that this
              file tracks the deploy rather than being a one-off upload. Absent
              until GitHub answers, so the link never waits on it. */}
          {apk.data && (
            <p className="text-micro tracking-normal text-text-tertiary">
              <span className="num">{(apk.data.sizeBytes / 1_048_576).toFixed(1)} MB</span>
              {' · built '}
              <LiveRelativeTime at={apk.data.updatedAt} className="text-text-tertiary" />
            </p>
          )}
        </div>
      </div>

      {/* The product itself, tilted just enough to read as an object on a
          surface rather than a flat inline image. Skipped on small or short
          viewports (see `showHero`) — at phone width the frame would be
          illegible and the buttons are the point there.

          Both light and dark hero screenshots are always rendered and stacked;
          only opacity toggles, so the crossfade is instant on switch with no
          image-load flash. The `will-change` hint lets the compositor keep
          both layers on the GPU so the 500 ms fade can't jank. */}
      {showHero && (
      <div className="max-h-[46dvh] w-full overflow-hidden [perspective:1800px]">
        <div className="relative origin-top transition-transform duration-[600ms] ease-[var(--ease-out)] [transform:rotateX(7deg)_rotateZ(-0.6deg)_scale(0.97)] hover:[transform:rotateX(0deg)_rotateZ(0deg)_scale(1)]">
          <BrowserFrame
            src="/hero-roster.png"
            alt="The RosterBay roster in day view — light theme."
            className={`transition-opacity duration-500 ease-in-out will-change-[opacity] ${
              isDark ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <BrowserFrame
            src="/hero-roster-dark.png"
            alt="The RosterBay roster in day view — dark theme."
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out will-change-[opacity] ${
              isDark ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>
      )}
      </div>

      {/* Not fixed: the page scrolls now that the hero shot is below the
          fold, and a pinned footer sat on top of it. */}
      <footer className="pb-safe [--safe-pad:0.5rem] mx-auto mt-10 flex max-w-2xl flex-col items-center gap-1 text-center text-small text-text-secondary sm:mt-14">
        <p>
          RosterBay is a demonstration platform built by Rajanna Adeli — full-stack developer
          specialising in workforce management software.
        </p>
        <p className="flex gap-4">
          <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            rajanna.dev
          </a>
          <a href={UPWORK_URL} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            Upwork profile
          </a>
        </p>
      </footer>
    </div>
  );
}
