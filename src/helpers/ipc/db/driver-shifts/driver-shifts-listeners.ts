// ========================================
// FILE: src/helpers/ipc/db/driver-shifts/driver-shifts-listeners.ts
// ========================================
import { ipcMain } from 'electron';
import {
  GET_ALL_DRIVER_SHIFTS,
  GET_DRIVER_SHIFT_BY_ID,
  GET_SHIFTS_FOR_DRIVER,
  GET_SHIFTS_FOR_ALL_DRIVERS,
  CREATE_DRIVER_SHIFT,
  UPDATE_DRIVER_SHIFT,
  UPDATE_DRIVER_SHIFT_STATUS,
  DELETE_DRIVER_SHIFT,
  ADD_SHIFT_MEMBER,
  REMOVE_SHIFT_MEMBER,
  SET_SHIFT_LEADER,
  UPDATE_SHIFT_MEMBER,
  REPLACE_SHIFT_MEMBERS,
} from './driver-shifts-channels';
import {
  getAllDriverShifts,
  getDriverShiftById,
  getShiftsForDriver,
  getShiftsForAllDrivers,
  createDriverShift,
  updateDriverShift,
  updateDriverShiftStatus,
  deleteDriverShift,
  addShiftMember,
  removeShiftMember,
  setShiftLeader,
  updateShiftMember,
  replaceShiftMembers,
} from '@/lib/db/queries/driver-shifts.queries.powersync';
import {
  ICreateDriverShift,
  IUpdateDriverShift,
  IAddShiftMember,
  IUpdateShiftMember,
  IDriverShiftsPaginationParams,
} from '@/lib/types/driver-shift';
import { ShiftStatus } from '@/lib/db/schemas/driver_shifts';
import { NotFoundError, ValidationError } from '@/lib/errors/AppError';

export function addDriverShiftsEventListeners() {
  ipcMain.handle(
    GET_ALL_DRIVER_SHIFTS,
    async (_, params?: IDriverShiftsPaginationParams) => await getAllDriverShiftsEvent(params)
  );

  ipcMain.handle(
    GET_DRIVER_SHIFT_BY_ID,
    async (_, id: string) => await getDriverShiftByIdEvent(id)
  );

  ipcMain.handle(
    GET_SHIFTS_FOR_DRIVER,
    async (_, driverId: string) => await getShiftsForDriverEvent(driverId)
  );

  ipcMain.handle(
    GET_SHIFTS_FOR_ALL_DRIVERS,
    async (_) => await getShiftsForAllDriversEvent()
  );

  ipcMain.handle(
    CREATE_DRIVER_SHIFT,
    async (_, data: ICreateDriverShift) => await createDriverShiftEvent(data)
  );

  ipcMain.handle(
    UPDATE_DRIVER_SHIFT,
    async (_, id: string, data: IUpdateDriverShift) => await updateDriverShiftEvent(id, data)
  );

  ipcMain.handle(
    UPDATE_DRIVER_SHIFT_STATUS,
    async (_, id: string, status: ShiftStatus) => await updateDriverShiftStatusEvent(id, status)
  );

  ipcMain.handle(
    DELETE_DRIVER_SHIFT,
    async (_, id: string) => await deleteDriverShiftEvent(id)
  );

  ipcMain.handle(
    ADD_SHIFT_MEMBER,
    async (_, shiftId: string, data: IAddShiftMember) => await addShiftMemberEvent(shiftId, data)
  );

  ipcMain.handle(
    REMOVE_SHIFT_MEMBER,
    async (_, shiftId: string, memberId: string) => await removeShiftMemberEvent(shiftId, memberId)
  );

  ipcMain.handle(
    SET_SHIFT_LEADER,
    async (_, shiftId: string, memberId: string) => await setShiftLeaderEvent(shiftId, memberId)
  );

  ipcMain.handle(
    UPDATE_SHIFT_MEMBER,
    async (_, shiftId: string, memberId: string, data: IUpdateShiftMember) => 
      await updateShiftMemberEvent(shiftId, memberId, data)
  );

  ipcMain.handle(
    REPLACE_SHIFT_MEMBERS,
    async (_, shiftId: string, members: { driver_id: string; is_leader: boolean; notes?: string }[]) => 
      await replaceShiftMembersEvent(shiftId, members)
  );
}

async function getAllDriverShiftsEvent(params?: IDriverShiftsPaginationParams) {
  return getAllDriverShifts(params || {});
}

async function getDriverShiftByIdEvent(id: string) {
  return getDriverShiftById(id);
}

async function getShiftsForDriverEvent(driverId: string) {
  return getShiftsForDriver(driverId);
}

async function getShiftsForAllDriversEvent() {
  return getShiftsForAllDrivers();
}

async function createDriverShiftEvent(data: ICreateDriverShift) {
  if (!data.name?.trim()) {
    throw new Error(new ValidationError('shifts:errors.nameRequired').toIpcString());
  }
  if (!data.start_date || !data.end_date) {
    throw new Error(new ValidationError('shifts:errors.datesRequired').toIpcString());
  }
  if (data.end_date < data.start_date) {
    throw new Error(new ValidationError('shifts:errors.endBeforeStart').toIpcString());
  }
  if (!data.start_time || !data.end_time) {
    throw new Error(new ValidationError('shifts:errors.timesRequired').toIpcString());
  }
  return createDriverShift(data);
}

async function updateDriverShiftEvent(id: string, data: IUpdateDriverShift) {
  const existing = await getDriverShiftById(id);
  if (!existing) {
    throw new Error(new NotFoundError('shifts:errors.notFound').toIpcString());
  }
  if (data.end_date && data.start_date && data.end_date < data.start_date) {
    throw new Error(new ValidationError('shifts:errors.endBeforeStart').toIpcString());
  }
  return updateDriverShift(id, data);
}

async function updateDriverShiftStatusEvent(id: string, status: ShiftStatus) {
  const existing = await getDriverShiftById(id);
  if (!existing) {
    throw new Error(new NotFoundError('shifts:errors.notFound').toIpcString());
  }
  return updateDriverShiftStatus(id, status);
}

async function deleteDriverShiftEvent(id: string) {
  const existing = await getDriverShiftById(id);
  if (!existing) {
    throw new Error(new NotFoundError('shifts:errors.notFound').toIpcString());
  }
  return deleteDriverShift(id);
}

async function addShiftMemberEvent(shiftId: string, data: IAddShiftMember) {
  const existing = await getDriverShiftById(shiftId);
  if (!existing) {
    throw new Error(new NotFoundError('shifts:errors.notFound').toIpcString());
  }
  // Verificar se o motorista já está no turno
  const alreadyMember = existing.members.some(m => m.driver_id === data.driver_id);
  if (alreadyMember) {
    throw new Error(new ValidationError('shifts:errors.driverAlreadyInShift').toIpcString());
  }
  return addShiftMember(shiftId, data);
}

async function removeShiftMemberEvent(shiftId: string, memberId: string) {
  return removeShiftMember(shiftId, memberId);
}

async function setShiftLeaderEvent(shiftId: string, memberId: string) {
  const existing = await getDriverShiftById(shiftId);
  if (!existing) {
    throw new Error(new NotFoundError('shifts:errors.notFound').toIpcString());
  }
  return setShiftLeader(shiftId, memberId);
}

async function updateShiftMemberEvent(shiftId: string, memberId: string, data: IUpdateShiftMember) {
  return updateShiftMember(shiftId, memberId, data);
}

async function replaceShiftMembersEvent(
  shiftId: string,
  members: { driver_id: string; is_leader: boolean; notes?: string }[]
) {
  const existing = await getDriverShiftById(shiftId);
  if (!existing) {
    throw new Error(new NotFoundError('shifts:errors.notFound').toIpcString());
  }
  return replaceShiftMembers(shiftId, members);
}