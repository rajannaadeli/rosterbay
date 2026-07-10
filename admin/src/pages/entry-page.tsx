import { DeviceMobile, UserGear } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSignInAsAdmin } from '@/features/auth/hooks';

export function EntryPage() {
  const navigate = useNavigate();
  const signIn = useSignInAsAdmin();
  const [workerNoteOpen, setWorkerNoteOpen] = useState(false);

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

        <Dialog open={workerNoteOpen} onOpenChange={setWorkerNoteOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="lg" className="h-12 text-base">
                <DeviceMobile size={20} weight="duotone" aria-hidden />
                Explore as Worker (Liam)
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>The worker experience lives in the mobile app</DialogTitle>
              <DialogDescription>
                Liam&apos;s side of RosterBay — Today, Schedule, Offers and the document Wallet —
                runs in the Expo worker app. Open the mobile project and tap &ldquo;Use demo
                worker&rdquo; to sign in as Liam Nguyen. A hosted phone-frame web version arrives
                in a later phase of this demo.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {signIn.isError && (
          <p role="alert" className="text-center text-sm text-danger">
            Couldn&apos;t sign in — has the database been seeded yet?
          </p>
        )}
      </div>

      <footer className="fixed bottom-5 text-center text-xs text-muted-foreground">
        RosterBay is a demonstration platform built by Rajesh Adeli — full-stack developer
        specialising in workforce management software.
      </footer>
    </div>
  );
}
