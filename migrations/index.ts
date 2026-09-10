import * as migration_20260907_212401_initial from './20260907_212401_initial';
import * as migration_20260908_210000_visitor_login from './20260908_210000_visitor_login';
import * as migration_20260910_131500_visitor_rels_columns from './20260910_131500_visitor_rels_columns';
import * as migration_20260910_194159_home_cover_image from './20260910_194159_home_cover_image';

export const migrations = [
  {
    up: migration_20260907_212401_initial.up,
    down: migration_20260907_212401_initial.down,
    name: '20260907_212401_initial',
  },
  {
    up: migration_20260908_210000_visitor_login.up,
    down: migration_20260908_210000_visitor_login.down,
    name: '20260908_210000_visitor_login',
  },
  {
    up: migration_20260910_131500_visitor_rels_columns.up,
    down: migration_20260910_131500_visitor_rels_columns.down,
    name: '20260910_131500_visitor_rels_columns',
  },
  {
    up: migration_20260910_194159_home_cover_image.up,
    down: migration_20260910_194159_home_cover_image.down,
    name: '20260910_194159_home_cover_image'
  },
];
