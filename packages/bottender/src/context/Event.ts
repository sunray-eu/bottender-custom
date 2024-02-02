import { JsonObject } from 'type-fest';

export interface Event<RE extends object = object> {
  readonly rawEvent: RE;
  readonly isMessage: boolean;
  readonly isText: boolean;
  readonly message?: JsonObject | Record<string, unknown> | null;
}
