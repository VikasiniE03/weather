import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Header } from "./components/Header";
import { AlgorithmExplainerModal } from "./components/AlgorithmExplainerModal";
import { OperatorSmsModal } from "./components/OperatorSmsModal";
import { triggerManualTick, resetSimulation } from "./services/api";

// Page Views
import CentralDashboardPage from "./pages/CentralDashboardPage";
import StationDashboardPage from "./pages/StationDashboardPage";
import ComparisonPage from "./pages/ComparisonPage";
import IncidentsPage from "./pages/IncidentsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SimulatorPage from "./pages/SimulatorPage";
import OperatorsPage from "./pages/OperatorsPage";
import LoginPage from "./pages/LoginPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";

function AppLayout() {
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);

  const handleManualTick = async () => {
    try {
      await triggerManualTick();
      setGlobalMessage("Cycle advanced manually.");
      setTimeout(() => setGlobalMessage(null), 3000);
    } catch (err) {
      console.error("Step error:", err);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset entire simulation to initial baseline state?")) return;
    try {
      await resetSimulation();
      setGlobalMessage("Simulation reset to baseline.");
      setTimeout(() => setGlobalMessage(null), 3000);
    } catch (err) {
      console.error("Reset error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      {/* Top Application Header with Navigation & Auth */}
      <Header
        onManualTick={handleManualTick}
        onReset={handleReset}
        onOpenExplainer={() => setIsExplainerOpen(true)}
        onOpenOperatorModal={() => setIsOperatorModalOpen(true)}
      />

      {/* Global Action Banner */}
      {globalMessage && (
        <div className="bg-zinc-900 text-white text-xs font-mono py-1.5 px-4 text-center">
          ⚡ {globalMessage}
        </div>
      )}

      {/* Dynamic Route Content */}
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<CentralDashboardPage />} />
          <Route path="/station/:id" element={<StationDashboardPage />} />
          <Route path="/comparison" element={<ComparisonPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/operators" element={<OperatorsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Global Modals */}
      <AlgorithmExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      <OperatorSmsModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-4 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AERO-SENSE // Spatial-Temporal Weather Anomaly Detection Network • Station Operator SMS Dispatch Protocol Active
          </div>
          <div className="flex items-center space-x-4 text-zinc-500">
            <span>Model: Spatial-Temporal Haversine + IDW</span>
            <span className="text-emerald-700 font-medium">Cellular Link: GSM Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
