import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4 text-center text-white sm:px-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">404</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Page not found</h1>
        <Link to="/" className="mt-6 inline-block rounded-full bg-neon px-6 py-3 text-sm font-black uppercase tracking-wider text-ink">
          Back Home
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
