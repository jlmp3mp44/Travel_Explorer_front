import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/NavBar.jsx";
import Home from "./pages/Home";
import Trip from "./pages/Trip";
import Result from "./pages/Result";
import TripDetails from "./pages/TripDetails";
import Register from "./pages/Register";
import Login from "./pages/Login";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trip" element={<Trip />} />
          <Route path="/result" element={<Result />} />
          <Route path="/trip/:id" element={<TripDetails />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;