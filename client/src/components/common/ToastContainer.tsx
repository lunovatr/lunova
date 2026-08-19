import Toast from './Toast';
import { useToast } from '../../hooks/useToast';

interface ToastContainerProps {
  toasts: ReturnType<typeof useToast>['toasts'];
  removeToast: ReturnType<typeof useToast>['removeToast'];
}

const ToastContainer = ({ toasts, removeToast }: ToastContainerProps) => {
  return (
    <div className="fixed top-20 right-4 z-999999 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;