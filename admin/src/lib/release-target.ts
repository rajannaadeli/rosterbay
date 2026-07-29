/**
 * Where the Android worker app is published, in one place.
 *
 * Imported by `vite.config.ts` as well as by app code, so this module must stay
 * dependency-free and free of `import.meta.env` — it is evaluated in Node at
 * config time and in the browser at runtime.
 */

/** Public repo the APK is released from; a public release asset needs no auth. */
export const RELEASE_REPO = 'rajannaadeli/rosterbay';

/**
 * The single tag the Worker APK workflow re-uploads to. Because the tag and the
 * asset name never change, the download URL never changes either — the file
 * behind it does. That is what stops the landing page from serving a build from
 * six deploys ago.
 */
export const RELEASE_TAG = 'worker-app';
export const APK_ASSET_NAME = 'rosterbay-worker.apk';

/**
 * Branded path the landing page links to. Vercel 302s it to the release asset
 * (`admin/vercel.json`) and the dev server does the same (`vite.config.ts`) —
 * both must be updated together if this changes.
 */
export const APK_DOWNLOAD_PATH = '/download/worker-app.apk';

/** The redirect target both of those configs point at. */
export const APK_RELEASE_URL = `https://github.com/${RELEASE_REPO}/releases/download/${RELEASE_TAG}/${APK_ASSET_NAME}`;
