// ========================================
// FILE: src/helpers/maintenance-category-helpers.ts
// ========================================
import { ICreateMaintenanceCategory, IUpdateMaintenanceCategory, IMaintenanceCategory } from "@/lib/types/maintenance_category";
import { assertPermission } from './permission-guard';

export async function createMaintenanceCategory(data: ICreateMaintenanceCategory): Promise<IMaintenanceCategory> {
    try {
        assertPermission('maintenance_category:create');
        const result = await window._maintenance_categories.create(data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getAllMaintenanceCategories(): Promise<IMaintenanceCategory[]> {
    try {
        const result = await window._maintenance_categories.getAll();
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getMaintenanceCategoryById(id: string): Promise<IMaintenanceCategory | null> {
    try {
        const result = await window._maintenance_categories.getById(id);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function updateMaintenanceCategory(id: string, data: IUpdateMaintenanceCategory): Promise<IMaintenanceCategory> {
    try {
        assertPermission('maintenance_category:update');
        const result = await window._maintenance_categories.update(id, data);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function deleteMaintenanceCategory(id: string): Promise<string> {
    try {
        assertPermission('maintenance_category:delete');
        const result = await window._maintenance_categories.delete(id);
        return result;
    } catch (error) {
        throw error;
    }
}

export async function getActiveMaintenanceCategories(): Promise<IMaintenanceCategory[]> {
    try {
        const result = await window._maintenance_categories.getActive();
        return result;
    } catch (error) {
        throw error;
    }
}
