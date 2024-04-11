// eslint-disable-next-line import/no-extraneous-dependencies

//! Hight prio TODO: Before it was like down bellow but with direct file, which do not work in builds, fix somehow this circular dependency
//! For exampple: Get IBot from @sunray-eu/bottender but add type parameters for things that needs to be from bottender package (like Context as C etc...)
//! Or create common package with some common types etc... look for solution online for example (https://stackoverflow.com/questions/73514035/monorepo-typescript-and-issues-with-circular-dependency-while-importing-types)
//! Or here: https://github.com/microsoft/TypeScript/issues/33685
// import { IBot } from '@sunray-eu/bottender';

// export type InstanceOfIBot<T> =
//   T extends IBot<infer T1, infer T2, infer T3, infer T4>
//     ? IBot<T1, T2, T3, T4>
//     : never;

// export { IBot };
// // export interface Bot extends IBot {}
// // export type Bot = any;

// export type RouteConfig = {
//   path?: string;
// };

// TODO: Temporary solution:
export type Bot = any; // FIXME: import from bottender

export type RouteConfig = {
  path?: string;
};
