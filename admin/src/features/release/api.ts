import { APK_ASSET_NAME, RELEASE_REPO, RELEASE_TAG } from '@/lib/release-target';

export interface WorkerAppRelease {
  /** Size of the published APK, in bytes. */
  sizeBytes: number;
  /** When CI last uploaded it — i.e. how fresh the download actually is. */
  updatedAt: string;
}

interface GitHubAsset {
  name: string;
  size: number;
  updated_at: string;
}

/**
 * Size and age of the APK currently attached to the release tag.
 *
 * The only non-Supabase fetch in the app, and deliberately non-load-bearing:
 * the download link is always live, this just puts a build stamp under it so a
 * visitor can see the file is current instead of taking it on faith. Every
 * failure path returns null and the stamp simply doesn't render — GitHub's
 * unauthenticated API is rate-limited per IP and that must never be able to
 * make the landing page look broken.
 */
export async function fetchWorkerAppRelease(): Promise<WorkerAppRelease | null> {
  const response = await fetch(
    `https://api.github.com/repos/${RELEASE_REPO}/releases/tags/${RELEASE_TAG}`,
    { headers: { Accept: 'application/vnd.github+json' } },
  );
  if (!response.ok) return null;

  const release = (await response.json()) as { assets?: GitHubAsset[] };
  const asset = release.assets?.find((candidate) => candidate.name === APK_ASSET_NAME);
  if (!asset) return null;

  return { sizeBytes: asset.size, updatedAt: asset.updated_at };
}
