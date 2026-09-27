#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/27a882ee9a2f279665b25c2bd7bdd91be03e79549b4acb13ae6f3f68dfd8c0b2/contract';
import startContract from '../../snapshots/27a882ee9a2f279665b25c2bd7bdd91be03e79549b4acb13ae6f3f68dfd8c0b2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c84c9e272f92cb8a14410df6c58a6d0892cb696d221d390477f223b5fd7f92d8/contract';
import endContract from '../../snapshots/c84c9e272f92cb8a14410df6c58a6d0892cb696d221d390477f223b5fd7f92d8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'storedFile',
        columns: [
          col('base64', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contentType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'storedFile',
        constraint: 'storedFile_key_key',
        columns: ['key'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
