import React from "react";

const ProductoCard = ({ producto, onAdd }) => {
  return (
    <div className="bg-white border p-4 rounded-lg shadow-md text-center">
      <div className="w-full h-24 bg-gray-100 rounded mb-2" />
      <h3 className="font-semibold text-lg">{producto.nombre}</h3>
      <p className="text-sm text-gray-600 mb-2">${producto.precio.toFixed(2)}</p>
      <button
        onClick={onAdd}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Agregar
      </button>
    </div>
  );
};

export default ProductoCard;
