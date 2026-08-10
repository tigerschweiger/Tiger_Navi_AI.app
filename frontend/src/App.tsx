import { Navigate as Redirect, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Navigate } from "./pages/Navigate";

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
        path="/navigate"
        element={
          <RequireAuth>
            <Navigate />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Redirect to="/navigate" replace />} />
    </Routes>
  );
}
