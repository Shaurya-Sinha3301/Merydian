'use client';

export default function TripHeader() {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
                <div>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold mb-3">
                        Confirmed
                    </span>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Delhi, India</h1>
                    <p className="text-gray-500">March 15 - March 17, 2026 • 3 Days</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Total Budget</p>
                    <p className="text-2xl font-black text-gray-900">₹45,000</p>
                </div>
            </div>
        </div>
    );
}
