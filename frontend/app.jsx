import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignUp from "./pages/SignUp";
import BusinessInfo from "./pages/BusinessInfo";
import Dashboard from "./pages/Dashboard";
import Initiatives from "./pages/Initiatives";
import InitiativeCompare from "./pages/InitiativeCompare";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-primary-light dark:bg-primary-dark text-gray-900 dark:text-gray-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<SignUp />} />
          <Route path="/business-info" element={<BusinessInfo />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/initiatives" element={<Initiatives />} />
          <Route path="/compare/:id" element={<InitiativeCompare />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
