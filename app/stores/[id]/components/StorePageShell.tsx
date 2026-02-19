import Link from "next/link";

type Store = {
  id: string;
  name: string;
};

type Props = {
  store: Store;
  title: string;
  children: React.ReactNode;
};

export default function StorePageShell({ store, title, children }: Props) {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link
          href="/stores"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to Stores
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {store.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {title}
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {children}
      </div>
    </div>
  );
}
