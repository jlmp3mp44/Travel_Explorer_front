import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Trip from "./pages/Trip";
import Result from "./pages/Result";
import TripDetails from "./pages/TripDetails";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} /> {/* головна */}
        <Route path="/trip" element={<Trip />} />
        <Route path="/result" element={<Result />} />
        <Route path="/trip/:id" element={<TripDetails />} />
      </Routes>
    </Router>
  );
}

export default App;