import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import ResetPasswordSentContent from "../../components/auth/ResetPasswordSentContent";

export default function ResetPasswordSent() {
  return (
    <>
      <PageMeta
        title="E-posta Gönderildi | Lunova"
        description="Şifre sıfırlama e-postası gönderildi."
      />
      <AuthLayout>
        <ResetPasswordSentContent />
      </AuthLayout>
    </>
  );
}