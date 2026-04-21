import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/NavBar.jsx";
import Home from "./pages/Home";
import Trip from "./pages/Trip";
import Result from "./pages/Result";
import TripDetails from "./pages/TripDetails";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import MyTrips from "./pages/MyTrips";
import TripDeletedFlashBanner from "./components/TripDeletedFlashBanner";

function App() {
  return (
    <AuthProvider>
      <Router>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Navbar />

        <main id="main-content" className="app-main" tabIndex={-1}>
          <div className="trip-deleted-flash-host">
            <TripDeletedFlashBanner />
          </div>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/my-trips" element={<MyTrips />} />
            <Route path="/trip" element={<Trip />} />
            <Route path="/result" element={<Result />} />
            <Route path="/trip/:id" element={<TripDetails />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;