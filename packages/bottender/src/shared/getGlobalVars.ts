import { Action, BottenderConfig } from '../types';

export function getBottenderConfigFromGlobals(): BottenderConfig {
  if (global.bottenderConfig) {
    return global.bottenderConfig;
  }
  throw new Error('Bottender config not defined, please define in globals!');
}

export function getEntryFunctionFromGlobals(): Action<any, any> {
  if (global.bottenderEntryFunction) {
    return global.bottenderEntryFunction;
  }
  throw new Error('Entry function not defined, please define in globals!');
}

export function getErrorHanlderFromGlobals(): Action<any, any> {
  if (global.bottenderErrorHandler) {
    return global.bottenderErrorHandler;
  }
  throw new Error(
    'Error handler function not defined, please define in globals!'
  );
}
