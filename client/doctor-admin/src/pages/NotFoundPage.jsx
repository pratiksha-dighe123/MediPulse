import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slatex px-4 text-center text-white sm:px-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">404</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Page not found</h1>
        <Link to="/dashboard" className="mt-6 inline-block rounded-full bg-mint px-6 py-3 text-sm font-black uppercase tracking-wider text-slatex">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
