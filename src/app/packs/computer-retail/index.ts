/**
 * computer-retail Industry Pack
 *
 * Registers all routes, dashboard tabs, and service descriptors for the
 * DESKTO Computer Retail & Gaming Hub vertical.
 *
 * Tab component IDs are intentionally aligned with the dashboard switch-case
 * keys (e.g. "builder", not "custom-builder") so the registry dispatch works
 * without any key translation.
 */
import ServicesPage from "../../ServicesPage";

import {
  PackAdminRepairs,
  PackAdminCustomBuilder,
  PackAdminPCBuilds,
  PackAdminAssembly,
  PackAdminUpgrades,
  PackAdminSoftware,
  PackAdminRentals,
  PackAdminMarketplace,
  PackAdminGamingHub,
  PackAdminSupport,
} from "./tabs/admin";

import {
  PackStaffRepairs,
  PackStaffPCBuilds,
  PackStaffGamingHub,
} from "./tabs/staff";

import {
  PackCustomerRepairs,
  PackCustomerRentals,
  PackCustomerPCBuilds,
  PackCustomerUpgrades,
  PackCustomerSoftware,
  PackCustomerSell,
  PackCustomerAssembly,
  PackCustomerSupport,
} from "./tabs/customer";

import {
  Wrench, Cpu, ShoppingCart, RefreshCw, Database, Terminal,
  Play, ShieldAlert, Headphones, Store,
} from "lucide-react";

import type { IndustryPack } from "../../core/industryPack";

export const computerRetailPack: IndustryPack = {
  id: "computer-retail",
  name: "Computer Retail & Gaming Hub Pack",
  description: "Computer retail, custom builder, hardware repair, assembly and rental workflow",

  routes: [
    {
      path: "/services",
      label: "Services & Custom Builds",
      component: ServicesPage,
      showInNavbar: true,
    },
  ],

  dashboardTabs: {
    admin: [
      { id: "repairs",     label: "Repairs",              icon: Wrench,      component: PackAdminRepairs,       displayOrder: 40, group: "Operations" },
      { id: "builder",     label: "Custom Builder",       icon: Cpu,         component: PackAdminCustomBuilder, displayOrder: 41, group: "Operations" },
      { id: "builds",      label: "PC Builds Requests",   icon: Cpu,         component: PackAdminPCBuilds,      displayOrder: 42, group: "Operations" },
      { id: "assembly",    label: "Assembly Workflow",    icon: Terminal,    component: PackAdminAssembly,      displayOrder: 43, group: "Operations" },
      { id: "upgrades",    label: "Upgrades Workflow",    icon: RefreshCw,   component: PackAdminUpgrades,      displayOrder: 44, group: "Operations" },
      { id: "software",    label: "Software Services",    icon: Database,    component: PackAdminSoftware,      displayOrder: 45, group: "Operations" },
      { id: "rentals",     label: "Rental Workflow",      icon: ShoppingCart,component: PackAdminRentals,       displayOrder: 46, group: "Operations" },
      { id: "marketplace", label: "Used Marketplace",     icon: Store,       component: PackAdminMarketplace,   displayOrder: 47, group: "Operations" },
      { id: "gaming",      label: "Gaming Hub CMS",       icon: Play,        component: PackAdminGamingHub,     displayOrder: 48, group: "Marketing"  },
      { id: "support",     label: "Remote IT Support",    icon: ShieldAlert, component: PackAdminSupport,       displayOrder: 49, group: "Operations" },
    ],

    staff: [
      { id: "repairs", label: "Repairs Worklist",      icon: Wrench,     component: PackStaffRepairs,   displayOrder: 20, group: "Operations" },
      { id: "builds",  label: "Assembly Queue",        icon: Cpu,        component: PackStaffPCBuilds,  displayOrder: 21, group: "Operations" },
      { id: "gaming",  label: "Gaming Hub Articles",   icon: Play,       component: PackStaffGamingHub, displayOrder: 22, group: "Operations" },
    ],

    customer: [
      { id: "repairs",  label: "My Repair Tickets",  icon: Wrench,       component: PackCustomerRepairs,  displayOrder: 20 },
      { id: "upgrades", label: "Upgrade Requests",   icon: RefreshCw,    component: PackCustomerUpgrades, displayOrder: 21 },
      { id: "software", label: "Software Tickets",   icon: Database,     component: PackCustomerSoftware, displayOrder: 22 },
      { id: "rentals",  label: "My Rentals",         icon: ShoppingCart, component: PackCustomerRentals,  displayOrder: 23 },
      { id: "sell",     label: "Sell Used",          icon: Store,        component: PackCustomerSell,     displayOrder: 24 },
      { id: "builds",   label: "My PC Builds",       icon: Cpu,          component: PackCustomerPCBuilds, displayOrder: 25 },
      { id: "assembly", label: "Assembly Requests",  icon: Terminal,     component: PackCustomerAssembly, displayOrder: 26 },
      { id: "support",  label: "Remote Support",     icon: Headphones,   component: PackCustomerSupport,  displayOrder: 27 },
    ],
  },

  services: [],
  defaultConfig: {},
};
