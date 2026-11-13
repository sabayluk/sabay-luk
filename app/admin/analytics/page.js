'use client';
import { useState } from 'react';

export default function AnalyticsDashboard() {
  // ទិន្នន័យគំរូ (Mock Data) សម្រាប់ក្រាហ្វ និងរបាយការណ៍
  const stats = {
    totalRevenue: 12540.00,
    dailySales: 450.00,
    monthlySales: 4500.00,
    totalOrders: 156
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">📊 វិភាគទិន្នន័យ (Analytics)</h1>
        <p className="text-sm text-gray-500 mt-1">របាយការណ៍ចំណូល និងស្ថិតិលក់ប្រចាំថ្ងៃ</p>
      </div>

      {/* 1. របាយការណ៍សង្ខេប (Summary Reports) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
          <p className="text-xs font-bold text-gray-500 uppercase">ចំណូលសរុប (Total Revenue)</p>
          <p className="text-3xl font-black text-green-600 mt-2">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-gray-500 uppercase">ចំណូលថ្ងៃនេះ (Daily)</p>
          <p className="text-3xl font-black text-blue-600 mt-2">${stats.dailySales.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
          <p className="text-xs font-bold text-gray-500 uppercase">ចំណូលខែនេះ (Monthly)</p>
          <p className="text-3xl font-black text-purple-600 mt-2">${stats.monthlySales.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-orange-500">
          <p className="text-xs font-bold text-gray-500 uppercase">ការបញ្ជាទិញសរុប (Orders)</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{stats.totalOrders}</p>
        </div>
      </div>

      {/* 2. ក្រាហ្វស្ថិតិ (Sales Bar Chart Placeholder) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-gray-900 mb-6">📈 ក្រាហ្វចំណូលប្រចាំសប្តាហ៍ (Weekly Sales Chart)</h3>
        {/* រចនាសម្ព័ន្ធក្រាហ្វសាមញ្ញដោយប្រើ Tailwind (អាចប្រើ Recharts ជំនួសនៅពេលក្រោយ) */}
        <div className="h-64 flex items-end justify-around pt-10 border-b border-l border-gray-200 px-4">
          <div className="w-12 bg-blue-500 rounded-t-md h-[40%] relative group"><span className="absolute -top-6 text-xs font-bold opacity-0 group-hover:opacity-100">Mon</span></div>
          <div className="w-12 bg-blue-500 rounded-t-md h-[60%] relative group"><span className="absolute -top-6 text-xs font-bold opacity-0 group-hover:opacity-100">Tue</span></div>
          <div className="w-12 bg-blue-500 rounded-t-md h-[30%] relative group"><span className="absolute -top-6 text-xs font-bold opacity-0 group-hover:opacity-100">Wed</span></div>
          <div className="w-12 bg-blue-500 rounded-t-md h-[80%] relative group"><span className="absolute -top-6 text-xs font-bold opacity-0 group-hover:opacity-100">Thu</span></div>
          <div className="w-12 bg-blue-500 rounded-t-md h-[95%] relative group"><span className="absolute -top-6 text-xs font-bold opacity-0 group-hover:opacity-100">Fri</span></div>
          <div className="w-12 bg-green-500 rounded-t-md h-[100%] relative group"><span className="absolute -top-6 text-xs font-bold opacity-0 group-hover:opacity-100">Sat</span></div>
          <div className="w-12 bg-green-500 rounded-t-md h-[75%] relative group"><span className="absolute -top-6 text-xs font-bold opacity-0 group-hover:opacity-100">Sun</span></div>
        </div>
      </div>
    </div>
  );
}