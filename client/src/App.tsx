import { Switch, Route } from "wouter";
import Home      from "@/pages/Home";
import Auth      from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Create    from "@/pages/Create";
import Market    from "@/pages/Market";
import ProjectLibrary from "@/pages/ProjectLibrary";
import ProjectDetail from "@/pages/ProjectDetail";
import Settings from "@/pages/Settings";
import NotFound  from "@/pages/NotFound";

export default function App() {
  return (
    <Switch>
      <Route path="/"          component={Home} />
      <Route path="/auth"      component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/create"    component={Create} />
      <Route path="/market"    component={Market} />
      <Route path="/projects"  component={ProjectLibrary} />
      <Route path="/settings"  component={Settings} />
      <Route path="/projects/:id">{params => <ProjectDetail params={params as { id: string }} />}</Route>
      <Route                   component={NotFound} />
    </Switch>
  );
}
