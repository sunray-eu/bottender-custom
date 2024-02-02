import dev from './dev';
import help from './help';
import init from './init';
import start from './start';

export default {
  title: 'Bottender',
  subcommands: new Set(['help', 'init', 'start', 'dev']),
  get init() {
    return init;
  },
  get start() {
    return start;
  },
  get dev() {
    return dev;
  },
  get help() {
    return help;
  },
};
