import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";

export default function ResetPassword() {
  return (
    <>
      <PageMeta
        title="Şifremi Unuttum | TailAdmin - React.js Admin Dashboard Template"
        description="Şifre sıfırlama sayfası - TailAdmin React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <ResetPasswordForm />
      </AuthLayout>
    </>
  );
}