import { useAuth } from '../auth';
import { Button } from '../components';

export const Header = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white font-bold text-xl w-10 h-10 rounded-lg flex items-center justify-center">
              ONB
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Email Scheduler</h1>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={user.picture}
                alt={user.name}
                className="h-10 w-10 rounded-full border-2 border-gray-200"
              />
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <Button onClick={logout} variant="ghost" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
