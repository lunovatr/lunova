import React from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import DashboardWidget from './components/DashboardWidget';
import StatisticsTabs from './components/StatisticsTabs';
import NewProductsWidget from './components/NewProductsWidget';
import UsersWidget from './components/UsersWidget';
import AudienceByAgeWidget from './components/AudienceByAgeWidget';
import SmartChatWidget from './components/SmartChatWidget';
import SalesByCategoryWidget from './components/SalesByCategoryWidget';
import TrafficByDeviceWidget from './components/TrafficByDeviceWidget';
import LatestActivityWidget from './components/LatestActivityWidget';
import CarouselWidget from './components/CarouselWidget';

const App = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-4 bg-gray-50 dark:bg-gray-800">
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          <DashboardWidget />
          <StatisticsTabs />
          <NewProductsWidget />
          <UsersWidget />
          <AudienceByAgeWidget />
        </div>
        <div className="grid grid-cols-1 my-4 xl:grid-cols-2 xl:gap-4">
          <SmartChatWidget />
          <SalesByCategoryWidget />
          <TrafficByDeviceWidget />
          <LatestActivityWidget />
          <CarouselWidget />
        </div>
      </main>
    </div>
    <Footer />
  </div>
);

export default App; 