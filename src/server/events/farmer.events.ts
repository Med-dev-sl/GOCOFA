import { publish } from "./event-bus";

export const FarmerEvents = {
  CREATED: "farmer.created",
  STATUS_CHANGED: "farmer.status.changed",
} as const;

export interface FarmerCreatedEvent {
  farmerId: string;
  farmerCode: string;
  registeredBy: string;
}

export async function farmerCreated(payload: FarmerCreatedEvent) {
  await publish(FarmerEvents.CREATED, payload);
}
