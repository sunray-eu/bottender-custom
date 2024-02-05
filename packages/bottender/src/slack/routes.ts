import { Action } from '../types';
import { RoutePredicate, route } from '../router';

import SlackContext from './SlackContext';
import { EventTypes, InteractionTypes } from './SlackTypes';

type Route = <C extends SlackContext>(
  action: Action<C>
) => {
  predicate: RoutePredicate<C>;
  action: Action<C>;
};

type Slack = Route & {
  any: Route;
  message: Route;
  event: <C extends SlackContext>(
    eventType: EventTypes | InteractionTypes,
    action: Action<C>
  ) => {
    predicate: RoutePredicate<C>;
    action: Action<C>;
  };
  command: <C extends SlackContext>(
    commandText: string,
    action: Action<C>
  ) => {
    predicate: RoutePredicate<C>;
    action: Action<C>;
  };
};

const slack: Slack = <C extends SlackContext>(action: Action<C>) => {
  return route((context: C) => context.platform === 'slack', action);
};

slack.any = slack;

function message<C extends SlackContext>(action: Action<C>) {
  return route(
    (context: C) => context.platform === 'slack' && context.event.isMessage,
    action
  );
}

slack.message = message;

function event<C extends SlackContext>(
  eventType: EventTypes | InteractionTypes,
  action: Action<C>
) {
  return route(
    (context: C) =>
      (context.platform === 'slack' &&
        context.event.rawEvent.type &&
        (eventType === '*' || context.event.rawEvent.type === eventType)) ||
      false,
    action
  );
}

slack.event = event;

function command<C extends SlackContext>(
  commandText: string,
  action: Action<C>
) {
  return route(
    (context: C) =>
      (context.platform === 'slack' &&
        context.event.command &&
        (commandText === '*' || context.event.command === commandText)) ||
      false,
    action
  );
}

slack.command = command;

export default slack;
