import { useQuery } from '@tanstack/react-query';
import { diffService } from '../services/diff';
import { queryKeys } from '../constants/queryKeys';

/** Diff between two versions of a family's itinerary; agents must pass the family. */
export function useDiff(familyId: string | undefined, versionA: number | undefined, versionB: number | undefined) {
  const hasVersions = typeof versionA === 'number' && typeof versionB === 'number' && versionA !== versionB;
  return useQuery({
    queryKey: [queryKeys.diff, familyId, versionA, versionB],
    queryFn: () => diffService.getDiff(familyId, versionA as number, versionB as number),
    enabled: hasVersions,
  });
}
