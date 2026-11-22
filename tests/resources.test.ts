import { describe, expect, it } from 'vitest';
import resourcesJson from '../content/resources.json';
import { isZip, libraryUrl, resources, ResourcesSchema } from '../src/ui/findOutMore';

describe('find out more', () => {
  it('links only to approved sites, over https', () => {
    for (const l of resources.inspiration.links) {
      expect(l.url.startsWith('https://')).toBe(true);
      expect(resources.allowedHosts).toContain(new URL(l.url).host);
    }
  });

  it('rejects a link to a site that is not on the allowed list', () => {
    const bad = structuredClone(resourcesJson);
    bad.inspiration.links.push({ label: 'x', url: 'https://example.com/' });
    expect(() => ResourcesSchema.parse(bad)).toThrow(/not allowed/);
  });

  it('accepts only 5-digit ZIP codes', () => {
    expect(isZip('98101')).toBe(true);
    expect(isZip(' 02134 ')).toBe(true);
    for (const z of ['9810', '981011', 'abcde', '98 01', '']) expect(isZip(z)).toBe(false);
  });

  it('builds a map search for libraries near a ZIP code, or near the device', () => {
    expect(libraryUrl('98101')).toBe('https://www.google.com/maps/search/?api=1&query=public+library+near+98101');
    expect(libraryUrl()).toBe('https://www.google.com/maps/search/?api=1&query=public+library+near+me');
  });
});
