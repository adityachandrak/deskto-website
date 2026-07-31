/**
 * computer-retail / customer tab wrappers
 *
 * Each component is self-contained (zero props) and pulls data from
 * DashboardDataContext, so the pack registry can render them without
 * CustomerDashboard knowing about them.
 */
import React from "react";
import { useDashboardContext } from "../../../../core/DashboardDataContext";
import {
  CustomerRepairs,
  CustomerRentalRequests,
  CustomerPCBuilds,
  CustomerUpgrades,
  CustomerSoftwareServices,
  CustomerSellRequests,
  CustomerAssembly,
  CustomerSupportRequests,
} from "../../../../CustomerDashboard.tabs";

export function PackCustomerRepairs() {
  const { data: { store, updateRepairStatus, patchRepair }, user } = useDashboardContext();
  return (
    <CustomerRepairs
      user={user}
      store={store}
      updateRepairStatus={updateRepairStatus}
      patchRepair={patchRepair}
    />
  );
}

export function PackCustomerRentals() {
  const { data: { store, patchServiceRequest }, user } = useDashboardContext();
  return <CustomerRentalRequests user={user} store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackCustomerPCBuilds() {
  const { data: { store, patchPCBuild }, user } = useDashboardContext();
  return <CustomerPCBuilds user={user} store={store} patchPCBuild={patchPCBuild} />;
}

export function PackCustomerUpgrades() {
  const { data: { store, patchServiceRequest }, user } = useDashboardContext();
  return <CustomerUpgrades user={user} store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackCustomerSoftware() {
  const { data: { store, patchServiceRequest }, user } = useDashboardContext();
  return <CustomerSoftwareServices user={user} store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackCustomerSell() {
  const { data: { store, patchServiceRequest }, user } = useDashboardContext();
  return <CustomerSellRequests user={user} store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackCustomerAssembly() {
  const { data: { store, patchServiceRequest }, user } = useDashboardContext();
  return <CustomerAssembly user={user} store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackCustomerSupport() {
  const { data: { store, patchServiceRequest }, user } = useDashboardContext();
  return <CustomerSupportRequests user={user} store={store} patchServiceRequest={patchServiceRequest} />;
}
