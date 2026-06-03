import React from 'react';
import './App.css';
import Header from './components/Header';
import Nav from './components/Nav';
import AdminGuard from './components/AdminGuard';
import { BrowserRouter as Router, Switch, Route, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import Skills from './pages/Skills';
import Packages from './pages/Packages';
import Suites from './pages/Suites';
import Overlays from './pages/Overlays';
import Customers from './pages/Customers';
import Workspaces from './pages/Workspaces';
import Entitlements from './pages/Entitlements';
import CreditPools from './pages/CreditPools';
import Agents from './pages/Agents';
import Runs from './pages/Runs';
import Approvals from './pages/Approvals';
import Audit from './pages/Audit';
import Integrations from './pages/Integrations';
import RoutingDemo from './pages/RoutingDemo';
import Footer from './components/Footer';

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className={`app-shell ${isLoginPage ? 'app-shell--login' : ''}`}>
      {!isLoginPage && (
        <aside className="app-sidebar">
          <Header />
          <Nav />
        </aside>
      )}
      <div className="app-main">
        <Switch>
          <Route path="/login" component={Login} />
          <AdminGuard>
            <Route exact path="/" component={Dashboard} />
            <Route path="/skills" component={Skills} />
            <Route path="/packages" component={Packages} />
            <Route path="/suites" component={Suites} />
            <Route path="/overlays" component={Overlays} />
            <Route path="/customers" component={Customers} />
            <Route path="/workspaces" component={Workspaces} />
            <Route path="/entitlements" component={Entitlements} />
            <Route path="/credit-pools" component={CreditPools} />
            <Route path="/agents" component={Agents} />
            <Route path="/runs" component={Runs} />
            <Route path="/routing" component={RoutingDemo} />
            <Route path="/approvals" component={Approvals} />
            <Route path="/integrations" component={Integrations} />
            <Route path="/audit" component={Audit} />
            <Route path="/reports" component={require('./pages/Reports').default} />
          </AdminGuard>
        </Switch>
        {!isLoginPage && <Footer />}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
