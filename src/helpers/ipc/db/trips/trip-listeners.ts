// ========================================
// FILE: src/helpers/ipc/db/trips/trips-listeners.ts (CORRIGIDO)
// ========================================
import { ipcMain } from "electron";
import {
    GET_ALL_TRIPS,
    GET_TRIP_BY_ID,
    CREATE_TRIP,
    CANCEL_TRIP,
    GET_ACTIVE_TRIPS,
    COMPLETE_TRIP,
    DELETE_TRIP,          // adicionar ao trips-channels.ts se não existir
} from "./trips-channels";

// Fase 6, Prompt 6.5 — powersync.db passa a ser a fonte operacional
// (era app.db/Drizzle). trips.queries.ts fica só como backup.
import {
    getAllTrips,
    getTripById,
    createTrip,
    completeTrip,
    cancelTrip,
    deleteTrip,
    getActiveTrips,
    isVehicleAvailable,
    isDriverAvailable,
} from '@/lib/db/queries/trips.queries.powersync';

import { ICreateTrip, ICompleteTrip } from '@/lib/types/trip';
import { NotFoundError, ValidationError } from '@/lib/errors/AppError';
import { tripStatus } from "@/lib/db/schemas/trips";
import { IPaginationParams } from '@/lib/types/pagination';

export function addTripsEventListeners() {

    // ── GET ALL ───────────────────────────────────────────────────────────────
    ipcMain.handle(GET_ALL_TRIPS, async (_, params?: IPaginationParams) =>
        getAllTrips(params || {})
    );

    // ── GET BY ID ─────────────────────────────────────────────────────────────
    ipcMain.handle(GET_TRIP_BY_ID, async (_, id: string) =>
        getTripById(id)
    );

    // ── GET ACTIVE ────────────────────────────────────────────────────────────
    ipcMain.handle(GET_ACTIVE_TRIPS, async () =>
        getActiveTrips()
    );

    // ── CREATE ────────────────────────────────────────────────────────────────
    // CORRECÇÃO: throw new Error(string) em vez de throw string
    // para que o Electron serialize correctamente o erro no renderer
    ipcMain.handle(CREATE_TRIP, async (_, data: ICreateTrip) => {
        const vehicleAvailable = await isVehicleAvailable(data.vehicle_id);
        if (!vehicleAvailable) {
            throw new Error(
                new ValidationError('trips:errors.vehicleNotAvailable').toIpcString()
            );
        }

        const driverAvailable = await isDriverAvailable(data.driver_id);
        if (!driverAvailable) {
            throw new Error(
                new ValidationError('trips:errors.driverNotAvailable').toIpcString()
            );
        }

        if (!data.route_id && (!data.origin || !data.destination)) {
            throw new Error(
                new ValidationError('trips:errors.originDestinationRequired').toIpcString()
            );
        }

        return createTrip(data);
    });

    // ── COMPLETE ──────────────────────────────────────────────────────────────
    // CORRECÇÃO: throw new Error(string) em vez de throw string
    ipcMain.handle(COMPLETE_TRIP, async (_, id: string, data: ICompleteTrip) => {
        const trip = await getTripById(id);
        if (!trip) {
            throw new Error(new NotFoundError('trips:errors.tripNotFound').toIpcString());
        }
        if (trip.status !== tripStatus.IN_PROGRESS) {
            throw new Error(
                new ValidationError('trips:validation.tripNotInProgress').toIpcString()
            );
        }
        return completeTrip(id, data);
    });

    // ── CANCEL ────────────────────────────────────────────────────────────────
    // CORRECÇÃO: throw new Error(string) em vez de throw string
    ipcMain.handle(CANCEL_TRIP, async (_, id: string) => {
        const trip = await getTripById(id);
        if (!trip) {
            throw new Error(new NotFoundError('trips:errors.tripNotFound').toIpcString());
        }
        if (trip.status !== tripStatus.IN_PROGRESS) {
            throw new Error(
                new ValidationError('trips:validation.tripNotInProgress').toIpcString()
            );
        }
        return cancelTrip(id);
    });

    // ── DELETE ────────────────────────────────────────────────────────────────
    // CORRECÇÃO: deleteTrip agora restaura vehicle/driver se IN_PROGRESS
    ipcMain.handle(DELETE_TRIP, async (_, id: string) => {
        const trip = await getTripById(id);
        if (!trip) {
            throw new Error(new NotFoundError('trips:errors.tripNotFound').toIpcString());
        }
        return deleteTrip(id);
    });
}