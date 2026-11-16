// ========================================
// FILE: src/helpers/ipc/db/driver-leaves/driver-leaves-listeners.ts
// ========================================
import { ipcMain } from 'electron';
import {
  GET_ALL_DRIVER_LEAVES,
  GET_LEAVES_BY_DRIVER,
  GET_DRIVER_LEAVE_BY_ID,
  CREATE_DRIVER_LEAVE,
  UPDATE_DRIVER_LEAVE,
  CANCEL_DRIVER_LEAVE,
  RUN_LEAVE_SCHEDULER,
} from './driver-leaves-channels';
import {
  getAllDriverLeaves,
  getLeavesByDriver,
  getDriverLeaveById,
  createDriverLeave,
  updateDriverLeave,
  cancelDriverLeave,
  hasOverlappingLeave,
} from '@/lib/db/queries/driver_leaves.queries.powersync';
import { runLeaveSchedulerCycle } from '@/lib/db/schedulers/leave-scheduler';
import { leaveStatus } from '@/lib/db/schemas/driver_leaves';
import { ICreateDriverLeave, IUpdateDriverLeave, ICancelDriverLeave, IDriverLeavesPaginationParams } from '@/lib/types/driver-leave';
import { ValidationError, ConflictError } from '@/lib/errors/AppError';

export function addDriverLeavesEventListeners() {

  // ── GET ALL ─────────────────────────────────────────────────────────
  ipcMain.handle(GET_ALL_DRIVER_LEAVES, async (_, params?: IDriverLeavesPaginationParams) =>
    getAllDriverLeaves(params || {})
  );

  // ── GET BY DRIVER ────────────────────────────────────────────────────
  ipcMain.handle(GET_LEAVES_BY_DRIVER, async (_, driverId: string) =>
    getLeavesByDriver(driverId)
  );

  // ── GET BY ID ────────────────────────────────────────────────────────
  ipcMain.handle(GET_DRIVER_LEAVE_BY_ID, async (_, leaveId: string) =>
    getDriverLeaveById(leaveId)
  );

  // ── CREATE ───────────────────────────────────────────────────────────
  ipcMain.handle(CREATE_DRIVER_LEAVE, async (_, data: ICreateDriverLeave) => {
    try {
      // Validação: start_date não pode ser no passado
      const today = new Date().toISOString().split('T')[0];
      if (data.start_date < today) {
        throw new ValidationError('drivers:leaves.errors.startDateInPast').toIpcString();
      }

      // Validação: end_date >= start_date
      if (data.end_date < data.start_date) {
        throw new ValidationError('drivers:leaves.errors.endBeforeStart').toIpcString();
      }

      // Validação: sobreposição com outras férias
      const hasOverlap = await hasOverlappingLeave(
        data.driver_id,
        data.start_date,
        data.end_date
      );
      if (hasOverlap) {
        throw new ConflictError('drivers:leaves.errors.overlapping').toIpcString();
      }

      const leave = await createDriverLeave(data);

      // Se start_date === hoje → forçar ciclo do scheduler imediatamente
      if (data.start_date === today) {
        runLeaveSchedulerCycle();
      }

      return leave;
    } catch (error) {
      throw error;
    }
  });

  // ── UPDATE ───────────────────────────────────────────────────────────
  ipcMain.handle(UPDATE_DRIVER_LEAVE, async (_, leaveId: string, data: IUpdateDriverLeave) => {
    try {
      const leave = await getDriverLeaveById(leaveId);
      if (!leave) throw new ValidationError('drivers:leaves.errors.notFound').toIpcString();

      // Só pode editar se ainda estiver scheduled
      if (leave.status !== leaveStatus.SCHEDULED) {
        throw new ValidationError('drivers:leaves.errors.cannotEditNonScheduled').toIpcString();
      }

      const newStart = data.start_date ?? leave.start_date;
      const newEnd   = data.end_date   ?? leave.end_date;

      if (newEnd < newStart) {
        throw new ValidationError('drivers:leaves.errors.endBeforeStart').toIpcString();
      }

      const hasOverlap = await hasOverlappingLeave(
        leave.driver_id,
        newStart,
        newEnd,
        leaveId
      );
      if (hasOverlap) {
        throw new ConflictError('drivers:leaves.errors.overlapping').toIpcString();
      }

      return updateDriverLeave(leaveId, data);
    } catch (error) {
      throw error;
    }
  });

  // ── CANCEL ───────────────────────────────────────────────────────────
  ipcMain.handle(CANCEL_DRIVER_LEAVE, async (_, leaveId: string, data?: ICancelDriverLeave) => {
    try {
      return cancelDriverLeave(leaveId, data);
    } catch (error) {
      throw error;
    }
  });

  // ── FORCE SCHEDULER CYCLE (para testes / debug) ───────────────────────
  ipcMain.handle(RUN_LEAVE_SCHEDULER, async () => {
    await runLeaveSchedulerCycle();
    return { ok: true };
  });
}