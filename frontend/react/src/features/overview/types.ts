export type Overview = {
  groups: {
    all: number;
    active: number;
    suspended: number;
    archived: number;
    withoutOwner: number;
  };
  stores: { total: number; pdv: number; cd: number };
  attention: {
    groupsWithoutOwner: number;
    storesValidationAttention: { stores: number; groups: number };
    requestsWaitingPlatform: { requests: number; stores: number };
    documentAlerts: { docs: number; stores: number };
    storesPending: number;
    storesLowCompleteness: number;
  };
};
