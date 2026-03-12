import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MotorcyclePage } from "./pages/MotorcyclePage";
import { AddRepairPage } from "./pages/AddRepairPage";
import { DebtsPage } from "./pages/DebtsPage";
import { RecordsPage } from "./pages/RecordsPage";
import { NewMotorcyclePage } from "./pages/NewMotorcyclePage";
import { AccountPage } from "./pages/AccountPage";
import { PublicTrackingPage } from "./pages/PublicTrackingPage";
import { QrRedirectPage } from "./pages/QrRedirectPage";
import { CameraScannerPage } from "./pages/CameraScannerPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/giris" replace />} />
      <Route path="/giris" element={<LoginPage />} />
      <Route path="/yonetici/giris" element={<AdminLoginPage />} />
      <Route path="/yonetici/panel" element={<AdminPanelPage />} />
      <Route path="/kayit" element={<Navigate to="/giris" replace />} />
      <Route path="/qr/:token" element={<QrRedirectPage />} />
      <Route path="/takip/:token" element={<PublicTrackingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/panel" element={<DashboardPage />} />
        <Route path="/kamera" element={<CameraScannerPage />} />
        <Route path="/hesap" element={<AccountPage />} />
        <Route path="/kayitlar" element={<RecordsPage />} />
        <Route path="/motosiklet-yeni" element={<NewMotorcyclePage />} />
        <Route path="/motosiklet/:motorcycleId" element={<MotorcyclePage />} />
        <Route path="/motosiklet/:motorcycleId/islem-yeni" element={<AddRepairPage />} />
        <Route path="/borclar" element={<DebtsPage />} />
      </Route>
    </Routes>
  );
}
