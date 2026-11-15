// src/helpers/fuel-station-helpers.ts
import { ICreateFuelStation, IUpdateFuelStation, IFuelStation } from "@/lib/types/fuel-station";
import { assertPermission } from './permission-guard';

export async function getAllFuelStations(): Promise<IFuelStation[]> {
    try {
        const result = await window._fuel_stations.getAll();
        return result;
    } catch (error) {
        throw error;
    }
}

export async function createFuelStation(data: ICreateFuelStation): Promise<IFuelStation> {
    try {
        assertPermission('fuel_station:create');
        const result = await window._fuel_stations.create(data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function updateFuelStation(id: string, data: IUpdateFuelStation): Promise<IFuelStation> {
    try {
        assertPermission('fuel_station:update');
        const result = await window._fuel_stations.update(id, data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function deleteFuelStation(id: string): Promise<string> {
    try {
        assertPermission('fuel_station:delete');
        const result = await window._fuel_stations.delete(id);
        return result;
    } catch (error) {
        throw error;
    }
}
