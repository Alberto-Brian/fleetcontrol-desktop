// ========================================
// FILE: src/helpers/vehicle-category-helpers.ts
// ========================================
import { ICreateVehicleCategory, IUpdateVehicleCategory, IVehicleCategory } from '@/lib/types/vehicle-category';
import { extractAppError } from '@/helpers/error-helpers';
import { assertPermission } from './permission-guard';

export async function getAllVehicleCategories(): Promise<IVehicleCategory[]> {
    try {
        const result = await window._vehicle_categories.getAll();
        return result;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function createVehicleCategory(data: ICreateVehicleCategory): Promise<IVehicleCategory> {
    try {
        assertPermission('category:create');
        const result = await window._vehicle_categories.create(data);
        return result;
    } catch (error: any) {
        throw error
    }
}

export async function updateVehicleCategory(id: string, data: IUpdateVehicleCategory): Promise<IVehicleCategory | null> {
    try {
        assertPermission('category:update');
        const result = await window._vehicle_categories.update(id, data);
        return result;
    } catch (error) {
        throw error
    }
}

export async function restoreVehicleCategory(id: string): Promise<IVehicleCategory | null> {
    try {
        assertPermission('category:update');
        const result = await window._vehicle_categories.update(id, {
            is_active: true,
            deleted_at: null,
            updated_at: new Date().toISOString()
        });
        return result;
    } catch (error) {
        throw error;
    }
}

export async function deleteVehicleCategory(id: string): Promise<string | null> {
    try {
        assertPermission('category:delete');
        const result = await window._vehicle_categories.delete(id);
        return result as string;
    } catch (error) {
        throw error
    }
}
