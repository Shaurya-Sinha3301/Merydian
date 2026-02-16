'use client';

export default function DocVault() {
    const docs = [
        { name: "Flight Tickets.pdf", type: "PDF", size: "2.4 MB" },
        { name: "Hotel Booking.pdf", type: "PDF", size: "1.1 MB" },
        { name: "Travel Insurance", type: "img", size: "850 KB" },
        { name: "Visa Documents", type: "folder", size: "4 files" },
    ];

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Travel Documents</h3>
                <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Upload New</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {docs.map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-white group-hover:shadow-sm">
                            <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="font-bold text-gray-900 text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{doc.size}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
