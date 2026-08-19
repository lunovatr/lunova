// src/pages/AuthPages/ResetPassword.tsx
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";

export default function ResetPassword() {
  return (
    <>
      <PageMeta
        title="Şifremi Unuttum | Lunova"
        description="Lunova hesabınız için şifrenizi sıfırlayın."
      />
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </>
  );
}