import { CaretLeft, CaretRight, Image as ImageIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatACST } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ProofPhoto {
  id: string;
  /** Already resolved through proofPhotoUrl(). */
  url: string;
  /** Task title, or the issue note for a reported fault. */
  title: string;
  workerName: string;
  at: string | null;
}

interface PhotoStripProps {
  photos: ProofPhoto[];
  /** 72px in the shift sheet, 56px in the timesheet panel. */
  size?: 56 | 72;
  emptyLabel?: string;
}

/** Thumbnail row that opens the lightbox — the one photo-proof affordance. */
export function PhotoStrip({
  photos,
  size = 72,
  emptyLabel = 'No photos submitted.',
}: PhotoStripProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageIcon size={14} weight="duotone" aria-hidden />
        {emptyLabel}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`View photo proof — ${photo.title}`}
              className="block overflow-hidden rounded-lg border transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              style={{ width: size, height: size }}
            >
              <img
                src={photo.url}
                alt={photo.title}
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <ProofLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

interface ProofLightboxProps {
  photos: ProofPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function ProofLightbox({ photos, index, onIndexChange, onClose }: ProofLightboxProps) {
  const photo = photos[index];
  if (!photo) return null;

  const step = (delta: number) => onIndexChange((index + delta + photos.length) % photos.length);
  const multiple = photos.length > 1;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full gap-4 sm:max-w-2xl"
        onKeyDown={(event) => {
          if (!multiple) return;
          if (event.key === 'ArrowRight') step(1);
          if (event.key === 'ArrowLeft') step(-1);
        }}
      >
        <div className="flex flex-col gap-1 pr-8">
          <DialogTitle className="text-sm">{photo.title}</DialogTitle>
          <DialogDescription className="text-xs">
            {photo.workerName}
            {photo.at && <> · {formatACST(photo.at, 'EEE d MMM, h:mm a')}</>}
          </DialogDescription>
        </div>

        <div className="relative overflow-hidden rounded-lg border bg-muted/40">
          <img
            src={photo.url}
            alt={photo.title}
            className="max-h-[62vh] w-full bg-card object-contain"
          />
          {multiple && (
            <>
              <LightboxNav side="left" onClick={() => step(-1)} />
              <LightboxNav side="right" onClick={() => step(1)} />
            </>
          )}
        </div>

        {multiple && (
          <p className="text-center text-xs text-muted-foreground tabular-nums">
            {index + 1} of {photos.length}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LightboxNav({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? CaretLeft : CaretRight;
  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur',
        side === 'left' ? 'left-2' : 'right-2',
      )}
      onClick={onClick}
    >
      <Icon size={14} aria-hidden />
    </Button>
  );
}
