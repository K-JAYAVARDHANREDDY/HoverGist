/**
 * Server-only utility.
 * Fetches data from PostgreSQL database.
 * Should only be imported inside Route Handlers (app/api/...) or Server Components.
 */

import { query } from './db';
import type { AnimationDTO, AnimationSummaryDTO } from '@/types/animation.types';

/** Return all animations. Results are sorted by name. */
export async function getAllAnimations(): Promise<AnimationDTO[]> {
  try {
    const res = await query('SELECT data FROM animations ORDER BY data->>\'name\' ASC');
    const animations: AnimationDTO[] = res.rows.map(row => row.data);
    return animations;
  } catch (err) {
    console.error("Failed to read animations from PostgreSQL", err);
    return [];
  }
}

/** Return slim summaries for the list API (strips code / controls / animxSyntax). */
export async function getAnimationSummaries(): Promise<AnimationSummaryDTO[]> {
  try {
    const animations = await getAllAnimations();
    return animations.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      engine: a.engine,
      difficulty: a.difficulty,
      tags: a.tags,
      defaultProps: a.defaultProps
    }));
  } catch (err) {
    console.error("Failed to generate animation summaries from PostgreSQL", err);
    return [];
  }
}

/** Return a single animation by ID, or null if not found. */
export async function getAnimationById(id: string): Promise<AnimationDTO | null> {
  try {
    const res = await query('SELECT data FROM animations WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0].data;
  } catch (err: any) {
    console.error(`Failed to read animation by id (${id}) from PostgreSQL`, err);
    return null;
  }
}
