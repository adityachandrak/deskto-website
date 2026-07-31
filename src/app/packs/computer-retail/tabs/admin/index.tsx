/**
 * computer-retail / admin tab wrappers
 *
 * Each component is self-contained (zero props) and pulls the dashboard data
 * it needs from DashboardDataContext, so the pack registry can render them
 * without the AdminDashboard knowing about them.
 */
import React from "react";
import { useDashboardContext } from "../../../../core/DashboardDataContext";
import {
  AdminRepairs,
  AdminCustomBuilder,
  AdminCustomPC,
  AdminAssemblyService,
  AdminUpgrades,
  AdminSoftwareServices,
  AdminRentalWorkflow,
  AdminSellRequests,
  AdminSupportWorkflow,
  AdminGamingHub,
} from "../../../../AdminDashboard.tabs";

export function PackAdminRepairs() {
  const { data: { store, updateRepairStatus, patchRepair } } = useDashboardContext();
  return <AdminRepairs store={store} updateRepairStatus={updateRepairStatus} patchRepair={patchRepair} />;
}

export function PackAdminCustomBuilder() {
  const { data } = useDashboardContext();
  return (
    <AdminCustomBuilder
      store={data.store}
      patchCustomBuilderConfig={data.patchCustomBuilderConfig}
      publishBuilderConfig={data.publishBuilderConfig}
      addBuilderComponent={data.addBuilderComponent}
      updateBuilderComponent={data.updateBuilderComponent}
      removeBuilderComponent={data.removeBuilderComponent}
      reorderBuilderComponents={data.reorderBuilderComponents}
      updateBuildPurpose={data.updateBuildPurpose}
      addBuildPurpose={data.addBuildPurpose}
      removeBuildPurpose={data.removeBuildPurpose}
      updatePricingRules={data.updatePricingRules}
      updateContentConfig={data.updateContentConfig}
      updateDefaultPreset={data.updateDefaultPreset}
      getBuilderMetrics={data.getBuilderMetrics}
    />
  );
}

export function PackAdminPCBuilds() {
  const { data: { store, patchPCBuild } } = useDashboardContext();
  return <AdminCustomPC store={store} patchPCBuild={patchPCBuild} />;
}

export function PackAdminAssembly() {
  const { data: { store, patchServiceRequest } } = useDashboardContext();
  return <AdminAssemblyService store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackAdminUpgrades() {
  const { data: { store, patchServiceRequest } } = useDashboardContext();
  return <AdminUpgrades store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackAdminSoftware() {
  const { data: { store, patchServiceRequest } } = useDashboardContext();
  return <AdminSoftwareServices store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackAdminRentals() {
  const { data: { store, patchServiceRequest } } = useDashboardContext();
  return <AdminRentalWorkflow store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackAdminMarketplace() {
  const { data: { store, patchServiceRequest } } = useDashboardContext();
  return <AdminSellRequests store={store} patchServiceRequest={patchServiceRequest} />;
}

export function PackAdminGamingHub() {
  const { data: { store, addGamingHubItem, patchGamingHubItem, deleteGamingHubItem } } = useDashboardContext();
  return (
    <AdminGamingHub
      store={store}
      addGamingHubItem={addGamingHubItem}
      patchGamingHubItem={patchGamingHubItem}
      deleteGamingHubItem={deleteGamingHubItem}
    />
  );
}

export function PackAdminSupport() {
  const { data: { store, patchServiceRequest } } = useDashboardContext();
  return <AdminSupportWorkflow store={store} patchServiceRequest={patchServiceRequest} />;
}
