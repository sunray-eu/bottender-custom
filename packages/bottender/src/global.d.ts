/* eslint-disable vars-on-top */
/* eslint-disable no-var */
import Context from './context/Context';
import { Action, BottenderConfig } from './types';

interface HandleErrorProps {
  error: Error;
}

declare global {
  var bottenderConfig: BottenderConfig;
  var bottenderEntryFunction: Action<any, any>;
  var bottenderErrorHandler: (
    context: Context,
    props: HandleErrorProps
  ) => Promise<void>;
}

export {};
