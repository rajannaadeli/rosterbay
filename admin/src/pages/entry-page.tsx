import { DeviceMobile, DownloadSimple, UserGear } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';

import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { useSignInAsAdmin } from '@/features/auth/hooks';

const APK_URL = import.meta.env.VITE_APK_URL ?? '';
const PORTFOLIO_URL = import.meta.env.VITE_PORTFOLIO_URL ?? 'https://rajanna.dev';
const UPWORK_URL = import.meta.env.VITE_UPWORK_URL ?? '#';

export function EntryPage() {
  const navigate = useNavigate();
  const signIn = useSignInAsAdmin();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 px-6">
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

        <a
          href={APK_URL || '#'}
          aria-disabled={APK_URL === ''}
          className="inline-flex items-center justify-center gap-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={(event) => {
            if (APK_URL === '') event.preventDefault();
          }}
        >
          <DownloadSimple size={15} aria-hidden />
          Install the worker app (APK{APK_URL === '' ? ' — coming soon' : ''})
        </a>
      </div>

      <footer className="fixed bottom-5 flex flex-col items-center gap-0.5 px-6 text-center text-xs text-muted-foreground">
        <p>
          RosterBay is a demonstration platform built by Rajanna Adeli — full-stack developer
          specialising in workforce management software.
        </p>
        <p className="flex gap-3">
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
