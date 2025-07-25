import React from 'react';

const Footer = () => (
  <footer className="p-4 bg-white rounded-lg shadow md:px-6 md:py-8 dark:bg-gray-800">
    <div className="sm:flex sm:items-center sm:justify-between">
      <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">© {new Date().getFullYear()} <a href="https://flowbite.com/" className="hover:underline">Flowbite™</a>. All Rights Reserved.
      </span>
      <div className="flex mt-4 space-x-6 sm:justify-center sm:mt-0">
        {/* Sosyal medya ikonları buraya eklenebilir */}
      </div>
    </div>
  </footer>
);

export default Footer; 