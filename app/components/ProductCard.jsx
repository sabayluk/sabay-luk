export default function ProductCard({ product }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition duration-300 overflow-hidden border border-gray-100 p-4 flex flex-col justify-between">
      {/* រូបភាពទំនិញ */}
      <div className="h-56 bg-gray-100 rounded-xl mb-4 overflow-hidden relative">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="h-full w-full object-cover hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            គ្មានរូបភាព
          </div>
        )}
        <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium">
          {product.category || 'ទំនិញ'}
        </span>
      </div>

      {/* ព័ត៌មានទំនិញ */}
      <div>
        <h3 className="font-bold text-lg mb-1 text-gray-900 line-clamp-1">{product.name}</h3>
        <p className="text-amber-600 font-extrabold text-lg mb-4">${product.price}</p>
      </div>

      {/* ប៊ូតុងដាក់កន្រ្តក */}
      <button className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition shadow-sm flex items-center justify-center space-x-2">
        <span>🛒 ដាក់ចូលកន្រ្តក</span>
      </button>
    </div>
  );
}