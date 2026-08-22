import { DeviceMobile, DownloadSimple, UserGear } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';

import { BrowserFrame } from '@/components/browser-frame';
import { LiveRelativeTime } from '@/components/live-relative-time';
import { useTheme } from '@/components/theme-provider';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { useSignInAsAdmin } from '@/features/auth/hooks';
import { useWorkerAppRelease } from '@/features/release/hooks';
import { APK_DOWNLOAD_PATH } from '@/lib/release-target';

// A permanent path, not a per-build artifact URL: CI republishes the APK to the
// same release tag on every mobile change, so this link is always the newest
// build without anyone editing an env var. `VITE_APK_URL` still overrides it.
const APK_URL = import.meta.env.VITE_APK_URL || APK_DOWNLOAD_PATH;
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL ?? 'https://rajanna.dev';
const UPWORK_URL = import.meta.env.VITE_UPWORK_URL ?? '#';

export function EntryPage() {
  const navigate = useNavigate();
  const signIn = useSignInAsAdmin();
  const apk = useWorkerAppRelease();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden px-6 pt-14 pb-10">
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

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Wordmark className="text-3xl" iconSize={34} />
        <p className="max-w-md text-balance text-muted-foreground">
          Roster, verify, and track your field workforce.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button
          size="lg"
          className="h-12 text-base"
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
          className="h-12 text-base"
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
          surface rather than a flat inline image. Hidden below `sm` — at
          phone width the frame would be illegible and the buttons are the
          point there.

          Both light and dark hero screenshots are always rendered and stacked;
          only opacity toggles, so the crossfade is instant on switch with no
          image-load flash. The `will-change` hint lets the compositor keep
          both layers on the GPU so the 500 ms fade can't jank. */}
      <div className="hidden max-h-[46vh] w-full overflow-hidden [perspective:1800px] sm:block">
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
      </div>

      {/* Not fixed: the page scrolls now that the hero shot is below the
          fold, and a pinned footer sat on top of it. */}
      <footer className="mx-auto mt-14 flex max-w-2xl flex-col items-center gap-1 px-6 text-center text-small text-text-secondary">
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
