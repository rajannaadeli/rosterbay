import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, UploadSimple } from '@phosphor-icons/react';
import { addMonths, format } from 'date-fns';
import { useState, type DragEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUploadCert } from '@/features/workers/hooks';
import type { Tables } from '@/lib/database.types';
import { cn } from '@/lib/utils';

const certUploadSchema = z.object({
  cert_type_id: z.string().min(1, 'Choose a certificate type'),
  issued_on: z.string().min(1, 'Issue date is required'),
  expires_on: z.string().min(1, 'Expiry date is required'),
});

type CertUploadValues = z.infer<typeof certUploadSchema>;

interface CertUploadFormProps {
  workerId: string;
  companyId: string;
  certTypes: Tables<'cert_types'>[];
  onClose: () => void;
}

/**
 * Inline "Add document" form — renders inside the drawer's Documents tab
 * instead of opening a separate modal dialog.
 */
export function CertUploadForm({
  workerId,
  companyId,
  certTypes,
  onClose,
}: CertUploadFormProps) {
  const upload = useUploadCert();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const form = useForm<CertUploadValues>({
    resolver: zodResolver(certUploadSchema),
    defaultValues: {
      cert_type_id: '',
      issued_on: format(new Date(), 'yyyy-MM-dd'),
      expires_on: '',
    },
  });

  const certTypeId = useWatch({ control: form.control, name: 'cert_type_id' });

  const onCertTypeChange = (certTypeId: string) => {
    form.setValue('cert_type_id', certTypeId, { shouldValidate: true });
    const certType = certTypes.find((t) => t.id === certTypeId);
    const issued = form.getValues('issued_on');
    if (certType?.validity_months && issued && !form.getValues('expires_on')) {
      form.setValue(
        'expires_on',
        format(addMonths(new Date(issued), certType.validity_months), 'yyyy-MM-dd'),
      );
    }
  };

  const handleClose = () => {
    form.reset();
    setFile(null);
    setFileError(null);
    onClose();
  };

  const onSubmit = form.handleSubmit((values) => {
    if (!file) {
      setFileError('Attach the document file');
      return;
    }
    upload.mutate(
      {
        workerId,
        companyId,
        certTypeId: values.cert_type_id,
        issuedOn: values.issued_on,
        expiresOn: values.expires_on,
        file,
      },
      { onSuccess: handleClose },
    );
  });

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setFileError(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Inline header with back arrow */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to documents"
        >
          <ArrowLeft size={16} weight="bold" />
        </button>
        <div>
          <h3 className="text-sm font-semibold">Add document</h3>
          <p className="text-xs text-muted-foreground">
            Upload a certificate or licence. Expiry tracking is automatic.
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cert-type">Certificate type</Label>
          <Select
            value={certTypeId}
            onValueChange={(value) => onCertTypeChange(value ?? '')}
          >
            <SelectTrigger id="cert-type" className="w-full">
              <SelectValue placeholder="Choose a type…" />
            </SelectTrigger>
            <SelectContent>
              {certTypes.map((certType) => (
                <SelectItem key={certType.id} value={certType.id}>
                  {certType.name} ({certType.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.cert_type_id && (
            <p className="text-xs text-danger">{form.formState.errors.cert_type_id.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issued-on">Issued</Label>
            <Input id="issued-on" type="date" {...form.register('issued_on')} />
            {form.formState.errors.issued_on && (
              <p className="text-xs text-danger">{form.formState.errors.issued_on.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expires-on">Expires</Label>
            <Input id="expires-on" type="date" {...form.register('expires_on')} />
            {form.formState.errors.expires_on && (
              <p className="text-xs text-danger">{form.formState.errors.expires_on.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cert-file">Document</Label>
          <label
            htmlFor="cert-file"
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground transition-colors',
              dragOver && 'border-primary bg-primary/5 text-primary',
            )}
          >
            <UploadSimple size={20} aria-hidden />
            {file ? (
              <span className="font-medium text-foreground">{file.name}</span>
            ) : (
              <span>Drag &amp; drop, or click to browse</span>
            )}
          </label>
          <input
            id="cert-file"
            type="file"
            accept="image/*,.pdf"
            className="sr-only"
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              setFile(picked);
              if (picked) setFileError(null);
            }}
          />
          {fileError && <p className="text-xs text-danger">{fileError}</p>}
        </div>

        {upload.isError && (
          <p role="alert" className="text-sm text-danger">
            Upload failed: {upload.error.message}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Add to wallet'}
          </Button>
        </div>
      </form>
    </div>
  );
}
