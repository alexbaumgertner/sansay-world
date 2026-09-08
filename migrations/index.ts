import * as migration_20260907_212401_initial from './20260907_212401_initial';

export const migrations = [
  {
    up: migration_20260907_212401_initial.up,
    down: migration_20260907_212401_initial.down,
    name: '20260907_212401_initial'
  },
];
