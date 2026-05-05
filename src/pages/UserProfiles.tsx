import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProfile } from "../store/authSlice";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserContactCard";
import UserSupportCard from "../components/UserProfile/UserSupportCard";
import PageMeta from "../components/common/PageMeta";
import UserDocumentsCard from "../components/UserProfile/UserDocumentsCard";

export default function UserProfiles() {
  const dispatch = useAppDispatch();
  // Store'dan yüklenme durumunu takip edebiliriz
  const { loading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Sayfa yüklenirken detaylı profil verisini çekiyoruz
    dispatch(fetchProfile());
  }, []);

  // Opsiyonel: Veri yüklenirken bir loading state'i gösterebilirsin
  if (loading && !error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Profil Bilgileri | Lunova"
        description="Kullanıcı profil ve bağımlılık detayları sayfası"
      />
      <PageBreadcrumb pageTitle="Profile" />
      
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-500 dark:bg-red-900/20">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard />
          <UserDocumentsCard />
          <UserSupportCard />
        </div>
      </div>
    </>
  );
}