import type { City, Railway } from './types';

interface Edge {
  to: string;
  weight: number;
}

function buildAdjacency(cities: Map<string, City>, railways: Map<string, Railway>) {
  const adj = new Map<string, Edge[]>();
  for (const id of cities.keys()) adj.set(id, []);
  for (const r of railways.values()) {
    adj.get(r.from)?.push({ to: r.to, weight: r.distance });
    adj.get(r.to)?.push({ to: r.from, weight: r.distance });
  }
  return adj;
}

/**
 * Recomputes the full next-hop table. With ~22 cities this is microseconds, so we
 * rebuild on every network change rather than maintaining incremental state.
 * Returns routes[from][to] = the neighbouring city to travel to next.
 */
export function buildRoutingTable(
  cities: Map<string, City>,
  railways: Map<string, Railway>,
): Map<string, Map<string, string>> {
  const adj = buildAdjacency(cities, railways);
  const routes = new Map<string, Map<string, string>>();

  for (const source of cities.keys()) {
    const dist = new Map<string, number>();
    const firstHop = new Map<string, string>();
    const visited = new Set<string>();
    dist.set(source, 0);

    // Simple O(V^2) Dijkstra — fine at this scale, swap for a heap if the map grows.
    for (;;) {
      let best: string | null = null;
      let bestDist = Infinity;
      for (const [id, d] of dist) {
        if (!visited.has(id) && d < bestDist) {
          best = id;
          bestDist = d;
        }
      }
      if (best === null) break;
      visited.add(best);

      for (const edge of adj.get(best) ?? []) {
        const next = bestDist + edge.weight;
        if (next < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, next);
          firstHop.set(edge.to, best === source ? edge.to : firstHop.get(best)!);
        }
      }
    }

    routes.set(source, firstHop);
  }

  return routes;
}

export function nextHop(
  routes: Map<string, Map<string, string>>,
  from: string,
  to: string,
): string | undefined {
  return routes.get(from)?.get(to);
}
