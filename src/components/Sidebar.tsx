
import React from 'react';
import { Sidebar as SidebarComponent } from './sidebar/Sidebar';

// This wrapper component now simply renders the Sidebar without adding a Router context
const Sidebar = () => {
  return <SidebarComponent />;
};

export default Sidebar;
