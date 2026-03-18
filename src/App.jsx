import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Trip from "./pages/Trip";
import Result from "./pages/Result";

function App() {

  return (
    <Router>

      <Routes>
        <Route path="/" element={<Trip />} />
        <Route path="/result" element={<Result />} />
      </Routes>

    </Router>
  );

}

export default App;