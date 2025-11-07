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
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
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

          {/* Protected Routes */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index path="/" element={<Home />} />
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/appointments/request" element={<Request />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            <Route path="/appointments" element={<AppointmentsList />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
