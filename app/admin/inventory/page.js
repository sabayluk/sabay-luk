'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabase'; // កែសម្រួល Path តាមទីតាំងជាក់ស្តែង

export default function InventoryDashboard() {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ទាញយកទិន្នន័យផលិតផលពី Supabase Database
  useEffect(() => {
    async function fetchInventory() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Error fetching inventory:', error);
      } else {
        // បន្ថែម Style ពណ៌ឱ្យ Badge ទៅតាម Status នីមួយៗដោយស្វ័យប្រវត្តិ
        const formattedData = data.map((item) => ({
          ...item,
          qty: item.stock_qty || 0,
          badge: 
            item.status === 'In Stock' ? 'bg-green-100 text-green-700' :
            item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
            item.status === 'Shipped' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
        }));
        setTopProducts(formattedData);
      }
      setLoading(false);
    }
    fetchInventory();
  }, []);

  const recentActivities = [
    { time: '10:30 AM', action: 'ដឹកជញ្ជូនស្តុកថ្មីចូលឃ្លាំង (New stock arrived)' },
    { time: '09:15 AM', action: 'បញ្ជាក់ការកុម្ម៉ង់លូហ្វ័រ (Confirmed loafer order)' },
    { time: '08:00 AM', action: 'ទាក់ទងអ្នកផ្គត់ផ្គង់តាមរយៈ 0967205522 (Contacted supplier)' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* 1. របារម៉ឺនុយខាងឆ្វេង (Sidebar Menu) */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-2xl font-black text-blue-400 tracking-wider">INVENTORY</h2>
          <p className="text-xs text-gray-400 mt-1">Global Management System</p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 text-sm font-medium">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded-lg shadow-md text-white">
            📊 <span>ផ្ទាំងគ្រប់គ្រង <br/><span className="text-[10px] font-normal text-blue-200">Dashboard</span></span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition">
            📦 <span>ផលិតផល <br/><span className="text-[10px] font-normal text-gray-400">Products</span></span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition">
            🗄️ <span>ស្តុក <br/><span className="text-[10px] font-normal text-gray-400">Inventory</span></span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition">
            💰 <span>ការលក់ <br/><span className="text-[10px] font-normal text-gray-400">Sales</span></span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition">
            📈 <span>របាយការណ៍ <br/><span className="text-[10px] font-normal text-gray-400">Reports</span></span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition">
            👥 <span>អ្នកប្រើប្រាស់ <br/><span className="text-[10px] font-normal text-gray-400">Users</span></span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition">
            ⚙️ <span>ការកំណត់ <br/><span className="text-[10px] font-normal text-gray-400">Settings</span></span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900">ទិដ្ឋភាពទូទៅនៃស្តុក (Overview)</h1>
            <p className="text-sm text-gray-500 mt-1">ព័ត៌មានបច្ចុប្បន្នភាពទិន្នន័យប្រចាំថ្ងៃ</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition">
            + បន្ថែមផលិតផល (Add Product)
          </button>
        </header>

        {/* 2. ប្រអប់ស្ថិតិសំខាន់ៗ (Stat Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <span className="text-gray-500 text-xs font-bold uppercase mb-1">សរុបផលិតផល (Total Products)</span>
            <span className="text-3xl font-black text-gray-900">{topProducts.length}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-red-500">
            <span className="text-gray-500 text-xs font-bold uppercase mb-1">ទំនិញស្តុកតិច (Low Stock Items)</span>
            <span className="text-3xl font-black text-red-600">
              {topProducts.filter(p => p.status === 'Low Stock').length}
            </span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-blue-500">
            <span className="text-gray-500 text-xs font-bold uppercase mb-1">ការដឹកជញ្ជូនចូល (Incoming)</span>
            <span className="text-3xl font-black text-blue-600">7</span>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-green-500">
            <span className="text-gray-500 text-xs font-bold uppercase mb-1">តម្លៃសរុប (Total Value)</span>
            <span className="text-3xl font-black text-green-600">
              ${topProducts.reduce((acc, curr) => acc + (Number(curr.price) * Number(curr.stock_qty || 0)), 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Charts & Activities Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Stock Movement Chart Placeholder */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6">ចលនាស្តុកប្រចាំខែ (Stock Movement: Jan - May)</h3>
            <div className="h-64 flex items-end gap-4 justify-between pt-10 border-b border-l border-gray-200 px-4">
              <div className="w-full bg-blue-100 hover:bg-blue-200 rounded-t-sm h-[40%] relative group cursor-pointer"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-bold opacity-0 group-hover:opacity-100">Jan</span></div>
              <div className="w-full bg-blue-200 hover:bg-blue-300 rounded-t-sm h-[60%] relative group cursor-pointer"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-bold opacity-0 group-hover:opacity-100">Feb</span></div>
              <div className="w-full bg-blue-400 hover:bg-blue-500 rounded-t-sm h-[85%] relative group cursor-pointer"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-bold opacity-0 group-hover:opacity-100">Mar</span></div>
              <div className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-sm h-[70%] relative group cursor-pointer"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-bold opacity-0 group-hover:opacity-100">Apr</span></div>
              <div className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-sm h-[95%] relative group cursor-pointer"><span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 font-bold opacity-0 group-hover:opacity-100">May</span></div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6">សកម្មភាពថ្មីៗ (Recent Activities)</h3>
            <div className="space-y-6 text-sm">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                  <div>
                    <p className="text-gray-800 font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. តារាងផលិតផលលក់ដាច់បំផុត (Top Selling Products Table) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">ផលិតផលក្នុងស្តុក (Inventory Products)</h3>
            <button className="text-sm font-medium text-blue-600 hover:underline">មើលទាំងអស់ (View All)</button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12 text-gray-400 font-medium">កំពុងទាញទិន្នន័យពី Database...</div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">មិនទាន់មានទិន្នន័យផលិតផលក្នុងស្តុកទេ។</div>
            ) : (
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 uppercase text-xs">SKU</th>
                    <th className="px-6 py-4 uppercase text-xs">ឈ្មោះផលិតផល (Product Name)</th>
                    <th className="px-6 py-4 uppercase text-xs">ប្រភេទ (Category)</th>
                    <th className="px-6 py-4 uppercase text-xs">ចំនួនស្តុក (Stock Qty)</th>
                    <th className="px-6 py-4 uppercase text-xs">ស្ថានភាព (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topProducts.map((product, index) => (
                    <tr key={product.id || index} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{product.sku || 'N/A'}</td>
                      <td className="px-6 py-4">{product.name}</td>
                      <td className="px-6 py-4">{product.category || 'ស្បែកជើង'}</td>
                      <td className="px-6 py-4 font-bold">{product.qty}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider ${product.badge}`}>
                          {product.status || 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}