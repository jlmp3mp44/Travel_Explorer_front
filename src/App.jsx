import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/NavBar.jsx";
import Home from "./pages/Home";
import Trip from "./pages/Trip";
import Result from "./pages/Result";
import TripDetails from "./pages/TripDetails";
import Register from "./pages/Register";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <Navbar /> {/* Navbar на всіх сторінках */}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trip" element={<Trip />} />
        <Route path="/result" element={<Result />} />
        <Route path="/trip/:id" element={<TripDetails />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;