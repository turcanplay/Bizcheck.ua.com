import type { ImgHTMLAttributes, ReactEventHandler } from 'react';

/**
 * Minimal <picture> wrapper: serves a WebP source with the original
 * PNG/JPEG as fallback.
 *
 * Why this exists (Core Web Vitals):
 *  - `width` + `height` are REQUIRED, not optional. Without an intrinsic
 *    aspect ratio the browser cannot reserve space before the bytes arrive and
 *    the layout jumps → CLS. Pass the *natural* pixel size of the file; CSS is
 *    still free to scale it (`width: 100%` etc.).
 *  - `priority` marks the LCP image. It maps to
 *    `fetchpriority="high" + loading="eager"`, which is the only lever we have
 *    to get the hero image ahead of the JS bundles in the request queue.
 *    Everything else defaults to `loading="lazy" + decoding="async"`.
 *
 * The `.webp` path is derived from `src` by extension swap unless `webp` is
 * given explicitly. Both files must exist in `public/` — a <picture> does NOT
 * fall back to the <img> if the chosen <source> 404s, it just fails.
 *
 * The <picture> itself is `display: contents`, so it generates no box at all
 * and the <img> keeps its exact position in the layout tree. That makes this a
 * true drop-in replacement for a bare <img>: existing rules that rely on the
 * image being a flex item, an absolutely positioned child, or a percentage of
 * its parent (`.hero__laptop { width: 115% }`, `.crowe__photo { width:
 * min(100%, 400px) }`) keep working untouched.
 */
export interface PictureProps
  extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    'src' | 'width' | 'height' | 'loading' | 'decoding' | 'fetchPriority'
  > {
  /** Fallback image path (.png / .jpg), served to browsers without WebP. */
  src: string;
  /** WebP path. Defaults to `src` with its extension replaced by `.webp`. */
  webp?: string;
  alt: string;
  /** Natural width in px — reserves layout space, prevents CLS. */
  width: number;
  /** Natural height in px — reserves layout space, prevents CLS. */
  height: number;
  /** True for the LCP image only: eager + fetchpriority="high". */
  priority?: boolean;
  /** Class applied to the <img> (the element CSS actually targets). */
  className?: string;
  /** Class applied to the wrapping <picture>, if it needs one. */
  pictureClassName?: string;
  onError?: ReactEventHandler<HTMLImageElement>;
}

function toWebp(src: string): string {
  return src.replace(/\.(png|jpe?g)$/i, '.webp');
}

export default function Picture({
  src,
  webp,
  alt,
  width,
  height,
  priority = false,
  className,
  pictureClassName,
  onError,
  ...imgProps
}: PictureProps) {
  return (
    <picture className={pictureClassName} style={{ display: 'contents' }}>
      <source srcSet={webp ?? toWebp(src)} type="image/webp" />
      <img
        {...imgProps}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onError={onError}
      />
    </picture>
  );
}
