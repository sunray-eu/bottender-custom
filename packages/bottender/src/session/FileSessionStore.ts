import os from 'os';

import storage from 'node-persist';
import { isBefore, subMinutes } from 'date-fns';

import Session from './Session';
import SessionStore from './SessionStore';

type FileOption =
  | string
  | {
      dirname?: string;
    };

function getDirname(arg: FileOption): string | void {
  if (typeof arg === 'string') {
    return arg;
  }

  if (arg && typeof arg === 'object') {
    return arg.dirname;
  }
}

export default class FileSessionStore implements SessionStore {
  _storage: storage.LocalStorage;

  // The number of minutes to store the data in the session.
  _expiresIn: number;

  constructor(arg: FileOption, expiresIn?: number) {
    this._expiresIn = expiresIn || 0;

    const dirname = getDirname(arg) || '.sessions';

    this._storage = storage.create({
      dir: dirname,
      stringify: JSON.stringify,
      parse: JSON.parse,
      encoding: 'utf8',
      logging: false, // can also be custom logging function
      ttl: expiresIn ? expiresIn * 60 * 1000 : undefined, // ttl in milliseconds
      expiredInterval: 2 * 60 * 1000, // every 2 minutes the process will clean-up the expired cache
      forgiveParseErrors: false,
    });
  }

  async init(): Promise<FileSessionStore> {
    // Assuming storage.init() is called in the constructor and is synchronous
    // or if it's asynchronous, make sure to await it in the constructor
    await this._storage.init();
    return this;
  }

  async all(): Promise<Session[]> {
    // This method should return all sessions
    // The implementation will depend on how you're storing the sessions
    // Here's a basic example that might need adjustments:
    const keys = await this._storage.keys();
    const sessions = await Promise.all(keys.map((key) => this.read(key)));
    return sessions.filter((session) => session !== null) as Session[];
  }

  async read(key: string): Promise<Session | null> {
    const safeKey = os.platform() === 'win32' ? key.replace(':', '@') : key;

    try {
      const session: Session | null = await this._storage.getItem(safeKey);

      if (session && this._expired(session)) {
        return null;
      }

      return session;
    } catch (err) {
      return null;
    }
  }

  async write(key: string, sess: Session): Promise<void> {
    const safeKey = os.platform() === 'win32' ? key.replace(':', '@') : key;

    sess.lastActivity = Date.now();

    await this._storage.setItem(safeKey, sess);
  }

  async destroy(key: string): Promise<void> {
    const safeKey = os.platform() === 'win32' ? key.replace(':', '@') : key;

    await this._storage.removeItem(safeKey);
  }

  _expired(sess: Session): boolean {
    if (!this._expiresIn) {
      return false;
    }

    return (
      sess.lastActivity !== undefined &&
      isBefore(sess.lastActivity, subMinutes(Date.now(), this._expiresIn))
    );
  }
}
