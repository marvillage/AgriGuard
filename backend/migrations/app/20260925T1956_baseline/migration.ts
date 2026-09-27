#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8986a8125e77b28fef2c870d30e4b41e693123a003cd41e7becc9cd3d04fdef1/contract';
import endContract from '../../snapshots/8986a8125e77b28fef2c870d30e4b41e693123a003cd41e7becc9cd3d04fdef1/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'aIAssessment',
        columns: [
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('cropHealthScore', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('cropId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('diseaseRisk', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nutrientStress', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('waterStress', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('weatherRisk', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'aIAssessment_status_check_48358bb5',
            "\"status\" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'crop',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('harvestDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('plantingDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('season', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('variety', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'cropImage',
        columns: [
          col('assessmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('contentType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('originalName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('storageKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uploadedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'diseasePrediction',
        columns: [
          col('assessmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('confidence', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('diseaseName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('severity', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('symptoms', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('treatment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'farm',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('location', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'field',
        columns: [
          col('area', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('farmId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('location', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('soilType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'fieldObservation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('humidity', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nitrogen', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('observedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('phosphorus', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('potassium', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('rainfall', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('soilMoisture', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('temperature', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'irrigationPrediction',
        columns: [
          col('assessmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('confidence', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reasoning', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recommendedAction', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recommendedAmount', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('waterStressLevel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'nutrientPrediction',
        columns: [
          col('assessmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('confidence', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fertilizerType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('nitrogenStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phosphorusStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('potassiumStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reasoning', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recommendedAction', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recommendedAmount', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'processingJob',
        columns: [
          col('assessmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('errorMessage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('jobType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('QUEUED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'processingJob_status_check_221b8aea',
            "\"status\" IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'recommendation',
        columns: [
          col('assessmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expectedImpact', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('priority', 'text', {
            notNull: true,
            default: lit('MEDIUM'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('supportingFactors', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'recommendation_priority_check_0838e5f0',
            "\"priority\" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
          ),
          checkExpression(
            'recommendation_type_check_79da7040',
            "\"type\" IN ('IRRIGATION', 'FERTILIZER', 'DISEASE', 'WEATHER', 'GENERAL')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'sustainabilityRecord',
        columns: [
          col('assessmentId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('estimatedImpact', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fertilizerReduced', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('fieldId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('recordedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('waterSaved', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('FARMER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_role_check_52066950',
            "\"role\" IN ('FARMER', 'AGRONOMIST', 'ADMIN')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'weatherPrediction',
        columns: [
          col('assessmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('humidity', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rainfallProbability', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('recommendedAction', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('riskDescription', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('temperature', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('weatherRiskLevel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'irrigationPrediction',
        constraint: 'irrigationPrediction_assessmentId_key',
        columns: ['assessmentId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'nutrientPrediction',
        constraint: 'nutrientPrediction_assessmentId_key',
        columns: ['assessmentId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'weatherPrediction',
        constraint: 'weatherPrediction_assessmentId_key',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aIAssessment',
        index: 'aIAssessment_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aIAssessment',
        index: 'aIAssessment_cropId_idx_879e8d63',
        columns: ['cropId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aIAssessment',
        index: 'aIAssessment_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'aIAssessment',
        index: 'aIAssessment_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'crop',
        index: 'crop_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cropImage',
        index: 'cropImage_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'diseasePrediction',
        index: 'diseasePrediction_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'farm',
        index: 'farm_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'field',
        index: 'field_farmId_idx_786bd89b',
        columns: ['farmId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'fieldObservation',
        index: 'fieldObservation_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'fieldObservation',
        index: 'fieldObservation_observedAt_idx_980e226e',
        columns: ['observedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'irrigationPrediction',
        index: 'irrigationPrediction_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'nutrientPrediction',
        index: 'nutrientPrediction_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'processingJob',
        index: 'processingJob_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'processingJob',
        index: 'processingJob_jobType_idx_65878b3e',
        columns: ['jobType'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'processingJob',
        index: 'processingJob_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recommendation',
        index: 'recommendation_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recommendation',
        index: 'recommendation_priority_idx_745dc344',
        columns: ['priority'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recommendation',
        index: 'recommendation_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sustainabilityRecord',
        index: 'sustainabilityRecord_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sustainabilityRecord',
        index: 'sustainabilityRecord_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'weatherPrediction',
        index: 'weatherPrediction_assessmentId_idx_1fe05216',
        columns: ['assessmentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'aIAssessment',
        foreignKey: {
          name: 'aIAssessment_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'aIAssessment',
        foreignKey: {
          name: 'aIAssessment_cropId_fkey',
          columns: ['cropId'],
          references: { schema: 'public', table: 'crop', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'crop',
        foreignKey: {
          name: 'crop_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cropImage',
        foreignKey: {
          name: 'cropImage_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'diseasePrediction',
        foreignKey: {
          name: 'diseasePrediction_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'farm',
        foreignKey: {
          name: 'farm_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'field',
        foreignKey: {
          name: 'field_farmId_fkey',
          columns: ['farmId'],
          references: { schema: 'public', table: 'farm', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'fieldObservation',
        foreignKey: {
          name: 'fieldObservation_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'irrigationPrediction',
        foreignKey: {
          name: 'irrigationPrediction_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'nutrientPrediction',
        foreignKey: {
          name: 'nutrientPrediction_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'processingJob',
        foreignKey: {
          name: 'processingJob_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recommendation',
        foreignKey: {
          name: 'recommendation_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sustainabilityRecord',
        foreignKey: {
          name: 'sustainabilityRecord_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'field', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sustainabilityRecord',
        foreignKey: {
          name: 'sustainabilityRecord_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'weatherPrediction',
        foreignKey: {
          name: 'weatherPrediction_assessmentId_fkey',
          columns: ['assessmentId'],
          references: { schema: 'public', table: 'aIAssessment', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
