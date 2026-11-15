// ========================================
// PROJECT: fleetcontrol-desktop
// FILE: src/helpers/vehicles-helpers.ts
// ========================================

import { ICreateVehicle, IUpdateVehicle, IUpdateStatus, IVehicle } from '@/lib/types/vehicle';
import { IPaginationParams, IPaginatedResult } from '@/lib/types/pagination';
import { assertPermission } from './permission-guard';


export async function getAllVehicles(params?: IPaginationParams): Promise<IPaginatedResult<IVehicle>> {
    try {
        const result = await window._vehicles.getAll(params);
        return result;
    } catch (error) {
        console.error(error);
        return {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false }
        };
    }
}

export async function getVehicleById(vehicleId: string): Promise<IVehicle | null> {
    try {
        const result = await window._vehicles.getById(vehicleId);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function createVehicle(vehicleData: ICreateVehicle): Promise<IVehicle | null> {
    try {
        assertPermission('vehicle:create');
        const result = await window._vehicles.create(vehicleData);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateVehicle(vehicleId: string, vehicleData: IUpdateVehicle): Promise<IVehicle | null> {
    try {
        assertPermission('vehicle:update');
        const result = await window._vehicles.update(vehicleId, vehicleData);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateStatusVehicle(vehicleId: string, data: IUpdateStatus): Promise<IVehicle | null> {
    try {
        assertPermission('vehicle:update');
        const result = await window._vehicles.updateStatus(vehicleId, data);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteVehicle(vehicleId: string): Promise<string | null> {
    try {
        assertPermission('vehicle:delete');
        const result = await window._vehicles.delete(vehicleId);
        return result as string;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getAvailableVehicles(): Promise<IVehicle[]> {
    try {
        const result = await window._vehicles.getAvailable();
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}


export async function updateVehicleMileage(vehicleId: string, mileage: number): Promise<IVehicle | null> {
    try {
        assertPermission('vehicle:update');
        const result = await window._vehicles.updateMileage(vehicleId, mileage);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function registerGpsOnVehicle(vehicleId: string, imei: string): Promise<IVehicle | null> {
    try {
        const result = await window._vehicles.registerGps(vehicleId, imei);
        return result;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function unregisterVehicleGps(vehicleId: string): Promise<{ success: boolean }> {
    const result = await window._vehicles.unregisterGps(vehicleId);
    return result;
}

export async function toggleVehicleTracking(vehicleId: string, enabled: boolean): Promise<{ success: boolean }> {
    return window._vehicles.toggleTracking(vehicleId, enabled);
}
