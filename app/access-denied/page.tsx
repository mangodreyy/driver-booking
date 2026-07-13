export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#fff7f0" }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#fee2e2" }}>
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96L13.75 4a2 2 0 00-3.5 0L3.25 16.04A2 2 0 005.07 19z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
        <p className="text-sm text-gray-500 mb-4">
          This booking system is for Xiaomi Malaysia staff only.<br />
          Please use the link shared by your admin.
        </p>
        <p className="text-xs text-gray-400">
          If you believe this is a mistake, contact admin via MiWorkPro.
        </p>
      </div>
    </div>
  );
}
