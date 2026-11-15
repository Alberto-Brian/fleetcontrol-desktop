// ========================================
// FILE: src/helpers/driver-helpers.ts
// ========================================
import { ICreateDriver, IUpdateDriver, IDriver } from '@/lib/types/driver';
import { IPaginationParams, IPaginatedResult } from '@/lib/types/pagination';
import { assertPermission } from './permission-guard';


export async function getAllDrivers(params?: IPaginationParams): Promise<IPaginatedResult<IDriver>> {
    try {
        const result = await window._drivers.getAll(params);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getDriverById(id: string): Promise<IDriver | null> {
    try {
        const result = await window._drivers.getById(id);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function createDriver(data: ICreateDriver): Promise<IDriver | null> {
    try {
        assertPermission('driver:create');
        const result = await window._drivers.create(data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function updateDriver(id: string, data: IUpdateDriver): Promise<IDriver | null> {
    try {
        assertPermission('driver:update');
        const result = await window._drivers.update(id, data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function deleteDriver(id: string): Promise<string | null> {
    try {
        assertPermission('driver:delete');
        const result = await window._drivers.delete(id);
        return result as string;
    } catch (error) {
        throw error;
    }
}

export async function getActiveDrivers(): Promise<IDriver[]> {
    try {
        const result = await window._drivers.getActive();
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getAvailableDrivers(): Promise<IDriver[]> {
    try {
        const result = await window._drivers.getAvailable();
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getExpiringLicenses(days: number = 30): Promise<IDriver[]> {
    try {
        const result = await window._drivers.getExpiringLicenses(days);
        return result;
    } catch (error) {
        throw error;
    }
}
