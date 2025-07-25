import React from 'react';

const devices = [
  { name: 'Desktop', value: '234k', change: '+4%', color: 'green', icon: 'desktop', trend: 'up' },
  { name: 'Phone', value: '94k', change: '-1%', color: 'red', icon: 'phone', trend: 'down' },
  { name: 'Tablet', value: '16k', change: '-0,6%', color: 'red', icon: 'tablet', trend: 'down' },
];

const TrafficByDeviceWidget = () => (
  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
    <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
      <div>
        <h3 className="text-base font-normal text-gray-500 dark:text-gray-400">Traffic by device</h3>
        <span className="text-2xl font-bold leading-none text-gray-900 sm:text-3xl dark:text-white">Desktop</span>
      </div>
      <a href="#" className="inline-flex items-center p-2 text-xs font-medium uppercase rounded-lg text-primary-700 sm:text-sm hover:bg-gray-100 dark:text-primary-500 dark:hover:bg-gray-700">
        Full report
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
      </a>
    </div>
    <div id="traffic-by-device"></div>
    <div className="flex items-center justify-between pt-4 lg:justify-evenly sm:pt-6">
      {devices.map((device) => (
        <div key={device.name}>
          {/* Iconlar sadeleştirildi */}
          <h3 className="text-gray-500 dark:text-gray-400">{device.name}</h3>
          <h4 className="text-xl font-bold dark:text-white">{device.value}</h4>
          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span className={`flex items-center mr-1.5 text-sm text-${device.color}-500 dark:text-${device.color}-400`}>
              {/* Trend iconu */}
              {device.trend === 'up' ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"></path></svg>
              )}
              {device.change}
            </span>
            vs last month
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default TrafficByDeviceWidget; 