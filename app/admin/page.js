'use client';
import { useState } from 'react';
import { supabase } from '../../supabase';

export default function AdminPage() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('ស្បែកជើង');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  // មុខងារ Upload រូបភាព និងបញ្ចូលទំនិញទៅ Database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('សូមជ្រើសរើសរូបភាពសិន!');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      // ១. Upload រូបភាពទៅ Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // ២. យក Link របស់รูបភាពដែលទើប Upload
      const { data: publicURLData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      const imageUrl = publicURLData.publicUrl;

      // ៣. បញ្ចូលព័ត៌មានទំនិញ និង Link រូបភាពចូលទៅក្នុង Database Table 'products'
      const { error: dbError } = await supabase
        .from('products')
        .insert([{ name, price: parseFloat(price), category, image_url: imageUrl }]);

      if (dbError) throw dbError;

      setMessage('🎉 បញ្ចូលទំនិញ និង Upload រូបភាពបានដោយជោគជ័យ!');
      setName('');
      setPrice('');
      setFile(null);
    } catch (error) {
      console.error('Error:', error.message);
      setMessage('❌ មានបញ្ហាស្ទះក្នុងការ Upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6 font-sans">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-8 border border-gray-200">
        <h1 className="text-2xl font-black text-gray-900 mb-6 text-center">
          📦 បញ្ចូលទំនិញថ្មី (Sabay Luk Admin)
        </h1>

        {message && (
          <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.includes('❌') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ឈ្មោះទំនិញ</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="ឧ. ស្បែកជើងស្បែកប្រណិត" 
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">តម្លៃ ($)</label>
            <input 
              type="number" 
              step="0.01" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              placeholder="ឧ. 45.00" 
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ប្រភេទផលិតផល</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="ស្បែកជើង">ស្បែកជើង</option>
              <option value="នាឡិកា">នាឡិកា</option>
              <option value="ខ្សែក្រវ៉ាត់">ខ្សែក្រវ៉ាត់</option>
              <option value="កាបូប">កាបូប</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ជ្រើសរើសរូបភាពទំនិញ</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setFile(e.target.files[0])} 
              required
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer"
            />
          </div>

          <button 
            type="submit" 
            disabled={uploading}
            className="w-full bg-[#ff6a00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#e65c00] transition shadow-md disabled:bg-gray-400"
          >
            {uploading ? 'កំពុង Upload និងបញ្ជូនទិន្នន័យ...' : '🚀 បញ្ចូលទំនិញទៅកាន់វេបសាយ'}
          </button>
        </form>
      </div>
    </div>
  );
}