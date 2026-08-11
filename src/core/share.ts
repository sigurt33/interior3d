import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { RoomProject } from './model';
import { validateProject } from './validate';

export function encodeShare(p: RoomProject): string {
  return '#p=' + compressToEncodedURIComponent(JSON.stringify(p));
}

export function decodeShare(hash: string): RoomProject | null {
  const m = hash.match(/#p=(.+)/);
  if (!m) return null;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    if (!json) return null;
    const r = validateProject(JSON.parse(json));
    return r.ok ? r.project : null;
  } catch {
    return null;
  }
}
