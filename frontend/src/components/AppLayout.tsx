import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Navi</h1>
        <nav className="app-nav">
          <NavLink to="/navigate" className={({ isActive }) => (isActive ? "active" : "")}>
            导航
          </NavLink>
          <NavLink to="/places" className={({ isActive }) => (isActive ? "active" : "")}>
            商家
          </NavLink>
        </nav>
        <div className="app-header-user">
          <span>{user?.name}</span>
          <button onClick={logout}>退出登录</button>
        </div>
      </header>
      <div className="app-body">
        <Outlet />
      </div>
    </div>
  );
}
