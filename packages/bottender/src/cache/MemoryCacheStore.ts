import cloneDeep from 'lodash/cloneDeep';
import { LRUCache } from 'lru-cache';

import CacheStore from './CacheStore';
import type { CacheValue } from './CacheStore';

export default class MemoryCacheStore implements CacheStore {
  _lru: LRUCache<string, CacheValue>;

  constructor(max: number = 500, minutes?: number) {
    this._lru = new LRUCache({
      max,
      ttl: minutes ? minutes * 60 * 1000 : undefined,
    });
  }

  async get(key: string): Promise<CacheValue | null> {
    const _value = this._lru.get(key);

    // cloneDeep: To make sure read as different object to prevent
    // reading same key multiple times, causing freezed by other events.
    const value = typeof _value === 'object' ? cloneDeep(_value) : _value;

    return value || null;
  }

  async all(): Promise<CacheValue[]> {
    const allValues: CacheValue[] = [];

    for (const v of this._lru.values()) {
      allValues.push(v);
    }
    return allValues;
  }

  async put(key: string, value: CacheValue): Promise<void> {
    // cloneDeep: To make sure save as writable object
    const val = value && typeof value === 'object' ? cloneDeep(value) : value;

    this._lru.set(key, val);
  }

  async forget(key: string): Promise<void> {
    this._lru.delete(key);
  }

  async flush(): Promise<void> {
    this._lru.clear();
  }

  getPrefix(): string {
    return '';
  }
}
