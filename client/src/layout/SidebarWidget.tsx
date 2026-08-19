export default function SidebarWidget() {
  return (
    <div className="mx-auto mb-6 w-full max-w-60 px-4 py-3 text-center">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        &copy; {new Date().getFullYear()} Lunova
      </p>
    </div>
  );
}
