#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/38b715b7bd349445640e333eb16a5f7d2b4346e3e8ee42230ac087e93041bfe1/contract';
import endContract from '../../snapshots/38b715b7bd349445640e333eb16a5f7d2b4346e3e8ee42230ac087e93041bfe1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8986a8125e77b28fef2c870d30e4b41e693123a003cd41e7becc9cd3d04fdef1/contract';
import startContract from '../../snapshots/8986a8125e77b28fef2c870d30e4b41e693123a003cd41e7becc9cd3d04fdef1/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'aiCache',
        columns: [
          col('cacheKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('provider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'chatMessage',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('provider', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'device',
        columns: [
          col('batteryPct', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('commandPump', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('commandUntil', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deviceKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('dryRunLevelPct', 'float8', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('firmware', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('hasEnergyMeter', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('hasFlowMeter', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('hasSolar', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('hasTankSensor', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastEnergyTotalKwh', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('lastFlowTotalL', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('lastSeenAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('manualUntil', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pumpMode', 'text', {
            notNull: true,
            default: lit('AUTO'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('pumpOn', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('rssi', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('simulated', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('tankCapacityL', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('tankHeightCm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'device_pumpMode_check_d076a960',
            "\"pumpMode\" IN ('AUTO', 'MANUAL_ON', 'MANUAL_OFF')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'farmAdvisor',
        columns: [
          col('advisorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('farmId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'fertilizerPlan',
        columns: [
          col('applied', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('appliedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('blanketCostRupees', 'float8', {
            notNull: true,
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('blanketDapKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('blanketMopKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('blanketUreaKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('costRupees', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('cropType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('dapKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mopKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('nStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('organicCarbon', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('pStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('requiredK', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('requiredN', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('requiredP', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('schedule', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('soilK', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('soilN', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('soilP', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('soilPh', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('source', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ureaKg', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'irrigationDecision',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('decidedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('depletionMm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('et0', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('etc', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rainNext24Mm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('rainProbability', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recommendedLitres', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('refillPoint', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('runMinutes', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('soilMoisture', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'irrigationEvent',
        columns: [
          col('deviceId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('endedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kwh', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('litres', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('measured', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('plannedLitres', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('solarKwh', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('source', 'text', {
            notNull: true,
            default: lit('AUTO'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('startEnergyTotalKwh', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('startFlowTotalL', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'irrigationEvent_source_check_8561a36b',
            "\"source\" IN ('AUTO', 'MANUAL', 'SCHEDULE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ndviSnapshot',
        columns: [
          col('bounds', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('cloudCover', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imagePath', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxNdvi', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('meanNdvi', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('minNdvi', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('sceneDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('sceneId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('validPixelRatio', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('zones', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'notification',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('channels', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fieldId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('link', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('severity', 'text', {
            notNull: true,
            default: lit('info'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'pumpSchedule',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('days', 'text', {
            notNull: true,
            default: lit('1234567'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('durationMinutes', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mode', 'text', {
            notNull: true,
            default: lit('SMART'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('startTime', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'pushSubscription',
        columns: [
          col('auth', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endpoint', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('p256dh', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'trial',
        columns: [
          col('controlFieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('controlYieldKg', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('farmId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('startDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('treatmentFieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('treatmentYieldKg', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('trial_status_check_0a2783e1', "\"status\" IN ('ACTIVE', 'COMPLETED')"),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'aIAssessment',
        column: col('kind', 'text', {
          notNull: true,
          default: lit('RISK'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'aIAssessment',
        column: col('ndvi', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'aIAssessment',
        column: col('summary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'crop',
        column: col('cropType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'crop',
        column: col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'crop',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ACTIVE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'crop',
        column: col('yieldKg', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'diseasePrediction',
        column: col('label', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'diseasePrediction',
        column: col('rank', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'diseasePrediction',
        column: col('source', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('baselineDepthMm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('baselineIntervalDays', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('electricityRate', 'float8', {
          notNull: true,
          default: lit(7),
          codecRef: { codecId: 'pg/float8@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('irrigationMethod', 'text', {
          notNull: true,
          default: lit('flood'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('shareCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'farm',
        column: col('solarCapacityKw', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('boundary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('fieldCapacity', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('irrigationMethod', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('latitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('longitude', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('pumpFlowLpm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('pumpPowerKw', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('refillPoint', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('solarPreferred', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('batteryPct', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('deviceId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('energyTotalKwh', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('flowRateLpm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('flowTotalL', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('powerW', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('pumpOn', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('rssi', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('soilTemperature', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('solarW', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('source', 'text', {
          notNull: true,
          default: lit('MANUAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('tankDistanceCm', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'fieldObservation',
        column: col('tankLevel', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'recommendation',
        column: col('authorId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'recommendation',
        column: col('code', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'recommendation',
        column: col('dedupeKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'recommendation',
        column: col('fieldId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'recommendation',
        column: col('params', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'recommendation',
        column: col('resolvedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'recommendation',
        column: col('status', 'text', {
          notNull: true,
          default: lit('OPEN'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('baselineWater', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('co2Kg', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('entryKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('hash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('kind', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('kwhSaved', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('method', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('periodEnd', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('periodStart', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('prevHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('rupeesSaved', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('sourceRef', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'sustainabilityRecord',
        column: col('waterUsed', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('dailyBriefing', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('language', 'text', {
          notNull: true,
          default: lit('en'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('pushAlerts', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('smsAlerts', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('whatsappAlerts', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.dropNotNull({ schema: 'public', table: 'recommendation', column: 'assessmentId' }),
      this.addUnique({
        schema: 'public',
        table: 'aiCache',
        constraint: 'aiCache_cacheKey_key',
        columns: ['cacheKey'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'crop',
        constraint: 'crop_status_check_15cca86a',
        expression: "\"status\" IN ('ACTIVE', 'HARVESTED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'device',
        constraint: 'device_deviceKey_key',
        columns: ['deviceKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'farm',
        constraint: 'farm_shareCode_key',
        columns: ['shareCode'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'farmAdvisor',
        constraint: 'farmAdvisor_farmId_advisorId_key',
        columns: ['farmId', 'advisorId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'fieldObservation',
        constraint: 'fieldObservation_source_check_329757c6',
        expression: "\"source\" IN ('DEVICE', 'MANUAL', 'SIMULATOR')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'pushSubscription',
        constraint: 'pushSubscription_endpoint_key',
        columns: ['endpoint'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'recommendation',
        constraint: 'recommendation_status_check_716a5eee',
        expression: "\"status\" IN ('OPEN', 'DONE', 'DISMISSED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'recommendation',
        constraint: 'recommendation_dedupeKey_key',
        columns: ['dedupeKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sustainabilityRecord',
        constraint: 'sustainabilityRecord_entryKey_key',
        columns: ['entryKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sustainabilityRecord',
        constraint: 'sustainabilityRecord_hash_key',
        columns: ['hash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chatMessage',
        index: 'chatMessage_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'device',
        index: 'device_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'farmAdvisor',
        index: 'farmAdvisor_advisorId_idx_ab57953b',
        columns: ['advisorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'farmAdvisor',
        index: 'farmAdvisor_farmId_idx_786bd89b',
        columns: ['farmId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'fertilizerPlan',
        index: 'fertilizerPlan_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'fieldObservation',
        index: 'fieldObservation_deviceId_idx_a7d461e8',
        columns: ['deviceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'irrigationDecision',
        index: 'irrigationDecision_decidedAt_idx_311b0e6f',
        columns: ['decidedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'irrigationDecision',
        index: 'irrigationDecision_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'irrigationEvent',
        index: 'irrigationEvent_deviceId_idx_a7d461e8',
        columns: ['deviceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'irrigationEvent',
        index: 'irrigationEvent_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'irrigationEvent',
        index: 'irrigationEvent_startedAt_idx_cac56236',
        columns: ['startedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ndviSnapshot',
        index: 'ndviSnapshot_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pumpSchedule',
        index: 'pumpSchedule_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pushSubscription',
        index: 'pushSubscription_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recommendation',
        index: 'recommendation_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recommendation',
        index: 'recommendation_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recommendation',
        index: 'recommendation_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'trial',
        index: 'trial_farmId_idx_786bd89b',
        columns: ['farmId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chatMessage',
        foreignKey: {
          name: 'chatMessage_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'device',
        foreignKey: {
          name: 'device_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'farmAdvisor',
        foreignKey: {
          name: 'farmAdvisor_farmId_fkey',
          columns: ['farmId'],
          references: { schema: 'public', table: 'farm', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'farmAdvisor',
        foreignKey: {
          name: 'farmAdvisor_advisorId_fkey',
          columns: ['advisorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'fertilizerPlan',
        foreignKey: {
          name: 'fertilizerPlan_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'fieldObservation',
        foreignKey: {
          name: 'fieldObservation_deviceId_fkey',
          columns: ['deviceId'],
          references: { schema: 'public', table: 'device', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'irrigationDecision',
        foreignKey: {
          name: 'irrigationDecision_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'irrigationEvent',
        foreignKey: {
          name: 'irrigationEvent_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'irrigationEvent',
        foreignKey: {
          name: 'irrigationEvent_deviceId_fkey',
          columns: ['deviceId'],
          references: { schema: 'public', table: 'device', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ndviSnapshot',
        foreignKey: {
          name: 'ndviSnapshot_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pumpSchedule',
        foreignKey: {
          name: 'pumpSchedule_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pushSubscription',
        foreignKey: {
          name: 'pushSubscription_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recommendation',
        foreignKey: {
          name: 'recommendation_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recommendation',
        foreignKey: {
          name: 'recommendation_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'trial',
        foreignKey: {
          name: 'trial_farmId_fkey',
          columns: ['farmId'],
          references: { schema: 'public', table: 'farm', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
