import { useState } from "react";

export default function BankTransaction() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    amount: "",
    paymentMethod: "bKash",
    senderPhone: "",
    transactionId: "",
    acknowledgment: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const payload = {
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      amount: parseFloat(formData.amount),
      currency: "BDT",
      note: formData.acknowledgment,
      payment_type: "manual",
      payment_method: formData.paymentMethod,
      sender_account: formData.senderPhone,
      manual_txn_id: formData.transactionId,
    };

    try {
      const apiBase =
        import.meta?.env?.VITE_API_BASE || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Submission failed");
      }

      const data = await res.json();
      setResult({ success: true, tran_id: data.tran_id, status: data.status });
      // Optionally reset form
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        amount: "",
        paymentMethod: "bKash",
        senderPhone: "",
        transactionId: "",
        acknowledgment: "",
      });
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-8">
        Bank Fund Transfer
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-indigo-200">
            Donor Information
          </h3>

          <div className="mb-5">
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Enter your full name"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Enter your phone number"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-indigo-200">
            Payment Details
          </h3>

          <div className="mb-5">
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Enter amount to transfer"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="paymentMethod"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
            >
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="senderPhone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Sender Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="senderPhone"
              name="senderPhone"
              value={formData.senderPhone}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="Enter sender's phone number"
            />
          </div>

          <div className="mt-5 mb-5">
            <label
              htmlFor="transactionId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Transaction ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="transactionId"
              name="transactionId"
              value={formData.transactionId}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Enter transaction ID"
            />
          </div>

          <div>
            <label
              htmlFor="acknowledgment"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Acknowledgment/Note{" "}
              <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <textarea
              id="acknowledgment"
              name="acknowledgment"
              value={formData.acknowledgment}
              onChange={handleInputChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Add any additional notes or acknowledgment"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Transfer"}
          </button>
        </div>
        {result && (
          <div className="mt-4">
            {result.success ? (
              <div className="p-4 bg-green-100 text-green-800 rounded">
                Transfer recorded. Tran ID: {result.tran_id} — Status:{" "}
                {result.status}
              </div>
            ) : (
              <div className="p-4 bg-red-100 text-red-800 rounded">
                Error: {result.message}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
