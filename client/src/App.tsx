import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { type ReactElement, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "./store/hooks";
import { fetchMe } from "./store/authSlice";
import GlobalSpinner from "./components/common/GlobalSpinner";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import ResetPasswordSent from "./pages/AuthPages/ResetPasswordSent";
import NotFound from "./pages/OtherPage/NotFound";
import TermsOfService from "./pages/Legal/TermsOfService";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
import UserProfiles from "./pages/UserProfiles";
import Request from "./pages/Appointments/Request";
import AppointmentsList from "./pages/Appointments/AppointmentsList";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
// AuthGuard for public auth pages - redirects to home if already authenticated
function AuthGuard({ children }: { children: ReactElement }) {
  const auth = useAppSelector((state) => state.auth);

  // Sadece yüklenme tamamlanmışsa ve kullanıcı giriş yapmışsa yönlendir
  if (!auth.loading && auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// RequireAuth for protected routes - redirects to signin if not authenticated
function RequireAuth({ children }: { children: ReactElement }) {
  const auth = useAppSelector((state) => state.auth);
  
  // Yükleme sırasında bekle
  if (auth.loading) {
    return <GlobalSpinner />;
  }

  // Kullanıcı authenticate olmamışsa signin sayfasına yönlendir
  if (!auth.loading && !auth.isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  // Kullanıcı authenticate olmuşsa children'ı render et
  return children;
}

export default function App() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Uygulama başladığında ve auth state false iken kullanıcı bilgilerini kontrol et
    if (!auth.isAuthenticated) {
      dispatch(fetchMe()).catch(() => {
        // Hata durumunda sessizce devam et
      });
    }
  }, [dispatch, auth.isAuthenticated]);

  return (
    <>
      <Router>
        <GlobalSpinner />
        <ScrollToTop />
        <Routes>
          {/* Auth Routes */}
          <Route path="/signin" element={<AuthGuard><SignIn /></AuthGuard>} />
          <Route path="/signup" element={<AuthGuard><SignUp /></AuthGuard>} />
          <Route path="/reset-password" element={<AuthGuard><ResetPassword /></AuthGuard>} />
          <Route path="/reset-password-sent" element={<AuthGuard><ResetPasswordSent /></AuthGuard>} />

          {/* Herkese açık hukuki sayfalar — auth durumundan bağımsız erişilebilir olmalı */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          {/* Protected Routes */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index path="/" element={<Home />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/appointments/request" element={<Request />} />
            <Route path="/appointments" element={<AppointmentsList />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
