import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";
import StockDetail from "./StockDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock/:symbol" element={<StockDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
