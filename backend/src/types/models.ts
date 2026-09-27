import type { Models } from "../../prisma/schema.d.ts";
import type { Scalars } from "@prisma/orm-postgres/family-contract/types";

export type UserRow = Scalars<Models.public_User>;
export type FarmRow = Scalars<Models.public_Farm>;
export type FieldRow = Scalars<Models.public_Field>;
export type CropRow = Scalars<Models.public_Crop>;
export type DeviceRow = Scalars<Models.public_Device>;
export type ObservationRow = Scalars<Models.public_FieldObservation>;
export type IrrigationEventRow = Scalars<Models.public_IrrigationEvent>;
export type DecisionRow = Scalars<Models.public_IrrigationDecision>;
export type ScheduleRow = Scalars<Models.public_PumpSchedule>;
export type RecommendationRow = Scalars<Models.public_Recommendation>;
export type AssessmentRow = Scalars<Models.public_AIAssessment>;
export type LedgerRow = Scalars<Models.public_SustainabilityRecord>;
export type NotificationRow = Scalars<Models.public_Notification>;
export type TrialRow = Scalars<Models.public_Trial>;
