import { X } from '@phosphor-icons/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DEMO_BANNER_TEXT } from '@/lib/demo';

const STORAGE_KEY = 'rosterbay-demo-banner-dismissed';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-primary/5 px-4 py-2 text-sm text-foreground">
      <p>{DEMO_BANNER_TEXT}</p>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss demo banner"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, '1');
          setDismissed(true);
        }}
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
