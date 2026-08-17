import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Render sırasında oluşan beklenmeyen hataları yakalar. Bu olmadan herhangi bir
 * bileşendeki bir hata (örn. beklenmeyen bir API yanıtı şekli) tüm React ağacını
 * unmount edip kullanıcıya boş/beyaz bir sayfa bırakıyordu.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Beklenmeyen bir uygulama hatası yakalandı:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-900 px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
              Beklenmeyen bir hata oluştu
            </h1>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              Sayfa yüklenirken bir sorunla karşılaştık. Ana sayfaya dönmeyi deneyebilirsiniz.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
