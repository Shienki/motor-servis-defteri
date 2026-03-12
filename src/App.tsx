import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MotorcyclePage } from "./pages/MotorcyclePage";
import { AddRepairPage } from "./pages/AddRepairPage";
import { DebtsPage } from "./pages/DebtsPage";
import { RecordsPage } from "./pages/RecordsPage";
import { NewMotorcyclePage } from "./pages/NewMotorcyclePage";
import { AccountPage } from "./pages/AccountPage";
import { ServiceManagementPage } from "./pages/ServiceManagementPage";
import { PublicTrackingPage } from "./pages/PublicTrackingPage";
import { QrHubPage } from "./pages/QrHubPage";
import { QrRedirectPage } from "./pages/QrRedirectPage";
import { CameraScannerPage } from "./pages/CameraScannerPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/giris" replace />} />
      <Route path="/giris" element={<LoginPage />} />
      <Route path="/kayit" element={<RegisterPage />} />
      <Route path="/qr/:token" element={<QrRedirectPage />} />
      <Route path="/takip/:token" element={<PublicTrackingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/panel" element={<DashboardPage />} />
        <Route path="/kamera" element={<CameraScannerPage />} />
        <Route path="/hesap" element={<AccountPage />} />
        <Route path="/servis-yonetimi" element={<ServiceManagementPage />} />
        <Route path="/qr-merkezi" element={<QrHubPage />} />
        <Route path="/kayitlar" element={<RecordsPage />} />
        <Route path="/motosiklet-yeni" element={<NewMotorcyclePage />} />
        <Route path="/motosiklet/:motorcycleId" element={<MotorcyclePage />} />
        <Route path="/motosiklet/:motorcycleId/islem-yeni" element={<AddRepairPage />} />
        <Route path="/borclar" element={<DebtsPage />} />
      </Route>
    </Routes>
  );
}
