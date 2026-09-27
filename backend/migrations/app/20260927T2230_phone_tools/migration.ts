#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0aacbc10756773b67b17f9d492283a0e4951abdfaf259f8d9dc2cdec3138d55b/contract';
import endContract from '../../snapshots/0aacbc10756773b67b17f9d492283a0e4951abdfaf259f8d9dc2cdec3138d55b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c84c9e272f92cb8a14410df6c58a6d0892cb696d221d390477f223b5fd7f92d8/contract';
import startContract from '../../snapshots/c84c9e272f92cb8a14410df6c58a6d0892cb696d221d390477f223b5fd7f92d8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'device',
        column: col('kind', 'text', {
          notNull: true,
          default: lit('NODE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('pumpFlowTest', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
