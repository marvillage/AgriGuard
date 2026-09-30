#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0aacbc10756773b67b17f9d492283a0e4951abdfaf259f8d9dc2cdec3138d55b/contract';
import startContract from '../../snapshots/0aacbc10756773b67b17f9d492283a0e4951abdfaf259f8d9dc2cdec3138d55b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b415eff0b3678b1503714523606db17e2a3111a4a0bb4d8063e12e8ac32a8fdf/contract';
import endContract from '../../snapshots/b415eff0b3678b1503714523606db17e2a3111a4a0bb4d8063e12e8ac32a8fdf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('photoKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
