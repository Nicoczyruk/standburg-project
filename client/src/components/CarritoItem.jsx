import React from "react";
import { Trash2, Minus, Plus } from "lucide-react";

const CarritoItem = ({ item, onChangeCantidad, onDelete }) => {
  return (
    <div className="bg-white border rounded p-3 mb-2 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button onClick={() => onChangeCantidad(item.id, item.cantidad - 1)}>
          <Minus size={16} />
        </button>
        <span>{item.cantidad}</span>
        <button onClick={() => onChangeCantidad(item.id, item.cantidad + 1)}>
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 ml-4">
        <p className="text-sm font-semibold">{item.nombre}</p>
        <p className="text-xs text-gray-500">
          Subtotal: ${(item.precio * item.cantidad).toFixed(2)}
        </p>
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="text-red-600 hover:text-red-800"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

export default CarritoItem;
