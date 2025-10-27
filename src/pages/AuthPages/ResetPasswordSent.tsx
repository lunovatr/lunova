import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResetPasswordSentContent from "../../components/auth/ResetPasswordSentContent";

export default function ResetPasswordSent() {
  return (
    <>
      <PageMeta
        title="Email Gönderildi | TailAdmin - React.js Admin Dashboard Template"
        description="Şifre sıfırlama email'i gönderildi - TailAdmin React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <ResetPasswordSentContent />
      </AuthLayout>
    </>
  );
}