// ========================================
// FILE: src/helpers/maintenance-helpers.ts
// ========================================
import { ICreateMaintenance, IUpdateMaintenance, IMaintenance } from '@/lib/types/maintenance';
import { IPaginatedResult, IPaginationParams } from '@/lib/types/pagination';
import { assertPermission } from './permission-guard';

export async function getAllMaintenances(params?: IPaginationParams): Promise<IPaginatedResult<IMaintenance>> {
    try {
        const result = await window._maintenances.getAll(params);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getMaintenanceById(id: string): Promise<IMaintenance | null> {
    try {
        const result = await window._maintenances.getMaintenanceById(id);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function createMaintenance(data: ICreateMaintenance): Promise<IMaintenance | null> {
    try {
        assertPermission('maintenance:create');
        const result = await window._maintenances.create(data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function updateMaintenance(id: string, data: IUpdateMaintenance): Promise<IMaintenance | null> {
    try {
        assertPermission('maintenance:update');
        const result = await window._maintenances.update(id, data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function completeMaintenance(id: string, data: IUpdateMaintenance): Promise<IMaintenance | null> {
    try {
        assertPermission('maintenance:update');
        const result = await window._maintenances.complete(id, data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function deleteMaintenance(id: string): Promise<string | null> {
    try {
        assertPermission('maintenance:delete');
        const result = await window._maintenances.delete(id);
        return result as string;
    } catch (error) {
        throw error;
    }
}

export async function getActiveMaintenances(): Promise<IMaintenance[]> {
    try {
        const result = await window._maintenances.getActiveMaintenances();
        return result;
    } catch (error) {
        throw error;
    }
}
