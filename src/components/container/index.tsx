export default function Container({ children }:{children: React.ReactNode}) {
  return (
    <div className="w-full rounded border border-gray-300 bg-white p-6 mt-4">
      {children}
    </div>
  );
}