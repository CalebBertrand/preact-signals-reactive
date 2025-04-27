import type { Query } from '@directus/sdk';
import type { Mutable } from './Mutable';

export type DirectusQuery = Mutable<Query<any, any>>;
