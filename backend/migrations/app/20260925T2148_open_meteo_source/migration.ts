#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/27a882ee9a2f279665b25c2bd7bdd91be03e79549b4acb13ae6f3f68dfd8c0b2/contract';
import endContract from '../../snapshots/27a882ee9a2f279665b25c2bd7bdd91be03e79549b4acb13ae6f3f68dfd8c0b2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/38b715b7bd349445640e333eb16a5f7d2b4346e3e8ee42230ac087e93041bfe1/contract';
import startContract from '../../snapshots/38b715b7bd349445640e333eb16a5f7d2b4346e3e8ee42230ac087e93041bfe1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'fieldObservation',
        constraint: 'fieldObservation_source_check_329757c6',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'fieldObservation',
        constraint: 'fieldObservation_source_check_aaa5d901',
        expression: "\"source\" IN ('DEVICE', 'MANUAL', 'SIMULATOR', 'OPEN_METEO')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
