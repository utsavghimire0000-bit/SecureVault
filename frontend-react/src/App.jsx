import { Routes, Route, Navigate } from "react-router-dom";
import Login     from "./pages/Login";
import Register  from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Login />} />
      <Route path="/register"  element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    </Routes>
  );
}
