import React from 'react';

const ageData = [
  { label: '50+', percent: 18 },
  { label: '40+', percent: 15 },
  { label: '30+', percent: 12 },
];

const AudienceByAgeWidget = () => (
  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
    <div className="w-full">
      <h3 className="mb-2 text-base font-normal text-gray-500 dark:text-gray-400">Audience by age</h3>
      {ageData.map((age, idx) => (
        <div className="flex items-center mb-2" key={age.label}>
          <div className="w-16 text-sm font-medium dark:text-white">{age.label}</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-primary-600 h-2.5 rounded-full dark:bg-primary-500" style={{ width: `${age.percent}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AudienceByAgeWidget; 