import React from "react";

const CategoriaIcon = ({ nombre, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-16 h-16 bg-red-100 hover:bg-red-300 flex items-center justify-center rounded-full text-red-700 font-bold text-sm shadow-md"
    >
      {nombre[0]}
    </button>
  );
};

export default CategoriaIcon;
