import * as migration_20260907_212401_initial from './20260907_212401_initial';
import * as migration_20260908_210000_visitor_login from './20260908_210000_visitor_login';

export const migrations = [
  {
    up: migration_20260907_212401_initial.up,
    down: migration_20260907_212401_initial.down,
    name: '20260907_212401_initial'
  },
  {
    up: migration_20260908_210000_visitor_login.up,
    down: migration_20260908_210000_visitor_login.down,
    name: '20260908_210000_visitor_login'
  },
];
