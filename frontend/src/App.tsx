import { Navigate as Redirect, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/AppLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Navigate } from "./pages/Navigate";
import { Places } from "./pages/Places";
import { BusinessDetail } from "./pages/BusinessDetail";
import { BusinessForm } from "./pages/BusinessForm";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Redirect to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/navigate" element={<Navigate />} />
        <Route path="/places" element={<Places />} />
        <Route path="/places/new" element={<BusinessForm mode="create" />} />
        <Route path="/places/:id" element={<BusinessDetail />} />
        <Route path="/places/:id/edit" element={<BusinessForm mode="edit" />} />
      </Route>
      <Route path="*" element={<Redirect to="/navigate" replace />} />
    </Routes>
  );
}
