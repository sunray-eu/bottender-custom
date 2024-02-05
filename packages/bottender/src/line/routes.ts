import { Action } from '../types';
import { RoutePredicate, route } from '../router';

import LineContext from './LineContext';

type Route = <C extends LineContext>(
  action: Action<C>
) => {
  predicate: RoutePredicate<C>;
  action: Action<C>;
};

type Line = Route & {
  any: Route;
  message: Route;
  follow: Route;
  unfollow: Route;
  join: Route;
  leave: Route;
  memberJoined: Route;
  memberLeft: Route;
  postback: Route;
  beacon: Route & {
    enter: Route;
    banner: Route;
    stay: Route;
  };
  accountLink: Route;
  things: Route & {
    link: Route;
    unlink: Route;
    scenarioResult: Route;
  };
};

const line: Line = <C extends LineContext>(action: Action<C>) => {
  return route((context: C) => context.platform === 'line', action);
};

line.any = line;

function message<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isMessage,
    action
  );
}

line.message = message;

function follow<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isFollow,
    action
  );
}

line.follow = follow;

function unfollow<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isUnfollow,
    action
  );
}

line.unfollow = unfollow;

function join<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isJoin,
    action
  );
}

line.join = join;

function leave<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isLeave,
    action
  );
}

line.leave = leave;

function memberJoined<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isMemberJoined,
    action
  );
}

line.memberJoined = memberJoined;

function memberLeft<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isMemberLeft,
    action
  );
}

line.memberLeft = memberLeft;

function postback<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isPostback,
    action
  );
}

line.postback = postback;

function beacon<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isBeacon,
    action
  );
}

line.beacon = beacon;

function beaconEnter<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'line' &&
      context.event.isBeacon &&
      context.event.beacon?.type === 'enter',
    action
  );
}

beacon.enter = beaconEnter;

function beaconBanner<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'line' &&
      context.event.isBeacon &&
      context.event.beacon?.type === 'banner',
    action
  );
}

beacon.banner = beaconBanner;

function beaconStay<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'line' &&
      context.event.isBeacon &&
      context.event.beacon?.type === 'stay',
    action
  );
}

beacon.stay = beaconStay;

function accountLink<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isAccountLink,
    action
  );
}

line.accountLink = accountLink;

function things<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'line' && context.event.isThings,
    action
  );
}

line.things = things;

function thingsLink<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'line' &&
      context.event.isThings &&
      context.event.things?.type === 'link',
    action
  );
}

things.link = thingsLink;

function thingsUnlink<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'line' &&
      context.event.isThings &&
      context.event.things?.type === 'unlink',
    action
  );
}

things.unlink = thingsUnlink;

function thingsScenarioResult<C extends LineContext>(action: Action<C>) {
  return route(
    (context: C) =>
      context.platform === 'line' &&
      context.event.isThings &&
      context.event.things?.type === 'scenarioResult',
    action
  );
}

things.scenarioResult = thingsScenarioResult;

export default line;
