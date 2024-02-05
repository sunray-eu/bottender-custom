import { IBot } from 'bottender/src/types';

export type InstanceOfIBot<T> =
  T extends IBot<infer T1, infer T2, infer T3, infer T4>
    ? IBot<T1, T2, T3, T4>
    : never;

export { IBot };
// export interface Bot extends IBot {}
// export type Bot = any;

export type RouteConfig = {
  path?: string;
};
