import React from "react";

export interface PackRoute {
  path: string;
  label?: string;
  component: React.ComponentType<any>;
  requiresAuth?: boolean;
  allowedRoles?: string[];
  showInNavbar?: boolean;
}

export interface PackDashboardTab {
  id: string;
  label: string;
  icon: any; // Can be Lucide Icon component or string emoji
  component: React.ComponentType<any>;
  displayOrder: number;
  /** Sidebar group name (e.g. "Operations"). Defaults to "Operations" if omitted. */
  group?: string;
}

export interface PackServiceDescriptor {
  slug: string;
  title: string;
  shortDescription: string;
  icon: any;
  color: string;
  tag: string;
}

export interface IndustryPack {
  id: string;
  name: string;
  description: string;
  routes: PackRoute[];
  dashboardTabs: {
    admin?: PackDashboardTab[];
    staff?: PackDashboardTab[];
    customer?: PackDashboardTab[];
  };
  services: PackServiceDescriptor[];
  defaultConfig: any;
}
