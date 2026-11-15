// src/helpers/routes-helpers.ts
import { ICreateRoute, IUpdateRoute, IRoute } from "@/lib/types/route";
import { assertPermission } from './permission-guard';

export async function createRoute(data: ICreateRoute): Promise<IRoute> {
    try {
        assertPermission('route:create');
        const result = await window._routes.create(data);
        return result;
    } catch (error) {
        console.error("Error creating route:", error);
        throw error;
    }
}

export async function getAllRoutes(): Promise<IRoute[]> {
    try {
        const result = await window._routes.getAll();
        return result;
    } catch (error) {
        console.error("Error getting routes:", error);
        throw error;
    }
}

export async function getRouteById(id: string): Promise<IRoute | null> {
    try {
        const result = await window._routes.getById(id);
        return result;
    } catch (error) {
        console.error("Error getting route:", error);
        throw error;
    }
}

export async function updateRoute(id: string, data: IUpdateRoute): Promise<IRoute> {
    try {
        assertPermission('route:update');
        const result = await window._routes.update(id, data);
        return result;
    } catch (error) {
        console.error("Error updating route:", error);
        throw error;
    }
}

export async function deleteRoute(id: string): Promise<string> {
    try {
        assertPermission('route:delete');
        const result = await window._routes.delete(id);
        return result;
    } catch (error) {
        console.error("Error deleting route:", error);
        throw error;
    }
}

export async function getActiveRoutes(): Promise<IRoute[]> {
    try {
        const result = await window._routes.getActive();
        return result;
    } catch (error) {
        console.error("Error getting active routes:", error);
        throw error;
    }
}
