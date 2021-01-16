import { fromUrl, fromBlob } from 'geotiff';
import type { GeoTIFF } from 'geotiff';

import {
  createPoolProxy,
  createOffsetsProxy,
  checkProxies
} from './lib/proxies';
import Pool from './lib/Pool';

import { load as loadOmeTiff } from './ome-tiff';

interface TiffOptions {
  pool?: boolean;
  headers?: object;
  offsets?: number[];
  type?: 'ome-tiff';
}

export async function loadTiff(source: string | File, opts: TiffOptions = {}) {
  const { headers, offsets, pool = true, type = 'ome-tiff' } = opts;

  let tiff: GeoTIFF;

  // Create tiff source
  if (typeof source === 'string') {
    tiff = await fromUrl(source, headers);
  } else {
    tiff = await fromBlob(source);
  }

  if (pool) {
    /*
     * Creates a worker pool to decode tiff tiles. Wraps tiff
     * in a Proxy that injects 'pool' into `tiff.readRasters`.
     */
    tiff = createPoolProxy(tiff, new Pool());
  }

  if (offsets) {
    /*
     * Performance enhancement. If offsets are provided, we
     * create a proxy that intercepts calls to `tiff.getImage`
     * and injects the pre-computed offsets.
     */
    tiff = createOffsetsProxy(tiff, offsets);
  }

  /*
   * Inspect tiff source for our performance enhancing proxies.
   * Prints warnings to console if `offsets` or `pool` are missing.
   */
  checkProxies(tiff);

  if (type !== 'ome-tiff') {
    throw Error('Only ome-tiff is supported.');
  }

  return loadOmeTiff(tiff);
}
