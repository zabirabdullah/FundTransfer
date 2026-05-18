import React from "react";

export default function Header({ activeTab, setActiveTab }) {
  return (
    <div className="flex border-b border-gray-200">
      <button
        onClick={() => setActiveTab("online")}
        className={`flex-1 py-4 px-6 font-semibold text-lg transition-all duration-200 ${
          activeTab === "online"
            ? "bg-indigo-600 text-white border-b-2 border-indigo-600"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
        }`}
      >
        Online Transaction
      </button>
      <button
        onClick={() => setActiveTab("bank")}
        className={`flex-1 py-4 px-6 font-semibold text-lg transition-all duration-200 ${
          activeTab === "bank"
            ? "bg-indigo-600 text-white border-b-2 border-indigo-600"
            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
        }`}
      >
        Bank Transaction
      </button>
    </div>
  );
}
